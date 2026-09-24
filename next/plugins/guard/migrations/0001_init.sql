-- plg_guard 0001: rules, statistics and event idempotency.
-- Runs with search_path pinned to the plugin schema (plg_guard).

CREATE TABLE rules (
    id         bigserial    PRIMARY KEY,
    name       varchar(100) NOT NULL,
    kind       varchar(20)  NOT NULL CHECK (kind IN ('keyword', 'regex')),
    pattern    text         NOT NULL,
    enabled    boolean      NOT NULL DEFAULT true,
    created_at timestamptz  NOT NULL DEFAULT now(),
    updated_at timestamptz  NOT NULL DEFAULT now()
);

-- Demo rule so a fresh install can be tested end to end.
INSERT INTO rules (name, kind, pattern, enabled)
VALUES ('demo: test marker', 'keyword', 'GUARD_TEST_BLOCK', true);

-- One row per blocked request (snippet only when record_snippets is on).
CREATE TABLE block_log (
    id          bigserial    PRIMARY KEY,
    occurred_at timestamptz  NOT NULL,
    rule_id     bigint       NOT NULL,
    rule_name   varchar(100) NOT NULL,
    request_id  varchar(100) NOT NULL DEFAULT '',
    user_id     bigint       NOT NULL DEFAULT 0,
    group_id    bigint       NOT NULL DEFAULT 0,
    model       varchar(200) NOT NULL DEFAULT '',
    snippet     text
);
CREATE INDEX block_log_occurred_at_idx ON block_log (occurred_at);

-- requests: from usage.recorded events; blocked: from the hook.
CREATE TABLE stats_minutely (
    minute   timestamptz  NOT NULL,
    group_id bigint       NOT NULL,
    model    varchar(200) NOT NULL,
    requests bigint       NOT NULL DEFAULT 0,
    blocked  bigint       NOT NULL DEFAULT 0,
    PRIMARY KEY (minute, group_id, model)
);

CREATE TABLE stats_hourly (
    hour     timestamptz  NOT NULL,
    group_id bigint       NOT NULL,
    model    varchar(200) NOT NULL,
    requests bigint       NOT NULL DEFAULT 0,
    blocked  bigint       NOT NULL DEFAULT 0,
    PRIMARY KEY (hour, group_id, model)
);

-- Event ids already applied (at-least-once delivery).
CREATE TABLE processed_events (
    event_id     bigint      PRIMARY KEY,
    processed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX processed_events_processed_at_idx ON processed_events (processed_at);
