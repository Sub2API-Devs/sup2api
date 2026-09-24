package e2e

import (
	"net/http"
	"strings"
	"testing"
)

// AC 2: the super admin creates a role "ops" with only account and proxy
// permissions and assigns it to a new user; the user sees only the matching
// menus and gets 403 on everything else.
func TestAC02_CustomRoleMenusAndForbidden(t *testing.T) {
	e := Setup(t)
	e.Pending("a1-identity (auth, users, roles, /me/menus), a2-resources (accounts, proxies)")
	admin := e.Admin()

	// The super admin sees everything.
	me := admin.Me(t)
	if !me.Get("superuser").Bool() {
		t.Fatalf("bootstrap admin is not superuser: %s", me.Raw)
	}

	perms := []string{"account:read", "account:create", "account:update", "proxy:read", "proxy:manage"}
	roleKey := strings.ReplaceAll(e.Name("ops"), "-", "_")
	e.CreateRole(admin, roleKey, "运营 ops", perms)

	// The role shows up with exactly these permissions.
	roles := admin.OK(t, http.MethodGet, "/roles", nil).Array()
	if _, ok := Find(roles, "key", roleKey); !ok {
		t.Fatalf("role %s not listed", roleKey)
	}

	ops := e.CreateUser(admin, UserSpec{Roles: []string{roleKey}})
	m := ops.Me(t)
	got := map[string]bool{}
	for _, p := range m.Get("permissions").Array() {
		got[p.String()] = true
	}
	for _, p := range perms {
		if !got[p] {
			t.Errorf("/me lacks %s", p)
		}
	}
	// The built-in "user" role may be added by default (CONTRACTS §4).
	userRole := map[string]bool{"apikey:self:manage": true, "balance:self:read": true, "usage:self:read": true, "gateway:use": true}
	for p := range got {
		if !strings.HasPrefix(p, "account:") && !strings.HasPrefix(p, "proxy:") && !userRole[p] {
			t.Errorf("/me has unexpected permission %s", p)
		}
	}
	if m.Get("superuser").Bool() {
		t.Fatal("ops user must not be superuser")
	}

	// Menus: account and proxy entries present; no admin areas outside the role
	// (self-service entries of the built-in "user" role are tolerated).
	items := ops.Menus(t)
	var hasAccount, hasProxy bool
	for _, it := range items {
		s := strings.ToLower(it.Get("id").String() + " " + it.Get("path").String())
		hasAccount = hasAccount || strings.Contains(s, "account")
		hasProxy = hasProxy || strings.Contains(s, "prox")
		for _, bad := range []string{"user", "role", "group", "price", "plugin", "market", "node", "sticky", "setting", "publisher"} {
			if strings.Contains(s, bad) && !strings.Contains(s, "/me") {
				t.Errorf("ops user sees admin menu %q: %s", bad, it.Raw)
			}
		}
	}
	if !hasAccount || !hasProxy {
		t.Errorf("ops menus lack accounts/proxies: account=%v proxy=%v", hasAccount, hasProxy)
	}

	// Allowed.
	ops.OK(t, http.MethodGet, "/accounts", nil)
	ops.OK(t, http.MethodGet, "/proxies", nil)
	ops.OK(t, http.MethodGet, "/account-types", nil)

	// Forbidden: 403 permission_denied.
	for _, c := range []struct{ method, path string }{
		{http.MethodGet, "/users"},
		{http.MethodGet, "/roles"},
		{http.MethodGet, "/groups"},
		{http.MethodGet, "/prices"},
		{http.MethodGet, "/plugins"},
		{http.MethodGet, "/usage"},
		{http.MethodGet, "/ledger"},
		{http.MethodGet, "/nodes"},
		{http.MethodPost, "/users"},
		{http.MethodDelete, "/accounts/1"},
		{http.MethodPost, "/accounts/1/credentials/reveal"},
	} {
		r := ops.API(t, c.method, c.path, map[string]any{})
		if r.Status != 403 || r.ErrCode() != "permission_denied" {
			t.Errorf("%s %s: want 403 permission_denied, got %s", c.method, c.path, r)
		}
	}

	// Revoking a permission takes effect immediately (authz:changed).
	roleID := func() int64 {
		r, _ := Find(admin.OK(t, http.MethodGet, "/roles", nil).Array(), "key", roleKey)
		return r.Get("id").Int()
	}()
	admin.OK(t, http.MethodPut, "/roles/"+itoa(roleID)+"/permissions",
		map[string]any{"permission_keys": []string{"account:read"}}, admin.StepUp(t))
	e.OnEachNode(ops, func(n int, c *Client) {
		if r := c.API(t, http.MethodGet, "/proxies", nil); r.Status != 403 {
			t.Errorf("node-%d: proxy:read still granted after revoke: %s", n, r)
		}
	})

	// Unauthenticated.
	if r := NewClient(e.BaseURL).API(t, http.MethodGet, "/me", nil); r.Status != 401 || r.ErrCode() != "unauthenticated" {
		t.Errorf("anonymous /me: %s", r)
	}
	// Sensitive permission without step-up.
	if r := admin.API(t, http.MethodPut, "/roles/"+itoa(roleID)+"/permissions",
		map[string]any{"permission_keys": perms}); r.Status != 403 || r.ErrCode() != "step_up_required" {
		t.Errorf("role:manage without step-up: %s", r)
	}
}
