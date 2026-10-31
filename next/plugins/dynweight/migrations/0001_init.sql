-- plg_dynweight 0001: dynamic weight (CONTRACTS §73.5).
-- Runs with search_path pinned to the plugin schema (plg_dynweight).

-- The configuration document (rules.Config), one row.
CREATE TABLE IF NOT EXISTS config (
    id         smallint    PRIMARY KEY CHECK (id = 1),
    doc        jsonb       NOT NULL,
    version    bigint      NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint      NOT NULL DEFAULT 0
);

-- Attempt counters of an (account, group, client model) in one window,
-- summed by every node (rules.Counts fields).
CREATE TABLE IF NOT EXISTS obs (
    account_id   bigint NOT NULL,
    group_id     bigint NOT NULL,
    model        text   NOT NULL,
    window_start bigint NOT NULL, -- unix seconds
    counts       jsonb  NOT NULL,
    PRIMARY KEY (account_id, group_id, model, window_start)
);
CREATE INDEX IF NOT EXISTS obs_window_start_idx ON obs (window_start);

-- Evaluation state of an (account, group, client model) (rules.State).
-- base / eff / tombstone repeat the document for the scheduling snapshot;
-- gen guards the write-back against a concurrent reset.
CREATE TABLE IF NOT EXISTS state (
    account_id  bigint           NOT NULL,
    group_id    bigint           NOT NULL,
    model       text             NOT NULL,
    data        jsonb            NOT NULL,
    base        integer          NOT NULL,
    eff         double precision NOT NULL,
    tombstone   boolean          NOT NULL DEFAULT false,
    eval_window bigint           NOT NULL,
    gen         bigint           NOT NULL DEFAULT 1,
    updated_at  timestamptz      NOT NULL DEFAULT now(),
    PRIMARY KEY (account_id, group_id, model)
);
CREATE INDEX IF NOT EXISTS state_changed_idx ON state (account_id) WHERE NOT tombstone AND eff <> base;

-- Base weights the scheduler handed in, per (account, group): the
-- evaluation runs outside requests and reads them here.
CREATE TABLE IF NOT EXISTS bases (
    account_id bigint      NOT NULL,
    group_id   bigint      NOT NULL,
    weight     integer     NOT NULL,
    name       text        NOT NULL DEFAULT '',
    seen_at    timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (account_id, group_id)
);

-- What the evaluations did (rules.Event), plus manual resets.
CREATE TABLE IF NOT EXISTS events (
    id          bigserial        PRIMARY KEY,
    created_at  timestamptz      NOT NULL DEFAULT now(),
    account_id  bigint           NOT NULL,
    group_id    bigint           NOT NULL,
    model       text             NOT NULL,
    kind        text             NOT NULL,
    reason      text             NOT NULL DEFAULT '',
    weight_from double precision NOT NULL DEFAULT 0,
    weight_to   double precision NOT NULL DEFAULT 0,
    rules       text[]           NOT NULL DEFAULT '{}',
    detail      jsonb            NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS events_created_at_idx ON events (created_at);
CREATE INDEX IF NOT EXISTS events_account_idx ON events (account_id, created_at);
