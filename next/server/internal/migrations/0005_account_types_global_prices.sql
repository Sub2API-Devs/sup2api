-- Platforms, account types and endpoints are many-to-many (ARCHITECTURE 6.6)
-- and prices are global per model (ARCHITECTURE 7.3).

-- Accounts are identified by their account type (plugin_key, type); the
-- endpoints they serve follow from the protocols the type declares.
DROP INDEX IF EXISTS accounts_platform_idx;
ALTER TABLE accounts DROP COLUMN platform;
CREATE INDEX accounts_type_idx ON accounts (plugin_key, type, status) WHERE deleted_at IS NULL;

-- Prices no longer depend on the platform: one admin price per model
-- pattern, and one default per (plugin, model pattern).
ALTER TABLE model_prices DROP CONSTRAINT IF EXISTS model_prices_platform_model_pattern_source_key;
ALTER TABLE model_prices DROP COLUMN platform;
CREATE UNIQUE INDEX model_prices_admin_uq ON model_prices (model_pattern) WHERE source = 'admin';
CREATE UNIQUE INDEX model_prices_plugin_uq ON model_prices (plugin_key, model_pattern) WHERE source = 'plugin_default';

-- Usage records keep the account type and the protocol sent upstream
-- (differs from protocol when the core converted the request).
ALTER TABLE usage_logs
    ADD COLUMN account_type      varchar(50)  NOT NULL DEFAULT '',
    ADD COLUMN upstream_protocol varchar(100) NOT NULL DEFAULT '';
