package manifest

// VisibleUI is the part of a plugin's ui one caller may see.
type VisibleUI struct {
	Menus          []Menu
	Pages          map[string]Page
	Slots          []Slot
	AccountActions []AccountAction
}

// FilterUI returns what a caller may see of ui: the one visibility rule of
// the sidebar (GET /me/menus) and of the console extensions (GET
// /ui/plugins). allowed answers for a plugin-local permission key and
// allowedCore for a core key (PageNav items); an element naming no permission
// is visible to everyone, so neither is asked about "". The plugin's routes
// check permissions again; this only decides what is drawn. The result never
// holds nil slices or a nil map, and ui is left untouched (it is shared by
// every caller); a nil ui gives an empty result.
func FilterUI(ui *UI, allowed, allowedCore func(perm string) bool) VisibleUI {
	out := VisibleUI{Menus: []Menu{}, Pages: map[string]Page{}, Slots: []Slot{}, AccountActions: []AccountAction{}}
	if ui == nil {
		return out
	}
	may := func(perm string) bool { return perm == "" || allowed(perm) }
	out.Menus, out.Pages = visibleMenusAndPages(ui, may, allowedCore)
	for _, sl := range ui.Slots {
		if may(sl.Permission) {
			out.Slots = append(out.Slots, sl)
		}
	}
	for _, act := range ui.AccountActions {
		if may(act.Permission) {
			out.AccountActions = append(out.AccountActions, act)
		}
	}
	return out
}

// visibleMenusAndPages filters the menus and pages for one caller.
// A page reached only through menus the caller may not see is dropped; so is
// a table's "New" link the caller may not use, and the form page it opens
// unless a visible menu or another shown table's usable link reaches it (a
// table hidden by its menu's permission makes its link unusable). Pages no
// menu or link names stay (their routes check permissions themselves).
// A kept page's nav loses the sections the caller may not see (see
// visibleNav); allowedCore checks a core permission key.
func visibleMenusAndPages(ui *UI, allowed, allowedCore func(perm string) bool) ([]Menu, map[string]Page) {
	menus := []Menu{}
	pages := map[string]Page{}
	hidden := map[string]bool{}
	visible := map[string]bool{}
	for _, mn := range ui.Menus {
		if allowed(mn.Permission) {
			menus = append(menus, mn)
			visible[mn.Page] = true
		} else {
			hidden[mn.Page] = true
		}
	}
	// A link counts only from a page the menus leave shown: a table the
	// caller cannot see must not reveal the form it opens.
	linkVisible := map[string]bool{}
	linkHidden := map[string]bool{}
	for id, pg := range ui.Pages {
		if pg.Create == nil {
			continue
		}
		if (visible[id] || !hidden[id]) && allowed(pg.Create.Permission) {
			linkVisible[pg.Create.Page] = true
		} else {
			linkHidden[pg.Create.Page] = true
		}
	}
	for id := range linkVisible {
		visible[id] = true
	}
	for id := range linkHidden {
		hidden[id] = true
	}
	shown := func(id string) bool { return visible[id] || !hidden[id] }
	for id, pg := range ui.Pages {
		if !shown(id) {
			continue
		}
		if pg.Create != nil && (!allowed(pg.Create.Permission) || !shown(pg.Create.Page)) {
			pg.Create = nil
		}
		if pg.Nav != nil {
			pg.Nav = visibleNav(pg.Nav, allowed, allowedCore)
		}
		pages[id] = pg
	}
	return menus, pages
}

// visibleNav returns the part of a page's nav the caller may see: an item
// shows when it names no permission or the caller holds its plugin
// permission or its core one. Groups left empty are dropped, and nil means
// nothing is left, so the console falls back to the page's own tabs instead
// of drawing an empty sidebar. The result is a copy: the manifest is shared
// by every caller.
func visibleNav(nav *PageNav, allowed, allowedCore func(perm string) bool) *PageNav {
	var groups []NavGroup
	for _, g := range nav.Groups {
		var items []NavItem
		for _, it := range g.Items {
			if (it.Permission == "" && it.CorePermission == "") ||
				(it.Permission != "" && allowed(it.Permission)) ||
				(it.CorePermission != "" && allowedCore(it.CorePermission)) {
				items = append(items, it)
			}
		}
		if len(items) > 0 {
			g.Items = items
			groups = append(groups, g)
		}
	}
	if len(groups) == 0 {
		return nil
	}
	return &PageNav{Groups: groups}
}
