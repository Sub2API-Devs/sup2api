CREATE TABLE IF NOT EXISTS provider_skill_versions (
 public_id text PRIMARY KEY,
 parent_id text NOT NULL REFERENCES provider_resources(public_id),
 request_id text NOT NULL,
 remote_id text NOT NULL DEFAULT '',
 legacy_epoch text NOT NULL DEFAULT '',
 state text NOT NULL CHECK(state IN ('pending','uncertain','ready','deleting','delete_uncertain','deleted','failed')),
 operation_id text NOT NULL,
 bytes bigint NOT NULL CHECK(bytes>=0),
 metadata jsonb NOT NULL DEFAULT '{}',
 intent_hash text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(parent_id,request_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS provider_skill_version_remote ON provider_skill_versions(parent_id,remote_id) WHERE remote_id<>'';
CREATE UNIQUE INDEX IF NOT EXISTS provider_skill_version_epoch ON provider_skill_versions(parent_id,legacy_epoch) WHERE legacy_epoch<>'';
CREATE INDEX IF NOT EXISTS provider_skill_version_pages ON provider_skill_versions(parent_id,created_at,public_id);
