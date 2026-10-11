ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS allowed_ips text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS usage_logs_client_ip_created_idx ON usage_logs (client_ip, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS usage_logs_api_key_created_idx ON usage_logs (api_key_id, created_at DESC, id DESC);
