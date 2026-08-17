CREATE TABLE IF NOT EXISTS workers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    base_url TEXT NOT NULL,
    management_key_encrypted TEXT NOT NULL,
    remote_worker_id VARCHAR(128) NOT NULL,
    instance_id VARCHAR(128) NOT NULL DEFAULT '',
    protocol_version VARCHAR(64) NOT NULL DEFAULT '',
    version VARCHAR(64) NOT NULL DEFAULT '',
    status VARCHAR(32) NOT NULL DEFAULT 'unknown',
    log_stream_key VARCHAR(255) NOT NULL DEFAULT '',
    last_seen_at TIMESTAMPTZ NULL,
    last_error TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT workers_remote_worker_id_unique UNIQUE (remote_worker_id)
);

CREATE INDEX IF NOT EXISTS idx_workers_status ON workers(status);
CREATE INDEX IF NOT EXISTS idx_workers_updated_at ON workers(updated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_workers_log_stream_key_unique
    ON workers(log_stream_key) WHERE log_stream_key <> '';

CREATE TABLE IF NOT EXISTS worker_accounts (
    id BIGSERIAL PRIMARY KEY,
    worker_id BIGINT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    remote_account_id VARCHAR(128) NOT NULL,
    name VARCHAR(255) NOT NULL DEFAULT '',
    kind VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'unknown',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT worker_accounts_remote_unique UNIQUE (worker_id, remote_account_id)
);

CREATE INDEX IF NOT EXISTS idx_worker_accounts_worker ON worker_accounts(worker_id, id DESC);

CREATE TABLE IF NOT EXISTS worker_logs (
    id BIGSERIAL PRIMARY KEY,
    worker_id BIGINT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    event_id VARCHAR(128) NOT NULL,
    event_type VARCHAR(32) NOT NULL DEFAULT 'consume',
    instance_id VARCHAR(128) NOT NULL DEFAULT '',
    request_id VARCHAR(128) NOT NULL DEFAULT '',
    channel_id BIGINT NOT NULL DEFAULT 0,
    model_name VARCHAR(255) NOT NULL DEFAULT '',
    worker_created_at BIGINT NOT NULL DEFAULT 0,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    consumed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT worker_logs_event_unique UNIQUE (worker_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_worker_logs_worker_id ON worker_logs(worker_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_worker_logs_worker_created ON worker_logs(worker_id, worker_created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_worker_logs_request ON worker_logs(worker_id, request_id) WHERE request_id <> '';
