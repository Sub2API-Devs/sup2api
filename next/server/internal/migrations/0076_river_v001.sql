-- River schema, migration line main, version 1 (create_river_migration).
-- Generated from github.com/riverqueue/river/riverdriver/riverpgxv5@v0.49.0 001_create_river_migration.up.sql
-- (sha256 79def9ab1643beee7776c499559ec199a03b5b26036c122dc3ba13ec3d078dc0) with the schema template removed.
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
        EXECUTE 'SELECT EXISTS (SELECT 1 FROM river_migration WHERE version = 1)' INTO done;
    END IF;
    IF done THEN
        RETURN;
    END IF;
    EXECUTE $river_v001$
CREATE TABLE river_migration(
  id bigserial PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  version bigint NOT NULL,
  CONSTRAINT version CHECK (version >= 1)
);

CREATE UNIQUE INDEX ON river_migration USING btree(version);
$river_v001$;
    EXECUTE 'INSERT INTO river_migration (version) VALUES (1) ON CONFLICT DO NOTHING';
END
$river_guard$;
