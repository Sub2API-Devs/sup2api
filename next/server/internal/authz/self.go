package authz

import (
	"maps"
	"slices"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/perm"
)

// selfModule holds the virtual permissions of one's own account (CONTRACTS
// §80): every signed-in user holds them implicitly (PermissionSet), so they
// are not in the permissions table, no role grants them and the role editor
// does not list them. They exist to be chosen for an access key, whose
// routes of the caller's own account (httpapi.Router.Self) they open.
var selfModule = coreModule{"self", lt("My account", "我的账户"), []corePerm{
	{key: perm.SelfProfile, en: "Edit own profile", zh: "修改自己的资料",
		desc: lt("Change your own display name.", "修改自己的显示名称。")},
	{key: perm.SelfSecurity, en: "Own password, two-factor and passkeys (and the super admin transfer)", zh: "自己的密码、两步验证与通行密钥（及超管移交）", sensitive: true, stepUp: true,
		desc: lt("Change your own password, two-factor and passkeys, and transfer the super admin; most changes ask for verification.", "修改自己的密码、两步验证与通行密钥，以及移交超管；多数改动需要二次验证。")},
	{key: perm.SelfPluginUI, en: "Open plugin pages and settings", zh: "打开插件页面与设置",
		desc: lt("Open plugin pages and settings, as far as your other permissions allow.", "打开插件页面与设置，能看到什么仍由其他权限决定。")},
}}

var selfKeys = func() map[string]struct{} {
	out := map[string]struct{}{}
	for _, p := range selfModule.perms {
		out[string(p.key)] = struct{}{}
	}
	return out
}()

// SelfPermissionKeys lists the self permissions.
func SelfPermissionKeys() []string { return slices.Sorted(maps.Keys(selfKeys)) }

// withSelf adds the self permissions to the set of a signed-in user.
func withSelf(set core.PermissionSet) core.PermissionSet {
	maps.Copy(set.Keys, selfKeys)
	return set
}

// SelfPermissionModule is the self module as the access key selector lists it.
func SelfPermissionModule() *PermissionModule {
	m := &PermissionModule{Module: selfModule.key, Label: selfModule.label, Source: "core", Status: "active", Permissions: []PermissionItem{}}
	for _, p := range selfModule.perms {
		m.Permissions = append(m.Permissions, PermissionItem{Key: string(p.key), Label: lt(p.en, p.zh), Description: p.description(),
			Requires: p.requiredKeys(), Sensitive: p.sensitive, StepUp: p.stepUp, Status: "active"})
	}
	return m
}
