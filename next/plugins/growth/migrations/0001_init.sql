-- plg_growth 0001: referral codes, commissions and check-in records.
-- Runs with search_path pinned to the plugin schema (plg_growth).

-- Referral codes: one per user, generated on user.created event.
CREATE TABLE IF NOT EXISTS referral_codes (
    user_id         bigint      PRIMARY KEY,
    code            text        NOT NULL UNIQUE,
    inviter_user_id bigint,     -- NULL = not invited by anyone
    created_at      timestamptz NOT NULL DEFAULT now(),
    bound_at        timestamptz -- when the inviter was bound
);
CREATE INDEX IF NOT EXISTS referral_codes_inviter_idx ON referral_codes (inviter_user_id) WHERE inviter_user_id IS NOT NULL;

-- Commission records: one row per credited commission (idempotent on ledger_id).
CREATE TABLE IF NOT EXISTS commissions (
    id              bigserial   PRIMARY KEY,
    inviter_user_id bigint      NOT NULL,
    invitee_user_id bigint      NOT NULL,
    event_type      text        NOT NULL, -- usage.recorded | balance.changed
    event_id        bigint      NOT NULL, -- usage_log id or balance_ledger id
    base_amount     decimal(20,8) NOT NULL, -- usage cost or recharge amount
    rate_percent    decimal(5,2) NOT NULL,
    commission      decimal(20,8) NOT NULL,
    ledger_id       bigint      NOT NULL UNIQUE, -- balance_ledger.id
    created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS commissions_inviter_created_idx ON commissions (inviter_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS commissions_invitee_idx ON commissions (invitee_user_id);
CREATE INDEX IF NOT EXISTS commissions_event_idx ON commissions (event_type, event_id);

-- Check-in records: one row per user per day (UTC).
CREATE TABLE IF NOT EXISTS checkins (
    id          bigserial   PRIMARY KEY,
    user_id     bigint      NOT NULL,
    checkin_date date       NOT NULL, -- UTC date
    quota_awarded decimal(20,8) NOT NULL,
    ledger_id   bigint      NOT NULL UNIQUE,
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, checkin_date)
);
CREATE INDEX IF NOT EXISTS checkins_user_date_idx ON checkins (user_id, checkin_date DESC);
CREATE INDEX IF NOT EXISTS checkins_date_idx ON checkins (checkin_date);
