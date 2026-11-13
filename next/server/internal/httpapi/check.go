package httpapi

import (
	"errors"
	"fmt"
	"maps"
	"slices"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/perm"
)

// RouteRules are what CheckRoutes holds a route table to.
type RouteRules struct {
	// KnownKey reports whether a key is a core permission (catalog or self
	// module).
	KnownKey func(key string) bool
	// KnownStepUp reports whether a step-up scope exists.
	KnownStepUp func(scope string) bool
	// Permissionless lists, by RouteSpec.ID, the routes allowed without a
	// permission (ModePublic, ModeAuthed) and how each lets callers in. A
	// new one needs an entry, so opening a route to every caller is a
	// reviewed decision; so does a route losing authentication or its
	// SessionOnly view.
	Permissionless map[string]Access
}

// CheckRoutes checks the route table at start-up: every permission and
// extra key is a core one, every step-up scope exists, and the routes
// without a permission are exactly rules.Permissionless, with the same
// access. It returns every
// failure joined, nil when there is none.
func CheckRoutes(specs []RouteSpec, rules RouteRules) error {
	var errs []error
	fail := func(s RouteSpec, format string, args ...any) {
		errs = append(errs, fmt.Errorf("route %s: "+format, append([]any{s.ID()}, args...)...))
	}
	open := map[string]bool{}
	for _, s := range specs {
		for _, k := range slices.Concat(s.Keys, s.Extra) {
			if !rules.KnownKey(string(k)) {
				fail(s, "unknown permission %q", k)
			}
		}
		if s.StepUp != "" && !rules.KnownStepUp(s.StepUp) {
			fail(s, "unknown step-up scope %q", s.StepUp)
		}
		if a := s.access(); a != "" {
			open[s.ID()] = true
			switch want, ok := rules.Permissionless[s.ID()]; {
			case !ok:
				fail(s, "%s route without a permission is not on the permissionless list", a)
			case want != a:
				fail(s, "%s route, the permissionless list says %s", a, want)
			}
		}
	}
	for _, id := range slices.Sorted(maps.Keys(rules.Permissionless)) {
		if !open[id] {
			errs = append(errs, fmt.Errorf("permissionless list: %s is not a route without a permission", id))
		}
	}
	return errors.Join(errs...)
}

// RouteKeys indexes specs by ID, for the menus that name a page's main
// route: the keys of the route, false when there is no such route.
func RouteKeys(specs []RouteSpec) func(id string) ([]string, bool) {
	byID := make(map[string][]string, len(specs))
	for _, s := range specs {
		byID[s.ID()] = perm.Strings(s.Keys)
	}
	return func(id string) ([]string, bool) {
		keys, ok := byID[id]
		return keys, ok
	}
}
