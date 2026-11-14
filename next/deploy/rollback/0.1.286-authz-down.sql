-- Reverses core migrations 0097_authz_hardening.sql and
-- 0098_plugin_staged_grants.sql (core 0.1.286): puts the database back in
-- the shape core 0.1.285 runs on (migrations through 0096). Run it with every node stopped, as the database owner, in one go:
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f 0.1.286-authz-down.sql
--
-- What it does, in one transaction (see 0.1.286-authz-down.md):
--   1. Grants: <action>:own becomes the former own-level key again, also
--      where the migration found it redundant next to the full key (from
--      its audit, while the role still holds that key); group and id scopes
--      have no former spelling and are dropped (audited); role:define or
--      role:assign becomes role:manage; the super-only permissions the
--      migration took from the built-in admin and operator come back (from
--      its audit).
--   2. Access keys: the same renames; group and id scopes are dropped.
--   3. Schema: the tables, columns, index, trigger and function the
--      migration added go, and so does its schema_migrations row.
--   4. Staged plugin grants (0098): a version with a staged consent waits
--      for a new one, as after an abandoned upgrade (core 0.1.285 would run
--      it without them), audited as plugin.grants.withdraw; the table and
--      the schema_migrations row go.
-- Every change is audited by the system with via "rollback 0.1.286"; the
-- authz version moves.

BEGIN;

SET LOCAL lock_timeout = '10s';

SELECT 1 FROM authz_meta WHERE id = 1 FOR UPDATE;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM schema_migrations WHERE id = '0097_authz_hardening.sql') THEN
        RAISE EXCEPTION 'migration 0097_authz_hardening.sql is not applied: nothing to roll back';
    END IF;
    IF EXISTS (SELECT 1 FROM schema_migrations WHERE id > '0098_plugin_staged_grants.sql') THEN
        RAISE EXCEPTION 'migrations after 0098_plugin_staged_grants.sql are applied: roll those back first';
    END IF;
    IF to_regclass('plugin_staged_grants') IS NOT NULL THEN
        WITH reset AS (
            UPDATE plugin_versions v SET consent_status = 'awaiting_consent'
            WHERE v.consent_status = 'approved'
              AND EXISTS (SELECT 1 FROM plugin_staged_grants s WHERE s.plugin_key = v.plugin_key AND s.version = v.version)
            RETURNING v.plugin_key, v.version)
        INSERT INTO audit_logs (user_id, action, target_type, target_id, detail)
        SELECT NULL, 'plugin.grants.withdraw', 'plugin', r.plugin_key,
            jsonb_build_object('via', 'rollback 0.1.286', 'version', r.version, 'reason', 'rollback',
                'permissions', (SELECT COALESCE(jsonb_agg(s.permission ORDER BY s.permission), '[]') FROM plugin_staged_grants s
                    WHERE s.plugin_key = r.plugin_key AND s.version = r.version AND s.status = 'granted'))
        FROM reset r;
        DROP TABLE plugin_staged_grants;
    END IF;
    DELETE FROM schema_migrations WHERE id = '0098_plugin_staged_grants.sql';
END $$;

-- The keys core 0.1.285 has and 0.1.286 replaced, each with its
-- replacement (an action, with a scope or '' for every row). Its sync
-- writes their labels again on start.
CREATE TEMP TABLE authz_retired (old_key text, action text, scope text, label jsonb, sensitive boolean) ON COMMIT DROP;
INSERT INTO authz_retired VALUES
    ('account:own:read', 'account:read', 'own', '{"en": "Read own accounts", "zh": "查看自己创建的账号"}', false),
    ('account:own:create', 'account:create', 'own', '{"en": "Create own accounts", "zh": "新建账号（归自己所有）"}', false),
    ('account:own:update', 'account:update', 'own', '{"en": "Edit own accounts", "zh": "编辑自己创建的账号"}', false),
    ('account:own:delete', 'account:delete', 'own', '{"en": "Delete own accounts", "zh": "删除自己创建的账号"}', false),
    ('account:own:test', 'account:test', 'own', '{"en": "Test own accounts", "zh": "测试自己创建的账号"}', false),
    ('account:own:credential:view', 'account:credential:view', 'own', '{"en": "View own account credentials", "zh": "查看自己创建账号的凭证"}', true),
    ('proxy:own:read', 'proxy:read', 'own', '{"en": "View own proxies", "zh": "查看自己创建的代理"}', false),
    ('proxy:own:manage', 'proxy:manage', 'own', '{"en": "Manage own proxies", "zh": "管理自己创建的代理"}', false),
    ('role:manage', 'role:define', '', '{"en": "Manage roles and assignments", "zh": "管理角色与分配"}', true),
    ('role:manage', 'role:assign', '', '{"en": "Manage roles and assignments", "zh": "管理角色与分配"}', true);

INSERT INTO permissions (key, module, label, source, sensitive)
SELECT DISTINCT ON (old_key) old_key, split_part(old_key, ':', 1), label, 'core', sensitive FROM authz_retired
ORDER BY old_key
ON CONFLICT (key) DO NOTHING;

-- 1. Grants. Each role gets the former key of every replacement it holds:
-- own scopes, role:define and role:assign as they are now, and own scopes
-- the migration audited as redundant next to a full key the role still
-- holds.
WITH now_held AS (
    SELECT rs.role_id, t.old_key, ap.key || ':' || rs.scope AS key
    FROM role_permission_scopes rs
    JOIN permissions ap ON ap.id = rs.permission_id
    JOIN authz_retired t ON t.action = ap.key AND t.scope = rs.scope
    UNION
    SELECT rp.role_id, t.old_key, ap.key
    FROM role_permissions rp
    JOIN permissions ap ON ap.id = rp.permission_id
    JOIN authz_retired t ON t.action = ap.key AND t.scope = ''
    JOIN roles r ON r.id = rp.role_id AND NOT r.superuser
    UNION
    SELECT rp.role_id, a.detail->>'from', a.detail->>'key'
    FROM audit_logs a
    JOIN permissions ap ON ap.key = a.detail->>'key'
    JOIN role_permissions rp ON rp.role_id = a.target_id::bigint AND rp.permission_id = ap.id
    WHERE a.action = 'authz.grant.migrate' AND a.target_type = 'role' AND a.detail->>'via' = 'migration 0097'
      AND (a.detail->>'redundant')::boolean
), restored AS (
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT DISTINCT h.role_id, p.id FROM now_held h JOIN permissions p ON p.key = h.old_key
    ON CONFLICT DO NOTHING
    RETURNING role_id, permission_id
)
INSERT INTO audit_logs (user_id, action, target_type, target_id, detail)
SELECT NULL, 'authz.grant.migrate', 'role', r.role_id::text,
    jsonb_build_object('via', 'rollback 0.1.286', 'key', p.key,
        'from', (SELECT jsonb_agg(DISTINCT h.key) FROM now_held h WHERE h.role_id = r.role_id AND h.old_key = p.key))
FROM restored r JOIN permissions p ON p.id = r.permission_id;

-- Group and id scopes: no former spelling, dropped with the table below.
INSERT INTO audit_logs (user_id, action, target_type, target_id, detail)
SELECT NULL, 'authz.grant.migrate', 'role', rs.role_id::text,
    jsonb_build_object('via', 'rollback 0.1.286', 'dropped', p.key || ':' || rs.scope)
FROM role_permission_scopes rs JOIN permissions p ON p.id = rs.permission_id
WHERE rs.scope <> 'own';

-- The super-only permissions the migration took back.
WITH returned AS (
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id FROM audit_logs a
    JOIN roles r ON r.id = a.target_id::bigint
    JOIN permissions p ON p.key = a.detail->>'key' AND p.source = 'core'
    WHERE a.action = 'authz.reclaim.super_only' AND a.target_type = 'role' AND a.detail->>'via' = 'migration 0097'
    ON CONFLICT DO NOTHING
    RETURNING role_id, permission_id
)
INSERT INTO audit_logs (user_id, action, target_type, target_id, detail)
SELECT NULL, 'authz.grant.migrate', 'role', r.role_id::text, jsonb_build_object('via', 'rollback 0.1.286', 'key', p.key)
FROM returned r JOIN permissions p ON p.id = r.permission_id;

-- 2. Access keys: former keys for their replacements, group and id scopes
-- left out.
WITH keys AS (
    SELECT k.id, k.user_id, k.permissions AS before,
        ARRAY(SELECT DISTINCT COALESCE(t.old_key, p) FROM unnest(k.permissions) p
              LEFT JOIN authz_retired t ON p = CASE WHEN t.scope = '' THEN t.action ELSE t.action || ':' || t.scope END
              WHERE t.old_key IS NOT NULL OR p !~ ':(group|account|proxy)/'
              ORDER BY 1) AS after
    FROM user_access_keys k
), rekeyed AS (
    UPDATE user_access_keys k SET permissions = n.after FROM keys n WHERE k.id = n.id AND NOT (n.after @> n.before AND n.after <@ n.before)
    RETURNING k.id, k.user_id, n.before, n.after
)
INSERT INTO audit_logs (user_id, action, target_type, target_id, detail)
SELECT NULL, 'user.access_key.migrate', 'user', user_id::text,
    jsonb_build_object('via', 'rollback 0.1.286', 'access_key_id', id, 'before', to_jsonb(before), 'after', to_jsonb(after))
FROM rekeyed;

-- role:define and role:assign go, their grants with them.
DELETE FROM permissions WHERE source = 'core' AND key IN ('role:define', 'role:assign');

-- 3. Schema.
DROP TRIGGER IF EXISTS user_roles_one_superuser ON user_roles;
DROP FUNCTION IF EXISTS user_roles_one_superuser();
DROP INDEX IF EXISTS roles_one_superuser;
DROP TABLE IF EXISTS role_assignable_roles;
ALTER TABLE roles DROP COLUMN IF EXISTS assign_custom;
ALTER TABLE roles DROP COLUMN IF EXISTS defaults_rev;
ALTER TABLE accounts DROP COLUMN IF EXISTS admin_locked;
DROP TABLE IF EXISTS role_permission_scopes;
ALTER TABLE permissions DROP COLUMN IF EXISTS scope_type;
DELETE FROM schema_migrations WHERE id = '0097_authz_hardening.sql';

UPDATE authz_meta SET version = version + 1 WHERE id = 1;

COMMIT;
