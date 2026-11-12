-- Assignable roles (decisions 4 and 5): which roles a role's holders may
-- assign to users or revoke from them.
--
-- role_assignable_roles lists them one by one; roles.assign_custom adds every
-- custom role, including ones created later. A superuser role is never
-- assignable (the core filters it out when loading).
--
-- Existing holders keep what they could do (decision 3): a non-superuser role
-- holding role:manage or role:assign, whatever the permission's status (the
-- split into role:define and role:assign marks role:manage removed), may
-- assign every custom role and every built-in one except the superuser role
-- and admin. A new database has no roles yet: the core seeds the built-in
-- roles with their default lists. The one-off backfill runs with the column.
CREATE TABLE IF NOT EXISTS role_assignable_roles (
    role_id            bigint NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assignable_role_id bigint NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, assignable_role_id)
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = current_schema() AND table_name = 'roles' AND column_name = 'assign_custom') THEN
        ALTER TABLE roles ADD COLUMN assign_custom boolean NOT NULL DEFAULT false;
        UPDATE roles r SET assign_custom = true
        WHERE NOT r.superuser AND EXISTS (
            SELECT 1 FROM role_permissions rp JOIN permissions p ON p.id = rp.permission_id
            WHERE rp.role_id = r.id AND p.key IN ('role:manage', 'role:assign'));
        INSERT INTO role_assignable_roles (role_id, assignable_role_id)
        SELECT r.id, b.id FROM roles r
        JOIN roles b ON b.builtin AND NOT b.superuser AND b.key <> 'admin'
        WHERE r.assign_custom
        ON CONFLICT DO NOTHING;
    END IF;
END $$;
