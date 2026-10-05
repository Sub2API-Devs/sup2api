-- plg_volcengine 0002: the video task ledger for Seedance (Ark video, stage
-- five, docs/PLUGIN-VOLCENGINE-ARK.md §5). Runs with search_path pinned to
-- the plugin schema.
--
-- WHY THIS TABLE EXISTS. The two video endpoints lean on the A/B/C/D core
-- extensions (CONTRACTS §25), and two of them need a fact the request itself
-- does not carry:
--
--   * the query endpoint GET /api/v3/contents/generations/tasks/:task_id has
--     NO model in the request, so ResolveModel looks the task_id up here to
--     tell the core which model to price and limit the poll against (it is a
--     free endpoint, but the core still needs a model for the group
--     allowlist);
--   * the submit endpoint writes a row here from ExtractUsage, keyed by the
--     upstream task id, so the account/model/user that started the task are
--     known when it is later reconciled or polled.
--
-- CONSISTENCY MODEL. Upstream (Ark) is the source of truth for a task's
-- STATE; this row is a local pointer from a task id to the account/model/user
-- that created it. state is a coarse mirror of the last thing reconciliation
-- saw ('running' | 'done' | 'failed'), kept only for the console/debugging -
-- money is settled by the core's reconcile loop against usage_logs, never
-- from this column. A row is written the moment a submit succeeds and is
-- never deleted here: a task id an operator sees in a usage record must
-- resolve to a model for the lifetime of that record.

CREATE TABLE IF NOT EXISTS video_tasks (
    -- The upstream task id returned by POST .../generations/tasks. It is the
    -- primary key, which is exactly the index ResolveModel needs: that call
    -- is on the hot path (every client poll hits it) and does one lookup by
    -- this id.
    task_id     text        PRIMARY KEY,
    -- Account of this plugin's own account type that created the task. No
    -- foreign key: accounts live in the core, which the plugin role cannot
    -- read. A row whose account was deleted still resolves its model.
    account_id  bigint      NOT NULL,
    -- The model the submit request billed as, returned verbatim by
    -- ResolveModel so the poll prices and limits against the same model.
    model       text        NOT NULL DEFAULT '',
    -- The user who submitted the task, for the console view. Not used for
    -- attribution (the core owns that on usage_logs).
    user_id     bigint      NOT NULL DEFAULT 0,
    -- Coarse mirror of the last reconciliation result. Deliberately not
    -- CHECK-constrained: a new upstream status must not break an insert.
    state       text        NOT NULL DEFAULT 'running',
    -- The output-token estimate this task was pre-charged with. It is kept
    -- for ONE case, and that case is a money case: Ark reports a task as
    -- succeeded but carries no usage numbers. Settling such a task on the
    -- zero we could read would refund the whole reservation and hand out the
    -- video for free, so the estimate is settled instead - the work really
    -- was done, and the estimate is the only measure of it anyone has.
    est_tokens  bigint      NOT NULL DEFAULT 0,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);
