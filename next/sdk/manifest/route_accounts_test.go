package manifest

import (
	"reflect"
	"testing"
)

func TestParseAccountsFrom(t *testing.T) {
	cases := []struct {
		in           string
		source, name string
		ok           bool
	}{
		{"path:account_id", "path", "account_id", true},
		{"query:ids", "query", "ids", true},
		{"body:account_ids", "body", "account_ids", true},
		{"body:", "body", "", false},
		{"body:data.ids", "body", "data.ids", false},
		{"query:ids:x", "query", "ids:x", false},
		{"header:x", "header", "x", false},
		{"account_ids", "account_ids", "", false},
		{"", "", "", false},
	}
	for _, tc := range cases {
		source, name, ok := ParseAccountsFrom(tc.in)
		if source != tc.source || name != tc.name || ok != tc.ok {
			t.Errorf("ParseAccountsFrom(%q) = (%q, %q, %v), want (%q, %q, %v)", tc.in, source, name, ok, tc.source, tc.name, tc.ok)
		}
	}
}

func TestEffectiveRouteAccounts(t *testing.T) {
	reset := Route{Method: "POST", Path: "/reset", Scope: "admin", Permission: "reset"}
	list := Route{Method: "GET", Path: "/list", Scope: "admin", Permission: "reset"}
	action := func(route, visibleFor string) AccountAction {
		return AccountAction{ID: "a", Route: route, VisibleFor: visibleFor}
	}
	withActions := func(acts ...AccountAction) *Manifest {
		return &Manifest{Routes: []Route{reset, list}, UI: &UI{AccountActions: acts}}
	}
	update := &RouteAccounts{Action: AccountsUpdate, From: []string{AccountActionIDs}}
	read := &RouteAccounts{Action: AccountsRead, From: []string{AccountActionIDs}}
	explicit := Route{Method: "POST", Path: "/reset", Accounts: &RouteAccounts{Action: AccountsTest, From: []string{"body:account_ids"}}}

	cases := []struct {
		name string
		m    *Manifest
		r    Route
		want *RouteAccounts
	}{
		{"no ui", &Manifest{}, reset, nil},
		{"nil manifest", nil, reset, nil},
		{"explicit wins", withActions(action("POST /reset", "")), explicit, explicit.Accounts},
		{"editable by default", withActions(action("POST /reset", "")), reset, update},
		{"editable", withActions(action("POST /reset", "editable")), reset, update},
		{"bare path means POST", withActions(action("/reset", "")), reset, update},
		{"visible to all", withActions(action("POST /reset", "all")), reset, read},
		{"strictest of several", withActions(action("POST /reset", "all"), action("/reset", "")), reset, update},
		{"other route", withActions(action("POST /reset", "")), list, nil},
		{"method differs", withActions(action("GET /reset", "")), reset, nil},
	}
	for _, tc := range cases {
		if got := EffectiveRouteAccounts(tc.m, tc.r); !reflect.DeepEqual(got, tc.want) {
			t.Errorf("%s: got %+v, want %+v", tc.name, got, tc.want)
		}
	}
}
