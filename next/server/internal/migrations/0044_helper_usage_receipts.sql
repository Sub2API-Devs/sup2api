-- A receipt survives usage retention: missing usage must never be charged again
-- merely because a durable outbox is replayed after its row was removed.
CREATE TABLE IF NOT EXISTS provider_helper_usage_receipts (
 request_id varchar(64) PRIMARY KEY,
 digest char(64) NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
