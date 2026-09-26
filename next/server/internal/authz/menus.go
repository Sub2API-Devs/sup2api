package authz

import (
	"cmp"
	"context"
	"sort"
	"strings"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// MenuItem is one sidebar entry.
type MenuItem struct {
	ID        string             `json:"id"`
	Label     core.LocalizedText `json:"label"`
	Icon      string             `json:"icon"`
	Path      string             `json:"path"`
	PluginKey string             `json:"plugin_key,omitempty"`
}

// MenuSection is one sidebar section.
type MenuSection struct {
	Section string             `json:"section"`
	Label   core.LocalizedText `json:"label"`
	Items   []MenuItem         `json:"items"`
}

type coreMenuItem struct {
	id    string
	label core.LocalizedText
	icon  string // console icon name (see web/)
	path  string
	// anyOf lists the permissions granting visibility; empty = any user.
	anyOf []string
}

type coreMenuSection struct {
	id    string
	label core.LocalizedText
	items []coreMenuItem
}

// coreMenus follows ARCHITECTURE appendix A.1.
var coreMenus = []coreMenuSection{
	{"overview", lt("Overview", "概览"), []coreMenuItem{
		{"dashboard", lt("Overview", "概览"), "dashboard", "/dashboard", nil},
	}},
	{"gateway", lt("Gateway", "网关"), []coreMenuItem{
		{"groups", lt("Groups", "分组"), "group", "/groups", []string{"group:read"}},
		{"accounts", lt("Accounts", "账号"), "account", "/accounts", []string{"account:read", "account:own:read", "account:own:create"}},
		{"proxies", lt("Proxies", "代理"), "proxy", "/proxies", []string{"proxy:read", "proxy:own:read", "proxy:own:manage"}},
		{"prices", lt("Model prices", "模型价格"), "price", "/prices", []string{"price:read"}},
		{"usage", lt("Usage records", "使用记录"), "usage", "/usage", []string{"usage:all:read"}},
		{"sticky", lt("Sticky sessions", "粘性会话"), "sticky", "/sticky", []string{"sticky:read"}},
	}},
	// No core items: the all-user ledger (/ledger) is opened from the users
	// page. The section stays so plugin menus can still target "finance".
	{"finance", lt("Finance", "财务"), nil},
	{"system", lt("System", "系统"), []coreMenuItem{
		{"users", lt("Users", "用户"), "user", "/users", []string{"user:read"}},
		{"api-keys", lt("API keys", "API Key"), "key", "/api-keys", []string{"apikey:all:read"}},
		{"platforms", lt("Platforms", "平台"), "globe", "/platforms", []string{"account:read", "account:own:read", "account:own:create"}},
		{"roles", lt("Roles & permissions", "角色与权限"), "role", "/roles", []string{"role:read"}},
		{"plugins", lt("Plugins", "插件"), "plugin", "/plugins", []string{"plugin:read"}},
		{"market", lt("Plugin market", "插件市场"), "market", "/market", []string{"plugin:market:read"}},
		{"publishers", lt("Publishers", "发布者"), "publisher", "/publishers", []string{"publisher:read"}},
		{"nodes", lt("Cluster nodes", "集群节点"), "node", "/nodes", []string{"node:read"}},
		{"settings", lt("Settings", "设置"), "settings", "/settings", []string{"settings:read"}},
	}},
	{"me", lt("Mine", "我的"), []coreMenuItem{
		{"my-api-keys", lt("API keys", "API Key"), "key", "/me/api-keys", []string{"apikey:self:manage"}},
		{"my-usage", lt("My usage", "我的用量"), "chart", "/me/usage", []string{"usage:self:read"}},
		{"my-ledger", lt("Usage records", "使用记录"), "ledger", "/me/ledger", []string{"balance:self:read"}},
	}},
}

// Core sections are placed by these orders; plugin sections (manifest
// ui.sections) interleave with them by their own order.
var coreSectionOrder = map[string]int{"overview": 100, "gateway": 200, "finance": 300, "system": 400, "me": 500, "plugins": 600}

// Menus builds the sidebar of userID: core menus filtered by permission,
// plugin menus appended to the core section they name, plugin-declared
// sections placed by order, and the shared "plugins" section last (600).
func (s *Service) Menus(ctx context.Context, userID int64) ([]MenuSection, error) {
	set, err := s.PermissionSet(ctx, userID)
	if err != nil {
		return nil, err
	}
	type section struct {
		MenuSection
		order int
	}
	var out []section
	byKey := map[string]int{}
	add := func(key string, label core.LocalizedText, order int) int {
		if i, ok := byKey[key]; ok {
			return i
		}
		out = append(out, section{MenuSection{Section: key, Label: label, Items: []MenuItem{}}, order})
		byKey[key] = len(out) - 1
		return len(out) - 1
	}
	for _, sec := range coreMenus {
		i := add(sec.id, sec.label, coreSectionOrder[sec.id])
		for _, it := range sec.items {
			if !hasAny(set, it.anyOf) {
				continue
			}
			out[i].Items = append(out[i].Items, MenuItem{ID: it.id, Label: it.label, Icon: it.icon, Path: it.path})
		}
	}
	for _, pm := range s.pluginMenus(set) {
		i := add(pm.sectionKey, pm.sectionLabel, pm.sectionOrder)
		out[i].Items = append(out[i].Items, pm.MenuItem)
	}
	sort.SliceStable(out, func(i, j int) bool { return out[i].order < out[j].order })
	res := make([]MenuSection, 0, len(out))
	for _, sec := range out {
		if len(sec.Items) > 0 {
			res = append(res, sec.MenuSection)
		}
	}
	return res, nil
}

// pluginMenu is a plugin menu item with the section it goes to: a core
// section, the plugin's own section (key "<plugin>:<section>") or "plugins".
type pluginMenu struct {
	MenuItem
	sectionKey   string
	sectionLabel core.LocalizedText
	sectionOrder int
	order        int
}

func (s *Service) pluginMenus(set core.PermissionSet) []pluginMenu {
	if s.plugins == nil {
		return nil
	}
	gen := s.plugins.Current()
	if gen == nil {
		return nil
	}
	var list []pluginMenu
	for _, p := range gen.Plugins() {
		if p.Manifest == nil || p.Manifest.UI == nil {
			continue
		}
		for _, m := range p.Manifest.UI.Menus {
			if m.Permission != "" && !set.Has(PluginPermissionKey(p.Key, m.Permission)) {
				continue
			}
			label := core.LocalizedText(m.Label)
			if label == nil {
				label = core.LocalizedText{"en": m.ID}
			}
			pm := pluginMenu{MenuItem: MenuItem{
				ID:        p.Key + ":" + m.ID,
				Label:     label,
				Icon:      cmp.Or(m.Icon, "puzzle"),
				Path:      "/p/" + p.Key + "/" + strings.TrimPrefix(m.Page, "/"),
				PluginKey: p.Key,
			}, order: m.Order}
			switch {
			case m.Section == "plugins" || m.Section == "":
				pm.sectionKey, pm.sectionLabel, pm.sectionOrder = "plugins", lt("Plugins", "插件"), coreSectionOrder["plugins"]
			case coreSectionOrder[m.Section] != 0:
				pm.sectionKey, pm.sectionOrder = m.Section, coreSectionOrder[m.Section]
				for _, cs := range coreMenus {
					if cs.id == m.Section {
						pm.sectionLabel = cs.label
					}
				}
			default:
				pm.sectionKey = p.Key + ":" + m.Section
				pm.sectionLabel, pm.sectionOrder = core.LocalizedText{"en": m.Section}, coreSectionOrder["plugins"]
				for _, sec := range p.Manifest.UI.Sections {
					if sec.ID == m.Section {
						if l := core.LocalizedText(sec.Label); l != nil {
							pm.sectionLabel = l
						}
						if sec.Order != 0 {
							pm.sectionOrder = sec.Order
						}
					}
				}
			}
			list = append(list, pm)
		}
	}
	sort.SliceStable(list, func(i, j int) bool {
		if list[i].order != list[j].order {
			return list[i].order < list[j].order
		}
		return list[i].ID < list[j].ID
	})
	return list
}

func hasAny(set core.PermissionSet, perms []string) bool {
	if len(perms) == 0 {
		return true
	}
	for _, p := range perms {
		if set.Has(p) {
			return true
		}
	}
	return false
}
