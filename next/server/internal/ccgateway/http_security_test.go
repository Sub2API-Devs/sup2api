package ccgateway

import (
	"context"
	"errors"
	"net/http/httptest"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/gin-gonic/gin"
)

type ccgRouteAuth struct{ allowed bool }

func (a ccgRouteAuth) PermissionSet(context.Context, int64) (core.PermissionSet, error) {
	return core.PermissionSet{Superuser: a.allowed}, nil
}

func (a ccgRouteAuth) VerifyAccessToken(context.Context, string) (int64, error) { return 1, nil }
func (a ccgRouteAuth) Can(context.Context, int64, string) (bool, error)         { return a.allowed, nil }
func (a ccgRouteAuth) IsSensitive(permission string) bool {
	return permission == "system:update:execute"
}
func (a ccgRouteAuth) VerifyStepUp(_ context.Context, _ int64, token string) error {
	if token != "confirmed" {
		return errors.New("password confirmation required")
	}
	return nil
}

func TestManagementRequiresAuthorizationWithoutConfirmation(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, method := range []string{"PUT", "POST"} {
		paths := []string{"remote-config", "proxy"}
		if method == "POST" {
			paths = []string{"remote-fingerprint", "remote-test", "remote-action", "auth/start", "auth/complete", "auth/cancel", "auth/logout"}
		}
		for _, path := range paths {
			for _, allowed := range []bool{false, true} {
				engine := gin.New()
				auth := ccgRouteAuth{allowed}
				(&Service{}).RegisterRoutes(httpapi.NewRouter(engine, auth, auth, auth))
				req := httptest.NewRequest(method, "/api/v1/system/ccgateway/"+path, nil)
				req.Header.Set("Authorization", "Bearer test")
				if !allowed {
					req.Header.Set("X-Step-Up-Token", "confirmed")
				}
				w := httptest.NewRecorder()
				engine.ServeHTTP(w, req)
				want := 403
				if allowed {
					want = 503 // Authorized request reaches the unconfigured handler.
					if path == "remote-config" || path == "remote-fingerprint" || path == "remote-action" || path == "remote-test" {
						want = 400
					}
				}
				if w.Code != want {
					t.Fatalf("%s %s allowed=%v: %d", method, path, allowed, w.Code)
				}
				req = httptest.NewRequest(method, "/api/v1/system/ccgateway/"+path, nil)
				w = httptest.NewRecorder()
				engine.ServeHTTP(w, req)
				if w.Code != 401 {
					t.Fatalf("anonymous %s %s: %d", method, path, w.Code)
				}
			}
		}
	}
	engine := gin.New()
	auth := ccgRouteAuth{true}
	(&Service{}).RegisterRoutes(httpapi.NewRouter(engine, auth, auth, auth))
	req := httptest.NewRequest("GET", "/api/v1/system/ccgateway/status", nil)
	w := httptest.NewRecorder()
	engine.ServeHTTP(w, req)
	if w.Code != 401 {
		t.Fatal("anonymous management access accepted")
	}
	req = httptest.NewRequest("GET", "/api/v1/system/ccgateway/status", nil)
	req.Header.Set("Authorization", "Bearer test")
	w = httptest.NewRecorder()
	engine.ServeHTTP(w, req)
	if w.Code != 503 {
		t.Fatalf("unconfigured status %d", w.Code)
	}
}
