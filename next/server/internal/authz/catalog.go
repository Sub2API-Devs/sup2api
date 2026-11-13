package authz

import (
	"slices"
	"strings"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// Built-in role keys.
const (
	RoleSuperAdmin = "super_admin"
	RoleAdmin      = "admin"
	RoleOperator   = "operator"
	// RoleSupplier is an add-on role: a supplier holds it next to RoleUser
	// and brings its own accounts and proxies (CONTRACTS §21).
	RoleSupplier = "supplier"
	RoleUser     = "user"
)

type coreModule struct {
	key   string
	label core.LocalizedText
	perms []corePerm
}

type corePerm struct {
	key    string
	en, zh string
	// sensitive flags credentials, money, trust roots, code execution and
	// identity or authorization in the role editor; display only, it has no
	// bearing on access keys.
	sensitive bool
	// superOnly: the permission is in no built-in role's defaults, whatever
	// the role's grants say (builtinRole.accepts), so it is never granted
	// automatically; only the super admin, who alone holds it, grants it
	// explicitly to a role (decision D2).
	superOnly bool
	// sessionOnly keeps the permission out of access keys (KeyAllowed):
	// identity takeover, host-level control, code execution, trust roots and
	// plaintext credentials (CONTRACTS §80).
	sessionOnly bool
	// inherits: when the permission is first created, every role holding
	// one of these keys gets it too (splitting a permission keeps its
	// holders' rights; grantInherited).
	inherits []string
}

func lt(en, zh string) core.LocalizedText { return core.LocalizedText{"en": en, "zh": zh} }

// coreModules is the core permission catalog (docs/CONTRACTS.md §4). The order
// here defines the sort order shown in the role editor.
var coreModules = []coreModule{
	{"user", lt("Users", "用户"), []corePerm{
		{key: "user:read", en: "View users", zh: "查看用户"},
		{key: "user:create", en: "Create users", zh: "新建用户"},
		{key: "user:update", en: "Edit users", zh: "编辑用户"},
		{key: "user:delete", en: "Delete users", zh: "删除用户", sensitive: true},
		{key: "user:password:reset", en: "Reset user passwords and two-factor", zh: "重置他人密码与两步验证", sensitive: true, sessionOnly: true},
	}},
	{"role", lt("Roles", "角色"), []corePerm{
		{key: "role:read", en: "View roles and permissions", zh: "查看角色与权限"},
		// role:manage was split in two; its holders keep both halves.
		{key: "role:define", en: "Define roles", zh: "定义角色", sensitive: true, sessionOnly: true, inherits: []string{"role:manage"}},
		{key: "role:assign", en: "Assign roles to users", zh: "给用户分配角色", sensitive: true, sessionOnly: true, inherits: []string{"role:manage"}},
	}},
	{"apikey", lt("API keys", "API Key"), []corePerm{
		{key: "apikey:self:manage", en: "Manage own API keys", zh: "管理自己的 API Key"},
	}},
	{"group", lt("Groups", "分组"), []corePerm{
		{key: "group:read", en: "View groups", zh: "查看分组"},
		{key: "group:manage", en: "Manage groups", zh: "管理分组", sensitive: true},
	}},
	// User groups (segments, CONTRACTS §97): who is in which one, the private
	// groups it may use and what it pays there.
	{"segment", lt("User groups", "用户组"), []corePerm{
		{key: "segment:read", en: "View user groups", zh: "查看用户组"},
		{key: "segment:manage", en: "Manage user groups", zh: "管理用户组"},
	}},
	{"account", lt("Accounts", "账号"), []corePerm{
		{key: "account:read", en: "View accounts", zh: "查看账号"},
		{key: "account:create", en: "Create accounts", zh: "新建账号"},
		{key: "account:update", en: "Edit accounts", zh: "编辑账号"},
		{key: "account:delete", en: "Delete accounts", zh: "删除账号", sensitive: true},
		{key: "account:test", en: "Test accounts", zh: "测试账号"},
		{key: "account:credential:view", en: "View account credentials", zh: "查看账号凭证", sensitive: true, sessionOnly: true},
		// Ownership (CONTRACTS §21): "own" keys only reach accounts the caller
		// created; a full key above overrides its own counterpart.
		{key: "account:own:read", en: "Read own accounts", zh: "查看自己创建的账号"},
		{key: "account:own:create", en: "Create own accounts", zh: "新建账号（归自己所有）"},
		{key: "account:own:update", en: "Edit own accounts", zh: "编辑自己创建的账号"},
		{key: "account:own:delete", en: "Delete own accounts", zh: "删除自己创建的账号", sensitive: true},
		{key: "account:own:test", en: "Test own accounts", zh: "测试自己创建的账号"},
		{key: "account:own:credential:view", en: "View own account credentials", zh: "查看自己创建账号的凭证", sensitive: true, sessionOnly: true},
		{key: "account:settings:custom", en: "Custom guarded settings (e.g. base URL)", zh: "自定义受限设置（如 Base URL）"},
		{key: "account:group:bind", en: "Bind accounts to groups (own level)", zh: "将账号绑定到分组（own 级）"},
		{key: "account:relay", en: "Create relay-type accounts with custom upstream", zh: "创建自定义上游的 relay 类账号", sensitive: true},
	}},
	{"proxy", lt("Proxies", "代理"), []corePerm{
		{key: "proxy:read", en: "View proxies", zh: "查看代理"},
		{key: "proxy:manage", en: "Manage proxies", zh: "管理代理", sensitive: true},
		{key: "proxy:own:read", en: "View own proxies", zh: "查看自己创建的代理"},
		{key: "proxy:own:manage", en: "Manage own proxies", zh: "管理自己创建的代理"},
	}},
	{"price", lt("Model prices", "模型价格"), []corePerm{
		{key: "price:read", en: "View model prices", zh: "查看模型价格"},
		{key: "price:manage", en: "Manage model prices", zh: "管理模型价格", sensitive: true},
	}},
	{"balance", lt("Balance", "余额"), []corePerm{
		{key: "balance:self:read", en: "View own balance", zh: "查看自己的余额"},
		{key: "balance:all:read", en: "View all balances", zh: "查看全部余额"},
		{key: "balance:adjust", en: "Adjust balances", zh: "调整余额", sensitive: true},
	}},
	{"usage", lt("Usage", "使用记录"), []corePerm{
		{key: "usage:self:read", en: "View own usage", zh: "查看自己的用量"},
		{key: "usage:all:read", en: "View all usage", zh: "查看全部使用记录"},
		// Reconcile again, or refund, a pre-charged request the core gave up
		// on (CONTRACTS §25.4). It moves money, so it is sensitive and is
		// not implied by reading usage.
		{key: "usage:settle", en: "Reconcile or refund pre-charged usage", zh: "重新核对或退款预扣费用", sensitive: true},
	}},
	{"sticky", lt("Sticky sessions", "粘性会话"), []corePerm{
		{key: "sticky:read", en: "View sticky sessions", zh: "查看粘性会话"},
		{key: "sticky:manage", en: "Manage sticky sessions", zh: "管理粘性会话"},
	}},
	{"plugin", lt("Plugins", "插件"), []corePerm{
		{key: "plugin:read", en: "View plugins", zh: "查看插件"},
		{key: "plugin:install", en: "Install plugins", zh: "安装插件", sensitive: true, sessionOnly: true},
		{key: "plugin:manage", en: "Manage plugins", zh: "管理插件", sensitive: true},
		{key: "plugin:uninstall", en: "Uninstall plugins", zh: "卸载插件", sensitive: true, sessionOnly: true},
		{key: "plugin:grant:high", en: "Grant high-risk plugin permissions", zh: "授予插件高风险权限", sensitive: true, sessionOnly: true},
		{key: "plugin:grant:critical", en: "Grant critical plugin permissions", zh: "授予插件关键权限", sensitive: true, superOnly: true, sessionOnly: true},
		{key: "plugin:grant:db_schema_unconfined", en: "Grant db.schema to non-official plugins without role isolation", zh: "在无角色隔离时授予非官方插件 db.schema", sensitive: true, superOnly: true, sessionOnly: true},
		{key: "plugin:egress:read", en: "View plugin egress traffic", zh: "查看插件出口流量"},
		{key: "plugin:market:read", en: "Browse the plugin market", zh: "浏览插件市场"},
	}},
	{"publisher", lt("Publishers", "发布者"), []corePerm{
		{key: "publisher:read", en: "View publishers", zh: "查看发布者"},
		{key: "publisher:manage", en: "Manage publishers and keys", zh: "管理发布者与密钥", sensitive: true, superOnly: true, sessionOnly: true},
	}},
	{"node", lt("Cluster", "集群"), []corePerm{
		{key: "node:read", en: "View cluster nodes", zh: "查看集群节点"},
		{key: "audit:read", en: "View audit logs", zh: "查看审计日志"},
	}},
	{"task", lt("Scheduled tasks", "定时任务"), []corePerm{
		{key: "task:read", en: "View scheduled tasks", zh: "查看定时任务"},
		{key: "task:run", en: "Run scheduled tasks manually", zh: "手动运行定时任务", sensitive: true},
		{key: "task:manage", en: "Switch plugin scheduled tasks on and off", zh: "启用或停用插件定时任务", sensitive: true},
	}},
	{"gateway", lt("Gateway", "网关"), []corePerm{
		{key: "gateway:use", en: "Call the gateway", zh: "调用网关"},
	}},
	{"settings", lt("Settings", "设置"), []corePerm{
		{key: "settings:read", en: "View settings", zh: "查看设置"},
		{key: "settings:manage", en: "Manage settings", zh: "管理设置", sensitive: true, sessionOnly: true},
	}},
	{"system_update", lt("Core updates", "核心升级"), []corePerm{
		{key: "system:update:read", en: "View core updates", zh: "查看核心升级"},
		{key: "system:update:execute", en: "Execute core updates", zh: "执行核心升级", sensitive: true, superOnly: true, sessionOnly: true},
		{key: "system:update:recover", en: "Recover core updates", zh: "恢复核心升级", sensitive: true, superOnly: true, sessionOnly: true},
	}},
}

// userRolePermissions are granted to the built-in "user" role.
var userRolePermissions = []string{"apikey:self:manage", "balance:self:read", "usage:self:read", "gateway:use"}

// supplierPermissions are granted to the built-in "supplier" role: its own
// accounts and proxies and nothing else. account:group:bind is left out for
// now (decision D27), so a supplier binds no groups.
var supplierPermissions = []string{
	"account:own:read", "account:own:create", "account:own:update", "account:own:delete", "account:own:test", "account:own:credential:view",
	"proxy:own:read", "proxy:own:manage",
}

// operatorExcludedModules are the core modules the built-in "operator" role
// does not get: settings (sticky sessions live on the settings page) and the
// plugin pages (plugins, market, publishers). Every key of a module starts
// with "<module>:".
var operatorExcludedModules = []string{"settings", "sticky", "plugin", "publisher"}

type builtinRole struct {
	key         string
	name        core.LocalizedText
	description core.LocalizedText
	superuser   bool
	// grants reports whether a core permission is in the role's defaults,
	// superOnly ones aside (accepts); nil means none. New core permissions
	// are granted to the role when it accepts them, and a reset restores
	// exactly this set.
	grants func(p corePerm) bool
	// assignable lists the built-in roles its holders may assign by
	// default, and assignCustom adds every custom role (decision 5). A
	// role created later is added to the lists naming it.
	assignable   []string
	assignCustom bool
}

// oneOf is the grants of a role whose defaults are exactly keys.
func oneOf(keys []string) func(corePerm) bool {
	return func(p corePerm) bool { return slices.Contains(keys, p.key) }
}

var builtinRoles = []builtinRole{
	{key: RoleSuperAdmin, name: lt("Super admin", "超级管理员"), description: lt("Has every permission, including future ones", "拥有全部权限（包括以后新增的）"), superuser: true},
	{key: RoleAdmin, name: lt("Admin", "管理员"), description: lt("All core permissions by default, except those reserved for the super admin", "默认拥有除超级管理员专属权限以外的全部核心权限"),
		grants:     func(corePerm) bool { return true },
		assignable: []string{RoleOperator, RoleSupplier, RoleUser}, assignCustom: true},
	{key: RoleOperator, name: lt("Operator", "运维"), description: lt("Core permissions except settings and plugins", "默认拥有除系统设置、插件和插件市场以外的核心权限"),
		grants: func(p corePerm) bool {
			return !slices.ContainsFunc(operatorExcludedModules, func(m string) bool { return strings.HasPrefix(p.key, m+":") })
		},
		assignable: []string{RoleSupplier, RoleUser}},
	{key: RoleSupplier, name: lt("Supplier", "供应商"), description: lt("Add-on role: own accounts and proxies", "附加角色：管理自己创建的账号和代理"),
		grants: oneOf(supplierPermissions)},
	{key: RoleUser, name: lt("User", "普通用户"), description: lt("Own API keys, usage and balance; gateway access", "管理自己的 API Key、查看自己的用量和余额、调用网关"),
		grants: oneOf(userRolePermissions)},
}

// reservedRoleKey reports whether key belongs to a built-in role, so that no
// custom role may take it. A custom role holding one stops SyncCore
// (builtinKeyConflict).
func reservedRoleKey(key string) bool {
	_, ok := builtinRoleByKey(key)
	return ok
}

func builtinRoleByKey(key string) (builtinRole, bool) {
	for _, r := range builtinRoles {
		if r.key == key {
			return r, true
		}
	}
	return builtinRole{}, false
}

// accepts reports whether p is in r's defaults: never a superOnly one.
func (r builtinRole) accepts(p corePerm) bool {
	return r.grants != nil && !p.superOnly && r.grants(p)
}

// defaultPermissions returns the core permissions r has by default.
func (r builtinRole) defaultPermissions() []string {
	var out []string
	for _, m := range coreModules {
		for _, p := range m.perms {
			if r.accepts(p) {
				out = append(out, p.key)
			}
		}
	}
	return out
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

// sessionOnly reports whether key is a core permission only a session may use.
func sessionOnly(key string) bool {
	for _, m := range coreModules {
		for _, p := range m.perms {
			if p.key == key {
				return p.sessionOnly
			}
		}
	}
	return false
}

// KeyAllowed reports whether an access key may carry key: no plugin
// permission (plugin routes take no access keys) and no sessionOnly core
// one. It is the only such test; iam applies it wherever a key's
// permissions are chosen, listed or used.
func KeyAllowed(key string) bool {
	return !strings.HasPrefix(key, "plugin.") && !sessionOnly(key)
}

var (
	coreModuleLabels = map[string]core.LocalizedText{}
	coreModuleOrder  = map[string]int{}
)

func init() {
	for i, m := range coreModules {
		coreModuleLabels[m.key] = m.label
		coreModuleOrder[m.key] = i
	}
}
