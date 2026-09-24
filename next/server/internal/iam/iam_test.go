package iam

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http/httptest"
	"strconv"
	"sync"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/authz"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/config"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

// ------------------------------------------------------------ fakes & setup

type memBus struct {
	mu   sync.Mutex
	subs map[string][]func([]byte)
}

func (b *memBus) Publish(_ context.Context, ch string, p []byte) error {
	b.mu.Lock()
	subs := append([]func([]byte){}, b.subs[ch]...)
	b.mu.Unlock()
	for _, fn := range subs {
		fn(p)
	}
	return nil
}

func (b *memBus) Subscribe(ch string, fn func([]byte)) func() {
	b.mu.Lock()
	if b.subs == nil {
		b.subs = map[string][]func([]byte){}
	}
	b.subs[ch] = append(b.subs[ch], fn)
	b.mu.Unlock()
	return func() {}
}

type fakeEvents struct {
	mu     sync.Mutex
	events []core.Event
}

func (f *fakeEvents) Emit(_ context.Context, tx pgx.Tx, events ...core.Event) error {
	if tx == nil {
		return errors.New("Emit needs a transaction")
	}
	f.mu.Lock()
	f.events = append(f.events, events...)
	f.mu.Unlock()
	return nil
}

func (f *fakeEvents) types() []string {
	f.mu.Lock()
	defer f.mu.Unlock()
	var out []string
	for _, e := range f.events {
		out = append(out, e.Type)
	}
	return out
}

type env struct {
	svc    *Service
	authz  *authz.Service
	redis  *miniredis.Miniredis
	events *fakeEvents
	cfg    *config.Config
}

const adminEmail, adminPassword = "root@example.com", "root-password-1"

const testIP = "192.0.2.1"

func setup(t *testing.T) *env {
	t.Helper()
	db := testutil.DB(t)
	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel)
	bus := &memBus{}
	az := authz.New(authz.Deps{DB: db, Bus: bus})
	if err := az.Start(ctx); err != nil {
		t.Fatal(err)
	}
	mr := miniredis.RunT(t)
	cfg := &config.Config{
		JWTSecret:              []byte("0123456789abcdef0123456789abcdef"),
		AccessTokenTTL:         time.Hour,
		RefreshTokenTTL:        24 * time.Hour,
		BootstrapAdminEmail:    adminEmail,
		BootstrapAdminPassword: adminPassword,
	}
	ev := &fakeEvents{}
	svc := New(Deps{DB: db, Redis: redis.NewClient(&redis.Options{Addr: mr.Addr()}), Config: cfg, Events: ev, Authz: az, BcryptCost: bcrypt.MinCost})
	return &env{svc: svc, authz: az, redis: mr, events: ev, cfg: cfg}
}

func isCode(err error, code string) bool {
	var e *core.Error
	return errors.As(err, &e) && e.Code == code
}

func mustLogin(t *testing.T, s *Service, email, password string) *TokenPair {
	t.Helper()
	p, err := s.Login(context.Background(), email, password, testIP)
	if err != nil {
		t.Fatalf("login %s: %v", email, err)
	}
	return p
}

// ------------------------------------------------------------ tests

func TestBootstrapLoginRefreshLogout(t *testing.T) {
	t.Parallel()
	e := setup(t)
	s, ctx := e.svc, context.Background()

	// Without credentials nothing is created.
	e.cfg.BootstrapAdminPassword = ""
	if err := s.Bootstrap(ctx); err != nil {
		t.Fatal(err)
	}
	if _, total, _ := s.ListUsers(ctx, ListUsersFilter{Page: 1, PageSize: 20}); total != 0 {
		t.Fatalf("users = %d", total)
	}
	e.cfg.BootstrapAdminPassword = adminPassword
	if err := s.Bootstrap(ctx); err != nil {
		t.Fatal(err)
	}
	if err := s.Bootstrap(ctx); err != nil { // idempotent
		t.Fatal(err)
	}
	if _, total, _ := s.ListUsers(ctx, ListUsersFilter{Page: 1, PageSize: 20}); total != 1 {
		t.Fatalf("users after bootstrap = %d", total)
	}

	if _, err := s.Login(ctx, adminEmail, "wrong-password", testIP); !isCode(err, "unauthenticated") {
		t.Fatalf("bad password: %v", err)
	}
	if _, err := s.Login(ctx, "nobody@example.com", adminPassword, testIP); !isCode(err, "unauthenticated") {
		t.Fatalf("unknown user: %v", err)
	}
	p := mustLogin(t, s, "ROOT@example.com ", adminPassword)
	if p.ExpiresIn != 3600 || p.User.Email != adminEmail || p.User.Roles[0] != authz.RoleSuperAdmin || p.User.LastLoginAt == nil {
		t.Fatalf("pair: %+v user %+v", p, p.User)
	}
	uid, err := s.VerifyAccessToken(ctx, p.AccessToken)
	if err != nil || uid != p.User.ID {
		t.Fatalf("verify: %d %v", uid, err)
	}
	if _, err := s.VerifyAccessToken(ctx, p.AccessToken+"x"); err == nil {
		t.Fatal("tampered token accepted")
	}
	me, err := s.GetMe(ctx, uid)
	if err != nil || !me.Superuser || len(me.Permissions) != len(authz.CorePermissions()) {
		t.Fatalf("me: %+v %v", me, err)
	}

	// Refresh rotates: the old refresh token stops working.
	p2, err := s.Refresh(ctx, p.RefreshToken)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := s.Refresh(ctx, p.RefreshToken); !isCode(err, "unauthenticated") {
		t.Fatalf("reused refresh token: %v", err)
	}
	if err := s.Logout(ctx, uid, p2.RefreshToken); err != nil {
		t.Fatal(err)
	}
	if _, err := s.Refresh(ctx, p2.RefreshToken); !isCode(err, "unauthenticated") {
		t.Fatalf("refresh after logout: %v", err)
	}

	// Password change revokes refresh tokens and requires the old password.
	p3 := mustLogin(t, s, adminEmail, adminPassword)
	if err := s.ChangePassword(ctx, uid, "wrong", "new-password-1"); !isCode(err, "invalid_argument") {
		t.Fatalf("wrong old password: %v", err)
	}
	if err := s.ChangePassword(ctx, uid, adminPassword, "short"); !isCode(err, "invalid_argument") {
		t.Fatalf("short password: %v", err)
	}
	if err := s.ChangePassword(ctx, uid, adminPassword, "new-password-1"); err != nil {
		t.Fatal(err)
	}
	if _, err := s.Refresh(ctx, p3.RefreshToken); err == nil {
		t.Fatal("refresh token survived password change")
	}
	mustLogin(t, s, adminEmail, "new-password-1")
}

func TestStepUp(t *testing.T) {
	t.Parallel()
	e := setup(t)
	s, ctx := e.svc, context.Background()
	if err := s.Bootstrap(ctx); err != nil {
		t.Fatal(err)
	}
	root := mustLogin(t, s, adminEmail, adminPassword).User.ID
	other, err := s.CreateUser(ctx, 0, CreateUserInput{Email: "u@example.com", Password: "password-1"})
	if err != nil {
		t.Fatal(err)
	}

	if err := s.VerifyStepUp(ctx, root, ""); !isCode(err, "step_up_required") {
		t.Fatalf("empty token: %v", err)
	}
	if _, err := s.StepUp(ctx, root, "wrong"); !isCode(err, "invalid_argument") {
		t.Fatalf("wrong password: %v", err)
	}
	tok, err := s.StepUp(ctx, root, adminPassword)
	if err != nil {
		t.Fatal(err)
	}
	if got, _ := e.redis.Get("stepup:" + tok); got != strconv.FormatInt(root, 10) {
		t.Fatalf("redis value = %q", got)
	}
	if err := s.VerifyStepUp(ctx, root, tok); err != nil {
		t.Fatal(err)
	}
	if err := s.VerifyStepUp(ctx, other.ID, tok); !isCode(err, "step_up_required") {
		t.Fatalf("other user: %v", err)
	}
	e.redis.FastForward(StepUpTTL + time.Second)
	if err := s.VerifyStepUp(ctx, root, tok); !isCode(err, "step_up_required") {
		t.Fatalf("expired: %v", err)
	}
}

func TestUserLifecycle(t *testing.T) {
	t.Parallel()
	e := setup(t)
	s, ctx := e.svc, context.Background()
	if err := s.Bootstrap(ctx); err != nil {
		t.Fatal(err)
	}
	root := mustLogin(t, s, adminEmail, adminPassword).User.ID

	if _, err := s.CreateUser(ctx, root, CreateUserInput{Email: "bad", Password: "x"}); !isCode(err, "invalid_argument") {
		t.Fatalf("invalid input: %v", err)
	}
	mc := 3
	u, err := s.CreateUser(ctx, root, CreateUserInput{Email: "Alice@Example.com", DisplayName: "Alice", Password: "password-1", MaxConcurrency: &mc})
	if err != nil {
		t.Fatal(err)
	}
	if u.Email != "alice@example.com" || u.MaxConcurrency != 3 || len(u.Roles) != 1 || u.Roles[0] != authz.RoleUser || u.Status != StatusActive {
		t.Fatalf("created: %+v", u)
	}
	if ok, _ := e.authz.Can(ctx, u.ID, "gateway:use"); !ok {
		t.Fatal("default role not effective")
	}
	if _, err := s.CreateUser(ctx, root, CreateUserInput{Email: "alice@example.com", Password: "password-1"}); !isCode(err, "conflict") {
		t.Fatalf("duplicate: %v", err)
	}
	admin, err := s.CreateUser(ctx, root, CreateUserInput{Email: "admin@example.com", Password: "password-1", RoleKeys: []string{authz.RoleAdmin}})
	if err != nil {
		t.Fatal(err)
	}

	list, total, err := s.ListUsers(ctx, ListUsersFilter{Query: "ALICE", Page: 1, PageSize: 20})
	if err != nil || total != 1 || list[0].ID != u.ID {
		t.Fatalf("search: %d %v", total, err)
	}
	if _, total, _ = s.ListUsers(ctx, ListUsersFilter{Role: authz.RoleAdmin, Page: 1, PageSize: 20}); total != 1 {
		t.Fatalf("role filter total = %d", total)
	}
	if list, total, _ = s.ListUsers(ctx, ListUsersFilter{Page: 2, PageSize: 2}); total != 3 || len(list) != 1 {
		t.Fatalf("paging: total=%d len=%d", total, len(list))
	}

	// Disable: login and access tokens stop working.
	pair := mustLogin(t, s, "alice@example.com", "password-1")
	disabled := StatusDisabled
	if u, err = s.UpdateUser(ctx, root, u.ID, UpdateUserInput{Status: &disabled}); err != nil || u.Status != StatusDisabled {
		t.Fatalf("disable: %+v %v", u, err)
	}
	if _, err := s.Login(ctx, "alice@example.com", "password-1", testIP); !isCode(err, "permission_denied") {
		t.Fatalf("login disabled: %v", err)
	}
	if _, err := s.VerifyAccessToken(ctx, pair.AccessToken); err == nil {
		t.Fatal("disabled user's token accepted")
	}
	if _, err := s.Refresh(ctx, pair.RefreshToken); err == nil {
		t.Fatal("disabled user's refresh accepted")
	}
	if ok, _ := e.authz.Can(ctx, u.ID, "gateway:use"); ok {
		t.Fatal("disabled user keeps permissions")
	}
	active := StatusActive
	name := "Alice B"
	if u, err = s.UpdateUser(ctx, root, u.ID, UpdateUserInput{Status: &active, DisplayName: &name}); err != nil || u.DisplayName != "Alice B" {
		t.Fatalf("enable: %+v %v", u, err)
	}
	mustLogin(t, s, "alice@example.com", "password-1")

	// Super admin protections.
	if _, err := s.UpdateUser(ctx, root, root, UpdateUserInput{Status: &disabled}); !isCode(err, "conflict") {
		t.Fatalf("self disable: %v", err)
	}
	if err := s.DeleteUser(ctx, root, root); !isCode(err, "conflict") {
		t.Fatalf("self delete: %v", err)
	}
	if err := s.DeleteUser(ctx, admin.ID, root); !isCode(err, "permission_denied") {
		t.Fatalf("admin deletes root: %v", err)
	}
	pw := "hijacked-password"
	if _, err := s.UpdateUser(ctx, admin.ID, root, UpdateUserInput{Password: &pw}); !isCode(err, "permission_denied") {
		t.Fatalf("admin resets root password: %v", err)
	}
	if _, err := s.SetUserRoles(ctx, admin.ID, admin.ID, []string{authz.RoleSuperAdmin}); !isCode(err, "permission_denied") {
		t.Fatalf("admin self-promotion: %v", err)
	}
	if _, err := s.SetUserRoles(ctx, root, root, []string{authz.RoleAdmin}); !isCode(err, "conflict") {
		t.Fatalf("revoke own super admin: %v", err)
	}
	if err := s.DeleteUser(ctx, 0, root); !isCode(err, "conflict") {
		t.Fatalf("delete last super admin: %v", err)
	}
	if _, err := s.SetUserRoles(ctx, root, u.ID, []string{authz.RoleUser, authz.RoleAdmin}); err != nil {
		t.Fatal(err)
	}

	// Soft delete frees the email.
	if err := s.DeleteUser(ctx, root, u.ID); err != nil {
		t.Fatal(err)
	}
	if _, err := s.GetUser(ctx, u.ID); !isCode(err, "not_found") {
		t.Fatalf("get deleted: %v", err)
	}
	if _, err := s.CreateUser(ctx, root, CreateUserInput{Email: "alice@example.com", Password: "password-1"}); err != nil {
		t.Fatalf("recreate: %v", err)
	}

	got := e.events.types()
	want := map[string]int{"user.created": 4, "user.updated": 4}
	counts := map[string]int{}
	for _, g := range got {
		counts[g]++
	}
	for k, n := range want {
		if counts[k] != n {
			t.Fatalf("events %v: %s = %d, want %d", got, k, counts[k], n)
		}
	}
}

// ------------------------------------------------------------ HTTP

type client struct {
	t      *testing.T
	engine *gin.Engine
}

func (c client) do(method, path, token, stepUp string, body any) (int, map[string]any) {
	c.t.Helper()
	var buf bytes.Buffer
	if body != nil {
		_ = json.NewEncoder(&buf).Encode(body)
	}
	req := httptest.NewRequest(method, "/api/v1"+path, &buf)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept-Language", "zh-CN")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	if stepUp != "" {
		req.Header.Set("X-Step-Up-Token", stepUp)
	}
	w := httptest.NewRecorder()
	c.engine.ServeHTTP(w, req)
	var out map[string]any
	_ = json.Unmarshal(w.Body.Bytes(), &out)
	return w.Code, out
}

func errCode(out map[string]any) string {
	e, _ := out["error"].(map[string]any)
	s, _ := e["code"].(string)
	return s
}

func TestHTTP(t *testing.T) {
	t.Parallel()
	e := setup(t)
	ctx := context.Background()
	if err := e.svc.Bootstrap(ctx); err != nil {
		t.Fatal(err)
	}
	gin.SetMode(gin.TestMode)
	engine := gin.New()
	r := httpapi.NewRouter(engine, e.svc, e.authz, e.svc)
	e.svc.RegisterRoutes(r)
	e.authz.RegisterRoutes(r)
	c := client{t, engine}

	code, out := c.do("POST", "/auth/login", "", "", map[string]any{"email": adminEmail, "password": adminPassword})
	if code != 200 {
		t.Fatalf("login: %d %v", code, out)
	}
	data := out["data"].(map[string]any)
	tok := data["access_token"].(string)

	if code, out = c.do("GET", "/me", "", "", nil); code != 401 {
		t.Fatalf("me without token: %d", code)
	}
	if code, out = c.do("GET", "/me", tok, "", nil); code != 200 || out["data"].(map[string]any)["superuser"] != true {
		t.Fatalf("me: %d %v", code, out)
	}
	if code, out = c.do("GET", "/me/menus", tok, "", nil); code != 200 || len(out["data"].([]any)) != 5 {
		t.Fatalf("menus: %d %v", code, out)
	}
	if code, out = c.do("GET", "/permissions", tok, "", nil); code != 200 {
		t.Fatalf("permissions: %d %v", code, out)
	}

	// Choosing roles at creation needs step-up (role:manage is sensitive).
	newUser := map[string]any{"email": "ops@example.com", "password": "password-1", "role_keys": []string{"admin"}}
	if code, out = c.do("POST", "/users", tok, "", newUser); code != 403 || errCode(out) != "step_up_required" {
		t.Fatalf("create without step-up: %d %v", code, out)
	}
	code, out = c.do("POST", "/auth/step-up", tok, "", map[string]any{"password": adminPassword})
	if code != 200 {
		t.Fatalf("step-up: %d %v", code, out)
	}
	stepUp := out["data"].(map[string]any)["step_up_token"].(string)
	if code, out = c.do("POST", "/users", tok, stepUp, newUser); code != 201 {
		t.Fatalf("create: %d %v", code, out)
	}
	opsID := int64(out["data"].(map[string]any)["id"].(float64))
	if _, ok := out["data"].(map[string]any)["balance"]; !ok {
		t.Fatalf("superuser should see balance: %v", out)
	}

	// Plain user: no admin access, own menu only.
	if code, out = c.do("POST", "/users", tok, "", map[string]any{"email": "joe@example.com", "password": "password-1"}); code != 201 {
		t.Fatalf("create default: %d %v", code, out)
	}
	joeID := int64(out["data"].(map[string]any)["id"].(float64))
	_, out = c.do("POST", "/auth/login", "", "", map[string]any{"email": "joe@example.com", "password": "password-1"})
	joe := out["data"].(map[string]any)["access_token"].(string)
	joeRefresh := out["data"].(map[string]any)["refresh_token"].(string)
	if code, out = c.do("GET", "/users", joe, "", nil); code != 403 || errCode(out) != "permission_denied" {
		t.Fatalf("joe lists users: %d %v", code, out)
	}
	if code, out = c.do("GET", "/me/menus", joe, "", nil); code != 200 || len(out["data"].([]any)) != 2 {
		t.Fatalf("joe menus: %d %v", code, out)
	}

	// Admin (not superuser) lists users; balance hidden? admin has balance:all:read.
	_, out = c.do("POST", "/auth/login", "", "", map[string]any{"email": "ops@example.com", "password": "password-1"})
	ops := out["data"].(map[string]any)["access_token"].(string)
	if code, out = c.do("GET", "/users?q=example&page_size=2", ops, "", nil); code != 200 || out["page"].(map[string]any)["total"].(float64) != 3 {
		t.Fatalf("ops lists users: %d %v", code, out)
	}
	// Delete is sensitive.
	if code, out = c.do("DELETE", "/users/"+strconv.FormatInt(joeID, 10), ops, "", nil); code != 403 || errCode(out) != "step_up_required" {
		t.Fatalf("delete without step-up: %d %v", code, out)
	}
	_, out = c.do("POST", "/auth/step-up", ops, "", map[string]any{"password": "password-1"})
	opsStep := out["data"].(map[string]any)["step_up_token"].(string)
	if code, out = c.do("DELETE", "/users/"+strconv.FormatInt(joeID, 10), ops, opsStep, nil); code != 204 {
		t.Fatalf("delete: %d %v", code, out)
	}
	if code, _ = c.do("GET", "/me", joe, "", nil); code != 401 {
		t.Fatalf("deleted user's token: %d", code)
	}
	if code, _ = c.do("POST", "/auth/refresh", "", "", map[string]any{"refresh_token": joeRefresh}); code != 401 {
		t.Fatalf("deleted user's refresh: %d", code)
	}

	// Roles endpoints.
	if code, out = c.do("PUT", "/users/"+strconv.FormatInt(opsID, 10)+"/roles", ops, opsStep, map[string]any{"role_keys": []string{"super_admin"}}); code != 403 || errCode(out) != "permission_denied" {
		t.Fatalf("ops self-promotion: %d %v", code, out)
	}
	if code, out = c.do("POST", "/roles", ops, opsStep, map[string]any{"key": "viewer", "name": map[string]string{"en": "Viewer", "zh": "只读"}, "permission_keys": []string{"user:read"}}); code != 201 {
		t.Fatalf("create role: %d %v", code, out)
	}
	if code, out = c.do("GET", "/roles", ops, "", nil); code != 200 || len(out["data"].([]any)) != 4 {
		t.Fatalf("list roles: %d %v", code, out)
	}

	// Logout revokes the refresh token.
	_, out = c.do("POST", "/auth/login", "", "", map[string]any{"email": adminEmail, "password": adminPassword})
	rt := out["data"].(map[string]any)["refresh_token"].(string)
	if code, _ = c.do("POST", "/auth/logout", tok, "", map[string]any{"refresh_token": rt}); code != 204 {
		t.Fatalf("logout: %d", code)
	}
	if code, _ = c.do("POST", "/auth/refresh", "", "", map[string]any{"refresh_token": rt}); code != 401 {
		t.Fatalf("refresh after logout: %d", code)
	}
	if code, out = c.do("PUT", "/me/password", tok, "", map[string]any{"old_password": adminPassword, "new_password": "another-pass-1"}); code != 204 {
		t.Fatalf("change password: %d %v", code, out)
	}
}
