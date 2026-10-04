-- Security hardening (CONTRACTS §43).

-- Access tokens carry the user's token_version (claim "tv"); changing or
-- resetting the password, logging out of every session and disabling the
-- user increment it, which invalidates every access token issued before.
-- JWT validation compares the token's version claim against this column.
ALTER TABLE users ADD COLUMN token_version bigint NOT NULL DEFAULT 0;

-- A proxy may sit on a private or loopback address only when someone with
-- the full proxy:manage permission saved it last. Rows saved under the
-- "own" key are dialled through the SSRF guard. Existing rows keep working.
ALTER TABLE proxies ADD COLUMN allow_private boolean NOT NULL DEFAULT false;
UPDATE proxies SET allow_private = true;
