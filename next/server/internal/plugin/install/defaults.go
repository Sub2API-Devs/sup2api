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
	perms core.PermissionCatalog
}

var _ core.PluginDefaultsApplier = (*DefaultsApplier)(nil)

// NewDefaultsApplier wires the permission catalog. A nil catalog is skipped.
func NewDefaultsApplier(perms core.PermissionCatalog) *DefaultsApplier {
	return &DefaultsApplier{perms: perms}
}

// ApplyDefaults syncs the user permissions of m, granting newly created ones
// to the roles of grants (roleGrants), and drops host permission grants the
// manifest no longer requests. It runs inside the caller's transaction.
// Plugins bring no sticky rules (CONTRACTS §5.6).
func (a *DefaultsApplier) ApplyDefaults(ctx context.Context, tx pgx.Tx, m *manifest.Manifest, grants map[string][]string) error {
	if a.perms != nil {
		if err := a.perms.SyncPlugin(ctx, tx, m.Key, PermissionDefs(m, grants)); err != nil {
			return fmt.Errorf("sync plugin permissions: %w", err)
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

// PermissionDefs converts manifest userPermissions into catalog entries,
// sorted in manifest order (10, 20, ...). A permission created now goes to
// the roles grants holds for its local key (none when absent) and to the
// holders of its inheritFrom keys.
func PermissionDefs(m *manifest.Manifest, grants map[string][]string) []core.PermissionDef {
	defs := make([]core.PermissionDef, 0, len(m.UserPermissions))
	for i, up := range m.UserPermissions {
		defs = append(defs, core.PermissionDef{
			Key:         manifest.PermissionKey(m.Key, up.Key),
			Module:      manifest.PermissionModule(m.Key),
			Label:       core.LocalizedText(up.Label),
			Description: core.LocalizedText(up.Description),
			Sensitive:   up.Sensitive,
			Sort:        (i + 1) * 10,
			GrantRoles:  grants[up.Key],
			InheritFrom: up.InheritFrom,
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

// roleGrants resolves, per local userPermission key, the roles a permission
// created now is granted to: an explicit override (overrideRoles) or the
// manifest default (defaultRoles, admin when omitted).
func roleGrants(m *manifest.Manifest, req ConsentRequest) map[string][]string {
	out := make(map[string][]string, len(m.UserPermissions))
	for _, up := range m.UserPermissions {
		if roles, ok := req.overrideRoles(up.Key); ok {
			out[up.Key] = roles
		} else {
			out[up.Key] = up.Roles()
		}
	}
	return out
}
