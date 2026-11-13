package authz

import (
	"context"
	"errors"
	"fmt"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

// Granting and managing compare scopes by implication, from the text of the
// keys alone (CONTRACTS §21.0, R6): who manages group 12 grants group 12 and
// what it implies, never group 13 nor an account id outside the group
// syntax, and acts on holders of a subset of its range only; own is
// relative (an own holder grants own). Denials name the canonical keys.
func TestScopedGrantsAndManagement(t *testing.T) {
	t.Parallel()
	db := testutil.DB(t)
	s := newService(t, db, newMemBus(), nil)
	ctx := context.Background()
	root := addUser(t, s, "root@x.com", RoleSuperAdmin)
	role := func(key string, perms ...string) {
		t.Helper()
		_, err := s.CreateRole(ctx, root, CreateRoleInput{Key: key, Name: lt(key, key), PermissionKeys: perms})
		require.NoError(t, err)
	}
	manage := []string{"role:define", "role:assign", "user:update"}
	role("ops_a", append(manage, "account:read:group/12", "account:update:group/12")...)
	role("sub_a", "account:update:group/12/account/125", "account:read:group/12/*")
	role("ops_b", "account:update:group/13")
	role("own_ops", append(manage, "account:update:own")...)
	role("own_sub", "account:update:own")
	letAssign(t, s, "ops_a", "sub_a", "ops_b")
	letAssign(t, s, "own_ops", "own_sub")
	a := addUser(t, s, "a@x.com", "ops_a")
	own := addUser(t, s, "own@x.com", "own_ops")

	for _, tc := range []struct {
		actor   int64
		keys    []string
		missing []string // nil: granted
	}{
		{a, []string{"account:update:group/12/account/125", "account:read:group/12"}, nil},
		{a, []string{"account:update:group/12/*"}, nil},
		{a, []string{"account:update:account/125"}, []string{"account:update:account/125"}},
		{a, []string{"account:update:group/13", "account:update:group/12"}, []string{"account:update:group/13"}},
		{a, []string{"account:update"}, []string{"account:update"}},
		{a, []string{"account:update:group/*"}, []string{"account:update:group/*"}},
		{a, []string{"account:update:own"}, []string{"account:update:own"}},
		{a, []string{"account:delete:group/12"}, []string{"account:delete:group/12"}},
		{own, []string{"account:own:update"}, nil},
		{own, []string{"account:update:own"}, nil},
		{own, []string{"account:update:group/1"}, []string{"account:update:group/1"}},
	} {
		err := s.CanGrant(ctx, tc.actor, tc.keys)
		if tc.missing == nil {
			require.NoError(t, err, "%v", tc.keys)
			continue
		}
		var ce *core.Error
		require.True(t, errors.As(err, &ce) && ce.Code == "permission_denied", "%v: %v", tc.keys, err)
		require.Equal(t, tc.missing, ce.Details["missing"], "%v", tc.keys)
	}

	// Audits name the canonical keys, whatever spelling was sent.
	spelled, err := s.CreateRole(ctx, root, CreateRoleInput{Key: "spelled", Name: lt("s", "s"), PermissionKeys: []string{"account:own:read", "account:update:group/12/account/*"}})
	require.NoError(t, err)
	var detail string
	require.NoError(t, db.Pool.QueryRow(ctx, `SELECT detail->>'permission_keys' FROM audit_logs WHERE action = 'role.create' AND target_id = $1`, fmt.Sprint(spelled.ID)).Scan(&detail))
	require.JSONEq(t, `["account:read:own", "account:update:group/12"]`, detail)

	// Defining a role: the same rule.
	_, err = s.CreateRole(ctx, a, CreateRoleInput{Key: "a_child", Name: lt("c", "c"), PermissionKeys: []string{"account:read:group/12/account/7"}})
	require.NoError(t, err)
	_, err = s.CreateRole(ctx, a, CreateRoleInput{Key: "a_wide", Name: lt("w", "w"), PermissionKeys: []string{"account:read:group/13"}})
	require.True(t, isCode(err, "permission_denied"), "%v", err)

	// Assigning and acting on users: a subset of A's range, not B's.
	x, y := addUser(t, s, "x@x.com"), addUser(t, s, "y@x.com")
	require.NoError(t, setRoles(s, a, x, "sub_a"))
	err = setRoles(s, a, y, "ops_b")
	require.True(t, isCode(err, "permission_denied"), "%v", err)
	b := addUser(t, s, "b@x.com", "ops_b")
	require.True(t, isCode(s.CanActOnUsers(ctx, a, core.ActOnIdentity, b), "permission_denied"))
	require.NoError(t, s.CanActOnUsers(ctx, a, core.ActOnIdentity, x))

	// own is relative: an own holder hands own to others and manages them.
	z := addUser(t, s, "z@x.com")
	require.NoError(t, setRoles(s, own, z, "own_sub"))
	require.NoError(t, s.CanActOnUsers(ctx, own, core.ActOnIdentity, z))
	// Not a group manager, though.
	require.True(t, isCode(s.CanActOnUsers(ctx, own, core.ActOnIdentity, x), "permission_denied"))
}
