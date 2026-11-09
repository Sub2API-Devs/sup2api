-- Hourly rollup of usage_logs for the statistics (CONTRACTS §66.8). Each row
-- sums the usage records of one UTC hour and one combination of the columns
-- the console groups and filters by; the measures are the additive shares the
-- summary and the overview are computed from (usage/rollup.go).
CREATE TABLE IF NOT EXISTS usage_hourly (
    created_at         timestamptz  NOT NULL,  -- the hour (UTC), named as usage_logs' so filters apply to both
    user_id            bigint       NOT NULL,
    api_key_id         bigint       NOT NULL,
    group_id           bigint       NOT NULL,
    account_id         bigint,
    model              varchar(200) NOT NULL,
    upstream_model     varchar(200) NOT NULL,
    protocol           varchar(100) NOT NULL,
    platform           varchar(50)  NOT NULL,
    requests           bigint       NOT NULL,
    success            bigint       NOT NULL,
    input_tokens       bigint       NOT NULL,
    output_tokens      bigint       NOT NULL,
    cache_read_tokens  bigint       NOT NULL,
    cache_write_tokens bigint       NOT NULL,
    total_cost         numeric      NOT NULL,
    standard_cost      numeric      NOT NULL,
    prompt_rows        bigint       NOT NULL,
    prompt_tokens      bigint       NOT NULL,
    anomalous_rows     bigint       NOT NULL,
    estimated_rows     bigint       NOT NULL,
    estimated_cost     numeric      NOT NULL,
    latency_sum        bigint       NOT NULL,
    latency_rows       bigint       NOT NULL,
    first_token_sum    bigint       NOT NULL,
    first_token_rows   bigint       NOT NULL
);
CREATE INDEX IF NOT EXISTS usage_hourly_created_idx ON usage_hourly (created_at);
CREATE INDEX IF NOT EXISTS usage_hourly_user_idx ON usage_hourly (user_id, created_at);

-- The hours [low, high) the rollup holds; NULL until the first refresh.
CREATE TABLE IF NOT EXISTS usage_hourly_state (
    id   boolean PRIMARY KEY DEFAULT true CHECK (id),
    low  timestamptz,
    high timestamptz
);
INSERT INTO usage_hourly_state (id) VALUES (true) ON CONFLICT DO NOTHING;

-- Hours whose usage changed after they may have been rolled up: a row
-- written, changed or removed 15 minutes or more after its hour ended (the
-- refresh rolls an hour up 30 minutes after it ends, so a write the trigger
-- lets pass has 15 minutes to commit). The refresh recomputes and clears them.
-- Recent rows, the settlement's hot path, never fire it.
CREATE TABLE IF NOT EXISTS usage_hourly_dirty (
    id   bigserial   PRIMARY KEY,
    hour timestamptz NOT NULL
);

CREATE OR REPLACE FUNCTION usage_hourly_mark() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO usage_hourly_dirty (hour)
    VALUES (date_trunc('hour', CASE WHEN TG_OP = 'DELETE' THEN OLD.created_at ELSE NEW.created_at END, 'UTC'));
    RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS usage_hourly_mark_new ON usage_logs;
CREATE TRIGGER usage_hourly_mark_new AFTER INSERT OR UPDATE ON usage_logs FOR EACH ROW
    WHEN (date_trunc('hour', NEW.created_at, 'UTC') < clock_timestamp() - interval '75 minutes')
    EXECUTE FUNCTION usage_hourly_mark();
DROP TRIGGER IF EXISTS usage_hourly_mark_old ON usage_logs;
CREATE TRIGGER usage_hourly_mark_old AFTER DELETE ON usage_logs FOR EACH ROW
    WHEN (date_trunc('hour', OLD.created_at, 'UTC') < clock_timestamp() - interval '75 minutes')
    EXECUTE FUNCTION usage_hourly_mark();
