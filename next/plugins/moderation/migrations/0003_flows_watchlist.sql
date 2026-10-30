-- plg_moderation 0003: moderation 0.2 (CONTRACTS §72): channels, auditors,
-- flows bound to groups, the watch list, and the new record columns.
-- Idempotent; every new column has a default so 0.1.x ignores it.

-- Upstreams the auditors call. Keys and proxies are sealed with the host
-- master key (SecretSeal, context "channel:<id>:key" / "channel:<id>:proxy").
CREATE TABLE IF NOT EXISTS channels (
    id           bigserial   PRIMARY KEY,
    type         text        NOT NULL CHECK (type IN ('openai_moderation', 'typesafe', 'llm')),
    protocol     text        NOT NULL DEFAULT '',
    name         text        NOT NULL DEFAULT '',
    base_url     text        NOT NULL DEFAULT '',
    api_key_enc  bytea,
    api_key_tail text        NOT NULL DEFAULT '',
    proxy_enc    bytea,
    model        text        NOT NULL DEFAULT '',
    timeout_ms   integer     NOT NULL DEFAULT 0,
    enabled      boolean     NOT NULL DEFAULT true,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),
    deleted_at   timestamptz
);

-- name + bound channel + judging parameters (config, per type).
CREATE TABLE IF NOT EXISTS auditors (
    id         bigserial   PRIMARY KEY,
    name       text        NOT NULL DEFAULT '',
    type       text        NOT NULL CHECK (type IN ('openai_moderation', 'typesafe', 'llm_verdict')),
    channel_id bigint      NOT NULL,
    config     jsonb       NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
);

-- Draft and published spec; every published spec is also in flow_versions.
CREATE TABLE IF NOT EXISTS flows (
    id           bigserial   PRIMARY KEY,
    name         text        NOT NULL DEFAULT '',
    enabled      boolean     NOT NULL DEFAULT true,
    draft        jsonb       NOT NULL DEFAULT '{}',
    published    jsonb,
    version      integer     NOT NULL DEFAULT 0,
    published_at timestamptz,
    published_by bigint,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),
    deleted_at   timestamptz
);

CREATE TABLE IF NOT EXISTS flow_versions (
    flow_id      bigint      NOT NULL,
    version      integer     NOT NULL,
    spec         jsonb       NOT NULL,
    published_at timestamptz NOT NULL DEFAULT now(),
    published_by bigint,
    PRIMARY KEY (flow_id, version)
);

-- One flow per group; group_id 0 is the default flow.
CREATE TABLE IF NOT EXISTS flow_groups (
    group_id bigint PRIMARY KEY,
    flow_id  bigint NOT NULL
);
CREATE INDEX IF NOT EXISTS flow_groups_flow_idx ON flow_groups (flow_id);

-- Change counters the nodes poll (the broadcasts are only an accelerator) and
-- the one-time conversion of the 0.1 settings (§72.12).
CREATE TABLE IF NOT EXISTS config_state (
    id               integer PRIMARY KEY CHECK (id = 1),
    config_version   bigint  NOT NULL DEFAULT 0,
    watch_version    bigint  NOT NULL DEFAULT 0,
    legacy_converted boolean NOT NULL DEFAULT false
);
INSERT INTO config_state (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Watch list: one row per user (§72.8). Writes lock block_subjects first.
CREATE TABLE IF NOT EXISTS watchlist (
    user_id         bigint      PRIMARY KEY,
    level           text        NOT NULL CHECK (level IN ('observe', 'enforce')),
    source          text        NOT NULL CHECK (source IN ('auto', 'manual', 'analysis')),
    since_at        timestamptz NOT NULL DEFAULT now(),
    expires_at      timestamptz,          -- NULL = until removed
    hit_count       integer     NOT NULL DEFAULT 0,
    violation_count integer     NOT NULL DEFAULT 0,
    violation_epoch bigint      NOT NULL DEFAULT 0,
    last_hit_at     timestamptz,
    note            text        NOT NULL DEFAULT '',
    updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS watchlist_expires_at_idx ON watchlist (expires_at);

CREATE TABLE IF NOT EXISTS watch_events (
    id          bigserial   PRIMARY KEY,
    user_id     bigint      NOT NULL,
    action      text        NOT NULL,
    from_level  text        NOT NULL DEFAULT '',
    to_level    text        NOT NULL DEFAULT '',
    reason      text        NOT NULL DEFAULT '',
    operator_id bigint,
    analysis_id bigint,
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS watch_events_user_idx ON watch_events (user_id, id);

-- Record columns of 0.2. verdict / action stay filled for 0.1 readers.
ALTER TABLE events ADD COLUMN IF NOT EXISTS result             text        NOT NULL DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS timing             text        NOT NULL DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS flow_id            bigint      NOT NULL DEFAULT 0;
ALTER TABLE events ADD COLUMN IF NOT EXISTS flow_version       integer     NOT NULL DEFAULT 0;
ALTER TABLE events ADD COLUMN IF NOT EXISTS highest_category   text        NOT NULL DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS highest_score      double precision NOT NULL DEFAULT 0;
ALTER TABLE events ADD COLUMN IF NOT EXISTS hit_categories     text[]      NOT NULL DEFAULT '{}';
ALTER TABLE events ADD COLUMN IF NOT EXISTS trace              jsonb;
ALTER TABLE events ADD COLUMN IF NOT EXISTS input_format       text        NOT NULL DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS input_message      text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS input_message_size integer     NOT NULL DEFAULT 0;
ALTER TABLE events ADD COLUMN IF NOT EXISTS image_count        integer     NOT NULL DEFAULT 0;
ALTER TABLE events ADD COLUMN IF NOT EXISTS review_status      text        NOT NULL DEFAULT 'pending';
ALTER TABLE events ADD COLUMN IF NOT EXISTS reviewed_by        bigint;
ALTER TABLE events ADD COLUMN IF NOT EXISTS reviewed_at        timestamptz;
ALTER TABLE events ADD COLUMN IF NOT EXISTS violation_epoch    bigint      NOT NULL DEFAULT 0;
ALTER TABLE events ADD COLUMN IF NOT EXISTS counted            boolean     NOT NULL DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS keep_until         timestamptz;
ALTER TABLE events ADD COLUMN IF NOT EXISTS queue_ms           integer     NOT NULL DEFAULT 0;

ALTER TABLE events DROP CONSTRAINT IF EXISTS events_review_status_chk;
ALTER TABLE events ADD CONSTRAINT events_review_status_chk CHECK (review_status IN ('pending', 'false_positive', 'confirmed'));

-- 0.1 rows (and rows 0.1 nodes still write during a rolling upgrade; the
-- cleanup job repeats this, BackfillLegacySQL): result from verdict/action.
-- A 0.1 flag becomes hit but is never counted as a violation (0.1 only
-- counted block; countViolations skips flow_id = 0 flags). Hits are kept at
-- least 180 days (§72.10), the rest 30 days as 0.1 kept them.
UPDATE events SET
    result = CASE
        WHEN verdict = 'block' AND action = 'deny' THEN 'block'
        WHEN verdict IN ('block', 'flag') THEN 'hit'
        WHEN verdict = 'error' THEN 'error'
        ELSE 'pass' END,
    timing = CASE WHEN mode = 'enforce' THEN 'pre' ELSE 'post' END,
    hit_categories = categories,
    keep_until = coalesce(keep_until, created_at + CASE WHEN verdict IN ('block', 'flag') THEN interval '180 days' ELSE interval '30 days' END)
WHERE result = '';

CREATE INDEX IF NOT EXISTS events_result_created_at_idx ON events (result, created_at);
CREATE INDEX IF NOT EXISTS events_keep_until_idx ON events (keep_until);
CREATE INDEX IF NOT EXISTS events_request_id_idx ON events (request_id);
