CREATE TABLE plugin_executions (
    id text PRIMARY KEY,
    request_id text NOT NULL,
    plugin_key text NOT NULL,
    account_id bigint NOT NULL,
    attempt integer NOT NULL,
    task_submit boolean NOT NULL DEFAULT false,
    state text NOT NULL DEFAULT 'intent',
    record jsonb,
    observation bytea,
    operation text NOT NULL DEFAULT '',
    digest text NOT NULL DEFAULT '',
    task_id text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(request_id, attempt)
);
CREATE INDEX plugin_executions_recovery_idx ON plugin_executions(updated_at) WHERE state='observed';
CREATE INDEX plugin_executions_retention_idx ON plugin_executions(created_at);

CREATE TABLE plugin_monitor_receipts (
    id text PRIMARY KEY,
    digest text NOT NULL,
    task_id text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX plugin_monitor_receipts_retention_idx ON plugin_monitor_receipts(created_at);
