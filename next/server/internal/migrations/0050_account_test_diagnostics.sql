ALTER TABLE accounts
    ADD COLUMN IF NOT EXISTS last_test_status integer,
    ADD COLUMN IF NOT EXISTS last_test_error_code varchar(128),
    ADD COLUMN IF NOT EXISTS last_test_error_source varchar(32);
