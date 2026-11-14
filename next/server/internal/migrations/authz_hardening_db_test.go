package migrations_test

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/authz"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/migrations"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

const (
	// lastReleased is the last core migration of 0.1.285, the release before
	// the authz hardening.
	lastReleased = "0096_usage_base_cost.sql"
	hardening    = "0097_authz_hardening.sql"
)

// hardeningDB is a database as core 0.1.285 leaves it, with the authz data
// its sync and administrators wrote (see seed).
type hardeningDB struct {
	t   *testing.T
	db  *store.DB
	ctx context.Context
}

func newHardeningDB(t *testing.T) *hardeningDB {
	h := &hardeningDB{t: t, db: testutil.DBThrough(t, lastReleased), ctx: context.Background()}
	h.seed()
	return h
}

func (h *hardeningDB) exec(sql string, args ...any) {
	h.t.Helper()
	_, err := h.db.Pool.Exec(h.ctx, sql, args...)
	require.NoError(h.t, err)
}

func (h *hardeningDB) text(sql string, args ...any) (v string) {
	h.t.Helper()
	require.NoError(h.t, h.db.Pool.QueryRow(h.ctx, sql, args...).Scan(&v))
	return v
}

func (h *hardeningDB) migrate() error {
	_, err := store.Migrate(h.ctx, h.db, migrations.FS, store.CoreTracker{}, store.MigrateOptions{LockKey: store.CoreMigrationLockKey})
	return err
}

// seed writes what 0.1.285 leaves: the built-in roles with their former
// defaults (admin every permission, operator all but the plugin modules,
// both with role:manage and every former own-level key next to the full
// one; a user role an administrator took balance:self:read from), custom
// roles holding former own-level keys alone or next to the full key,
// role:manage, or super-only permissions, one super admin, and access keys
// naming retired keys.
func (h *hardeningDB) seed() {
	h.exec(`
INSERT INTO roles (key, name, builtin, superuser) VALUES
    ('super_admin', '{}', true, true), ('admin', '{}', true, false), ('operator', '{}', true, false), ('user', '{}', true, false),
    ('seller', '{}', false, false), ('mixed', '{}', false, false), ('delegator', '{}', false, false), ('updater', '{}', false, false);
INSERT INTO permissions (key, module, label, source, sensitive)
SELECT k, split_part(k, ':', 1), '{"en": "x"}', 'core', false FROM unnest(ARRAY[
    'user:read', 'role:read', 'role:manage', 'apikey:self:manage', 'gateway:use', 'balance:self:read',
    'account:read', 'account:create', 'account:update', 'account:delete', 'account:test', 'account:credential:view',
    'account:own:read', 'account:own:create', 'account:own:update', 'account:own:delete', 'account:own:test', 'account:own:credential:view',
    'proxy:read', 'proxy:manage', 'proxy:own:read', 'proxy:own:manage',
    'plugin:grant:high', 'plugin:grant:critical', 'plugin:grant:db_schema_unconfined', 'publisher:manage',
    'system:update:read', 'system:update:execute', 'system:update:recover']) k;
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE
       r.key = 'admin'
    OR (r.key = 'operator' AND p.key NOT LIKE 'plugin:%' AND p.key NOT LIKE 'publisher:%')
    OR (r.key = 'user' AND p.key IN ('apikey:self:manage', 'gateway:use'))
    OR (r.key = 'seller' AND p.key IN ('account:own:read', 'account:own:update', 'account:own:credential:view', 'proxy:own:manage'))
    OR (r.key = 'mixed' AND p.key IN ('account:read', 'account:own:read', 'account:own:delete', 'proxy:read', 'proxy:own:read'))
    OR (r.key = 'delegator' AND p.key IN ('role:manage', 'user:read'))
    OR (r.key = 'updater' AND p.key IN ('plugin:grant:critical', 'publisher:manage', 'system:update:execute'));
INSERT INTO users (email, password_hash) VALUES ('root@x', ''), ('admin@x', ''), ('op@x', ''), ('seller@x', ''), ('d@x', '');
INSERT INTO user_roles (user_id, role_id) SELECT u.id, r.id FROM users u JOIN roles r ON (u.email, r.key) IN (
    ('root@x', 'super_admin'), ('admin@x', 'admin'), ('op@x', 'operator'), ('seller@x', 'user'), ('seller@x', 'seller'), ('d@x', 'delegator'));
INSERT INTO user_access_keys (user_id, name, token_hash, token_hint, permissions)
SELECT u.id, u.email, md5(u.email), '0000', k.perms FROM users u JOIN (VALUES
    ('root@x', '{user:read,role:manage,account:own:read}'::text[]),
    ('seller@x', '{proxy:own:manage,account:own:read}'),
    ('op@x', '{account:read,account:own:update}')) k(email, perms) ON k.email = u.email`)
}

// grants lists "<role> <grant>" for every grant (scoped ones as
// <action>:<scope>), sorted.
func (h *hardeningDB) grants() string {
	h.t.Helper()
	scoped := ""
	if h.text(`SELECT (to_regclass('role_permission_scopes') IS NOT NULL)::text`) == "true" {
		scoped = `UNION ALL SELECT r.key || ' ' || p.key || ':' || rs.scope FROM role_permission_scopes rs
    JOIN roles r ON r.id = rs.role_id JOIN permissions p ON p.id = rs.permission_id`
	}
	return h.text(`SELECT COALESCE(string_agg(g, ', ' ORDER BY g), '') FROM (
    SELECT r.key || ' ' || p.key AS g FROM role_permissions rp JOIN roles r ON r.id = rp.role_id JOIN permissions p ON p.id = rp.permission_id
    ` + scoped + `) x`)
}

// rolesGrants is grants restricted to the roles of keys.
func (h *hardeningDB) roleGrants(keys ...string) string {
	h.t.Helper()
	var out []string
	for _, g := range strings.Split(h.grants(), ", ") {
		role, _, _ := strings.Cut(g, " ")
		for _, k := range keys {
			if role == k {
				out = append(out, g)
			}
		}
	}
	return strings.Join(out, ", ")
}

// accessKeys lists each key's name and sorted permissions.
func (h *hardeningDB) accessKeys() string {
	h.t.Helper()
	return h.text(`SELECT string_agg(name || '=' || array_to_string(ARRAY(SELECT p FROM unnest(permissions) p ORDER BY p), ','), ' ' ORDER BY name) FROM user_access_keys`)
}

// assignable lists "<role>=<assign_custom>:<assignable keys>" of every role
// with something to assign.
func (h *hardeningDB) assignable() string {
	h.t.Helper()
	return h.text(`SELECT COALESCE(string_agg(x, ' ' ORDER BY x), '') FROM (
    SELECT r.key || '=' || r.assign_custom::text || ':' || COALESCE(string_agg(a.key, ',' ORDER BY a.key), '') AS x
    FROM roles r LEFT JOIN role_assignable_roles ra ON ra.role_id = r.id LEFT JOIN roles a ON a.id = ra.assignable_role_id
    GROUP BY r.key, r.assign_custom HAVING r.assign_custom OR count(a.id) > 0) s`)
}

// state is everything the migration writes, for comparing runs.
func (h *hardeningDB) state() string {
	h.t.Helper()
	return strings.Join([]string{h.grants(), h.assignable(), h.accessKeys(),
		h.text(`SELECT string_agg(key, ',' ORDER BY key) FROM permissions`),
		h.text(`SELECT count(*)::text FROM audit_logs`),
		h.text(`SELECT version::text FROM authz_meta WHERE id = 1`)}, "\n")
}

// schema describes the public schema: tables, columns, indexes,
// constraints, triggers and functions, sorted.
func (h *hardeningDB) schema() string {
	h.t.Helper()
	return h.text(`SELECT string_agg(d, E'\n' ORDER BY d) FROM (
    SELECT 'table ' || relname || ' ' || relkind::text AS d FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relkind IN ('r', 'v', 'm', 'S', 'p')
    UNION ALL SELECT 'column ' || table_name || '.' || column_name || ' ' || data_type || ' ' || is_nullable || ' ' || COALESCE(column_default, '')
        FROM information_schema.columns WHERE table_schema = 'public'
    UNION ALL SELECT 'index ' || indexdef FROM pg_indexes WHERE schemaname = 'public'
    UNION ALL SELECT 'constraint ' || conrelid::regclass || ' ' || conname || ' ' || pg_get_constraintdef(oid) FROM pg_constraint WHERE connamespace = 'public'::regnamespace
    UNION ALL SELECT 'trigger ' || pg_get_triggerdef(oid) FROM pg_trigger WHERE NOT tgisinternal
    UNION ALL SELECT 'function ' || oid::regprocedure || ' ' || md5(pg_get_functiondef(oid)) FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND prokind IN ('f', 'p')
) s`)
}

func (h *hardeningDB) syncCore() {
	h.t.Helper()
	require.NoError(h.t, authz.New(authz.Deps{DB: h.db}).SyncCore(h.ctx))
}

// The migration on a 0.1.285 database writes the final state: former
// own-level grants become own scopes (only audited when redundant next to
// the full key), role:manage its halves (the built-in operator role:assign
// only) with an assignable list for custom roles, the super-only
// permissions leave the built-in admin and operator, access keys name the
// replacements, the retired keys are gone and defaults_rev starts at 0.
// Everything is audited, the version moves once, a second run changes
// nothing. The core sync afterwards gives each built-in role the defaults
// it lacks (their assignable lists, the supplier role, the user role's
// balance:self:read), keeps what they hold beyond them, brings none of the
// retired or reclaimed keys back, and does it once.
func TestAuthzHardeningMigration(t *testing.T) {
	h := newHardeningDB(t)
	version := h.text(`SELECT version::text FROM authz_meta`)
	require.NoError(t, h.migrate())

	require.Equal(t, "", h.text(`SELECT COALESCE(string_agg(key, ','), '') FROM permissions WHERE key LIKE '%:own:%' OR key = 'role:manage'`))
	require.Equal(t, "seller account:credential:view:own, seller account:read:own, seller account:update:own, seller proxy:manage:own", h.roleGrants("seller"))
	require.Equal(t, "mixed account:delete:own, mixed account:read, mixed proxy:read", h.roleGrants("mixed"))
	require.Equal(t, "delegator role:assign, delegator role:define, delegator user:read", h.roleGrants("delegator"))
	require.Equal(t, "updater plugin:grant:critical, updater publisher:manage, updater system:update:execute", h.roleGrants("updater"), "a custom role lost its grants")
	operator := "operator account:create, operator account:credential:view, operator account:delete, operator account:read, operator account:test, operator account:update, " +
		"operator apikey:self:manage, operator balance:self:read, operator gateway:use, operator proxy:manage, operator proxy:read, operator role:assign, operator role:read, " +
		"operator system:update:read, operator user:read"
	require.Equal(t, operator, h.roleGrants("operator"))
	require.Equal(t, "admin account:create, admin account:credential:view, admin account:delete, admin account:read, admin account:test, admin account:update, "+
		"admin apikey:self:manage, admin balance:self:read, admin gateway:use, admin plugin:grant:high, admin proxy:manage, admin proxy:read, admin role:assign, admin role:define, admin role:read, "+
		"admin system:update:read, admin user:read", h.roleGrants("admin"))
	require.Equal(t, "delegator=true:operator,user", h.assignable(), "built-in lists are the core sync's")
	require.Equal(t, "0", h.text(`SELECT max(defaults_rev)::text FROM roles`))
	require.Equal(t, "op@x=account:read,account:update:own root@x=account:read:own,role:assign,role:define,user:read seller@x=account:read:own,proxy:manage:own", h.accessKeys())
	require.Equal(t, version, h.text(`SELECT (version - 1)::text FROM authz_meta`), "the version moves once")
	require.Equal(t, "authz.grant.migrate=28 authz.reclaim.super_only=7 role.assignable=1 user.access_key.migrate=3",
		h.text(`SELECT string_agg(action || '=' || n, ' ' ORDER BY action) FROM (
            SELECT action, count(*) AS n FROM audit_logs WHERE user_id IS NULL AND detail->>'via' = 'migration 0097' GROUP BY action) a`))
	require.Equal(t, "operator account:own:read account:read true", h.text(`SELECT r.key || ' ' || (a.detail->>'from') || ' ' || (a.detail->>'key') || ' ' || (a.detail->>'redundant')
        FROM audit_logs a JOIN roles r ON r.id = a.target_id::bigint WHERE a.action = 'authz.grant.migrate' AND r.key = 'operator' AND a.detail->>'from' = 'account:own:read'`))

	// Again (only a forgotten migration row does that): nothing changes.
	migrated := h.state()
	h.exec(`DELETE FROM schema_migrations WHERE id = $1`, hardening)
	require.NoError(t, h.migrate())
	require.Equal(t, migrated, h.state())

	lastSeeded := h.text(`SELECT max(id)::text FROM permissions`)
	// The core sync creates the supplier role, fills the built-in roles in
	// (only the defaults they lack: the operator keeps account:credential:view
	// and system:update:read, gets no own scope next to the full key) and
	// gives back none of the retired keys, the reclaimed super-only ones, nor
	// role:define to the operator.
	h.syncCore()
	require.Equal(t, "admin=true:operator,supplier,user delegator=true:operator,user operator=false:supplier,user", h.assignable())
	require.Equal(t, "supplier account:create:own, supplier account:credential:view:own, supplier account:delete:own, supplier account:read:own, "+
		"supplier account:test:own, supplier account:update:own, supplier proxy:manage:own, supplier proxy:read:own, supplier usage:self:read", h.roleGrants("supplier"))
	require.Equal(t, "", h.text(`SELECT COALESCE(string_agg(key, ','), '') FROM permissions WHERE key LIKE '%:own:%' OR key = 'role:manage'`))
	opGrants := h.roleGrants("operator")
	for _, g := range strings.Split(operator, ", ") {
		require.Contains(t, opGrants, g, "the operator lost a grant beyond its defaults")
	}
	require.NotContains(t, opGrants, "role:define")
	require.NotContains(t, opGrants, "account:credential:view:own")
	require.NotContains(t, h.roleGrants("admin", "operator"), "system:update:execute")
	require.Contains(t, h.roleGrants("user"), "user balance:self:read")
	// Each fill is audited with the rev. Of what existed before the sync:
	// the permission the user role lacked and the assignable lists
	// (assign_custom on the admin).
	require.Equal(t, "admin assign_custom, admin operator, admin supplier, admin user, operator supplier, operator user, user balance:self:read",
		h.text(`SELECT string_agg(g, ', ' ORDER BY g) FROM (
            SELECT r.key || ' ' || COALESCE(a.detail->>'key', 'assign_custom') AS g
            FROM audit_logs a JOIN roles r ON r.id = a.target_id::bigint
            LEFT JOIN permissions p ON p.key = a.detail->>'key'
            WHERE a.action = 'authz.sync.grant' AND a.detail->>'defaults_rev' = '1' AND (p.id IS NULL OR p.id <= $1)) x`, lastSeeded))
	require.Equal(t, "1", h.text(`SELECT min(defaults_rev)::text FROM roles WHERE builtin`))

	// A restart fills nothing again: what an administrator removes stays
	// removed.
	h.exec(`DELETE FROM role_permissions WHERE role_id = (SELECT id FROM roles WHERE key = 'user')
        AND permission_id = (SELECT id FROM permissions WHERE key = 'balance:self:read')`)
	synced := h.state()
	h.syncCore()
	require.Equal(t, synced, h.state())
}

// An upgraded database needs exactly one super admin: none, or two
// (whatever their status; a soft-deleted holder does not count), stops the
// migration with the way out, naming holders by id only, and leaves the
// database as it was.
func TestAuthzHardeningNeedsOneSuperAdmin(t *testing.T) {
	for _, tc := range []struct {
		name, setup, want string
	}{
		{"none", `DELETE FROM user_roles WHERE role_id = (SELECT id FROM roles WHERE key = 'super_admin')`,
			`no super admin; make an existing user the only one with "sub2api admin recover-superadmin --email <their email>"`},
		{"two", `INSERT INTO users (email, password_hash, status) VALUES ('other@x', '', 'disabled'), ('gone@x', '', 'active');
            UPDATE users SET deleted_at = now() WHERE email = 'gone@x';
            INSERT INTO user_roles (user_id, role_id) SELECT u.id, r.id FROM users u, roles r WHERE r.superuser AND u.email IN ('other@x', 'gone@x')`,
			`several super admins: user ids %s; keep one with "sub2api admin recover-superadmin --email <the email of the one to keep>"`},
	} {
		t.Run(tc.name, func(t *testing.T) {
			h := newHardeningDB(t)
			h.exec(tc.setup)
			want := tc.want
			if strings.Contains(want, "%s") {
				want = strings.Replace(want, "%s", h.text(`SELECT string_agg(id::text, ', ' ORDER BY id) FROM users WHERE email IN ('root@x', 'other@x')`), 1)
			}
			err := h.migrate()
			require.ErrorContains(t, err, want)
			require.NotContains(t, err.Error(), "@x", "the start-up error names a user's email")
			require.Equal(t, "", h.text(`SELECT COALESCE(string_agg(id, ','), '') FROM schema_migrations WHERE id = $1`, hardening))
			require.Equal(t, "true", h.text(`SELECT (to_regclass('role_permission_scopes') IS NULL)::text`))
			require.Equal(t, "1", h.text(`SELECT count(*)::text FROM permissions WHERE key = 'role:manage'`))
		})
	}
}

// The rollback script puts the database back in the shape 0.1.285 runs on:
// the schema of a database migrated through 0096, the former grants of
// every role and access key (own scopes, the redundant ones the migration
// only audited, role:manage, the super-only permissions taken back), with
// group scopes written since dropped and audited. What the core sync's
// first fill gave a built-in role stays (here the user role's
// balance:self:read): one of its 0.1.285 defaults too. Upgrading again then
// gives the same grants as the first upgrade.
func TestAuthzHardeningRollback(t *testing.T) {
	h := newHardeningDB(t)
	schema, grants, keys := h.schema(), h.grants(), h.accessKeys()

	require.NoError(t, h.migrate())
	h.syncCore()
	upgraded := h.roleGrants("admin", "operator", "user", "seller", "mixed", "delegator", "updater")
	// Written after the upgrade: a group scope, which 0.1.285 cannot express.
	h.exec(`INSERT INTO role_permission_scopes (role_id, permission_id, scope)
        SELECT r.id, p.id, 'group/12' FROM roles r, permissions p WHERE r.key = 'seller' AND p.key = 'account:test'`)
	h.exec(`UPDATE user_access_keys SET permissions = permissions || '{account:test:group/12}' WHERE name = 'seller@x'`)

	down, err := os.ReadFile(filepath.Join("..", "..", "..", "deploy", "rollback", "0.1.286-authz-down.sql"))
	require.NoError(t, err)
	h.exec(string(down))

	require.Equal(t, schema, h.schema())
	// 0.1.285 grants nothing for the permissions only 0.1.286 has (its sync
	// marks them removed); the supplier role is new and left alone.
	require.Equal(t, strings.Replace(grants, "user apikey:self:manage", "user apikey:self:manage, user balance:self:read", 1),
		filterGrants(h.roleGrants("admin", "operator", "user", "seller", "mixed", "delegator", "updater", "super_admin"), grants))
	require.Equal(t, keys, h.accessKeys())
	require.Equal(t, "1", h.text(`SELECT count(*)::text FROM audit_logs WHERE detail->>'via' = 'rollback 0.1.286' AND detail->>'dropped' = 'account:test:group/12'`))

	_, err = h.db.Pool.Exec(h.ctx, string(down))
	require.ErrorContains(t, err, "nothing to roll back")

	require.NoError(t, h.migrate())
	h.syncCore()
	require.Equal(t, upgraded, h.roleGrants("admin", "operator", "user", "seller", "mixed", "delegator", "updater"))
}

// filterGrants keeps the grants of got whose permission appears in want: the
// permissions 0.1.285 knows.
func filterGrants(got, want string) string {
	known := map[string]bool{}
	for _, g := range strings.Split(want, ", ") {
		_, p, _ := strings.Cut(g, " ")
		known[p] = true
	}
	var out []string
	for _, g := range strings.Split(got, ", ") {
		if _, p, _ := strings.Cut(g, " "); known[p] {
			out = append(out, g)
		}
	}
	return strings.Join(out, ", ")
}
