-- Group pricing (CONTRACTS §97): the usage side. Its own migration, apart
-- from 0095: that one holds users locked until it commits, and every gateway
-- request joins users, so it must not also wait for usage_logs there.
--
-- usage_logs.base_cost: what the usage costs at the global price, before any
-- price rule and before the rate (the "standard cost" of the statistics).
-- NULL on rows from before this migration, which had no price rules: for
-- them it is total_cost / rate_multiplier, as it always was. A nullable
-- column without a default: no rewrite.

-- Fail fast when a lock is not to be had, rather than queue for it: whoever
-- reads usage_logs would queue behind this migration in turn.
SET LOCAL lock_timeout = '10s';

ALTER TABLE usage_logs ADD COLUMN IF NOT EXISTS base_cost numeric(20,8);

-- The hourly rollup reads base_cost (usage/stats.go standardCost), so an
-- update of it marks the hour, like the other columns its measures read.
CREATE OR REPLACE TRIGGER usage_hourly_mark_update AFTER UPDATE OF
        created_at, user_id, api_key_id, group_id, account_id, model, upstream_model, protocol, platform,
        success, input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens, cache_creation_1h_tokens,
        total_cost, base_cost, rate_multiplier, billing_detail, anomalies, latency_ms, first_token_ms
    ON usage_logs FOR EACH ROW
    WHEN (date_trunc('hour', LEAST(OLD.created_at, NEW.created_at), 'UTC') < clock_timestamp() - interval '75 minutes')
    EXECUTE FUNCTION usage_hourly_mark();
