package authz

import (
	"context"
	"fmt"
	"slices"
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

// Migration 0103 is word for word (期 4 R2a): on a database holding the
// former own-level grants (built-in and custom roles, redundant next to the
// full key or not) and access keys naming them, every user and every key
// reaches exactly the same accounts and proxies for every action before it
// runs (aliases only) and after it with the aliases retired (the next
// version's R2b: the scoped grants alone). It writes only what is missing,
// audits what it writes, moves the version once, and leaves the rows older
// cores read untouched.
func TestScopedPermissionsMigrationIsVerbatim(t *testing.T) {
	db := testutil.DB(t)
	s := newService(t, db, newMemBus(), nil)
	ctx := context.Background()
	exec := func(sql string, args ...any) {
		t.Helper()
		_, err := db.Pool.Exec(ctx, sql, args...)
		require.NoError(t, err)
	}
	scalar := func(sql string, args ...any) (v int64) {
		t.Helper()
		require.NoError(t, db.Pool.QueryRow(ctx, sql, args...).Scan(&v))
		return v
	}
	migrate := func() {
		t.Helper()
		exec(`DELETE FROM schema_migrations WHERE id = '0103_scoped_permissions.sql'`)
		done, err := store.Migrate(ctx, db, migrations.FS, store.CoreTracker{}, store.MigrateOptions{LockKey: store.CoreMigrationLockKey})
		require.NoError(t, err)
		require.Equal(t, []string{"0103_scoped_permissions.sql"}, done)
	}
	roleKeys := func(role string) []string {
		t.Helper()
		var keys []string
		require.NoError(t, db.Pool.QueryRow(ctx, `SELECT COALESCE(array_agg(p.key ORDER BY p.key), '{}') FROM role_permissions rp
			JOIN roles r ON r.id = rp.role_id JOIN permissions p ON p.id = rp.permission_id WHERE r.key = $1`, role).Scan(&keys))
		return keys
	}
	scopedKeys := func(role string) []string {
		t.Helper()
		var keys []string
		require.NoError(t, db.Pool.QueryRow(ctx, `SELECT COALESCE(array_agg(p.key || ':' || rs.scope ORDER BY p.key), '{}') FROM role_permission_scopes rs
			JOIN roles r ON r.id = rs.role_id JOIN permissions p ON p.id = rs.permission_id WHERE r.key = $1`, role).Scan(&keys))
		return keys
	}

	// The state an earlier version leaves: former own-level grants only.
	exec(`INSERT INTO roles (key, name) VALUES ('seller', '{}'), ('mixed', '{}')`)
	exec(`INSERT INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p
		WHERE (r.key = 'seller' AND p.key IN ('account:own:read', 'account:own:update', 'account:own:credential:view', 'proxy:own:manage'))
		   OR (r.key = 'mixed' AND p.key IN ('account:read', 'account:own:read', 'account:own:delete', 'proxy:read', 'proxy:own:read'))
		ON CONFLICT DO NOTHING`)
	exec(`DELETE FROM role_permission_scopes`)
	seller := addUser(t, s, "seller@x.com", RoleUser, "seller")
	mixed := addUser(t, s, "mixed@x.com", "mixed")
	supplier := addUser(t, s, "supplier@x.com", RoleUser, RoleSupplier)
	operator := addUser(t, s, "operator@x.com", RoleOperator)
	nobody := addUser(t, s, "nobody@x.com", RoleUser)
	users := []int64{seller, mixed, supplier, operator, nobody}
	for i, by := range []any{seller, seller, mixed, supplier, operator, nil} {
		exec(`INSERT INTO accounts (name, plugin_key, type, credentials_enc, created_by) VALUES ($1, 'anthropic', 'apikey', '\x00', $2)`, fmt.Sprint("a", i), by)
		exec(`INSERT INTO proxies (name, protocol, host, port, created_by) VALUES ($1, 'http', 'proxy.example', 3128, $2)`, fmt.Sprint("p", i), by)
	}
	exec(`INSERT INTO user_access_keys (user_id, name, token_hash, token_hint, permissions) VALUES
		($1, 'own', 'h1', '0001', '{account:own:read,proxy:own:manage}'),
		($2, 'wide', 'h2', '0002', '{account:read,account:delete,proxy:read}'),
		($3, 'none', 'h3', '0003', '{account:read}')`, seller, mixed, nobody)
	rolesBefore := map[string][]string{}
	for _, r := range []string{"seller", "mixed", RoleSupplier, RoleOperator} {
		rolesBefore[r] = roleKeys(r)
	}
	before := reach(t, db, users)
	require.NotEmpty(t, before[fmt.Sprintf("user%d account:read", seller)], "the fixture reaches nothing")
	version := scalar(`SELECT version FROM authz_meta WHERE id = 1`)

	migrate()
	require.Equal(t, version+1, scalar(`SELECT version FROM authz_meta WHERE id = 1`))
	require.Equal(t, []string{"account:credential:view:own", "account:read:own", "account:update:own", "proxy:manage:own"}, scopedKeys("seller"))
	// Redundant next to the full key: not converted, audited.
	require.Equal(t, []string{"account:delete:own"}, scopedKeys("mixed"))
	require.Equal(t, []string{"account:credential:view:own"}, scopedKeys(RoleOperator))
	require.Len(t, scopedKeys(RoleSupplier), 8)
	for role, keys := range rolesBefore {
		require.Equal(t, keys, roleKeys(role), "%s: the rows older cores read changed", role)
	}
	var keyPerms [][]string
	rows, err := db.Pool.Query(ctx, `SELECT permissions FROM user_access_keys ORDER BY id`)
	require.NoError(t, err)
	for rows.Next() {
		var p []string
		require.NoError(t, rows.Scan(&p))
		keyPerms = append(keyPerms, p)
	}
	require.Equal(t, [][]string{
		{"account:own:read", "proxy:own:manage", "account:read:own", "proxy:manage:own"},
		{"account:read", "account:delete", "proxy:read"},
		{"account:read"},
	}, keyPerms)
	audits := scalar(`SELECT count(*) FROM audit_logs WHERE detail->>'via' = 'migration 0103'`)
	// seller 4 + mixed 1 + operator 1 + supplier 8 converted, mixed 2
	// redundant, 1 access key.
	require.Equal(t, int64(4+1+1+8+2+1), audits)
	require.Equal(t, before, reach(t, db, users), "the aliases and the scopes disagree")

	// Again: nothing written.
	migrate()
	require.Equal(t, version+1, scalar(`SELECT version FROM authz_meta WHERE id = 1`))
	require.Equal(t, audits, scalar(`SELECT count(*) FROM audit_logs WHERE detail->>'via' = 'migration 0103'`))

	// The next version retires the aliases: the scoped grants alone reach
	// the same rows.
	exec(`UPDATE permissions SET status = 'removed' WHERE key = ANY($1)`, legacyOwnKeys())
	exec(`UPDATE user_access_keys SET permissions = array(SELECT k FROM unnest(permissions) k WHERE k <> ALL($1))`, legacyOwnKeys())
	after := reach(t, db, users)
	for k, ids := range before {
		require.Equal(t, ids, after[k], k)
	}
	// What the fixture shows: own scopes only reach their creator's rows,
	// and an access key's wider key narrows to its user's scope.
	require.Equal(t, before[fmt.Sprintf("user%d account:update", seller)], after[fmt.Sprintf("user%d account:read", seller)])
	require.Empty(t, after[fmt.Sprintf("user%d account:read", nobody)])
	require.Len(t, after[fmt.Sprintf("user%d account:read", operator)], 6)
	require.Len(t, after[fmt.Sprintf("user%d account:credential:view", operator)], 1)
	require.True(t, slices.Equal(after[fmt.Sprintf("user%d account:delete", mixed)], after[fmt.Sprintf("key2 account:delete")]))
}

// A new database and a migrated one give the built-in roles the same grants
// (canonical, as the role editor lists them).
func TestNewAndMigratedBuiltinRolesAgree(t *testing.T) {
	db := testutil.DB(t)
	s := newService(t, db, newMemBus(), nil)
	ctx := context.Background()
	fresh := map[string][]string{}
	for _, r := range builtinRoles {
		role, err := s.GetRole(ctx, roleID(t, s, r.key))
		require.NoError(t, err)
		fresh[r.key] = slices.Sorted(slices.Values(role.PermissionKeys))
	}
	// An earlier version's database: the former own-level defaults only
	// (the operator held them next to the full keys), then 0103.
	_, err := db.Pool.Exec(ctx, `DELETE FROM role_permission_scopes`)
	require.NoError(t, err)
	_, err = db.Pool.Exec(ctx, `INSERT INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p
		WHERE r.key IN ('operator', 'supplier') AND p.key = ANY($1) ON CONFLICT DO NOTHING`, legacyOwnKeys())
	require.NoError(t, err)
	_, err = db.Pool.Exec(ctx, `DELETE FROM schema_migrations WHERE id = '0103_scoped_permissions.sql'`)
	require.NoError(t, err)
	_, err = store.Migrate(ctx, db, migrations.FS, store.CoreTracker{}, store.MigrateOptions{LockKey: store.CoreMigrationLockKey})
	require.NoError(t, err)
	for _, r := range builtinRoles {
		role, err := s.GetRole(ctx, roleID(t, s, r.key))
		require.NoError(t, err)
		require.Equal(t, fresh[r.key], slices.Sorted(slices.Values(role.PermissionKeys)), r.key)
	}
	require.Equal(t, slices.Sorted(slices.Values(supplierPermissions)), fresh[RoleSupplier])
}
