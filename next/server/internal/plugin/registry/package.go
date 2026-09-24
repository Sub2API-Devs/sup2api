package registry

import (
	"archive/zip"
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path"
	"path/filepath"
	"strings"
	"sync"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// Package is one verified .s2plugin cached on local disk. Files are read
// straight from the zip; the struct is safe for concurrent use.
type Package struct {
	Key       string
	Version   string
	SHA256    string // hex sha256 of the .s2plugin file
	Manifest  *manifest.Manifest
	Publisher string
	Trust     string // official | verified | community | unsigned
	// Dir is DataDir/<key>/<version>-<hash8>; the package file and the
	// extracted binary live below it.
	Dir string

	file *os.File
	zr   *zip.Reader
}

// Hash8 is the short package hash used in directory names and asset URLs.
func (p *Package) Hash8() string { return p.SHA256[:8] }

// VersionHash is "<version>-<hash8>".
func (p *Package) VersionHash() string { return p.Version + "-" + p.Hash8() }

// AssetBase is the public URL prefix for package assets.
func (p *Package) AssetBase() string { return "/plugin-ui/" + p.Key + "/" + p.VersionHash() }

// FS exposes the package content (zip) as a read-only file system.
func (p *Package) FS() fs.FS { return p.zr }

// Has reports whether a file exists in the package.
func (p *Package) Has(name string) bool {
	f, err := p.zr.Open(name)
	if err != nil {
		return false
	}
	st, err := f.Stat()
	_ = f.Close()
	return err == nil && !st.IsDir()
}

// ReadFile reads one file from the package.
func (p *Package) ReadFile(name string) ([]byte, error) {
	name = strings.TrimPrefix(path.Clean("/"+name), "/")
	return fs.ReadFile(p.zr, name)
}

// MigrationsFS returns the directory holding SQL migrations, or nil when the
// plugin declares no database.
func (p *Package) MigrationsFS() (fs.FS, error) {
	if p.Manifest.Database == nil || p.Manifest.Database.Migrations == "" {
		return nil, nil
	}
	dir := strings.Trim(path.Clean("/"+p.Manifest.Database.Migrations), "/")
	if dir == "" {
		return p.zr, nil
	}
	if _, err := fs.Stat(p.zr, dir); err != nil {
		if errors.Is(err, fs.ErrNotExist) {
			return emptyFS{}, nil
		}
		return nil, err
	}
	return fs.Sub(p.zr, dir)
}

// MigrationIDs lists the SQL migration file names shipped by the package.
func (p *Package) MigrationIDs() ([]string, error) {
	fsys, err := p.MigrationsFS()
	if err != nil || fsys == nil {
		return nil, err
	}
	return fs.Glob(fsys, "*.sql")
}

// BinaryPath resolves entry.grpc.binaries for goos/goarch inside the package.
// On Windows a ".exe" suffix is also accepted.
func (p *Package) BinaryPath(goos, goarch string) (string, error) {
	if p.Manifest.Entry.GRPC == nil || p.Manifest.Entry.GRPC.Binaries == "" {
		return "", errors.New("manifest has no entry.grpc.binaries")
	}
	name := strings.NewReplacer("{os}", goos, "{arch}", goarch).Replace(p.Manifest.Entry.GRPC.Binaries)
	name = strings.TrimPrefix(path.Clean("/"+name), "/")
	if p.Has(name) {
		return name, nil
	}
	if goos == "windows" && p.Has(name+".exe") {
		return name + ".exe", nil
	}
	return "", fmt.Errorf("package has no binary for %s/%s (%s)", goos, goarch, name)
}

// ExtractBinary writes the plugin binary for goos/goarch to Dir/bin and
// returns its absolute path and sha256. An existing file is reused only when
// its hash matches the package entry.
func (p *Package) ExtractBinary(goos, goarch string) (binPath, sum string, err error) {
	name, err := p.BinaryPath(goos, goarch)
	if err != nil {
		return "", "", err
	}
	data, err := fs.ReadFile(p.zr, name)
	if err != nil {
		return "", "", err
	}
	h := sha256.Sum256(data)
	sum = hex.EncodeToString(h[:])
	binDir := filepath.Join(p.Dir, "bin")
	if err := os.MkdirAll(binDir, 0o755); err != nil {
		return "", "", err
	}
	binPath, err = filepath.Abs(filepath.Join(binDir, path.Base(name)))
	if err != nil {
		return "", "", err
	}
	if cur, err := fileSHA256(binPath); err == nil && cur == sum {
		return binPath, sum, os.Chmod(binPath, 0o755)
	}
	tmp := binPath + ".tmp"
	if err := os.WriteFile(tmp, data, 0o755); err != nil {
		return "", "", err
	}
	if err := os.Chmod(tmp, 0o755); err != nil {
		return "", "", err
	}
	_ = os.Remove(binPath)
	if err := os.Rename(tmp, binPath); err != nil {
		return "", "", err
	}
	return binPath, sum, nil
}

// Close releases the package file handle.
func (p *Package) Close() error {
	if p.file != nil {
		return p.file.Close()
	}
	return nil
}

// Packages fetches plugin packages from plugin_versions, verifies their
// sha256 and caches them under DataDir.
type Packages struct {
	db      *store.DB
	dataDir string

	mu    sync.Mutex
	cache map[string]*Package // key@version
	// fetch serializes downloads of the same package.
	fetch map[string]*sync.Mutex
}

func NewPackages(db *store.DB, dataDir string) *Packages {
	return &Packages{db: db, dataDir: dataDir, cache: map[string]*Package{}, fetch: map[string]*sync.Mutex{}}
}

// DataDir returns the root directory for plugin files.
func (s *Packages) DataDir() string { return s.dataDir }

// Open returns the verified package of key@version, downloading it from the
// database when it is not cached on disk yet.
func (s *Packages) Open(ctx context.Context, key, version string) (*Package, error) {
	id := key + "@" + version
	s.mu.Lock()
	if p, ok := s.cache[id]; ok {
		s.mu.Unlock()
		return p, nil
	}
	lk, ok := s.fetch[id]
	if !ok {
		lk = &sync.Mutex{}
		s.fetch[id] = lk
	}
	s.mu.Unlock()

	lk.Lock()
	defer lk.Unlock()
	s.mu.Lock()
	if p, ok := s.cache[id]; ok {
		s.mu.Unlock()
		return p, nil
	}
	s.mu.Unlock()

	p, err := s.load(ctx, key, version)
	if err != nil {
		return nil, err
	}
	s.mu.Lock()
	s.cache[id] = p
	s.mu.Unlock()
	return p, nil
}

func (s *Packages) load(ctx context.Context, key, version string) (*Package, error) {
	var (
		manifestJSON []byte
		sum          string
		sigStatus    string
		publisher    *string
		trust        *string
	)
	err := s.db.Pool.QueryRow(ctx, `
		SELECT v.manifest, v.package_sha256, v.signature_status, p.name, p.trust_level
		FROM plugin_versions v LEFT JOIN publishers p ON p.id = v.publisher_id
		WHERE v.plugin_key = $1 AND v.version = $2`, key, version).
		Scan(&manifestJSON, &sum, &sigStatus, &publisher, &trust)
	if err != nil {
		if store.IsNoRows(err) {
			return nil, fmt.Errorf("plugin %s@%s: version not found", key, version)
		}
		return nil, err
	}
	sum = strings.ToLower(sum)
	if len(sum) != 64 {
		return nil, fmt.Errorf("plugin %s@%s: invalid package_sha256", key, version)
	}
	var m manifest.Manifest
	if err := json.Unmarshal(manifestJSON, &m); err != nil {
		return nil, fmt.Errorf("plugin %s@%s: decode manifest: %w", key, version, err)
	}
	if m.Key != key || m.Version != version {
		return nil, fmt.Errorf("plugin %s@%s: manifest identifies %s@%s", key, version, m.Key, m.Version)
	}
	p := &Package{Key: key, Version: version, SHA256: sum, Manifest: &m}
	if publisher != nil {
		p.Publisher = *publisher
	}
	switch {
	case sigStatus == "unsigned":
		p.Trust = "unsigned"
	case trust != nil:
		p.Trust = *trust
	default:
		p.Trust = "community"
	}
	p.Dir = filepath.Join(s.dataDir, key, p.VersionHash())
	if err := os.MkdirAll(p.Dir, 0o755); err != nil {
		return nil, err
	}
	file := filepath.Join(p.Dir, "package.s2plugin")
	if cur, err := fileSHA256(file); err != nil || cur != sum {
		var data []byte
		if err := s.db.Pool.QueryRow(ctx,
			`SELECT package FROM plugin_versions WHERE plugin_key = $1 AND version = $2`, key, version).Scan(&data); err != nil {
			return nil, err
		}
		h := sha256.Sum256(data)
		if hex.EncodeToString(h[:]) != sum {
			return nil, fmt.Errorf("plugin %s@%s: package sha256 mismatch", key, version)
		}
		tmp := file + ".tmp"
		if err := os.WriteFile(tmp, data, 0o644); err != nil {
			return nil, err
		}
		_ = os.Remove(file)
		if err := os.Rename(tmp, file); err != nil {
			return nil, err
		}
	}
	f, err := os.Open(file)
	if err != nil {
		return nil, err
	}
	if err := p.attach(f); err != nil {
		return nil, err
	}
	return p, nil
}

// attach verifies f against p.SHA256 and opens it as a zip.
func (p *Package) attach(f *os.File) error {
	key, version, sum := p.Key, p.Version, p.SHA256
	st, err := f.Stat()
	if err != nil {
		_ = f.Close()
		return err
	}
	// Re-verify what we are about to serve from (the file may have been
	// swapped between the hash check and open).
	h := sha256.New()
	if _, err := io.Copy(h, io.NewSectionReader(f, 0, st.Size())); err != nil {
		_ = f.Close()
		return err
	}
	if hex.EncodeToString(h.Sum(nil)) != sum {
		_ = f.Close()
		return fmt.Errorf("plugin %s@%s: cached package sha256 mismatch", key, version)
	}
	zr, err := zip.NewReader(f, st.Size())
	if err != nil {
		_ = f.Close()
		return fmt.Errorf("plugin %s@%s: open package: %w", key, version, err)
	}
	p.file, p.zr = f, zr
	return nil
}

// LoadPackage writes a package to dir and opens it, taking the manifest
// from the package itself (dev tooling and tests; production packages come
// from Packages.Open).
func LoadPackage(dir string, data []byte, publisher, trust string) (*Package, error) {
	zr, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return nil, err
	}
	mj, err := fs.ReadFile(zr, "manifest.json")
	if err != nil {
		return nil, err
	}
	var m manifest.Manifest
	if err := json.Unmarshal(mj, &m); err != nil {
		return nil, err
	}
	sum := sha256.Sum256(data)
	p := &Package{Key: m.Key, Version: m.Version, SHA256: hex.EncodeToString(sum[:]), Manifest: &m, Publisher: publisher, Trust: trust}
	p.Dir = filepath.Join(dir, m.Key, p.VersionHash())
	if err := os.MkdirAll(p.Dir, 0o755); err != nil {
		return nil, err
	}
	file := filepath.Join(p.Dir, "package.s2plugin")
	if err := os.WriteFile(file, data, 0o644); err != nil {
		return nil, err
	}
	f, err := os.Open(file)
	if err != nil {
		return nil, err
	}
	if err := p.attach(f); err != nil {
		return nil, err
	}
	return p, nil
}

// Close releases every cached package.
func (s *Packages) Close() {
	s.mu.Lock()
	defer s.mu.Unlock()
	for id, p := range s.cache {
		_ = p.Close()
		delete(s.cache, id)
	}
}

func fileSHA256(name string) (string, error) {
	f, err := os.Open(name)
	if err != nil {
		return "", err
	}
	defer f.Close()
	h := sha256.New()
	if _, err := io.Copy(h, f); err != nil {
		return "", err
	}
	return hex.EncodeToString(h.Sum(nil)), nil
}

type emptyFS struct{}

func (emptyFS) Open(name string) (fs.File, error) {
	return nil, &fs.PathError{Op: "open", Path: name, Err: fs.ErrNotExist}
}
