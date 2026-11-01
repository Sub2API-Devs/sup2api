package fakeguard

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"encoding/json"
	"io"
	"path"
	"regexp"
	"sort"
	"strings"
)

// The guard's image archive checks before `docker load` (03 §3.6.4, the
// guard's imagecheck package): every name Docker could tag is collected
// from manifest.json, index.json and repositories; ambiguous archives are
// refused (403 load_forbidden); compressions other than gzip are 400.

const maxArchiveMeta = 1 << 20

var (
	archiveRefRe = regexp.MustCompile(`^[a-z0-9][a-z0-9._/-]{0,127}(:[A-Za-z0-9._-]{1,128})?(@sha256:[0-9a-f]{64})?$`)
	archiveTagRe = regexp.MustCompile(`^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$`)
	sha256HexRe  = regexp.MustCompile(`[0-9a-f]{64}`)
	imageIDRe    = regexp.MustCompile(`^sha256:[0-9a-f]{64}$`)
)

type manifestEntry struct {
	Config   string   `json:"Config"`
	RepoTags []string `json:"RepoTags"`
}

// imageArchive is what scanArchive found.
type imageArchive struct {
	candidates []string            // every name Docker may tag
	tags       map[string][]string // image id hex -> names
	manifest   []manifestEntry
}

func archiveName(name string) string {
	for {
		switch {
		case strings.HasPrefix(name, "./"):
			name = name[2:]
		case strings.HasPrefix(name, "/"):
			name = name[1:]
		default:
			return path.Clean(name)
		}
	}
}

func loadForbidden(why string) *apiError {
	return forbidden("load_forbidden", "image archive rejected: "+why)
}

// scanArchive checks the archive; data is the tar stream (decompressed).
func scanArchive(body []byte) (*imageArchive, []byte, *apiError) {
	data := body
	switch {
	case len(body) >= 2 && body[0] == 0x1f && body[1] == 0x8b:
		zr, err := gzip.NewReader(bytes.NewReader(body))
		if err != nil {
			return nil, nil, loadForbidden("gzip")
		}
		zr.Multistream(true)
		if data, err = io.ReadAll(zr); err != nil {
			return nil, nil, loadForbidden("gzip")
		}
	case bytes.HasPrefix(body, []byte{0xfd, '7', 'z', 'X', 'Z', 0}), bytes.HasPrefix(body, []byte("BZh")),
		bytes.HasPrefix(body, []byte{0x28, 0xb5, 0x2f, 0xfd}):
		return nil, nil, badRequest("unsupported archive compression")
	}
	meta := map[string][]byte{}
	tr := tar.NewReader(bytes.NewReader(data))
	for {
		h, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, nil, loadForbidden("tar")
		}
		n := archiveName(h.Name)
		if n != "manifest.json" && n != "index.json" && n != "repositories" {
			continue
		}
		if _, dup := meta[n]; dup {
			return nil, nil, loadForbidden("duplicate " + n)
		}
		if h.Typeflag != tar.TypeReg && h.Typeflag != '\x00' {
			return nil, nil, loadForbidden(n + " is not a regular file")
		}
		if h.Size > maxArchiveMeta {
			return nil, nil, loadForbidden(n + " too large")
		}
		b, err := io.ReadAll(io.LimitReader(tr, maxArchiveMeta+1))
		if err != nil || int64(len(b)) != h.Size {
			return nil, nil, loadForbidden("tar")
		}
		meta[n] = b
	}
	mb, ok := meta["manifest.json"]
	if !ok {
		return nil, nil, loadForbidden("no manifest.json")
	}
	a := &imageArchive{tags: map[string][]string{}}
	if err := json.Unmarshal(mb, &a.manifest); err != nil {
		return nil, nil, loadForbidden("manifest.json")
	}
	var repoTags []string
	for _, m := range a.manifest {
		a.candidates = append(a.candidates, m.RepoTags...)
		repoTags = append(repoTags, m.RepoTags...)
		if hex := sha256HexRe.FindString(m.Config); hex != "" {
			a.tags[hex] = append(a.tags[hex], m.RepoTags...)
		}
	}
	if ib, ok := meta["index.json"]; ok {
		var index struct {
			Manifests []struct {
				Digest      string            `json:"digest"`
				Annotations map[string]string `json:"annotations"`
			} `json:"manifests"`
		}
		if err := json.Unmarshal(ib, &index); err != nil {
			return nil, nil, loadForbidden("index.json")
		}
		for _, m := range index.Manifests {
			cname := m.Annotations["io.containerd.image.name"]
			ref := m.Annotations["org.opencontainers.image.ref.name"]
			var found []string
			if cname != "" {
				found = append(found, cname)
			}
			if ref != "" {
				switch {
				case strings.ContainsAny(ref, "/:@"):
					found = append(found, ref)
				case archiveTagRe.MatchString(ref) && cname != "":
					found = append(found, repoOf(cname)+":"+ref)
				default:
					return nil, nil, loadForbidden("index.json ref.name without repository")
				}
			}
			a.candidates = append(a.candidates, found...)
			if cname != "" && imageIDRe.MatchString(m.Digest) {
				hex := strings.TrimPrefix(m.Digest, "sha256:")
				var short []string
				for _, t := range repoTags {
					if qualified(t) == cname {
						short = append(short, t)
					}
				}
				if len(short) == 0 {
					short = []string{cname}
				}
				a.tags[hex] = append(a.tags[hex], short...)
			}
		}
	}
	if rb, ok := meta["repositories"]; ok {
		var repos map[string]map[string]string
		if err := json.Unmarshal(rb, &repos); err != nil {
			return nil, nil, loadForbidden("repositories")
		}
		for _, repo := range sortedKeys(repos) {
			tags := make([]string, 0, len(repos[repo]))
			for t := range repos[repo] {
				tags = append(tags, t)
			}
			sort.Strings(tags)
			for _, t := range tags {
				a.candidates = append(a.candidates, repo+":"+t)
			}
		}
	}
	return a, data, nil
}

// check is the load whitelist (R9): every name must be a valid reference
// of an allowed repository (nil repos: any repository). An archive naming
// nothing is allowed.
func (a *imageArchive) check(repos []string) *apiError {
	for _, c := range a.candidates {
		if !archiveRefRe.MatchString(c) && !archiveRefRe.MatchString(strings.TrimPrefix(c, "docker.io/")) {
			return loadForbidden("invalid name")
		}
		if !repoAllowed(c, repos) {
			return loadForbidden("name not allowed")
		}
	}
	return nil
}

// allowed reports whether name is one of the archive's names.
func (a *imageArchive) allowed(name string) bool {
	q := qualifiedRef(name)
	for _, c := range a.candidates {
		if qualifiedRef(c) == q {
			return true
		}
	}
	return false
}

// names are the archive's names for an image ID.
func (a *imageArchive) names(id string) []string {
	out := a.tags[strings.TrimPrefix(id, "sha256:")]
	if out == nil {
		return []string{}
	}
	return out
}
