package account

import (
	"context"
	"fmt"
	"slices"
	"strconv"
	"testing"

	"github.com/jackc/pgx/v5"
	"github.com/stretchr/testify/require"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// A group-range administrator (CONTRACTS §21.0) reaches the accounts bound
// to its groups, as they are bound now: it lists, reads, updates, tests and
// deletes only those (others are 404), creates only into its groups,
// binds its own groups without account:group:bind, cannot move an account
// out of its range, and keeps every own-level limit.
func TestGroupScopedAccounts(t *testing.T) {
	az := fakeAuthz{keys: map[int64][]string{}}
	e := setupWith(t, az)
	ctx := context.Background()
	admin := e.uid
	mgr, picker := e.addUser("mgr@x.com"), e.addUser("picker@x.com")
	g := e.exec1(`INSERT INTO groups (name) VALUES ('g12') RETURNING id`)
	k := e.exec1(`INSERT INTO groups (name) VALUES ('k') RETURNING id`)
	h := e.exec1(`INSERT INTO groups (name) VALUES ('h') RETURNING id`)
	az.keys[admin] = adminKeys
	var mgrKeys []string
	for _, a := range []string{"read", "create", "update", "delete", "test", "credential:view"} {
		mgrKeys = append(mgrKeys, fmt.Sprintf("account:%s:group/%d", a, g), fmt.Sprintf("account:%s:group/%d", a, k))
	}
	az.keys[mgr] = mgrKeys
	id := func(out map[string]any) int64 { return int64(out["id"].(float64)) }
	inG := id(e.createAs(admin, "in-g", map[string]any{"group_ids": []int64{g}}))
	inH := id(e.createAs(admin, "in-h", map[string]any{"group_ids": []int64{h}}))
	inGH := id(e.createAs(admin, "in-gh", map[string]any{"group_ids": []int64{g, h}}))
	loose := id(e.createAs(admin, "loose", nil))
	az.keys[picker] = []string{fmt.Sprintf("account:read:group/*/account/%d", inH), fmt.Sprintf("account:read:account/%d", loose)}
	path := func(id int64) string { return "/accounts/" + strconv.FormatInt(id, 10) }

	_, out := e.doAs(mgr, "GET", "/accounts", nil)
	require.Equal(t, fmt.Sprintf("%d,%d", inGH, inG), listIDs(out))
	_, out = e.doAs(picker, "GET", "/accounts", nil)
	require.Equal(t, fmt.Sprintf("%d,%d", loose, inH), listIDs(out))
	anyGroup := e.addUser("any@x.com")
	az.keys[anyGroup] = []string{"account:read:group/*"}
	_, out = e.doAs(anyGroup, "GET", "/accounts", nil)
	require.Equal(t, fmt.Sprintf("%d,%d,%d", inGH, inH, inG), listIDs(out), "group/*: every grouped account, not the loose one")
	_, out = e.doAs(mgr, "GET", "/accounts/summary", nil)
	require.EqualValues(t, 2, data(out)["total"])
	for _, other := range []int64{inH, loose} {
		code, _ := e.doAs(mgr, "GET", path(other), nil)
		require.Equal(t, 404, code)
		code, _ = e.doAs(mgr, "PATCH", path(other), map[string]any{"name": "x"})
		require.Equal(t, 404, code)
		code, _ = e.doAs(mgr, "DELETE", path(other), nil)
		require.Equal(t, 404, code)
	}
	code, out := e.doAs(mgr, "PATCH", path(inG), map[string]any{"name": "renamed"})
	require.Equal(t, 200, code, out)

	// Its own groups bind without account:group:bind; another needs it.
	code, out = e.doAs(mgr, "PATCH", path(inG), map[string]any{"group_ids": []int64{g, k}})
	require.Equal(t, 200, code, out)
	code, out = e.doAs(mgr, "PATCH", path(inG), map[string]any{"group_ids": []int64{g, h}})
	require.Equal(t, 403, code, out)
	// Holding account:group:bind does not let it drop its last own group.
	az.keys[mgr] = append(mgrKeys, "account:group:bind")
	code, out = e.doAs(mgr, "PATCH", path(inGH), map[string]any{"group_ids": []int64{h}})
	require.Equal(t, 403, code, out)
	require.Equal(t, "would_leave_scope", out["error"].(map[string]any)["code"])
	az.keys[mgr] = mgrKeys
	// Unbinding its last group of an account leaves its range.
	code, out = e.doAs(mgr, "PATCH", path(inGH), map[string]any{"group_ids": []int64{h}})
	require.Equal(t, 403, code, out)
	require.Equal(t, "would_leave_scope", out["error"].(map[string]any)["code"])
	var groups []int64
	require.NoError(t, e.db.Pool.QueryRow(ctx, `SELECT array_agg(group_id ORDER BY group_id) FROM account_groups WHERE account_id = $1`, inGH).Scan(&groups))
	require.Equal(t, []int64{g, h}, groups, "the refused change was rolled back")

	// Creating: into one of its groups only, with the own-level defaults.
	code, out = e.doAs(mgr, "POST", "/accounts", map[string]any{"name": "nowhere", "plugin_key": "anthropic", "type": "apikey",
		"credentials": map[string]any{"api_key": "sk-good-key-123"}})
	require.Equal(t, 400, code, out)
	require.Equal(t, "[group_ids:not_in_scope]", fmt.Sprint(fieldsOf(out)))
	// group/* needs some group; own needs none.
	star := e.addUser("star@x.com")
	az.keys[star] = []string{"account:create:group/*"}
	code, out = e.doAs(star, "POST", "/accounts", map[string]any{"name": "star", "plugin_key": "anthropic", "type": "apikey",
		"credentials": map[string]any{"api_key": "sk-good-key-123"}})
	require.Equal(t, 400, code, out)
	e.createAs(star, "star", map[string]any{"group_ids": []int64{h}})
	az.keys[star] = []string{"account:create:group/*", "account:create:own"}
	e.createAs(star, "own-mix", nil)
	made := e.createAs(mgr, "mine", map[string]any{"group_ids": []int64{k}})
	require.EqualValues(t, ownDefaultConcurrency, made["max_concurrency"])
	require.EqualValues(t, mgr, made["created_by"])

	// Plugins and other modules see the same range.
	all, ids, err := e.svc.AccountsInScope(ctx, mgr, "read", []int64{inH, inGH, loose, inG})
	require.NoError(t, err)
	require.False(t, all)
	require.Equal(t, []int64{inGH, inG}, ids)
	_, ids, err = e.svc.AccountsInScope(ctx, picker, "read", []int64{inH, inG, loose})
	require.NoError(t, err)
	require.Equal(t, []int64{inH, loose}, ids)
	_, _, err = e.svc.AccountsInScope(ctx, picker, "update", []int64{inH})
	require.Error(t, err)
	// What a plugin route with accounts (manifest.RouteAccounts) and the host
	// RPC run: the same range.
	require.NoError(t, core.AuthorizeAccounts(ctx, e.svc, mgr, "update", []int64{inG, inGH}))
	require.Error(t, core.AuthorizeAccounts(ctx, e.svc, mgr, "update", []int64{inG, inH}))
	require.Error(t, core.AuthorizeAccounts(ctx, e.svc, mgr, "update", nil), "no ids: every account needed")

	// A rebinding by someone else moves the account at once (no cache).
	_, err = e.db.Pool.Exec(ctx, `INSERT INTO account_groups (account_id, group_id) VALUES ($1, $2)`, inH, k)
	require.NoError(t, err)
	code, _ = e.doAs(mgr, "GET", path(inH), nil)
	require.Equal(t, 200, code)

	code, _ = e.doAs(mgr, "DELETE", path(inG), nil)
	require.Equal(t, 204, code)
}

// Deleting an account or a group clears the scoped grants naming it, audited
// per role, and moves the authz version.
func TestDeleteClearsScopedGrants(t *testing.T) {
	az := fakeAuthz{keys: map[int64][]string{}}
	e := setupWith(t, az)
	ctx := context.Background()
	az.keys[e.uid] = adminKeys
	g := e.exec1(`INSERT INTO groups (name) VALUES ('g') RETURNING id`)
	acc := int64(e.createAs(e.uid, "a", map[string]any{"group_ids": []int64{g}})["id"].(float64))
	role := e.exec1(`INSERT INTO roles (key, name) VALUES ('mgr', '{}') RETURNING id`)
	perm := e.exec1(`INSERT INTO permissions (key, module, label, source) VALUES ('account:read', 'account', '{}', 'core')
		ON CONFLICT (key) DO UPDATE SET key = EXCLUDED.key RETURNING id`)
	keep := fmt.Sprintf("account/%d1", acc) // another id with the same prefix
	for _, sc := range []string{fmt.Sprintf("account/%d", acc), fmt.Sprintf("group/%d/account/%d", g, acc), fmt.Sprintf("group/%d", g), keep, "own"} {
		_, err := e.db.Pool.Exec(ctx, `INSERT INTO role_permission_scopes (role_id, permission_id, scope) VALUES ($1, $2, $3)`, role, perm, sc)
		require.NoError(t, err)
	}
	scopes := func() []string {
		var out []string
		require.NoError(t, e.db.Pool.QueryRow(ctx, `SELECT array_agg(scope ORDER BY scope) FROM role_permission_scopes WHERE role_id = $1`, role).Scan(&out))
		return out
	}
	version := func() (v int64) {
		require.NoError(t, e.db.Pool.QueryRow(ctx, `SELECT version FROM authz_meta WHERE id = 1`).Scan(&v))
		return v
	}
	v := version()
	code, _ := e.doAs(e.uid, "DELETE", "/accounts/"+strconv.FormatInt(acc, 10), nil)
	require.Equal(t, 204, code)
	require.Equal(t, []string{keep, fmt.Sprintf("group/%d", g), "own"}, scopes())
	require.Equal(t, v+1, version())
	var n int
	require.NoError(t, e.db.Pool.QueryRow(ctx, `SELECT count(*) FROM audit_logs WHERE action = 'authz.scope.clear' AND target_id = $1`, strconv.FormatInt(role, 10)).Scan(&n))
	require.Equal(t, 1, n)

	require.NoError(t, e.db.Tx(ctx, func(tx pgx.Tx) error { return core.ClearScopeGrants(ctx, tx, 0, core.ScopeRefGroup, []int64{g}) }))
	require.True(t, slices.Equal([]string{keep, "own"}, scopes()))
	// Nothing to clear: nothing written.
	v = version()
	require.NoError(t, e.db.Tx(ctx, func(tx pgx.Tx) error { return core.ClearScopeGrants(ctx, tx, 0, core.ScopeRefGroup, []int64{g}) }))
	require.Equal(t, v, version())
}
