CREATE TABLE IF NOT EXISTS provider_helper_attempts (
 id text PRIMARY KEY,
 user_id bigint NOT NULL REFERENCES users(id),
 group_id bigint NOT NULL REFERENCES groups(id),
 request_id text NOT NULL,
 request_digest text NOT NULL,
 usage_digest text NOT NULL DEFAULT '',
 namespace text NOT NULL,
 account_id bigint NOT NULL,
 principal_id text NOT NULL,
 generation text NOT NULL,
 parent_receipt text NOT NULL DEFAULT '',
 state text NOT NULL CHECK(state IN ('reserved','dispatched','uncertain','aborted','committed')),
 reserved_bytes bigint NOT NULL CHECK(reserved_bytes>=0),
 created_at timestamptz NOT NULL,
 expires_at timestamptz NOT NULL,
 UNIQUE(user_id,group_id,request_id)
);
CREATE INDEX IF NOT EXISTS provider_helper_attempts_owner ON provider_helper_attempts(user_id,group_id,expires_at);
CREATE TABLE IF NOT EXISTS provider_helper_records (
 receipt text PRIMARY KEY,
 attempt_id text NOT NULL UNIQUE,
 user_id bigint NOT NULL REFERENCES users(id),
 group_id bigint NOT NULL REFERENCES groups(id),
 namespace text NOT NULL,
 account_id bigint NOT NULL,
 principal_id text NOT NULL,
 generation text NOT NULL,
 parent_receipt text NOT NULL DEFAULT '',
 public_prefix_digest text NOT NULL,
 chain_digest text NOT NULL,
 payload_digest text NOT NULL,
 payload bytea,
 payload_bytes bigint NOT NULL CHECK(payload_bytes>=0),
 created_at timestamptz NOT NULL,
 expires_at timestamptz NOT NULL,
 tombstone_until timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS provider_helper_records_prefix ON provider_helper_records(user_id,group_id,namespace,public_prefix_digest);
CREATE INDEX IF NOT EXISTS provider_helper_records_owner ON provider_helper_records(user_id,group_id,tombstone_until);
CREATE TABLE IF NOT EXISTS provider_helper_usage_outbox (
 request_id text PRIMARY KEY,
 attempt_id text NOT NULL UNIQUE,
 user_id bigint NOT NULL,
 group_id bigint NOT NULL,
 digest text NOT NULL,
 payload bytea NOT NULL,
 created_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS provider_helper_usage_outbox_created ON provider_helper_usage_outbox(created_at,request_id);
ALTER TABLE provider_helper_usage_outbox ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz NOT NULL DEFAULT '-infinity';
ALTER TABLE provider_helper_usage_outbox ADD COLUMN IF NOT EXISTS retry_count bigint NOT NULL DEFAULT 0;
ALTER TABLE provider_helper_usage_outbox ADD COLUMN IF NOT EXISTS failure_code text NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS provider_helper_usage_outbox_due ON provider_helper_usage_outbox(next_attempt_at,created_at,request_id);

CREATE INDEX IF NOT EXISTS provider_helper_records_expiry ON provider_helper_records(expires_at) WHERE payload IS NOT NULL;
