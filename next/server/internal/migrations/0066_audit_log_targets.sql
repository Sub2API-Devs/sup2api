-- Audit log filters by target and actor (CONTRACTS §74.2): the plugin detail
-- page lists one plugin's audit rows (target_type 'plugin', target_id the key),
-- including the writes its admin routes served. Plain CREATE INDEX: core
-- migrations run inside a transaction (see 0028).
CREATE INDEX IF NOT EXISTS audit_logs_target_idx ON audit_logs (target_type, target_id, id DESC);
CREATE INDEX IF NOT EXISTS audit_logs_user_idx ON audit_logs (user_id, id DESC);
