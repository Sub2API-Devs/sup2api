CREATE TABLE provider_diagnostic_messages (
 id_hash text PRIMARY KEY,
 user_id bigint NOT NULL REFERENCES users(id),
 group_id bigint NOT NULL REFERENCES groups(id),
 account_id bigint NOT NULL,
 principal_id text NOT NULL,
 generation text NOT NULL,
 observed_at timestamptz NOT NULL,
 retention_until timestamptz NOT NULL,
 CHECK (retention_until>observed_at)
);
CREATE INDEX provider_diagnostic_messages_owner ON provider_diagnostic_messages(user_id,group_id,retention_until);
CREATE INDEX provider_diagnostic_messages_retention ON provider_diagnostic_messages(retention_until);
