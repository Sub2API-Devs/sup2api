package updater

import (
	"context"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
)

type tokenTestAuth struct{}

func (tokenTestAuth) VerifyAccessToken(context.Context, string) (int64, error) { return 1, nil }
func (tokenTestAuth) Can(context.Context, int64, string) (bool, error)         { return true, nil }
func (tokenTestAuth) PermissionSet(context.Context, int64) (core.PermissionSet, error) {
	return core.PermissionSet{Superuser: true}, nil
}
func (tokenTestAuth) CanGrant(context.Context, int64, []string) error { return nil }
func (tokenTestAuth) CanActOn(context.Context, int64, []string) error { return nil }

// fakeShell is a management endpoint that accepts only the expected bearer
// token, like the shell does.
func fakeShell(t *testing.T, want string) *httptest.Server {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer "+want {
			w.WriteHeader(http.StatusUnauthorized)
			_, _ = w.Write([]byte(`{"error":{"code":"unauthenticated"}}`))
			return
		}
		_, _ = w.Write([]byte(`{"data":[]}`))
	}))
	t.Cleanup(srv.Close)
	return srv
}

func tcpClient(addr string) *http.Client {
	return &http.Client{Transport: &http.Transport{DialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
		return (&net.Dialer{}).DialContext(ctx, "tcp", addr)
	}}}
}

// The bridge authenticates to the management socket with the updater token,
// never with the console user's own Authorization header.
func TestBridgeSendsUpdaterToken(t *testing.T) {
	token := strings.Repeat("ab", 32)
	srv := fakeShell(t, token)
	addr := strings.TrimPrefix(srv.URL, "http://")
	gin.SetMode(gin.TestMode)
	for _, tc := range []struct {
		token  string
		status int
	}{
		{token, http.StatusOK},
		{"", http.StatusUnauthorized},
		{strings.Repeat("cd", 32), http.StatusUnauthorized},
	} {
		engine := gin.New()
		registerRoutes(httpapi.NewRouter(engine, tokenTestAuth{}, tokenTestAuth{}), true, tcpClient(addr), tc.token, nil)
		req := httptest.NewRequest("GET", "/api/v1/system/releases", nil)
		req.Header.Set("Authorization", "Bearer user-session")
		res := httptest.NewRecorder()
		engine.ServeHTTP(res, req)
		if res.Code != tc.status {
			t.Fatalf("token %q: %d %s", tc.token, res.Code, res.Body.String())
		}
	}
}
