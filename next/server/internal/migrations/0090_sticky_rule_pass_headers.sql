-- Client request headers a request matching a sticky rule forwards upstream
-- (CONTRACTS §5.6, rules as in §81): "*", "regex:<pattern>" or exact header
-- names. Empty forwards nothing beyond the platform's and the account's own.
ALTER TABLE sticky_rules ADD COLUMN IF NOT EXISTS pass_headers text[] NOT NULL DEFAULT '{}';
