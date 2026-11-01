package imagecheck

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"errors"
	"strings"
	"testing"

	"ccgateway/guard/internal/config"
)

type entry struct {
	name string
	data string
	typ  byte
	link string
}

func archive(t *testing.T, gz bool, entries ...entry) []byte {
	t.Helper()
	var buf bytes.Buffer
	tw := tar.NewWriter(&buf)
	for _, e := range entries {
		typ := e.typ
		if typ == 0 {
			typ = tar.TypeReg
		}
		h := &tar.Header{Name: e.name, Typeflag: typ, Mode: 0o644, Linkname: e.link}
		if typ == tar.TypeReg {
			h.Size = int64(len(e.data))
		}
		if err := tw.WriteHeader(h); err != nil {
			t.Fatal(err)
		}
		if typ == tar.TypeReg {
			_, _ = tw.Write([]byte(e.data))
		}
	}
	_ = tw.Close()
	if !gz {
		return buf.Bytes()
	}
	var z bytes.Buffer
	zw := gzip.NewWriter(&z)
	_, _ = zw.Write(buf.Bytes())
	_ = zw.Close()
	return z.Bytes()
}

const cfgHex = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
const idxHex = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"

func manifest(tags ...string) string {
	q := make([]string, len(tags))
	for i, t := range tags {
		q[i] = `"` + t + `"`
	}
	return `[{"Config":"blobs/sha256/` + cfgHex + `","RepoTags":[` + strings.Join(q, ",") + `],"Layers":[]}]`
}

func allowed(t *testing.T) []config.Pattern {
	ps, err := config.ParsePatterns("ccgateway-*,ghcr.io/sub2api-devs/ccgateway-*")
	if err != nil {
		t.Fatal(err)
	}
	return ps
}

func scanCheck(t *testing.T, data []byte) error {
	a, err := Scan(bytes.NewReader(data))
	if err != nil {
		return err
	}
	return Check(a, allowed(t))
}

// covers: R9 03§3.6.4 classic and containerd archives map ids to names (archive_tags)
func TestScanAccepts(t *testing.T) {
	index := `{"manifests":[{"digest":"sha256:` + idxHex + `","annotations":{"io.containerd.image.name":"docker.io/library/ccgateway-app:1","org.opencontainers.image.ref.name":"1"}}]}`
	for _, gz := range []bool{false, true} {
		data := archive(t, gz,
			entry{name: "blobs/sha256/" + cfgHex, data: "{}"},
			entry{name: "manifest.json", data: manifest("ccgateway-app:1")},
			entry{name: "index.json", data: index},
			entry{name: "repositories", data: `{"ccgateway-app":{"1":"` + cfgHex + `"}}`},
		)
		a, err := Scan(bytes.NewReader(data))
		if err != nil {
			t.Fatal(err)
		}
		if a.Gzip != gz {
			t.Fatal("gzip detection")
		}
		if err := Check(a, allowed(t)); err != nil {
			t.Fatal(err)
		}
		if got := a.Names("sha256:" + cfgHex); len(got) != 1 || got[0] != "ccgateway-app:1" {
			t.Fatalf("classic names %v", got)
		}
		if got := a.Names(idxHex); len(got) != 1 || got[0] != "ccgateway-app:1" {
			t.Fatalf("containerd names %v", got)
		}
		if !a.Allowed("ccgateway-app:1") || !a.Allowed("docker.io/library/ccgateway-app:1") || a.Allowed("caddy:latest") {
			t.Fatal("allowed")
		}
	}
	// No tags at all: allowed, nothing named.
	a, err := Scan(bytes.NewReader(archive(t, false, entry{name: "manifest.json", data: manifest()})))
	if err != nil || Check(a, allowed(t)) != nil || len(a.Candidates) != 0 {
		t.Fatalf("untagged %v", err)
	}
	// ./manifest.json alone is the same file.
	if err := scanCheck(t, archive(t, false, entry{name: "./manifest.json", data: manifest("ccgateway-x:2")})); err != nil {
		t.Fatal(err)
	}
}

// covers: R9 A5 03§11.3 import table: every way to name a foreign tag is refused
func TestScanRejects(t *testing.T) {
	forbidden := map[string][]byte{
		"caddy:latest": archive(t, false, entry{name: "manifest.json", data: manifest("caddy:latest")}),
		"second manifest.json with caddy": archive(t, false,
			entry{name: "manifest.json", data: manifest("ccgateway-app:1")},
			entry{name: "manifest.json", data: manifest("caddy:latest")}),
		"./manifest.json and manifest.json": archive(t, false,
			entry{name: "./manifest.json", data: manifest("ccgateway-app:1")},
			entry{name: "manifest.json", data: manifest("ccgateway-app:1")}),
		"manifest.json symlink": archive(t, false,
			entry{name: "real.json", data: manifest("caddy:latest")},
			entry{name: "manifest.json", typ: tar.TypeSymlink, link: "real.json"}),
		"manifest.json hardlink": archive(t, false,
			entry{name: "real.json", data: manifest("caddy:latest")},
			entry{name: "manifest.json", typ: tar.TypeLink, link: "real.json"}),
		"repositories names foreign": archive(t, false,
			entry{name: "manifest.json", data: manifest()},
			entry{name: "repositories", data: `{"postgres":{"16":"` + cfgHex + `"}}`}),
		"index containerd name foreign": archive(t, false,
			entry{name: "manifest.json", data: manifest("ccgateway-app:1")},
			entry{name: "index.json", data: `{"manifests":[{"digest":"sha256:` + idxHex + `","annotations":{"io.containerd.image.name":"docker.io/library/caddy:latest"}}]}`}),
		"index ref.name only a tag": archive(t, false,
			entry{name: "manifest.json", data: manifest()},
			entry{name: "index.json", data: `{"manifests":[{"digest":"sha256:` + idxHex + `","annotations":{"org.opencontainers.image.ref.name":"latest"}}]}`}),
		"index ref.name full foreign": archive(t, false,
			entry{name: "manifest.json", data: manifest()},
			entry{name: "index.json", data: `{"manifests":[{"digest":"sha256:` + idxHex + `","annotations":{"org.opencontainers.image.ref.name":"caddy:2"}}]}`}),
		"no manifest.json":        archive(t, false, entry{name: "index.json", data: `{"manifests":[]}`}),
		"manifest.json not json":  archive(t, false, entry{name: "manifest.json", data: "nope"}),
		"manifest.json too large": archive(t, false, entry{name: "manifest.json", data: strings.Repeat(" ", 1<<20+1)}),
		"not a tar":               []byte(strings.Repeat("x", 2048)),
		"pull repo for load":      archive(t, false, entry{name: "manifest.json", data: manifest("ghcr.io/sub2api-devs/other:1")}),
		"subpath of allowed":      archive(t, false, entry{name: "manifest.json", data: manifest("ccgateway-x/caddy:1")}),
	}
	for name, data := range forbidden {
		err := scanCheck(t, data)
		var f *Forbidden
		if !errors.As(err, &f) {
			t.Errorf("%s: %v", name, err)
		}
	}
	for name, magic := range map[string][]byte{
		"xz": {0xfd, '7', 'z', 'X', 'Z', 0, 1, 2}, "bzip2": []byte("BZh91AY&SY"), "zstd": {0x28, 0xb5, 0x2f, 0xfd, 0, 0},
	} {
		if _, err := Scan(bytes.NewReader(magic)); !errors.Is(err, ErrCompression) {
			t.Errorf("%s: %v", name, err)
		}
	}
}
