package authz

import (
	"context"
	"strings"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

// testMenuRoutes stands in for the route table (httpapi.RouteKeys) the app
// binds the menus to; app's start-up check binds the real one.
func testMenuRoutes(id string) ([]string, bool) {
	keys, ok := map[string][]string{
		"GET /me/api-keys": {"apikey:self:manage"}, "GET /me/prices": {"apikey:self:manage"},
		"GET /me/usage/overview": {"usage:self:read"}, "GET /me/usage": {"usage:self:read"},
		"GET /usage/overview": {"usage:all:read"}, "GET /usage": {"usage:all:read"},
		"GET /accounts": {"account:read"}, "GET /proxies": {"proxy:read"}, "GET /ledger": {"balance:all:read"},
		"GET /users": {"user:read"}, "GET /segments": {"segment:read"}, "GET /roles": {"role:read"},
		"GET /plugins": {"plugin:read"}, "GET /market/plugins": {"plugin:market:read"}, "GET /publishers": {"publisher:read"},
		"GET /nodes": {"node:read"}, "GET /system/tasks": {"task:read"}, "GET /system/upgrades": {"system:update:read"},
		"GET /audit-logs": {"audit:read"}, "GET /settings/gateway": {"settings:read"}, "GET /sticky-rules": {"sticky:read"},
		"GET /groups": {"group:read"}, "GET /prices": {"price:read"}, "GET /me/balance": {"balance:self:read"},
	}[id]
	return keys, ok
}

// A menu item shows to the holders of its main routes' keys; before the
// routes are bound it stays hidden, and binding fails on a missing route.
func TestBindMenuRoutes(t *testing.T) {
	t.Parallel()
	db := testutil.DB(t)
	s := newService(t, db, newMemBus(), nil)
	operator := addUser(t, s, "op@x.com", RoleOperator)
	if got := sectionPaths(t, s, operator, "gateway"); got != "/accounts,/proxies" {
		t.Fatalf("gateway = %s", got)
	}

	// A route keyed differently moves the menu with it.
	err := s.BindMenuRoutes(func(id string) ([]string, bool) {
		if id == "GET /proxies" {
			return []string{"settings:manage"}, true
		}
		return testMenuRoutes(id)
	})
	if err != nil {
		t.Fatal(err)
	}
	if got := sectionPaths(t, s, operator, "gateway"); got != "/accounts" {
		t.Fatalf("gateway with GET /proxies under settings:manage = %s", got)
	}

	err = s.BindMenuRoutes(func(id string) ([]string, bool) {
		if id == "GET /accounts" {
			return nil, false
		}
		return testMenuRoutes(id)
	})
	if err == nil || !strings.Contains(err.Error(), "menu accounts: no route GET /accounts") {
		t.Fatalf("missing route: %v", err)
	}

	unbound := New(Deps{DB: db, Bus: newMemBus()})
	menus, err := unbound.Menus(context.Background(), operator)
	if err != nil {
		t.Fatal(err)
	}
	for _, sec := range menus {
		for _, it := range sec.Items {
			if it.ID != "dashboard" && it.ID != "my-profile" {
				t.Fatalf("unbound menus show %s", it.ID)
			}
		}
	}
}
