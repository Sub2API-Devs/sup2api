-- Prices are keyed by complete model ids (exact match); wildcards are no
-- longer supported. Rows written with a glob are dropped: plugin defaults are
-- rewritten from the manifest on the next install, upgrade or enable, admin
-- prices must be re-entered per model id.
DELETE FROM model_prices WHERE model_pattern !~ '^[A-Za-z0-9._:/@+-]{1,200}$';
ALTER TABLE model_prices RENAME COLUMN model_pattern TO model;
ALTER TABLE model_prices ADD CONSTRAINT model_prices_model_id_chk
    CHECK (model ~ '^[A-Za-z0-9._:/@+-]{1,200}$');
