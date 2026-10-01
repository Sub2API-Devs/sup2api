package routes_test

import (
	"context"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/routes"
	"net/http/httptest"
	"strings"
	"testing"
)

type oldVersionAssets struct{ vh string }

func (a *oldVersionAssets) ReadVersionAsset(_ context.Context, key, vh, name string) (core.PluginInfo, []byte, string, error) {
	want := a.vh
	if want == "" {
		want = "0.9.0-12345678"
	}
	if key != "demo" || vh != want {
		return core.PluginInfo{}, nil, "", core.ErrNotFound
	}
	return core.PluginInfo{Key: key, Version: "0.9.0"}, []byte("old asset"), "text/javascript", nil
}
func TestVersionAssetsSurviveDifferentLocalGeneration(t *testing.T) {
	engine, _, _, _ := setup(t, routes.WithVersionAssets(&oldVersionAssets{}))
	for _, tc := range []struct {
		path   string
		status int
	}{{"ui/main.js", 200}, {"runtimes/linux-amd64/plugin", 404}, {"../manifest.json", 404}} {
		rec := httptest.NewRecorder()
		engine.ServeHTTP(rec, httptest.NewRequest("GET", "/plugin-ui/demo/0.9.0-12345678/"+tc.path, nil))
		if rec.Code != tc.status {
			t.Fatalf("%s: status %d body %s", tc.path, rec.Code, rec.Body.String())
		}
	}
}

func TestVersionAssetsRecoverWhenCurrentPackageRetired(t *testing.T) {
	assets := &oldVersionAssets{}
	engine, _, reg, pkg := setup(t, routes.WithVersionAssets(assets))
	info, _ := reg.Current().Plugin("demo")
	assets.vh = strings.TrimPrefix(info.AssetBase, "/plugin-ui/demo/")
	if err := pkg.Close(); err != nil {
		t.Fatal(err)
	}
	rec := httptest.NewRecorder()
	engine.ServeHTTP(rec, httptest.NewRequest("GET", info.AssetBase+"/ui/main.js", nil))
	if rec.Code != 200 || rec.Body.String() != "old asset" {
		t.Fatal(rec.Code, rec.Body.String())
	}
}
