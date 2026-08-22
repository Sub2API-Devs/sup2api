CREATE TABLE IF NOT EXISTS worker_proxies (
    id BIGSERIAL PRIMARY KEY,
    worker_id BIGINT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    remote_proxy_id VARCHAR(128) NOT NULL,
    name VARCHAR(255) NOT NULL DEFAULT '',
    protocol VARCHAR(20) NOT NULL,
    host VARCHAR(255) NOT NULL,
    port INT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'unknown',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT worker_proxies_remote_unique UNIQUE (worker_id, remote_proxy_id)
);

CREATE INDEX IF NOT EXISTS idx_worker_proxies_worker ON worker_proxies(worker_id, id DESC);
