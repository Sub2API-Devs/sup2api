package iam

import (
	"context"
	"strconv"
	"sync"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/authz"
)

// familyOf reads the login session id out of an access token.
func familyOf(t *testing.T, s *Service, access string) string {
	t.Helper()
	var c accessClaims
	if _, err := jwt.ParseWithClaims(access, &c, func(*jwt.Token) (any, error) { return s.cfg.JWTSecret, nil }); err != nil || c.Family == "" {
		t.Fatalf("family of %q: %v", access, err)
	}
	return c.Family
}

// renews checks a session after its user's sessions changed: the access
// token is rejected at once and only a kept session renews. It returns the
// renewed pair of a kept session.
func renews(t *testing.T, s *Service, p *TokenPair, kept bool) *TokenPair {
	t.Helper()
	ctx := context.Background()
	if _, err := s.VerifyAccessToken(ctx, p.AccessToken); !isCode(err, "unauthenticated") {
		t.Fatalf("old access token: %v", err)
	}
	next, err := s.Refresh(ctx, p.RefreshToken)
	if !kept {
		if err == nil {
			t.Fatal("an ended session renewed")
		}
		return nil
	}
	if err != nil {
		t.Fatalf("a kept session did not renew: %v", err)
	}
	if _, err := s.VerifyAccessToken(ctx, next.AccessToken); err != nil {
		t.Fatalf("renewed access token: %v", err)
	}
	return next
}

func TestRevokedSessionsStopAtOnce(t *testing.T) {
	e := setupAdmin(t)
	s, ctx := e.svc, context.Background()
	a := mustLogin(t, s, adminEmail, adminPassword)
	b := mustLogin(t, s, adminEmail, adminPassword)
	c := mustLogin(t, s, adminEmail, adminPassword)
	id := a.User.ID
	for _, p := range []*TokenPair{a, b, c} {
		if _, err := s.VerifyAccessToken(ctx, p.AccessToken); err != nil {
			t.Fatal(err)
		}
	}

	if err := s.RevokeSession(ctx, id, familyOf(t, s, a.AccessToken)); err != nil {
		t.Fatal(err)
	}
	renews(t, s, a, false)
	b = renews(t, s, b, true)
	c = renews(t, s, c, true)

	if err := s.RevokeOtherSessions(ctx, id, familyOf(t, s, b.AccessToken)); err != nil {
		t.Fatal(err)
	}
	renews(t, s, c, false)
	renews(t, s, b, true)
}

func TestLogoutEndsThatSession(t *testing.T) {
	e := setupAdmin(t)
	s, ctx := e.svc, context.Background()
	a := mustLogin(t, s, adminEmail, adminPassword)
	b := mustLogin(t, s, adminEmail, adminPassword)
	if err := s.Logout(ctx, a.User.ID, a.RefreshToken); err != nil {
		t.Fatal(err)
	}
	renews(t, s, a, false)
	b = renews(t, s, b, true)
	// Without a refresh token every session ends.
	if err := s.Logout(ctx, a.User.ID, ""); err != nil {
		t.Fatal(err)
	}
	renews(t, s, b, false)
}

func TestChangePasswordEndsOtherSessionsKeepsCurrent(t *testing.T) {
	e := setupAdmin(t)
	s, ctx := e.svc, context.Background()
	current := mustLogin(t, s, adminEmail, adminPassword)
	other := mustLogin(t, s, adminEmail, adminPassword)
	if err := s.ChangePassword(ctx, current.User.ID, familyOf(t, s, current.AccessToken), adminPassword, "another-password-1"); err != nil {
		t.Fatal(err)
	}
	renews(t, s, other, false)
	renews(t, s, current, true)
}

// A second node keeps its own status cache: an admin's password reset on
// node 1 must reach it at once, not after statusCacheTTL.
func TestAdminPasswordResetBroadcasts(t *testing.T) {
	e := setupAdmin(t)
	s, ctx := e.svc, context.Background()
	root := mustLogin(t, s, adminEmail, adminPassword).User.ID
	pw, reset := "password-1", "password-2"
	u, err := s.CreateUser(ctx, root, CreateUserInput{Email: "bob@example.com", Password: pw})
	if err != nil {
		t.Fatal(err)
	}
	az2 := authz.New(authz.Deps{DB: s.db, Bus: e.bus})
	if err := az2.Start(ctx); err != nil {
		t.Fatal(err)
	}
	node2 := New(Deps{DB: s.db, Redis: redis.NewClient(&redis.Options{Addr: e.redis.Addr()}), Config: e.cfg, Authz: az2, Bus: e.bus, BcryptCost: bcrypt.MinCost})

	p := mustLogin(t, s, u.Email, pw)
	if _, err := node2.VerifyAccessToken(ctx, p.AccessToken); err != nil {
		t.Fatal(err)
	}
	if _, err := s.UpdateUser(ctx, root, u.ID, UpdateUserInput{Password: &reset}, testIP); err != nil {
		t.Fatal(err)
	}
	if _, err := node2.VerifyAccessToken(ctx, p.AccessToken); !isCode(err, "unauthenticated") {
		t.Fatalf("node 2 still accepts the old token: %v", err)
	}
}

// ChangePassword takes only the user lock and UpdateUser{Status} takes the
// authz lock first, then the user lock: run together they must not deadlock.
func TestChangePasswordAndStatusUpdateDoNotDeadlock(t *testing.T) {
	e := setupAdmin(t)
	s := e.svc
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()
	root := mustLogin(t, s, adminEmail, adminPassword).User.ID
	pws := [2]string{"password-1", "password-2"}
	u, err := s.CreateUser(ctx, root, CreateUserInput{Email: "carol@example.com", Password: pws[0]})
	if err != nil {
		t.Fatal(err)
	}
	const rounds = 100
	errs := make(chan error, 2*rounds)
	var wg sync.WaitGroup
	wg.Add(2)
	go func() {
		defer wg.Done()
		for i := range rounds {
			errs <- s.ChangePassword(ctx, u.ID, "", pws[i%2], pws[(i+1)%2])
		}
	}()
	go func() {
		defer wg.Done()
		statuses := [2]string{StatusDisabled, StatusActive}
		for i := range rounds {
			_, err := s.UpdateUser(ctx, root, u.ID, UpdateUserInput{Status: &statuses[i%2]}, testIP)
			errs <- err
		}
	}()
	wg.Wait()
	close(errs)
	for err := range errs {
		if err != nil {
			t.Fatal(err)
		}
	}
}

// superadminLogins reads the auth.superadmin_login audit rows as user, method
// and ip.
func superadminLogins(t *testing.T, s *Service) []string {
	t.Helper()
	rows, err := s.db.Pool.Query(context.Background(), `SELECT user_id || ' ' || (detail->>'method') || ' ' || (detail->>'ip') || ' ' || ip
		FROM audit_logs WHERE action = 'auth.superadmin_login' ORDER BY id`)
	if err != nil {
		t.Fatal(err)
	}
	out, err := pgx.CollectRows(rows, pgx.RowTo[string])
	if err != nil {
		t.Fatal(err)
	}
	return out
}

func TestSuperadminLoginIsAudited(t *testing.T) {
	t.Parallel()
	s, ctx := setupAdmin(t).svc, context.Background()
	login := context.WithValue(ctx, sessionMetaKey{}, sessionMeta{method: loginMethodPassword, ip: testIP})
	root, err := s.Login(login, adminEmail, adminPassword, testIP)
	if err != nil {
		t.Fatal(err)
	}
	want := strconv.FormatInt(root.User.ID, 10) + " password " + testIP + " " + testIP
	if got := superadminLogins(t, s); len(got) != 1 || got[0] != want {
		t.Fatalf("after super admin login: %q, want [%q]", got, want)
	}

	// A refresh and an ordinary user's login are not audited.
	if _, err := s.Refresh(ctx, root.RefreshToken); err != nil {
		t.Fatal(err)
	}
	if _, err := s.CreateUser(ctx, root.User.ID, CreateUserInput{Email: "plain@example.com", Password: "password-1"}); err != nil {
		t.Fatal(err)
	}
	if _, err := s.Login(login, "plain@example.com", "password-1", testIP); err != nil {
		t.Fatal(err)
	}
	if got := superadminLogins(t, s); len(got) != 1 {
		t.Fatalf("after refresh and user login: %q", got)
	}
}
