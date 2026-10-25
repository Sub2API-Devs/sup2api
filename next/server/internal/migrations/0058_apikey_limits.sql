-- Caps an API key's owner sets on it (0 = unlimited): requests and tokens per
-- minute in the shared windows of scope "apikey", and requests in flight
-- (cluster slots of kind "apikey"). Only defaulted columns are added; an
-- older core ignores them and enforces no cap until every node is upgraded.
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS rpm_limit       int    NOT NULL DEFAULT 0;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS tpm_limit       bigint NOT NULL DEFAULT 0;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS max_concurrency int    NOT NULL DEFAULT 0;
