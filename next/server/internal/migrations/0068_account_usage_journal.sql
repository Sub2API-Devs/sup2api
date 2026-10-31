-- Account usage: journal the deltas, fold them in the background (CONTRACTS §73.2).
--
-- 0064 upserted the hourly and totals rows inside every usage_logs write. The
-- settler writes a batch of rows in one transaction, so two batches touching
-- the same accounts in a different order, or a batch and a settlement of the
-- same user, deadlocked on those rows, and every write of a busy account
-- queued behind its one totals row. The trigger now only appends its delta
-- to account_usage_deltas (no conflicts, no row locks); one node folds the
-- journal into the hourly and totals tables every few seconds
-- (account_usage_fold), so the figures trail the writes by that much.
--
-- Also: a usage limit carries the time zone its periods follow. The raw cost
-- function stays 0064's (one definition for the backfill and the trigger).

CREATE TABLE IF NOT EXISTS account_usage_deltas (
    id          bigserial     PRIMARY KEY,
    account_id  bigint        NOT NULL,
    hour        timestamptz   NOT NULL,
    cost        numeric(20,8) NOT NULL,
    raw_cost    numeric(20,8) NOT NULL,
    requests    bigint        NOT NULL,
    tokens      bigint        NOT NULL
);

CREATE OR REPLACE FUNCTION account_usage_add(account bigint, at timestamptz, d_cost numeric, d_raw numeric, d_req bigint, d_tok bigint) RETURNS void
    LANGUAGE plpgsql AS $$
BEGIN
    IF account IS NULL OR (d_cost = 0 AND d_raw = 0 AND d_req = 0 AND d_tok = 0) THEN
        RETURN;
    END IF;
    INSERT INTO account_usage_deltas (account_id, hour, cost, raw_cost, requests, tokens)
    VALUES (account, date_trunc('hour', at, 'UTC'), d_cost, d_raw, d_req, d_tok);
END;
$$;

-- Folds up to max_rows journal rows into the hourly and totals tables and
-- returns how many it folded. Callers serialise it (one node at a time), so
-- the upserts never wait on each other; SKIP LOCKED leaves rows a concurrent
-- fold already took.
CREATE OR REPLACE FUNCTION account_usage_fold(max_rows int) RETURNS int
    LANGUAGE sql AS $$
    WITH moved AS (
        DELETE FROM account_usage_deltas
        WHERE id IN (SELECT id FROM account_usage_deltas ORDER BY id LIMIT max_rows FOR UPDATE SKIP LOCKED)
        RETURNING account_id, hour, cost, raw_cost, requests, tokens
    ), hourly AS (
        INSERT INTO account_usage_hourly AS h (account_id, hour, cost, raw_cost, requests, tokens)
        SELECT account_id, hour, sum(cost), sum(raw_cost), sum(requests), sum(tokens) FROM moved GROUP BY 1, 2 ORDER BY 1, 2
        ON CONFLICT (account_id, hour) DO UPDATE SET cost = h.cost + EXCLUDED.cost, raw_cost = h.raw_cost + EXCLUDED.raw_cost,
            requests = h.requests + EXCLUDED.requests, tokens = h.tokens + EXCLUDED.tokens
    ), totals AS (
        INSERT INTO account_usage_totals AS t (account_id, cost, raw_cost, requests, tokens)
        SELECT account_id, sum(cost), sum(raw_cost), sum(requests), sum(tokens) FROM moved GROUP BY 1 ORDER BY 1
        ON CONFLICT (account_id) DO UPDATE SET cost = t.cost + EXCLUDED.cost, raw_cost = t.raw_cost + EXCLUDED.raw_cost,
            requests = t.requests + EXCLUDED.requests, tokens = t.tokens + EXCLUDED.tokens
    )
    SELECT count(*)::int FROM moved
$$;

ALTER TABLE account_usage_limits ADD COLUMN IF NOT EXISTS timezone varchar(64) NOT NULL DEFAULT 'UTC';
