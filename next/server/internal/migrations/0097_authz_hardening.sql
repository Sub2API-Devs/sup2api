-- Authz hardening (docs/DESIGN-2026-11-12-AUTHZ-HARDENING.md), the final
-- state in one transaction: a release that stops every node first
-- (maintenance), so no core of the previous version reads this database
-- again. Reversed by deploy/rollback/0.1.286-authz-down.sql.
--
--   1. One super admin (decisions 1, 2): an upgraded database must have
--      exactly one, a unique index and a commit-time trigger keep it so.
--   2. Assignable roles (decisions 3-5): role_assignable_roles and
--      roles.assign_custom.
--   3. accounts.admin_locked (W1-F10).
--   4. Scoped grants (CONTRACTS §21): permissions.scope_type and
--      role_permission_scopes.
--   5. Super-only permissions leave the built-in admin and operator (D2).
--   6. Retired keys are rewritten in roles and access keys and dropped:
--      account:own:<x> and proxy:own:<x> become <action>:own, role:manage
--      becomes role:define + role:assign (the built-in operator gets
--      role:assign only, D3) and gives the custom roles holding it an
--      assignable list.
--   7. roles.defaults_rev: which revision of its defaults a built-in role
--      has had. Existing roles start at 0, so the core sync grants each
--      built-in role the defaults it lacks once (the defaults live in code
--      only, authz builtinRoles; nothing is taken away there).
--
-- Safe to run again: schema changes are IF NOT EXISTS, the rewrites find
-- nothing left to rewrite (the retired keys are gone), and the super-only
-- reclaim runs only while role:manage still exists, which marks a database
-- this file has not rewritten. Every write is audited by the system (via
-- "migration 0097"); the authz version moves when something was written.

-- Fail fast when a lock is not to be had, rather than queue for it.
SET LOCAL lock_timeout = '10s';

-- The authz lock first, as every authz write takes it.
SELECT 1 FROM authz_meta WHERE id = 1 FOR UPDATE;

-- 1. One super admin. A soft-deleted user's rows mean nothing (DeleteUser
-- keeps user_roles), so a deleted holder loses the role first.
WITH dropped AS (
    DELETE FROM user_roles ur USING roles r, users u
    WHERE r.id = ur.role_id AND r.superuser AND u.id = ur.user_id AND u.deleted_at IS NOT NULL
    RETURNING ur.user_id, r.key
)
INSERT INTO audit_logs (user_id, action, target_type, target_id, detail)
SELECT NULL, 'user.roles', 'user', user_id::text,
    jsonb_build_object('via', 'migration 0097', 'added', '[]'::jsonb, 'removed', jsonb_build_array(key), 'deleted_user', true)
FROM dropped;

-- A database with users (an upgrade, not a new install, whose first super
-- admin the core creates after migrating) needs exactly one. Ids only: the
-- message ends up in the start-up log, emails do not belong there.
DO $$
DECLARE
    holders bigint[];
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE deleted_at IS NULL) THEN
        RETURN;
    END IF;
    SELECT COALESCE(array_agg(DISTINCT ur.user_id ORDER BY ur.user_id), '{}') INTO holders
    FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE r.superuser;
    IF cardinality(holders) = 0 THEN
        RAISE EXCEPTION 'no super admin; make an existing user the only one with "sub2api admin recover-superadmin --email <their email>", then start again';
    END IF;
    IF cardinality(holders) > 1 THEN
        RAISE EXCEPTION 'several super admins: user ids %; keep one with "sub2api admin recover-superadmin --email <the email of the one to keep>" (the others become admins), then start again',
            array_to_string(holders, ', ');
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS roles_one_superuser ON roles (superuser) WHERE superuser;

-- Checked at commit, so a transfer may delete the old holder after inserting
-- the new one; the advisory lock makes a concurrent second holder wait for the
-- first to commit and then count it.
CREATE OR REPLACE FUNCTION user_roles_one_superuser() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM roles WHERE id = NEW.role_id AND superuser) THEN
        RETURN NULL;
    END IF;
    PERFORM pg_advisory_xact_lock(hashtext('user_roles_one_superuser'));
    IF (SELECT count(*) FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE r.superuser) > 1 THEN
        RAISE EXCEPTION 'only one user may hold the super admin role'
            USING ERRCODE = 'unique_violation', CONSTRAINT = 'user_roles_one_superuser';
    END IF;
    RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS user_roles_one_superuser ON user_roles;
CREATE CONSTRAINT TRIGGER user_roles_one_superuser AFTER INSERT OR UPDATE ON user_roles
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION user_roles_one_superuser();

-- 2. Assignable roles: which roles a role's holders may assign to users or
-- revoke from them; assign_custom adds every custom role, including ones
-- created later. A superuser role is never assignable (the core filters it
-- out when loading).
CREATE TABLE IF NOT EXISTS role_assignable_roles (
    role_id            bigint NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assignable_role_id bigint NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, assignable_role_id)
);
ALTER TABLE roles ADD COLUMN IF NOT EXISTS assign_custom boolean NOT NULL DEFAULT false;

-- 3. Set when a caller with the full account:update scope disables an
-- account somebody else created; existing rows start unlocked.
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS admin_locked boolean NOT NULL DEFAULT false;

-- 4. Scoped grants: an unscoped grant stays a role_permissions row, a scoped
-- one is a role_permission_scopes row. The core sync fills scope_type.
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS scope_type varchar(20) NOT NULL DEFAULT '';
CREATE TABLE IF NOT EXISTS role_permission_scopes (
    role_id       bigint       NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id bigint       NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    -- Canonical scope, never "*" (an unscoped grant is a role_permissions
    -- row): own, group/12, group/*, group/12/account/125, account/125, proxy/8.
    scope         varchar(200) NOT NULL,
    PRIMARY KEY (role_id, permission_id, scope)
);
-- Clearing the grants that name a deleted group, account or proxy.
CREATE INDEX IF NOT EXISTS role_permission_scopes_scope_idx ON role_permission_scopes (scope);

-- 5. Super-only permissions: in no built-in role's defaults any more, so
-- what the built-in admin and operator got from their former defaults is
-- taken back. Custom roles keep theirs: someone chose to grant them.
WITH reclaimed AS (
    DELETE FROM role_permissions rp USING roles r, permissions p
    WHERE r.id = rp.role_id AND p.id = rp.permission_id
      AND r.builtin AND r.key IN ('admin', 'operator')
      AND p.source = 'core'
      AND p.key IN ('plugin:grant:critical', 'plugin:grant:db_schema_unconfined', 'publisher:manage',
                    'system:update:execute', 'system:update:recover')
      AND EXISTS (SELECT 1 FROM permissions m WHERE m.key = 'role:manage' AND m.source = 'core')
    RETURNING r.id AS role_id, r.key AS role, p.key AS key
)
INSERT INTO audit_logs (user_id, action, target_type, target_id, detail)
SELECT NULL, 'authz.reclaim.super_only', 'role', role_id::text,
    jsonb_build_object('via', 'migration 0097', 'role', role, 'key', key)
FROM reclaimed;

-- 6. Retired keys and what replaces each: an action, with a scope or ''
-- for every row, never given to the built-in roles of not_builtin.
CREATE TEMP TABLE authz_retired (old_key text, action text, scope text, not_builtin text[]) ON COMMIT DROP;
INSERT INTO authz_retired VALUES
    ('account:own:read', 'account:read', 'own', '{}'),
    ('account:own:create', 'account:create', 'own', '{}'),
    ('account:own:update', 'account:update', 'own', '{}'),
    ('account:own:delete', 'account:delete', 'own', '{}'),
    ('account:own:test', 'account:test', 'own', '{}'),
    ('account:own:credential:view', 'account:credential:view', 'own', '{}'),
    ('proxy:own:read', 'proxy:read', 'own', '{}'),
    ('proxy:own:manage', 'proxy:manage', 'own', '{}'),
    ('role:manage', 'role:define', '', '{operator}'),
    ('role:manage', 'role:assign', '', '{}');

-- The halves of role:manage, for its holders to get (the core sync writes
-- their labels and descriptions).
INSERT INTO permissions (key, module, label, source, sensitive)
SELECT v.key, 'role', v.label::jsonb, 'core', true
FROM (VALUES ('role:define', '{"en": "Define roles", "zh": "定义角色"}'),
             ('role:assign', '{"en": "Assign roles to users", "zh": "给用户分配角色"}')) v(key, label)
WHERE EXISTS (SELECT 1 FROM permissions m WHERE m.key = 'role:manage' AND m.source = 'core')
ON CONFLICT (key) DO NOTHING;

-- A custom role holding role:manage may assign what role:manage allowed:
-- every custom role and every built-in one but the superuser role and admin
-- (decision 5). The built-in roles get their default lists from the core
-- sync (step 7).
WITH holders AS (
    SELECT r.id
    FROM role_permissions rp
    JOIN permissions p ON p.id = rp.permission_id AND p.key = 'role:manage' AND p.source = 'core'
    JOIN roles r ON r.id = rp.role_id AND NOT r.builtin
), flagged AS (
    UPDATE roles r SET assign_custom = true FROM holders h WHERE r.id = h.id
    RETURNING r.id, r.assign_custom
), listed AS (
    INSERT INTO role_assignable_roles (role_id, assignable_role_id)
    SELECT h.id, b.id FROM holders h
    JOIN roles b ON b.builtin AND NOT b.superuser AND b.key <> 'admin'
    ON CONFLICT DO NOTHING
    RETURNING role_id, assignable_role_id
)
INSERT INTO audit_logs (user_id, action, target_type, target_id, detail)
SELECT NULL, 'role.assignable', 'role', f.id::text, jsonb_build_object('via', 'migration 0097',
    'role_keys', (SELECT COALESCE(jsonb_agg(a.key ORDER BY a.key), '[]') FROM listed l JOIN roles a ON a.id = l.assignable_role_id WHERE l.role_id = f.id),
    'assign_custom', f.assign_custom)
FROM flagged f;

-- Each grant of a retired key becomes its replacement: an own scope next to
-- the same action for every row is redundant and only audited.
WITH held AS (
    SELECT rp.role_id, t.old_key, t.action, t.scope, np.id AS action_id,
        t.scope <> '' AND EXISTS (SELECT 1 FROM role_permissions f WHERE f.role_id = rp.role_id AND f.permission_id = np.id) AS redundant
    FROM role_permissions rp
    JOIN permissions op ON op.id = rp.permission_id AND op.source = 'core'
    JOIN authz_retired t ON t.old_key = op.key
    JOIN permissions np ON np.key = t.action AND np.source = 'core'
    JOIN roles r ON r.id = rp.role_id AND NOT r.superuser AND NOT (r.builtin AND r.key = ANY(t.not_builtin))
), unscoped AS (
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT role_id, action_id FROM held WHERE scope = ''
    ON CONFLICT DO NOTHING
), scoped AS (
    INSERT INTO role_permission_scopes (role_id, permission_id, scope)
    SELECT role_id, action_id, scope FROM held WHERE scope <> '' AND NOT redundant
    ON CONFLICT DO NOTHING
)
INSERT INTO audit_logs (user_id, action, target_type, target_id, detail)
SELECT NULL, 'authz.grant.migrate', 'role', role_id::text, jsonb_build_object('via', 'migration 0097', 'from', old_key,
    'key', CASE WHEN scope = '' OR redundant THEN action ELSE action || ':' || scope END, 'redundant', redundant)
FROM held;

-- Access keys name the replacements instead (a key never reaches beyond its
-- user, so role:manage simply becomes both halves).
WITH keys AS (
    SELECT k.id, k.user_id, k.permissions AS before,
        ARRAY(SELECT DISTINCT n FROM unnest(k.permissions) p
              LEFT JOIN authz_retired t ON t.old_key = p,
              LATERAL (SELECT CASE WHEN t.old_key IS NULL THEN p WHEN t.scope = '' THEN t.action ELSE t.action || ':' || t.scope END) x(n)
              ORDER BY n) AS after
    FROM user_access_keys k
    WHERE k.permissions && ARRAY(SELECT old_key FROM authz_retired)
), rekeyed AS (
    UPDATE user_access_keys k SET permissions = n.after FROM keys n WHERE k.id = n.id
    RETURNING k.id, k.user_id, n.before, n.after
)
INSERT INTO audit_logs (user_id, action, target_type, target_id, detail)
SELECT NULL, 'user.access_key.migrate', 'user', user_id::text,
    jsonb_build_object('via', 'migration 0097', 'access_key_id', id, 'before', to_jsonb(before), 'after', to_jsonb(after))
FROM rekeyed;

-- The retired keys go, their grants with them.
DELETE FROM permissions WHERE source = 'core' AND key IN (SELECT old_key FROM authz_retired);

-- 7. The revision of its defaults a built-in role has had (authz
-- builtinRoles); 0 until the core sync fills it in.
ALTER TABLE roles ADD COLUMN IF NOT EXISTS defaults_rev integer NOT NULL DEFAULT 0;

-- The version moves when this run wrote something: every write above left
-- an audit row stamped with the transaction's start time.
UPDATE authz_meta SET version = version + 1
WHERE id = 1 AND EXISTS (SELECT 1 FROM audit_logs WHERE created_at = now() AND detail->>'via' = 'migration 0097');
