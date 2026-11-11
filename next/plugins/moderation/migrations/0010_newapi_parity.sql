-- plg_moderation 0010: moderation 0.8.0 (new-api parity, DESIGN-2026-11-10).
-- Idempotent. New columns have defaults, so 0.7.x keeps working after a rollback.

-- The question-table LLM auditor.
ALTER TABLE auditors DROP CONSTRAINT IF EXISTS auditors_type_check;
ALTER TABLE auditors ADD CONSTRAINT auditors_type_check
    CHECK (type IN ('openai_moderation', 'typesafe', 'llm_verdict', 'llm_questions'));

-- Verdict cache: the clear counter, replayed records and their hourly count.
ALTER TABLE config_state ADD COLUMN IF NOT EXISTS cache_epoch bigint NOT NULL DEFAULT 0;
ALTER TABLE events       ADD COLUMN IF NOT EXISTS replayed    boolean NOT NULL DEFAULT false;
ALTER TABLE stats_hourly ADD COLUMN IF NOT EXISTS replayed    bigint  NOT NULL DEFAULT 0;

-- One-time conversion of auto-added watch entries (parity.go).
ALTER TABLE config_state ADD COLUMN IF NOT EXISTS parity_converted boolean NOT NULL DEFAULT false;
-- When it first ran: entries added by 0.7.x nodes in the day after it are converted too.
ALTER TABLE config_state ADD COLUMN IF NOT EXISTS parity_converted_at timestamptz;
