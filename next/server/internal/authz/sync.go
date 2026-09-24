package authz

import (
	"context"
	"encoding/json"
	"slices"

	"github.com/jackc/pgx/v5"
)

// SyncCore upserts the core permission catalog, marks core permissions no
// longer in code as removed, seeds built-in roles and grants newly created
// core permissions to admin (and the user defaults to user). Safe to run
// concurrently from several nodes; set-based to keep round trips low. The
// version is only bumped when something changed.
func (s *Service) SyncCore(ctx context.Context) error {
	defs := CorePermissions()
	var (
		keys, modules, labels []string
		sensitive             []bool
		sorts                 []int32
	)
	for _, d := range defs {
		lb, err := json.Marshal(d.Label)
		if err != nil {
			return err
		}
		keys = append(keys, d.Key)
		modules = append(modules, d.Module)
		labels = append(labels, string(lb))
		sensitive = append(sensitive, d.Sensitive)
		sorts = append(sorts, int32(d.Sort))
	}
	var rKeys, rNames, rDescs []string
	var rSuper []bool
	for _, r := range builtinRoles {
		n, _ := json.Marshal(r.name)
		d, _ := json.Marshal(r.description)
		rKeys = append(rKeys, r.key)
		rNames = append(rNames, string(n))
		rDescs = append(rDescs, string(d))
		rSuper = append(rSuper, r.superuser)
	}

	var changed bool
	var v int64
	err := s.db.Tx(ctx, func(tx pgx.Tx) error {
		changed = false
		if _, err := tx.Exec(ctx, `SELECT version FROM authz_meta WHERE id = 1 FOR UPDATE`); err != nil {
			return err
		}
		// Built-in roles: returns only rows created or fixed now.
		newRoles := map[string]bool{}
		err := scanKeyFlags(ctx, tx, func(k string, inserted bool) {
			newRoles[k] = inserted
			changed = true
		}, `
INSERT INTO roles (key, name, description, builtin, superuser)
SELECT k, n::jsonb, d::jsonb, true, su FROM unnest($1::text[], $2::text[], $3::text[], $4::bool[]) AS t(k, n, d, su)
ON CONFLICT (key) DO UPDATE SET builtin = true, superuser = EXCLUDED.superuser
    WHERE NOT roles.builtin OR roles.superuser IS DISTINCT FROM EXCLUDED.superuser
RETURNING key, (xmax = 0)`, rKeys, rNames, rDescs, rSuper)
		if err != nil {
			return err
		}

		// Permissions: returns only inserted or modified rows.
		var inserted []string
		err = scanKeyFlags(ctx, tx, func(k string, ins bool) {
			if ins {
				inserted = append(inserted, k)
			}
			changed = true
		}, `
INSERT INTO permissions (key, module, label, source, sensitive, status, sort)
SELECT k, m, l::jsonb, 'core', se, 'active', so FROM unnest($1::text[], $2::text[], $3::text[], $4::bool[], $5::int[]) AS t(k, m, l, se, so)
ON CONFLICT (key) DO UPDATE SET module = EXCLUDED.module, label = EXCLUDED.label,
    sensitive = EXCLUDED.sensitive, status = 'active', sort = EXCLUDED.sort
    WHERE (permissions.module, permissions.label, permissions.sensitive, permissions.status, permissions.sort)
        IS DISTINCT FROM (EXCLUDED.module, EXCLUDED.label, EXCLUDED.sensitive, 'active'::varchar, EXCLUDED.sort)
RETURNING key, (xmax = 0)`, keys, modules, labels, sensitive, sorts)
		if err != nil {
			return err
		}

		grant := func(role string, keys []string) error {
			if len(keys) == 0 {
				return nil
			}
			_, err := tx.Exec(ctx, `
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.key = $1 AND p.key = ANY($2)
ON CONFLICT DO NOTHING`, role, keys)
			return err
		}
		adminKeys := inserted
		if newRoles[RoleAdmin] {
			adminKeys = keys
		}
		if err := grant(RoleAdmin, adminKeys); err != nil {
			return err
		}
		var userKeys []string
		for _, k := range userRolePermissions {
			if newRoles[RoleUser] || slices.Contains(inserted, k) {
				userKeys = append(userKeys, k)
			}
		}
		if err := grant(RoleUser, userKeys); err != nil {
			return err
		}

		tag, err := tx.Exec(ctx, `UPDATE permissions SET status = 'removed' WHERE source = 'core' AND status <> 'removed' AND key <> ALL($1)`, keys)
		if err != nil {
			return err
		}
		changed = changed || tag.RowsAffected() > 0
		if changed {
			if v, err = s.Bump(ctx, tx); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return err
	}
	if changed {
		s.Committed(ctx, v)
	}
	return nil
}

func scanKeyFlags(ctx context.Context, tx pgx.Tx, fn func(key string, flag bool), sql string, args ...any) error {
	rows, err := tx.Query(ctx, sql, args...)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var k string
		var f bool
		if err := rows.Scan(&k, &f); err != nil {
			return err
		}
		fn(k, f)
	}
	return rows.Err()
}
