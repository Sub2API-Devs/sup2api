-- Plugin package bytes no longer live in PostgreSQL. A market version is
-- downloaded by each node from package_url; every other package is kept by
-- the primary node's shell and fetched from it over the node network.
ALTER TABLE plugin_versions DROP COLUMN package;
ALTER TABLE plugin_versions ADD COLUMN package_url text NOT NULL DEFAULT '';
