package main

import (
	"fmt"
	"regexp"
	"slices"
	"strings"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

// Static manifest checks for platforms and account types (ARCHITECTURE 6.6,
// CONTRACTS 13). Checks that need other plugins or the core's built-in
// endpoints (platform id uniqueness across plugins, endpoint conflicts with
// other platforms) are done by the host at install time.

var (
	platformIDRe = regexp.MustCompile(`^[a-z][a-z0-9_]{1,29}$`)
	// A path segment: literal, ":param" or ":param:suffix".
	paramSegRe = regexp.MustCompile(`^:[A-Za-z_][A-Za-z0-9_]*(:[A-Za-z0-9_.\-]+)?$`)
)

// builtinPlatforms are the core's platform ids; plugins cannot reuse them.
var builtinPlatforms = []string{manifest.PlatformAnthropic, manifest.PlatformOpenAI, manifest.PlatformGemini}

// reservedPathPrefixes are core routes a plugin endpoint must not shadow.
var reservedPathPrefixes = []string{"/api", "/plugin-ui", "/health"}

var (
	endpointMethods = []string{"GET", "POST", "PUT", "PATCH", "DELETE"}
	errorFormats    = []string{"anthropic", "openai", "gemini", "plain"}
	billingModes    = []string{"usage", "free"}
	usageSemantics  = []string{"exclusive", "inclusive"}
)

// validateManifest returns the problems of the platforms and account types
// declared by m.
func validateManifest(m *manifest.Manifest) []string {
	var invalid []string
	bad := func(format string, a ...any) { invalid = append(invalid, fmt.Sprintf(format, a...)) }

	hasCap := func(id string) bool {
		return slices.ContainsFunc(m.Capabilities, func(c manifest.Capability) bool { return c.ID == id })
	}
	perm := func(id string) *manifest.HostPermission {
		for i := range m.HostPermissions {
			if m.HostPermissions[i].ID == id {
				return &m.HostPermissions[i]
			}
		}
		return nil
	}
	needPerm := func(id, what string) {
		if perm(id) == nil {
			bad("%s need host permission %s", what, id)
		}
	}

	// Platforms declared by the plugin, with their endpoints.
	own := map[string]*manifest.Platform{}
	type route struct{ platform, id, method, path string }
	var routes []route
	if len(m.Platforms) > 0 {
		needPerm("gateway.endpoint", "platforms")
		needPerm("platform.register", "platforms")
	}
	for i := range m.Platforms {
		p := &m.Platforms[i]
		switch {
		case !platformIDRe.MatchString(p.ID):
			bad("platform id %q must match %s", p.ID, platformIDRe)
		case slices.Contains(builtinPlatforms, p.ID):
			bad("platform %s is built into the core; declare a new platform id", p.ID)
		case own[p.ID] != nil:
			bad("duplicate platform %s", p.ID)
		}
		own[p.ID] = p
		if len(p.Endpoints) == 0 {
			bad("platform %s declares no endpoints", p.ID)
		}
		checkUsage(bad, "platform "+p.ID, p.Usage, true)
		ids := map[string]bool{}
		for _, e := range p.Endpoints {
			where := fmt.Sprintf("platform %s endpoint %q", p.ID, e.ID)
			if e.ID == "" || ids[e.ID] {
				bad("%s: empty or duplicate endpoint id", where)
			}
			ids[e.ID] = true
			if !slices.Contains(endpointMethods, e.Method) {
				bad("%s: method %q not one of %v", where, e.Method, endpointMethods)
			}
			if err := checkEndpointPath(e.Path); err != "" {
				bad("%s: path %q %s", where, e.Path, err)
			}
			if name, ok := strings.CutPrefix(e.Protocol, p.ID+"."); !ok || name == "" {
				bad("%s: protocol %q must be %q", where, e.Protocol, p.ID+".<name>")
			}
			if e.Kind != "proxy" {
				bad("%s: kind %q unsupported (only \"proxy\")", where, e.Kind)
			}
			if len(e.Auth.Headers) == 0 && e.Auth.Query == "" {
				bad("%s: auth needs headers or query", where)
			}
			if e.Request.ModelPath != "" && e.Request.ModelParam != "" {
				bad("%s: request.modelPath and request.modelParam are exclusive", where)
			}
			if e.Request.ModelParam != "" && !slices.Contains(pathParams(e.Path), e.Request.ModelParam) {
				bad("%s: request.modelParam %q is not a path parameter", where, e.Request.ModelParam)
			}
			if e.Response.NonStream == "" && !e.Request.Stream {
				bad("%s: response.nonStream is required", where)
			}
			if !slices.Contains(errorFormats, e.ErrorFormat) {
				bad("%s: errorFormat %q not one of %v", where, e.ErrorFormat, errorFormats)
			}
			if !slices.Contains(billingModes, e.Billing) {
				bad("%s: billing %q not one of %v", where, e.Billing, billingModes)
			}
			if e.Usage != nil {
				checkUsage(bad, where, *e.Usage, false)
			}
			for _, r := range routes {
				if r.method == e.Method && pathsOverlap(r.path, e.Path) {
					bad("%s: %s %s conflicts with platform %s endpoint %q (%s)", where, e.Method, e.Path, r.platform, r.id, r.path)
				}
			}
			routes = append(routes, route{p.ID, e.ID, e.Method, e.Path})
		}
	}

	// Account types and the platforms they serve.
	if len(m.AccountTypes) > 0 {
		if !hasCap(manifest.CapPlatformAdapter) {
			bad("accountTypes need capability %s", manifest.CapPlatformAdapter)
		}
		needPerm("platform.register", "accountTypes")
		if c := perm("accounts.credentials"); c == nil {
			bad(`accountTypes need host permission accounts.credentials {"types":"own"}`)
		} else if c.Scope["types"] != "own" {
			bad(`accounts.credentials scope must be {"types":"own"}`)
		}
	}
	typeIDs := map[string]bool{}
	for _, at := range m.AccountTypes {
		if at.ID == "" || typeIDs[at.ID] {
			bad("empty or duplicate account type id %q", at.ID)
		}
		typeIDs[at.ID] = true
		if len(at.Platforms) == 0 {
			bad("account type %s declares no platforms", at.ID)
		}
		seen := map[string]bool{}
		for _, ap := range at.Platforms {
			where := fmt.Sprintf("account type %s platform %q", at.ID, ap.Platform)
			if !platformIDRe.MatchString(ap.Platform) || seen[ap.Platform] {
				bad("%s: invalid or duplicate platform id", where)
			}
			seen[ap.Platform] = true
			for proto, u := range ap.Usage {
				if name, ok := strings.CutPrefix(proto, ap.Platform+"."); !ok || name == "" {
					bad("%s: usage protocol %q does not belong to the platform", where, proto)
				} else if p := own[ap.Platform]; p != nil && !slices.Contains(p.Protocols(), proto) {
					bad("%s: usage protocol %q is not a protocol of the platform", where, proto)
				}
				checkUsage(bad, where+" usage "+proto, u, false)
			}
		}
	}
	return invalid
}

// checkUsage validates usage rules; semantics is required only for platform
// defaults (overrides may leave it to the platform).
func checkUsage(bad func(string, ...any), where string, u manifest.UsageRules, required bool) {
	if u.Semantics == "" {
		if required {
			bad("%s: usage.semantics is required (%v)", where, usageSemantics)
		}
		return
	}
	if !slices.Contains(usageSemantics, u.Semantics) {
		bad("%s: usage.semantics %q not one of %v", where, u.Semantics, usageSemantics)
	}
}

// checkEndpointPath returns "" when p is a valid endpoint path pattern.
func checkEndpointPath(p string) string {
	if !strings.HasPrefix(p, "/") || p == "/" {
		return "must start with / and not be /"
	}
	if strings.ContainsAny(p, "?#*") {
		return "must not contain ?, # or *"
	}
	for _, r := range reservedPathPrefixes {
		if p == r || strings.HasPrefix(p, r+"/") {
			return "is under the core route " + r
		}
	}
	for _, s := range strings.Split(p[1:], "/") {
		if s == "" {
			return "has an empty segment"
		}
		if strings.HasPrefix(s, ":") && !paramSegRe.MatchString(s) {
			return fmt.Sprintf("segment %q must be :param or :param:suffix", s)
		}
	}
	return ""
}

// pathParams lists the parameter names of a path pattern.
func pathParams(p string) []string {
	var out []string
	for _, s := range strings.Split(strings.TrimPrefix(p, "/"), "/") {
		if strings.HasPrefix(s, ":") {
			name, _, _ := strings.Cut(s[1:], ":")
			out = append(out, name)
		}
	}
	return out
}

// pathsOverlap reports whether some request path matches both patterns.
func pathsOverlap(a, b string) bool {
	as := strings.Split(strings.TrimPrefix(a, "/"), "/")
	bs := strings.Split(strings.TrimPrefix(b, "/"), "/")
	if len(as) != len(bs) {
		return false
	}
	for i := range as {
		if !segmentsOverlap(as[i], bs[i]) {
			return false
		}
	}
	return true
}

// segmentsOverlap: a literal matches itself; ":p" matches any non-empty
// segment; ":p:suffix" matches a segment ending in ":suffix" with a
// non-empty value before it.
func segmentsOverlap(a, b string) bool {
	suffix := func(s string) (string, bool) { // ("", true) for ":p"
		if !strings.HasPrefix(s, ":") {
			return "", false
		}
		if i := strings.Index(s[1:], ":"); i >= 0 {
			return s[1+i:], true
		}
		return "", true
	}
	sa, pa := suffix(a)
	sb, pb := suffix(b)
	switch {
	case !pa && !pb:
		return a == b
	case pa && pb:
		return strings.HasSuffix(sa, sb) || strings.HasSuffix(sb, sa)
	case pa: // b literal
		return strings.HasSuffix(b, sa) && len(b) > len(sa)
	default: // a literal
		return strings.HasSuffix(a, sb) && len(a) > len(sb)
	}
}
