-- One super admin (decisions 1 and 2): at most one superuser role, held by at
-- most one user. Static predicates only, no role id baked in, so the server
-- CLI (sub2api admin recover-superadmin) runs on either side of this file.
--
-- A soft-deleted user's rows mean nothing (DeleteUser keeps user_roles), so a
-- deleted holder loses the role first. Several holders left stop the
-- migration, and with it the server, until an operator keeps one with the CLI.
DELETE FROM user_roles ur USING roles r, users u
WHERE r.id = ur.role_id AND r.superuser AND u.id = ur.user_id AND u.deleted_at IS NOT NULL;

DO $$
DECLARE
    holders text;
BEGIN
    -- Ids only: the message ends up in the start-up log, emails do not belong there.
    SELECT string_agg(u.id::text, ', ' ORDER BY u.id) INTO holders
    FROM users u
    WHERE EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE r.superuser AND ur.user_id = u.id)
    HAVING count(*) > 1;
    IF holders IS NOT NULL THEN
        RAISE EXCEPTION 'several super admins: user ids %; keep one with "sub2api admin recover-superadmin --email <the email of the one to keep>" (the others become admins), then start again', holders;
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
