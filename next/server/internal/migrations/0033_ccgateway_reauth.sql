-- Re-authorizing a saved CCGateway account (CONTRACTS §49.17): the console
-- starts a draft runtime for the account (for_account), signs Claude Code in
-- there, and committing it swaps the account's runtime: the old row loses its
-- account_id and gets retired_at, the draft is adopted. Retired runtimes are
-- deleted by the core's sweep 10 minutes later. Only nullable columns are
-- added. An older core never reads them but would take a retired row for an
-- unadopted draft: upgrade every node before re-authorizing an account.
ALTER TABLE ccgateway_runtimes ADD COLUMN IF NOT EXISTS for_account bigint;
ALTER TABLE ccgateway_runtimes ADD COLUMN IF NOT EXISTS retired_at  timestamptz;
