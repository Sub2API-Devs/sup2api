ALTER TABLE accounts ADD COLUMN IF NOT EXISTS auto_disabled_until timestamptz;

CREATE INDEX IF NOT EXISTS accounts_auto_disabled_due_idx
    ON accounts (auto_disabled_until, id)
    WHERE deleted_at IS NULL AND status = 'auto_disabled' AND auto_disabled_until IS NOT NULL;
