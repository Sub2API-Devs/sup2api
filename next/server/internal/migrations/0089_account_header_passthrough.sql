-- Client request headers an account copies onto its upstream requests
-- (CONTRACTS §81): "*", "regex:<pattern>" or exact header names. Empty means
-- only the headers the account's platform forwards.
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS header_passthrough text[] NOT NULL DEFAULT '{}';
