-- Subscription quota snapshots of accounts (CONTRACTS §44): the 5-hour /
-- weekly windows of subscription accounts (Claude OAuth and the like), read
-- passively from the gateway's upstream response headers and, for types
-- whose plugin can ask the upstream, actively at most every 30 seconds.
-- API-key accounts never get a row.
CREATE TABLE IF NOT EXISTS account_quota_snapshots (
    account_id      bigint      PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
    -- Windows keyed by window key ("5h", "7d", "7d_sonnet", "7d_fable", ...):
    -- {"5h": {"utilization": 42.0, "resets_at": "2026-10-05T12:00:00Z",
    --         "status": "allowed", "used": 0, "limit": 0}}
    -- A sample overwrites the windows it carries and keeps the others.
    windows         jsonb       NOT NULL DEFAULT '{}',
    -- Where the newest data came from: 'passive' | 'active' | '' (no data yet).
    source          varchar(10) NOT NULL DEFAULT '',
    -- Error of the last active query, cleared by the next successful sample.
    error           text        NOT NULL DEFAULT '',
    -- When the windows were last written (either source); NULL = no data.
    updated_at      timestamptz,
    -- Last passive write, and last active query ATTEMPT (success or not):
    -- the 30-second floor between active queries is enforced on it, so it
    -- holds across nodes.
    last_passive_at timestamptz,
    last_active_at  timestamptz
);
