-- plg_moderation 0011: moderation 0.10.0 (audit scope of a flow, how a record
-- found its flow; CONTRACTS §72.4, §72.17).
-- Expand only and idempotent: nullable columns without a default or a check,
-- so 0.9.3 nodes, which name their columns in every statement on these
-- tables, keep working beside 0.10.0 during a rolling upgrade.

-- The ALTERs take an ACCESS EXCLUSIVE lock (each is metadata only: no
-- rewrite). Fail fast rather than queue behind a long query on events: the
-- gateway's inserts would queue behind this migration in turn. The plugin
-- migrator runs each file in its own transaction (store.Migrate), so SET
-- LOCAL ends with it; a timeout rolls the file back, fails the rollout with
-- the active version still serving, and a retry runs the file again.
SET LOCAL lock_timeout = '10s';

-- The audit scope of a flow (input | tools | all); NULL = all, what every flow
-- did before 0.10.0. A column and not a spec field: 0.9.3 drops a published
-- spec with a field it does not know (ParseSpec).
ALTER TABLE flows ADD COLUMN IF NOT EXISTS scope text;

-- How the request found its flow (group | account | account_any | default |
-- fallback) and, for fallback, the binding that did not apply. NULL on the
-- records of 0.9.3 nodes.
ALTER TABLE events ADD COLUMN IF NOT EXISTS flow_source text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS flow_fallback_id bigint;
ALTER TABLE events ADD COLUMN IF NOT EXISTS flow_fallback_reason text;
