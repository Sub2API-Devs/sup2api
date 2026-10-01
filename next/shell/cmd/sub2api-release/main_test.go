package main

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"crypto/ed25519"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"

	rc "github.com/Sub2API-Devs/sup2api/next/runtime-contract"
	"github.com/Sub2API-Devs/sup2api/next/shell/internal/release"
)

func TestPackSignedImmutableRelease(t *testing.T) {
	root := t.TempDir()
	keys := filepath.Join(root, "keys")
	stage := filepath.Join(root, "stage")
	dest := filepath.Join(root, "publish")
	if err := run([]string{"keygen", "--out", keys}, io.Discard); err != nil {
		t.Fatal(err)
	}
	before, err := os.ReadFile(filepath.Join(keys, "release.key"))
	if err != nil {
		t.Fatal(err)
	}
	if err = run([]string{"keygen", "--out", keys}, io.Discard); err == nil {
		t.Fatal("overwrote key")
	}
	after, _ := os.ReadFile(filepath.Join(keys, "release.key"))
	if !bytes.Equal(before, after) {
		t.Fatal("private key changed")
	}
	if err = os.MkdirAll(filepath.Join(stage, "bin"), 0755); err != nil {
		t.Fatal(err)
	}
	core := []byte("real build output goes here\n")
	if err = os.WriteFile(filepath.Join(stage, "bin", "sub2api"), core, 0644); err != nil {
		t.Fatal(err)
	}
	var out bytes.Buffer
	if err = run([]string{"pack", "--dir", stage, "--out", dest, "--key", filepath.Join(keys, "release.key"), "--key-id", "test", "--release-id", "r1", "--core-version", "0.1.0", "--source-commit", "source-snapshot", "--schema", "schema-hash", "--os", "linux", "--arch", "amd64"}, &out); err != nil {
		t.Fatal(err)
	}
	paths, err := filepath.Glob(filepath.Join(dest, "*.json"))
	if err != nil || len(paths) != 1 {
		t.Fatalf("manifests %v: %v", paths, err)
	}
	raw, err := os.ReadFile(paths[0])
	if err != nil {
		t.Fatal(err)
	}
	var signed rc.SignedManifest
	if err = json.Unmarshal(raw, &signed); err != nil {
		t.Fatal(err)
	}
	pubRaw, _ := os.ReadFile(filepath.Join(keys, "release.pub"))
	pub, err := base64.StdEncoding.DecodeString(strings.TrimSpace(string(pubRaw)))
	if err != nil {
		t.Fatal(err)
	}
	m, digest, err := release.Verify(signed, map[string]ed25519.PublicKey{"test": pub})
	if err != nil {
		t.Fatal(err)
	}
	if filepath.Base(paths[0]) != digest+".json" || m.ReleaseID != "r1" || m.SchemaBefore != "schema-hash" || m.SchemaAfter != "schema-hash" || m.Strategy != "maintenance" {
		t.Fatalf("bad manifest: %+v", m)
	}
	if !m.ShellProtocol.Contains(rc.Protocol) || !m.CoreControlProtocol.Contains(rc.Protocol) {
		t.Fatal("release cannot be used by the current shell/core protocol")
	}
	p := m.Platforms[0]
	blob, err := os.ReadFile(filepath.Join(dest, p.BundleDigest+".tar.gz"))
	if err != nil {
		t.Fatal(err)
	}
	hash := sha256.Sum256(blob)
	if hex.EncodeToString(hash[:]) != p.BundleDigest || int64(len(blob)) != p.BundleBytes {
		t.Fatal("bundle digest/size mismatch")
	}
	gz, err := gzip.NewReader(bytes.NewReader(blob))
	if err != nil {
		t.Fatal(err)
	}
	defer gz.Close()
	tr := tar.NewReader(gz)
	h, err := tr.Next()
	if err != nil {
		t.Fatal(err)
	}
	b, err := io.ReadAll(tr)
	if err != nil {
		t.Fatal(err)
	}
	if h.Name != "bin/sub2api" || h.Mode != 0755 || !bytes.Equal(b, core) {
		t.Fatal("archive mismatch")
	}
	if _, err = tr.Next(); err != io.EOF {
		t.Fatalf("extra archive entry: %v", err)
	}
	// A migration release must sign both ends. The source must not be silently
	// overwritten with the target contract when publishing the bundle.
	migrationDest := filepath.Join(root, "migration")
	if err = run([]string{"pack", "--dir", stage, "--out", migrationDest, "--key", filepath.Join(keys, "release.key"), "--key-id", "test", "--release-id", "r2", "--core-version", "0.2.0", "--source-commit", "migration-snapshot", "--schema-before", "schema-hash", "--schema", "schema-new", "--os", "linux", "--arch", "amd64"}, io.Discard); err != nil {
		t.Fatal(err)
	}
	migrationPaths, err := filepath.Glob(filepath.Join(migrationDest, "*.json"))
	if err != nil || len(migrationPaths) != 1 {
		t.Fatalf("migration manifests %v: %v", migrationPaths, err)
	}
	migrationRaw, err := os.ReadFile(migrationPaths[0])
	if err != nil {
		t.Fatal(err)
	}
	var migrationSigned rc.SignedManifest
	if err = json.Unmarshal(migrationRaw, &migrationSigned); err != nil {
		t.Fatal(err)
	}
	migration, _, err := release.Verify(migrationSigned, map[string]ed25519.PublicKey{"test": pub})
	if err != nil || migration.SchemaBefore != "schema-hash" || migration.SchemaAfter != "schema-new" || migration.Strategy != "maintenance" {
		t.Fatalf("migration contract lost: %+v %v", migration, err)
	}
	signed.Payload = append(signed.Payload, ' ')
	if _, _, err = release.Verify(signed, map[string]ed25519.PublicKey{"test": pub}); err == nil {
		t.Fatal("tampered manifest verified")
	}
}

func TestBundleRejectsMissingCoreAndSymlink(t *testing.T) {
	root := t.TempDir()
	if _, err := bundle(root, io.Discard); err == nil {
		t.Fatal("accepted empty release")
	}
	if err := os.MkdirAll(filepath.Join(root, "bin"), 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, "bin", "sub2api"), []byte("core"), 0644); err != nil {
		t.Fatal(err)
	}
	if err := os.Symlink(filepath.Join(root, "bin", "sub2api"), filepath.Join(root, "alias")); err != nil {
		t.Skipf("symlink unavailable: %v", err)
	}
	if _, err := bundle(root, io.Discard); err == nil {
		t.Fatal("accepted symlink")
	}
}

func TestPublishCannotReplaceArtifact(t *testing.T) {
	root := t.TempDir()
	a := filepath.Join(root, "a")
	b := filepath.Join(root, "b")
	target := filepath.Join(root, "target")
	if err := os.WriteFile(a, []byte("old"), 0600); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(b, []byte("new"), 0600); err != nil {
		t.Fatal(err)
	}
	if err := publishFile(a, target); err != nil {
		t.Fatal(err)
	}
	if err := publishFile(a, target); err != nil {
		t.Fatalf("same content should be idempotent: %v", err)
	}
	if err := publishFile(b, target); err == nil {
		t.Fatal("replaced existing artifact")
	}
	got, _ := os.ReadFile(target)
	if string(got) != "old" {
		t.Fatal("existing release was modified")
	}
}
