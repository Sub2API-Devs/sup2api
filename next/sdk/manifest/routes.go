package manifest

import "strings"

// Core route segments. The core owns the first path segment of these routes
// and nothing else: /api (the console and admin API), /plugin-ui (native
// plugin UI modules) and /healthz (the liveness probe registered in
// server/internal/app). Everything else is free for gateway endpoints
// (ARCHITECTURE 6.4) and plugin routes.
const (
	RouteAPI      = "api"
	RoutePluginUI = "plugin-ui"
	RouteHealthz  = "healthz"
)

// CoreRouteSegments lists the first path segments reserved by the core. It is
// the single source of truth: manifest/check rejects gateway endpoints whose
// first segment is one of them, and the core's own router and console handler
// derive their paths from it.
var CoreRouteSegments = []string{RouteAPI, RoutePluginUI, RouteHealthz}

// ReservedFirstSegment reports whether the first segment of the request path
// p is reserved by the core. The comparison is on the whole segment, like a
// router match: "/apifoo" is not reserved, "/api/v1/x" is.
func ReservedFirstSegment(p string) bool {
	first, _, _ := strings.Cut(strings.TrimPrefix(p, "/"), "/")
	first = strings.ToLower(first)
	for _, s := range CoreRouteSegments {
		if first == s {
			return true
		}
	}
	return false
}
