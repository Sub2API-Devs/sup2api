// Package imagecheck parses an image archive before `docker load` (03
// §3.6.4): it collects every name Docker could tag from manifest.json,
// index.json and repositories, rejects ambiguous archives, and maps image
// ids to the names the archive gives them (images.archive_tags).
package imagecheck

import (
	"archive/tar"
	"bufio"
	"bytes"
	"compress/gzip"
	"encoding/json"
	"errors"
	"io"
	"path"
	"regexp"
	"sort"
	"strings"

	"ccgateway/guard/internal/config"
)

const maxMeta = 1 << 20

// ErrCompression is an archive compressed with something other than gzip.
var ErrCompression = errors.New("unsupported archive compression")

// Forbidden is an archive the guard refuses (403 load_forbidden).
type Forbidden struct{ Why string }

func (e *Forbidden) Error() string { return "image archive rejected: " + e.Why }

func forbid(why string) error { return &Forbidden{Why: why} }

// Archive is what Scan found.
type Archive struct {
	Gzip       bool
	Candidates []string            // every name Docker may tag (as written in the archive)
	Tags       map[string][]string // image id hex -> names (archive_tags)
}

var (
	refRe    = regexp.MustCompile(`^[a-z0-9][a-z0-9._/-]{0,127}(:[A-Za-z0-9._-]{1,128})?(@sha256:[0-9a-f]{64})?$`)
	tagRe    = regexp.MustCompile(`^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$`)
	sha256Re = regexp.MustCompile(`[0-9a-f]{64}`)
	idRe     = regexp.MustCompile(`^sha256:[0-9a-f]{64}$`)
)

func normalize(name string) string {
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

var metaNames = map[string]bool{"manifest.json": true, "index.json": true, "repositories": true}

// Scan reads the whole archive (metadata only; layers are skipped).
func Scan(r io.Reader) (*Archive, error) {
	br := bufio.NewReaderSize(r, 64<<10)
	head, _ := br.Peek(6)
	a := &Archive{Tags: map[string][]string{}}
	var src io.Reader = br
	switch {
	case len(head) >= 2 && head[0] == 0x1f && head[1] == 0x8b:
		zr, err := gzip.NewReader(br)
		if err != nil {
			return nil, forbid("gzip")
		}
		zr.Multistream(true)
		src = zr
		a.Gzip = true
	case bytes.HasPrefix(head, []byte{0xfd, '7', 'z', 'X', 'Z', 0}),
		bytes.HasPrefix(head, []byte("BZh")),
		bytes.HasPrefix(head, []byte{0x28, 0xb5, 0x2f, 0xfd}):
		return nil, ErrCompression
	}
	tr := tar.NewReader(src)
	meta := map[string][]byte{}
	seen := map[string]int{}
	for {
		h, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, forbid("tar")
		}
		n := normalize(h.Name)
		if !metaNames[n] {
			continue
		}
		seen[n]++
		if seen[n] > 1 {
			return nil, forbid("duplicate " + n)
		}
		if h.Typeflag != tar.TypeReg && h.Typeflag != '\x00' {
			return nil, forbid(n + " is not a regular file")
		}
		if h.Size > maxMeta {
			return nil, forbid(n + " too large")
		}
		b, err := io.ReadAll(io.LimitReader(tr, maxMeta+1))
		if err != nil || int64(len(b)) != h.Size {
			return nil, forbid("tar")
		}
		meta[n] = b
	}
	if a.Gzip {
		// Trailing garbage after the tar end is read by Docker too; drain it.
		if _, err := io.Copy(io.Discard, src); err != nil {
			return nil, forbid("gzip")
		}
	}
	mb, ok := meta["manifest.json"]
	if !ok {
		return nil, forbid("no manifest.json")
	}
	var manifest []struct {
		Config   string   `json:"Config"`
		RepoTags []string `json:"RepoTags"`
	}
	if err := json.Unmarshal(mb, &manifest); err != nil {
		return nil, forbid("manifest.json")
	}
	var repoTags []string
	for _, m := range manifest {
		for _, t := range m.RepoTags {
			a.Candidates = append(a.Candidates, t)
			repoTags = append(repoTags, t)
		}
		if hex := sha256Re.FindString(m.Config); hex != "" {
			a.Tags[hex] = append(a.Tags[hex], m.RepoTags...)
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
			return nil, forbid("index.json")
		}
		for _, m := range index.Manifests {
			cname := m.Annotations["io.containerd.image.name"]
			ref := m.Annotations["org.opencontainers.image.ref.name"]
			var names []string
			if cname != "" {
				names = append(names, cname)
			}
			if ref != "" {
				switch {
				case strings.ContainsAny(ref, "/:@"):
					names = append(names, ref)
				case tagRe.MatchString(ref) && cname != "":
					repo, _, _ := config.SplitRef(cname)
					names = append(names, repo+":"+ref)
				default:
					return nil, forbid("index.json ref.name without repository")
				}
			}
			a.Candidates = append(a.Candidates, names...)
			if cname != "" && idRe.MatchString(m.Digest) {
				hex := strings.TrimPrefix(m.Digest, "sha256:")
				var short []string
				for _, t := range repoTags {
					if config.Qualify(t) == cname {
						short = append(short, t)
					}
				}
				if len(short) == 0 {
					short = []string{cname}
				}
				a.Tags[hex] = append(a.Tags[hex], short...)
			}
		}
	}
	if rb, ok := meta["repositories"]; ok {
		var repos map[string]map[string]string
		if err := json.Unmarshal(rb, &repos); err != nil {
			return nil, forbid("repositories")
		}
		keys := make([]string, 0, len(repos))
		for k := range repos {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		for _, repo := range keys {
			tags := make([]string, 0, len(repos[repo]))
			for t := range repos[repo] {
				tags = append(tags, t)
			}
			sort.Strings(tags)
			for _, t := range tags {
				a.Candidates = append(a.Candidates, repo+":"+t)
			}
		}
	}
	return a, nil
}

// Check applies the load whitelist to every candidate (R9). An archive
// naming nothing is allowed.
func Check(a *Archive, allowed []config.Pattern) error {
	for _, c := range a.Candidates {
		if !refRe.MatchString(c) && !refRe.MatchString(strings.TrimPrefix(c, "docker.io/")) {
			return forbid("invalid name")
		}
		repo, _, _ := config.SplitRef(c)
		if !config.MatchAny(allowed, repo) {
			return forbid("name not allowed")
		}
	}
	return nil
}

// Allowed reports whether a "Loaded image: <name>" line names a candidate.
func (a *Archive) Allowed(name string) bool {
	q := qualifyRef(name)
	for _, c := range a.Candidates {
		if qualifyRef(c) == q {
			return true
		}
	}
	return false
}

func qualifyRef(ref string) string {
	repo, tag, digest := config.SplitRef(ref)
	out := config.Qualify(repo)
	if tag == "" && digest == "" {
		tag = "latest"
	}
	if tag != "" {
		out += ":" + tag
	}
	if digest != "" {
		out += "@" + digest
	}
	return out
}

// Names is images._names: the archive's names for an image id.
func (a *Archive) Names(id string) []string {
	out := a.Tags[strings.TrimPrefix(id, "sha256:")]
	if out == nil {
		return []string{}
	}
	return out
}
