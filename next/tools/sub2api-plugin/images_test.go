package main

import (
	"archive/zip"
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// imageFixture writes <dir>/images with archives for the given roles and
// returns the directory. refs maps role -> image reference.
func imageFixture(t *testing.T, refs map[string]string) string {
	t.Helper()
	dir := filepath.Join(t.TempDir(), "images")
	var entries []string
	for _, role := range []string{"app", "egress", "controller", "gateway"} {
		ref, ok := refs[role]
		if !ok {
			continue
		}
		content := bytes.Repeat([]byte(role), 1000)
		writeFile(t, filepath.Join(dir, role+".tar.gz"), string(content))
		sum := sha256.Sum256(content)
		entries = append(entries, fmt.Sprintf(`"%s": {"ref": %q, "file": "%s.tar.gz", "sha256": "%s", "size": %d}`, role, ref, role, hex.EncodeToString(sum[:]), len(content)))
	}
	writeFile(t, filepath.Join(dir, "images.json"), `{"version": 1, "images": {`+strings.Join(entries, ", ")+`}}`)
	// Not listed in images.json: never packed.
	writeFile(t, filepath.Join(dir, "stray.tar.gz"), "stray")
	writeFile(t, filepath.Join(dir, ".build.abc", "app.tar.gz"), "partial")
	return dir
}

var demoImages = map[string]string{
	"app":        "demo-app:0.1.0",
	"egress":     "demo-egress:0.1.0",
	"controller": "registry.example/x/demo-controller:0.1.0",
	"gateway":    "caddy:2.11.7-alpine",
}

const demoRoles = "app,egress,controller,gateway"

func TestPackBundlesImagesStoredAndSigned(t *testing.T) {
	dir, images, market, keys := demoPlugin(t), imageFixture(t, demoImages), t.TempDir(), t.TempDir()
	pkg := strings.TrimSpace(runOK(t, "pack", "--dir", dir, "--out-dir", market, "--images", images, "--image-roles", demoRoles))

	zr, err := zip.OpenReader(pkg)
	if err != nil {
		t.Fatal(err)
	}
	methods := map[string]uint16{}
	for _, f := range zr.File {
		methods[f.Name] = f.Method
	}
	zr.Close()
	for _, role := range []string{"app", "egress", "controller", "gateway"} {
		name := "images/" + role + ".tar.gz"
		if m, ok := methods[name]; !ok || m != zip.Store {
			t.Errorf("%s: present %v, method %d, want stored", name, ok, m)
		}
	}
	if methods["images/images.json"] != zip.Deflate || methods["manifest.json"] != zip.Deflate {
		t.Errorf("non-image entries must stay deflated: %v", methods)
	}
	for name := range methods {
		if strings.Contains(name, "stray") || strings.Contains(name, ".build") {
			t.Errorf("unlisted file packed: %s", name)
		}
	}
	files, err := readPackage(pkg)
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(files["images/app.tar.gz"], bytes.Repeat([]byte("app"), 1000)) {
		t.Error("image content changed by packing")
	}
	raw, _ := os.ReadFile(filepath.Join(images, "images.json"))
	if !bytes.Equal(files["images/images.json"], raw) {
		t.Error("images.json must be packed byte for byte")
	}

	// The signature covers the images: re-signing keeps them stored, and a
	// changed archive fails verification.
	runOK(t, "keygen", "--key-id", "dev-1", "--out", keys)
	runOK(t, "sign", "--key", filepath.Join(keys, "dev-1.key"), "--key-id", "dev-1", pkg)
	runOK(t, "verify", "--pub", filepath.Join(keys, "dev-1.pub"), pkg)
	zr, err = zip.OpenReader(pkg)
	if err != nil {
		t.Fatal(err)
	}
	for _, f := range zr.File {
		if f.Name == "images/app.tar.gz" && f.Method != zip.Store {
			t.Errorf("signing recompressed %s", f.Name)
		}
	}
	zr.Close()
	signed, _ := readPackage(pkg)
	signed["images/gateway.tar.gz"] = []byte("evil")
	tampered := filepath.Join(t.TempDir(), "tampered.s2plugin")
	if err := writePackage(tampered, signed); err != nil {
		t.Fatal(err)
	}
	if msg := runFail(t, "verify", "--pub", filepath.Join(keys, "dev-1.pub"), tampered); !strings.Contains(msg, "digest mismatch") {
		t.Fatalf("tampered image: %s", msg)
	}

	// The index streams the package instead of reading it into memory.
	runOK(t, "index", "--dir", market, "--key", filepath.Join(keys, "dev-1.key"))
	sum, size, err := fileSHA256(pkg)
	if err != nil {
		t.Fatal(err)
	}
	idx, _ := os.ReadFile(filepath.Join(market, "index.json"))
	if !strings.Contains(string(idx), sum) || !strings.Contains(string(idx), fmt.Sprintf(`"size": %d`, size)) {
		t.Fatalf("index = %s", idx)
	}

	// Without --images nothing is bundled, even when images exist on disk.
	plain := strings.TrimSpace(runOK(t, "pack", "--dir", dir, "--out", filepath.Join(t.TempDir(), "plain.s2plugin")))
	pf, _ := readPackage(plain)
	for name := range pf {
		if strings.HasPrefix(name, "images/") {
			t.Errorf("unexpected %s", name)
		}
	}
}

func TestPackRejectsInvalidImages(t *testing.T) {
	with := func(role, ref string) map[string]string {
		m := map[string]string{}
		for k, v := range demoImages {
			m[k] = v
		}
		if ref == "" {
			delete(m, role)
		} else {
			m[role] = ref
		}
		return m
	}
	cases := []struct {
		name   string
		images string
		roles  string
		want   string
	}{
		{"own image of another version", imageFixture(t, with("app", "demo-app:0.0.9")), demoRoles, "plugin version 0.1.0"},
		{"floating third-party tag", imageFixture(t, with("gateway", "caddy:2-alpine")), demoRoles, "fixed x.y.z"},
		{"latest", imageFixture(t, with("gateway", "caddy:latest")), demoRoles, "fixed x.y.z"},
		{"untagged", imageFixture(t, with("gateway", "caddy")), demoRoles, "name:tag"},
		{"digest", imageFixture(t, with("gateway", "caddy:2.11.7-alpine@sha256:"+strings.Repeat("a", 64))), demoRoles, "name:tag"},
		{"registry port", imageFixture(t, with("app", "localhost:5000/demo-app:0.1.0")), demoRoles, "name:tag"},
		{"missing role", imageFixture(t, with("gateway", "")), demoRoles, `role "gateway" missing`},
		{"unexpected role", imageFixture(t, demoImages), "app,egress,controller", `unexpected role "gateway"`},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			msg := runFail(t, "pack", "--dir", demoPlugin(t), "--out-dir", t.TempDir(), "--images", tc.images, "--image-roles", tc.roles)
			if !strings.Contains(msg, tc.want) {
				t.Fatalf("msg = %s, want %q", msg, tc.want)
			}
		})
	}

	edit := func(t *testing.T, change func(dir string)) string {
		images := imageFixture(t, demoImages)
		change(images)
		return runFail(t, "pack", "--dir", demoPlugin(t), "--out-dir", t.TempDir(), "--images", images, "--image-roles", demoRoles)
	}
	replaceIndex := func(old, new string) func(string) {
		return func(dir string) {
			p := filepath.Join(dir, "images.json")
			raw, _ := os.ReadFile(p)
			if !strings.Contains(string(raw), old) {
				t.Fatalf("fixture lacks %q", old)
			}
			writeFile(t, p, strings.Replace(string(raw), old, new, 1))
		}
	}
	for _, tc := range []struct {
		name   string
		change func(string)
		want   string
	}{
		{"changed archive", func(dir string) { writeFile(t, filepath.Join(dir, "egress.tar.gz"), strings.Repeat("x", 6000)) }, "sha256"},
		{"resized archive", func(dir string) { writeFile(t, filepath.Join(dir, "egress.tar.gz"), "short") }, "images.json says 6000"},
		{"missing archive", func(dir string) { _ = os.Remove(filepath.Join(dir, "app.tar.gz")) }, "app.tar.gz"},
		{"path in file", replaceIndex(`"file": "app.tar.gz"`, `"file": "../app.tar.gz"`), "plain .tar or .tar.gz name"},
		{"unknown field", replaceIndex(`"version": 1`, `"version": 1, "extra": true`), "unknown field"},
		{"version 2", replaceIndex(`"version": 1`, `"version": 2`), "want 1"},
		{"uppercase sha", func(dir string) {
			raw, _ := os.ReadFile(filepath.Join(dir, "images.json"))
			s := string(raw)
			i := strings.Index(s, `"sha256": "`) + len(`"sha256": "`)
			writeFile(t, filepath.Join(dir, "images.json"), s[:i]+strings.ToUpper(s[i:i+64])+s[i+64:])
		}, "lowercase hex"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			if msg := edit(t, tc.change); !strings.Contains(msg, tc.want) {
				t.Fatalf("msg = %s, want %q", msg, tc.want)
			}
		})
	}

	if msg := runFail(t, "pack", "--dir", demoPlugin(t), "--out-dir", t.TempDir(), "--image-roles", demoRoles); !strings.Contains(msg, "requires --images") {
		t.Fatalf("msg = %s", msg)
	}
	if msg := runFail(t, "pack", "--dir", demoPlugin(t), "--out-dir", t.TempDir(), "--images", t.TempDir()); !strings.Contains(msg, "images.json") {
		t.Fatalf("msg = %s", msg)
	}
}

func TestPackageLimits(t *testing.T) {
	files := map[string][]byte{"manifest.json": []byte("{}")}
	for i := range maxPackageFiles {
		files[fmt.Sprintf("assets/%d", i)] = nil
	}
	dest := filepath.Join(t.TempDir(), "many.s2plugin")
	if err := writePackage(dest, files); err == nil || !strings.Contains(err.Error(), "limit is 2000") {
		t.Fatalf("err = %v", err)
	}
	if _, err := os.Stat(dest); !os.IsNotExist(err) {
		t.Fatal("a refused package must not be written")
	}
	lw := &limitedWriter{w: &bytes.Buffer{}, left: 4}
	if _, err := lw.Write([]byte("1234")); err != nil {
		t.Fatal(err)
	}
	if _, err := lw.Write([]byte("5")); err == nil {
		t.Fatal("limit not enforced")
	}
	// Writing goes through a temporary file that does not outlive the rename.
	out := t.TempDir()
	if err := writePackage(filepath.Join(out, "x.s2plugin"), map[string][]byte{"manifest.json": []byte("{}")}); err != nil {
		t.Fatal(err)
	}
	entries, _ := os.ReadDir(out)
	if len(entries) != 1 || entries[0].Name() != "x.s2plugin" {
		t.Fatalf("output dir = %v", entries)
	}
}
