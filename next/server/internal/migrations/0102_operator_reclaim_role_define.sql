-- The built-in operator role defines no roles (decision D3: role:define is
-- not on its whitelist). role:manage was split into role:define and
-- role:assign by the core sync (catalog inherits, decision 3), which gave
-- the halves to every role holding role:manage, the built-in operator
-- included. The sync now leaves a built-in role out of a split its defaults
-- do not have (authz builtinsWithout), so a database upgraded from a version
-- with role:manage never gets this grant; one where an earlier start of
-- this version made it (test, staging, a verified production backup) has it
-- taken back here, once, audited by the system. Custom roles and the
-- operator's other permissions are left alone; a super admin may grant it
-- again afterwards.
--
-- The authz version moves when something was taken back, so that nodes still
-- running during a rolling upgrade drop their cached permission sets.

-- Fail fast when a lock is not to be had, rather than queue for it.
SET LOCAL lock_timeout = '10s';

-- The authz lock first, as every authz write takes it: a role change still
-- running on another node commits before the grant is read here.
SELECT 1 FROM authz_meta WHERE id = 1 FOR UPDATE;

WITH reclaimed AS (
    DELETE FROM role_permissions rp USING roles r, permissions p
    WHERE r.id = rp.role_id AND p.id = rp.permission_id
      AND r.builtin AND NOT r.superuser AND r.key = 'operator'
      AND p.source = 'core' AND p.key = 'role:define'
    RETURNING r.id AS role_id, r.key AS role, p.key AS key
), audited AS (
    INSERT INTO audit_logs (user_id, action, target_type, target_id, detail)
    SELECT NULL, 'authz.reclaim', 'role', role_id::text,
        jsonb_build_object('via', 'migration 0102', 'role', role, 'key', key)
    FROM reclaimed
)
UPDATE authz_meta SET version = version + 1 WHERE id = 1 AND EXISTS (SELECT 1 FROM reclaimed);
