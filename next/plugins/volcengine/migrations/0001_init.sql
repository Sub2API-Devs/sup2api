-- plg_volcengine 0001: the local index of the Ark asset library
-- (docs/PLUGIN-VOLCENGINE-ARK.md §4.5). Runs with search_path pinned to the
-- plugin schema.
--
-- CONSISTENCY MODEL: the Ark asset OpenAPI is the single source of truth.
-- These two tables are an index over it, kept for one reason only - listing
-- assets per account without a fan-out of upstream calls, each of which
-- would need a credential read that the core writes an audit row for
-- (CONTRACTS §26.6). Therefore:
--
--   * a row is only written after the upstream Action succeeded;
--   * upstream_id is the identity that matters, the local id is a handle for
--     the plugin's own routes and the console table's rowKey;
--   * index_status records what the last reconciliation saw: 'ok', or
--     'missing' when the upstream copy is gone (deleted in the Volcengine
--     console, or the account now points at a different asset endpoint).
--     A 'missing' row is never hidden - a silently disappearing row would
--     be indistinguishable from a bug - and DELETE removes it happily;
--   * assets or groups created directly in the Volcengine console are NOT
--     in this index. The live upstream listing routes exist for that.

CREATE TABLE asset_groups (
    id           bigserial   PRIMARY KEY,
    -- Account of this plugin's own account type the group lives on. There
    -- is no foreign key: accounts belong to the core, which the plugin
    -- role cannot read (no db.core_views grant). A row whose account was
    -- deleted keeps showing up with index_status 'missing'.
    account_id   bigint      NOT NULL,
    upstream_id  text        NOT NULL,
    name         text        NOT NULL DEFAULT '',
    title        text        NOT NULL DEFAULT '',
    description  text        NOT NULL DEFAULT '',
    group_type   text        NOT NULL DEFAULT 'AIGC',
    index_status text        NOT NULL DEFAULT 'ok' CHECK (index_status IN ('ok', 'missing')),
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),
    checked_at   timestamptz,
    UNIQUE (account_id, upstream_id)
);
CREATE INDEX asset_groups_account_idx ON asset_groups (account_id, id);

CREATE TABLE assets (
    id           bigserial   PRIMARY KEY,
    account_id   bigint      NOT NULL,
    -- The local group row. Deleting a group drops its assets from the index
    -- because upstream deletes the assets with it (DeleteAssetGroup is
    -- recursive upstream), so keeping them would be a lie.
    group_id     bigint      NOT NULL REFERENCES asset_groups (id) ON DELETE CASCADE,
    upstream_id  text        NOT NULL,
    name         text        NOT NULL DEFAULT '',
    asset_type   text        NOT NULL DEFAULT '',
    url          text        NOT NULL DEFAULT '',
    -- status is whatever Ark last reported for the asset (e.g. Processing,
    -- Succeeded, Failed): an upstream vocabulary, deliberately not
    -- constrained here so a new value does not break inserts.
    status       text        NOT NULL DEFAULT '',
    index_status text        NOT NULL DEFAULT 'ok' CHECK (index_status IN ('ok', 'missing')),
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),
    checked_at   timestamptz,
    UNIQUE (account_id, upstream_id)
);
CREATE INDEX assets_group_idx ON assets (group_id, id);
CREATE INDEX assets_account_idx ON assets (account_id, id);
