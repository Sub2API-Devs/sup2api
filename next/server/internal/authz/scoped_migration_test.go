package authz

import (
	"context"
	"fmt"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/migrations"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/perm"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

var scopableActions = []perm.Key{perm.AccountRead, perm.AccountCreate, perm.AccountUpdate, perm.AccountDelete,
	perm.AccountTest, perm.AccountCredentialView, perm.ProxyRead, perm.ProxyManage}

// reach maps "<caller> <action>" to the account or proxy ids the caller
// reaches, read by a fresh service (no cache, no sync) through the data
// scope predicate. Callers are users and, as "key<id>", access keys.
func reach(t *testing.T, db *store.DB, users []int64) map[string][]int64 {
	t.Helper()
	ctx := context.Background()
	s := New(Deps{DB: db})
	out := map[string][]int64{}
	collect := func(name string, ctx context.Context, uid int64) {
		set, err := s.PermissionSet(ctx, uid)
		require.NoError(t, err)
		for _, a := range scopableActions {
			table, from := core.AccountRows, "accounts a WHERE a.deleted_at IS NULL AND "
			if perm.ScopeType(a) == perm.ResourceProxy {
				table, from = core.ProxyRows, "proxies p WHERE "
			}
			var ids []int64
			require.NoError(t, db.Pool.QueryRow(ctx, `SELECT COALESCE(array_agg(`+table.ID+` ORDER BY `+table.ID+`), '{}') FROM `+from+table.SQL(1),
				table.Args(set.DataScope(uid, a))...).Scan(&ids))
			out[fmt.Sprintf("%s %s", name, a)] = ids
		}
	}
	for _, uid := range users {
		collect(fmt.Sprintf("user%d", uid), ctx, uid)
	}
	rows, err := db.Pool.Query(ctx, `SELECT id, user_id, permissions FROM user_access_keys ORDER BY id`)
	require.NoError(t, err)
	type key struct {
		id, uid int64
		perms   []string
	}
	var keys []key
	for rows.Next() {
		var k key
		require.NoError(t, rows.Scan(&k.id, &k.uid, &k.perms))
		keys = append(keys, k)
	}
	require.NoError(t, rows.Err())
	for _, k := range keys {
		collect(fmt.Sprintf("key%d", k.id), core.WithAccessKey(core.WithUserID(ctx, k.uid), core.AccessKeyIdentity{UserID: k.uid, KeyID: k.id, Permissions: k.perms}), k.uid)
	}
	return out
}

// The rewrite of the former own-level keys (migration 0097) is word for
// word: on a 0.1.285 database whose custom roles and access keys hold them,
// alone or next to the full key, every user and every key reaches after it
// exactly the rows 0.1.285 gave them: what they created for an own-level
// key, every row for a full one, and an access key no more than its user.
func TestRetiredOwnKeysReachTheSameRows(t *testing.T) {
	db := testutil.DBThrough(t, "0096_usage_base_cost.sql")
	ctx := context.Background()
	exec := func(sql string, args ...any) {
		t.Helper()
		_, err := db.Pool.Exec(ctx, sql, args...)
		require.NoError(t, err)
	}
	id := func(email string) (v int64) {
		t.Helper()
		require.NoError(t, db.Pool.QueryRow(ctx, `SELECT id FROM users WHERE email = $1`, email).Scan(&v))
		return v
	}
	exec(`
INSERT INTO roles (key, name, builtin, superuser) VALUES ('super_admin', '{}', true, true), ('seller', '{}', false, false), ('mixed', '{}', false, false);
INSERT INTO permissions (key, module, label, source)
SELECT k, split_part(k, ':', 1), '{}', 'core' FROM unnest(ARRAY[
    'account:read', 'account:create', 'account:update', 'account:delete', 'account:test', 'account:credential:view', 'proxy:read', 'proxy:manage',
    'account:own:read', 'account:own:create', 'account:own:update', 'account:own:delete', 'account:own:test', 'account:own:credential:view',
    'proxy:own:read', 'proxy:own:manage']) k;
INSERT INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p
WHERE (r.key = 'seller' AND p.key IN ('account:own:read', 'account:own:update', 'account:own:credential:view', 'proxy:own:manage'))
   OR (r.key = 'mixed' AND p.key IN ('account:read', 'account:own:read', 'account:own:delete', 'proxy:read', 'proxy:own:read'));
INSERT INTO users (email, password_hash) VALUES ('root@x', ''), ('seller@x', ''), ('mixed@x', ''), ('nobody@x', '');
INSERT INTO user_roles (user_id, role_id) SELECT u.id, r.id FROM users u JOIN roles r ON (u.email, r.key) IN
    (('root@x', 'super_admin'), ('seller@x', 'seller'), ('mixed@x', 'mixed'))`)
	seller, mixed, nobody := id("seller@x"), id("mixed@x"), id("nobody@x")
	for i, by := range []any{seller, seller, mixed, nobody, nil} {
		exec(`INSERT INTO accounts (name, plugin_key, type, credentials_enc, created_by) VALUES ($1, 'anthropic', 'apikey', '\x00', $2)`, fmt.Sprint("a", i), by)
		exec(`INSERT INTO proxies (name, protocol, host, port, created_by) VALUES ($1, 'http', 'proxy.example', 3128, $2)`, fmt.Sprint("p", i), by)
	}
	exec(`INSERT INTO user_access_keys (user_id, name, token_hash, token_hint, permissions) VALUES
		($1, 'own', 'h1', '0001', '{account:own:read,proxy:own:manage}'),
		($2, 'wide', 'h2', '0002', '{account:read,account:delete,proxy:read}'),
		($3, 'none', 'h3', '0003', '{account:read}')`, seller, mixed, nobody)
	created := func(table string, uid int64) (ids []int64) {
		t.Helper()
		require.NoError(t, db.Pool.QueryRow(ctx, `SELECT array_agg(id ORDER BY id) FROM `+table+` WHERE created_by = $1`, uid).Scan(&ids))
		return ids
	}
	all := func(table string) (ids []int64) {
		t.Helper()
		require.NoError(t, db.Pool.QueryRow(ctx, `SELECT array_agg(id ORDER BY id) FROM `+table).Scan(&ids))
		return ids
	}

	_, err := store.Migrate(ctx, db, migrations.FS, store.CoreTracker{}, store.MigrateOptions{LockKey: store.CoreMigrationLockKey})
	require.NoError(t, err)

	want := map[string][]int64{}
	for _, a := range scopableActions {
		for _, who := range []string{fmt.Sprint("user", seller), fmt.Sprint("user", mixed), fmt.Sprint("user", nobody), "key1", "key2", "key3"} {
			want[fmt.Sprintf("%s %s", who, a)] = []int64{}
		}
	}
	set := func(who string, a perm.Key, ids []int64) { want[fmt.Sprintf("%s %s", who, a)] = ids }
	for _, a := range []perm.Key{perm.AccountRead, perm.AccountUpdate, perm.AccountCredentialView} {
		set(fmt.Sprint("user", seller), a, created("accounts", seller))
	}
	set(fmt.Sprint("user", seller), perm.ProxyManage, created("proxies", seller))
	set(fmt.Sprint("user", mixed), perm.AccountRead, all("accounts"))
	set(fmt.Sprint("user", mixed), perm.AccountDelete, created("accounts", mixed))
	set(fmt.Sprint("user", mixed), perm.ProxyRead, all("proxies"))
	set("key1", perm.AccountRead, created("accounts", seller))
	set("key1", perm.ProxyManage, created("proxies", seller))
	set("key2", perm.AccountRead, all("accounts"))
	set("key2", perm.AccountDelete, created("accounts", mixed))
	set("key2", perm.ProxyRead, all("proxies"))
	require.Equal(t, want, reach(t, db, []int64{seller, mixed, nobody}))
}
