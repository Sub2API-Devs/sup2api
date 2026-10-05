-- CCGateway per-account runtimes created before the account exists (CONTRACTS
-- §49): the account editor starts a runtime under a random draft key
-- (d + 16 hex), the user authorizes Claude Code in it, and saving the account
-- adopts the draft (account_id, adopted_at). An adopted account keeps using
-- the draft key for its runtime; accounts without a row use their id.
-- Unadopted drafts are removed by the core's sweep. Only a new table is
-- added, so an older core keeps working (it never reads it).
CREATE TABLE IF NOT EXISTS ccgateway_runtimes (
  key          text PRIMARY KEY,
  account_id   bigint UNIQUE REFERENCES accounts(id),
  proxy_id     bigint,
  created_by   bigint,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  adopted_at   timestamptz
);
