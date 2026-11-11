-- Session windows (CONTRACTS §71.1): accounts.spm_window_seconds is the
-- window spm_limit counts sessions over, 60-86400 seconds, default 60 (the
-- minute counted so far); model lists carry spm_window_seconds in
-- model_limits (absent = 60, no change needed). An older core ignores it and
-- counts over 60 seconds.
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS spm_window_seconds int NOT NULL DEFAULT 60;

ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_spm_window_seconds_chk;
ALTER TABLE accounts ADD CONSTRAINT accounts_spm_window_seconds_chk CHECK (spm_window_seconds BETWEEN 60 AND 86400);
