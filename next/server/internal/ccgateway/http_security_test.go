package ccgateway

import (
	"context"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
	"github.com/gin-gonic/gin"
)

type ccgRouteAuth struct {
	testutil.StepUpPassed
	allowed bool
}

func (a ccgRouteAuth) PermissionSet(context.Context, int64) (core.PermissionSet, error) {
	return core.PermissionSet{Superuser: a.allowed}, nil
}

func (a ccgRouteAuth) VerifyAccessToken(context.Context, string) (int64, error) { return 1, nil }
func (a ccgRouteAuth) Can(context.Context, int64, string) (bool, error)         { return a.allowed, nil }
func (a ccgRouteAuth) CanGrant(context.Context, int64, []string) error          { return nil }

func TestManagementRequiresAuthorizationWithoutConfirmation(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, method := range []string{"PUT", "POST"} {
		paths := []string{"remote-config"}
		if method == "POST" {
			paths = []string{"remote-fingerprint", "remote-test", "controller/install"}
		}
		for _, path := range paths {
			for _, allowed := range []bool{false, true} {
				engine := gin.New()
				auth := ccgRouteAuth{allowed: allowed}
				(&Service{}).RegisterRoutes(httpapi.NewRouter(engine, auth, auth))
				req := httptest.NewRequest(method, "/api/v1/system/ccgateway/"+path, nil)
				req.Header.Set("Authorization", "Bearer test")
				w := httptest.NewRecorder()
				engine.ServeHTTP(w, req)
				want := 403
				if allowed {
					// Authorized requests reach the unconfigured handler.
					want = 400
					if path == "controller/install" {
						want = 503
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
	// The shared-container endpoints are gone (§53.9).
	engine := gin.New()
	auth := ccgRouteAuth{allowed: true}
	(&Service{}).RegisterRoutes(httpapi.NewRouter(engine, auth, auth))
	for _, route := range []string{"GET status", "GET proxy", "PUT proxy", "POST auth/start", "POST auth/complete", "POST auth/cancel", "POST auth/logout", "POST remote-action"} {
		method, path, _ := strings.Cut(route, " ")
		req := httptest.NewRequest(method, "/api/v1/system/ccgateway/"+path, nil)
		req.Header.Set("Authorization", "Bearer test")
		w := httptest.NewRecorder()
		engine.ServeHTTP(w, req)
		if w.Code != 404 {
			t.Fatalf("%s still served: %d", route, w.Code)
		}
	}
}

// stepUpRouteAuth passes every permission and refuses every step-up proof.
type stepUpRouteAuth struct {
	ccgRouteAuth
	testutil.StepUpRefused
}

// Installing or reaching code on a host takes a step-up proof (CONTRACTS
// §80.2 host.install); reads, upload chunks and cleanup do not.
func TestHostInstallRoutesStepUp(t *testing.T) {
	gin.SetMode(gin.TestMode)
	engine := gin.New()
	auth := stepUpRouteAuth{ccgRouteAuth: ccgRouteAuth{allowed: true}}
	(&Service{}).RegisterRoutes(httpapi.NewRouter(engine, auth, auth))
	for _, tc := range []struct {
		route  string
		stepUp bool
	}{
		{"PUT remote-config", true},
		{"POST remote-fingerprint", true},
		{"POST remote-test", true},
		{"POST controller/install", true},
		{"POST runtime/install", true},
		{"POST runtime/uploads/u1/load", true},
		{"POST runtime/bundled", true},
		{"POST runtime/workers", true},
		{"POST runtimes/k1/worker", true},
		{"POST runtime/uploads", false},
		{"PUT runtime/uploads/u1", false},
		{"GET runtime/uploads/u1", false},
		{"POST runtime/cleanup", false},
		{"GET remote-config", false},
		{"GET runtime", false},
	} {
		method, path, _ := strings.Cut(tc.route, " ")
		req := httptest.NewRequest(method, "/api/v1/system/ccgateway/"+path, nil)
		req.Header.Set("Authorization", "Bearer test")
		w := httptest.NewRecorder()
		func() {
			defer func() { _ = recover() }() // unconfigured handlers may panic; only the step-up answer matters
			engine.ServeHTTP(w, req)
		}()
		got := w.Code == 403 && strings.Contains(w.Body.String(), "verification_required")
		if got != tc.stepUp {
			t.Errorf("%s: %d %s, step-up wanted %v", tc.route, w.Code, w.Body, tc.stepUp)
		}
	}
}
