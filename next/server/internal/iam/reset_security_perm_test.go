package iam

import (
	"context"
	"strconv"
	"testing"
)

// Clearing someone's two-factor and passkeys takes user:password:reset, not
// user:update, and a login session: it leaves the account one password away,
// like resetting the password (W2-F8, D16).
func TestResetSecurityNeedsPasswordReset(t *testing.T) {
	t.Parallel()
	k := newKeyEnv(t)
	ctx := context.Background()
	mk := func(email, role string, perms ...string) (id int64, session string) {
		t.Helper()
		u, err := k.s.CreateUser(ctx, 0, CreateUserInput{Email: email, Password: adminPassword})
		if err != nil {
			t.Fatal(err)
		}
		k.grantRole(t, u.ID, role, perms...)
		return u.ID, mustLogin(t, k.s, email, adminPassword).AccessToken
	}
	_, editor := mk("editor@example.com", "editor", "user:read", "user:update")
	resetterID, resetter := mk("resetter@example.com", "resetter", "user:read", "user:update", "user:password:reset")
	target := "/users/" + strconv.FormatInt(k.userID, 10) + "/security"
	enroll := func() {
		t.Helper()
		if _, err := k.s.db.Pool.Exec(ctx, `INSERT INTO user_totp (user_id, secret_enc, last_step) VALUES ($1, 'x', 0)`, k.userID); err != nil {
			t.Fatal(err)
		}
	}
	enrolled := func() bool {
		t.Helper()
		var on bool
		if err := k.s.db.Pool.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM user_totp WHERE user_id = $1)`, k.userID).Scan(&on); err != nil {
			t.Fatal(err)
		}
		return on
	}
	denied := func(who, token string, wantDetail any) {
		t.Helper()
		code, out := k.call(token, "DELETE", target, nil)
		e, _ := out["error"].(map[string]any)
		details, _ := e["details"].(map[string]any)
		if code != 403 || details["permission"] != wantDetail {
			t.Fatalf("%s: %d %v, want 403 with details.permission=%v", who, code, out, wantDetail)
		}
		if !enrolled() {
			t.Fatalf("%s cleared the two-factor", who)
		}
	}

	enroll()
	denied("user:update alone", editor, "user:password:reset")
	// The permission is session only: no access key carries it, whatever its
	// owner holds and whatever else the key was given.
	// Not even one stored with it before the permission became session only.
	for who, owner := range map[string]int64{"an access key of a holder": resetterID, "an access key of the super admin": mustLogin(t, k.s, adminEmail, adminPassword).User.ID} {
		key := k.createKey(t, owner, adminPassword, "user:read", "user:update")
		if _, err := k.s.db.Pool.Exec(ctx, `UPDATE user_access_keys SET permissions = array_append(permissions, 'user:password:reset') WHERE id = $1`, key.ID); err != nil {
			t.Fatal(err)
		}
		denied(who, key.Key, "user:password:reset")
	}

	if code, out := k.call(resetter, "DELETE", target, nil); code != 204 {
		t.Fatalf("holder: %d %v", code, out)
	}
	if enrolled() {
		t.Fatal("the holder's reset left the two-factor on")
	}
}
