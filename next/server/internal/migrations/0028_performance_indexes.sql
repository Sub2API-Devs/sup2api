-- Indexes for group-scoped API key lookups and the audit log action filter
-- (BE-P1-13).
--
-- Core migrations run inside a transaction (store.Migrate), where
-- CREATE INDEX CONCURRENTLY is refused (SQLSTATE 25001), so these are plain
-- CREATE INDEX: both tables are small, and the build holds off writes to them
-- only briefly. migrations_test.go keeps non-transactional statements out of
-- every migration.
--
-- usage_logs.client_request_id gets no index: nothing filters on it, and it
-- would only slow down writes to the busiest table.

-- Group delete, group key counts and the key cache flush filter on group_id
-- (some without deleted_at, so the index is not partial).
CREATE INDEX IF NOT EXISTS api_keys_group_idx ON api_keys (group_id);

-- Audit log page: filter by action, newest first.
CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON audit_logs (action, id DESC);
