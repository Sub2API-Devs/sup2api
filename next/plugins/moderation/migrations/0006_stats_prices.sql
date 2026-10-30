-- plg_moderation 0006: moderation 0.4 (CONTRACTS §72.14): price modes of the
-- auditor rows of stats_hourly, so the auditor list and the overview can show
-- priced, unpriced and free calls like the channel rows. Idempotent; the
-- columns have defaults so older versions ignore them.

ALTER TABLE stats_hourly ADD COLUMN IF NOT EXISTS priced_calls    bigint NOT NULL DEFAULT 0;
ALTER TABLE stats_hourly ADD COLUMN IF NOT EXISTS unpriced_calls  bigint NOT NULL DEFAULT 0;
ALTER TABLE stats_hourly ADD COLUMN IF NOT EXISTS unpriced_tokens bigint NOT NULL DEFAULT 0;
ALTER TABLE stats_hourly ADD COLUMN IF NOT EXISTS free_calls      bigint NOT NULL DEFAULT 0;
