package authz

import (
	"context"
	"errors"
	"slices"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

// Scoped grants (CONTRACTS §21, R2a): a role write stores unscoped keys in
// role_permissions and scoped ones in role_permission_scopes, mirrors each
// own scope of a former own-level key for older cores, lists them canonical
// and refuses keys that do not parse; holders get exactly those scopes.
func TestScopedRoleGrants(t *testing.T) {
	t.Parallel()
	db := testutil.DB(t)
	s := newService(t, db, newMemBus(), nil)
	ctx := context.Background()
	root := addUser(t, s, "root@x.com", RoleSuperAdmin)
	rows := func(id int64) (plain, scoped []string) {
		t.Helper()
		require.NoError(t, db.Pool.QueryRow(ctx, `SELECT COALESCE(array_agg(p.key ORDER BY p.key), '{}') FROM role_permissions rp JOIN permissions p ON p.id = rp.permission_id WHERE rp.role_id = $1`, id).Scan(&plain))
		require.NoError(t, db.Pool.QueryRow(ctx, `SELECT COALESCE(array_agg(p.key || ':' || rs.scope ORDER BY p.key, rs.scope), '{}') FROM role_permission_scopes rs JOIN permissions p ON p.id = rs.permission_id WHERE rs.role_id = $1`, id).Scan(&scoped))
		return plain, scoped
	}

	r, err := s.CreateRole(ctx, root, CreateRoleInput{Key: "group_ops", Name: map[string]string{"en": "Group ops"},
		PermissionKeys: []string{"account:update:group/12/*", "account:own:read", "account:read:own", "proxy:manage:proxy/8", "user:read", "account:test:*"}})
	require.NoError(t, err)
	require.Equal(t, []string{"user:read", "account:read:own", "account:update:group/12", "account:test", "proxy:manage:proxy/8"}, r.PermissionKeys)
	plain, scoped := rows(r.ID)
	require.Equal(t, []string{"account:own:read", "account:test", "user:read"}, plain, "the own scope is mirrored for older cores")
	require.Equal(t, []string{"account:read:own", "account:update:group/12", "proxy:manage:proxy/8"}, scoped)

	holder := addUser(t, s, "ops@x.com", "group_ops")
	set, err := s.PermissionSet(ctx, holder)
	require.NoError(t, err)
	require.False(t, set.Has("account:read"))
	require.False(t, set.Has("account:update"))
	require.True(t, set.Has("account:update:group/12/account/5"))
	require.True(t, set.Has("account:own:read"))

	// Narrowing drops the scope and its mirror; a redundant own next to the
	// full key is not kept.
	r, err = s.SetRolePermissions(ctx, root, r.ID, []string{"account:update:group/12", "account:test", "account:test:own"})
	require.NoError(t, err)
	require.Equal(t, []string{"account:test", "account:update:group/12"}, slices.Sorted(slices.Values(r.PermissionKeys)))
	plain, scoped = rows(r.ID)
	require.Equal(t, []string{"account:test"}, plain)
	require.Equal(t, []string{"account:update:group/12"}, scoped)

	for _, bad := range []string{"user:read:own", "account:create:account/5", "account:read:proxy/1", "account:read:group/01"} {
		_, err = s.SetRolePermissions(ctx, root, r.ID, []string{bad})
		var ce *core.Error
		require.True(t, errors.As(err, &ce) && ce.Code == "invalid_argument", "%s: %v", bad, err)
	}

	// The editor lists actions with their scope type, not the aliases.
	mods, err := s.ListPermissions(ctx)
	require.NoError(t, err)
	types := map[string]string{}
	for _, m := range mods {
		for _, p := range m.Permissions {
			types[p.Key] = p.ScopeType
		}
	}
	require.Equal(t, "account", types["account:credential:view"])
	require.Equal(t, "proxy", types["proxy:read"])
	require.Equal(t, "", types["account:relay"])
	for _, old := range legacyOwnKeys() {
		_, listed := types[old]
		require.False(t, listed, old)
	}
}
