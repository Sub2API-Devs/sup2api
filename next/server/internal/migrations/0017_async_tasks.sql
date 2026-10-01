CREATE TABLE task_submission_receipts (
    request_id varchar(64) PRIMARY KEY,
    public_id text NOT NULL UNIQUE,
    plugin_key text NOT NULL,
    kind text NOT NULL,
    user_id bigint NOT NULL,
    api_key_id bigint NOT NULL,
    group_id bigint NOT NULL,
    account_id bigint NOT NULL,
    model text NOT NULL,
    protocol text NOT NULL,
    state text NOT NULL DEFAULT 'dispatching' CHECK (state IN ('dispatching','received','registered','uncertain')),
    response_status integer NOT NULL DEFAULT 0,
    response_body bytea,
    last_error text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days',
    CHECK (response_body IS NULL OR octet_length(response_body) <= 262144)
);
CREATE INDEX task_receipts_expiry_idx ON task_submission_receipts(expires_at);

CREATE TABLE async_tasks (
    public_id text PRIMARY KEY,
    plugin_key text NOT NULL,
    kind text NOT NULL,
    upstream_ref_id text NOT NULL,
    user_id bigint NOT NULL,
    api_key_id bigint NOT NULL,
    group_id bigint NOT NULL,
    account_id bigint NOT NULL,
    model text NOT NULL,
    protocol text NOT NULL,
    usage_log_id bigint NOT NULL UNIQUE REFERENCES usage_logs(id) ON DELETE CASCADE,
    snapshot bytea,
    snapshot_id_paths jsonb NOT NULL,
    state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','succeeded','failed')),
    observation_status text NOT NULL DEFAULT 'pending' CHECK (observation_status IN ('pending','closed','abandoned')),
    legacy_imported boolean NOT NULL DEFAULT false,
    attempts integer NOT NULL DEFAULT 0,
    next_check_at timestamptz NOT NULL,
    deadline_at timestamptz NOT NULL,
    claim_token text NOT NULL DEFAULT '',
    lease_until timestamptz,
    last_error text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (plugin_key, kind, account_id, upstream_ref_id),
    CHECK (snapshot IS NULL OR octet_length(snapshot) <= 262144)
);
CREATE INDEX async_tasks_due_idx ON async_tasks(next_check_at) WHERE observation_status = 'pending';
ALTER TABLE pending_settlements ADD COLUMN task_public_id text REFERENCES async_tasks(public_id) ON DELETE SET NULL;
