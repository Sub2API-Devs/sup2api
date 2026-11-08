-- plg_moderation 0009: moderation 0.7.0 (CONTRACTS §72.17): flows bound to
-- accounts. Idempotent; older versions do not read the table, so after a
-- rollback only the group bindings (flow_groups) apply again.
--
-- One row per (group, account): group_id 0 = the account in any group.
-- flow_id 0 = not moderated (an exemption). The group-wide bindings stay in
-- flow_groups, where flow_id 0 also means "not moderated" (older versions
-- read it as a binding to a missing flow, which is the same).
CREATE TABLE IF NOT EXISTS flow_accounts (
    group_id   bigint NOT NULL DEFAULT 0 CHECK (group_id >= 0),
    account_id bigint NOT NULL CHECK (account_id > 0),
    flow_id    bigint NOT NULL CHECK (flow_id >= 0),
    PRIMARY KEY (group_id, account_id)
);
CREATE INDEX IF NOT EXISTS flow_accounts_flow_idx ON flow_accounts (flow_id);
