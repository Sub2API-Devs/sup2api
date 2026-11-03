-- River schema, migration line main, version 8 (job_id_autoincrement).
-- Generated from github.com/riverqueue/river/riverdriver/riverpgxv5@v0.49.0 008_job_id_autoincrement.up.sql
-- (sha256 0c3750a947d6494db07d56f5d3735a5e49a2cbfa1f7a09771227c31c8147bf70) with the schema template removed.
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
        EXECUTE 'SELECT EXISTS (SELECT 1 FROM river_migration WHERE version = 8)' INTO done;
    END IF;
    IF done THEN
        RETURN;
    END IF;
    EXECUTE $river_v008$
-- No-op. PostgreSQL sequences already prevent automatically generated job IDs
-- from being reused.
SELECT 1;
$river_v008$;
    EXECUTE 'INSERT INTO river_migration (line, version) VALUES (''main'', 8) ON CONFLICT DO NOTHING';
END
$river_guard$;
