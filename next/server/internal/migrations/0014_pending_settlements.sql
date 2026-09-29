-- Pre-charged usage rows waiting for their real cost (CONTRACTS §25.4,
-- PLUGIN-EXECUTES-CORE-RECORDS §3.4).
--
-- A plugin whose work only STARTS during the gateway request (a video
-- generation job) returns a Reservation from ExtractUsage. The core prices
-- the estimate, charges it through the ordinary ledger path with the ordinary
-- "usage:{request_id}" key, writes the usage row with
-- billing_status = 'reserved' - a NEW value of that column, alongside
-- pending | billed | failed | free - and registers the entry here.
--
-- The core then drives a generic reconcile loop: it knows nothing about
-- "tasks", only about entries that are due. One node at a time (a cluster
-- lock), exponential backoff, a deadline the plugin states and the core
-- clamps. Each round it asks the plugin to BUILD a request, sends that
-- request itself (account proxy, SSRF guard, its own timeout) and asks the
-- plugin to PARSE the answer.
--
-- state:
--   pending   - due at next_check_at
--   settled   - the upstream reported real usage; the row was repriced and
--               the difference charged or refunded
--   failed    - the work failed upstream; the reservation was refunded whole
--   abandoned - the core stopped asking (attempts or deadline). The
--               reservation stands as the final charge, and the usage row is
--               'billed', NOT 'failed': the money has already left, and
--               usage_logs_billing_pending_idx covers exactly
--               ('pending','failed'), so writing 'failed' here would hand the
--               row back to the settlement retry loop and charge it twice.
--               usage_logs.anomalies records {"reconcile":"abandoned",...}.
--
-- An abandoned entry is not the end of the story for a human: the console
-- offers "reconcile again" and "refund" on it, because the automatic policy
-- deliberately errs towards the platform and someone has to be able to err
-- the other way.

CREATE TABLE pending_settlements (
    id             bigserial PRIMARY KEY,
    -- The plugin that will be asked, i.e. the one declaring the platform of
    -- the response (the one whose ExtractUsage returned the Reservation).
    plugin_key     varchar(30)  NOT NULL,
    -- The plugin's own id for the work. Unique per plugin so a retried
    -- submission registers one entry.
    ref_id         varchar(200) NOT NULL,
    usage_log_id   bigint       NOT NULL REFERENCES usage_logs(id),
    account_id     bigint,
    attempts       int          NOT NULL DEFAULT 0,
    next_check_at  timestamptz  NOT NULL,
    deadline_at    timestamptz  NOT NULL,
    state          varchar(20)  NOT NULL DEFAULT 'pending',
    last_error     text         NOT NULL DEFAULT '',
    created_at     timestamptz  NOT NULL DEFAULT now(),
    UNIQUE (plugin_key, ref_id)
);

-- The loop's only query: the due entries, in due order.
CREATE INDEX pending_settlements_due_idx ON pending_settlements (next_check_at) WHERE state = 'pending';
-- The console reads an entry from the usage row it belongs to.
CREATE INDEX pending_settlements_usage_idx ON pending_settlements (usage_log_id);
