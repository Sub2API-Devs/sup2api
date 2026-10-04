package routes

import (
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"testing"
)

func TestAccountIconAssetAllowed(t *testing.T) {
	info := core.PluginInfo{Manifest: &manifest.Manifest{Icon: "assets/provider.svg", AccountTypes: []manifest.AccountType{{Icon: "assets/product.svg"}}}}
	for _, name := range []string{"assets/provider.svg", "assets/product.svg"} {
		if !assetAllowed(info, name) {
			t.Fatalf("declared icon blocked: %s", name)
		}
	}
	if assetAllowed(info, "assets/private.txt") {
		t.Fatal("undeclared asset exposed")
	}
}
