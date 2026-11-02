package release

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"runtime"
	"testing"
	"time"

	rc "github.com/Sub2API-Devs/sup2api/next/runtime-contract"
)

// gcRelease is one signed release with its own bundle (body differs).
type gcRelease struct {
	signed rc.SignedManifest
	bundle []byte
}

func gcReleases(t *testing.T, n int) ([]gcRelease, map[string]ed25519.PublicKey) {
	t.Helper()
	pub, priv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	var out []gcRelease
	for i := 0; i < n; i++ {
		body := []byte("#!/bin/sh\nexit " + string(rune('0'+i)) + "\n")
		var buf bytes.Buffer
		gz := gzip.NewWriter(&buf)
		tw := tar.NewWriter(gz)
		if err := tw.WriteHeader(&tar.Header{Name: "bin/sub2api", Mode: 0755, Size: int64(len(body)), Typeflag: tar.TypeReg}); err != nil {
			t.Fatal(err)
		}
		tw.Write(body)
		tw.Close()
		gz.Close()
		bundle := buf.Bytes()
		m := rc.Manifest{ManifestVersion: 1, ReleaseID: "r" + string(rune('0'+i)), BuildID: "b", Strategy: "rolling",
			ShellProtocol: rc.Range{Min: rc.Protocol, Max: rc.Protocol}, CoreControlProtocol: rc.Range{Min: rc.Protocol, Max: rc.Protocol},
			Platforms: []rc.Platform{{OS: "linux", Arch: "amd64", RuntimeABI: "linux-static-v1", BundleDigest: Digest(bundle), BundleBytes: int64(len(bundle)),
				Files: []rc.File{{Path: "bin/sub2api", SHA256: Digest(body), Size: int64(len(body)), Mode: 0755}}}}}
		payload, _ := json.Marshal(m)
		out = append(out, gcRelease{rc.SignedManifest{KeyID: "test", Payload: payload, Signature: ed25519.Sign(priv, payload)}, bundle})
	}
	return out, map[string]ed25519.PublicKey{"test": pub}
}

// age makes every file of release digest (directory, manifest, blob) old.
func (m *Manager) age(t *testing.T, digest, blob string) {
	t.Helper()
	old := time.Now().Add(-48 * time.Hour)
	for _, p := range []string{filepath.Join(m.Root, "releases", digest), filepath.Join(m.Root, "manifests", digest), filepath.Join(m.Root, "blobs", "sha256", blob)} {
		if err := os.Chtimes(p, old, old); err != nil {
			t.Fatal(err)
		}
	}
}

func exists(p string) bool { _, err := os.Stat(p); return err == nil }

func TestGCKeepsCurrentPreviousAndRecentlyPrepared(t *testing.T) {
	if runtime.GOOS != "linux" {
		t.Skip("durable rename and directory fsync require Linux")
	}
	rels, keys := gcReleases(t, 4)
	var serving []byte
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.Write(serving) }))
	defer server.Close()
	m := Manager{Root: t.TempDir(), TrustedKeys: keys, OS: "linux", Arch: "amd64", RuntimeABI: "linux-static-v1", AllowHTTP: true}
	ctx := context.Background()

	// Nothing switched yet: nothing is known to be unneeded.
	serving = rels[0].bundle
	first, err := m.Prepare(ctx, rels[0].signed, server.URL)
	if err != nil {
		t.Fatal(err)
	}
	m.age(t, first.Digest, first.Platform.BundleDigest)
	if n, err := m.GC(ctx, time.Hour); n != 0 || err != nil || !exists(first.Directory) {
		t.Fatal("GC before any switch", n, err)
	}

	var prepared []Prepared
	for i, r := range rels {
		serving = r.bundle
		p, err := m.Prepare(ctx, r.signed, server.URL)
		if err != nil {
			t.Fatal(err)
		}
		prepared = append(prepared, p)
		if i < 3 {
			if err := m.Switch(ctx, "op"+p.Digest[:8], p.Digest); err != nil {
				t.Fatal(err)
			}
		}
	}
	// 0 and 1 ran before; 2 is current, 1 previous; 3 was just prepared for a plan.
	for _, i := range []int{0, 1, 2} {
		m.age(t, prepared[i].Digest, prepared[i].Platform.BundleDigest)
	}
	n, err := m.GC(ctx, time.Hour)
	if err != nil || n != 1 {
		t.Fatal(n, err)
	}
	gone := prepared[0]
	if exists(gone.Directory) || exists(filepath.Join(m.Root, "manifests", gone.Digest)) || exists(filepath.Join(m.Root, "blobs", "sha256", gone.Platform.BundleDigest)) {
		t.Fatal("release 0 kept")
	}
	for _, p := range prepared[1:] {
		if !exists(p.Directory) || !exists(filepath.Join(m.Root, "manifests", p.Digest)) || !exists(filepath.Join(m.Root, "blobs", "sha256", p.Platform.BundleDigest)) {
			t.Fatal("kept release lost", p.Digest)
		}
	}
	// The recently prepared one still switches; the previous one still rolls back.
	if err := m.Switch(ctx, "op3", prepared[3].Digest); err != nil {
		t.Fatal(err)
	}
	if err := m.Switch(ctx, "back", prepared[2].Digest); err != nil {
		t.Fatal(err)
	}
	// Once old, the release neither pointer names goes too (1 now: current 2, previous 3).
	m.age(t, prepared[3].Digest, prepared[3].Platform.BundleDigest)
	if n, err := m.GC(ctx, time.Hour); err != nil || n != 1 || exists(prepared[1].Directory) || !exists(prepared[3].Directory) {
		t.Fatal(n, err)
	}
}
