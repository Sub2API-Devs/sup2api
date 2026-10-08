CREATE TABLE IF NOT EXISTS provider_resource_contexts (
 user_id bigint NOT NULL REFERENCES users(id),
 group_id bigint NOT NULL REFERENCES groups(id),
 account_id bigint NOT NULL,
 principal_id text NOT NULL,
 generation text NOT NULL,
 plugin_key text NOT NULL,
 kind text NOT NULL,
 parent_id text NOT NULL,
 resource_id text NOT NULL REFERENCES provider_resources(public_id),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,group_id,account_id,principal_id,generation,plugin_key,kind,parent_id)
);
CREATE INDEX IF NOT EXISTS provider_resource_contexts_target ON provider_resource_contexts(resource_id);
-- A provider parent identity cannot be adopted by a second tenant, even if
-- both tenants independently own a different container on the same account.
CREATE UNIQUE INDEX IF NOT EXISTS provider_resource_contexts_remote_parent ON provider_resource_contexts(account_id,principal_id,generation,plugin_key,kind,parent_id);
CREATE INDEX IF NOT EXISTS provider_resources_remote_history ON provider_resources(plugin_key,kind,account_id,principal_id,generation,remote_id) WHERE remote_id <> '';
