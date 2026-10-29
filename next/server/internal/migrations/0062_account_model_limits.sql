-- Limits of lists of client models on an account, on top of the account's
-- own (CONTRACTS §68): [{models: [...], max_concurrency, rpm_limit,
-- tpm_limit}], the models of a list sharing one set of counters. A model is in
-- at most one list (checked by the core). Only a defaulted column is added; an
-- older core ignores it and enforces no list cap until every node is upgraded.
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS model_limits jsonb NOT NULL DEFAULT '[]';
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_model_limits_chk;
ALTER TABLE accounts ADD CONSTRAINT accounts_model_limits_chk CHECK (jsonb_typeof(model_limits) = 'array');
