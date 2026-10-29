-- Sessions per minute (CONTRACTS §71): accounts.spm_limit caps the sticky
-- sessions active in the last 60 seconds, 0 = unlimited; model lists carry
-- spm_limit in model_limits (absent = 0, no change needed).
--
-- The column dates from 0009 (an earlier SPM, removed on 2026-10-05 and kept
-- only for rollback). Values left from then must not come back as live caps,
-- so they are cleared once: the column comment marks the reset as done, and a
-- re-run keeps what administrators set since. An older core ignores it.
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS spm_limit int NOT NULL DEFAULT 0;

DO $$
BEGIN
    IF col_description('accounts'::regclass,
        (SELECT attnum FROM pg_attribute WHERE attrelid = 'accounts'::regclass AND attname = 'spm_limit')) IS DISTINCT FROM 'CONTRACTS §71' THEN
        UPDATE accounts SET spm_limit = 0 WHERE spm_limit <> 0;
    END IF;
END $$;

COMMENT ON COLUMN accounts.spm_limit IS 'CONTRACTS §71';

ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_spm_limit_chk;
ALTER TABLE accounts ADD CONSTRAINT accounts_spm_limit_chk CHECK (spm_limit BETWEEN 0 AND 10000000);
