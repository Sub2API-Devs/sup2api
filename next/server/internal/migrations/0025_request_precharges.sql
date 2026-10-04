CREATE TABLE request_precharges (
    request_id varchar(64) PRIMARY KEY,
    user_id bigint NOT NULL REFERENCES users(id),
    amount numeric(20,8) NOT NULL CHECK (amount > 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL DEFAULT now() + interval '24 hours'
);
CREATE INDEX request_precharges_expiry ON request_precharges(expires_at);
