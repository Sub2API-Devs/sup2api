-- account_balances: account balance snapshots (§51 CCGateway balance + Redis cache)
CREATE TABLE IF NOT EXISTS account_balances (
    account_id     BIGINT       PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
    amount_micros  BIGINT       NOT NULL,     -- balance in micro-units (e.g., 1234500 = $1.2345)
    currency       VARCHAR(3)   NOT NULL,     -- ISO 4217 currency code (e.g., "USD")
    source         VARCHAR(32)  NOT NULL,     -- "active" | "" (empty = stale/error)
    updated_at     TIMESTAMPTZ  NOT NULL,     -- when this snapshot was retrieved
    error          TEXT,                       -- error message if query failed
    error_at       TIMESTAMPTZ                 -- when error occurred
);

CREATE INDEX IF NOT EXISTS idx_account_balances_updated_at ON account_balances(updated_at);
