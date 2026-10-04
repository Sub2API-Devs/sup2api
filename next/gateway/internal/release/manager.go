// Package release verifies and installs immutable, publisher-signed core bundles.
package release

import (
	"archive/tar"
	"compress/gzip"
	"context"
	"crypto/ed25519"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path"
	"path/filepath"
	"strings"
	"sync"
	"time"

	rc "github.com/Sub2API-Devs/sup2api/next/runtime-contract"
)

const MaxManifestBytes = 4 << 20

type Manager struct {
	Root                 string
	TrustedKeys          map[string]ed25519.PublicKey
	OS, Arch, RuntimeABI string
	Client               *http.Client
	GitHubClient         *http.Client
	// AllowHTTP is intended for explicitly configured development repositories.
	AllowHTTP bool
	mu        sync.Mutex
}
type Prepared struct {
	Digest    string
	Manifest  rc.Manifest
	Platform  rc.Platform
	Directory string
}
type Journal struct {
	OperationID  string    `json:"operation_id"`
	OldDigest    string    `json:"old_digest"`
	TargetDigest string    `json:"target_digest"`
	Phase        string    `json:"phase"`
	UpdatedAt    time.Time `json:"updated_at"`
}

func ValidDigest(s string) bool {
	if len(s) != 64 {
		return false
	}
	b, e := hex.DecodeString(s)
	return e == nil && len(b) == 32 && s == strings.ToLower(s)
}
func Digest(b []byte) string { h := sha256.Sum256(b); return hex.EncodeToString(h[:]) }
func Verify(s rc.SignedManifest, keys map[string]ed25519.PublicKey) (rc.Manifest, string, error) {
	var m rc.Manifest
	key := keys[s.KeyID]
	if len(s.Payload) > MaxManifestBytes || len(key) != ed25519.PublicKeySize || !ed25519.Verify(key, s.Payload, s.Signature) {
		return m, "", errors.New("invalid release signature")
	}
	if err := json.Unmarshal(s.Payload, &m); err != nil {
		return m, "", err
	}
	if m.ManifestVersion != 1 || m.ReleaseID == "" || m.BuildID == "" || !m.ShellProtocol.Contains(rc.Protocol) || !m.CoreControlProtocol.Contains(rc.Protocol) {
		return m, "", errors.New("unsupported release contract")
	}
	if m.Strategy != "rolling" && m.Strategy != "maintenance" {
		return m, "", errors.New("invalid release strategy")
	}
	return m, Digest(s.Payload), nil
}
func (m *Manager) selectPlatform(v rc.Manifest) (rc.Platform, error) {
	for _, p := range v.Platforms {
		if p.OS == m.OS && p.Arch == m.Arch && p.RuntimeABI == m.RuntimeABI {
			if !ValidDigest(p.BundleDigest) || p.BundleBytes <= 0 || p.BundleBytes > 16<<30 || len(p.Files) == 0 || len(p.Files) > 20000 {
				return p, errors.New("invalid bundle declaration")
			}
			return p, nil
		}
	}
	return rc.Platform{}, errors.New("release requires a different platform or runtime ABI")
}
func (m *Manager) init() error {
	for _, p := range []string{"staging", "releases", "blobs/sha256", "manifests", "supervisor"} {
		if err := os.MkdirAll(filepath.Join(m.Root, p), 0700); err != nil {
			return err
		}
	}
	return nil
}

// FetchManifest permits only HTTPS and does not follow redirects. The caller must
// select the URL from its configured publisher, never from a business request.
func (m *Manager) FetchManifest(ctx context.Context, rawURL string) (rc.SignedManifest, error) {
	var s rc.SignedManifest
	r, err := m.get(ctx, rawURL)
	if err != nil {
		return s, err
	}
	defer r.Body.Close()
	b, err := io.ReadAll(io.LimitReader(r.Body, MaxManifestBytes*2+1))
	if err != nil {
		return s, err
	}
	if len(b) > MaxManifestBytes*2 {
		return s, errors.New("manifest too large")
	}
	err = json.Unmarshal(b, &s)
	return s, err
}
func (m *Manager) get(ctx context.Context, raw string) (*http.Response, error) {
	return m.getUsing(ctx, raw, m.Client)
}
func (m *Manager) getUsing(ctx context.Context, raw string, client *http.Client) (*http.Response, error) {
	if IsGitHubAssetURL(raw) {
		return GitHubGet(ctx, m.GitHubClient, raw)
	}
	u, e := url.Parse(raw)
	if e != nil || u.Host == "" || u.User != nil || (u.Scheme != "https" && !(m.AllowHTTP && u.Scheme == "http")) {
		return nil, errors.New("invalid release source URL")
	}
	c := http.Client{Timeout: 10 * time.Minute}
	if client != nil {
		c = *client
	}
	c.CheckRedirect = func(*http.Request, []*http.Request) error { return errors.New("release redirects disabled") }
	req, e := http.NewRequestWithContext(ctx, "GET", raw, nil)
	if e != nil {
		return nil, e
	}
	req.Header.Set("Accept-Encoding", "identity")
	r, e := c.Do(req)
	if e != nil {
		return nil, e
	}
	if r.StatusCode != http.StatusOK {
		r.Body.Close()
		return nil, fmt.Errorf("release source HTTP %d", r.StatusCode)
	}
	return r, nil
}

// ValidatePlatform checks the same signed platform contract as Prepare.
func (m *Manager) ValidatePlatform(v rc.Manifest) (rc.Platform, error) { return m.selectPlatform(v) }

// Prepare verifies the signed manifest before downloading the exact bundleURL.
// It never changes current and is safe while the old core serves traffic.
func (m *Manager) Prepare(ctx context.Context, s rc.SignedManifest, bundleURL string) (Prepared, error) {
	return m.prepare(ctx, s, bundleURL, m.Client)
}

// PrepareWithClient isolates the authenticated cluster transport from publishers.
func (m *Manager) PrepareWithClient(ctx context.Context, s rc.SignedManifest, bundleURL string, client *http.Client) (Prepared, error) {
	return m.prepare(ctx, s, bundleURL, client)
}
func (m *Manager) prepare(ctx context.Context, s rc.SignedManifest, bundleURL string, client *http.Client) (Prepared, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	v, d, e := Verify(s, m.TrustedKeys)
	if e != nil {
		return Prepared{}, e
	}
	p, e := m.selectPlatform(v)
	if e != nil {
		return Prepared{}, e
	}
	out := Prepared{d, v, p, filepath.Join(m.Root, "releases", d)}
	if e = m.init(); e != nil {
		return out, e
	}
	existing := false
	if _, e = os.Stat(out.Directory); e == nil {
		if e = m.verifyFiles(out.Directory, p); e != nil {
			return out, e
		}
		existing = true
		if _, err := os.Stat(filepath.Join(m.Root, "blobs", "sha256", p.BundleDigest)); err == nil {
			b, err := json.Marshal(s)
			if err != nil {
				return out, err
			}
			return out, atomicWrite(filepath.Join(m.Root, "manifests", d), b)
		}
	}
	stage, e := os.MkdirTemp(filepath.Join(m.Root, "staging"), "release-")
	if e != nil {
		return out, e
	}
	defer os.RemoveAll(stage)
	blob := filepath.Join(stage, "bundle.tar.gz")
	f, e := os.OpenFile(blob, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0600)
	if e != nil {
		return out, e
	}
	r, e := m.getUsing(ctx, bundleURL, client)
	if e != nil {
		f.Close()
		return out, e
	}
	h := sha256.New()
	n, e := io.Copy(io.MultiWriter(f, h), io.LimitReader(r.Body, p.BundleBytes+1))
	r.Body.Close()
	if e == nil {
		e = f.Sync()
	}
	ce := f.Close()
	if e == nil {
		e = ce
	}
	if e != nil {
		return out, e
	}
	if n != p.BundleBytes || hex.EncodeToString(h.Sum(nil)) != p.BundleDigest {
		return out, errors.New("bundle size or SHA256 mismatch")
	}
	root := filepath.Join(stage, "content")
	if e = os.Mkdir(root, 0700); e != nil {
		return out, e
	}
	if e = extract(ctx, blob, root, p.Files); e != nil {
		return out, e
	}
	if e = m.verifyFiles(root, p); e != nil {
		return out, e
	}
	if e = ctx.Err(); e != nil {
		return out, e
	}
	if e = syncTree(root); e != nil {
		return out, e
	}
	if !existing {
		if e = os.Rename(root, out.Directory); e != nil {
			return out, e
		}
	}
	if e = syncDir(filepath.Join(m.Root, "releases")); e != nil {
		return out, e
	}
	if e = os.Rename(blob, filepath.Join(m.Root, "blobs", "sha256", p.BundleDigest)); e != nil && !errors.Is(e, os.ErrExist) {
		return out, e
	}
	if e = syncDir(filepath.Join(m.Root, "blobs", "sha256")); e != nil {
		return out, e
	}
	b, e := json.Marshal(s)
	if e != nil {
		return out, e
	}
	e = atomicWrite(filepath.Join(m.Root, "manifests", d), b)
	return out, e
}
func validPath(v string) bool {
	return v != "" && len(v) <= 4096 && v != "." && path.Clean(v) == v && !strings.HasPrefix(v, "/") && !strings.Contains(v, "\\") && !strings.Contains(v, ":") && v != ".." && !strings.HasPrefix(v, "../")
}
func extract(ctx context.Context, blob, root string, files []rc.File) error {
	declared := map[string]rc.File{}
	directories := map[string]bool{}
	var total int64
	for _, f := range files {
		if !validPath(f.Path) || !ValidDigest(f.SHA256) || f.Size < 0 || f.Size > 16<<30 || f.Mode&^0777 != 0 {
			return errors.New("invalid file declaration")
		}
		if _, ok := declared[f.Path]; ok {
			return errors.New("duplicate file declaration")
		}
		declared[f.Path] = f
		for dir := path.Dir(f.Path); dir != "."; dir = path.Dir(dir) {
			directories[dir] = true
		}
		total += f.Size
		if total > 64<<30 {
			return errors.New("release unpacked size exceeds limit")
		}
	}
	f, e := os.Open(blob)
	if e != nil {
		return e
	}
	defer f.Close()
	gz, e := gzip.NewReader(f)
	if e != nil {
		return e
	}
	defer gz.Close()
	tr := tar.NewReader(gz)
	seen := map[string]bool{}
	for {
		if e = ctx.Err(); e != nil {
			return e
		}
		hdr, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return err
		}
		name := strings.TrimSuffix(hdr.Name, "/")
		if !validPath(name) {
			return errors.New("unsafe archive path")
		}
		dest := filepath.Join(root, filepath.FromSlash(name))
		if hdr.Typeflag == tar.TypeDir {
			if !directories[name] {
				return errors.New("undeclared archive directory")
			}
			if err = os.MkdirAll(dest, 0700); err != nil {
				return err
			}
			continue
		}
		if hdr.Typeflag != tar.TypeReg {
			return errors.New("archive links and special files forbidden")
		}
		spec, ok := declared[name]
		if !ok || seen[name] || hdr.Size != spec.Size {
			return errors.New("undeclared, duplicate, or incorrectly sized archive file")
		}
		seen[name] = true
		if err = os.MkdirAll(filepath.Dir(dest), 0700); err != nil {
			return err
		}
		out, err := os.OpenFile(dest, os.O_WRONLY|os.O_CREATE|os.O_EXCL, os.FileMode(spec.Mode))
		if err != nil {
			return err
		}
		h := sha256.New()
		n, err := io.Copy(io.MultiWriter(out, h), tr)
		if err == nil {
			err = out.Chmod(os.FileMode(spec.Mode))
		}
		if err == nil {
			err = out.Sync()
		}
		ce := out.Close()
		if err == nil {
			err = ce
		}
		if err != nil {
			return err
		}
		if n != spec.Size || hex.EncodeToString(h.Sum(nil)) != spec.SHA256 {
			return errors.New("archive file digest mismatch")
		}
	}
	if len(seen) != len(declared) {
		return errors.New("archive missing declared files")
	}
	if _, ok := declared["bin/sub2api"]; !ok {
		return errors.New("release has no core executable")
	}
	if declared["bin/sub2api"].Mode&0111 == 0 {
		return errors.New("core is not executable")
	}
	return nil
}
func (m *Manager) verifyFiles(root string, p rc.Platform) error {
	declared := map[string]bool{}
	for _, f := range p.Files {
		declared[f.Path] = true
		if !validPath(f.Path) {
			return errors.New("unsafe manifest path")
		}
		name := filepath.Join(root, filepath.FromSlash(f.Path))
		st, e := os.Lstat(name)
		if e != nil {
			return e
		}
		if !st.Mode().IsRegular() || st.Size() != f.Size || st.Mode().Perm() != os.FileMode(f.Mode).Perm() {
			return errors.New("installed release file changed")
		}
		fd, e := os.Open(name)
		if e != nil {
			return e
		}
		h := sha256.New()
		_, e = io.Copy(h, fd)
		fd.Close()
		if e != nil {
			return e
		}
		if hex.EncodeToString(h.Sum(nil)) != f.SHA256 {
			return errors.New("installed release digest changed")
		}
	}
	return filepath.WalkDir(root, func(name string, entry os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if entry.IsDir() {
			return nil
		}
		rel, err := filepath.Rel(root, name)
		if err != nil {
			return err
		}
		if !declared[filepath.ToSlash(rel)] {
			return errors.New("installed release contains undeclared file")
		}
		return nil
	})
}
func (m *Manager) Current() (string, error) {
	p, e := os.Readlink(filepath.Join(m.Root, "current"))
	if e != nil {
		return "", e
	}
	d := filepath.Base(p)
	if p != filepath.Join("releases", d) || !ValidDigest(d) {
		return "", errors.New("invalid current pointer")
	}
	return d, nil
}
func (m *Manager) ReadJournal() (Journal, error) {
	var j Journal
	b, e := os.ReadFile(filepath.Join(m.Root, "supervisor", "state.json"))
	if e == nil {
		e = json.Unmarshal(b, &j)
	}
	return j, e
}

// Switch requires the caller to have stopped and reaped the previous core and
// obtained current cluster authorization. Recovery must recheck that authorization.
func (m *Manager) Switch(ctx context.Context, operation, digest string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if !ValidDigest(digest) || operation == "" {
		return errors.New("invalid switch")
	}
	if e := ctx.Err(); e != nil {
		return e
	}
	if e := m.init(); e != nil {
		return e
	}
	b, e := os.ReadFile(filepath.Join(m.Root, "manifests", digest))
	if e != nil {
		return e
	}
	var s rc.SignedManifest
	if e = json.Unmarshal(b, &s); e != nil {
		return e
	}
	v, d, e := Verify(s, m.TrustedKeys)
	if e != nil {
		return e
	}
	if d != digest {
		return errors.New("manifest digest mismatch")
	}
	p, e := m.selectPlatform(v)
	if e != nil {
		return e
	}
	if e = m.verifyFiles(filepath.Join(m.Root, "releases", digest), p); e != nil {
		return e
	}
	old, e := m.Current()
	if e != nil && !errors.Is(e, os.ErrNotExist) {
		return e
	}
	if old == digest {
		if j, err := m.ReadJournal(); err == nil && j.OperationID == operation && j.TargetDigest == digest {
			j.Phase = "switched"
			j.UpdatedAt = time.Now().UTC()
			return m.writeJournal(j)
		}
		return nil
	}
	j := Journal{operation, old, digest, "switching", time.Now().UTC()}
	if e = m.writeJournal(j); e != nil {
		return e
	}
	if e = ctx.Err(); e != nil {
		return e
	}
	if old != "" {
		if e = m.point("previous", old); e != nil {
			return e
		}
	}
	if e = m.point("current", digest); e != nil {
		return e
	}
	j.Phase = "switched"
	return m.writeJournal(j)
}
func (m *Manager) writeJournal(j Journal) error {
	b, e := json.Marshal(j)
	if e != nil {
		return e
	}
	return atomicWrite(filepath.Join(m.Root, "supervisor", "state.json"), b)
}
func (m *Manager) point(name, digest string) error {
	p := filepath.Join(m.Root, name)
	tmp := p + ".next"
	if e := os.Remove(tmp); e != nil && !errors.Is(e, os.ErrNotExist) {
		return e
	}
	if e := os.Symlink(filepath.Join("releases", digest), tmp); e != nil {
		return e
	}
	if e := os.Rename(tmp, p); e != nil {
		return e
	}
	return syncDir(m.Root)
}

// GC removes old releases and blobs that are no longer referenced by current
// or previous pointers. It keeps the two most recently used releases.
func (m *Manager) GC(ctx context.Context) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	current, _ := m.Current()
	var previous string
	if p, err := os.Readlink(filepath.Join(m.Root, "previous")); err == nil {
		if d := filepath.Base(p); ValidDigest(d) {
			previous = d
		}
	}

	keep := make(map[string]bool)
	if current != "" {
		keep[current] = true
	}
	if previous != "" {
		keep[previous] = true
	}

	// Remove old release directories.
	entries, err := os.ReadDir(filepath.Join(m.Root, "releases"))
	if err != nil && !errors.Is(err, os.ErrNotExist) {
		return err
	}
	for _, e := range entries {
		if ctx.Err() != nil {
			return ctx.Err()
		}
		if !e.IsDir() || !ValidDigest(e.Name()) || keep[e.Name()] {
			continue
		}
		if err := os.RemoveAll(filepath.Join(m.Root, "releases", e.Name())); err != nil {
			return err
		}
	}

	// Remove old manifests.
	entries, err = os.ReadDir(filepath.Join(m.Root, "manifests"))
	if err != nil && !errors.Is(err, os.ErrNotExist) {
		return err
	}
	for _, e := range entries {
		if ctx.Err() != nil {
			return ctx.Err()
		}
		if e.IsDir() || !ValidDigest(e.Name()) || keep[e.Name()] {
			continue
		}
		if err := os.Remove(filepath.Join(m.Root, "manifests", e.Name())); err != nil {
			return err
		}
	}

	// Find which blobs are still needed.
	keepBlobs := make(map[string]bool)
	for digest := range keep {
		b, err := os.ReadFile(filepath.Join(m.Root, "manifests", digest))
		if err != nil {
			continue
		}
		var s rc.SignedManifest
		if err := json.Unmarshal(b, &s); err != nil {
			continue
		}
		var v rc.Manifest
		if err := json.Unmarshal(s.Payload, &v); err != nil {
			continue
		}
		for _, p := range v.Platforms {
			if ValidDigest(p.BundleDigest) {
				keepBlobs[p.BundleDigest] = true
			}
		}
	}

	// Remove old blobs.
	entries, err = os.ReadDir(filepath.Join(m.Root, "blobs", "sha256"))
	if err != nil && !errors.Is(err, os.ErrNotExist) {
		return err
	}
	for _, e := range entries {
		if ctx.Err() != nil {
			return ctx.Err()
		}
		if e.IsDir() || !ValidDigest(e.Name()) || keepBlobs[e.Name()] {
			continue
		}
		if err := os.Remove(filepath.Join(m.Root, "blobs", "sha256", e.Name())); err != nil {
			return err
		}
	}

	return nil
}

func atomicWrite(p string, b []byte) error {
	f, e := os.CreateTemp(filepath.Dir(p), ".atomic-")
	if e != nil {
		return e
	}
	n := f.Name()
	defer os.Remove(n)
	if _, e = f.Write(b); e == nil {
		e = f.Sync()
	}
	ce := f.Close()
	if e == nil {
		e = ce
	}
	if e != nil {
		return e
	}
	if e = os.Rename(n, p); e != nil {
		return e
	}
	return syncDir(filepath.Dir(p))
}
func syncDir(p string) error {
	f, e := os.Open(p)
	if e != nil {
		return e
	}
	defer f.Close()
	return f.Sync()
}
func syncTree(root string) error {
	var dirs []string
	err := filepath.WalkDir(root, func(p string, d os.DirEntry, e error) error {
		if e != nil {
			return e
		}
		if d.IsDir() {
			dirs = append(dirs, p)
		}
		return nil
	})
	if err != nil {
		return err
	}
	for i := len(dirs) - 1; i >= 0; i-- {
		if err := syncDir(dirs[i]); err != nil {
			return err
		}
	}
	return nil
}

// BlobHandler is mounted only behind the authenticated private listener.
func (m *Manager) BlobHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "GET" && r.Method != "HEAD" {
			w.WriteHeader(405)
			return
		}
		var base, d string
		if strings.HasPrefix(r.URL.Path, "/internal/blobs/") {
			base = "blobs/sha256"
			d = strings.TrimPrefix(r.URL.Path, "/internal/blobs/")
		} else if strings.HasPrefix(r.URL.Path, "/internal/releases/") {
			base = "manifests"
			d = strings.TrimPrefix(r.URL.Path, "/internal/releases/")
		} else {
			http.NotFound(w, r)
			return
		}
		if !ValidDigest(d) {
			http.NotFound(w, r)
			return
		}
		http.ServeFile(w, r, filepath.Join(m.Root, base, d))
	})
}
