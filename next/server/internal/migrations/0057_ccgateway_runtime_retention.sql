-- Deleting a CCGateway account may keep its runtime for the retention days
-- the account type declares (lifecycle.deletion.retentionDays): purge_after
-- is when the core removes the runtime, its data volume and recovery backup;
-- purged_at records that it did, so no node purges it again. A deleted
-- account's row with retired_at but no purge_after (written by an older core)
-- is purged at once. Only nullable columns are added; an older core ignores
-- them, so it purges a retained runtime at once and purges again at every
-- pass: upgrade every node before deleting an account with retention.
ALTER TABLE ccgateway_runtimes ADD COLUMN IF NOT EXISTS purge_after timestamptz;
ALTER TABLE ccgateway_runtimes ADD COLUMN IF NOT EXISTS purged_at   timestamptz;
