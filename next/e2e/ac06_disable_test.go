package e2e

import (
	"fmt"
	"net/http"
	"testing"

	"github.com/tidwall/gjson"
)

// AC 6: disabling a plugin keeps its accounts, greys out its permissions and
// makes forwarding return 503; re-enabling restores it. anthropic is built
// in, so uninstalling it is refused.
func TestAC06_DisableEnableUninstall(t *testing.T) {
	e := Setup(t)
	e.Pending("c1-lifecycle, c2-runtime (generation switch), a1-identity (plugin permission status), gateway")
	admin := e.Admin()
	tn := e.NewTenant(admin, TenantOpts{})
	e.MustMessages(tn.APIKey, MessagesBody(tn.Model, "before disable", false), nil)

	pluginModule := func() (gjson.Result, bool) {
		for _, m := range admin.OK(t, http.MethodGet, "/permissions", nil).Array() {
			if m.Get("plugin_key").String() == "anthropic" {
				return m, true
			}
		}
		return gjson.Result{}, false
	}
	m, ok := pluginModule()
	if !ok || m.Get("status").String() != "active" || m.Get("source").String() != "plugin" {
		t.Fatalf("plugin permission module before disable: %s", m.Raw)
	}

	e.Disable(admin, "anthropic")

	// Accounts stay (not orphaned, not deleted).
	acct := admin.OK(t, http.MethodGet, fmt.Sprintf("/accounts/%d", tn.Accounts[0].ID), nil)
	if acct.Get("id").Int() != tn.Accounts[0].ID {
		t.Fatalf("account gone after disable: %s", acct.Raw)
	}
	// Plugin permissions greyed out.
	m, ok = pluginModule()
	if !ok || m.Get("status").String() != "disabled" {
		t.Fatalf("plugin permission module after disable: %s", m.Raw)
	}
	for _, p := range m.Get("permissions").Array() {
		if p.Get("status").String() != "disabled" {
			t.Fatalf("permission %s still %s", p.Get("key").String(), p.Get("status").String())
		}
	}
	// Plugin routes and gateway endpoints are gone on every node.
	e.OnEachNode(admin, func(n int, c *Client) {
		if r := c.API(t, http.MethodGet, "/p/anthropic/models", nil); r.Status < 400 {
			t.Errorf("node-%d plugin route still served: %s", n, r)
		}
	})
	for i := 0; i < 4; i++ {
		g := e.Messages(tn.APIKey, MessagesBody(tn.Model, "while disabled", false), nil)
		if g.Status != 503 {
			t.Fatalf("gateway while disabled: HTTP %d %s (want 503)", g.Status, g.Body)
		}
	}
	// Account types disappear from the registry.
	if _, ok := Find(admin.OK(t, http.MethodGet, "/account-types", nil).Array(), "plugin_key", "anthropic"); ok {
		t.Error("anthropic account types still offered while disabled")
	}

	e.Enable(admin, "anthropic")
	m, _ = pluginModule()
	if m.Get("status").String() != "active" {
		t.Fatalf("permissions not restored: %s", m.Raw)
	}
	e.MustMessages(tn.APIKey, MessagesBody(tn.Model, "after enable", true), nil)

	// Built-in: uninstall is refused even while disabled; data is untouched.
	e.Disable(admin, "anthropic")
	r := admin.API(t, http.MethodDelete, "/plugins/anthropic", nil, Query("purge", "false"), admin.StepUp(t))
	if r.Status != 403 || r.JSON().Get("error.details.reason").String() != "builtin" {
		t.Fatalf("uninstall of a built-in plugin: %s", r)
	}
	if _, ok := pluginModule(); !ok {
		t.Fatal("plugin permissions removed by a refused uninstall")
	}
	acct = admin.OK(t, http.MethodGet, fmt.Sprintf("/accounts/%d", tn.Accounts[0].ID), nil)
	if acct.Get("orphaned").Bool() {
		t.Errorf("account orphaned by a refused uninstall: %s", acct.Raw)
	}
	e.Enable(admin, "anthropic")
	e.MustMessages(tn.APIKey, MessagesBody(tn.Model, "after re-enable", false), nil)
}
