-- Last console test of an account (CONTRACTS §50), like new-api's channel
-- test_time / response_time: written after every POST /accounts/:id/test,
-- shown as last_test in the account views. Only nullable columns are added,
-- so an older core keeps working on the new table (it never reads them).
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS last_test_at         timestamptz;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS last_test_ok         boolean;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS last_test_latency_ms integer;
-- Model actually requested (after the account's model mapping).
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS last_test_model      text;
-- Failure reason (the plugin's classification, else the upstream message),
-- at most 512 bytes; empty on success.
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS last_test_message    text;
