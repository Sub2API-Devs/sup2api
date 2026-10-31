-- Environment variables (CONTRACTS §73.3): the group and account layers. The
-- global layer is the "environment" row of settings. Only set keys are kept;
-- an absent key follows the next layer. An older core ignores the columns.
ALTER TABLE groups ADD COLUMN IF NOT EXISTS environment jsonb NOT NULL DEFAULT '{}';
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS environment jsonb NOT NULL DEFAULT '{}';

ALTER TABLE groups DROP CONSTRAINT IF EXISTS groups_environment_chk;
ALTER TABLE groups ADD CONSTRAINT groups_environment_chk CHECK (jsonb_typeof(environment) = 'object');
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_environment_chk;
ALTER TABLE accounts ADD CONSTRAINT accounts_environment_chk CHECK (jsonb_typeof(environment) = 'object');
