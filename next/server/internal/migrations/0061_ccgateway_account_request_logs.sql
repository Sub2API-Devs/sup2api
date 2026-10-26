-- A CCGateway account's own request log level (CONTRACTS §65,
-- REQUEST-LOG-POLICY-DESIGN.md §1): no row follows the default rule of the
-- CCGateway configuration. full is always temporary: it carries full_until,
-- and once that has passed the row counts as absent (the core checks it when
-- it builds a request's policy). The core stores only the level; the logs
-- themselves stay in the account's Worker. A new table only: an older core
-- ignores it and leaves every Worker at its local level.
CREATE TABLE IF NOT EXISTS ccgateway_account_request_logs (
    account_id bigint PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
    level text NOT NULL CHECK (level IN ('off', 'summary', 'full')),
    full_until timestamptz,
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    CONSTRAINT ccgateway_account_request_logs_full_until CHECK ((level = 'full') = (full_until IS NOT NULL))
);
