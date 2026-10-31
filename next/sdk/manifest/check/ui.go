package check

import (
	"fmt"
	"regexp"
	"sort"
	"strings"

	"github.com/Masterminds/semver/v3"
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

// coreMenuSections are the sidebar groups of the console a plugin menu may
// join (authz/menus.go).
var coreMenuSections = map[string]bool{
	"overview": true, "gateway": true, "security": true, "finance": true,
	"users": true, "system": true, "me": true,
}

func (v *validator) ui() {
	u := v.m.UI
	if u == nil {
		return
	}
	if len(u.Menus) > 0 || len(u.Pages) > 0 {
		v.needPerm("ui", "ui.menu", "menus and pages")
	}
	sectionIDs := v.uiSections(u)
	v.uiMenus(u, sectionIDs)
	v.uiPages(u)
	v.uiSlots(u)
	v.uiNative(u)
	if u.Settings != nil {
		v.form("ui.settings", *u.Settings, true)
	}
}

// uiSections validates ui.sections and returns the declared section ids.
func (v *validator) uiSections(u *manifest.UI) map[string]bool {
	sectionIDs := map[string]bool{}
	for i, sec := range u.Sections {
		f := fmt.Sprintf("ui.sections[%d]", i)
		if !idRe.MatchString(sec.ID) {
			v.add(f+".id", "invalid_format", "section id %q is invalid", sec.ID)
		} else if coreMenuSections[sec.ID] || sec.ID == "plugins" {
			v.add(f+".id", "invalid", "section id %q is reserved for the core sidebar", sec.ID)
		} else if sectionIDs[sec.ID] {
			v.add(f+".id", "duplicate", "section %q declared twice", sec.ID)
		}
		sectionIDs[sec.ID] = true
		if firstText(sec.Label) == "" {
			v.add(f+".label", "required", "label is required")
		}
	}
	return sectionIDs
}

// uiMenus validates ui.menus against the declared sections and pages.
func (v *validator) uiMenus(u *manifest.UI, sectionIDs map[string]bool) {
	menuIDs := map[string]bool{}
	for i, mn := range u.Menus {
		f := fmt.Sprintf("ui.menus[%d]", i)
		if !idRe.MatchString(mn.ID) {
			v.add(f+".id", "invalid_format", "menu id %q is invalid", mn.ID)
		} else if menuIDs[mn.ID] {
			v.add(f+".id", "duplicate", "menu %q declared twice", mn.ID)
		}
		menuIDs[mn.ID] = true
		if mn.Section != "plugins" && !coreMenuSections[mn.Section] && !sectionIDs[mn.Section] {
			v.add(f+".section", "invalid", "section must be \"plugins\", a core section (overview, gateway, security, finance, users, system, me) or one of ui.sections")
		}
		if firstText(mn.Label) == "" {
			v.add(f+".label", "required", "label is required")
		}
		if _, ok := u.Pages[mn.Page]; !ok {
			v.add(f+".page", "unknown", "page %q is not declared in ui.pages", mn.Page)
		}
		v.menuIcon(f+".icon", mn.Icon)
		if mn.Permission != "" && !v.userPerm(mn.Permission) {
			v.add(f+".permission", "unknown", "permission %q is not declared in userPermissions", mn.Permission)
		}
	}
}

// uiPages validates ui.pages (sorted by id so the reports are stable).
func (v *validator) uiPages(u *manifest.UI) {
	pageIDs := make([]string, 0, len(u.Pages))
	for id := range u.Pages {
		pageIDs = append(pageIDs, id)
	}
	sort.Strings(pageIDs)
	for _, id := range pageIDs {
		pg := u.Pages[id]
		f := "ui.pages." + id
		if !idRe.MatchString(id) {
			v.add(f, "invalid_format", "page id %q is invalid", id)
		}
		switch pg.Type {
		case "table":
			if pg.Source == "" {
				v.add(f+".source", "required", "table pages require source")
			} else {
				v.pageRouteRef(f+".source", pg.Source, "GET")
			}
		case "form":
			v.needFile(f+".schema", pg.Schema)
			if pg.Source != "" {
				// Optional on a form: it pre-fills the fields.
				v.pageRouteRef(f+".source", pg.Source, "GET")
			}
			// Without submit the console's Save button does nothing and says
			// nothing (DeclarativeForm returns early when the reference does
			// not parse), so a form page without it is a page that cannot be
			// used, not a read-only one.
			if pg.Submit == "" {
				v.add(f+".submit", "required", "form pages require submit (the route the form posts to)")
			} else {
				v.pageRouteRef(f+".submit", pg.Submit, "POST")
			}
		case "iframe":
			v.needPerm(f, "ui.iframe", "iframe pages")
			v.needFile(f+".src", pg.Src)
		case "native":
			v.needPerm(f, "ui.native", "native pages")
			if pg.Component == "" {
				v.add(f+".component", "required", "component is required for native pages")
			}
			if u.Native == nil {
				v.add(f, "missing_native_ui", "native pages require ui.native")
			}
		default:
			v.add(f+".type", "invalid", "page type must be table, form, iframe or native")
		}
		v.pageSearch(f+".search", pg)
		v.pageCreate(f+".create", u, pg)
	}
}

// pageCreate validates a table page's "New" link: it must name a form page
// of the same plugin and, when given, a declared permission.
func (v *validator) pageCreate(f string, u *manifest.UI, pg manifest.Page) {
	if pg.Create == nil {
		return
	}
	if pg.Type != "table" {
		v.add(f, "invalid", "only table pages can link a create page")
		return
	}
	if target, ok := u.Pages[pg.Create.Page]; !ok {
		v.add(f+".page", "unknown", "page %q is not declared in ui.pages", pg.Create.Page)
	} else if target.Type != "form" {
		v.add(f+".page", "invalid", "page %q must be a form page", pg.Create.Page)
	}
	if pg.Create.Permission != "" && !v.userPerm(pg.Create.Permission) {
		v.add(f+".permission", "unknown", "permission %q is not declared in userPermissions", pg.Create.Permission)
	}
}

// uiSlots validates ui.slots.
func (v *validator) uiSlots(u *manifest.UI) {
	for i, s := range u.Slots {
		f := fmt.Sprintf("ui.slots[%d]", i)
		switch s.Slot {
		case "dashboard.widgets", "account.detail.tabs", "account.form.widgets", "account.list.weight":
		default:
			v.add(f+".slot", "invalid", "unknown slot %q", s.Slot)
		}
		if s.Component == "" {
			v.add(f+".component", "required", "component is required")
		}
		v.needPerm(f, "ui.native", "slot components")
		if u.Native == nil {
			v.add(f, "missing_native_ui", "slot components require ui.native")
		}
		if s.Permission != "" && !v.userPerm(s.Permission) {
			v.add(f+".permission", "unknown", "permission %q is not declared in userPermissions", s.Permission)
		}
	}
}

// uiNative validates ui.native and hostUICompat.
func (v *validator) uiNative(u *manifest.UI) {
	if u.Native == nil {
		return
	}
	v.needPerm("ui.native", "ui.native", "native UI")
	if !v.opt.Tooling {
		// The entry is produced by the native UI build, not written by
		// the author; tooling checks for it at packaging time instead.
		v.needFile("ui.native.entry", u.Native.Entry)
	} else if u.Native.Entry == "" {
		v.add("ui.native.entry", "required", "file path is required")
	}
	if u.Native.Entry != "" && !strings.HasPrefix(u.Native.Entry, "ui/") {
		v.add("ui.native.entry", "invalid_path", "native entry must be under ui/")
	}
	if v.m.HostUICompat == "" {
		v.add("hostUICompat", "required", "hostUICompat is required when ui.native is used")
	} else if _, err := semver.NewConstraint(v.m.HostUICompat); err != nil {
		v.add("hostUICompat", "invalid_constraint", "hostUICompat: %v", err)
	}
}

// firstText returns the "en" text or any non-empty value.
func firstText(t map[string]string) string {
	if s := strings.TrimSpace(t["en"]); s != "" {
		return s
	}
	for _, s := range t {
		if s = strings.TrimSpace(s); s != "" {
			return s
		}
	}
	return ""
}
