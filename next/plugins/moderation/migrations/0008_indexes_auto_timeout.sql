-- plg_moderation 0008: moderation 0.5.1 (CONTRACTS §72). Idempotent; the
-- new column has a default so older versions ignore it.

-- 0004 added events_user_created_idx on the same columns as 0001's
-- events_user_created_at_idx; one index is enough.
DROP INDEX IF EXISTS events_user_created_idx;

-- GET /users?ids= asks whether an id is an operator in the watch-list history.
CREATE INDEX IF NOT EXISTS watch_events_operator_idx ON watch_events (operator_id) WHERE operator_id IS NOT NULL;

-- The version was published with total_timeout_ms 0 ("automatic", §72.7):
-- spec carries the value resolved at publish, and a rollback or a discard
-- puts 0 back in the draft. Versions before 0.5.1 keep their value.
ALTER TABLE flow_versions ADD COLUMN IF NOT EXISTS auto_timeout boolean NOT NULL DEFAULT false;
