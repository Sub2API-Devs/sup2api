package gateway

import (
	"context"
	"encoding/json"
	"log/slog"
	"sort"
	"strings"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
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

// ---------------------------------------------------------------- known (installed) endpoints

type knownEndpoint struct {
	pattern     pathPattern
	pluginKey   string
	errorFormat string
}

// knownIndex lists endpoints declared by every installed plugin, active or
// not, so requests to an inactive plugin's endpoint get 503 instead of 404.
type knownIndex struct {
	endpoints []knownEndpoint
}

func (k *knownIndex) match(method, path string) *knownEndpoint {
	if k == nil || len(k.endpoints) == 0 {
		return nil
	}
	segs := splitPath(path)
	for i := range k.endpoints {
		e := &k.endpoints[i]
		if e.pattern.method == method && e.pattern.matches(segs) {
			return e
		}
	}
	return nil
}

func buildKnownIndex(entries map[string][]manifest.Endpoint) *knownIndex {
	k := &knownIndex{}
	keys := make([]string, 0, len(entries))
	for key := range entries {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	for _, key := range keys {
		for _, ep := range entries[key] {
			k.endpoints = append(k.endpoints, knownEndpoint{
				pattern: parsePattern(ep.Method, ep.Path), pluginKey: key, errorFormat: ep.ErrorFormat,
			})
		}
	}
	sort.SliceStable(k.endpoints, func(i, j int) bool { return morePrecise(k.endpoints[i].pattern, k.endpoints[j].pattern) })
	return k
}

// refreshKnown rebuilds the index from plugins/plugin_versions, using the
// active version's manifest (or the desired one before first activation).
func (g *Gateway) refreshKnown(ctx context.Context) error {
	if g.d.DB == nil {
		return nil
	}
	rows, err := g.d.DB.Pool.Query(ctx, `
		SELECT p.key, pv.manifest -> 'gateway' -> 'endpoints'
		FROM plugins p
		JOIN plugin_versions pv ON pv.plugin_key = p.key
		     AND pv.version = COALESCE(p.active_version, p.desired_version)`)
	if err != nil {
		return err
	}
	defer rows.Close()
	entries := map[string][]manifest.Endpoint{}
	for rows.Next() {
		var key string
		var raw []byte
		if err := rows.Scan(&key, &raw); err != nil {
			return err
		}
		if len(raw) == 0 || string(raw) == "null" {
			continue
		}
		var eps []manifest.Endpoint
		if err := json.Unmarshal(raw, &eps); err != nil {
			slog.WarnContext(ctx, "gateway: bad endpoints in manifest", "plugin", key, "err", err)
			continue
		}
		entries[key] = eps
	}
	if err := rows.Err(); err != nil {
		return err
	}
	g.known.Store(buildKnownIndex(entries))
	return nil
}
