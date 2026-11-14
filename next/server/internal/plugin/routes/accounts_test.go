package routes_test

import (
	"context"
	"encoding/json"
	"net/http"
	"slices"
	"strings"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/registry/registrytest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/routes"
)

// accounts is a core.AccountAccess: "admin" (1) reaches every account,
// "owner" (3) the accounts 10 and 11, anyone else none.
type accounts struct{ actions []string }

func (a *accounts) AccountsInScope(_ context.Context, uid int64, action string, ids []int64) (bool, []int64, error) {
	a.actions = append(a.actions, action)
	switch uid {
	case 1:
		return true, nil, nil
	case 3:
		return false, slices.DeleteFunc(slices.Clone(ids), func(id int64) bool { return id != 10 && id != 11 }), nil
	}
	return false, nil, core.AccountsDenied(action)
}

// accountsManifest declares accounts on a path, a query and a body route,
// and has an account action post to /consume, which declares nothing.
func accountsManifest() *manifest.Manifest {
	m := registrytest.Manifest("demo", "1.0.0")
	m.UserPermissions = append(m.UserPermissions, manifest.UserPermission{Key: "reset", Label: manifest.LocalizedText{"en": "Reset"}})
	m.Routes = append(m.Routes,
		manifest.Route{Method: "GET", Path: "/accounts/:account_id/usage", Scope: "admin", Permission: "rules:read",
			Accounts: &manifest.RouteAccounts{Action: manifest.AccountsRead, From: []string{"path:account_id"}}},
		manifest.Route{Method: "GET", Path: "/weights", Scope: "admin", Permission: "rules:read",
			Accounts: &manifest.RouteAccounts{Action: manifest.AccountsRead, From: []string{"query:account_ids"}}},
		manifest.Route{Method: "POST", Path: "/reset", Scope: "admin", Permission: "rules:read",
			Accounts: &manifest.RouteAccounts{Action: manifest.AccountsUpdate, From: []string{"body:account_ids", "body:account_id"}}},
		manifest.Route{Method: "POST", Path: "/consume", Scope: "admin", Permission: "reset"},
	)
	m.UI = &manifest.UI{AccountActions: []manifest.AccountAction{{
		ID: "consume", Label: manifest.LocalizedText{"en": "Consume"}, Permission: "reset", Route: "POST /consume",
	}}}
	return m
}

func TestPluginRouteAccounts(t *testing.T) {
	aa := &accounts{}
	e, h, _, _ := setupManifest(t, accountsManifest(), routes.WithAccountAccess(aa))
	tooMany := make([]int64, manifest.MaxAccountBatch+1)
	for i := range tooMany {
		tooMany[i] = int64(i + 1)
	}
	tooManyBody, _ := json.Marshal(map[string]any{"account_ids": tooMany})
	tests := []struct {
		name, method, path, token, body string
		status                          int
		action                          string // AccountsInScope action; "" = not called
	}{
		{"all scope, path", "GET", "/accounts/99/usage", "admin", "", 201, "read"},
		{"all scope, no id", "POST", "/reset", "admin", `{"group_id":5}`, 201, "update"},
		{"own scope, own path id", "GET", "/accounts/10/usage", "owner", "", 201, "read"},
		{"own scope, others' path id", "GET", "/accounts/12/usage", "owner", "", 404, "read"},
		{"own scope, own query ids", "GET", "/weights?account_ids=10,11", "owner", "", 201, "read"},
		{"own scope, every query value", "GET", "/weights?account_ids=10&account_ids=12", "owner", "", 404, "read"},
		{"own scope, no query id", "GET", "/weights", "owner", "", 403, "read"},
		{"own scope, own body ids", "POST", "/reset", "owner", `{"account_ids":[10,10],"account_id":11}`, 201, "update"},
		{"own scope, one body id outside", "POST", "/reset", "owner", `{"account_ids":[10],"account_id":12}`, 404, "update"},
		{"own scope, body field in other case", "POST", "/reset", "owner", `{"account_ids":[10],"ACCOUNT_IDS":[12]}`, 404, "update"},
		{"own scope, comma-separated body string", "POST", "/reset", "owner", `{"account_ids":"10, 11"}`, 201, "update"},
		{"own scope, no body id", "POST", "/reset", "owner", `{"group_id":5}`, 403, "update"},
		{"own scope, body no JSON", "POST", "/reset", "owner", `x`, 403, "update"},
		{"no account key", "GET", "/accounts/10/usage", "plain", "", 403, "read"},
		{"malformed id", "GET", "/weights?account_ids=10,x", "admin", "", 400, ""},
		{"malformed body id", "POST", "/reset", "admin", `{"account_ids":[true]}`, 400, ""},
		{"too many ids", "POST", "/reset", "admin", string(tooManyBody), 400, ""},
		{"inferred: others' account", "POST", "/consume", "owner", `{"account_ids":[12]}`, 404, "update"},
		{"inferred: own account", "POST", "/consume", "owner", `{"account_ids":[10]}`, 201, "update"},
		{"inferred: no id", "POST", "/consume", "owner", `{}`, 403, "update"},
		{"route without accounts", "GET", "/echo/12", "owner", "", 201, ""},
	}
	for _, tt := range tests {
		h.last, aa.actions = nil, nil
		w := do(e, tt.method, "/api/v1/p/demo"+tt.path, tt.token, tt.body)
		if w.Code != tt.status || (h.last != nil) != (tt.status == 201) {
			t.Errorf("%s: %d forwarded=%v %s", tt.name, w.Code, h.last != nil, w.Body)
		}
		if got := strings.Join(aa.actions, ","); got != tt.action {
			t.Errorf("%s: action %q, want %q", tt.name, got, tt.action)
		}
	}
}

// Without an AccountAccess, routes that declare accounts (or are inferred
// to) answer 503 instead of skipping the check; other routes are served.
func TestPluginRouteAccountsUnconfigured(t *testing.T) {
	e, h, _, _ := setupManifest(t, accountsManifest())
	for _, path := range []string{"/accounts/10/usage", "/weights?account_ids=10"} {
		if w := do(e, "GET", "/api/v1/p/demo"+path, "admin", ""); w.Code != http.StatusServiceUnavailable || h.last != nil {
			t.Fatalf("%s: %d %s", path, w.Code, w.Body)
		}
	}
	if w := do(e, "POST", "/api/v1/p/demo/consume", "admin", `{"account_ids":[10]}`); w.Code != http.StatusServiceUnavailable || h.last != nil {
		t.Fatalf("inferred: %d %s", w.Code, w.Body)
	}
	if w := do(e, "GET", "/api/v1/p/demo/echo/1", "admin", ""); w.Code != 201 {
		t.Fatalf("route without accounts: %d", w.Code)
	}
}
