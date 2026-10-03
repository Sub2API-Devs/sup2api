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
	"strings"
	"testing"

	rc "github.com/Sub2API-Devs/sup2api/next/runtime-contract"
)

func fixture(t *testing.T) (rc.SignedManifest, []byte, map[string]ed25519.PublicKey) {
	t.Helper()
	body := []byte("#!/bin/sh\nexit 0\n")
	var buf bytes.Buffer
	gz := gzip.NewWriter(&buf)
	tw := tar.NewWriter(gz)
	if e := tw.WriteHeader(&tar.Header{Name: "bin/sub2api", Mode: 0755, Size: int64(len(body)), Typeflag: tar.TypeReg}); e != nil {
		t.Fatal(e)
	}
	tw.Write(body)
	tw.Close()
	gz.Close()
	bundle := buf.Bytes()
	manifest := rc.Manifest{ManifestVersion: 1, ReleaseID: "r1", BuildID: "build1", Strategy: "rolling", ShellProtocol: rc.Range{Min: rc.Protocol, Max: rc.Protocol}, CoreControlProtocol: rc.Range{Min: rc.Protocol, Max: rc.Protocol}, Platforms: []rc.Platform{{OS: "linux", Arch: "amd64", RuntimeABI: "linux-static-v1", BundleDigest: Digest(bundle), BundleBytes: int64(len(bundle)), Files: []rc.File{{Path: "bin/sub2api", SHA256: Digest(body), Size: int64(len(body)), Mode: 0755}}}}}
	payload, _ := json.Marshal(manifest)
	pub, priv, e := ed25519.GenerateKey(rand.Reader)
	if e != nil {
		t.Fatal(e)
	}
	return rc.SignedManifest{KeyID: "test", Payload: payload, Signature: ed25519.Sign(priv, payload)}, bundle, map[string]ed25519.PublicKey{"test": pub}
}
func TestVerifyRejectsTamperingAndUnknownKey(t *testing.T) {
	s, _, keys := fixture(t)
	if _, _, e := Verify(s, keys); e != nil {
		t.Fatal(e)
	}
	s.Payload = append(s.Payload, ' ')
	if _, _, e := Verify(s, keys); e == nil {
		t.Fatal("tampered manifest accepted")
	}
	s, _, _ = fixture(t)
	if _, _, e := Verify(s, keys); e == nil {
		t.Fatal("wrong signing key accepted")
	}
}
func TestExtractRejectsUnsafeEntries(t *testing.T) {
	for _, tc := range []struct {
		name string
		kind byte
		link string
	}{{"../outside", tar.TypeReg, ""}, {"/absolute", tar.TypeReg, ""}, {"bin/sub2api", tar.TypeSymlink, "../../outside"}, {"bin/sub2api", tar.TypeLink, "../../outside"}, {"bin/sub2api", tar.TypeChar, ""}, {"undeclared", tar.TypeReg, ""}} {
		t.Run(tc.name+string(tc.kind), func(t *testing.T) {
			var b bytes.Buffer
			gz := gzip.NewWriter(&b)
			tw := tar.NewWriter(gz)
			if e := tw.WriteHeader(&tar.Header{Name: tc.name, Typeflag: tc.kind, Linkname: tc.link, Mode: 0755}); e != nil {
				t.Fatal(e)
			}
			tw.Close()
			gz.Close()
			tmp := t.TempDir()
			blob := filepath.Join(tmp, "archive")
			os.WriteFile(blob, b.Bytes(), 0600)
			root := filepath.Join(tmp, "content")
			os.Mkdir(root, 0700)
			err := extract(context.Background(), blob, root, []rc.File{{Path: "bin/sub2api", SHA256: Digest(nil), Mode: 0755}})
			if err == nil {
				t.Fatal("unsafe archive accepted")
			}
		})
	}
}
func TestPrepareRejectsBadDigestBeforeInstalling(t *testing.T) {
	s, bundle, keys := fixture(t)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.Write(append(bundle, 'x')) }))
	defer server.Close()
	m := Manager{Root: t.TempDir(), TrustedKeys: keys, OS: "linux", Arch: "amd64", RuntimeABI: "linux-static-v1", AllowHTTP: true}
	if _, e := m.Prepare(context.Background(), s, server.URL); e == nil {
		t.Fatal("oversized bundle accepted")
	}
	if _, e := m.Current(); !os.IsNotExist(e) {
		t.Fatalf("changed current: %v", e)
	}
}
func TestDownloadDoesNotFollowRedirect(t *testing.T) {
	m := Manager{AllowHTTP: true}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { http.Redirect(w, r, "http://127.0.0.1:1/private", 302) }))
	defer server.Close()
	if _, e := m.FetchManifest(context.Background(), server.URL); e == nil || !strings.Contains(e.Error(), "redirect") {
		t.Fatalf("unexpected redirect outcome %v", e)
	}
}
func TestPrepareSwitchAndJournalRecovery(t *testing.T) {
	if runtime.GOOS != "linux" {
		t.Skip("durable rename and directory fsync require Linux")
	}
	s, bundle, keys := fixture(t)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.Write(bundle) }))
	defer server.Close()
	m := Manager{Root: t.TempDir(), TrustedKeys: keys, OS: "linux", Arch: "amd64", RuntimeABI: "linux-static-v1", AllowHTTP: true}
	ctx := context.Background()
	p, e := m.Prepare(ctx, s, server.URL)
	if e != nil {
		t.Fatal(e)
	}
	if e = m.Switch(ctx, "op1", p.Digest); e != nil {
		t.Fatal(e)
	}
	d, e := m.Current()
	if e != nil || d != p.Digest {
		t.Fatalf("current %q: %v", d, e)
	}
	if e = m.writeJournal(Journal{OperationID: "op1", TargetDigest: d, Phase: "switching"}); e != nil {
		t.Fatal(e)
	}
	if e = m.Switch(ctx, "op1", d); e != nil {
		t.Fatal(e)
	}
	j, e := m.ReadJournal()
	if e != nil || j.Phase != "switched" {
		t.Fatalf("journal not recovered %#v: %v", j, e)
	}
	// A crash after committing the release directory but before writing its
	// manifest must be repairable by another Prepare, without changing current.
	os.Remove(filepath.Join(m.Root, "manifests", d))
	if _, e = m.Prepare(ctx, s, server.URL); e != nil {
		t.Fatal(e)
	}
	if e = m.Switch(ctx, "op1", d); e != nil {
		t.Fatal(e)
	}
	// Two distinct signed releases may share an identical content-addressed
	// bundle; switching still retains the prior manifest identity atomically.
	var next rc.Manifest
	if e = json.Unmarshal(s.Payload, &next); e != nil {
		t.Fatal(e)
	}
	next.ReleaseID = "r2"
	next.BuildID = "build2"
	pub, priv, e := ed25519.GenerateKey(rand.Reader)
	if e != nil {
		t.Fatal(e)
	}
	keys["next"] = pub
	payload, _ := json.Marshal(next)
	s2 := rc.SignedManifest{KeyID: "next", Payload: payload, Signature: ed25519.Sign(priv, payload)}
	p2, e := m.Prepare(ctx, s2, server.URL)
	if e != nil {
		t.Fatal(e)
	}
	cancelled, cancel := context.WithCancel(ctx)
	cancel()
	if e = m.Switch(cancelled, "op2", p2.Digest); e == nil {
		t.Fatal("cancelled switch accepted")
	}
	if got, e := m.Current(); e != nil || got != d {
		t.Fatalf("cancelled switch changed current %s %v", got, e)
	}
	if e = m.Switch(ctx, "op2", p2.Digest); e != nil {
		t.Fatal(e)
	}
	previous, e := os.Readlink(filepath.Join(m.Root, "previous"))
	if e != nil || previous != filepath.Join("releases", d) {
		t.Fatalf("previous %q %v", previous, e)
	}
	os.WriteFile(filepath.Join(p.Directory, "bin/sub2api"), []byte("changed"), 0755)
	if _, e = m.Prepare(ctx, s, server.URL); e == nil {
		t.Fatal("modified installed file accepted")
	}
}
