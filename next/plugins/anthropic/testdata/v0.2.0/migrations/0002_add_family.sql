-- plg_anthropic 0002 (test version 0.2.0): add model family and backfill it.
-- Expand-only, so 0.1.0 keeps working while both versions run.

ALTER TABLE model_catalog ADD COLUMN family varchar(20);

UPDATE model_catalog SET family = CASE
        WHEN model_id LIKE 'claude-fable-%'  THEN 'fable'
        WHEN model_id LIKE 'claude-opus-%'   THEN 'opus'
        WHEN model_id LIKE 'claude-sonnet-%' THEN 'sonnet'
        WHEN model_id LIKE 'claude-haiku-%'  THEN 'haiku'
        ELSE 'other'
    END
WHERE family IS NULL;

CREATE INDEX model_catalog_family_idx ON model_catalog (family);
