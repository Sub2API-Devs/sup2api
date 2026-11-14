package api

import (
	"context"
	"net/http"
	"os"
	"path/filepath"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/blobs"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/install"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/pkg/pkgtest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/registry/registrytest"
)

// The review of a version whose package no node holds any more (a failed
// upgrade's package, cleaned up, or one removed outside the core) is 410
// package_gone, not 500: the version row is there, its package is not. The
// review read before the removal (and kept unpacked in memory) does not
// hide it, and a consent to it is 410 as well; uploading the package again
// brings the version back. A version that does not exist stays 404.
func TestReviewOfAVersionWhosePackageIsGone(t *testing.T) {
	h, root := newHarness(t)
	m := pkgtest.Guard("guard", "0.1.0", "sub2api")
	m.Description = manifest.LocalizedText{"en": "package removed after upload"} // a package no other test shares
	data := pkgtest.Build(m, root)
	if code, out := h.do("POST", "/plugins/upload", "admin", fileBody(t, data)); code != http.StatusOK {
		t.Fatalf("upload = %d %v", code, out)
	}
	if code, out := h.do("GET", "/plugins/guard/versions/0.1.0/review", "admin", nil); code != http.StatusOK {
		t.Fatalf("review before the removal = %d %v", code, out)
	}
	var sum string
	if err := h.db.Pool.QueryRow(context.Background(), `SELECT package_sha256 FROM plugin_versions WHERE plugin_key = 'guard' AND version = '0.1.0'`).Scan(&sum); err != nil {
		t.Fatal(err)
	}
	dir := string(registrytest.Source().Store.(blobs.Dir))
	if err := os.Remove(filepath.Join(dir, sum[:2], sum)); err != nil {
		t.Fatal(err)
	}

	gone := func(what string, code int, out map[string]any) {
		t.Helper()
		if e, _ := out["error"].(map[string]any); code != http.StatusGone || e["code"] != "package_gone" {
			t.Fatalf("%s of a removed package = %d %v", what, code, out)
		}
	}
	code, out := h.do("GET", "/plugins/guard/versions/0.1.0/review", "admin", nil)
	gone("review", code, out)
	consent := install.ConsentRequest{Grants: []install.GrantInput{{Permission: "db.schema"}, {Permission: "gateway.hook"},
		{Permission: "events"}, {Permission: "jobs"}, {Permission: "routes.admin"}, {Permission: "ui.menu"}, {Permission: "ui.native"}}}
	code, out = h.do("POST", "/plugins/guard/versions/0.1.0/consent", "admin", consent)
	gone("consent", code, out)
	if code, out = h.do("GET", "/plugins/guard/versions/9.9.9/review", "admin", nil); code != http.StatusNotFound {
		t.Fatalf("review of a missing version = %d %v", code, out)
	}

	if code, out = h.do("POST", "/plugins/upload", "admin", fileBody(t, data)); code != http.StatusOK {
		t.Fatalf("upload again = %d %v", code, out)
	}
	if code, out = h.do("GET", "/plugins/guard/versions/0.1.0/review", "admin", nil); code != http.StatusOK {
		t.Fatalf("review after uploading again = %d %v", code, out)
	}
	if code, out = h.do("POST", "/plugins/guard/versions/0.1.0/consent", "admin", consent); code != http.StatusOK {
		t.Fatalf("consent after uploading again = %d %v", code, out)
	}
}
