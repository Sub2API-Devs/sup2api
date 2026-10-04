-- Performance indexes for high-traffic queries
-- BE-P1-13: usage_logs client_request_id partial index, api_keys group_id, audit_logs action+id

-- usage_logs: client_request_id is queried for idempotency checks
-- Only index non-null values (most rows have null client_request_id)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usage_logs_client_request_id
    ON usage_logs (client_request_id)
    WHERE client_request_id IS NOT NULL;

-- api_keys: group_id is used in account detail views and key listings
-- Only index non-deleted keys
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_keys_group_id
    ON api_keys (group_id)
    WHERE deleted_at IS NULL;

-- audit_logs: action filtering with id DESC for pagination
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_action_id
    ON audit_logs (action, id DESC);
