-- Model prices belong to the core and are set by administrators only
-- (CONTRACTS §17): typed in (source 'manual') or imported from a price sync
-- source (source 'sync'). Plugins no longer provide default prices.

CREATE TABLE price_sync_sources (
    id              bigserial    PRIMARY KEY,
    name            varchar(100) NOT NULL UNIQUE,
    kind            varchar(20)  NOT NULL CHECK (kind IN ('litellm', 'models_dev', 'sup2api')),
    url             text         NOT NULL,
    api_key_enc     bytea,                          -- sup2api: upstream API key (AES-GCM)
    options         jsonb        NOT NULL DEFAULT '{}',
    enabled         boolean      NOT NULL DEFAULT true,
    last_synced_at  timestamptz,
    last_error      text         NOT NULL DEFAULT '',
    created_at      timestamptz  NOT NULL DEFAULT now(),
    updated_at      timestamptz  NOT NULL DEFAULT now()
);

INSERT INTO price_sync_sources (name, kind, url, options) VALUES
    ('LiteLLM', 'litellm',
     'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json',
     '{"providers": ["anthropic", "openai", "gemini"]}'),
    ('models.dev', 'models_dev', 'https://models.dev/api.json',
     '{"providers": ["anthropic", "openai", "google"]}');

-- Plugin defaults go away; admin prices become manual prices.
DELETE FROM model_prices WHERE source <> 'admin';
DROP INDEX IF EXISTS model_prices_admin_uq;
DROP INDEX IF EXISTS model_prices_plugin_uq;
ALTER TABLE model_prices DROP COLUMN plugin_key;
UPDATE model_prices SET source = 'manual';
ALTER TABLE model_prices
    ADD COLUMN sync_source_id bigint REFERENCES price_sync_sources(id) ON DELETE SET NULL,
    ADD COLUMN synced_at      timestamptz,
    ADD CONSTRAINT model_prices_source_chk CHECK (source IN ('manual', 'sync'));
CREATE UNIQUE INDEX model_prices_model_uq ON model_prices (model);
