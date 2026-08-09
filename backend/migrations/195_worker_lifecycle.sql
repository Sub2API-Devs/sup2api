ALTER TABLE workers
    ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS heartbeat_interval_seconds INTEGER NOT NULL DEFAULT 15,
    ADD COLUMN IF NOT EXISTS heartbeat_timeout_seconds INTEGER NOT NULL DEFAULT 5,
    ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ NULL,
    ADD COLUMN IF NOT EXISTS last_heartbeat_latency_ms BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS consecutive_failures INTEGER NOT NULL DEFAULT 0;

ALTER TABLE workers DROP CONSTRAINT IF EXISTS workers_heartbeat_interval_valid;
ALTER TABLE workers ADD CONSTRAINT workers_heartbeat_interval_valid
    CHECK (heartbeat_interval_seconds BETWEEN 5 AND 3600);

ALTER TABLE workers DROP CONSTRAINT IF EXISTS workers_heartbeat_timeout_valid;
ALTER TABLE workers ADD CONSTRAINT workers_heartbeat_timeout_valid
    CHECK (heartbeat_timeout_seconds BETWEEN 1 AND 30);

CREATE INDEX IF NOT EXISTS idx_workers_heartbeat_due
    ON workers(enabled, last_heartbeat_at, id);
