package registry_test

import (
	"context"
	pluginpkg "github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/pkg"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/registry"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/registry/registrytest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
	"os"
	"path/filepath"
	"testing"
)

func TestVersionAssetsReadApprovedPackageWithoutLocalProcess(t *testing.T) {
	db := testutil.DB(t)
	ctx := context.Background()
	m := registrytest.Manifest("assets", "1.0.0")
	raw := registrytest.Package(t, m, []byte("bin"), map[string][]byte{"ui/main.js": []byte("old version")})
	registrytest.Install(t, db, m, raw, nil, "enabled")
	packages := registry.NewPackages(db, t.TempDir(), registry.WithSource(registrytest.Source()))
	defer packages.Close()
	vh := "1.0.0-" + pluginpkg.SHA256Hex(raw)[:8]
	info, data, _, err := packages.ReadVersionAsset(ctx, "assets", vh, "ui/main.js")
	if err != nil || string(data) != "old version" || info.Version != "1.0.0" {
		t.Fatal(info, string(data), err)
	}
	if err := os.Remove(filepath.Join(packages.DataDir(), "assets", vh, "package.s2plugin")); err != nil {
		t.Fatalf("version asset read retained a package handle: %v", err)
	}
	if _, err := db.Pool.Exec(ctx, `UPDATE plugin_versions SET consent_status='awaiting' WHERE plugin_key='assets'`); err != nil {
		t.Fatal(err)
	}
	if _, _, _, err := packages.ReadVersionAsset(ctx, "assets", vh, "ui/main.js"); err == nil {
		t.Fatal("unapproved package exposed")
	}
}
