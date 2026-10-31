-- Usage limits: a structured mark of their own disable, and no negative raw
-- cost (CONTRACTS §73.2, §73.3).
--
-- The usage limit recognised its auto-disable by the "usage limit reached"
-- prefix of status_reason, which a plugin or a failure policy reason could
-- carry too. accounts.auto_disabled_source now says who wrote an automatic
-- disable: 'usage_limit', or '' for the automatic state of plugins and
-- failure policies. The automatic state writer always writes it; a trigger
-- clears it whenever the account leaves auto_disabled, whoever writes the
-- status, so a stale mark never outlives the disable. The one-off backfill
-- runs with the column.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = current_schema() AND table_name = 'accounts' AND column_name = 'auto_disabled_source') THEN
        ALTER TABLE accounts ADD COLUMN auto_disabled_source varchar(32) NOT NULL DEFAULT '';
        UPDATE accounts SET auto_disabled_source = 'usage_limit'
        WHERE status = 'auto_disabled' AND starts_with(status_reason, 'usage limit reached');
    END IF;
END $$;

CREATE OR REPLACE FUNCTION accounts_auto_disabled_source_reset() RETURNS trigger
    LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status <> 'auto_disabled' THEN
        NEW.auto_disabled_source := '';
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER accounts_auto_disabled_source_reset BEFORE INSERT OR UPDATE OF status, auto_disabled_source ON accounts
    FOR EACH ROW EXECUTE FUNCTION accounts_auto_disabled_source_reset();

-- 0068 accepted a negative billing_detail.cost as the raw cost, a credit
-- against the limit; a negative one now falls back like a missing one.
CREATE OR REPLACE FUNCTION account_usage_raw_cost(status text, cost numeric, detail jsonb, rate numeric) RETURNS numeric
    LANGUAGE sql IMMUTABLE AS $$
    SELECT CASE
        WHEN status NOT IN ('billed', 'reserved') THEN 0
        WHEN jsonb_typeof(detail) = 'object' AND (detail->>'cost') ~ '^[0-9]{1,12}(\.[0-9]+)?$' THEN round((detail->>'cost')::numeric, 8)
        WHEN rate > 0 THEN round(cost / rate, 8)
        ELSE cost
    END $$;
