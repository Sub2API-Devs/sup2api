-- Per-account opt-out of automatic disabling (CONTRACTS §42.3).
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS auto_disable boolean NOT NULL DEFAULT true;
