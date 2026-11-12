package iam

import (
	"context"
	"slices"
	"strconv"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/authz"
)

func TestTransferSuperAdminHTTP(t *testing.T) {
	k := newKeyEnv(t)
	s, ctx := k.s, context.Background()
	const path = "/system/super-admin/transfer"
	rootLogin := mustLogin(t, s, adminEmail, adminPassword)
	root := rootLogin.User.ID
	secret, _ := enableTwoFactor(t, s, root)
	clearLastStep(t, s, root)
	targetLogin := mustLogin(t, s, "key-user@example.com", adminPassword)
	target := k.userID
	body := func(target int64, password, code string) map[string]any {
		return map[string]any{"target_user_id": target, "current_password": password, "code": code}
	}

	if code, out := k.call(targetLogin.AccessToken, "POST", path, body(target, adminPassword, "")); code != 403 {
		t.Fatalf("non-superuser: %d %v", code, out)
	}
	key := k.createKey(t, root, adminPassword, "user:read")
	if code, out := k.call(key.Key, "POST", path, body(target, adminPassword, codeAt(t, secret, time.Now()))); code != 403 {
		t.Fatalf("access key: %d %v", code, out)
	}
	if code, out := k.call(rootLogin.AccessToken, "POST", path, body(target, "", "")); code != 400 || errCode(out) != "invalid_argument" {
		t.Fatalf("no password: %d %v", code, out)
	}
	if code, out := k.call(rootLogin.AccessToken, "POST", path, body(target, adminPassword, "")); code != 400 || errCode(out) != "invalid_argument" {
		t.Fatalf("no code: %d %v", code, out)
	}
	disabled, err := s.CreateUser(ctx, root, CreateUserInput{Email: "disabled@example.com", DisplayName: "D", Password: adminPassword})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := s.db.Pool.Exec(ctx, `UPDATE users SET status = 'disabled' WHERE id = $1`, disabled.ID); err != nil {
		t.Fatal(err)
	}
	if code, out := k.call(rootLogin.AccessToken, "POST", path, body(disabled.ID, adminPassword, codeAt(t, secret, time.Now()))); code != 400 {
		t.Fatalf("disabled target: %d %v", code, out)
	}
	clearLastStep(t, s, root)

	if code, out := k.call(rootLogin.AccessToken, "POST", path, body(target, adminPassword, codeAt(t, secret, time.Now()))); code != 204 {
		t.Fatalf("transfer: %d %v", code, out)
	}
	for id, want := range map[int64][]string{root: {authz.RoleAdmin}, target: {authz.RoleSuperAdmin, authz.RoleUser}} {
		u, err := s.GetUser(ctx, id)
		if err != nil {
			t.Fatal(err)
		}
		got := slices.Sorted(slices.Values(u.Roles))
		if !slices.Equal(got, want) {
			t.Fatalf("user %d roles %v, want %v", id, got, want)
		}
	}
	renews(t, s, rootLogin, false)
	renews(t, s, targetLogin, false)
	var n int
	if err := s.db.Pool.QueryRow(ctx, `SELECT count(*) FROM audit_logs WHERE action = 'superadmin.transfer' AND user_id = $1 AND target_id = $2`,
		root, strconv.FormatInt(target, 10)).Scan(&n); err != nil || n != 1 {
		t.Fatalf("audit rows: %d %v", n, err)
	}
}
