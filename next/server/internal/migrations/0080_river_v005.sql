-- River schema, migration line main, version 5 (migration_unique_client).
-- Generated from github.com/riverqueue/river/riverdriver/riverpgxv5@v0.49.0 005_migration_unique_client.up.sql
-- (sha256 b760f487152c7d92102869d46b8a64dc1e2094d5675e690ffbe52a747eee8431) with the schema template removed.
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
        EXECUTE 'SELECT EXISTS (SELECT 1 FROM river_migration WHERE version = 5)' INTO done;
    END IF;
    IF done THEN
        RETURN;
    END IF;
    EXECUTE $river_v005$
--
-- Rebuild the migration table so it's based on `(line, version)`.
--

DO
$body$
BEGIN
    -- Tolerate users who may be using their own migration system rather than
    -- River's. If they are, they will have skipped version 001 containing
    -- `CREATE TABLE river_migration`, so this table won't exist.
    IF (SELECT to_regclass('river_migration') IS NOT NULL) THEN
        ALTER TABLE river_migration
            RENAME TO river_migration_old;

        CREATE TABLE river_migration(
            line TEXT NOT NULL,
            version bigint NOT NULL,
            created_at timestamptz NOT NULL DEFAULT NOW(),
            CONSTRAINT line_length CHECK (char_length(line) > 0 AND char_length(line) < 128),
            CONSTRAINT version_gte_1 CHECK (version >= 1),
            PRIMARY KEY (line, version)
        );

        INSERT INTO river_migration
            (created_at, line, version)
        SELECT created_at, 'main', version
        FROM river_migration_old;

        DROP TABLE river_migration_old;
    END IF;
END;
$body$
LANGUAGE 'plpgsql'; 

--
-- Add `river_job.unique_key` and bring up an index on it.
--

-- These statements use `IF NOT EXISTS` to allow users with a `river_job` table
-- of non-trivial size to build the index `CONCURRENTLY` out of band of this
-- migration, then follow by completing the migration.
ALTER TABLE river_job
    ADD COLUMN IF NOT EXISTS unique_key bytea;

CREATE UNIQUE INDEX IF NOT EXISTS river_job_kind_unique_key_idx ON river_job (kind, unique_key) WHERE unique_key IS NOT NULL;

--
-- Create `river_client` and derivative.
--
-- This feature hasn't quite yet been implemented, but we're taking advantage of
-- the migration to add the schema early so that we can add it later without an
-- additional migration.
--

CREATE UNLOGGED TABLE river_client (
    id text PRIMARY KEY NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    metadata jsonb NOT NULL DEFAULT '{}',
    paused_at timestamptz,
    updated_at timestamptz NOT NULL,
    CONSTRAINT name_length CHECK (char_length(id) > 0 AND char_length(id) < 128)
);

-- Differs from `river_queue` in that it tracks the queue state for a particular
-- active client.
CREATE UNLOGGED TABLE river_client_queue (
    river_client_id text NOT NULL REFERENCES river_client (id) ON DELETE CASCADE,
    name text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    max_workers bigint NOT NULL DEFAULT 0,
    metadata jsonb NOT NULL DEFAULT '{}',
    num_jobs_completed bigint NOT NULL DEFAULT 0,
    num_jobs_running bigint NOT NULL DEFAULT 0,
    updated_at timestamptz NOT NULL,
    PRIMARY KEY (river_client_id, name),
    CONSTRAINT name_length CHECK (char_length(name) > 0 AND char_length(name) < 128),
    CONSTRAINT num_jobs_completed_zero_or_positive CHECK (num_jobs_completed >= 0),
    CONSTRAINT num_jobs_running_zero_or_positive CHECK (num_jobs_running >= 0)
);
$river_v005$;
    EXECUTE 'INSERT INTO river_migration (line, version) VALUES (''main'', 5) ON CONFLICT DO NOTHING';
END
$river_guard$;
