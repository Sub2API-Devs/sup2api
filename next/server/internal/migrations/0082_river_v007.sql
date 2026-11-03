-- River schema, migration line main, version 7 (notification_outbox_sqlite_jsonb_and_sql_cleanup).
-- Generated from github.com/riverqueue/river/riverdriver/riverpgxv5@v0.49.0 007_notification_outbox_sqlite_jsonb_and_sql_cleanup.up.sql
-- (sha256 47ec8031b88e69004de2def5bc3109d969f71ee4c33a1e7dac2fb8c9dd19182d) with the schema template removed.
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
        EXECUTE 'SELECT EXISTS (SELECT 1 FROM river_migration WHERE version = 7)' INTO done;
    END IF;
    IF done THEN
        RETURN;
    END IF;
    EXECUTE $river_v007$
--
-- Notification outbox.
--

CREATE TABLE river_notification (
    id bigserial PRIMARY KEY,
    created_at timestamptz NOT NULL DEFAULT now(),
    payload text NOT NULL,
    topic text NOT NULL,
    CONSTRAINT topic_length CHECK (length(topic) > 0 AND length(topic) < 128)
);

CREATE INDEX river_notification_created_at_idx ON river_notification (created_at);
CREATE INDEX river_notification_topic_id_idx ON river_notification (topic, id);

--
-- SQLite JSONB conversion.
--
-- No-op. PostgreSQL already stores River JSON columns as jsonb.

--
-- SQL cleanup.
--

--
-- Drop unused tables `river_client` and `river_client_queue`.
--

DROP TABLE river_client_queue;
DROP TABLE river_client;

--
-- Adds `DEFAULT 25` to `river_job.max_attempts`.
--

ALTER TABLE river_job
    ALTER COLUMN max_attempts SET DEFAULT 25;

--
-- Changes `river_queue.updated_at` to have a default of `CURRENT_TIMESTAMP`.
--

ALTER TABLE river_queue
    ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;
$river_v007$;
    EXECUTE 'INSERT INTO river_migration (line, version) VALUES (''main'', 7) ON CONFLICT DO NOTHING';
END
$river_guard$;
