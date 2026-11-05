-- Self-service account security (CONTRACTS §79): two-factor authentication,
-- passkeys and the list of login sessions.

-- Short-lived steps of a multi-request flow (the second login factor, WebAuthn
-- challenges, a TOTP secret being set up). Only the hash of the token is kept;
-- the requests of one flow may reach different nodes.
CREATE TABLE IF NOT EXISTS auth_flows (
    token_hash varchar(64) PRIMARY KEY,
    purpose    text        NOT NULL,
    user_id    bigint      REFERENCES users(id) ON DELETE CASCADE,
    payload    jsonb       NOT NULL DEFAULT '{}',
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_flows_expires_idx ON auth_flows (expires_at);

-- secret_enc is sealed with the master key, bound to the user id. last_step is
-- the newest accepted time step, so a code works only once.
CREATE TABLE IF NOT EXISTS user_totp (
    user_id         bigint PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    secret_enc      bytea       NOT NULL,
    last_step       bigint      NOT NULL DEFAULT 0,
    failed_attempts integer     NOT NULL DEFAULT 0,
    locked_until    timestamptz,
    enabled_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_totp_backup_codes (
    id         bigserial PRIMARY KEY,
    user_id    bigint      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash  text        NOT NULL,
    used_at    timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_totp_backup_codes_user_idx ON user_totp_backup_codes (user_id);

-- credential is the verified WebAuthn credential: public key, sign count, flags.
CREATE TABLE IF NOT EXISTS user_passkeys (
    id            bigserial PRIMARY KEY,
    user_id       bigint      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name          text        NOT NULL,
    rp_id         text        NOT NULL,
    credential_id bytea       NOT NULL UNIQUE,
    credential    jsonb       NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now(),
    last_used_at  timestamptz
);
CREATE INDEX IF NOT EXISTS user_passkeys_user_idx ON user_passkeys (user_id);

-- One row per refresh token family, from the login that started it.
CREATE TABLE IF NOT EXISTS login_sessions (
    family_id    text PRIMARY KEY,
    user_id      bigint      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    method       text        NOT NULL DEFAULT '',
    ip           text        NOT NULL DEFAULT '',
    user_agent   text        NOT NULL DEFAULT '',
    created_at   timestamptz NOT NULL DEFAULT now(),
    last_used_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS login_sessions_user_idx ON login_sessions (user_id);
