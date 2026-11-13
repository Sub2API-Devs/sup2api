-- plg_moderation 0013: moderation 0.11.0, the contract step of 0.10.0
-- (CONTRACTS §72 0.11.0).
--
-- Drops what the AI analysis left behind; 0.10.0 stopped reading and
-- writing all of it (no migration then, so it could roll). The non-test
-- code of 0.10.0 (origin/develop 48339b0668, `git grep` over
-- next/plugins/moderation without tests and migrations) names none of these
-- objects: user_analyses, user_analyses_user_idx,
-- watchlist_analysis_requested_idx, the nine watchlist columns and the six
-- events columns below. Every 0.10.0 statement on watchlist and events
-- names its columns (TestMigration0013Rolling runs them on the new
-- schema), so 0.10.0 keeps working beside 0.11.0 during the rollout and
-- after a rollback. Idempotent (IF EXISTS).
--
-- Kept: watch_events.analysis_id (audit of past changes) and the value
-- 'analysis' of the CHECK of watchlist.source (rows added by the analysis).

-- The DROPs take an ACCESS EXCLUSIVE lock (metadata only: no rewrite). Fail
-- fast rather than queue behind a long query on events: the gateway's
-- inserts would queue behind this migration in turn. The plugin migrator
-- runs each file in its own transaction (store.Migrate), so SET LOCAL ends
-- with it; a timeout rolls the file back, fails the rollout with the active
-- version still serving, and a retry runs the file again.
SET LOCAL lock_timeout = '10s';

DROP TABLE IF EXISTS user_analyses; -- drops user_analyses_user_idx with it

DROP INDEX IF EXISTS watchlist_analysis_requested_idx;
ALTER TABLE watchlist
    DROP COLUMN IF EXISTS analysis_requested_at,
    DROP COLUMN IF EXISTS analysis_source,
    DROP COLUMN IF EXISTS analysis_claim_until,
    DROP COLUMN IF EXISTS analysis_token,
    DROP COLUMN IF EXISTS latest_analysis_id,
    DROP COLUMN IF EXISTS latest_analysis_status,
    DROP COLUMN IF EXISTS latest_trend,
    DROP COLUMN IF EXISTS latest_suggestion,
    DROP COLUMN IF EXISTS analyzed_at;

ALTER TABLE events
    DROP COLUMN IF EXISTS ai_verdict,
    DROP COLUMN IF EXISTS ai_severity,
    DROP COLUMN IF EXISTS ai_category,
    DROP COLUMN IF EXISTS ai_evidence,
    DROP COLUMN IF EXISTS ai_reason,
    DROP COLUMN IF EXISTS ai_analysis_id;

-- The one-time import of the settings' user lists into locked watch entries
-- ran (upgrade.go). 0.10.0 does not read config_state with a star.
ALTER TABLE config_state ADD COLUMN IF NOT EXISTS lists_imported boolean NOT NULL DEFAULT false;
