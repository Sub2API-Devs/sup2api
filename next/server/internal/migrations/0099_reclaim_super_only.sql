-- Super-only permissions (decision D2): plugin:grant:critical,
-- plugin:grant:db_schema_unconfined, publisher:manage, system:update:execute
-- and system:update:recover are no longer in any built-in role's defaults
-- (the core stops granting them; authz catalog superOnly). The built-in admin
-- and operator roles got them from the defaults they had before, so those
-- grants are taken back here, once, each one audited by the system. Custom
-- roles keep theirs: someone chose to grant them. A super admin may grant
-- them again to any role afterwards.
--
-- The authz version moves when something was taken back, so that nodes still
-- running during a rolling upgrade drop their cached permission sets.

-- Fail fast when a lock is not to be had, rather than queue for it.
SET LOCAL lock_timeout = '10s';

-- The authz lock first, as every authz write takes it: a role change still
-- running on another node commits before its grants are read here, and none
-- starts until this is done.
SELECT 1 FROM authz_meta WHERE id = 1 FOR UPDATE;

WITH reclaimed AS (
    DELETE FROM role_permissions rp USING roles r, permissions p
    WHERE r.id = rp.role_id AND p.id = rp.permission_id
      AND r.builtin AND r.key IN ('admin', 'operator')
      AND p.source = 'core'
      AND p.key IN ('plugin:grant:critical', 'plugin:grant:db_schema_unconfined', 'publisher:manage',
                    'system:update:execute', 'system:update:recover')
    RETURNING r.id AS role_id, r.key AS role, p.key AS key
), audited AS (
    INSERT INTO audit_logs (user_id, action, target_type, target_id, detail)
    SELECT NULL, 'authz.reclaim.super_only', 'role', role_id::text, jsonb_build_object('role', role, 'key', key)
    FROM reclaimed
)
UPDATE authz_meta SET version = version + 1 WHERE id = 1 AND EXISTS (SELECT 1 FROM reclaimed);
