-- plg_moderation 0012: moderation 0.10.0 (CONTRACTS §72.5, §72.8).
-- Expand only and idempotent: 0.9.x nodes run on the same tables during a
-- rolling upgrade, and every 0.9.x statement on watchlist and events names
-- its columns, so they ignore these (a 0.9.x insert leaves locked false and
-- the record columns NULL).

-- The ALTERs take an ACCESS EXCLUSIVE lock (each is metadata only: no
-- rewrite). Fail fast rather than queue behind a long query on events: the
-- gateway's inserts would queue behind this migration in turn. The plugin
-- migrator runs each file in its own transaction (store.Migrate), so SET
-- LOCAL ends with it; a timeout rolls the file back, fails the rollout with
-- the active version still serving, and a retry runs the file again.
SET LOCAL lock_timeout = '10s';

-- The users of allowlist_user_ids / blocklist_user_ids, mirrored as locked
-- entries (locks.go). Which list locks an entry is read from the settings.
ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS locked boolean NOT NULL DEFAULT false;

-- The handling of a record (decideHandling): level observe | enforce and
-- what decided it, blocklist | allowlist | watch | default. NULL = written
-- before 0.10.0 or by a 0.9.x node.
ALTER TABLE events ADD COLUMN IF NOT EXISTS level        text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS level_source text;
