-- Security hardening (CONTRACTS §43).

-- Access tokens carry the user's token_version (claim "tv"); changing or
-- resetting the password, logging out of every session and disabling the
-- user increment it, which invalidates every access token issued before.
-- JWT validation compares the token's version claim against this column.
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version bigint NOT NULL DEFAULT 0;

-- A proxy may sit on a private or loopback address only when someone with
-- the full proxy:manage permission saved it last. Rows saved under the
-- "own" key are dialled through the SSRF guard. Proxies that existed before
-- this migration keep working - only when the column is first added: a
-- re-run must not open private addresses to proxies saved since.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = current_schema() AND table_name = 'proxies' AND column_name = 'allow_private') THEN
        ALTER TABLE proxies ADD COLUMN allow_private boolean NOT NULL DEFAULT false;
        UPDATE proxies SET allow_private = true;
    END IF;
END $$;
