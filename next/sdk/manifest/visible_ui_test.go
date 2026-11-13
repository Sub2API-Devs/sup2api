package manifest

import (
	"slices"
	"strings"
	"testing"
)

// menusAndPages is FilterUI for the tests which only look at those two.
func menusAndPages(ui *UI, allowed, allowedCore func(string) bool) ([]Menu, map[string]Page) {
	v := FilterUI(ui, allowed, allowedCore)
	return v.Menus, v.Pages
}

// Slots and account actions show by their own permission; an element naming
// none is visible without asking, and nothing in the result is nil.
func TestFilterUISlotsAndAccountActions(t *testing.T) {
	ui := &UI{
		Menus:          []Menu{{ID: "open", Page: "open"}, {ID: "stats", Page: "stats", Permission: "stats:read"}},
		Slots:          []Slot{{Slot: "dashboard.cards"}, {Slot: "account.detail", Permission: "stats:read"}},
		AccountActions: []AccountAction{{ID: "ping"}, {ID: "purge", Permission: "rules:manage"}},
	}
	var asked []string
	holds := func(want ...string) func(string) bool {
		return func(p string) bool { asked = append(asked, p); return slices.Contains(want, p) }
	}
	v := FilterUI(ui, holds("stats:read"), noCore)
	if len(v.Menus) != 2 || len(v.Slots) != 2 || len(v.AccountActions) != 1 || v.AccountActions[0].ID != "ping" {
		t.Fatalf("stats reader: %+v", v)
	}
	v = FilterUI(ui, holds(), noCore)
	if len(v.Menus) != 1 || v.Menus[0].ID != "open" || len(v.Slots) != 1 || v.Slots[0].Slot != "dashboard.cards" || len(v.AccountActions) != 1 {
		t.Fatalf("no permission: %+v", v)
	}
	if slices.Contains(asked, "") {
		t.Fatalf("an element without a permission must not be asked about: %q", asked)
	}
	for _, v := range []VisibleUI{FilterUI(nil, holds(), noCore), FilterUI(&UI{}, holds(), noCore)} {
		if v.Menus == nil || v.Pages == nil || v.Slots == nil || v.AccountActions == nil ||
			len(v.Menus)+len(v.Pages)+len(v.Slots)+len(v.AccountActions) != 0 {
			t.Fatalf("empty ui: %+v", v)
		}
	}
}

// A table's "New" link replaces a sidebar entry for its form page: callers
// without the link's permission see neither the link nor the form, while a
// visible menu to the form keeps it.
func TestFilterUICreateLink(t *testing.T) {
	ui := &UI{
		Menus: []Menu{{ID: "assets", Page: "assets", Permission: "assets:read"}},
		Pages: map[string]Page{
			"assets":    {Type: "table", Create: &PageLink{Page: "new_asset", Permission: "assets:manage"}},
			"new_asset": {Type: "form"},
			"about":     {Type: "form"},
		},
	}
	can := func(perms ...string) func(string) bool {
		return func(p string) bool {
			if p == "" {
				return true
			}
			for _, x := range perms {
				if x == p {
					return true
				}
			}
			return false
		}
	}
	menus, pages := menusAndPages(ui, can("assets:read", "assets:manage"), noCore)
	if len(menus) != 1 || pages["assets"].Create == nil || pages["assets"].Create.Page != "new_asset" || len(pages) != 3 {
		t.Fatalf("manager: menus=%v pages=%v", menus, pages)
	}
	_, pages = menusAndPages(ui, can("assets:read"), noCore)
	if _, ok := pages["new_asset"]; ok || pages["assets"].Create != nil || len(pages) != 2 {
		t.Fatalf("reader: pages=%v", pages)
	}
	if ui.Pages["assets"].Create == nil {
		t.Fatal("filtering must not change the manifest")
	}
	ui.Menus = append(ui.Menus, Menu{ID: "new", Page: "new_asset"})
	if _, pages = menusAndPages(ui, can("assets:read"), noCore); pages["new_asset"].Type != "form" || pages["assets"].Create != nil {
		t.Fatalf("a visible menu keeps the form, not the link: %v", pages)
	}
}

// Two tables open the same form under different permissions: the link the
// caller may use keeps the form, whichever table is denied.
func TestFilterUISharedCreateForm(t *testing.T) {
	ui := &UI{
		Pages: map[string]Page{
			"mine":     {Type: "table", Create: &PageLink{Page: "new_item", Permission: "items:own:create"}},
			"all":      {Type: "table", Create: &PageLink{Page: "new_item", Permission: "items:manage"}},
			"new_item": {Type: "form"},
		},
	}
	own := func(p string) bool { return p == "items:own:create" }
	_, pages := menusAndPages(ui, own, noCore)
	if _, ok := pages["new_item"]; !ok || pages["mine"].Create == nil || pages["all"].Create != nil {
		t.Fatalf("own creator: pages=%v", pages)
	}
	_, pages = menusAndPages(ui, func(string) bool { return false }, noCore)
	if _, ok := pages["new_item"]; ok || pages["mine"].Create != nil || pages["all"].Create != nil {
		t.Fatalf("no create permission: pages=%v", pages)
	}
}

// A table hidden by its menu's permission does not reveal the form its
// "New" link opens, even when the link itself needs no permission.
func TestFilterUIHiddenTableHidesCreateForm(t *testing.T) {
	ui := &UI{
		Menus: []Menu{{ID: "a", Page: "items", Permission: "items:read"}},
		Pages: map[string]Page{
			"items":    {Type: "table", Create: &PageLink{Page: "new_item"}},
			"new_item": {Type: "form"},
		},
	}
	menus, pages := menusAndPages(ui, func(p string) bool { return p == "" }, noCore)
	if len(menus) != 0 || len(pages) != 0 {
		t.Fatalf("caller without items:read: menus=%v pages=%v", menus, pages)
	}
	_, pages = menusAndPages(ui, func(p string) bool { return p == "" || p == "items:read" }, noCore)
	if _, ok := pages["new_item"]; !ok || pages["items"].Create == nil {
		t.Fatalf("reader: pages=%v", pages)
	}
}

// noCore is a caller holding no core permission.
func noCore(string) bool { return false }

// A page's nav keeps only the sections the caller may see: a plugin
// permission, a core one (either suffices) or none. A group left empty is
// dropped, and a nav with nothing left goes away; the manifest is untouched.
func TestFilterUINav(t *testing.T) {
	ui := &UI{Pages: map[string]Page{
		"panel": {Type: "native", Nav: &PageNav{Groups: []NavGroup{
			{Key: "rules", Items: []NavItem{
				{Key: "words", Permission: "rules:manage"},
				{Key: "models", Permission: "rules:manage", CorePermission: "settings:manage"},
				{Key: "about"},
			}},
			{Key: "logs", Items: []NavItem{{Key: "hits", Permission: "logs:read"}}},
		}}},
	}}
	keys := func(nav *PageNav) string {
		if nav == nil {
			return "<nil>"
		}
		var parts []string
		for _, g := range nav.Groups {
			var items []string
			for _, it := range g.Items {
				items = append(items, it.Key)
			}
			parts = append(parts, g.Key+":"+strings.Join(items, ","))
		}
		return strings.Join(parts, " ")
	}
	is := func(want ...string) func(string) bool {
		return func(p string) bool { return p == "" || slices.Contains(want, p) }
	}
	cases := []struct {
		name          string
		allowed, core func(string) bool
		want          string
	}{
		{"everything", is("rules:manage", "logs:read"), noCore, "rules:words,models,about logs:hits"},
		{"core permission alone", is(), is("settings:manage"), "rules:models,about"},
		{"empty group dropped", is(), noCore, "rules:about"},
	}
	for _, tc := range cases {
		_, pages := menusAndPages(ui, tc.allowed, tc.core)
		if got := keys(pages["panel"].Nav); got != tc.want {
			t.Errorf("%s: nav = %s, want %s", tc.name, got, tc.want)
		}
	}
	if got := keys(ui.Pages["panel"].Nav); got != "rules:words,models,about logs:hits" {
		t.Fatalf("filtering must not change the manifest: %s", got)
	}

	// With every item hidden the nav goes away rather than leaving an
	// empty sidebar.
	ui.Pages["panel"].Nav.Groups[0].Items = ui.Pages["panel"].Nav.Groups[0].Items[:2]
	if _, pages := menusAndPages(ui, is(), noCore); pages["panel"].Nav != nil {
		t.Fatalf("nothing visible: nav = %s", keys(pages["panel"].Nav))
	}
}
