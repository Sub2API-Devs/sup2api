package check

import (
	"regexp"
	"strings"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

// routeRefRe matches a manifest route reference such as "GET /models" or
// "/models" (method defaulting to the caller's). It is the Go mirror of
// parseRouteRef() in web/src/components/plugin/declarative.ts, which is what
// actually turns Page.Source and Page.Submit into requests; the two must agree
// on what parses, or the host would accept a reference the console cannot
// call.
var routeRefRe = regexp.MustCompile(`^\s*(?i:(GET|POST|PUT|PATCH|DELETE)\s+)?(/\S*)\s*$`)

// ParseRouteRef parses a manifest route reference ("GET /models", "/models")
// into an upper-case method and a path. defaultMethod is used when the
// reference names none: GET for Page.Source, POST for Page.Submit, matching
// the console.
func ParseRouteRef(ref, defaultMethod string) (method, path string, ok bool) {
	m := routeRefRe.FindStringSubmatch(ref)
	if m == nil {
		return "", "", false
	}
	method = strings.ToUpper(m[1])
	if method == "" {
		method = strings.ToUpper(defaultMethod)
	}
	return method, m[2], true
}

// pageRouteRef checks one route reference of a page (source or submit) and
// reports whether it names a route this manifest declares.
//
// Until now nothing checked this. A table page whose source did not parse, or
// named a route that does not exist, rendered an empty table with no error:
// the console's parseRouteRef returns null and load() returns, and a form page
// whose submit is missing or unparsable has a Save button that does nothing at
// all. Both are exactly the "declared and nobody honours it" shape - the page
// is not visibly broken, it looks like a page with no rows.
//
// The route is matched by method plus NormalizeRoutePath, the same signature
// routes() uses to find duplicates, so "/assets/:id" in routes and
// "/assets/:asset" in a page reference are the same route (gin binds by
// position, not by name).
func (v *validator) pageRouteRef(field, ref, defaultMethod string) {
	method, path, ok := ParseRouteRef(ref, defaultMethod)
	if !ok {
		v.add(field, "invalid_route_ref", "%q is not a route reference; expected %q or %q",
			ref, defaultMethod+" /path", "/path")
		return
	}
	want := method + " " + NormalizeRoutePath(path)
	for _, r := range v.m.Routes {
		if strings.ToUpper(r.Method)+" "+NormalizeRoutePath(r.Path) == want {
			return
		}
	}
	v.add(field, "unknown_route", "route %s %s is not declared in routes", method, path)
}

// searchParamRe is what a declared search parameter name may look like: the
// same grammar as a gateway endpoint's request.queryParams (§26.6), because it
// is the same thing - a query key a client types and a plugin reads.
var searchParamRe = queryParamRe

// tableQueryParams are the query parameters the host's table page sends on
// every request by itself (DeclarativeTable). A search parameter may not be
// one of them: the search box would then overwrite the page number on every
// keystroke, and it would look like a search that silently resets nothing.
var tableQueryParams = []string{"page", "page_size"}

// pageSearch validates Page.Search, the declaration that makes the host render
// a search box (CONTRACTS: manifest.Page.search).
//
// There is one name, not a list, so there is nothing to de-duplicate here -
// see the field's own comment for why a list would be the wrong shape while
// the host has exactly one text box to draw.
//
// The name is compared to the host's own parameters case-insensitively even
// though the host sends them lower-case and plugins read them exactly. "Page"
// would not in fact collide today; accepting it would make the rule depend on
// the case a plugin author happened to type, and on pluginsdk.Query staying
// case-sensitive forever. The same reasoning is already settled for
// request.queryParams vs auth.query in §26.6.
func (v *validator) pageSearch(field string, pg manifest.Page) {
	if pg.Search == "" {
		return
	}
	// Only a table page has a search box. On a form, iframe or native page the
	// declaration would be read by nobody, which is the failure this field was
	// introduced to stop rather than reproduce.
	if pg.Type != "table" {
		v.add(field, "unsupported", "search is only honoured on table pages (this page is %q)", pg.Type)
		return
	}
	if !searchParamRe.MatchString(pg.Search) {
		v.add(field, "invalid_format", "search parameter name %q must match %s", pg.Search, searchParamRe.String())
		return
	}
	for _, p := range tableQueryParams {
		if strings.EqualFold(pg.Search, p) {
			v.add(field, "reserved_param",
				"search parameter %q is sent by the table itself (%s); the search box would overwrite it",
				pg.Search, strings.Join(tableQueryParams, ", "))
			return
		}
	}
	// Declaring a search parameter says "the route in source honours it", so
	// without a source the declaration cannot mean anything. source is already
	// required for table pages; this keeps the two from being reported as
	// unrelated problems.
	if pg.Source == "" {
		v.add(field, "missing_source", "search needs source: it names a query parameter of that route")
	}
}

// menuIcon checks that a menu names an icon the console can actually draw.
//
// This is the whole reason icons.json is embedded. An unknown name used to
// render a plain square - no blank space, no error, no console output - which
// looked like a deliberate choice of icon rather than a typo. The console now
// draws a loud placeholder and warns, but only the person looking at that page
// in a browser ever finds out; here the plugin does not install.
//
// Only ui.menus[].icon is checked. The top-level manifest.icon is the plugin
// avatar and a different vocabulary entirely ("text:AB", a path inside the
// package, an absolute URL, a data: URI); basics() checks that one.
func (v *validator) menuIcon(field, icon string) {
	if icon == "" || KnownIcon(icon) {
		return
	}
	v.add(field, "unknown_icon", "unknown icon %q; %s", icon, iconsStaleHint())
}
