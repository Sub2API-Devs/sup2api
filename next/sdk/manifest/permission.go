package manifest

import "strings"

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
