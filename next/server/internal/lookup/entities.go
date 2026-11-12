package lookup

import (
	"context"

	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/segment"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// entities are the kinds of GET /lookup/:kind (CONTRACTS §96). They are kept
// together rather than one per module: each is a few lines over tables the
// usage log already joins by name, and together they are the permission table
// of the endpoint. A range must match the list endpoint it is named after.
var entities = []*Entity{
	{
		// Found by email or display name, as the q of GET /users.
		Kind: "users", From: "users u", ID: "u.id", Name: "u.email", Hint: "u.display_name", Status: "u.status",
		Search: []string{"u.display_name"},
		Live:   "u.deleted_at IS NULL",
		Read:   "user:read",
	},
	{
		// Groups have no platform column: the platforms of a group follow
		// from its accounts' types (CONTRACTS §13), so there is no hint.
		Kind: "groups", From: "groups g", ID: "g.id", Name: "g.name", Status: "g.status",
		// account:group:bind alone finds the groups the caller can use: the
		// groups an "own" account holder may bind.
		Read: "group:read", OwnRead: "account:group:bind",
		// GET /me/groups.
		Mine: &Mine{Scope: callerIs(groupOpenTo)},
	},
	{
		// The usage log shows every key's id, name and owner to usage:all:read
		// already; no other permission lists the keys of other users. The
		// owner is a subquery, not a join: it is read for the rows returned
		// only, after the limit, instead of for every key.
		Kind: "api-keys", From: "api_keys k", ID: "k.id", Name: "k.name",
		Hint: "(SELECT u.email FROM users u WHERE u.id = k.user_id)", Status: "k.status",
		Live: "k.deleted_at IS NULL",
		Read: "usage:all:read",
		// GET /me/api-keys. The owner is the caller, so the hint is the
		// key's prefix instead.
		Mine:   &Mine{Perms: []string{"apikey:self:manage"}, Scope: callerIs("k.user_id = ?"), Hint: "k.key_prefix"},
		Narrow: []Ref{{Param: "user_id", Cond: "k.user_id = ?"}},
	},
	{
		// GET /accounts, except that accounts of a disabled or uninstalled
		// plugin are found too: the usage log still has their requests.
		Kind: "accounts", From: "accounts a", ID: "a.id", Name: "a.name", Hint: "a.plugin_key", Status: "a.status",
		Live: "a.deleted_at IS NULL",
		Read: "account:read", OwnRead: "account:own:read",
		Mine:   &Mine{Perms: []string{"account:read", "account:own:read"}, Scope: callerIs("a.created_by = ?")},
		Prefer: []Ref{{Param: "prefer_group_id", Cond: "EXISTS (SELECT 1 FROM account_groups ag WHERE ag.account_id = a.id AND ag.group_id = ?)"}},
	},
	{
		// The models are those of the price table (GET /prices), disabled
		// prices included. A price is enabled or not; it has no status value.
		Kind: "models", From: "model_prices mp", Name: "mp.model",
		Read: "price:read",
		Mine: &Mine{Perms: []string{"apikey:self:manage"}, Scope: usableModels},
	},
	{
		// GET /proxies.
		Kind: "proxies", From: "proxies p", ID: "p.id", Name: "p.name",
		Hint: "p.protocol || '://' || p.host || ':' || p.port", Status: "p.status",
		Read: "proxy:read", OwnRead: "proxy:own:read",
		Mine: &Mine{Perms: []string{"proxy:read", "proxy:own:read"}, Scope: callerIs("p.created_by = ?")},
	},
}

// groupOpenTo holds for the groups a user ("?") can use: the range of GET
// /me/groups.
var groupOpenTo = segment.UsableGroupSQL("g", "?")

// callerIs is the Scope of a kind whose own rows one condition selects; its
// "?" takes the caller's id.
func callerIs(cond string) func(context.Context, store.Querier, int64, *store.Filter) error {
	return func(_ context.Context, _ store.Querier, uid int64, f *store.Filter) error {
		f.And(cond, uid)
		return nil
	}
}

// usableModels leaves the models the caller's groups allow: an enabled price
// that the model policy of at least one of them lets through. The picker on a
// user's own pages is not tied to a group, so this is the union over all of
// them. GET /me/prices?group_id= lists a subset of it: of these, only the
// models the accounts of that group provide. The group policy is a glob list
// (core.GroupInfo.AllowsModel), evaluated here rather than rewritten in SQL.
func usableModels(ctx context.Context, q store.Querier, uid int64, f *store.Filter) error {
	var open store.Filter
	open.And(groupOpenTo, uid)
	rows, err := q.Query(ctx, `SELECT g.model_allowlist, g.model_filter_mode FROM groups g`+open.Cond(), open.Args()...)
	if err != nil {
		return err
	}
	groups, err := pgx.CollectRows(rows, func(r pgx.CollectableRow) (g core.GroupInfo, err error) {
		err = r.Scan(&g.ModelAllowlist, &g.ModelFilterMode)
		return g, err
	})
	if err != nil {
		return err
	}
	rows, err = q.Query(ctx, `SELECT model FROM model_prices WHERE enabled`)
	if err != nil {
		return err
	}
	models, err := pgx.CollectRows(rows, pgx.RowTo[string])
	if err != nil {
		return err
	}
	usable := []string{}
	for _, m := range models {
		for _, g := range groups {
			if g.AllowsModel(m) {
				usable = append(usable, m)
				break
			}
		}
	}
	f.And("mp.model = ANY(?)", usable)
	return nil
}
