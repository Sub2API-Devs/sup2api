package install

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// DefaultsApplier implements core.PluginDefaultsApplier. It has no
// dependency on the rollout controller so the runtime (C2) can be built
// with it before the install service exists.
type DefaultsApplier struct {
	perms  core.PermissionCatalog
	sticky core.StickyRuleCatalog
}

var _ core.PluginDefaultsApplier = (*DefaultsApplier)(nil)

// NewDefaultsApplier wires the catalogs. A nil catalog is skipped.
func NewDefaultsApplier(perms core.PermissionCatalog, sticky core.StickyRuleCatalog) *DefaultsApplier {
	return &DefaultsApplier{perms: perms, sticky: sticky}
}

// ApplyDefaults syncs user permissions and default sticky
// rules for m, and drops host permission grants the manifest no longer
// requests. It runs inside the caller's transaction.
func (a *DefaultsApplier) ApplyDefaults(ctx context.Context, tx pgx.Tx, m *manifest.Manifest, grantNewPermissionsToRoleKeys []string) error {
	if a.perms != nil {
		if err := a.perms.SyncPlugin(ctx, tx, m.Key, PermissionDefs(m), grantNewPermissionsToRoleKeys); err != nil {
			return fmt.Errorf("sync plugin permissions: %w", err)
		}
	}
	sticky := StickyDefaults(m)
	if a.sticky != nil {
		if err := a.sticky.SyncPluginDefaults(ctx, tx, m.Key, sticky); err != nil {
			return fmt.Errorf("sync plugin sticky rules: %w", err)
		}
	}
	ids := make([]string, 0, len(m.HostPermissions))
	for _, hp := range m.HostPermissions {
		ids = append(ids, hp.ID)
	}
	if _, err := tx.Exec(ctx,
		`DELETE FROM plugin_permission_grants WHERE plugin_key = $1 AND NOT (permission = ANY($2))`, m.Key, ids); err != nil {
		return fmt.Errorf("prune grants: %w", err)
	}
	return nil
}

// StickyDefaults returns the default sticky rules of every platform the
// plugin declares, in declaration order.
func StickyDefaults(m *manifest.Manifest) []manifest.StickyRule {
	var out []manifest.StickyRule
	for _, p := range m.Platforms {
		out = append(out, p.StickyRules...)
	}
	return out
}

// PermissionKey returns the RBAC key of a plugin-local permission.
func PermissionKey(pluginKey, local string) string {
	return "plugin." + pluginKey + ":" + local
}

// PermissionDefs converts manifest userPermissions into catalog entries.
func PermissionDefs(m *manifest.Manifest) []core.PermissionDef {
	defs := make([]core.PermissionDef, 0, len(m.UserPermissions))
	for i, up := range m.UserPermissions {
		defs = append(defs, core.PermissionDef{
			Key:         PermissionKey(m.Key, up.Key),
			Module:      "plugin." + m.Key,
			Label:       core.LocalizedText(up.Label),
			Description: core.LocalizedText(up.Description),
			Sensitive:   up.Sensitive,
			Sort:        i,
		})
	}
	return defs
}

// unionDefs merges b into a (b wins on key collisions), preserving order.
func unionDefs(a, b []core.PermissionDef) []core.PermissionDef {
	idx := map[string]int{}
	out := make([]core.PermissionDef, 0, len(a)+len(b))
	for _, d := range a {
		idx[d.Key] = len(out)
		out = append(out, d)
	}
	for _, d := range b {
		if i, ok := idx[d.Key]; ok {
			out[i] = d
			continue
		}
		idx[d.Key] = len(out)
		out = append(out, d)
	}
	return out
}
