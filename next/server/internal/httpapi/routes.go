package httpapi

import (
	"slices"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/perm"
)

// Mode is how a route authorizes its caller.
type Mode string

const (
	// ModePublic: no authentication (Public).
	ModePublic Mode = "public"
	// ModeAuthed: any signed-in caller, no permission (Handle, AuthedRead).
	ModeAuthed Mode = "authed"
	// ModePerm: one permission (Perm, Self).
	ModePerm Mode = "perm"
	// ModeAny: any one of several unscoped permissions (PermAny).
	ModeAny Mode = "any"
	// ModeScoped: any one of several actions, with any scope (PermScoped).
	ModeScoped Mode = "scoped"
)

// RouteSpec describes a route registered through Router, for the start-up
// check (CheckRoutes) and the menus that point at a page's main route.
type RouteSpec struct {
	Method, Path string // Path relative to APIPrefix
	Mode         Mode
	// Keys are the route's permissions (ModePerm, ModeAny) or actions
	// (ModeScoped).
	Keys []perm.Key
	// Extra are core permissions the handler checks by itself on top of
	// Keys (Uses); registered only, they change no authorization.
	Extra []perm.Key
	// PluginKeys: the handler also checks permissions a plugin declares
	// (UsesPluginKeys), which no start-up check can list.
	PluginKeys bool
	// StepUp is the step-up scope of a StepUp view's route, "" for none.
	StepUp string
	// NoAccessKey: registered on a SessionOnly view.
	NoAccessKey bool
}

// ID is "<method> <path>", the way menus and the permissionless route list
// name a route.
func (s *RouteSpec) ID() string { return s.Method + " " + s.Path }

// Uses records the core permissions the handler checks by itself (e.g. a
// field that needs account:group:bind); it registers them and returns s.
func (s *RouteSpec) Uses(keys ...perm.Key) *RouteSpec {
	s.Extra = append(s.Extra, keys...)
	return s
}

// UsesPluginKeys records that the handler checks permissions a plugin
// declares; it returns s.
func (s *RouteSpec) UsesPluginKeys() *RouteSpec {
	s.PluginKeys = true
	return s
}

// record adds a route of r to the shared table.
func (r *Router) record(method, path string, mode Mode, keys []perm.Key) *RouteSpec {
	s := &RouteSpec{Method: method, Path: path, Mode: mode, Keys: slices.Clone(keys), StepUp: r.scope, NoAccessKey: r.noKeys}
	*r.routes = append(*r.routes, s)
	return s
}

// Routes lists the routes registered through r and its views, in order.
func (r *Router) Routes() []RouteSpec {
	out := make([]RouteSpec, len(*r.routes))
	for i, s := range *r.routes {
		out[i] = *s
		out[i].Keys, out[i].Extra = slices.Clone(s.Keys), slices.Clone(s.Extra)
	}
	return out
}
