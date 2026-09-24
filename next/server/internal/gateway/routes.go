package gateway

import (
	"log/slog"
	"sort"
	"strings"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// pathPattern is a gin-style path: static segments, ":name" (one segment)
// and a trailing "*name" (the rest, possibly empty).
type pathPattern struct {
	method string
	segs   []string
	static int
}

func parsePattern(method, path string) pathPattern {
	segs := splitPath(path)
	p := pathPattern{method: strings.ToUpper(strings.TrimSpace(method)), segs: segs}
	if p.method == "" {
		p.method = "POST"
	}
	for _, s := range segs {
		if !strings.HasPrefix(s, ":") && !strings.HasPrefix(s, "*") {
			p.static++
		}
	}
	return p
}

func splitPath(path string) []string {
	path = strings.Trim(path, "/")
	if path == "" {
		return nil
	}
	return strings.Split(path, "/")
}

func (p *pathPattern) matches(segs []string) bool {
	for i, s := range p.segs {
		if strings.HasPrefix(s, "*") {
			return true
		}
		if i >= len(segs) {
			return false
		}
		if strings.HasPrefix(s, ":") {
			if segs[i] == "" {
				return false
			}
			continue
		}
		if s != segs[i] {
			return false
		}
	}
	return len(segs) == len(p.segs)
}

// morePrecise orders patterns so static segments win over parameters.
func morePrecise(a, b pathPattern) bool {
	if a.static != b.static {
		return a.static > b.static
	}
	return len(a.segs) > len(b.segs)
}

// ---------------------------------------------------------------- active endpoints

type route struct {
	pattern pathPattern
	binding core.EndpointBinding
}

// routeTable is the immutable inner router of one generation.
type routeTable struct {
	gen    core.Generation
	routes []route
}

func buildRouteTable(gen core.Generation) *routeTable {
	t := &routeTable{gen: gen}
	if gen == nil {
		return t
	}
	seen := map[string]string{}
	for _, b := range gen.Endpoints() {
		p := parsePattern(b.Endpoint.Method, b.Endpoint.Path)
		k := p.method + " " + strings.Join(p.segs, "/")
		if owner, dup := seen[k]; dup {
			slog.Warn("gateway: duplicate endpoint ignored", "endpoint", k, "plugin", b.Plugin.Key, "owner", owner)
			continue
		}
		seen[k] = b.Plugin.Key
		t.routes = append(t.routes, route{pattern: p, binding: b})
	}
	sort.SliceStable(t.routes, func(i, j int) bool { return morePrecise(t.routes[i].pattern, t.routes[j].pattern) })
	return t
}

func (t *routeTable) match(method, path string) *route {
	if t == nil || len(t.routes) == 0 {
		return nil
	}
	segs := splitPath(path)
	for i := range t.routes {
		r := &t.routes[i]
		if r.pattern.method == method && r.pattern.matches(segs) {
			return r
		}
	}
	return nil
}
