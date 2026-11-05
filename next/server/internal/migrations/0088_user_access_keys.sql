-- Access keys (CONTRACTS §80): a key calls the console API as its user, with
-- only the permissions chosen for it. Only the hash of a key is kept.
CREATE TABLE IF NOT EXISTS user_access_keys (
    id           bigserial PRIMARY KEY,
    user_id      bigint      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name         text        NOT NULL,
    token_hash   varchar(64) NOT NULL UNIQUE,
    token_hint   text        NOT NULL,
    permissions  text[]      NOT NULL,
    expires_at   timestamptz,
    last_used_at timestamptz,
    last_used_ip text        NOT NULL DEFAULT '',
    created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_access_keys_user_idx ON user_access_keys (user_id);
