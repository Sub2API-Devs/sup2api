-- plg_anthropic 0001: model catalog.
-- Runs with search_path pinned to the plugin schema (plg_anthropic).

CREATE TABLE model_catalog (
    id                bigserial    PRIMARY KEY,
    model_id          varchar(100) NOT NULL UNIQUE,
    display_name      varchar(200) NOT NULL,
    context_window    integer      NOT NULL,
    max_output_tokens integer      NOT NULL,
    status            varchar(20)  NOT NULL DEFAULT 'active',  -- active | legacy
    sort_order        integer      NOT NULL DEFAULT 0,
    created_at        timestamptz  NOT NULL DEFAULT now(),
    updated_at        timestamptz  NOT NULL DEFAULT now()
);

INSERT INTO model_catalog (model_id, display_name, context_window, max_output_tokens, status, sort_order) VALUES
    ('claude-fable-5-1',  'Claude Fable 5.1',  1000000, 128000, 'active', 10),
    ('claude-fable-5',    'Claude Fable 5',    1000000, 128000, 'active', 20),
    ('claude-opus-5-5',   'Claude Opus 5.5',   1000000, 128000, 'active', 30),
    ('claude-opus-5',     'Claude Opus 5',     1000000, 128000, 'active', 40),
    ('claude-opus-4-8',   'Claude Opus 4.8',   1000000, 128000, 'active', 50),
    ('claude-opus-4-7',   'Claude Opus 4.7',   1000000, 128000, 'active', 60),
    ('claude-opus-4-6',   'Claude Opus 4.6',   1000000, 128000, 'active', 70),
    ('claude-sonnet-5',   'Claude Sonnet 5',   1000000, 128000, 'active', 80),
    ('claude-sonnet-4-6', 'Claude Sonnet 4.6', 1000000, 128000, 'active', 90),
    ('claude-haiku-4-5',  'Claude Haiku 4.5',   200000,  64000, 'active', 100);
