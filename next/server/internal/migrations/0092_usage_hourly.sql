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
-- refresh rolls an hour up 30 minutes after it ends, and not while a write
-- transaction older than that is open). The refresh recomputes and clears
-- them, and the statistics read marked hours live until then. Recent rows,
-- the settlement's hot path, never fire it.
CREATE TABLE IF NOT EXISTS usage_hourly_dirty (
    id   bigserial   PRIMARY KEY,
    hour timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS usage_hourly_dirty_hour_idx ON usage_hourly_dirty (hour);

CREATE OR REPLACE FUNCTION usage_hourly_mark() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO usage_hourly_dirty (hour)
    SELECT DISTINCT date_trunc('hour', t, 'UTC') FROM unnest(CASE TG_OP
        WHEN 'INSERT' THEN ARRAY[NEW.created_at]
        WHEN 'DELETE' THEN ARRAY[OLD.created_at]
        ELSE ARRAY[OLD.created_at, NEW.created_at] END) t
    WHERE date_trunc('hour', t, 'UTC') < clock_timestamp() - interval '75 minutes';
    RETURN NULL;
END $$;

-- The columns an update must touch to change the statistics: the rollup's
-- keys and what its measures read (usage/rollup.go rollupDims, statMeasures).
CREATE OR REPLACE TRIGGER usage_hourly_mark_insert AFTER INSERT ON usage_logs FOR EACH ROW
    WHEN (date_trunc('hour', NEW.created_at, 'UTC') < clock_timestamp() - interval '75 minutes')
    EXECUTE FUNCTION usage_hourly_mark();
CREATE OR REPLACE TRIGGER usage_hourly_mark_update AFTER UPDATE OF
        created_at, user_id, api_key_id, group_id, account_id, model, upstream_model, protocol, platform,
        success, input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens, cache_creation_1h_tokens,
        total_cost, rate_multiplier, billing_detail, anomalies, latency_ms, first_token_ms
    ON usage_logs FOR EACH ROW
    WHEN (date_trunc('hour', LEAST(OLD.created_at, NEW.created_at), 'UTC') < clock_timestamp() - interval '75 minutes')
    EXECUTE FUNCTION usage_hourly_mark();
CREATE OR REPLACE TRIGGER usage_hourly_mark_delete AFTER DELETE ON usage_logs FOR EACH ROW
    WHEN (date_trunc('hour', OLD.created_at, 'UTC') < clock_timestamp() - interval '75 minutes')
    EXECUTE FUNCTION usage_hourly_mark();
