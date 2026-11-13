package manifest

import (
	"slices"
	"strings"
)

// BuiltinRoleKeys are the built-in roles a plugin permission may name in
// defaultRoles (the core's built-in roles but the super admin; a core test
// keeps the lists in step).
var BuiltinRoleKeys = []string{"admin", "operator", "supplier", "user"}

// DefaultPermissionRoles are the roles of a permission declaring no
// defaultRoles.
var DefaultPermissionRoles = []string{"admin"}

// Roles reports the built-in roles the permission is granted to when first
// created: DefaultRoles, or DefaultPermissionRoles when it declares none.
func (up UserPermission) Roles() []string {
	if len(up.DefaultRoles) == 0 {
		return slices.Clone(DefaultPermissionRoles)
	}
	return slices.Clone(up.DefaultRoles)
}

// PermissionModule is the RBAC module of a plugin's permissions:
// "plugin.<pluginKey>".
func PermissionModule(pluginKey string) string { return "plugin." + pluginKey }

// PermissionKey is the RBAC key of a plugin-local permission:
// "plugin.<pluginKey>:<local>". An already qualified key of the same plugin is
// returned as is; an empty local key gives "" (callers then deny).
func PermissionKey(pluginKey, local string) string {
	prefix := PermissionModule(pluginKey) + ":"
	local = strings.TrimPrefix(local, prefix)
	if local == "" {
		return ""
	}
	return prefix + local
}

// LocalPermission reports the local part of key when it belongs to pluginKey.
func LocalPermission(pluginKey, key string) (string, bool) {
	local, ok := strings.CutPrefix(key, PermissionModule(pluginKey)+":")
	return local, ok && local != ""
}
