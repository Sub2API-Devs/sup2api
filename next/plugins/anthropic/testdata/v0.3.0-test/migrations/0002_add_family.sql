-- plg_anthropic 0002 (test version 0.3.0-test): add model family and backfill it.
-- Expand-only, so 0.2.1 keeps working while both versions run.

ALTER TABLE model_catalog ADD COLUMN IF NOT EXISTS family varchar(20);

UPDATE model_catalog SET family = CASE
        WHEN model_id LIKE 'claude-fable-%'  THEN 'fable'
        WHEN model_id LIKE 'claude-opus-%'   THEN 'opus'
        WHEN model_id LIKE 'claude-sonnet-%' THEN 'sonnet'
        WHEN model_id LIKE 'claude-haiku-%'  THEN 'haiku'
        ELSE 'other'
    END
WHERE family IS NULL;

CREATE INDEX IF NOT EXISTS model_catalog_family_idx ON model_catalog (family);
