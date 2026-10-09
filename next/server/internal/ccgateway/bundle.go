package ccgateway

import (
	"archive/zip"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"hash"
	"io"
	"io/fs"
	"log/slog"
	"os"
	"regexp"
	"sync"
)

// Runtime images shipped inside the ccgateway plugin package (CONTRACTS
// §53.10): images/images.json names one docker-save archive per role. The
// core reads them from the package that is active on this node, checks each
// file against its sha256 and streams it to `docker load` (installation) or
// to the controller's chunked uploads (connected).

// BundlePackage is the active ccgateway plugin package of this node.
type BundlePackage struct {
	// Version is the plugin version.
	Version string
	// File is the path of the package on local disk; the image archives are
	// streamed from a handle of its own (a rollout may close FS meanwhile).
	File string
	// FS is the package content as verified when it was loaded;
	// images/images.json is read from it.
	FS fs.FS
}

// bundleRoles are the roles every images.json must name.
var bundleRoles = []string{"app", "egress", "controller", "gateway"}

const (
	bundleManifestFile  = "images/images.json"
	maxBundleManifest   = 64 << 10
	maxBundleImageBytes = 2 << 30
)

// bundleFilePattern: images.json names each archive by its bare file name
// inside images/ (as sub2api-plugin pack writes it).
var bundleFilePattern = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$`)

type bundleImage struct {
	Ref    string `json:"ref"`
	File   string `json:"file"`
	SHA256 string `json:"sha256"`
	Size   int64  `json:"size"`
}

// bundle is a validated images.json of one package.
type bundle struct {
	version string
	file    string
	images  map[string]bundleImage
}

// refs are the bundled references per role.
func (b *bundle) refs() RuntimeImages {
	return RuntimeImages{App: b.images["app"].Ref, Egress: b.images["egress"].Ref, Controller: b.images["controller"].Ref, Gateway: b.images["gateway"].Ref}
}

// ref is the bundled reference of role ("" without a bundle).
func (b *bundle) ref(role string) string {
	if b == nil {
		return ""
	}
	return b.images[role].Ref
}

// bundledView is the bundled field of GET /system/ccgateway/runtime.
type bundledView struct {
	Version string            `json:"version"`
	Images  map[string]string `json:"images"`
}

func (b *bundle) view() *bundledView {
	if b == nil {
		return nil
	}
	v := &bundledView{Version: b.version, Images: map[string]string{}}
	for role, img := range b.images {
		v.Images[role] = img.Ref
	}
	return v
}

// parseBundle validates images/images.json: version 1, all four roles, refs
// usable in a script, files below images/, sha256 and sizes.
func parseBundle(version, file string, raw []byte) (*bundle, error) {
	var m struct {
		Version int                    `json:"version"`
		Images  map[string]bundleImage `json:"images"`
	}
	if err := json.Unmarshal(raw, &m); err != nil {
		return nil, errors.New("images.json is not valid JSON")
	}
	if m.Version != 1 {
		return nil, fmt.Errorf("images.json version %d is not supported", m.Version)
	}
	b := &bundle{version: version, file: file, images: map[string]bundleImage{}}
	files := map[string]bool{}
	for _, role := range bundleRoles {
		img, ok := m.Images[role]
		if !ok {
			return nil, fmt.Errorf("images.json has no %s image", role)
		}
		if !validImage(img.Ref) || imageIDPattern.MatchString(img.Ref) {
			return nil, fmt.Errorf("images.json: invalid %s reference", role)
		}
		if !bundleFilePattern.MatchString(img.File) || files[img.File] {
			return nil, fmt.Errorf("images.json: invalid %s file", role)
		}
		files[img.File] = true
		img.File = "images/" + img.File
		if !sha256Pattern.MatchString(img.SHA256) || img.Size < 1 || img.Size > maxBundleImageBytes {
			return nil, fmt.Errorf("images.json: invalid %s checksum or size", role)
		}
		b.images[role] = img
	}
	return b, nil
}

// bundleCache keeps the parsed images.json of the package last seen.
type bundleCache struct {
	mu      sync.Mutex
	file    string
	version string
	b       *bundle
}

// bundle returns the images of the active ccgateway package, nil when there
// is none (no package on this node, or a package without images/). An
// invalid images.json is logged and counts as none.
func (s *Service) bundle() *bundle {
	if s == nil || s.Bundle == nil {
		return nil
	}
	p, ok := s.Bundle()
	if !ok || p.FS == nil || p.File == "" {
		return nil
	}
	s.bundles.mu.Lock()
	defer s.bundles.mu.Unlock()
	if s.bundles.file == p.File && s.bundles.version == p.Version {
		return s.bundles.b
	}
	b, final, err := loadBundle(p)
	if err != nil {
		slog.Warn("CCGateway: the plugin package's runtime images are unusable", "version", p.Version, "err", err)
	}
	if final {
		s.bundles.file, s.bundles.version, s.bundles.b = p.File, p.Version, b
	}
	return b
}

// loadBundle reads images/images.json; final is false for read errors that
// may pass (they are not cached).
func loadBundle(p BundlePackage) (*bundle, bool, error) {
	f, err := p.FS.Open(bundleManifestFile)
	if errors.Is(err, fs.ErrNotExist) {
		return nil, true, nil
	}
	if err != nil {
		return nil, false, err
	}
	defer f.Close()
	raw, err := io.ReadAll(io.LimitReader(f, maxBundleManifest+1))
	if err != nil {
		return nil, false, err
	}
	if len(raw) > maxBundleManifest {
		return nil, true, errors.New("images.json is too large")
	}
	b, err := parseBundle(p.Version, p.File, raw)
	return b, true, err
}

// errBundleChecksum: an image archive does not match images.json.
var errBundleChecksum = errors.New("bundled image does not match its sha256")

// open returns the archive of role, checked against images.json before it
// is returned (one full read) and again while it is read (a mismatch fails
// the last read instead of returning EOF). The caller closes it.
func (b *bundle) open(role string) (io.ReadCloser, bundleImage, error) {
	img, ok := b.images[role]
	if !ok {
		return nil, img, fmt.Errorf("no bundled %s image", role)
	}
	f, err := os.Open(b.file)
	if err != nil {
		return nil, img, err
	}
	st, err := f.Stat()
	if err != nil {
		f.Close()
		return nil, img, err
	}
	zr, err := zip.NewReader(f, st.Size())
	if err != nil {
		f.Close()
		return nil, img, err
	}
	var entry *zip.File
	for _, zf := range zr.File {
		if zf.Name == img.File {
			if entry != nil {
				f.Close()
				return nil, img, errors.New("duplicate bundled image entry")
			}
			entry = zf
		}
	}
	if entry == nil || entry.UncompressedSize64 != uint64(img.Size) {
		f.Close()
		return nil, img, errBundleChecksum
	}
	// First pass: nothing leaves the core before the whole file matched.
	rc, err := entry.Open()
	if err != nil {
		f.Close()
		return nil, img, err
	}
	h := sha256.New()
	n, err := io.Copy(h, io.LimitReader(rc, img.Size+1))
	rc.Close()
	if err != nil {
		f.Close()
		return nil, img, err
	}
	if n != img.Size || hex.EncodeToString(h.Sum(nil)) != img.SHA256 {
		f.Close()
		return nil, img, errBundleChecksum
	}
	rc, err = entry.Open()
	if err != nil {
		f.Close()
		return nil, img, err
	}
	return &checkedImage{r: rc, file: f, h: sha256.New(), want: img.SHA256, size: img.Size}, img, nil
}

// checkedImage re-checks the archive while it is streamed.
type checkedImage struct {
	r    io.ReadCloser
	file *os.File
	h    hash.Hash
	want string
	size int64
	n    int64
}

func (c *checkedImage) Read(p []byte) (int, error) {
	n, err := c.r.Read(p)
	c.n += int64(n)
	c.h.Write(p[:n])
	if c.n > c.size {
		return n, errBundleChecksum
	}
	if err == io.EOF && (c.n != c.size || hex.EncodeToString(c.h.Sum(nil)) != c.want) {
		return n, errBundleChecksum
	}
	return n, err
}

func (c *checkedImage) Close() error {
	c.r.Close()
	return c.file.Close()
}
