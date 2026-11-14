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
// whose defaults include them. A built-in role whose defaults_rev is behind
// its rev (an upgrade from a core without it, or defaults that changed) is
// brought to its defaults once (advanceDefaults): reset to them when nobody
// holds it, otherwise given every default it lacks, nothing it holds taken
// away. Either way what an administrator changes afterwards stays as
// changed. Safe to run concurrently from several nodes; set-based to keep
// round trips low. The version is only bumped when something changed.
func (s *Service) SyncCore(ctx context.Context) error {
	defs := CorePermissions()
	var (
		keys, modules, labels, descs, scopeTypes []string
		sensitive                                []bool
		sorts                                    []int32
	)
	for _, d := range defs {
		lb, err := json.Marshal(d.Label)
		if err != nil {
			return err
		}
		dj, err := json.Marshal(d.Description)
		if err != nil {
			return err
		}
		keys = append(keys, d.Key)
		modules = append(modules, d.Module)
		labels = append(labels, string(lb))
		descs = append(descs, string(dj))
		sensitive = append(sensitive, d.Sensitive)
		sorts = append(sorts, int32(d.Sort))
		scopeTypes = append(scopeTypes, d.ScopeType)
	}
	var rKeys, rNames, rDescs []string
	var rSuper, rCustom []bool
	var rRevs []int32
	for _, r := range builtinRoles {
		n, _ := json.Marshal(r.name)
		d, _ := json.Marshal(r.description)
		rKeys = append(rKeys, r.key)
		rNames = append(rNames, string(n))
		rDescs = append(rDescs, string(d))
		rSuper = append(rSuper, r.superuser)
		rCustom = append(rCustom, r.assignCustom)
		rRevs = append(rRevs, r.rev)
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
INSERT INTO roles (key, name, description, builtin, superuser, assign_custom, defaults_rev)
SELECT k, n::jsonb, d::jsonb, true, su, ac, rev FROM unnest($1::text[], $2::text[], $3::text[], $4::bool[], $5::bool[], $6::int[]) AS t(k, n, d, su, ac, rev)
ON CONFLICT (key) DO UPDATE SET superuser = EXCLUDED.superuser
    WHERE roles.superuser IS DISTINCT FROM EXCLUDED.superuser
RETURNING key, (xmax = 0)`, rKeys, rNames, rDescs, rSuper, rCustom, rRevs)
		if err != nil {
			return err
		}
		// The roles getting every default they lack, with what the audit
		// says of why: created now, or behind their rev and held; and
		// those behind their rev that nobody holds, reset to them.
		fills := map[string]map[string]any{}
		for k, created := range newRoles {
			if created {
				fills[k] = map[string]any{"role_created": true}
			}
		}
		resets := map[string]bool{}
		if err := s.advanceDefaults(ctx, tx, rKeys, rRevs, rCustom, func(k string, rev int32, held bool) {
			if held {
				fills[k] = map[string]any{"defaults_rev": rev}
			} else {
				resets[k] = true
			}
			changed = true
		}); err != nil {
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
INSERT INTO permissions (key, module, label, description, source, sensitive, status, sort, scope_type)
SELECT k, m, l::jsonb, d::jsonb, 'core', se, 'active', so, st
FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::bool[], $6::int[], $7::text[]) AS t(k, m, l, d, se, so, st)
ON CONFLICT (key) DO UPDATE SET module = EXCLUDED.module, label = EXCLUDED.label, description = EXCLUDED.description,
    sensitive = EXCLUDED.sensitive, status = 'active', sort = EXCLUDED.sort, scope_type = EXCLUDED.scope_type
    WHERE (permissions.module, permissions.label, permissions.description, permissions.sensitive, permissions.status, permissions.sort, permissions.scope_type)
        IS DISTINCT FROM (EXCLUDED.module, EXCLUDED.label, EXCLUDED.description, EXCLUDED.sensitive, 'active'::varchar, EXCLUDED.sort, EXCLUDED.scope_type)
RETURNING key, (xmax = 0)`, keys, modules, labels, descs, sensitive, sorts, scopeTypes)
		if err != nil {
			return err
		}

		// Built-in roles get their default permissions and assignable roles:
		// a reset writes them all (the permissions created above included),
		// the others get theirs through grantDefaults.
		for _, r := range builtinRoles {
			if resets[r.key] {
				if err := s.resetUnheld(ctx, tx, r); err != nil {
					return err
				}
				continue
			}
			fill := fills[r.key]
			// Scoped defaults are granted on a fill only: the actions exist
			// already, so none is new.
			if fill != nil && len(r.scoped) > 0 {
				if err := s.grantScopedDefaults(ctx, tx, r.key, r.scoped, fill); err != nil {
					return err
				}
			}
			if err := s.grantDefaults(ctx, tx, r.key, fill, r.unscopedDefaults(),
				func(k string) bool { return slices.Contains(inserted, k) }, "default", `
WITH ins AS (
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id FROM roles r, permissions p WHERE r.key = $1 AND p.key = ANY($2)
    ON CONFLICT DO NOTHING RETURNING role_id, permission_id)
SELECT ins.role_id, p.key FROM ins JOIN permissions p ON p.id = ins.permission_id`); err != nil {
				return err
			}
			if err := s.grantDefaults(ctx, tx, r.key, fill, r.assignable,
				func(k string) bool { return newRoles[k] }, "assignable", `
WITH ins AS (
    INSERT INTO role_assignable_roles (role_id, assignable_role_id)
    SELECT r.id, a.id FROM roles r, roles a WHERE r.key = $1 AND a.key = ANY($2) AND a.builtin AND NOT a.superuser
    ON CONFLICT DO NOTHING RETURNING role_id, assignable_role_id)
SELECT ins.role_id, a.key FROM ins JOIN roles a ON a.id = ins.assignable_role_id`); err != nil {
				return err
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

// advanceDefaults moves each built-in role of keys whose defaults_rev is
// behind its rev (revs) up to it and calls behind with the role, the rev
// reached and whether it is held (roleHolders; the super admin role, never
// reset, counts as held): SyncCore then grants a held role the defaults it
// lacks, turned assign_custom on here where its defaults have it (custom;
// audited), and resets one nobody holds (resetUnheld).
func (s *Service) advanceDefaults(ctx context.Context, tx pgx.Tx, keys []string, revs []int32, custom []bool, behind func(key string, rev int32, held bool)) error {
	type moved struct {
		id     int64
		key    string
		rev    int32
		held   bool
		custom bool
	}
	rows, err := tx.Query(ctx, `
WITH behind AS (
    SELECT r.id, t.rev, r.superuser OR `+roleHolders+` > 0 AS held, t.ac AND NOT r.assign_custom AS custom
    FROM roles r JOIN unnest($1::text[], $2::int[], $3::bool[]) AS t(k, rev, ac) ON t.k = r.key
    WHERE r.builtin AND r.defaults_rev < t.rev)
UPDATE roles r SET defaults_rev = b.rev, assign_custom = r.assign_custom OR (b.held AND b.custom)
FROM behind b WHERE r.id = b.id
RETURNING r.id, r.key, b.rev, b.held, b.held AND b.custom`, keys, revs, custom)
	if err != nil {
		return err
	}
	roles, err := pgx.CollectRows(rows, func(r pgx.CollectableRow) (moved, error) {
		var m moved
		return m, r.Scan(&m.id, &m.key, &m.rev, &m.held, &m.custom)
	})
	if err != nil {
		return err
	}
	for _, m := range roles {
		behind(m.key, m.rev, m.held)
		if !m.custom {
			continue
		}
		if err := s.audit(ctx, tx, 0, "authz.sync.grant", "role", m.id, map[string]any{"via": "assignable", "assign_custom": true, "defaults_rev": m.rev}); err != nil {
			return err
		}
	}
	return nil
}

// resetUnheld resets the built-in role def, behind its rev with nobody
// holding it, to its defaults as ResetRole does (resetDefaults, by the
// system, audited with via sync and the rev): no user's rights change, and
// whoever is given the role next gets what its defaults say.
func (s *Service) resetUnheld(ctx context.Context, tx pgx.Tx, def builtinRole) error {
	r, err := scanRole(tx.QueryRow(ctx, roleSelect+` WHERE r.key = $1`, def.key))
	if err != nil {
		return err
	}
	return s.resetDefaults(ctx, tx, 0, r, def, map[string]any{"via": "sync", "defaults_rev": def.rev})
}

// grantDefaults grants the built-in role roleKey its defaults through sql
// ($1 the role key, $2 the defaults; returning what syncGrant reads). On a
// fill (a role created now, or behind its rev) it gets every one it lacks,
// otherwise only the defaults created now; every grant is audited with via
// and the fill's detail (role_created or defaults_rev), so a role the sync
// creates or fills in on an upgrade shows what it was given.
func (s *Service) grantDefaults(ctx context.Context, tx pgx.Tx, roleKey string, fill map[string]any, defaults []string, created func(string) bool, via, sql string) error {
	if fill == nil {
		defaults = slices.DeleteFunc(slices.Clone(defaults), func(k string) bool { return !created(k) })
	}
	if len(defaults) == 0 {
		return nil
	}
	return s.syncGrant(ctx, tx, withVia(fill, via), sql, roleKey, defaults)
}

// withVia is the audit detail of a sync grant: via plus the fill's detail.
func withVia(fill map[string]any, via string) map[string]any {
	detail := maps.Clone(fill)
	if detail == nil {
		detail = map[string]any{}
	}
	detail["via"] = via
	return detail
}

// grantScopedDefaults grants the built-in role roleKey the scoped defaults
// (canonical keys) it lacks, each audited as authz.sync.grant (via default
// and the fill's detail). One the role's unscoped grant of the same action
// implies is left out, as migration 0097 leaves out a redundant own scope.
func (s *Service) grantScopedDefaults(ctx context.Context, tx pgx.Tx, roleKey string, keys []string, fill map[string]any) error {
	return s.syncGrant(ctx, tx, withVia(fill, "default"), `
WITH ins AS (
    INSERT INTO role_permission_scopes (role_id, permission_id, scope)
    SELECT r.id, p.id, d.scope FROM roles r,
        (SELECT substring(k FROM '^(.*):[^:]*$') AS action, substring(k FROM '[^:]*$') AS scope FROM unnest($2::text[]) k) d
    JOIN permissions p ON p.key = d.action AND p.source = 'core'
    WHERE r.key = $1
      AND NOT EXISTS (SELECT 1 FROM role_permissions f WHERE f.role_id = r.id AND f.permission_id = p.id)
    ON CONFLICT DO NOTHING RETURNING role_id, permission_id, scope)
SELECT ins.role_id, p.key || ':' || ins.scope FROM ins JOIN permissions p ON p.id = ins.permission_id`, roleKey, keys)
}

// grantInherited grants newKey to every role holding a key of from: a
// permission split from others (a plugin manifest's inheritFrom) keeps
// their holders' rights. Run only when newKey is first created, it is
// idempotent; each grant is audited.
func (s *Service) grantInherited(ctx context.Context, tx pgx.Tx, newKey string, from []string) error {
	return s.syncGrant(ctx, tx, map[string]any{"via": "inherit", "from": from}, `
WITH ins AS (
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT DISTINCT rp.role_id, np.id FROM role_permissions rp
    JOIN permissions op ON op.id = rp.permission_id AND op.key = ANY($1)
    JOIN permissions np ON np.key = $2
    ON CONFLICT DO NOTHING RETURNING role_id, permission_id)
SELECT ins.role_id, p.key FROM ins JOIN permissions p ON p.id = ins.permission_id`, from, newKey)
}

// syncGrant runs sql, an automatic grant returning the role id and the
// granted key (a permission, or an assignable role) of each row it adds,
// and audits each row as authz.sync.grant by the system with via plus the
// key as detail.
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
	if err != nil {
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
