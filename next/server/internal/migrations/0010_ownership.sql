-- Ownership of accounts and proxies (CONTRACTS §21): "own" permissions only
-- reach rows whose created_by is the caller. accounts.created_by exists since
-- 0001; proxies gain it here. NULL marks rows created before this migration
-- (or by the system), reachable through the "all" permissions only.

ALTER TABLE proxies ADD COLUMN created_by bigint REFERENCES users(id);

CREATE INDEX accounts_created_by_idx ON accounts (created_by) WHERE deleted_at IS NULL;
CREATE INDEX proxies_created_by_idx ON proxies (created_by);
