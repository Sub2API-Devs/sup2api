-- Request parameter override of an account (CONTRACTS §84): new-api's channel
-- param_override format, a flat object of keys to set or {"operations": [...]}.
-- NULL means none.
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS param_override jsonb;
