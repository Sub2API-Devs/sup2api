package manifest

import "strings"

// Core routes. The core owns these path prefixes and nothing else: /api/v1
// (the console and admin API, including plugin routes under /api/v1/p), the
// bare /api, /plugin-ui (native plugin UI modules) and /healthz (the liveness
// probe registered in server/internal/app). Everything else is free for
// gateway endpoints (ARCHITECTURE 6.4) - /api/v3/... included, the path of
// Volcengine Ark's official API.
const (
	RouteAPI        = "api"
	RouteAPIVersion = "v1"
	RoutePluginUI   = "plugin-ui"
	RouteHealthz    = "healthz"
)

// CoreRoutePrefixes lists the path prefixes reserved by the core, as
// segment lists. It is the single source of truth: manifest/check rejects
// gateway endpoints that could match one of them (ReservedPath), and the
// core's own router and console handler derive their paths from it. The bare
// /api is reserved as well (see ReservedPath).
var CoreRoutePrefixes = [][]string{{RouteAPI, RouteAPIVersion}, {RoutePluginUI}, {RouteHealthz}}

// ReservedPath reports whether the request or endpoint path p falls under a
// core route. The comparison is on whole segments, case-insensitively, like a
// router match: "/apifoo" and "/api/v3/x" are free, "/api", "/api/v1" and
// "/API/V1/x" are reserved. A parameter (":x") or catch-all ("*x") segment
// matches any literal, so "/api/:version/x" is reserved too: it would serve
// /api/v1/x.
func ReservedPath(p string) bool {
	_, ok := CoreRouteOf(p)
	return ok
}

// CoreRouteOf returns the core route ("/api", "/api/v1", "/plugin-ui",
// "/healthz") the path p falls under, by the rules of ReservedPath.
func CoreRouteOf(p string) (string, bool) {
	segs := strings.Split(strings.TrimPrefix(p, "/"), "/")
	for _, prefix := range CoreRoutePrefixes {
		if prefixMatches(prefix, segs) {
			return "/" + strings.Join(prefix, "/"), true
		}
	}
	if strings.EqualFold(segs[0], RouteAPI) && (len(segs) == 1 || segs[1] == "") {
		return "/" + RouteAPI, true
	}
	return "", false
}

// prefixMatches reports whether path segments segs start with prefix,
// treating a parameter or catch-all segment of segs as matching anything (a
// catch-all also matches every segment after it).
func prefixMatches(prefix, segs []string) bool {
	for i, want := range prefix {
		if i >= len(segs) {
			return false
		}
		s := segs[i]
		switch {
		case strings.HasPrefix(s, "*"):
			return true
		case strings.HasPrefix(s, ":"):
		case !strings.EqualFold(s, want):
			return false
		}
	}
	return true
}
