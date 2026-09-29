-- What the scheduler.rank plugins changed for a request (CONTRACTS §24):
-- [{"plugin":"guard","changed":[{"account_id":1,"priority":10,"weight":500}]}]
-- Only accounts whose priority or weight the plugin actually changed are
-- listed; '[]' means no plugin took part in scheduling this request. The
-- rewrite is per request only: accounts.priority / accounts.weight never move.

ALTER TABLE usage_logs ADD COLUMN sched_decisions jsonb NOT NULL DEFAULT '[]';
