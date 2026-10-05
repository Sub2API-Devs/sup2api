-- Preserve existing policies, then set the default for newly created groups.
ALTER TABLE groups ADD COLUMN IF NOT EXISTS model_filter_mode text NOT NULL DEFAULT 'whitelist' CHECK (model_filter_mode IN ('whitelist', 'blacklist'));
ALTER TABLE groups ALTER COLUMN model_filter_mode SET DEFAULT 'blacklist';
