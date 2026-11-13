-- Scoped permission keys (CONTRACTS §21, 期 4 R2a): a grant of an account
-- or proxy action may carry a scope, "<action>:<scope>" (own, group/12,
-- group/12/account/125, account/125, proxy/8). Unscoped grants stay in
-- role_permissions; scoped ones go to role_permission_scopes, which older
-- cores do not read, so a scoped grant never widens to every row on a node
-- still running one (they fail closed).
--
-- First of two steps, for a rolling upgrade: the eight former own-level keys
-- (account:own:<x>, proxy:own:<x>) stay active and their grants stay, so
-- older nodes keep working; this core reads them as aliases of
-- <action>:own and writes both. Here every such grant is copied to its
-- scoped form, word for word: account:own:read on a role becomes
-- (account:read, own). A role already holding the unscoped action is left
-- alone (every row implies its own; the redundant grant is audited only).
-- Access keys get the scoped spelling next to the former one. The next
-- version (R2b) retires the aliases.
--
-- Safe to run again: inserts only what is missing; audits only what it
-- writes (a redundant grant once). The authz version moves when something
-- was written.

SET LOCAL lock_timeout = '10s';

-- The authz lock first, as every authz write takes it.
SELECT 1 FROM authz_meta WHERE id = 1 FOR UPDATE;

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

-- The actions that take a scope (the core sync keeps it up to date).
UPDATE permissions SET scope_type = split_part(key, ':', 1)
WHERE source = 'core' AND scope_type = ''
  AND key IN ('account:read', 'account:create', 'account:update', 'account:delete', 'account:test',
              'account:credential:view', 'proxy:read', 'proxy:manage');

WITH legacy(old_key, action) AS (VALUES
    ('account:own:read', 'account:read'), ('account:own:create', 'account:create'),
    ('account:own:update', 'account:update'), ('account:own:delete', 'account:delete'),
    ('account:own:test', 'account:test'), ('account:own:credential:view', 'account:credential:view'),
    ('proxy:own:read', 'proxy:read'), ('proxy:own:manage', 'proxy:manage')
), held AS (
    -- Every live former own-level grant, and whether the role also holds the
    -- action for every row.
    SELECT rp.role_id, l.old_key, l.action, np.id AS action_id,
        EXISTS (SELECT 1 FROM role_permissions f WHERE f.role_id = rp.role_id AND f.permission_id = np.id) AS redundant
    FROM role_permissions rp
    JOIN permissions op ON op.id = rp.permission_id AND op.status <> 'removed'
    JOIN legacy l ON l.old_key = op.key
    JOIN permissions np ON np.key = l.action AND np.source = 'core'
), converted AS (
    INSERT INTO role_permission_scopes (role_id, permission_id, scope)
    SELECT role_id, action_id, 'own' FROM held WHERE NOT redundant
    ON CONFLICT DO NOTHING
    RETURNING role_id, permission_id
), converted_audit AS (
    INSERT INTO audit_logs (user_id, action, target_type, target_id, detail)
    SELECT NULL, 'authz.scope.migrate', 'role', h.role_id::text,
        jsonb_build_object('via', 'migration 0103', 'from', h.old_key, 'key', h.action || ':own')
    FROM converted c JOIN held h ON h.role_id = c.role_id AND h.action_id = c.permission_id
), redundant_audit AS (
    INSERT INTO audit_logs (user_id, action, target_type, target_id, detail)
    SELECT NULL, 'authz.scope.migrate', 'role', h.role_id::text,
        jsonb_build_object('via', 'migration 0103', 'from', h.old_key, 'key', h.action, 'redundant', true)
    FROM held h
    WHERE h.redundant AND NOT EXISTS (
        SELECT 1 FROM audit_logs a WHERE a.action = 'authz.scope.migrate' AND a.target_type = 'role'
          AND a.target_id = h.role_id::text AND a.detail->>'via' = 'migration 0103' AND a.detail->>'from' = h.old_key)
    RETURNING id
), keys AS (
    -- Access keys: the scoped spelling of each former own-level key, next
    -- to it.
    SELECT k.id, k.user_id, k.permissions AS before,
        k.permissions || ARRAY(
            SELECT l.action || ':own' FROM legacy l
            WHERE l.old_key = ANY(k.permissions) AND NOT (l.action || ':own') = ANY(k.permissions)
            ORDER BY l.old_key) AS after
    FROM user_access_keys k
    WHERE k.permissions && ARRAY(SELECT old_key FROM legacy)
), rekeyed AS (
    UPDATE user_access_keys k SET permissions = n.after
    FROM keys n WHERE k.id = n.id AND n.after <> n.before
    RETURNING k.id, k.user_id, n.before, n.after
), rekeyed_audit AS (
    INSERT INTO audit_logs (user_id, action, target_type, target_id, detail)
    SELECT NULL, 'user.access_key.migrate', 'user', user_id::text,
        jsonb_build_object('via', 'migration 0103', 'access_key_id', id, 'before', to_jsonb(before), 'after', to_jsonb(after))
    FROM rekeyed
)
UPDATE authz_meta SET version = version + 1
WHERE id = 1 AND (EXISTS (SELECT 1 FROM converted) OR EXISTS (SELECT 1 FROM rekeyed));
