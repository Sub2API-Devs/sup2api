package iam

import (
	"context"
	"slices"
	"strconv"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/audit"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/authz"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
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

// RecoverSuperAdmin leaves the target the only holder from any start: no
// holder, one, or several (what the one-super-admin migration refuses; set
// up past its trigger, which then checks the recovery).
func TestRecoverSuperAdmin(t *testing.T) {
	for _, holders := range []int{0, 1, 2} {
		t.Run(strconv.Itoa(holders), func(t *testing.T) {
			e := setupAdmin(t)
			s, ctx := e.svc, audit.WithSource(context.Background(), "cli")
			root := mustLogin(t, s, adminEmail, adminPassword).User.ID
			other := mustCreateUser(t, s, "other@example.com")
			target := mustCreateUser(t, s, "target@example.com")
			targetLogin := mustLogin(t, s, "target@example.com", adminPassword)
			enableTwoFactor(t, s, target)
			switch holders {
			case 0:
				setSuperAdmin(t, s, root, false)
			case 2:
				setSuperAdmin(t, s, other, true)
			}
			if _, err := s.db.Pool.Exec(ctx, `UPDATE users SET status = 'disabled' WHERE id = $1`, target); err != nil {
				t.Fatal(err)
			}

			password, err := s.RecoverSuperAdmin(ctx, " Target@Example.com ", RecoverOptions{ResetPassword: true, ResetTwoFactor: true})
			if err != nil {
				t.Fatal(err)
			}
			wantRoles := map[int64][]string{root: {authz.RoleAdmin}, other: {authz.RoleUser}, target: {authz.RoleSuperAdmin, authz.RoleUser}}
			if holders == 0 {
				wantRoles[root] = nil
			}
			if holders == 2 {
				wantRoles[other] = []string{authz.RoleAdmin, authz.RoleUser}
			}
			for id, want := range wantRoles {
				u, err := s.GetUser(ctx, id)
				if err != nil {
					t.Fatal(err)
				}
				if got := slices.Sorted(slices.Values(u.Roles)); !slices.Equal(got, want) {
					t.Fatalf("user %d roles %v, want %v", id, got, want)
				}
			}
			if len(password) != 24 {
				t.Fatalf("password %q", password)
			}
			renews(t, s, targetLogin, false)
			if _, err := s.Login(ctx, "target@example.com", adminPassword, testIP); err == nil {
				t.Fatal("the old password still signs in")
			}
			var enrolled bool
			if err := s.db.Pool.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM user_totp WHERE user_id = $1)`, target).Scan(&enrolled); err != nil || enrolled {
				t.Fatalf("two-factor kept: %v %v", enrolled, err)
			}
			mustLogin(t, s, "target@example.com", password)
		})
	}
}

// The server CLI runs in its own process without a bus, so a running node's
// status cache still holds the old token_version. A token signed after the
// change carries a newer one: that node reads the status again instead of
// rejecting the new sign-in until statusCacheTTL.
func TestRecoverSuperAdminNewSignInWorksOnARunningNode(t *testing.T) {
	e := setupAdmin(t)
	s, ctx := e.svc, audit.WithSource(context.Background(), "cli")
	root := mustLogin(t, s, adminEmail, adminPassword)
	mustCreateUser(t, s, "target@example.com")
	for _, p := range []*TokenPair{root, mustLogin(t, s, "target@example.com", adminPassword)} {
		if _, err := s.VerifyAccessToken(ctx, p.AccessToken); err != nil { // fills the status cache
			t.Fatal(err)
		}
	}

	cli := New(Deps{DB: s.db, Config: e.cfg, Authz: authz.New(authz.Deps{DB: s.db})}) // as cmd/sub2api/admin.go
	for _, email := range []string{"target@example.com", adminEmail} {
		if _, err := cli.RecoverSuperAdmin(ctx, email, RecoverOptions{}); err != nil {
			t.Fatal(err)
		}
		for _, who := range []string{"target@example.com", adminEmail} {
			p := mustLogin(t, s, who, adminPassword)
			if _, err := s.VerifyAccessToken(ctx, p.AccessToken); err != nil {
				t.Fatalf("after recovering %s, a new sign-in of %s is rejected: %v", email, who, err)
			}
		}
	}
}

func TestRecoverSuperAdminUnknownUser(t *testing.T) {
	s := setupAdmin(t).svc
	if _, err := s.RecoverSuperAdmin(context.Background(), "nobody@example.com", RecoverOptions{}); !isCode(err, "not_found") {
		t.Fatalf("unknown email: %v", err)
	}
}

func mustCreateUser(t *testing.T, s *Service, email string) int64 {
	t.Helper()
	u, err := s.CreateUser(context.Background(), 0, CreateUserInput{Email: email, DisplayName: "U", Password: adminPassword})
	if err != nil {
		t.Fatal(err)
	}
	return u.ID
}

// setSuperAdmin adds or removes the super admin role behind the API's back.
func setSuperAdmin(t *testing.T, s *Service, uid int64, on bool) {
	t.Helper()
	q := `DELETE FROM user_roles ur USING roles r WHERE r.id = ur.role_id AND r.superuser AND ur.user_id = $1`
	if on {
		q = `INSERT INTO user_roles (user_id, role_id) SELECT $1, id FROM roles WHERE superuser`
	}
	testutil.ExecWithoutTrigger(t, s.db, "user_roles", "user_roles_one_superuser", q, uid)
}
