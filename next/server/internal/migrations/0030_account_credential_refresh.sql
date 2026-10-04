-- Credential refresh state of accounts (CONTRACTS §48): account types that
-- declare manifest accountTypes[].refresh have their credentials renewed by
-- the core before they expire (an OAuth access token from its refresh
-- token). One row per account that was ever looked at.
CREATE TABLE IF NOT EXISTS account_credential_refresh (
    account_id         bigint      PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
    -- Expiry read from the credentials after the last attempt (NULL =
    -- unknown); shown in the console, the sweep reads the credentials.
    expires_at         timestamptz,
    last_attempt_at    timestamptz,
    last_success_at    timestamptz,
    -- Outcome of the last attempt: '' (success), 'auth_rejected' (the
    -- refresh credential is dead) or 'transient'.
    error_type         varchar(20) NOT NULL DEFAULT '',
    error              text        NOT NULL DEFAULT '',
    -- SHA-256 of the credentials_enc the upstream rejected for good. While
    -- the stored credentials are still exactly those, the sweep skips the
    -- account: only new credentials (an administrator re-authorising) can
    -- help.
    rejected_cred_hash bytea
);
