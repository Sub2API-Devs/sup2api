package authz

import (
	"context"
	"strings"

	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// PluginPermissionKey returns the global key of a plugin permission
// ("plugin.<pluginKey>:<local>"); already-prefixed keys are returned as is.
func PluginPermissionKey(pluginKey, local string) string {
	prefix := PluginModule(pluginKey) + ":"
	if strings.HasPrefix(local, prefix) {
		return local
	}
	return prefix + local
}

// PluginModule returns the module name of a plugin's permissions.
func PluginModule(pluginKey string) string { return "plugin." + pluginKey }

// SyncPlugin implements core.PermissionCatalog. New permissions are inserted
// with status active; existing ones keep their status and role grants.
func (s *Service) SyncPlugin(ctx context.Context, tx pgx.Tx, pluginKey string, defs []core.PermissionDef, grantNewToRoleKeys []string) error {
	if pluginKey == "" {
		return core.ErrInvalidArgument.WithMessage("plugin key is required")
	}
	v, err := s.Bump(ctx, tx)
	if err != nil {
		return err
	}
	module := PluginModule(pluginKey)
	keys := make([]string, 0, len(defs))
	var newIDs []int64
	for i, d := range defs {
		local := strings.TrimPrefix(d.Key, module+":")
		if local == "" {
			return core.ErrInvalidArgument.WithMessage("empty plugin permission key")
		}
		key := module + ":" + local
		keys = append(keys, key)
		label := d.Label
		if label.Get("en") == "" {
			label = core.LocalizedText{"en": local}
		}
		desc := d.Description
		if desc == nil {
			desc = core.LocalizedText{}
		}
		sort := d.Sort
		if sort == 0 {
			sort = (i + 1) * 10
		}
		var id int64
		var inserted bool
		err := tx.QueryRow(ctx, `
INSERT INTO permissions (key, module, label, description, source, plugin_key, sensitive, status, sort)
VALUES ($1, $2, $3, $4, 'plugin', $5, $6, 'active', $7)
ON CONFLICT (key) DO UPDATE SET module = EXCLUDED.module, label = EXCLUDED.label,
    description = EXCLUDED.description, sensitive = EXCLUDED.sensitive, sort = EXCLUDED.sort
    WHERE permissions.plugin_key = EXCLUDED.plugin_key
RETURNING id, (xmax = 0)`, key, module, label, desc, pluginKey, d.Sensitive, sort).Scan(&id, &inserted)
		if store.IsNoRows(err) {
			return core.ErrConflict.WithMessage("permission " + key + " belongs to another owner")
		}
		if err != nil {
			return err
		}
		if inserted {
			newIDs = append(newIDs, id)
		}
	}
	if _, err := tx.Exec(ctx, `DELETE FROM permissions WHERE plugin_key = $1 AND key <> ALL($2)`, pluginKey, keys); err != nil {
		return err
	}
	if roles := dedupe(grantNewToRoleKeys); len(newIDs) > 0 && len(roles) > 0 {
		var roleIDs []int64
		if err := tx.QueryRow(ctx, `SELECT COALESCE(array_agg(id), '{}') FROM roles WHERE key = ANY($1) AND NOT superuser`, roles).Scan(&roleIDs); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `
INSERT INTO role_permissions (role_id, permission_id)
SELECT r, p FROM unnest($1::bigint[]) r CROSS JOIN unnest($2::bigint[]) p
ON CONFLICT DO NOTHING`, roleIDs, newIDs); err != nil {
			return err
		}
	}
	s.committedLater(v)
	return nil
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
