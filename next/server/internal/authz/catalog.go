package authz

import (
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// Built-in role keys.
const (
	RoleSuperAdmin = "super_admin"
	RoleAdmin      = "admin"
	RoleUser       = "user"
)

type coreModule struct {
	key   string
	label core.LocalizedText
	perms []corePerm
}

type corePerm struct {
	key       string
	en, zh    string
	sensitive bool
}

func lt(en, zh string) core.LocalizedText { return core.LocalizedText{"en": en, "zh": zh} }

// coreModules is the core permission catalog (docs/CONTRACTS.md §4). The order
// here defines the sort order shown in the role editor.
var coreModules = []coreModule{
	{"user", lt("Users", "用户"), []corePerm{
		{"user:read", "View users", "查看用户", false},
		{"user:create", "Create users", "新建用户", false},
		{"user:update", "Edit users", "编辑用户", false},
		{"user:delete", "Delete users", "删除用户", true},
	}},
	{"role", lt("Roles", "角色"), []corePerm{
		{"role:read", "View roles and permissions", "查看角色与权限", false},
		{"role:manage", "Manage roles and assignments", "管理角色与分配", true},
	}},
	{"apikey", lt("API keys", "API Key"), []corePerm{
		{"apikey:self:manage", "Manage own API keys", "管理自己的 API Key", false},
		{"apikey:all:read", "View all API keys", "查看全部 API Key", false},
		{"apikey:all:manage", "Manage all API keys", "管理全部 API Key", false},
	}},
	{"group", lt("Groups", "分组"), []corePerm{
		{"group:read", "View groups", "查看分组", false},
		{"group:manage", "Manage groups", "管理分组", false},
	}},
	{"account", lt("Accounts", "账号"), []corePerm{
		{"account:read", "View accounts", "查看账号", false},
		{"account:create", "Create accounts", "新建账号", false},
		{"account:update", "Edit accounts", "编辑账号", false},
		{"account:delete", "Delete accounts", "删除账号", true},
		{"account:test", "Test accounts", "测试账号", false},
		{"account:credential:view", "View account credentials", "查看账号凭证", true},
		// Ownership (CONTRACTS §21): "own" keys only reach accounts the caller
		// created; a full key above overrides its own counterpart.
		{"account:own:read", "Read own accounts", "查看自己创建的账号", false},
		{"account:own:create", "Create own accounts", "新建账号（归自己所有）", false},
		{"account:own:update", "Edit own accounts", "编辑自己创建的账号", false},
		{"account:own:delete", "Delete own accounts", "删除自己创建的账号", false},
		{"account:own:test", "Test own accounts", "测试自己创建的账号", false},
		{"account:own:credential:view", "View own account credentials", "查看自己创建账号的凭证", true},
		{"account:settings:custom", "Custom guarded settings (e.g. base URL)", "自定义受限设置（如 Base URL）", false},
	}},
	{"proxy", lt("Proxies", "代理"), []corePerm{
		{"proxy:read", "View proxies", "查看代理", false},
		{"proxy:manage", "Manage proxies", "管理代理", false},
		{"proxy:own:read", "View own proxies", "查看自己创建的代理", false},
		{"proxy:own:manage", "Manage own proxies", "管理自己创建的代理", false},
	}},
	{"price", lt("Model prices", "模型价格"), []corePerm{
		{"price:read", "View model prices", "查看模型价格", false},
		{"price:manage", "Manage model prices", "管理模型价格", false},
	}},
	{"balance", lt("Balance", "余额"), []corePerm{
		{"balance:self:read", "View own balance", "查看自己的余额", false},
		{"balance:all:read", "View all balances", "查看全部余额", false},
		{"balance:adjust", "Adjust balances", "调整余额", true},
	}},
	{"usage", lt("Usage", "使用记录"), []corePerm{
		{"usage:self:read", "View own usage", "查看自己的用量", false},
		{"usage:all:read", "View all usage", "查看全部使用记录", false},
	}},
	{"sticky", lt("Sticky sessions", "粘性会话"), []corePerm{
		{"sticky:read", "View sticky sessions", "查看粘性会话", false},
		{"sticky:manage", "Manage sticky sessions", "管理粘性会话", false},
	}},
	{"plugin", lt("Plugins", "插件"), []corePerm{
		{"plugin:read", "View plugins", "查看插件", false},
		{"plugin:install", "Install plugins", "安装插件", true},
		{"plugin:manage", "Manage plugins", "管理插件", false},
		{"plugin:uninstall", "Uninstall plugins", "卸载插件", true},
		{"plugin:grant:high", "Grant high-risk plugin permissions", "授予插件高风险权限", false},
		{"plugin:grant:critical", "Grant critical plugin permissions", "授予插件关键权限", true},
		{"plugin:egress:read", "View plugin egress traffic", "查看插件出口流量", false},
		{"plugin:market:read", "Browse the plugin market", "浏览插件市场", false},
	}},
	{"publisher", lt("Publishers", "发布者"), []corePerm{
		{"publisher:read", "View publishers", "查看发布者", false},
		{"publisher:manage", "Manage publishers and keys", "管理发布者与密钥", true},
	}},
	{"node", lt("Cluster", "集群"), []corePerm{
		{"node:read", "View cluster nodes", "查看集群节点", false},
	}},
	{"gateway", lt("Gateway", "网关"), []corePerm{
		{"gateway:use", "Call the gateway", "调用网关", false},
	}},
	{"settings", lt("Settings", "设置"), []corePerm{
		{"settings:read", "View settings", "查看设置", false},
		{"settings:manage", "Manage settings", "管理设置", false},
	}},
}

// userRolePermissions are granted to the built-in "user" role.
var userRolePermissions = []string{"apikey:self:manage", "balance:self:read", "usage:self:read", "gateway:use"}

type builtinRole struct {
	key         string
	name        core.LocalizedText
	description core.LocalizedText
	superuser   bool
}

var builtinRoles = []builtinRole{
	{RoleSuperAdmin, lt("Super admin", "超级管理员"), lt("Has every permission, including future ones", "拥有全部权限（包括以后新增的）"), true},
	{RoleAdmin, lt("Admin", "管理员"), lt("All core permissions by default", "默认拥有全部核心权限"), false},
	{RoleUser, lt("User", "普通用户"), lt("Own API keys, usage and balance; gateway access", "管理自己的 API Key、查看自己的用量和余额、调用网关"), false},
}

// CorePermissions returns the core catalog as permission definitions.
func CorePermissions() []core.PermissionDef {
	var out []core.PermissionDef
	sort := 0
	for _, m := range coreModules {
		for _, p := range m.perms {
			sort += 10
			out = append(out, core.PermissionDef{
				Key: p.key, Module: m.key, Label: lt(p.en, p.zh),
				Description: core.LocalizedText{}, Sensitive: p.sensitive, Sort: sort,
			})
		}
	}
	return out
}

var (
	coreSensitive    = map[string]bool{}
	coreModuleLabels = map[string]core.LocalizedText{}
	coreModuleOrder  = map[string]int{}
)

func init() {
	for i, m := range coreModules {
		coreModuleLabels[m.key] = m.label
		coreModuleOrder[m.key] = i
		for _, p := range m.perms {
			coreSensitive[p.key] = p.sensitive
		}
	}
}
