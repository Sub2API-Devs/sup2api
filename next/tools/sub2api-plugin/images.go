package main

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

// Container images bundled in a plugin package (CONTRACTS §53.10): pack
// --images <dir> adds <dir>/images.json and the archives it lists as
// images/images.json and images/<file>. Nothing else in <dir> is packed, so
// a stray file (or the image script's temporary directory) never ends up in
// a signed package.
//
//	{"version": 1, "images": {"<role>": {"ref", "file", "sha256", "size"}, ...}}
//
// ref is the tag `docker load` gives the image; sha256 and size are those of
// the archive file itself (the bytes stored in the zip). Images named after
// the plugin (<key>-<anything>) must be tagged with the plugin version, so a
// controller that already has the tag holds exactly these bytes; any other
// image (e.g. Caddy) must carry a fixed x.y.z tag.

const (
	imagesDir      = "images"
	imagesManifest = "images.json"
)

var (
	// Same as the core's image reference rule (§49.16), but tagged and
	// without a digest: `docker save` of a digest reference loads untagged.
	imageRefRe  = regexp.MustCompile(`^[a-z0-9][a-z0-9._/-]{0,127}:[A-Za-z0-9._-]{1,128}$`)
	imageRoleRe = regexp.MustCompile(`^[a-z][a-z0-9-]{0,31}$`)
	imageFileRe = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9._-]{0,127}\.(?:tar|tar\.gz)$`)
	sha256Re    = regexp.MustCompile(`^[0-9a-f]{64}$`)
	fixedTagRe  = regexp.MustCompile(`(?:^|[^0-9])[0-9]+\.[0-9]+\.[0-9]+`)
)

type imageEntry struct {
	Ref    string `json:"ref"`
	File   string `json:"file"`
	SHA256 string `json:"sha256"`
	Size   int64  `json:"size"`
}

type imagesIndex struct {
	Version int                   `json:"version"`
	Images  map[string]imageEntry `json:"images"`
}

// collectImages validates dir/images.json against m and the archives on disk
// and returns the package files (images/images.json, images/<file>).
// required, when non-empty, is the exact set of roles the index must have.
func collectImages(dir string, m *manifest.Manifest, required []string) (map[string][]byte, error) {
	raw, err := os.ReadFile(filepath.Join(dir, imagesManifest))
	if err != nil {
		return nil, fmt.Errorf("images: %w", err)
	}
	var idx imagesIndex
	dec := json.NewDecoder(bytes.NewReader(raw))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&idx); err != nil {
		return nil, fmt.Errorf("images: %s: %w", imagesManifest, err)
	}
	if dec.More() {
		return nil, fmt.Errorf("images: %s: trailing data", imagesManifest)
	}
	if idx.Version != 1 {
		return nil, fmt.Errorf("images: %s: version %d, want 1", imagesManifest, idx.Version)
	}
	if len(idx.Images) == 0 {
		return nil, fmt.Errorf("images: %s lists no images", imagesManifest)
	}
	if len(required) > 0 {
		want := map[string]bool{}
		for _, r := range required {
			want[r] = true
			if _, ok := idx.Images[r]; !ok {
				return nil, fmt.Errorf("images: role %q missing from %s", r, imagesManifest)
			}
		}
		for r := range idx.Images {
			if !want[r] {
				return nil, fmt.Errorf("images: unexpected role %q in %s (want %s)", r, imagesManifest, strings.Join(required, ","))
			}
		}
	}
	roles := make([]string, 0, len(idx.Images))
	for r := range idx.Images {
		roles = append(roles, r)
	}
	sort.Strings(roles)
	files := map[string][]byte{imagesDir + "/" + imagesManifest: raw}
	for _, role := range roles {
		e := idx.Images[role]
		if !imageRoleRe.MatchString(role) {
			return nil, fmt.Errorf("images: invalid role %q", role)
		}
		if err := checkImageRef(e.Ref, m); err != nil {
			return nil, fmt.Errorf("images: %s: %w", role, err)
		}
		if !imageFileRe.MatchString(e.File) {
			return nil, fmt.Errorf("images: %s: file %q must be a plain .tar or .tar.gz name", role, e.File)
		}
		if !sha256Re.MatchString(e.SHA256) || e.Size <= 0 {
			return nil, fmt.Errorf("images: %s: sha256 must be 64 lowercase hex digits and size positive", role)
		}
		name := imagesDir + "/" + e.File
		if _, dup := files[name]; dup {
			return nil, fmt.Errorf("images: %s: file %s listed twice", role, e.File)
		}
		b, err := readImageFile(filepath.Join(dir, e.File), e.Size)
		if err != nil {
			return nil, fmt.Errorf("images: %s: %w", role, err)
		}
		sum := sha256.Sum256(b)
		if got := hex.EncodeToString(sum[:]); got != e.SHA256 {
			return nil, fmt.Errorf("images: %s: %s sha256 %s, images.json says %s", role, e.File, got, e.SHA256)
		}
		files[name] = b
	}
	return files, nil
}

// checkImageRef applies the tag rules: own images carry the plugin version,
// others a fixed x.y.z tag.
func checkImageRef(ref string, m *manifest.Manifest) error {
	if !imageRefRe.MatchString(ref) {
		return fmt.Errorf("ref %q must be name:tag (lowercase name, no registry port, no digest)", ref)
	}
	i := strings.LastIndex(ref, ":")
	name, tag := ref[:i], ref[i+1:]
	if strings.HasPrefix(name[strings.LastIndex(name, "/")+1:], m.Key+"-") {
		if tag != m.Version {
			return fmt.Errorf("ref %q: tag must be the plugin version %s", ref, m.Version)
		}
		return nil
	}
	if !fixedTagRe.MatchString(tag) {
		return fmt.Errorf("ref %q: tag must be a fixed x.y.z version, not a floating one", ref)
	}
	return nil
}

// readImageFile reads a regular file whose size must be exactly size.
func readImageFile(p string, size int64) ([]byte, error) {
	f, err := os.Open(p)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	st, err := f.Stat()
	if err != nil {
		return nil, err
	}
	if !st.Mode().IsRegular() {
		return nil, fmt.Errorf("%s is not a regular file", p)
	}
	if st.Size() != size {
		return nil, fmt.Errorf("%s is %d bytes, images.json says %d", p, st.Size(), size)
	}
	if size > maxUnpackedBytes {
		return nil, fmt.Errorf("%s exceeds the %d byte package limit", p, maxUnpackedBytes)
	}
	b := make([]byte, size)
	if _, err := io.ReadFull(f, b); err != nil {
		return nil, err
	}
	return b, nil
}

// storedEntry reports whether a package path is stored without compression:
// image archives are gzip already, deflating them again only costs time.
func storedEntry(p string) bool {
	return strings.HasPrefix(p, imagesDir+"/") && (strings.HasSuffix(p, ".tar.gz") || strings.HasSuffix(p, ".tgz"))
}
