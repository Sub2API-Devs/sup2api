-- Subscription type the account's runtime reported ("max", "pro" ...),
-- CONTRACTS §59. NULL while unknown.
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS subscription_type text;
