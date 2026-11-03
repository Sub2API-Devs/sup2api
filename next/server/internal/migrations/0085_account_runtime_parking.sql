-- Red accounts' runtimes are stopped (not removed) once the account has been
-- red for park_after_hours (ACCOUNT-RUNTIME-PARKING-DESIGN §3).
--
-- accounts.status_changed_at is when status, auto_disabled_until or
-- schedulable last changed (any account, any writer), kept by a trigger;
-- other updates (last_used_at, quota, test results) leave it alone. Existing
-- accounts start from the time of this migration, not updated_at, so no
-- runtime is stopped before park_after_hours has passed after the upgrade.
--
-- ccgateway_runtimes.parked_at marks a runtime the park task stopped;
-- woken_at is a manual wake (test, reauthorization, "start"), from which the
-- hours count again. blocked_revision/blocked_at record the last
-- enabled:false sent to the controller, so the full sync, which any node may
-- run (TASK-FRAMEWORK-DESIGN §14.1), sends it once per revision.
--
-- Nullable columns and a trigger only: an older core ignores them. The
-- backfill only fills rows still NULL, so running this again changes nothing.
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS status_changed_at timestamptz;
ALTER TABLE ccgateway_runtimes ADD COLUMN IF NOT EXISTS parked_at timestamptz;
ALTER TABLE ccgateway_runtimes ADD COLUMN IF NOT EXISTS woken_at timestamptz;
ALTER TABLE ccgateway_runtimes ADD COLUMN IF NOT EXISTS blocked_revision bigint;
ALTER TABLE ccgateway_runtimes ADD COLUMN IF NOT EXISTS blocked_at timestamptz;

UPDATE accounts SET status_changed_at = now() WHERE status_changed_at IS NULL;

CREATE OR REPLACE FUNCTION accounts_status_changed_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.status_changed_at := now();
    ELSIF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.auto_disabled_until IS DISTINCT FROM OLD.auto_disabled_until
       OR NEW.schedulable IS DISTINCT FROM OLD.schedulable THEN
        NEW.status_changed_at := now();
    ELSE
        NEW.status_changed_at := OLD.status_changed_at;
    END IF;
    RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS accounts_status_changed_at ON accounts;
CREATE TRIGGER accounts_status_changed_at
    BEFORE INSERT OR UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION accounts_status_changed_at();
