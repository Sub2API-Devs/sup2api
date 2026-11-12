package manifest

import (
	"regexp"
	"strings"
)

// RouteAccounts declares the accounts a plugin route acts on. The core passes
// a request when the caller holds account:<Action>, or account:own:<Action>
// and every account the request names is one they created. With no From, or
// when the request names none, only account:<Action> passes.
type RouteAccounts struct {
	Action string   `json:"action"`         // read | update | test
	From   []string `json:"from,omitempty"` // "path:<param>", "query:<name>", "body:<field>"
}

// RouteAccounts actions.
const (
	AccountsRead   = "read"
	AccountsUpdate = "update"
	AccountsTest   = "test"
)

// RouteAccounts.From sources: a path parameter, a query parameter or a
// top-level field of the JSON body.
const (
	AccountsFromPath  = "path"
	AccountsFromQuery = "query"
	AccountsFromBody  = "body"
)

// AccountActionIDs is the From entry of the route an account action posts
// to: the console sends {"account_ids": [...]}.
const AccountActionIDs = AccountsFromBody + ":account_ids"

// ValidAccountsAction reports whether a is a RouteAccounts action.
func ValidAccountsAction(a string) bool {
	return a == AccountsRead || a == AccountsUpdate || a == AccountsTest
}

// accountsFromName is a plain parameter or field name: the DSL names one
// value, never a path into it ("body:data.ids" is not a top-level field).
var accountsFromName = regexp.MustCompile(`^[A-Za-z0-9_-]+$`)

// ParseAccountsFrom splits a RouteAccounts.From entry into its source and
// name; ok is false unless the source is path, query or body and the name is
// a plain name.
func ParseAccountsFrom(from string) (source, name string, ok bool) {
	source, name, _ = strings.Cut(from, ":")
	switch source {
	case AccountsFromPath, AccountsFromQuery, AccountsFromBody:
		return source, name, accountsFromName.MatchString(name)
	}
	return source, name, false
}

// EffectiveRouteAccounts is r.Accounts, or for a route an account action
// posts to {Action: "update" ("read" when every such action is visibleFor
// "all"), From: [AccountActionIDs]}, so the core checks those routes without
// the plugin declaring anything. Other routes get nil.
func EffectiveRouteAccounts(m *Manifest, r Route) *RouteAccounts {
	if r.Accounts != nil || m == nil || m.UI == nil {
		return r.Accounts
	}
	var acc *RouteAccounts
	sig := RouteSignature(r.Method, r.Path)
	for _, a := range m.UI.AccountActions {
		if method, path, ok := ParseRouteRef(a.Route, "POST"); !ok || RouteSignature(method, path) != sig {
			continue
		}
		if acc == nil {
			acc = &RouteAccounts{Action: AccountsRead, From: []string{AccountActionIDs}}
		}
		if a.VisibleFor != "all" {
			acc.Action = AccountsUpdate
		}
	}
	return acc
}
