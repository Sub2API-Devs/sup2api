package updater

import (
	"context"
	"errors"
	"net/http/httptest"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/gin-gonic/gin"
)

type updateRouteAuth struct{ allowed bool }

func (a updateRouteAuth) PermissionSet(context.Context, int64) (core.PermissionSet, error) {
	return core.PermissionSet{Superuser: a.allowed}, nil
}

func (a updateRouteAuth) VerifyAccessToken(context.Context, string) (int64, error) { return 1, nil }
func (a updateRouteAuth) Can(context.Context, int64, string) (bool, error)         { return a.allowed, nil }
func (a updateRouteAuth) IsSensitive(permission string) bool {
	return permission == "system:update:execute"
}
func (a updateRouteAuth) VerifyStepUp(_ context.Context, _ int64, token string) error {
	if token != "confirmed" {
		return errors.New("password confirmation required")
	}
	return nil
}

func TestUpdateSourceAndImportRequireAuthorizationAndConfirmation(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, tc := range []struct {
		method, path               string
		allowed, logged, confirmed bool
		status                     int
	}{
		{"PUT", "/system/update-source", true, true, false, 403},
		{"PUT", "/system/update-source", true, true, true, 503},
		{"PUT", "/system/update-source", false, true, true, 403},
		{"POST", "/system/releases/import", true, true, false, 403},
		{"POST", "/system/releases/import", true, true, true, 503},
		{"POST", "/system/releases/import", false, true, true, 403},
		{"GET", "/system/update-check", true, false, false, 401},
		{"GET", "/system/update-check", false, true, false, 403},
		{"GET", "/system/update-check", true, true, false, 503},
	} {
		engine := gin.New()
		auth := updateRouteAuth{tc.allowed}
		RegisterRoutes(httpapi.NewRouter(engine, auth, auth, auth), "", nil)
		req := httptest.NewRequest(tc.method, "/api/v1"+tc.path, nil)
		if tc.logged {
			req.Header.Set("Authorization", "Bearer test")
		}
		if tc.confirmed {
			req.Header.Set("X-Step-Up-Token", "confirmed")
		}
		response := httptest.NewRecorder()
		engine.ServeHTTP(response, req)
		if response.Code != tc.status {
			t.Fatalf("%s %s allowed=%v confirmed=%v: %d %s", tc.method, tc.path, tc.allowed, tc.confirmed, response.Code, response.Body.String())
		}
	}
}
