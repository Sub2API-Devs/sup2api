package gateway

import (
	"log/slog"
	"sort"
	"strings"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// segment is one path pattern segment: a literal, ":name" (a whole
// segment), ":name:suffix" (a non-empty value followed by the literal
// ":suffix", e.g. ":model:generateContent") or a trailing "*name" (the rest,
// possibly empty).
type segment struct {
	literal string // literal segment, or the suffix (with its leading ':') of a parameter
	param   string // parameter name ("" for literals)
	isParam bool
	rest    bool
}

func parseSegment(s string) segment {
	switch {
	case strings.HasPrefix(s, "*"):
		return segment{param: s[1:], isParam: true, rest: true}
	case strings.HasPrefix(s, ":"):
		name := s[1:]
		if i := strings.IndexByte(name, ':'); i >= 0 {
			return segment{param: name[:i], isParam: true, literal: name[i:]}
		}
		return segment{param: name, isParam: true}
	default:
		return segment{literal: s}
	}
}

// match reports whether the path segment s matches and returns the
// parameter value.
func (g segment) match(s string) (string, bool) {
	if !g.isParam {
		return "", s == g.literal
	}
	if len(s) <= len(g.literal) || !strings.HasSuffix(s, g.literal) {
		return "", false
	}
	return s[:len(s)-len(g.literal)], true
}

// key is the segment with the parameter name removed (for duplicates).
func (g segment) key() string {
	switch {
	case g.rest:
		return "*"
	case g.isParam:
		return ":" + g.literal
	default:
		return g.literal
	}
}

// pathPattern is a gin-style path pattern.
type pathPattern struct {
	method string
	segs   []segment
	// static counts literal segments, suffixed counts ":name:suffix"
	// segments; both rank a pattern as more precise.
	static   int
	suffixed int
}

func parsePattern(method, path string) pathPattern {
	p := pathPattern{method: strings.ToUpper(strings.TrimSpace(method))}
	if p.method == "" {
		p.method = "POST"
	}
	for _, s := range splitPath(path) {
		g := parseSegment(s)
		switch {
		case !g.isParam:
			p.static++
		case g.literal != "":
			p.suffixed++
		}
		p.segs = append(p.segs, g)
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

func (p *pathPattern) key() string {
	parts := make([]string, len(p.segs))
	for i, s := range p.segs {
		parts[i] = s.key()
	}
	return p.method + " /" + strings.Join(parts, "/")
}

// match matches the path segments and returns the path parameters.
func (p *pathPattern) match(segs []string) (map[string]string, bool) {
	var params map[string]string
	set := func(k, v string) {
		if k == "" {
			return
		}
		if params == nil {
			params = map[string]string{}
		}
		params[k] = v
	}
	for i, s := range p.segs {
		if s.rest {
			set(s.param, strings.Join(segs[min(i, len(segs)):], "/"))
			return params, true
		}
		if i >= len(segs) {
			return nil, false
		}
		v, ok := s.match(segs[i])
		if !ok {
			return nil, false
		}
		if s.isParam {
			set(s.param, v)
		}
	}
	if len(segs) != len(p.segs) {
		return nil, false
	}
	return params, true
}

// morePrecise orders patterns so literal segments win over suffixed
// parameters, and those over plain parameters.
func morePrecise(a, b pathPattern) bool {
	if a.static != b.static {
		return a.static > b.static
	}
	if a.suffixed != b.suffixed {
		return a.suffixed > b.suffixed
	}
	return len(a.segs) > len(b.segs)
}

// ---------------------------------------------------------------- active endpoints

type route struct {
	pattern pathPattern
	binding core.EndpointBinding
}

// routeTable is the immutable inner router of one generation, built from
// gen.Endpoints(): the built-in platforms' endpoints and those of platforms
// declared by enabled plugins.
type routeTable struct {
	gen    core.Generation
	routes []route
}

func endpointOwner(b core.EndpointBinding) string {
	if b.Plugin.Key == "" {
		return "builtin:" + b.Platform
	}
	return b.Plugin.Key + ":" + b.Platform
}

func buildRouteTable(gen core.Generation) *routeTable {
	t := &routeTable{gen: gen}
	if gen == nil {
		return t
	}
	eps := append([]core.EndpointBinding(nil), gen.Endpoints()...)
	// Conflicts are rejected at install time; should one slip through, a
	// built-in endpoint wins over a plugin endpoint.
	sort.SliceStable(eps, func(i, j int) bool { return eps[i].Plugin.Key == "" && eps[j].Plugin.Key != "" })
	seen := map[string]string{}
	for _, b := range eps {
		p := parsePattern(b.Endpoint.Method, b.Endpoint.Path)
		k := p.key()
		if owner, dup := seen[k]; dup {
			slog.Warn("gateway: duplicate endpoint ignored", "endpoint", k, "owner", endpointOwner(b), "kept", owner)
			continue
		}
		seen[k] = endpointOwner(b)
		t.routes = append(t.routes, route{pattern: p, binding: b})
	}
	sort.SliceStable(t.routes, func(i, j int) bool { return morePrecise(t.routes[i].pattern, t.routes[j].pattern) })
	return t
}

// match returns the route serving method and path, with its path
// parameters.
func (t *routeTable) match(method, path string) (*route, map[string]string) {
	if t == nil || len(t.routes) == 0 {
		return nil, nil
	}
	segs := splitPath(path)
	for i := range t.routes {
		r := &t.routes[i]
		if r.pattern.method != method {
			continue
		}
		if params, ok := r.pattern.match(segs); ok {
			return r, params
		}
	}
	return nil, nil
}
