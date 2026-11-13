package updater

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

type updateRouteAuth struct {
	testutil.StepUpPassed
	allowed bool
}

func (a updateRouteAuth) PermissionSet(context.Context, int64) (core.PermissionSet, error) {
	return core.PermissionSet{Superuser: a.allowed}, nil
}

func (a updateRouteAuth) VerifyAccessToken(context.Context, string) (int64, error) { return 1, nil }
func (a updateRouteAuth) Can(context.Context, int64, string) (bool, error)         { return a.allowed, nil }
func (a updateRouteAuth) CanGrant(context.Context, int64, []string) error          { return nil }
func (a updateRouteAuth) CanActOn(context.Context, int64, []string) error          { return nil }

// Update source and release import need the permission only; password
// confirmation was removed (CONTRACTS §3.3).
func TestUpdateSourceAndImportRequireAuthorization(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, tc := range []struct {
		method, path    string
		allowed, logged bool
		status          int
	}{
		{"PUT", "/system/update-source", true, true, 503},
		{"PUT", "/system/update-source", false, true, 403},
		{"PUT", "/system/update-source", true, false, 401},
		{"POST", "/system/releases/import", true, true, 503},
		{"POST", "/system/releases/import", false, true, 403},
		{"GET", "/system/update-check", true, false, 401},
		{"GET", "/system/update-check", false, true, 403},
		{"GET", "/system/update-check", true, true, 503},
	} {
		engine := gin.New()
		auth := updateRouteAuth{allowed: tc.allowed}
		RegisterRoutes(httpapi.NewRouter(engine, auth, auth), "", "", nil)
		req := httptest.NewRequest(tc.method, "/api/v1"+tc.path, nil)
		if tc.logged {
			req.Header.Set("Authorization", "Bearer test")
		}
		response := httptest.NewRecorder()
		engine.ServeHTTP(response, req)
		if response.Code != tc.status {
			t.Fatalf("%s %s allowed=%v logged=%v: %d %s", tc.method, tc.path, tc.allowed, tc.logged, response.Code, response.Body.String())
		}
	}
}

// refusedRouteAuth refuses every step-up proof (shallower than the embedded
// pass), to show which routes ask for one.
type refusedRouteAuth struct {
	updateRouteAuth
	testutil.StepUpRefused
}

// Running other code on the nodes takes a step-up proof (CONTRACTS §80.2);
// reading and the update source do not.
func TestCoreUpdateRoutesStepUp(t *testing.T) {
	gin.SetMode(gin.TestMode)
	engine := gin.New()
	auth := refusedRouteAuth{updateRouteAuth: updateRouteAuth{allowed: true}}
	RegisterRoutes(httpapi.NewRouter(engine, auth, auth), "", "", nil)
	for _, tc := range []struct {
		method, path string
		stepUp       bool
	}{
		{"POST", "/system/upgrades", true},
		{"POST", "/system/upgrades/1/pause", true},
		{"POST", "/system/upgrades/1/rollback", true},
		{"POST", "/system/nodes/1/disable", true},
		{"POST", "/system/releases/import", true},
		{"POST", "/system/upgrades/preflight", false},
		{"PUT", "/system/update-source", false},
		{"GET", "/system/upgrades", false},
	} {
		req := httptest.NewRequest(tc.method, "/api/v1"+tc.path, nil)
		req.Header.Set("Authorization", "Bearer test")
		w := httptest.NewRecorder()
		engine.ServeHTTP(w, req)
		got := w.Code == 403 && strings.Contains(w.Body.String(), "verification_required")
		if got != tc.stepUp {
			t.Errorf("%s %s: %d %s, step-up wanted %v", tc.method, tc.path, w.Code, w.Body, tc.stepUp)
		}
	}
}
