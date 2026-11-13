package authz

import (
	"context"

	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// runningPluginStatuses are the plugins.status values (install.StatusEnabled,
// install.StatusUpgrading) under which a plugin serves traffic; a test keeps
// the list in step with the install package.
const runningPluginStatuses = `'enabled','upgrading'`

// SyncPlugin implements core.PermissionCatalog. A new permission follows the
// plugin: active while the plugin runs, disabled otherwise (SetPluginActive
// turns it on at enable), and is granted to its GrantRoles and to the
// holders of its InheritFrom keys (grantInherited), each grant audited as
// authz.sync.grant. Existing ones keep their status and role grants. Keys no
// longer declared are deleted last, so a renamed permission inherits the
// old one's holders first.
func (s *Service) SyncPlugin(ctx context.Context, tx pgx.Tx, pluginKey string, defs []core.PermissionDef) error {
	if pluginKey == "" {
		return core.ErrInvalidArgument.WithMessage("plugin key is required")
	}
	v, err := s.Bump(ctx, tx)
	if err != nil {
		return err
	}
	module := manifest.PermissionModule(pluginKey)
	keys := make([]string, 0, len(defs))
	var created []core.PermissionDef
	for _, d := range defs {
		key := manifest.PermissionKey(pluginKey, d.Key)
		local, ok := manifest.LocalPermission(pluginKey, key)
		if !ok {
			return core.ErrInvalidArgument.WithMessage("empty plugin permission key")
		}
		keys = append(keys, key)
		label := d.Label
		if label.Get("en") == "" {
			label = core.LocalizedText{"en": local}
		}
		desc := d.Description
		if desc == nil {
			desc = core.LocalizedText{}
		}
		var inserted bool
		err := tx.QueryRow(ctx, `
INSERT INTO permissions (key, module, label, description, source, plugin_key, sensitive, status, sort)
VALUES ($1, $2, $3, $4, 'plugin', $5::text, $6,
    CASE WHEN EXISTS (SELECT 1 FROM plugins WHERE key = $5::text AND status IN (`+runningPluginStatuses+`))
         THEN 'active' ELSE 'disabled' END, $7)
ON CONFLICT (key) DO UPDATE SET module = EXCLUDED.module, label = EXCLUDED.label,
    description = EXCLUDED.description, sensitive = EXCLUDED.sensitive, sort = EXCLUDED.sort
    WHERE permissions.plugin_key = EXCLUDED.plugin_key
RETURNING (xmax = 0)`, key, module, label, desc, pluginKey, d.Sensitive, d.Sort).Scan(&inserted)
		if store.IsNoRows(err) {
			return core.ErrConflict.WithMessage("permission " + key + " belongs to another owner")
		}
		if err != nil {
			return err
		}
		if inserted {
			d.Key = key
			created = append(created, d)
		}
	}
	for _, d := range created {
		if err := s.grantPluginDefault(ctx, tx, d.Key, dedupe(d.GrantRoles)); err != nil {
			return err
		}
	}
	for _, d := range created {
		from := make([]string, 0, len(d.InheritFrom))
		for _, k := range d.InheritFrom {
			from = append(from, manifest.PermissionKey(pluginKey, k))
		}
		if from = dedupe(from); len(from) > 0 {
			if err := s.grantInherited(ctx, tx, d.Key, from); err != nil {
				return err
			}
		}
	}
	if _, err := tx.Exec(ctx, `DELETE FROM permissions WHERE plugin_key = $1 AND key <> ALL($2)`, pluginKey, keys); err != nil {
		return err
	}
	s.committedLater(v)
	return nil
}

// CanGrantToRoles implements core.PermissionCatalog: actorID may hand new
// plugin permissions to each role of roleKeys, which is a change of that
// role (editableRole: built-in roles are the super admin's alone, a custom
// role must be within the actor's grantSet). Super admin roles already hold
// every permission and are refused; unknown keys are invalid. The roles stay
// locked in tx, which is bumped as for every role write.
func (s *Service) CanGrantToRoles(ctx context.Context, tx pgx.Tx, actorID int64, roleKeys []string) error {
	if roleKeys = dedupe(roleKeys); len(roleKeys) == 0 {
		return nil
	}
	v, err := s.Bump(ctx, tx)
	if err != nil {
		return err
	}
	s.committedLater(v)
	roles, err := resolveRoles(ctx, tx, roleKeys)
	if err != nil {
		return err
	}
	for _, r := range roles {
		if r.superuser {
			return core.ErrPermissionDenied.WithMessage(t(ctx,
				"the super admin role holds every permission and is not granted plugin permissions",
				"超级管理员角色本来拥有全部权限，不能授予插件权限")).WithDetails(map[string]any{"role": r.key})
		}
		if _, err := s.editableRole(ctx, tx, actorID, r.id); err != nil {
			return err
		}
	}
	return nil
}

// grantPluginDefault grants the newly created plugin permission key to roles
// but super admin ones (which hold every permission), audited.
func (s *Service) grantPluginDefault(ctx context.Context, tx pgx.Tx, key string, roles []string) error {
	if len(roles) == 0 {
		return nil
	}
	return s.syncGrant(ctx, tx, map[string]any{"via": "default"}, `
WITH ins AS (
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id FROM roles r, permissions p WHERE r.key = ANY($1) AND NOT r.superuser AND p.key = $2
    ON CONFLICT DO NOTHING RETURNING role_id, permission_id)
SELECT ins.role_id, p.key FROM ins JOIN permissions p ON p.id = ins.permission_id`, roles, key)
}

// SetPluginActive implements core.PermissionCatalog.
func (s *Service) SetPluginActive(ctx context.Context, tx pgx.Tx, pluginKey string, active bool) error {
	v, err := s.Bump(ctx, tx)
	if err != nil {
		return err
	}
	status := "disabled"
	if active {
		status = "active"
	}
	if _, err := tx.Exec(ctx, `UPDATE permissions SET status = $2 WHERE plugin_key = $1`, pluginKey, status); err != nil {
		return err
	}
	s.committedLater(v)
	return nil
}

// DeletePlugin implements core.PermissionCatalog; role grants cascade.
func (s *Service) DeletePlugin(ctx context.Context, tx pgx.Tx, pluginKey string) error {
	v, err := s.Bump(ctx, tx)
	if err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `DELETE FROM permissions WHERE plugin_key = $1`, pluginKey); err != nil {
		return err
	}
	s.committedLater(v)
	return nil
}
