-- The time a request's body took to arrive (CONTRACTS §63): milliseconds from
-- the request's start until the gateway had read the whole body. A large
-- body from a distant client is part of the first-token time the row shows,
-- and this says how much. Only a defaulted column is added; an older core
-- writes 0.
ALTER TABLE usage_logs ADD COLUMN IF NOT EXISTS upload_ms int NOT NULL DEFAULT 0;
