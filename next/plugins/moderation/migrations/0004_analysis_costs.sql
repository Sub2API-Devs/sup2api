-- plg_moderation 0004: moderation 0.3 (CONTRACTS §72.13): AI analysis of
-- watched users, per-record AI verdicts, the billing model of channels and
-- the hourly cost table. Idempotent; every new column has a default so 0.2
-- ignores it.

-- llm channels speak openai_chat, openai_responses or anthropic; the cost of
-- a call is priced on billing_model ('' = model).
ALTER TABLE channels ADD COLUMN IF NOT EXISTS billing_model text NOT NULL DEFAULT '';

-- Analysis queue and latest conclusion on the watch entry (§72.13.4).
-- analysis_requested_at set = queued; analysis_claim_until / analysis_token
-- = a node runs it (the claim expires after 2 x analysis_timeout_ms).
ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS analysis_requested_at  timestamptz;
ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS analysis_source        text   NOT NULL DEFAULT '';
ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS analysis_claim_until   timestamptz;
ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS analysis_token         bigint NOT NULL DEFAULT 0;
ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS latest_analysis_id     bigint NOT NULL DEFAULT 0;
ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS latest_analysis_status text   NOT NULL DEFAULT '';
ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS latest_trend           text   NOT NULL DEFAULT '';
ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS latest_suggestion      text   NOT NULL DEFAULT '';
ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS analyzed_at            timestamptz;
CREATE INDEX IF NOT EXISTS watchlist_analysis_requested_idx ON watchlist (analysis_requested_at) WHERE analysis_requested_at IS NOT NULL;

-- One analysis run; only the latest analysis_keep_per_user per user are kept.
CREATE TABLE IF NOT EXISTS user_analyses (
    id              bigserial   PRIMARY KEY,
    user_id         bigint      NOT NULL,
    source          text        NOT NULL DEFAULT '',
    status          text        NOT NULL DEFAULT '',
    error           text        NOT NULL DEFAULT '',
    trend           text        NOT NULL DEFAULT '',
    suggestion      text        NOT NULL DEFAULT '',
    summary         text        NOT NULL DEFAULT '',
    main_problems   jsonb       NOT NULL DEFAULT '[]',
    record_verdicts jsonb       NOT NULL DEFAULT '[]',
    verdict_counts  jsonb       NOT NULL DEFAULT '{}',
    flows_seen      jsonb       NOT NULL DEFAULT '[]',
    model           text        NOT NULL DEFAULT '',
    steps           integer     NOT NULL DEFAULT 0,
    tokens_in       bigint      NOT NULL DEFAULT 0,
    tokens_out      bigint      NOT NULL DEFAULT 0,
    cost            numeric(20,8),
    unpriced_calls  integer     NOT NULL DEFAULT 0,
    trace           jsonb       NOT NULL DEFAULT '[]',
    duration_ms     bigint      NOT NULL DEFAULT 0,
    created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_analyses_user_idx ON user_analyses (user_id, id);

-- AI verdict of a suspicious record (never overrides the review status).
ALTER TABLE events ADD COLUMN IF NOT EXISTS ai_verdict     text   NOT NULL DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS ai_severity    text   NOT NULL DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS ai_category    text   NOT NULL DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS ai_evidence    text   NOT NULL DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS ai_reason      text   NOT NULL DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS ai_analysis_id bigint NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS events_user_created_idx ON events (user_id, created_at);

-- Hourly cost of the upstream calls per channel and source (audit, analysis,
-- test, try, simulate). Written by adding (upsert).
CREATE TABLE IF NOT EXISTS costs (
    hour            timestamptz NOT NULL,
    channel_id      bigint      NOT NULL,
    source          text        NOT NULL,
    calls           bigint      NOT NULL DEFAULT 0,
    priced_calls    bigint      NOT NULL DEFAULT 0,
    unpriced_calls  bigint      NOT NULL DEFAULT 0,
    unpriced_tokens bigint      NOT NULL DEFAULT 0,
    free_calls      bigint      NOT NULL DEFAULT 0,
    tokens_in       bigint      NOT NULL DEFAULT 0,
    tokens_out      bigint      NOT NULL DEFAULT 0,
    cost            numeric(20,8) NOT NULL DEFAULT 0,
    PRIMARY KEY (hour, channel_id, source)
);
