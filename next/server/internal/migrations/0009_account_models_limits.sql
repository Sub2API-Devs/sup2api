-- Model list, model mapping, weight and rpm/tpm/tpd limits are core account
-- attributes (CONTRACTS §18). Plugins no longer provide model mapping.

ALTER TABLE accounts
    ADD COLUMN models        text[]  NOT NULL DEFAULT '{}',   -- empty = all models
    ADD COLUMN model_mapping jsonb   NOT NULL DEFAULT '{}',   -- {client model: upstream model}
    ADD COLUMN weight        int     NOT NULL DEFAULT 1,      -- within a priority
    ADD COLUMN rpm_limit     int     NOT NULL DEFAULT 0,      -- 0 = unlimited
    ADD COLUMN tpm_limit     bigint  NOT NULL DEFAULT 0,
    ADD COLUMN tpd_limit     bigint  NOT NULL DEFAULT 0,
    ADD COLUMN spm_limit     int     NOT NULL DEFAULT 0,      -- sessions per minute
    ADD CONSTRAINT accounts_weight_chk CHECK (weight BETWEEN 1 AND 1000),
    ADD CONSTRAINT accounts_limits_chk CHECK (rpm_limit >= 0 AND tpm_limit >= 0 AND tpd_limit >= 0 AND spm_limit >= 0);

-- Move plugin-side mappings (settings.model_mapping) to the core column.
-- Only complete model ids are kept; wildcard entries are dropped.
UPDATE accounts SET model_mapping = COALESCE((
        SELECT jsonb_object_agg(e.key, e.value)
        FROM jsonb_each_text(settings->'model_mapping') e
        WHERE e.key ~ '^[A-Za-z0-9._:/@+-]{1,200}$' AND e.value ~ '^[A-Za-z0-9._:/@+-]{1,200}$'
    ), '{}')
WHERE jsonb_typeof(settings->'model_mapping') = 'object';

UPDATE accounts SET settings = settings - 'model_mapping' WHERE settings ? 'model_mapping';
