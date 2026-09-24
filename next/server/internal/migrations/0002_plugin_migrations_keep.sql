-- Uninstalling a plugin without purge keeps its plg_<key> schema, so its
-- migration records must survive too; otherwise a reinstall would re-run
-- 0001 against existing tables. Purge deletes the rows explicitly.
ALTER TABLE plugin_migrations DROP CONSTRAINT IF EXISTS plugin_migrations_plugin_key_fkey;
