-- Whether the account plugin keeps the model list (CONTRACTS §59).
-- NULL uses the account type's default; explicit false preserves manual models.
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS auto_models boolean;
