package install

import (
	"context"
	"fmt"
	"slices"

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
// manifest no longer requests, except revocations: a version asking for the
// permission again does not get it by default (grants.Revoked). It runs
// inside the caller's transaction.
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
		`DELETE FROM plugin_permission_grants WHERE plugin_key = $1 AND NOT (permission = ANY($2)) AND status <> 'revoked'`, m.Key, ids); err != nil {
		return fmt.Errorf("prune grants: %w", err)
	}
	return nil
}

// PermissionDefs converts manifest userPermissions into catalog entries,
// sorted in manifest order (10, 20, ...). A permission created now goes to
// the roles grants holds for its local key (none when absent) and to the
// holders of its inheritFrom keys. A nil grants (activation: no consent is
// behind a permission created then, one deleted since the consent) grants
// nothing, inheritance included, so a role never gets a permission nobody
// reviewed (P4C).
func PermissionDefs(m *manifest.Manifest, grants map[string][]string) []core.PermissionDef {
	defs := make([]core.PermissionDef, 0, len(m.UserPermissions))
	for i, up := range m.UserPermissions {
		inherit := up.InheritFrom
		if grants == nil {
			inherit = nil
		}
		defs = append(defs, core.PermissionDef{
			Key:         manifest.PermissionKey(m.Key, up.Key),
			Module:      manifest.PermissionModule(m.Key),
			Label:       core.LocalizedText(up.Label),
			Description: core.LocalizedText(up.Description),
			Sensitive:   up.Sensitive,
			Sort:        (i + 1) * 10,
			GrantRoles:  grants[up.Key],
			InheritFrom: inherit,
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
// created now is granted to: an explicit override (overrideRoles); none for
// a rename or split, which inherits from an old key the catalog has
// (existing, catalogKeys) and so only keeps that key's holders; otherwise
// the manifest default (defaultRoles: admin when omitted, none when []). A
// first install has no old key, so it gets the defaults.
func roleGrants(m *manifest.Manifest, req ConsentRequest, existing map[string]bool) map[string][]string {
	out := make(map[string][]string, len(m.UserPermissions))
	for _, up := range m.UserPermissions {
		renamed := slices.ContainsFunc(up.InheritFrom, func(from string) bool { return existing[manifest.PermissionKey(m.Key, from)] })
		switch roles, ok := req.overrideRoles(up.Key); {
		case ok:
			out[up.Key] = roles
		case renamed:
			out[up.Key] = []string{}
		default:
			out[up.Key] = up.Roles()
		}
	}
	return out
}
