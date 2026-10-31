-- Account usage and usage limits (CONTRACTS §73).
--
-- Usage is the core's own record: usage_logs rows of an account are summed by
-- a trigger into an hourly table (the windows of the list, the hover details
-- and the usage limit) and a totals table (the lifetime figures). Two costs
-- are kept: cost is what was charged (after the group multiplier), raw_cost
-- the cost before it (billing_detail.cost), so the "raw ratio" switch of a
-- usage limit can change basis without losing history.
--
-- Counting follows the API key quota (0059): a row contributes its cost while
-- billed or reserved; a row turned free or failed takes it back. Requests are
-- the successful rows, tokens every token kind. Deleting old usage_logs rows
-- leaves the sums alone: they are lifetime figures.
--
-- Neither table references accounts: the trigger runs inside settlement, and a
-- purged account must never make a usage write fail.

CREATE TABLE IF NOT EXISTS account_usage_totals (
    account_id  bigint        PRIMARY KEY,
    cost        numeric(20,8) NOT NULL DEFAULT 0,
    raw_cost    numeric(20,8) NOT NULL DEFAULT 0,
    requests    bigint        NOT NULL DEFAULT 0,
    tokens      bigint        NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS account_usage_hourly (
    account_id  bigint        NOT NULL,
    hour        timestamptz   NOT NULL,   -- start of the UTC hour
    cost        numeric(20,8) NOT NULL DEFAULT 0,
    raw_cost    numeric(20,8) NOT NULL DEFAULT 0,
    requests    bigint        NOT NULL DEFAULT 0,
    tokens      bigint        NOT NULL DEFAULT 0,
    PRIMARY KEY (account_id, hour)
);

-- Usage limit of an account: off by default, configured on its own endpoint.
-- waived_window is the window start an administrator released early with
-- "reset status"; the limit does not disable the account again in it.
CREATE TABLE IF NOT EXISTS account_usage_limits (
    account_id      bigint        PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
    raw_cost        boolean       NOT NULL DEFAULT false,
    enabled         boolean       NOT NULL DEFAULT false,
    amount          numeric(20,8) NOT NULL DEFAULT 0,
    period          varchar(10)   NOT NULL DEFAULT 'month',
    period_count    int           NOT NULL DEFAULT 1,
    anchor          timestamptz,
    waived_window   timestamptz,
    updated_at      timestamptz   NOT NULL DEFAULT now(),
    CONSTRAINT account_usage_limits_amount_chk CHECK (amount >= 0),
    CONSTRAINT account_usage_limits_period_chk CHECK (period IN ('hour', 'day', 'week', 'month', 'none')),
    CONSTRAINT account_usage_limits_count_chk CHECK (period_count BETWEEN 1 AND 8784)
);

-- period_count: at most 8784 (366 days of hours, the longest period of any
-- unit); the per-unit caps (day 366, week 52, month 12, none 1) are the
-- core's. Re-added so a replay over an older table gets the same bound.
ALTER TABLE account_usage_limits DROP CONSTRAINT IF EXISTS account_usage_limits_count_chk;
ALTER TABLE account_usage_limits ADD CONSTRAINT account_usage_limits_count_chk CHECK (period_count BETWEEN 1 AND 8784);

CREATE OR REPLACE FUNCTION account_usage_cost(status text, cost numeric) RETURNS numeric
    LANGUAGE sql IMMUTABLE AS $$ SELECT CASE WHEN status IN ('billed', 'reserved') THEN cost ELSE 0 END $$;

-- Cost before the group multiplier: billing_detail.cost when it is a
-- non-negative number (any decimals, rounded to 8), else the charged cost
-- divided by the multiplier, else the charged cost. A negative
-- billing_detail.cost would credit the limit, so it falls back like a missing
-- one. The backfill below and every later trigger run use this one function:
-- the trigger takes a row's old contribution back with the function current
-- at that time, so a backfill under another definition would leave a
-- residual on every refund or account move. Do not redefine it in a later
-- migration without recomputing the sums.
CREATE OR REPLACE FUNCTION account_usage_raw_cost(status text, cost numeric, detail jsonb, rate numeric) RETURNS numeric
    LANGUAGE sql IMMUTABLE AS $$
    SELECT CASE
        WHEN status NOT IN ('billed', 'reserved') THEN 0
        WHEN jsonb_typeof(detail) = 'object' AND (detail->>'cost') ~ '^[0-9]{1,12}(\.[0-9]+)?$' THEN round((detail->>'cost')::numeric, 8)
        WHEN rate > 0 THEN round(cost / rate, 8)
        ELSE cost
    END $$;

CREATE OR REPLACE FUNCTION account_usage_add(account bigint, at timestamptz, d_cost numeric, d_raw numeric, d_req bigint, d_tok bigint) RETURNS void
    LANGUAGE plpgsql AS $$
BEGIN
    IF account IS NULL OR (d_cost = 0 AND d_raw = 0 AND d_req = 0 AND d_tok = 0) THEN
        RETURN;
    END IF;
    INSERT INTO account_usage_hourly AS h (account_id, hour, cost, raw_cost, requests, tokens)
    VALUES (account, to_timestamp(floor(extract(epoch FROM at) / 3600) * 3600), d_cost, d_raw, d_req, d_tok)
    ON CONFLICT (account_id, hour) DO UPDATE SET cost = h.cost + EXCLUDED.cost, raw_cost = h.raw_cost + EXCLUDED.raw_cost,
        requests = h.requests + EXCLUDED.requests, tokens = h.tokens + EXCLUDED.tokens;
    INSERT INTO account_usage_totals AS t (account_id, cost, raw_cost, requests, tokens)
    VALUES (account, d_cost, d_raw, d_req, d_tok)
    ON CONFLICT (account_id) DO UPDATE SET cost = t.cost + EXCLUDED.cost, raw_cost = t.raw_cost + EXCLUDED.raw_cost,
        requests = t.requests + EXCLUDED.requests, tokens = t.tokens + EXCLUDED.tokens;
END;
$$;

CREATE OR REPLACE FUNCTION account_usage_track() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    n_cost numeric := account_usage_cost(NEW.billing_status, NEW.total_cost);
    n_raw  numeric := account_usage_raw_cost(NEW.billing_status, NEW.total_cost, NEW.billing_detail, NEW.rate_multiplier);
    n_req  bigint  := CASE WHEN NEW.success THEN 1 ELSE 0 END;
    n_tok  bigint  := NEW.input_tokens + NEW.output_tokens + NEW.cache_read_tokens + NEW.cache_creation_tokens + NEW.cache_creation_1h_tokens;
    o_cost numeric := 0;
    o_raw  numeric := 0;
    o_req  bigint  := 0;
    o_tok  bigint  := 0;
BEGIN
    IF TG_OP = 'UPDATE' THEN
        o_cost := account_usage_cost(OLD.billing_status, OLD.total_cost);
        o_raw  := account_usage_raw_cost(OLD.billing_status, OLD.total_cost, OLD.billing_detail, OLD.rate_multiplier);
        o_req  := CASE WHEN OLD.success THEN 1 ELSE 0 END;
        o_tok  := OLD.input_tokens + OLD.output_tokens + OLD.cache_read_tokens + OLD.cache_creation_tokens + OLD.cache_creation_1h_tokens;
        IF OLD.account_id IS DISTINCT FROM NEW.account_id THEN
            PERFORM account_usage_add(OLD.account_id, OLD.created_at, -o_cost, -o_raw, -o_req, -o_tok);
            o_cost := 0; o_raw := 0; o_req := 0; o_tok := 0;
        END IF;
    END IF;
    PERFORM account_usage_add(NEW.account_id, NEW.created_at, n_cost - o_cost, n_raw - o_raw, n_req - o_req, n_tok - o_tok);
    RETURN NULL;
END;
$$;

-- Backfill from the existing rows once, with writers held off so no row is
-- counted twice or missed. Rows are counted once anywhere: in the sums, or
-- (after 0068) still in the journal waiting to be folded, so a replay finding
-- either backfills nothing.
--
-- The lock blocks every usage_logs insert and update (settlement) until this
-- migration commits; reads go on. It lasts one aggregate over the table: at
-- the ~17,500 rows production had when this was written, well under a
-- second. Count the rows before deploying on a larger table.
DO $$
BEGIN
    LOCK TABLE usage_logs IN SHARE ROW EXCLUSIVE MODE;
    IF to_regclass('account_usage_deltas') IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM account_usage_deltas) THEN
            RETURN;
        END IF;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM account_usage_totals) AND NOT EXISTS (SELECT 1 FROM account_usage_hourly) THEN
        INSERT INTO account_usage_hourly (account_id, hour, cost, raw_cost, requests, tokens)
        SELECT account_id, to_timestamp(floor(extract(epoch FROM created_at) / 3600) * 3600) AS hour,
               sum(account_usage_cost(billing_status, total_cost)),
               sum(account_usage_raw_cost(billing_status, total_cost, billing_detail, rate_multiplier)),
               sum(CASE WHEN success THEN 1 ELSE 0 END),
               sum(input_tokens + output_tokens + cache_read_tokens + cache_creation_tokens + cache_creation_1h_tokens)
        FROM usage_logs WHERE account_id IS NOT NULL
        GROUP BY 1, 2;
        INSERT INTO account_usage_totals (account_id, cost, raw_cost, requests, tokens)
        SELECT account_id, sum(cost), sum(raw_cost), sum(requests), sum(tokens)
        FROM account_usage_hourly GROUP BY account_id;
    END IF;
END;
$$;

CREATE OR REPLACE TRIGGER account_usage_track
    AFTER INSERT OR UPDATE OF account_id, billing_status, total_cost, billing_detail, rate_multiplier, success,
        input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens, cache_creation_1h_tokens
    ON usage_logs FOR EACH ROW EXECUTE FUNCTION account_usage_track();
