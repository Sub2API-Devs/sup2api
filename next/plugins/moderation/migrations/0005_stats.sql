-- plg_moderation 0005: moderation 0.4 (CONTRACTS §72.14): hourly statistics,
-- per-user daily counts, channel health on the hourly cost rows, channel
-- proxies and the "seen" mark of watch entries. Idempotent; new columns have
-- defaults so 0.3 ignores them.

-- One row per (hour, group, flow, stage, auditor, timing). Kinds: request
-- (flow 0, timing pre: latency moderation added to requests), flow (stage 0),
-- stage (auditor 0) and auditor. Latency is counted in 9 buckets
-- (<=50, 100, 200, 500, 1000, 2000, 5000, 10000 ms, more).
CREATE TABLE IF NOT EXISTS stats_hourly (
    hour           timestamptz NOT NULL,
    group_id       bigint      NOT NULL DEFAULT 0,
    flow_id        bigint      NOT NULL DEFAULT 0,
    stage          integer     NOT NULL DEFAULT 0,
    auditor_id     bigint      NOT NULL DEFAULT 0,
    timing         text        NOT NULL DEFAULT '',
    audited        bigint      NOT NULL DEFAULT 0,
    hit            bigint      NOT NULL DEFAULT 0,
    blocked        bigint      NOT NULL DEFAULT 0,
    overturned     bigint      NOT NULL DEFAULT 0,
    errors         bigint      NOT NULL DEFAULT 0,
    cache_skipped  bigint      NOT NULL DEFAULT 0,
    calls          bigint      NOT NULL DEFAULT 0,
    tokens_in      bigint      NOT NULL DEFAULT 0,
    tokens_out     bigint      NOT NULL DEFAULT 0,
    latency_ms_sum bigint      NOT NULL DEFAULT 0,
    lat            bigint[]    NOT NULL DEFAULT '{0,0,0,0,0,0,0,0,0}',
    cost           numeric(20,8) NOT NULL DEFAULT 0,
    PRIMARY KEY (hour, group_id, flow_id, stage, auditor_id, timing)
);

-- Moderated requests per user and UTC day (AI analysis summary, attention list).
CREATE TABLE IF NOT EXISTS user_daily (
    day         date        NOT NULL,
    user_id     bigint      NOT NULL,
    group_id    bigint      NOT NULL DEFAULT 0,
    audited     bigint      NOT NULL DEFAULT 0,
    suspicious  bigint      NOT NULL DEFAULT 0,
    high        bigint      NOT NULL DEFAULT 0,
    errors      bigint      NOT NULL DEFAULT 0,
    last_hit_at timestamptz,
    PRIMARY KEY (day, user_id)
);
CREATE INDEX IF NOT EXISTS user_daily_user_idx ON user_daily (user_id, day);

-- Channel health next to the cost of the same hour and source.
ALTER TABLE costs ADD COLUMN IF NOT EXISTS errors         bigint   NOT NULL DEFAULT 0;
ALTER TABLE costs ADD COLUMN IF NOT EXISTS latency_ms_sum bigint   NOT NULL DEFAULT 0;
ALTER TABLE costs ADD COLUMN IF NOT EXISTS lat            bigint[] NOT NULL DEFAULT '{0,0,0,0,0,0,0,0,0}';

-- Suspicious records since an administrator last looked at the entry.
ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS hits_since_seen integer NOT NULL DEFAULT 0;

