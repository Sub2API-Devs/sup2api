CREATE TABLE IF NOT EXISTS account_preparations (
    key varchar(64) PRIMARY KEY,
    plugin_key varchar(64) NOT NULL,
    account_type varchar(64) NOT NULL,
    proxy_id bigint REFERENCES proxies(id) ON DELETE SET NULL,
    settings jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_by bigint NOT NULL REFERENCES users(id),
    idempotency_key varchar(128),
    UNIQUE(created_by, plugin_key, account_type, idempotency_key),
    account_id bigint UNIQUE REFERENCES accounts(id),
    state varchar(16) NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'ready', 'adopted', 'cancelling', 'cancelled')),
    created_at timestamptz NOT NULL DEFAULT now(),
    last_seen_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL DEFAULT now() + interval '2 hours'
);
CREATE INDEX IF NOT EXISTS account_preparations_open_idx ON account_preparations(last_seen_at) WHERE account_id IS NULL AND state <> 'cancelled';
ALTER TABLE ccgateway_runtimes ADD COLUMN IF NOT EXISTS initial_settings jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE TABLE IF NOT EXISTS account_lifecycle_sync (
    account_id bigint PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
    status varchar(16) NOT NULL CHECK (status IN ('pending', 'applied', 'failed')),
    generation bigint NOT NULL DEFAULT 1,
    code varchar(64) NOT NULL DEFAULT '',
    updated_at timestamptz NOT NULL DEFAULT now()
);
