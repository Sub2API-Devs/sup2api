-- Rate limit tier the account's runtime reported ("default_claude_ai",
-- "default_claude_max_20x" ...), shown as the upstream names it. NULL while
-- unknown: Workers before ccgateway 0.1.129 do not report it.
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS rate_limit_tier text;
