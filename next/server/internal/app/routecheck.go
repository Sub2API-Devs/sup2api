package app

import (
	"fmt"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/authz"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/iam"
)

// permissionlessRoutes are the console routes any caller may reach without a
// permission (httpapi.ModePublic, httpapi.ModeAuthed), with how each lets
// callers in. A new one must be added here: opening a route to every caller,
// dropping its authentication or its SessionOnly view is a reviewed decision.
var permissionlessRoutes = func() map[string]httpapi.Access {
	out := map[string]httpapi.Access{}
	add := func(a httpapi.Access, ids ...string) {
		for _, id := range ids {
			out[id] = a
		}
	}
	// Signing in, and the public price list of an API key.
	add(httpapi.AccessPublic, "POST /auth/login", "POST /auth/refresh", "POST /auth/login/2fa",
		"POST /auth/passkey/begin", "POST /auth/passkey/finish", "GET /key/prices")
	// Who the caller is and what they may see, each under the caller's own
	// limits (the handler narrows); step-up verification of the caller
	// (CONTRACTS §80.2).
	add(httpapi.AccessAuthed, "GET /me", "GET /me/menus", "GET /me/assignable-roles", "GET /me/platforms", "GET /me/groups",
		"GET /lookup/:kind", "GET /system/version",
		"GET /me/verify/methods", "POST /me/verify/begin", "POST /me/verify")
	// Login sessions and access keys: never through an access key (§80).
	add(httpapi.AccessSession, "POST /auth/logout",
		"GET /me/sessions", "POST /me/sessions/revoke-others", "DELETE /me/sessions/:id",
		"GET /me/access-keys", "GET /me/access-keys/permissions", "POST /me/access-keys",
		"PATCH /me/access-keys/:id", "DELETE /me/access-keys/:id")
	return out
}()

// checkRoutes holds the registered console routes to the start-up rules
// (httpapi.CheckRoutes) and binds the core menus to their pages' main
// routes; a failure stops the start.
func checkRoutes(r *httpapi.Router, az *authz.Service) error {
	specs := r.Routes()
	err := httpapi.CheckRoutes(specs, httpapi.RouteRules{
		KnownKey: authz.KnownKey, KnownStepUp: iam.KnownStepUpScope, Permissionless: permissionlessRoutes,
	})
	if err == nil {
		err = az.BindMenuRoutes(httpapi.RouteKeys(specs))
	}
	if err != nil {
		return fmt.Errorf("route check: %w", err)
	}
	return nil
}
