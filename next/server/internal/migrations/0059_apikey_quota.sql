-- The spend cap an API key's owner sets on it (CONTRACTS §61): quota_limit in
-- USD (0 = unlimited) and quota_used, what its requests were charged. Every
-- charge of a request is its usage_logs row's total_cost while the row is
-- billed or reserved; settling, reconciling and refunding rewrite that cost
-- or status. So one trigger keeps quota_used in step with the rows on every
-- path, old cores included. Deleting old usage rows gives nothing back, and
-- the owner may reset quota_used to 0.
CREATE OR REPLACE FUNCTION apikey_quota_charge(status text, cost numeric) RETURNS numeric
    LANGUAGE sql IMMUTABLE AS $$ SELECT CASE WHEN status IN ('billed', 'reserved') THEN cost ELSE 0 END $$;

CREATE OR REPLACE FUNCTION apikey_quota_track() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    delta numeric := apikey_quota_charge(NEW.billing_status, NEW.total_cost);
BEGIN
    IF TG_OP = 'UPDATE' THEN
        delta := delta - apikey_quota_charge(OLD.billing_status, OLD.total_cost);
    END IF;
    IF delta <> 0 THEN
        UPDATE api_keys SET quota_used = quota_used + delta WHERE id = NEW.api_key_id;
    END IF;
    RETURN NULL;
END;
$$;

-- The columns start from what each key was charged so far. usage_logs stays
-- locked until commit, so no charge lands between the sum and the trigger.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = current_schema() AND table_name = 'api_keys' AND column_name = 'quota_used') THEN
        ALTER TABLE api_keys ADD COLUMN quota_limit numeric(20,8) NOT NULL DEFAULT 0,
                             ADD COLUMN quota_used  numeric(20,8) NOT NULL DEFAULT 0;
        LOCK TABLE usage_logs IN SHARE ROW EXCLUSIVE MODE;
        UPDATE api_keys k SET quota_used = s.used
        FROM (SELECT api_key_id, sum(apikey_quota_charge(billing_status, total_cost)) AS used FROM usage_logs GROUP BY api_key_id) s
        WHERE k.id = s.api_key_id;
    END IF;
END;
$$;

CREATE OR REPLACE TRIGGER apikey_quota_track AFTER INSERT OR UPDATE OF billing_status, total_cost ON usage_logs
    FOR EACH ROW EXECUTE FUNCTION apikey_quota_track();
