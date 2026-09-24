package e2e

import (
	"net/http"
	"testing"
)

// AC 3: anthropic is a built-in plugin: the core installs and enables it at
// startup (signed as official, every host permission granted), it is active
// on both nodes, it cannot be uninstalled, the "model catalog" menu appears
// and its data comes from the plugin schema. The market still lists it.
func TestAC03_InstallAnthropicFromMarket(t *testing.T) {
	e := Setup(t)
	admin := e.Admin()

	// Market lists anthropic with the index metadata.
	src := e.MarketSource(admin)
	list := admin.OK(t, http.MethodGet, "/market/plugins", nil, Query("source_id", itoa(src))).Array()
	p, ok := Find(list, "key", "anthropic")
	if !ok {
		t.Fatalf("anthropic not in market listing: %v", list)
	}
	if p.Get("publisher").String() != "sub2api" || len(p.Get("versions").Array()) == 0 {
		t.Fatalf("market entry: %s", p.Raw)
	}

	// Installed and enabled by the core, without any operator action.
	d := e.WaitPlugin(admin, "anthropic", "enabled", "")
	if !d.Get("builtin").Bool() {
		t.Fatalf("anthropic is not marked builtin: %s", d.Raw)
	}
	if st := PluginNodeStates(d); len(st) != 2 {
		t.Fatalf("expected 2 node states, got %v", st)
	}
	version := d.Get("active_version").String()
	rev := admin.OK(t, http.MethodGet, "/plugins/anthropic/versions/"+version+"/review", nil)
	if rev.Get("trust").String() != "official" || rev.Get("signature_status").String() != "valid" {
		t.Fatalf("review trust: %s", rev.Raw)
	}
	if rev.Get("platform.id").String() != "anthropic" || rev.Get("database.schema").String() != "plg_anthropic" {
		t.Fatalf("review platform/database: %s", rev.Raw)
	}
	if _, ok := Find(rev.Get("platform.account_types").Array(), "id", "apikey"); !ok {
		t.Fatalf("review lacks account type apikey: %s", rev.Get("platform").Raw)
	}
	grants := admin.OK(t, http.MethodGet, "/plugins/anthropic/grants", nil).Array()
	if g, ok := Find(grants, "permission", "accounts.credentials"); !ok || g.Get("status").String() != "granted" {
		t.Fatalf("grant accounts.credentials: %v", grants)
	}

	// Built-in: uninstall is refused, the plugin stays.
	r := admin.API(t, http.MethodDelete, "/plugins/anthropic", nil, Query("purge", "true"), admin.StepUp(t))
	if r.Status != 403 || r.JSON().Get("error.details.reason").String() != "builtin" {
		t.Fatalf("uninstall of a built-in plugin: %s", r)
	}
	e.WaitPlugin(admin, "anthropic", "enabled", version)

	// Menu "model catalog" appears (plugin menu, permission granted to admin).
	found := false
	for _, it := range admin.Menus(t) {
		if it.Get("plugin_key").String() == "anthropic" {
			found = true
		}
	}
	if !found {
		t.Fatal("anthropic menu missing from /me/menus")
	}
	ui := admin.OK(t, http.MethodGet, "/ui/plugins", nil).Array()
	if _, ok := Find(ui, "key", "anthropic"); !ok {
		t.Fatalf("anthropic missing from /ui/plugins: %v", ui)
	}

	// Data served by the plugin from plg_anthropic.model_catalog, on every node.
	e.OnEachNode(admin, func(n int, c *Client) {
		r := c.API(t, http.MethodGet, "/p/anthropic/models", nil)
		if r.Status != 200 || len(r.Data().Array()) == 0 {
			t.Fatalf("node-%d /p/anthropic/models: %s", n, r)
		}
	})

	// Account type is offered by the registry.
	types := admin.OK(t, http.MethodGet, "/account-types", nil).Array()
	at, ok := Find(types, "type", "apikey")
	if !ok || at.Get("plugin_key").String() != "anthropic" || at.Get("platform").String() != "anthropic" {
		t.Fatalf("account types: %v", types)
	}
}
