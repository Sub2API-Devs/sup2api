-- Opaque provider tokens never enter persistence; the hash binds tenant,
-- issuing account, exact admitted prompt shapes and a short local deadline.
CREATE TABLE IF NOT EXISTS provider_fallback_credits (
 token_hash text PRIMARY KEY,
 user_id bigint NOT NULL REFERENCES users(id),
 group_id bigint NOT NULL REFERENCES groups(id),
 account_id bigint NOT NULL,
 principal_id text NOT NULL,
 generation text NOT NULL,
 plugin_key text NOT NULL,
 source_model text NOT NULL,
 prompt_digests jsonb NOT NULL,
 observed_at timestamptz NOT NULL,
 expires_at timestamptz NOT NULL,
 CHECK (expires_at > observed_at AND expires_at <= observed_at + interval '5 minutes')
);
CREATE INDEX IF NOT EXISTS provider_fallback_credits_owner ON provider_fallback_credits(user_id,group_id,expires_at);
CREATE INDEX IF NOT EXISTS provider_fallback_credits_expiry ON provider_fallback_credits(expires_at);
