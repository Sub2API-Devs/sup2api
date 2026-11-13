-- Administrator lock (2026-11-12 authz hardening, W1-F10): accounts.admin_locked
-- is set when a caller with the full account:update scope disables an account
-- somebody else created; while it is set, an own-level caller can neither
-- enable the account nor reset its status. Enabling or resetting with the
-- full scope clears it. Existing rows start unlocked: accounts disabled before
-- this migration are not locked in retrospect.
--
-- A constant default: no table rewrite. An older core ignores the column.

-- Fail fast when a lock is not to be had, rather than queue for it: the
-- gateway reads accounts on every request and would queue behind this
-- migration in turn.
SET LOCAL lock_timeout = '10s';

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS admin_locked boolean NOT NULL DEFAULT false;
