package api

import (
	"context"
	"net/http"
	"os"
	"path/filepath"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/blobs"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/pkg/pkgtest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/registry/registrytest"
)

// The review of a version whose package no node holds any more (a failed
// upgrade's package, cleaned up) is 410 package_gone, not 500: the version
// row is there, its package is not. A version that does not exist stays 404.
func TestReviewOfAVersionWhosePackageIsGone(t *testing.T) {
	h, root := newHarness(t)
	m := pkgtest.Guard("guard", "0.1.0", "sub2api")
	m.Description = manifest.LocalizedText{"en": "package removed after upload"} // a package no other test shares
	if code, out := h.do("POST", "/plugins/upload", "admin", fileBody(t, pkgtest.Build(m, root))); code != http.StatusOK {
		t.Fatalf("upload = %d %v", code, out)
	}
	var sum string
	if err := h.db.Pool.QueryRow(context.Background(), `SELECT package_sha256 FROM plugin_versions WHERE plugin_key = 'guard' AND version = '0.1.0'`).Scan(&sum); err != nil {
		t.Fatal(err)
	}
	dir := string(registrytest.Source().Store.(blobs.Dir))
	if err := os.Remove(filepath.Join(dir, sum[:2], sum)); err != nil {
		t.Fatal(err)
	}

	code, out := h.do("GET", "/plugins/guard/versions/0.1.0/review", "admin", nil)
	if e, _ := out["error"].(map[string]any); code != http.StatusGone || e["code"] != "package_gone" {
		t.Fatalf("review of a removed package = %d %v", code, out)
	}
	if code, out = h.do("GET", "/plugins/guard/versions/9.9.9/review", "admin", nil); code != http.StatusNotFound {
		t.Fatalf("review of a missing version = %d %v", code, out)
	}
}
