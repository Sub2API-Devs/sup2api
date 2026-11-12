-- Group pricing (CONTRACTS §97, docs/DESIGN-2026-11-12-GROUP-PRICING.md).
--
-- A segment is a user group: every user belongs to exactly one. It decides
-- which private groups its members may use, at what rate, and at what model
-- prices. A personal segment (kind 'personal') is the segment of one user,
-- created when an administrator prices that user individually. "Segment"
-- because user_groups is the old per-user grant table and "tier" is a price
-- tier.
--
-- Everything here is additive: binaries from before this migration keep
-- working on the new schema (they read user_groups and
-- groups.rate_multiplier, both untouched), so an upgrade may be rolled back
-- without touching the database.

-- Fail fast when a lock is not to be had, rather than queue for it: whoever
-- reads users would queue behind this migration in turn.
SET LOCAL lock_timeout = '10s';

CREATE TABLE IF NOT EXISTS segments (
    id          bigserial PRIMARY KEY,
    kind        varchar(20)   NOT NULL DEFAULT 'named' CHECK (kind IN ('named', 'personal')),
    name        varchar(100)  NOT NULL DEFAULT '',  -- '' for a personal segment: the console shows its user
    description text          NOT NULL DEFAULT '',
    -- Multiplies the default rate of every group; 1 = none. A rate override
    -- of a group (segment_groups.rate_override) ignores it. Never 0: a free
    -- group is a rate override of 0.
    discount    numeric(10,4) NOT NULL DEFAULT 1 CHECK (discount > 0),
    is_default  boolean       NOT NULL DEFAULT false,  -- new users join it; it cannot be deleted
    user_id     bigint REFERENCES users(id) ON DELETE CASCADE,      -- personal: its only member
    origin_id   bigint REFERENCES segments(id) ON DELETE SET NULL,  -- personal: the segment the user came from
    created_at  timestamptz   NOT NULL DEFAULT now(),
    updated_at  timestamptz   NOT NULL DEFAULT now(),
    CONSTRAINT segments_personal_user CHECK ((kind = 'personal') = (user_id IS NOT NULL)),
    CONSTRAINT segments_default_named CHECK (NOT is_default OR kind = 'named')
);
CREATE UNIQUE INDEX IF NOT EXISTS segments_name_uq ON segments (lower(name)) WHERE kind = 'named';
CREATE UNIQUE INDEX IF NOT EXISTS segments_user_uq ON segments (user_id) WHERE kind = 'personal';
CREATE UNIQUE INDEX IF NOT EXISTS segments_default_uq ON segments (is_default) WHERE is_default;

INSERT INTO segments (kind, name, is_default)
SELECT 'named', '默认', true WHERE NOT EXISTS (SELECT 1 FROM segments WHERE is_default);

-- The default of users.segment_id: an INSERT that does not name the column
-- (an older binary, a plugin, a test) still puts the user in a segment.
CREATE OR REPLACE FUNCTION default_segment_id() RETURNS bigint
    LANGUAGE sql STABLE AS $$ SELECT id FROM segments WHERE is_default $$;

-- What a segment gets in a group: the grant (it only matters for a private
-- group) and its own rate (NULL = follow the group). A row with neither is
-- not kept.
CREATE TABLE IF NOT EXISTS segment_groups (
    segment_id    bigint  NOT NULL REFERENCES segments(id) ON DELETE CASCADE,
    group_id      bigint  NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    granted       boolean NOT NULL DEFAULT false,
    rate_override numeric(10,4) CHECK (rate_override >= 0),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (segment_id, group_id)
);
CREATE INDEX IF NOT EXISTS segment_groups_group_idx ON segment_groups (group_id);

-- A model price of a group (segment_id NULL) or of a segment in a group.
-- multiplier: the global price times it, following the global price.
-- custom: a price of its own in the mode of the global one; expression is
-- what expr.Generate makes of (mode, config), as model_prices keeps it.
CREATE TABLE IF NOT EXISTS price_rules (
    id         bigserial PRIMARY KEY,
    group_id   bigint       NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    segment_id bigint REFERENCES segments(id) ON DELETE CASCADE,
    model      varchar(200) NOT NULL,
    kind       varchar(20)  NOT NULL CHECK (kind IN ('multiplier', 'custom')),
    multiplier numeric(10,4) CHECK (multiplier >= 0),
    mode       varchar(20) CHECK (mode IN ('per_token', 'per_request')),
    config     jsonb,
    expression text         NOT NULL DEFAULT '',
    expr_hash  varchar(64)  NOT NULL DEFAULT '',
    updated_by bigint,
    updated_at timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT price_rules_kind CHECK (
        (kind = 'multiplier' AND multiplier IS NOT NULL AND mode IS NULL AND config IS NULL)
        OR (kind = 'custom' AND multiplier IS NULL AND mode IS NOT NULL AND config IS NOT NULL AND expression <> ''))
);
CREATE UNIQUE INDEX IF NOT EXISTS price_rules_group_uq ON price_rules (group_id, model) WHERE segment_id IS NULL;
-- Over every row, not only those of a segment (NULLs are distinct, so the
-- rules of the group itself are left to the index above): it is also the
-- index that finds the rules of a group.
CREATE UNIQUE INDEX IF NOT EXISTS price_rules_segment_uq ON price_rules (group_id, segment_id, model);
CREATE INDEX IF NOT EXISTS price_rules_segment_idx ON price_rules (segment_id) WHERE segment_id IS NOT NULL;

ALTER TABLE users ADD COLUMN IF NOT EXISTS segment_id bigint REFERENCES segments(id);

-- Backfill, once: only users without a segment are touched, so a re-run (or
-- a run after administrators moved users around) changes nothing.
--
-- A user who was granted private groups one by one (user_groups) becomes
-- personal and keeps exactly those grants; grants of public groups never
-- meant anything and are dropped. Everyone else joins the default segment.
-- With no discount, override or price rule yet, every user keeps the groups,
-- rates and prices they had.
INSERT INTO segments (kind, user_id, origin_id)
SELECT 'personal', u.id, default_segment_id()
FROM users u
WHERE u.segment_id IS NULL AND u.deleted_at IS NULL
  AND EXISTS (SELECT 1 FROM user_groups ug JOIN groups g ON g.id = ug.group_id
              WHERE ug.user_id = u.id AND g.visibility = 'restricted')
ON CONFLICT (user_id) WHERE kind = 'personal' DO NOTHING;

INSERT INTO segment_groups (segment_id, group_id, granted)
SELECT s.id, ug.group_id, true
FROM segments s
JOIN users u ON u.id = s.user_id AND u.segment_id IS NULL
JOIN user_groups ug ON ug.user_id = u.id
JOIN groups g ON g.id = ug.group_id AND g.visibility = 'restricted'
WHERE s.kind = 'personal'
ON CONFLICT (segment_id, group_id) DO NOTHING;

UPDATE users u
SET segment_id = COALESCE((SELECT s.id FROM segments s WHERE s.kind = 'personal' AND s.user_id = u.id), default_segment_id())
WHERE u.segment_id IS NULL;

-- After the backfill: built once, not kept up to date row by row.
CREATE INDEX IF NOT EXISTS users_segment_idx ON users (segment_id);

ALTER TABLE users ALTER COLUMN segment_id SET DEFAULT default_segment_id();
ALTER TABLE users ALTER COLUMN segment_id SET NOT NULL;
