package check

import (
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

// routes[i].accounts: a known action and From entries in the three-prefix
// DSL, path parameters of the route only; public/webhook routes take neither
// accounts nor permission (W5-C6).
func TestRouteAccounts(t *testing.T) {
	good := manifest.AccountAction{ID: "reset", Label: manifest.LocalizedText{"en": "Reset"},
		Permission: "assets:manage", Route: "POST /assets/reset"}
	// withAccountAction routes: [3] POST /assets/:id/reset, [4] POST
	// /assets/*rest (admin), [5] POST /assets/ping (public).
	valid := map[string]*manifest.RouteAccounts{
		"path param":     {Action: "update", From: []string{"path:id"}},
		"query and body": {Action: "read", From: []string{"query:account_id", "body:account_ids"}},
		"no from":        {Action: "test"},
	}
	for name, acc := range valid {
		m := withAccountAction(">=0.1.286 <0.2.0", good)
		m.Routes[3].Accounts = acc
		if c := uiCodes(m); len(c) > 0 {
			t.Errorf("%s: a valid declaration was rejected: %v", name, c)
		}
	}
	m := withAccountAction(">=0.1.286 <0.2.0", good)
	m.Routes[4].Accounts = &manifest.RouteAccounts{Action: "read", From: []string{"path:rest"}}
	if c := uiCodes(m); len(c) > 0 {
		t.Errorf("a catch-all parameter is a path parameter: %v", c)
	}

	cases := []struct {
		name  string
		route int
		acc   *manifest.RouteAccounts
		perm  string
		field string
		code  string
	}{
		{"bad action", 3, &manifest.RouteAccounts{Action: "delete"}, "assets:manage", "routes[3].accounts.action", "invalid"},
		{"empty action", 3, &manifest.RouteAccounts{From: []string{"path:id"}}, "assets:manage", "routes[3].accounts.action", "invalid"},
		{"unknown prefix", 3, &manifest.RouteAccounts{Action: "read", From: []string{"header:x-id"}}, "assets:manage", "routes[3].accounts.from[0]", "invalid"},
		{"expression", 3, &manifest.RouteAccounts{Action: "read", From: []string{"body.account_ids"}}, "assets:manage", "routes[3].accounts.from[0]", "invalid"},
		{"nested field", 3, &manifest.RouteAccounts{Action: "read", From: []string{"body:data.account_ids"}}, "assets:manage", "routes[3].accounts.from[0]", "invalid"},
		{"empty name", 3, &manifest.RouteAccounts{Action: "read", From: []string{"path:id", "query:"}}, "assets:manage", "routes[3].accounts.from[1]", "invalid"},
		{"not a param", 3, &manifest.RouteAccounts{Action: "read", From: []string{"path:account_id"}}, "assets:manage", "routes[3].accounts.from[0]", "unknown_param"},
		{"public accounts", 5, &manifest.RouteAccounts{Action: "read"}, "", "routes[5].accounts", "unsupported"},
		{"public permission", 5, nil, "assets:manage", "routes[5].permission", "unsupported"},
	}
	for _, tc := range cases {
		m := withAccountAction(">=0.1.286 <0.2.0", good)
		m.Routes[tc.route].Accounts, m.Routes[tc.route].Permission = tc.acc, tc.perm
		if c := uiCodes(m); c[tc.field] != tc.code {
			t.Errorf("%s: want %s = %s, got %v", tc.name, tc.field, tc.code, c)
		}
	}

	// A webhook route is held to the same rule.
	m = withAccountAction(">=0.1.286 <0.2.0", good)
	m.HostPermissions = append(m.HostPermissions, manifest.HostPermission{ID: "routes.webhook"})
	m.Routes = append(m.Routes, manifest.Route{Method: "POST", Path: "/hook", Scope: "webhook", Permission: "assets:manage"})
	if c := uiCodes(m); c["routes[6].permission"] != "unsupported" {
		t.Errorf("a webhook route with a permission must be rejected: %v", c)
	}
}

// An older core ignores routes[].accounts and forwards with no account
// check, so hostCompat must keep it out.
func TestRouteAccountsCoreFloor(t *testing.T) {
	good := manifest.AccountAction{ID: "reset", Label: manifest.LocalizedText{"en": "Reset"},
		Permission: "assets:manage", Route: "POST /assets/reset"}
	for _, tc := range []struct {
		hostCompat string
		accounts   *manifest.RouteAccounts
		floor      bool
	}{
		{">=0.1.285 <0.2.0", &manifest.RouteAccounts{Action: "read"}, true},
		{">=0.1.286 <0.2.0", &manifest.RouteAccounts{Action: "read"}, false},
		{">=0.1.256 <0.2.0", nil, false},
	} {
		m := withAccountAction(tc.hostCompat, good)
		m.Routes[3].Accounts = tc.accounts
		if got := uiCodes(m)["hostCompat"] == "below_feature_core"; got != tc.floor {
			t.Errorf("%s accounts=%v: below_feature_core = %v, want %v", tc.hostCompat, tc.accounts != nil, got, tc.floor)
		}
	}
}
