package iam

import (
	"context"
	"encoding/json"
	"net/http/httptest"
	"strconv"
	"testing"

	"github.com/gin-gonic/gin"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/authz"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
)

// GET /me tells the authz version its permissions were read at and every
// authenticated response carries the node's in X-Authz-Version: a role
// change raises both, a session that ends raises neither (B1).
func TestAuthzVersionInMeAndHeader(t *testing.T) {
	t.Parallel()
	e := setup(t)
	s, ctx := e.svc, context.Background()
	if err := s.Bootstrap(ctx); err != nil {
		t.Fatal(err)
	}
	gin.SetMode(gin.TestMode)
	engine := gin.New()
	s.RegisterRoutes(httpapi.NewRouter(engine, s, e.authz))
	root := mustLogin(t, s, adminEmail, adminPassword)
	versions := func() (header, me int64) {
		t.Helper()
		req := httptest.NewRequest("GET", "/api/v1/me", nil)
		req.Header.Set("Authorization", "Bearer "+root.AccessToken)
		w := httptest.NewRecorder()
		engine.ServeHTTP(w, req)
		var out struct {
			Data Me `json:"data"`
		}
		if err := json.Unmarshal(w.Body.Bytes(), &out); err != nil || w.Code != 200 {
			t.Fatalf("GET /me: %d %s", w.Code, w.Body)
		}
		header, err := strconv.ParseInt(w.Header().Get(httpapi.HeaderAuthzVersion), 10, 64)
		if err != nil {
			t.Fatalf("%s: %q", httpapi.HeaderAuthzVersion, w.Header().Get(httpapi.HeaderAuthzVersion))
		}
		return header, out.Data.AuthzVersion
	}

	header, me := versions()
	if me == 0 || header != me {
		t.Fatalf("versions at first: header %d, me %d", header, me)
	}

	u, err := s.CreateUser(ctx, root.User.ID, CreateUserInput{Email: "v@example.com", Password: "password-1"})
	if err != nil {
		t.Fatal(err)
	}
	header, me = versions()
	if _, err := s.SetUserRoles(ctx, root.User.ID, u.ID, []string{authz.RoleUser, authz.RoleAdmin}); err != nil {
		t.Fatal(err)
	}
	if h, m := versions(); h <= header || m <= me || h != m {
		t.Fatalf("after SetUserRoles: header %d -> %d, me %d -> %d", header, h, me, m)
	}

	// Someone logging out, or all of someone's sessions ending, is no change
	// of permissions: nobody's console fetches them again for it.
	header, me = versions()
	p := mustLogin(t, s, "v@example.com", "password-1")
	if err := s.Logout(ctx, u.ID, p.RefreshToken); err != nil {
		t.Fatal(err)
	}
	mustLogin(t, s, "v@example.com", "password-1")
	if err := s.ChangePassword(ctx, u.ID, "", "password-1", "password-2"); err != nil {
		t.Fatal(err)
	}
	if h, m := versions(); h != header || m != me {
		t.Fatalf("after a logout and a password change: header %d -> %d, me %d -> %d", header, h, me, m)
	}
}
