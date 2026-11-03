-- River schema, migration line main, version 6 (bulk_unique).
-- Generated from github.com/riverqueue/river/riverdriver/riverpgxv5@v0.49.0 006_bulk_unique.up.sql
-- (sha256 3b133f7ce4662d3dc8bd4a57628e0e116a300b2635a79315557aa1369849f0fb) with the schema template removed.
-- Do not edit: TestRiverMigrationsMatchModule compares this file with the
-- module (TASK-FRAMEWORK-DESIGN §9.1). To upgrade River, add the new versions as
-- new core migrations first, then raise the dependency.
--
-- River's SQL is not written to run twice, and core migrations from
-- FirstIdempotentMigration on must be, so it runs only while the version row
-- rivermigrate reads is missing, and records that row.
DO $river_guard$
DECLARE
    done boolean := false;
BEGIN
    IF to_regclass('river_migration') IS NOT NULL THEN
        EXECUTE 'SELECT EXISTS (SELECT 1 FROM river_migration WHERE version = 6)' INTO done;
    END IF;
    IF done THEN
        RETURN;
    END IF;
    EXECUTE $river_v006$
CREATE OR REPLACE FUNCTION river_job_state_in_bitmask(bitmask BIT(8), state river_job_state)
RETURNS boolean
LANGUAGE SQL
IMMUTABLE
AS $$
    SELECT CASE state
        WHEN 'available' THEN get_bit(bitmask, 7)
        WHEN 'cancelled' THEN get_bit(bitmask, 6)
        WHEN 'completed' THEN get_bit(bitmask, 5)
        WHEN 'discarded' THEN get_bit(bitmask, 4)
        WHEN 'pending'   THEN get_bit(bitmask, 3)
        WHEN 'retryable' THEN get_bit(bitmask, 2)
        WHEN 'running'   THEN get_bit(bitmask, 1)
        WHEN 'scheduled' THEN get_bit(bitmask, 0)
        ELSE 0
    END = 1;
$$;

--
-- Add `river_job.unique_states` and bring up an index on it.
--
-- This column may exist already if users manually created the column and index
-- as instructed in the changelog so the index could be created `CONCURRENTLY`.
--
ALTER TABLE river_job ADD COLUMN IF NOT EXISTS unique_states BIT(8);

-- This statement uses `IF NOT EXISTS` to allow users with a `river_job` table
-- of non-trivial size to build the index `CONCURRENTLY` out of band of this
-- migration, then follow by completing the migration.
CREATE UNIQUE INDEX IF NOT EXISTS river_job_unique_idx ON river_job (unique_key)
    WHERE unique_key IS NOT NULL
      AND unique_states IS NOT NULL
      AND river_job_state_in_bitmask(unique_states, state);

-- Remove the old unique index. Users who are actively using the unique jobs
-- feature and who wish to avoid deploy downtime may want od drop this in a
-- subsequent migration once all jobs using the old unique system have been
-- completed (i.e. no more rows with non-null unique_key and null
-- unique_states).
DROP INDEX river_job_kind_unique_key_idx;
$river_v006$;
    EXECUTE 'INSERT INTO river_migration (line, version) VALUES (''main'', 6) ON CONFLICT DO NOTHING';
END
$river_guard$;
