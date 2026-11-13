-- The built-in operator role assigns the supplier and user roles and nothing
-- else (decision 5). 0097 gave an existing operator role what role:manage
-- used to allow instead: every built-in role but the super admin and admin
-- (itself included) and every custom role. That list was generated, not
-- chosen by an administrator, so it is narrowed here once, audited by the
-- system. Only the built-in operator role is touched, and only its
-- assignable list; its permissions stay.
--
-- The supplier role may not exist yet: the core creates it at the start that
-- follows and adds it to this list then.
--
-- The authz version moves when something changed, so that nodes still
-- running during a rolling upgrade drop their cached permission sets.

-- Fail fast when a lock is not to be had, rather than queue for it.
SET LOCAL lock_timeout = '10s';

-- The authz lock first, as every authz write takes it: a role change still
-- running on another node commits before the list is read here.
SELECT 1 FROM authz_meta WHERE id = 1 FOR UPDATE;

WITH op AS (
    SELECT id, assign_custom FROM roles WHERE key = 'operator' AND builtin AND NOT superuser
), keep AS (
    SELECT id, key FROM roles WHERE builtin AND NOT superuser AND key IN ('supplier', 'user')
), removed AS (
    DELETE FROM role_assignable_roles ra USING op, roles a
    WHERE ra.role_id = op.id AND a.id = ra.assignable_role_id AND a.id NOT IN (SELECT id FROM keep)
    RETURNING a.key
), added AS (
    INSERT INTO role_assignable_roles (role_id, assignable_role_id)
    SELECT op.id, keep.id FROM op, keep
    ON CONFLICT DO NOTHING
    RETURNING assignable_role_id
), narrowed AS (
    UPDATE roles r SET assign_custom = false, updated_at = now() FROM op WHERE r.id = op.id AND op.assign_custom
    RETURNING r.id
), changed AS (
    SELECT op.id FROM op
    WHERE EXISTS (SELECT 1 FROM removed) OR EXISTS (SELECT 1 FROM added) OR EXISTS (SELECT 1 FROM narrowed)
), audited AS (
    INSERT INTO audit_logs (user_id, action, target_type, target_id, detail)
    SELECT NULL, 'role.assignable', 'role', changed.id::text, jsonb_build_object(
        'via', 'migration 0101',
        'role_keys', (SELECT COALESCE(jsonb_agg(key ORDER BY key), '[]') FROM keep),
        'assign_custom', false,
        'added', (SELECT COALESCE(jsonb_agg(keep.key ORDER BY keep.key), '[]') FROM added JOIN keep ON keep.id = added.assignable_role_id),
        'removed', (SELECT COALESCE(jsonb_agg(key ORDER BY key), '[]') FROM removed),
        'removed_assign_custom', EXISTS (SELECT 1 FROM narrowed))
    FROM changed
)
UPDATE authz_meta SET version = version + 1 WHERE id = 1 AND EXISTS (SELECT 1 FROM changed);
