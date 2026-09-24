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
		{"accounts", lt("Accounts", "账号"), "account", "/accounts", []string{"account:read"}},
		{"proxies", lt("Proxies", "代理"), "proxy", "/proxies", []string{"proxy:read"}},
		{"prices", lt("Model prices", "模型价格"), "price", "/prices", []string{"price:read"}},
		{"usage", lt("Usage records", "使用记录"), "usage", "/usage", []string{"usage:all:read"}},
		{"sticky", lt("Sticky sessions", "粘性会话"), "sticky", "/sticky", []string{"sticky:read"}},
	}},
	{"finance", lt("Finance", "财务"), []coreMenuItem{
		{"ledger", lt("Balance ledger", "余额流水"), "ledger", "/ledger", []string{"balance:all:read"}},
	}},
	{"system", lt("System", "系统"), []coreMenuItem{
		{"users", lt("Users", "用户"), "user", "/users", []string{"user:read"}},
		{"api-keys", lt("API keys", "API Key"), "key", "/api-keys", []string{"apikey:all:read"}},
		{"platforms", lt("Platforms", "平台"), "globe", "/platforms", []string{"account:read"}},
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
		{"my-balance", lt("My balance", "我的余额"), "balance", "/me/balance", []string{"balance:self:read"}},
	}},
}

// Menus builds the sidebar of userID: core menus filtered by permission,
// then a "plugins" section with plugin menus from the current generation.
func (s *Service) Menus(ctx context.Context, userID int64) ([]MenuSection, error) {
	set, err := s.PermissionSet(ctx, userID)
	if err != nil {
		return nil, err
	}
	out := []MenuSection{}
	for _, sec := range coreMenus {
		items := []MenuItem{}
		for _, it := range sec.items {
			if !hasAny(set, it.anyOf) {
				continue
			}
			items = append(items, MenuItem{ID: it.id, Label: it.label, Icon: it.icon, Path: it.path})
		}
		if len(items) > 0 {
			out = append(out, MenuSection{Section: sec.id, Label: sec.label, Items: items})
		}
	}
	if items := s.pluginMenus(set); len(items) > 0 {
		out = append(out, MenuSection{Section: "plugins", Label: lt("Plugins", "插件"), Items: items})
	}
	return out, nil
}

func (s *Service) pluginMenus(set core.PermissionSet) []MenuItem {
	if s.plugins == nil {
		return nil
	}
	gen := s.plugins.Current()
	if gen == nil {
		return nil
	}
	type ordered struct {
		MenuItem
		order int
	}
	var list []ordered
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
			list = append(list, ordered{MenuItem{
				ID:        p.Key + ":" + m.ID,
				Label:     label,
				Icon:      cmp.Or(m.Icon, "puzzle"),
				Path:      "/p/" + p.Key + "/" + strings.TrimPrefix(m.Page, "/"),
				PluginKey: p.Key,
			}, m.Order})
		}
	}
	sort.SliceStable(list, func(i, j int) bool {
		if list[i].order != list[j].order {
			return list[i].order < list[j].order
		}
		return list[i].ID < list[j].ID
	})
	items := make([]MenuItem, len(list))
	for i := range list {
		items[i] = list[i].MenuItem
	}
	return items
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
