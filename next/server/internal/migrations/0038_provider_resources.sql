-- Durable intents precede remote side effects. Expiry never proves deletion.
CREATE TABLE IF NOT EXISTS provider_resources (
 public_id text PRIMARY KEY,
 user_id bigint NOT NULL REFERENCES users(id),
 group_id bigint NOT NULL REFERENCES groups(id),
 request_id text NOT NULL,
 plugin_key text NOT NULL,
 kind text NOT NULL,
 account_id bigint NOT NULL,
 principal_id text NOT NULL,
 generation text NOT NULL,
 remote_id text NOT NULL DEFAULT '',
 state text NOT NULL CHECK (state IN ('pending','uncertain','ready','deleting','delete_uncertain','deleted','failed')),

 failure_code text NOT NULL DEFAULT '',
 operation_id text NOT NULL,
 bytes bigint NOT NULL CHECK (bytes >= 0),
 metadata jsonb NOT NULL DEFAULT '{}',
 intent_hash text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id, group_id, request_id)
);
CREATE INDEX IF NOT EXISTS provider_resources_owner ON provider_resources(user_id,group_id,public_id);
CREATE UNIQUE INDEX IF NOT EXISTS provider_resources_remote ON provider_resources(plugin_key,kind,account_id,principal_id,generation,remote_id) WHERE remote_id <> '' AND state <> 'deleted';
