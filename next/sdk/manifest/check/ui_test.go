package check

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

// ---------------------------------------------------------------- icons

// TestEmbeddedIconsMatchTheSource is the whole reason icons.json may be a
// generated file. It re-hashes the TypeScript module the names come from and
// fails when the recorded digest differs, so "added an icon to icons.ts and
// forgot to regenerate" is a red test naming the command to run - not a
// manifest whose valid icon the validator rejects, or an invalid one it
// accepts, which is the class of silent failure this validation was added to
// remove in the first place.
//
// It hashes the source rather than re-deriving the names because a second,
// looser TypeScript parser written in Go is a thing that eventually disagrees
// with the real one. The cost of hashing is that a comment-only edit to
// icons.ts also asks for a regeneration; the fix is one idempotent command.
//
// The source is looked up by walking up from this file, and a checkout without
// it is a FAILURE, never a skip (CONTRACTS §26.4: "found nothing, so skipped"
// is how a cross-module test stays green for months while checking nothing).
// Only this repository runs this module's tests; a plugin module that imports
// sdk/manifest/check runs its own.
func TestEmbeddedIconsMatchTheSource(t *testing.T) {
	path := findRepoFile(t, IconSource())
	b, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read %s: %v", path, err)
	}
	if got, want := HashIconSource(b), IconSourceSHA256(); got != want {
		t.Fatalf("icons.json is stale: %s hashes to %s but icons.json records %s.\n"+
			"Run \"npm run icons:json\" in next/web and commit the regenerated "+
			"sdk/manifest/check/icons.json.", IconSource(), got, want)
	}
	// The digest alone would also be satisfied by an icons.json with a correct
	// hash and a mangled name list, so check the list is usable on its own.
	names := IconNames()
	if len(names) == 0 {
		t.Fatal("icons.json lists no names")
	}
	for i, n := range names {
		if n == "" || strings.ContainsAny(n, " \t\"'/\\") {
			t.Errorf("icon name %q is not a usable name", n)
		}
		if i > 0 && names[i-1] >= n {
			t.Errorf("icon names are not sorted and unique at %q (previous %q)", n, names[i-1])
		}
	}
	// The names the repository's own manifests use must be in there; if they
	// are not, the new rule has false positives and the gate below would only
	// say "unknown icon".
	for _, n := range []string{"list", "shield", "inbox", "group", "plus", "search"} {
		if !KnownIcon(n) {
			t.Errorf("icon %q is used by a manifest or by the console but is not in icons.json", n)
		}
	}
	if KnownIcon("definitely-not-an-icon") {
		t.Error("KnownIcon accepts a name that is not in the set")
	}
}

// HashIconSource must give the same digest for a CRLF and an LF checkout:
// .gitattributes pins *.ts to LF, but git core.autocrlf is on on at least one
// developer machine and a hash that depended on it would make this test fail
// on one platform and pass on the other - a gate nobody would trust.
func TestHashIconSourceIgnoresLineEndingsAndBOM(t *testing.T) {
	lf := []byte("export const a = 1\nexport const b = 2\n")
	crlf := []byte("export const a = 1\r\nexport const b = 2\r\n")
	bom := append([]byte{0xEF, 0xBB, 0xBF}, lf...)
	if HashIconSource(lf) != HashIconSource(crlf) || HashIconSource(lf) != HashIconSource(bom) {
		t.Fatal("HashIconSource must normalise CRLF and a leading BOM")
	}
	if HashIconSource(lf) == HashIconSource([]byte("export const a = 2\n")) {
		t.Fatal("HashIconSource must distinguish different content")
	}
}

// The staleness gate is proved directly rather than inferred: apply the exact
// mistake it exists to catch - an icon added to icons.ts without regenerating
// icons.json - to the real source bytes and require the recorded digest to
// disagree. (CONTRACTS §26.7: do not prove B by watching A fail.)
func TestAnUnregeneratedIconsTSIsDetected(t *testing.T) {
	b, err := os.ReadFile(findRepoFile(t, IconSource()))
	if err != nil {
		t.Fatalf("read %s: %v", IconSource(), err)
	}
	edited := append(append([]byte{}, b...), []byte("\nexport const NEW_ICON = ['M0 0h24v24H0z']\n")...)
	if HashIconSource(edited) == IconSourceSHA256() {
		t.Fatal("editing icons.ts left the recorded digest unchanged; the staleness gate cannot fire")
	}
	// ...and the unedited source still matches, so the gate is not simply
	// always red.
	if HashIconSource(b) != IconSourceSHA256() {
		t.Fatalf("icons.json is stale: run \"npm run icons:json\" in next/web")
	}
}

// findRepoFile locates a repository-relative path by walking up from this
// source file. It fails the test when the file is absent rather than skipping.
func findRepoFile(t *testing.T, rel string) string {
	t.Helper()
	_, self, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("runtime.Caller failed")
	}
	dir := filepath.Dir(self)
	for i := 0; i < 12; i++ {
		p := filepath.Join(dir, filepath.FromSlash(rel))
		if _, err := os.Stat(p); err == nil {
			return p
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}
	t.Fatalf("cannot find %s above %s; this test must not be skipped - it is the only thing that "+
		"notices sdk/manifest/check/icons.json going stale", rel, filepath.Dir(self))
	return ""
}

// ---------------------------------------------------------------- ui rules

// uiManifest is a manifest with one admin route, one table page over it and
// one menu pointing at the page - the shape the new ui rules act on.
func uiManifest() *manifest.Manifest {
	m := minimal()
	m.Capabilities = []manifest.Capability{{ID: manifest.CapHTTPRoutes}}
	m.HostPermissions = []manifest.HostPermission{{ID: "ui.menu"}, {ID: "routes.admin"}}
	m.UserPermissions = []manifest.UserPermission{{Key: "assets:read", Label: manifest.LocalizedText{"en": "Read assets"}}}
	m.Routes = []manifest.Route{
		{Method: "GET", Path: "/assets", Scope: "admin", Permission: "assets:read"},
		{Method: "GET", Path: "/assets/:id", Scope: "admin", Permission: "assets:read"},
	}
	m.UI = &manifest.UI{
		Menus: []manifest.Menu{{ID: "assets", Section: "plugins", Label: manifest.LocalizedText{"en": "Assets"}, Icon: "inbox", Page: "assets"}},
		Pages: map[string]manifest.Page{
			"assets": {Type: "table", Title: manifest.LocalizedText{"en": "Assets"}, Source: "GET /assets",
				Columns: []manifest.Column{{Key: "id", Label: manifest.LocalizedText{"en": "ID"}}}},
		},
	}
	return m
}

func uiCodes(m *manifest.Manifest) map[string]string {
	return codes(Validate(m, nil, ValidateOptions{Tooling: true}))
}

// The fixture itself must be valid, otherwise every case below could pass for
// the wrong reason.
func TestUIManifestFixtureIsValid(t *testing.T) {
	if c := uiCodes(uiManifest()); len(c) > 0 {
		t.Fatalf("fixture must validate cleanly: %v", c)
	}
}

// An icon name that <SIcon> cannot draw is rejected at install time. In the
// browser it used to render a plain square with no error and no console
// output, so a typo looked like a deliberate choice.
func TestMenuIconMustBeKnown(t *testing.T) {
	m := uiManifest()
	m.UI.Menus[0].Icon = "inbocks"
	c := uiCodes(m)
	if c["ui.menus[0].icon"] != "unknown_icon" {
		t.Fatalf("unknown icon must be rejected: %v", c)
	}
	// No icon at all is allowed: the console falls back to "puzzle".
	m.UI.Menus[0].Icon = ""
	if c := uiCodes(m); len(c) > 0 {
		t.Fatalf("an absent icon is legal: %v", c)
	}
	// Every name in the set is accepted, so the rule cannot be satisfied only
	// by the handful used today.
	for _, n := range IconNames() {
		m.UI.Menus[0].Icon = n
		if c := uiCodes(m); len(c) > 0 {
			t.Fatalf("icon %q from the set was rejected: %v", n, c)
		}
	}
	// The plugin avatar is a different vocabulary and must NOT be held to the
	// icon set: every shipped plugin uses "text:X", which is not an icon name.
	m = uiManifest()
	m.Icon = "text:V"
	if c := uiCodes(m); len(c) > 0 {
		t.Fatalf("top-level icon %q must not be checked against the icon set: %v", m.Icon, c)
	}
}

// Menus join any core sidebar section by id; those ids are reserved, so a
// plugin cannot declare its own section with one. "safety" stays free: the
// moderation plugin declared it before the core grew "security".
func TestMenuSections(t *testing.T) {
	for _, sec := range []string{"plugins", "overview", "gateway", "security", "finance", "users", "system", "me"} {
		m := uiManifest()
		m.UI.Menus[0].Section = sec
		if c := uiCodes(m); len(c) > 0 {
			t.Fatalf("core section %q must be accepted: %v", sec, c)
		}
	}
	m := uiManifest()
	m.UI.Menus[0].Section = "nowhere"
	if c := uiCodes(m); c["ui.menus[0].section"] != "invalid" {
		t.Fatalf("an undeclared section must be rejected: %v", c)
	}
	for _, id := range []string{"security", "users", "plugins"} {
		m := uiManifest()
		m.UI.Sections = []manifest.MenuSection{{ID: id, Label: manifest.LocalizedText{"en": "Mine"}}}
		if c := uiCodes(m); c["ui.sections[0].id"] != "invalid" {
			t.Fatalf("section id %q is reserved for the core: %v", id, c)
		}
	}
	m = uiManifest()
	m.UI.Sections = []manifest.MenuSection{{ID: "safety", Label: manifest.LocalizedText{"en": "Safety"}, Order: 350}}
	m.UI.Menus[0].Section = "safety"
	if c := uiCodes(m); len(c) > 0 {
		t.Fatalf("a plugin's own section must stay valid: %v", c)
	}
}

// A table page links its create form with a "New" button instead of a
// sidebar entry; the link must name a form page and a declared permission.
func TestPageCreateLink(t *testing.T) {
	withForm := func() *manifest.Manifest {
		m := uiManifest()
		m.Routes = append(m.Routes, manifest.Route{Method: "POST", Path: "/assets", Scope: "admin", Permission: "assets:read"})
		m.UI.Pages["new_asset"] = manifest.Page{Type: "form", Title: manifest.LocalizedText{"en": "New"}, Schema: "forms/new.json", Submit: "POST /assets"}
		return m
	}
	files := map[string][]byte{"forms/new.json": []byte("{}")}
	check := func(m *manifest.Manifest) map[string]string {
		return codes(Validate(m, files, ValidateOptions{Tooling: true}))
	}
	set := func(m *manifest.Manifest, link *manifest.PageLink) {
		pg := m.UI.Pages["assets"]
		pg.Create = link
		m.UI.Pages["assets"] = pg
	}
	m := withForm()
	if c := check(m); len(c) > 0 {
		t.Fatalf("fixture with a form page must validate: %v", c)
	}
	set(m, &manifest.PageLink{Page: "new_asset", Permission: "assets:read"})
	if c := check(m); len(c) > 0 {
		t.Fatalf("a valid create link was rejected: %v", c)
	}
	set(m, &manifest.PageLink{Page: "missing"})
	if c := check(m); c["ui.pages.assets.create.page"] != "unknown" {
		t.Fatalf("an unknown create page must be rejected: %v", c)
	}
	set(m, &manifest.PageLink{Page: "assets"})
	if c := check(m); c["ui.pages.assets.create.page"] != "invalid" {
		t.Fatalf("a create link must open a form page: %v", c)
	}
	set(m, &manifest.PageLink{Page: "new_asset", Permission: "assets:write"})
	if c := check(m); c["ui.pages.assets.create.permission"] != "unknown" {
		t.Fatalf("an undeclared create permission must be rejected: %v", c)
	}
}

// A page's source/submit must name a route the manifest declares. Before this
// rule the console silently rendered an empty table (parseRouteRef returns
// null and the load is abandoned) or a Save button that did nothing.
func TestPageRouteRefsMustBeDeclared(t *testing.T) {
	m := uiManifest()
	pg := m.UI.Pages["assets"]
	pg.Source = "GET /assetz"
	m.UI.Pages["assets"] = pg
	if c := uiCodes(m); c["ui.pages.assets.source"] != "unknown_route" {
		t.Fatalf("undeclared route must be rejected: %v", c)
	}
	// The method is part of the identity of a route.
	pg.Source = "POST /assets"
	m.UI.Pages["assets"] = pg
	if c := uiCodes(m); c["ui.pages.assets.source"] != "unknown_route" {
		t.Fatalf("method mismatch must be rejected: %v", c)
	}
	// Not a reference at all.
	pg.Source = "GET assets"
	m.UI.Pages["assets"] = pg
	if c := uiCodes(m); c["ui.pages.assets.source"] != "invalid_route_ref" {
		t.Fatalf("unparsable reference must be rejected: %v", c)
	}
	// The method may be left out (the console defaults source to GET), and a
	// path parameter matches by position, not by name.
	pg.Source = "/assets/:asset"
	m.UI.Pages["assets"] = pg
	if c := uiCodes(m); len(c) > 0 {
		t.Fatalf("%q names GET /assets/:id: %v", pg.Source, c)
	}
}

// A form page needs a submit route: without it the Save button returns early
// and reports nothing at all.
func TestFormPageNeedsSubmit(t *testing.T) {
	m := uiManifest()
	m.Routes = append(m.Routes, manifest.Route{Method: "POST", Path: "/assets", Scope: "admin", Permission: "assets:read"})
	m.UI.Menus[0].Page = "new"
	m.UI.Pages = map[string]manifest.Page{"new": {Type: "form", Schema: "forms/new.schema.json"}}
	files := map[string][]byte{"forms/new.schema.json": []byte("{}")}
	c := codes(Validate(m, files, ValidateOptions{Tooling: true}))
	if c["ui.pages.new.submit"] != "required" {
		t.Fatalf("form pages need submit: %v", c)
	}
	m.UI.Pages["new"] = manifest.Page{Type: "form", Schema: "forms/new.schema.json", Submit: "POST /nope"}
	if c := codes(Validate(m, files, ValidateOptions{Tooling: true})); c["ui.pages.new.submit"] != "unknown_route" {
		t.Fatalf("submit must name a declared route: %v", c)
	}
	m.UI.Pages["new"] = manifest.Page{Type: "form", Schema: "forms/new.schema.json", Submit: "POST /assets"}
	if c := codes(Validate(m, files, ValidateOptions{Tooling: true})); len(c) > 0 {
		t.Fatalf("a form with a declared submit route is valid: %v", c)
	}
	// submit defaults to POST, like the console.
	m.UI.Pages["new"] = manifest.Page{Type: "form", Schema: "forms/new.schema.json", Submit: "/assets"}
	if c := codes(Validate(m, files, ValidateOptions{Tooling: true})); len(c) > 0 {
		t.Fatalf("submit without a method means POST: %v", c)
	}
}

// ui.settings.permission names one of the plugin's own permissions; other
// forms cannot take one (the core only checks it on the settings endpoints).
func TestSettingsPermission(t *testing.T) {
	m := uiManifest()
	files := map[string][]byte{"settings.schema.json": []byte("{}")}
	m.UI.Settings = &manifest.Form{Mode: "schema", Schema: "settings.schema.json", Permission: "assets:read"}
	if c := codes(Validate(m, files, ValidateOptions{Tooling: true})); len(c) > 0 {
		t.Fatalf("a declared permission is valid: %v", c)
	}
	m.UI.Settings.Permission = "assets:write"
	if c := codes(Validate(m, files, ValidateOptions{Tooling: true})); c["ui.settings.permission"] != "unknown" {
		t.Fatalf("an undeclared permission must be rejected: %v", c)
	}
	m.UI.Settings.Permission = ""
	m.AccountTypes = []manifest.AccountType{{Form: manifest.Form{Permission: "assets:read"}}}
	if c := codes(Validate(m, files, ValidateOptions{Tooling: true})); c["accountTypes[0].form.permission"] != "unsupported" {
		t.Fatalf("only ui.settings takes a permission: %v", c)
	}
}

// Native settings edited on the plugin's own page may carry the schema the
// core validates and masks with (CONTRACTS §75.5); other forms may not, and
// the page must be one of the plugin's native pages.
func TestNativeSettingsWithSchema(t *testing.T) {
	m := uiManifest()
	m.HostPermissions = append(m.HostPermissions, manifest.HostPermission{ID: "ui.native"})
	m.UI.Native = &manifest.NativeUI{Entry: "ui/native/entry.js"}
	m.HostUICompat = "^3.3"
	m.UI.Pages["dash"] = manifest.Page{Type: "native", Component: "Dash"}
	files := map[string][]byte{"settings.schema.json": []byte("{}"), "ui/native/entry.js": []byte("")}
	m.UI.Settings = &manifest.Form{Mode: "native", Page: "dash", Schema: "settings.schema.json"}
	if c := codes(Validate(m, files, ValidateOptions{Tooling: true})); len(c) > 0 {
		t.Fatalf("native settings with a schema on a native page are valid: %v", c)
	}
	m.UI.Settings.Schema = "missing.json"
	if c := codes(Validate(m, files, ValidateOptions{Tooling: true})); c["ui.settings.schema"] == "" {
		t.Fatalf("the schema file must exist: %v", c)
	}
	m.UI.Settings.Schema = "settings.schema.json"
	m.UI.Settings.Page = "assets"
	if c := codes(Validate(m, files, ValidateOptions{Tooling: true})); c["ui.settings.page"] != "unknown" {
		t.Fatalf("the page must be a native page: %v", c)
	}
	m.UI.Settings = nil
	m.AccountTypes = []manifest.AccountType{{Form: manifest.Form{Mode: "native", Component: "X", Schema: "settings.schema.json"}}}
	if c := codes(Validate(m, files, ValidateOptions{Tooling: true})); c["accountTypes[0].form.schema"] != "unsupported" {
		t.Fatalf("only ui.settings may carry a schema in native mode: %v", c)
	}
}

// The core installs on hostCompat alone, so a native UI that needs UI 3.4
// must not admit core 0.1.228 (UI 3.3), where the console would refuse it.
func TestHostUICompatNeedsMatchingHostCompat(t *testing.T) {
	cases := []struct {
		ui, host string
		bad      bool
	}{
		{"^3.4", ">=0.1.222 <0.2.0", true},
		{"^3.5", ">=0.1.154 <0.2.0", true},
		{"^3.4", ">=0.1.229 <0.2.0", false},
		{"^3.4", ">=0.1.230 <0.2.0", false},
		{"^3.3", ">=0.1.222 <0.2.0", false},
		{"~3.4.2", ">=0.1.222 <0.2.0", true},
		{"^3.0", ">=0.1.0 <0.2.0", false},
		{">=0.1.0 <0.2.0", ">=0.1.0 <0.2.0", false},
		// UI 3.6 starts at core 0.1.256; 0.1.255 is the last core with 3.5.
		{"^3.6", ">=0.1.229 <0.2.0", true},
		{"^3.6", ">=0.1.254 <0.2.0", true},
		{"^3.6", ">=0.1.255 <0.2.0", true},
		{"^3.6", ">=0.1.256 <0.2.0", false},
		{"~3.6.1", ">=0.1.240 <0.2.0", true},
		{"^3.5", ">=0.1.229 <0.2.0", false},
	}
	for _, tc := range cases {
		c := uiCodes(uiNativeManifest(tc.ui, tc.host))
		if got := c["hostCompat"] == "below_ui_core"; got != tc.bad {
			t.Errorf("hostUICompat %s, hostCompat %s: below_ui_core = %v, want %v (%v)", tc.ui, tc.host, got, tc.bad, c)
		}
		if !tc.bad && len(c) > 0 {
			t.Errorf("hostUICompat %s, hostCompat %s must be valid: %v", tc.ui, tc.host, c)
		}
	}
}

// uiNativeManifest is uiManifest with a native UI on the given hostUICompat
// and hostCompat, the shape slot declarations need.
func uiNativeManifest(uiCompat, hostCompat string) *manifest.Manifest {
	m := uiManifest()
	m.HostPermissions = append(m.HostPermissions, manifest.HostPermission{ID: "ui.native"})
	m.UI.Native = &manifest.NativeUI{Entry: "ui/native/entry.js"}
	m.HostUICompat, m.HostCompat = uiCompat, hostCompat
	return m
}

// account.list.toolbar is a UI 3.6 slot: a core before 0.1.256 would ignore
// it, so declaring it holds hostCompat to the 3.6 floor whatever hostUICompat
// says. Unknown slot names stay rejected.
func TestSlotNames(t *testing.T) {
	for _, slot := range []string{"dashboard.widgets", "account.detail.tabs", "account.form.widgets", "account.list.weight", "account.list.toolbar"} {
		m := uiNativeManifest("^3.3", ">=0.1.256 <0.2.0")
		m.UI.Slots = []manifest.Slot{{Slot: slot, Component: "X", Permission: "assets:read"}}
		if c := uiCodes(m); len(c) > 0 {
			t.Errorf("slot %q must be accepted: %v", slot, c)
		}
	}
	m := uiNativeManifest("^3.3", ">=0.1.256 <0.2.0")
	m.UI.Slots = []manifest.Slot{{Slot: "account.list.footer", Component: "X"}}
	if c := uiCodes(m); c["ui.slots[0].slot"] != "invalid" {
		t.Fatalf("an unknown slot must be rejected: %v", c)
	}
	m = uiNativeManifest("^3.3", ">=0.1.229 <0.2.0")
	m.UI.Slots = []manifest.Slot{{Slot: "account.list.toolbar", Component: "X"}}
	if c := uiCodes(m); c["hostCompat"] != "below_ui_core" {
		t.Fatalf("account.list.toolbar needs core 0.1.256: %v", c)
	}
	m.UI.Slots[0].Slot = "account.list.weight"
	if c := uiCodes(m); len(c) > 0 {
		t.Fatalf("a UI 3.4 slot is fine on core 0.1.229: %v", c)
	}
}

// withAccountAction adds a POST /assets/reset admin route (plus two
// parameterized ones) and one account action over it to the ui fixture (no
// ui.native: actions need none).
func withAccountAction(hostCompat string, act manifest.AccountAction) *manifest.Manifest {
	m := uiManifest()
	m.HostCompat = hostCompat
	m.HostPermissions = append(m.HostPermissions, manifest.HostPermission{ID: "routes.public"})
	m.UserPermissions = append(m.UserPermissions, manifest.UserPermission{Key: "assets:manage", Label: manifest.LocalizedText{"en": "Manage assets"}})
	m.Routes = append(m.Routes,
		manifest.Route{Method: "POST", Path: "/assets/reset", Scope: "admin", Permission: "assets:manage"},
		manifest.Route{Method: "POST", Path: "/assets/:id/reset", Scope: "admin", Permission: "assets:manage"},
		manifest.Route{Method: "POST", Path: "/assets/*rest", Scope: "admin", Permission: "assets:manage"},
		manifest.Route{Method: "POST", Path: "/assets/ping", Scope: "public"})
	m.UI.AccountActions = []manifest.AccountAction{act}
	return m
}

// ui.accountActions: each entry names a declared POST admin route carrying
// the same permission, so the menu shows exactly what the route allows.
func TestAccountActions(t *testing.T) {
	good := manifest.AccountAction{ID: "reset", Label: manifest.LocalizedText{"en": "Reset"}, Icon: "refresh",
		Permission: "assets:manage", Route: "POST /assets/reset", Bulk: true, Confirm: manifest.LocalizedText{"en": "Reset {n}?"}}
	if c := uiCodes(withAccountAction(">=0.1.256 <0.2.0", good)); len(c) > 0 {
		t.Fatalf("a valid action was rejected: %v", c)
	}
	// Declaring one needs the UI 3.6 core even without ui.native.
	if c := uiCodes(withAccountAction(">=0.1.229 <0.2.0", good)); c["hostCompat"] != "below_ui_core" {
		t.Fatalf("an action needs core 0.1.256: %v", c)
	}
	m := withAccountAction(">=0.1.256 <0.2.0", good)
	m.UI.AccountActions = append(m.UI.AccountActions, good)
	if c := uiCodes(m); c["ui.accountActions[1].id"] != "duplicate" {
		t.Fatalf("a repeated id must be rejected: %v", c)
	}
	cases := []struct {
		name   string
		mutate func(*manifest.AccountAction)
		field  string
		code   string
	}{
		{"bad id", func(a *manifest.AccountAction) { a.ID = "Reset!" }, "id", "invalid_format"},
		{"no label", func(a *manifest.AccountAction) { a.Label = nil }, "label", "required"},
		{"unknown icon", func(a *manifest.AccountAction) { a.Icon = "refrsh" }, "icon", "unknown_icon"},
		{"no permission", func(a *manifest.AccountAction) { a.Permission = "" }, "permission", "required"},
		{"unknown permission", func(a *manifest.AccountAction) { a.Permission = "assets:write" }, "permission", "unknown"},
		{"not a route ref", func(a *manifest.AccountAction) { a.Route = "POST assets/reset" }, "route", "invalid_route_ref"},
		{"undeclared route", func(a *manifest.AccountAction) { a.Route = "POST /assets/nope" }, "route", "unknown_route"},
		{"GET route", func(a *manifest.AccountAction) { a.Route = "GET /assets" }, "route", "invalid"},
		{"public route", func(a *manifest.AccountAction) { a.Route = "POST /assets/ping" }, "route", "invalid"},
		{"route permission differs", func(a *manifest.AccountAction) { a.Permission = "assets:read" }, "route", "permission_mismatch"},
		{"param route", func(a *manifest.AccountAction) { a.Route = "POST /assets/:id/reset" }, "route", "parameterized_route"},
		{"wildcard route", func(a *manifest.AccountAction) { a.Route = "POST /assets/*rest" }, "route", "parameterized_route"},
		{"visibleFor bad", func(a *manifest.AccountAction) { a.VisibleFor = "owners" }, "visibleFor", "invalid"},
	}
	for _, tc := range cases {
		act := good
		tc.mutate(&act)
		if c := uiCodes(withAccountAction(">=0.1.256 <0.2.0", act)); c["ui.accountActions[0]."+tc.field] != tc.code {
			t.Errorf("%s: want %s = %s, got %v", tc.name, tc.field, tc.code, c)
		}
	}
	// Like a form submit, the method may be left out and means POST.
	act := good
	act.Route = "/assets/reset"
	if c := uiCodes(withAccountAction(">=0.1.256 <0.2.0", act)); len(c) > 0 {
		t.Fatalf("a bare path means POST: %v", c)
	}
	// visibleFor takes its two values; empty means "editable".
	for _, vf := range []string{"editable", "all", ""} {
		act := good
		act.VisibleFor = vf
		if c := uiCodes(withAccountAction(">=0.1.256 <0.2.0", act)); len(c) > 0 {
			t.Errorf("visibleFor %q is valid: %v", vf, c)
		}
	}
}

// page.search is what makes the host render a search box at all.
func TestPageSearchDeclaration(t *testing.T) {
	set := func(m *manifest.Manifest, mutate func(*manifest.Page)) {
		pg := m.UI.Pages["assets"]
		mutate(&pg)
		m.UI.Pages["assets"] = pg
	}

	m := uiManifest()
	set(m, func(p *manifest.Page) { p.Search = "q" })
	if c := uiCodes(m); len(c) > 0 {
		t.Fatalf(`search "q" on a table page is valid: %v`, c)
	}

	// A name a client could not send, or one the plugin could not read back.
	for _, bad := range []string{"-q", "a b", "q=1", strings.Repeat("q", 65), "?q"} {
		m := uiManifest()
		set(m, func(p *manifest.Page) { p.Search = bad })
		if c := uiCodes(m); c["ui.pages.assets.search"] != "invalid_format" {
			t.Errorf("search %q must be rejected: %v", bad, c)
		}
	}

	// The table sends page/page_size itself; a search box bound to one of them
	// would overwrite the page number on every keystroke.
	for _, reserved := range []string{"page", "page_size", "PAGE_SIZE"} {
		m := uiManifest()
		set(m, func(p *manifest.Page) { p.Search = reserved })
		if c := uiCodes(m); c["ui.pages.assets.search"] != "reserved_param" {
			t.Errorf("search %q collides with the table's own parameters: %v", reserved, c)
		}
	}

	// Only a table page has a search box; anywhere else the declaration would
	// be read by nobody, which is the shape the field exists to stop.
	m = uiManifest()
	m.Routes = append(m.Routes, manifest.Route{Method: "POST", Path: "/assets", Scope: "admin", Permission: "assets:read"})
	m.UI.Menus[0].Page = "new"
	m.UI.Pages = map[string]manifest.Page{
		"new": {Type: "form", Schema: "forms/new.schema.json", Submit: "POST /assets", Search: "q"},
	}
	c := codes(Validate(m, map[string][]byte{"forms/new.schema.json": []byte("{}")}, ValidateOptions{Tooling: true}))
	if c["ui.pages.new.search"] != "unsupported" {
		t.Fatalf("search on a form page must be rejected: %v", c)
	}
}

func TestParseRouteRef(t *testing.T) {
	cases := []struct {
		ref, def     string
		method, path string
		ok           bool
	}{
		{"GET /models", "GET", "GET", "/models", true},
		{"get /models", "GET", "GET", "/models", true},
		{"  POST   /assets  ", "GET", "POST", "/assets", true},
		{"/models", "GET", "GET", "/models", true},
		{"/assets", "POST", "POST", "/assets", true},
		{"DELETE /assets/:id", "GET", "DELETE", "/assets/:id", true},
		{"", "GET", "", "", false},
		{"models", "GET", "", "", false},
		{"HEAD /models", "GET", "", "", false},
		{"GET /a b", "GET", "", "", false},
		{"GET", "GET", "", "", false},
	}
	for _, tc := range cases {
		method, path, ok := ParseRouteRef(tc.ref, tc.def)
		if ok != tc.ok || method != tc.method || path != tc.path {
			t.Errorf("ParseRouteRef(%q, %q) = (%q, %q, %v), want (%q, %q, %v)",
				tc.ref, tc.def, method, path, ok, tc.method, tc.path, tc.ok)
		}
	}
}
