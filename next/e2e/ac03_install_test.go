package e2e

import (
	"net/http"
	"testing"
)

// AC 3: install anthropic from the market index (signed as official) ->
// consent -> enable -> active on both nodes; the "model catalog" menu appears
// and its data comes from the plugin schema.
func TestAC03_InstallAnthropicFromMarket(t *testing.T) {
	e := Setup(t)
	e.Pending("c1-lifecycle (market, install, consent), c2-runtime (rollout, routes), e-sdk-plugins (anthropic), a1-identity")
	admin := e.Admin()

	// Start clean so the whole flow is exercised.
	if _, ok := e.Plugin(admin, "anthropic"); ok {
		e.Uninstall(admin, "anthropic", true)
	}

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
	version := e.defaultVersion("anthropic")

	rev := e.InstallFromMarket(admin, "anthropic", version)
	if rev.Get("plugin_key").String() != "anthropic" || rev.Get("version").String() != version {
		t.Fatalf("review identity: %s", rev.Raw)
	}
	if rev.Get("trust").String() != "official" {
		t.Fatalf("trust = %q, want official", rev.Get("trust").String())
	}
	if rev.Get("signature_status").String() != "valid" {
		t.Fatalf("signature_status = %q", rev.Get("signature_status").String())
	}
	if !rev.Get("host_compat_ok").Bool() {
		t.Fatal("host_compat_ok = false")
	}
	if rev.Get("platform.id").String() != "anthropic" {
		t.Fatalf("review platform: %s", rev.Get("platform").Raw)
	}
	if _, ok := Find(rev.Get("platform.account_types").Array(), "id", "apikey"); !ok {
		t.Fatalf("review lacks account type apikey: %s", rev.Get("platform").Raw)
	}
	if rev.Get("database.schema").String() != "plg_anthropic" {
		t.Fatalf("review database: %s", rev.Get("database").Raw)
	}
	// Critical permission accounts.credentials requires plugin:grant:critical.
	hp, ok := Find(rev.Get("host_permissions").Array(), "id", "accounts.credentials")
	if !ok || hp.Get("risk").String() != "critical" || hp.Get("requires").String() != "plugin:grant:critical" {
		t.Fatalf("accounts.credentials permission: %s", rev.Get("host_permissions").Raw)
	}

	// Awaiting consent until approved.
	d, _ := e.Plugin(admin, "anthropic")
	if d.Get("status").String() != "awaiting_consent" {
		t.Fatalf("status before consent = %q", d.Get("status").String())
	}
	e.ConsentAll(admin, rev, []string{"admin"})
	d, _ = e.Plugin(admin, "anthropic")
	if d.Get("status").String() != "installed" {
		t.Fatalf("status after consent = %q", d.Get("status").String())
	}
	grants := admin.OK(t, http.MethodGet, "/plugins/anthropic/grants", nil).Array()
	if _, ok := Find(grants, "permission", "accounts.credentials"); !ok {
		t.Fatalf("grant accounts.credentials missing: %v", grants)
	}

	e.Enable(admin, "anthropic")
	d = e.WaitPlugin(admin, "anthropic", "enabled", version)
	if st := PluginNodeStates(d); len(st) != 2 {
		t.Fatalf("expected 2 node states, got %v", st)
	}
	if d.Get("trust").String() != "official" && d.Get("publisher.trust_level").String() != "official" {
		t.Logf("plugin detail does not expose trust: %s", d.Raw)
	}

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
