-- River schema, migration line main, version 3 (river_job_tags_non_null).
-- Generated from github.com/riverqueue/river/riverdriver/riverpgxv5@v0.49.0 003_river_job_tags_non_null.up.sql
-- (sha256 dedb183bb302c005bc72caf2901ff693bbab11413308c5e0567ddffb51e667ef) with the schema template removed.
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
        EXECUTE 'SELECT EXISTS (SELECT 1 FROM river_migration WHERE version = 3)' INTO done;
    END IF;
    IF done THEN
        RETURN;
    END IF;
    EXECUTE $river_v003$
ALTER TABLE river_job ALTER COLUMN tags SET DEFAULT '{}';
UPDATE river_job SET tags = '{}' WHERE tags IS NULL;
ALTER TABLE river_job ALTER COLUMN tags SET NOT NULL;
$river_v003$;
    EXECUTE 'INSERT INTO river_migration (version) VALUES (3) ON CONFLICT DO NOTHING';
END
$river_guard$;
