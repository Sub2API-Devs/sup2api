package iam

import (
	"context"
	"slices"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/authz"
)

// The self permissions: every signed-in user holds them, roles or not; an
// access key holds them only when chosen; the role editor does not list them.
func TestSelfPermissions(t *testing.T) {
	t.Parallel()
	k := newKeyEnv(t)
	ctx := context.Background()
	set, err := k.authz.PermissionSet(ctx, k.userID)
	if err != nil {
		t.Fatal(err)
	}
	for _, p := range authz.SelfPermissionKeys() {
		if !set.Has(p) {
			t.Fatalf("a signed-in user misses %s", p)
		}
	}
	roleless := mustCreateUser(t, k.s, "roleless@example.com")
	if _, err := k.s.db.Pool.Exec(ctx, `DELETE FROM user_roles WHERE user_id = $1`, roleless); err != nil {
		t.Fatal(err)
	}
	k.bump(t)
	if set, err := k.authz.PermissionSet(ctx, roleless); err != nil || !set.Has("self:profile") {
		t.Fatalf("a user without roles: %v %v", set.Keys, err)
	}
	if _, err := k.s.db.Pool.Exec(ctx, `UPDATE users SET status = 'disabled' WHERE id = $1`, roleless); err != nil {
		t.Fatal(err)
	}
	k.bump(t)
	if set, err := k.authz.PermissionSet(ctx, roleless); err != nil || len(set.Keys) != 0 {
		t.Fatalf("a disabled user: %v %v", set.Keys, err)
	}
	modules, err := k.authz.ListPermissions(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if slices.ContainsFunc(modules, func(m *authz.PermissionModule) bool { return m.Module == "self" }) {
		t.Fatal("the role editor lists the self module")
	}
	offered, err := k.s.AccessKeyPermissions(ctx, k.userID)
	if err != nil || offered[0].Module != "self" || len(offered[0].Permissions) != len(authz.SelfPermissionKeys()) {
		t.Fatalf("selector: %+v %v", offered, err)
	}

	session := mustLogin(t, k.s, "key-user@example.com", adminPassword).AccessToken
	profile := k.createKey(t, k.userID, "self:profile").Key
	security := k.createKey(t, k.userID, "self:security").Key
	for _, tc := range []struct {
		name, token, method, path string
		want                      int
	}{
		{"session edits its profile", session, "PUT", "/me", 200},
		{"key with self:profile", profile, "PUT", "/me", 200},
		{"key without self:profile", security, "PUT", "/me", 403},
		{"key with self:security", security, "GET", "/me/two-factor", 200},
		{"key without self:security", profile, "GET", "/me/two-factor", 403},
		{"key with self:security lists passkeys", security, "GET", "/me/passkeys", 200},
		// Never through a key, whatever it holds.
		{"key lists access keys", security, "GET", "/me/access-keys", 403},
		{"key lists the selector", security, "GET", "/me/access-keys/permissions", 403},
		{"key creates an access key", security, "POST", "/me/access-keys", 403},
		{"key lists sessions", security, "GET", "/me/sessions", 403},
		{"key ends other sessions", security, "POST", "/me/sessions/revoke-others", 403},
		{"key logs out", security, "POST", "/auth/logout", 403},
		{"session lists access keys", session, "GET", "/me/access-keys", 200},
	} {
		if code, out := k.call(tc.token, tc.method, tc.path, map[string]any{"display_name": "Key"}); code != tc.want {
			t.Errorf("%s: %d %v, want %d", tc.name, code, out, tc.want)
		}
	}
}
