package authz

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"maps"
	"slices"

	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// SyncCore upserts the core permission catalog, marks core permissions no
// longer in code as removed, seeds built-in roles (failing when a custom role
// holds a built-in key, builtinKeyConflict) and grants newly created
// core permissions and built-in roles (as assignable) to the built-in roles
// whose defaults include them. Safe to run concurrently from several nodes;
// set-based to keep round trips low. The version is only bumped when
// something changed.
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
	var rSuper, rCustom []bool
	for _, r := range builtinRoles {
		n, _ := json.Marshal(r.name)
		d, _ := json.Marshal(r.description)
		rKeys = append(rKeys, r.key)
		rNames = append(rNames, string(n))
		rDescs = append(rDescs, string(d))
		rSuper = append(rSuper, r.superuser)
		rCustom = append(rCustom, r.assignCustom)
	}

	var changed bool
	var v int64
	err := s.db.Tx(ctx, func(tx pgx.Tx) error {
		changed = false
		if _, err := tx.Exec(ctx, `SELECT version FROM authz_meta WHERE id = 1 FOR UPDATE`); err != nil {
			return err
		}
		if err := builtinKeyConflict(ctx, tx, rKeys); err != nil {
			return err
		}
		// Built-in roles: returns only rows created or fixed now.
		newRoles := map[string]bool{}
		err := scanKeyFlags(ctx, tx, func(k string, inserted bool) {
			newRoles[k] = inserted
			changed = true
		}, `
INSERT INTO roles (key, name, description, builtin, superuser, assign_custom)
SELECT k, n::jsonb, d::jsonb, true, su, ac FROM unnest($1::text[], $2::text[], $3::text[], $4::bool[], $5::bool[]) AS t(k, n, d, su, ac)
ON CONFLICT (key) DO UPDATE SET superuser = EXCLUDED.superuser
    WHERE roles.superuser IS DISTINCT FROM EXCLUDED.superuser
RETURNING key, (xmax = 0)`, rKeys, rNames, rDescs, rSuper, rCustom)
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

		// Built-in roles get their default permissions and assignable roles
		// (grantDefaults).
		for _, r := range builtinRoles {
			if err := s.grantDefaults(ctx, tx, r.key, newRoles[r.key], r.defaultPermissions(),
				func(k string) bool { return slices.Contains(inserted, k) }, "default", `
WITH ins AS (
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id FROM roles r, permissions p WHERE r.key = $1 AND p.key = ANY($2)
    ON CONFLICT DO NOTHING RETURNING role_id, permission_id)
SELECT ins.role_id, p.key FROM ins JOIN permissions p ON p.id = ins.permission_id`); err != nil {
				return err
			}
			if err := s.grantDefaults(ctx, tx, r.key, newRoles[r.key], r.assignable,
				func(k string) bool { return newRoles[k] }, "assignable", `
WITH ins AS (
    INSERT INTO role_assignable_roles (role_id, assignable_role_id)
    SELECT r.id, a.id FROM roles r, roles a WHERE r.key = $1 AND a.key = ANY($2) AND a.builtin AND NOT a.superuser
    ON CONFLICT DO NOTHING RETURNING role_id, assignable_role_id)
SELECT ins.role_id, a.key FROM ins JOIN roles a ON a.id = ins.assignable_role_id`); err != nil {
				return err
			}
		}
		for _, m := range coreModules {
			for _, p := range m.perms {
				if len(p.inherits) == 0 || !slices.Contains(inserted, p.key) {
					continue
				}
				if err := s.grantInherited(ctx, tx, p.key, p.inherits, builtinsWithout(p.key)); err != nil {
					return err
				}
			}
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

// builtinKeyConflict fails when a custom role holds one of the built-in role
// keys: the role is never turned into the built-in one, which would hand its
// holders that role's defaults, and never skipped, which would leave the
// built-in role missing. The error stops startup and says how to rename it.
func builtinKeyConflict(ctx context.Context, q store.Querier, builtinKeys []string) error {
	roles, err := queryRoles(ctx, q, `SELECT id, key, superuser FROM roles WHERE key = ANY($1) AND NOT builtin ORDER BY id`, builtinKeys)
	if err != nil || len(roles) == 0 {
		return err
	}
	msg := "authz: custom roles hold keys reserved for built-in roles; rename each one (any free key will do) and start again:"
	for _, r := range roles {
		msg += fmt.Sprintf("\n  role id %d key %q: UPDATE roles SET key = '%s_custom' WHERE id = %d;", r.id, r.key, r.key, r.id)
	}
	return errors.New(msg)
}

// grantDefaults grants the built-in role roleKey its defaults through sql
// ($1 the role key, $2 the defaults; returning what syncGrant reads). A role
// created now (seed) gets all of them: it is seeded, not widened, so the
// grants are not audited. An existing role gets only the defaults created
// now, audited with via.
func (s *Service) grantDefaults(ctx context.Context, tx pgx.Tx, roleKey string, seed bool, defaults []string, created func(string) bool, via, sql string) error {
	var detail map[string]any
	if !seed {
		defaults = slices.DeleteFunc(slices.Clone(defaults), func(k string) bool { return !created(k) })
		detail = map[string]any{"via": via}
	}
	if len(defaults) == 0 {
		return nil
	}
	return s.syncGrant(ctx, tx, detail, sql, roleKey, defaults)
}

// grantInherited grants newKey to every role holding a key of from: a
// permission split from others keeps their holders' rights. The built-in
// roles of skip are left out (builtinsWithout). Run only when newKey is
// first created, it is idempotent; each grant is audited.
func (s *Service) grantInherited(ctx context.Context, tx pgx.Tx, newKey string, from, skip []string) error {
	return s.syncGrant(ctx, tx, map[string]any{"via": "inherit", "from": from}, `
WITH ins AS (
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT DISTINCT rp.role_id, np.id FROM role_permissions rp
    JOIN permissions op ON op.id = rp.permission_id AND op.key = ANY($1)
    JOIN permissions np ON np.key = $2
    JOIN roles r ON r.id = rp.role_id
    WHERE NOT (r.builtin AND COALESCE(r.key = ANY($3), false))
    ON CONFLICT DO NOTHING RETURNING role_id, permission_id)
SELECT ins.role_id, p.key FROM ins JOIN permissions p ON p.id = ins.permission_id`, from, newKey, skip)
}

// builtinsWithout lists the built-in roles whose defaults leave the core
// permission key out. A built-in role's core permissions are its defaults:
// what it held under an old key came from the old defaults, not from an
// administrator, so a split does not carry it over (role:define stays off
// the built-in operator, decision D3; 0102 takes back what an earlier sync
// of this version gave).
func builtinsWithout(key string) []string {
	var out []string
	for _, r := range builtinRoles {
		if !r.superuser && !slices.Contains(r.defaultPermissions(), key) {
			out = append(out, r.key)
		}
	}
	return out
}

// syncGrant runs sql, an automatic grant returning the role id and the
// granted key (a permission, or an assignable role) of each row it adds,
// and audits each row as authz.sync.grant by the system with via plus the
// key as detail. A nil via grants without auditing.
func (s *Service) syncGrant(ctx context.Context, tx pgx.Tx, via map[string]any, sql string, args ...any) error {
	type grant struct {
		role int64
		key  string
	}
	rows, err := tx.Query(ctx, sql, args...)
	if err != nil {
		return err
	}
	grants, err := pgx.CollectRows(rows, func(r pgx.CollectableRow) (grant, error) {
		var g grant
		return g, r.Scan(&g.role, &g.key)
	})
	if err != nil || via == nil {
		return err
	}
	for _, g := range grants {
		detail := maps.Clone(via)
		detail["key"] = g.key
		if err := s.audit(ctx, tx, 0, "authz.sync.grant", "role", g.role, detail); err != nil {
			return err
		}
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
