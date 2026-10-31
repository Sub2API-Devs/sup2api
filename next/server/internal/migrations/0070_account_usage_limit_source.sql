-- Usage limits: a structured mark of their own disable, and the other
-- automatic disable it holds back (CONTRACTS §73.3).
--
-- The usage limit recognised its auto-disable by the "usage limit reached"
-- prefix of status_reason, which a plugin or a failure policy reason could
-- carry too. accounts.auto_disabled_source now says who wrote an automatic
-- disable: 'usage_limit', or '' for the automatic state of plugins and
-- failure policies. The one-off backfill runs with the column.
--
-- The core writes the source in every automatic status write and declares it
-- in that transaction (set_config('sup2api.auto_disabled_source', 'written',
-- true)). A trigger clears the mark
--   * whenever the account leaves auto_disabled, whoever writes the status;
--   * whenever the reason or release time of an automatic disable changes (or
--     an account enters auto_disabled) in a transaction that did not declare
--     it: a core older than this migration (rolling upgrade) writing a
--     plugin's disable over the limit's must not leave the limit's mark on
--     it, or the limit would lift the plugin's disable once usage drops.
--     Comparing NEW with OLD source alone cannot tell "not written" from
--     "written again": the limit rewrites its own reason with the same mark.
--
-- deferred_auto_disable*: a plugin's or failure policy's disable that came
-- while the usage limit held the account and did not outlast it. The limit
-- keeps the account; when it lets go before deferred_auto_disabled_until
-- (limit raised or turned off), the account passes to that disable instead of
-- becoming active. NULL until with the flag set = no release time. The
-- trigger drops it whenever the account is no longer the limit's.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = current_schema() AND table_name = 'accounts' AND column_name = 'auto_disabled_source') THEN
        ALTER TABLE accounts ADD COLUMN auto_disabled_source varchar(32) NOT NULL DEFAULT '';
        UPDATE accounts SET auto_disabled_source = 'usage_limit'
        WHERE status = 'auto_disabled' AND starts_with(status_reason, 'usage limit reached');
    END IF;
END $$;

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS deferred_auto_disable boolean NOT NULL DEFAULT false;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS deferred_auto_disable_reason text NOT NULL DEFAULT '';
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS deferred_auto_disabled_until timestamptz DEFAULT NULL;

CREATE OR REPLACE FUNCTION accounts_auto_disabled_source_reset() RETURNS trigger
    LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status <> 'auto_disabled' THEN
        NEW.auto_disabled_source := '';
    ELSIF TG_OP = 'UPDATE' AND NEW.auto_disabled_source <> ''
        AND coalesce(current_setting('sup2api.auto_disabled_source', true), '') <> 'written'
        AND (OLD.status <> 'auto_disabled' OR NEW.status_reason IS DISTINCT FROM OLD.status_reason
             OR NEW.auto_disabled_until IS DISTINCT FROM OLD.auto_disabled_until) THEN
        NEW.auto_disabled_source := '';
    END IF;
    IF NEW.auto_disabled_source <> 'usage_limit' THEN
        NEW.deferred_auto_disable := false;
        NEW.deferred_auto_disable_reason := '';
        NEW.deferred_auto_disabled_until := NULL;
    END IF;
    RETURN NEW;
END;
$$;

-- Fires on every update, without a column list: a write that leaves status
-- out of its SET list must still be seen, and a column list would make the
-- columns undroppable by later migrations. The function only compares a few
-- fields.
CREATE OR REPLACE TRIGGER accounts_auto_disabled_source_reset BEFORE INSERT OR UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION accounts_auto_disabled_source_reset();
