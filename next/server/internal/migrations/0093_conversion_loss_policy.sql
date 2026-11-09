-- Protocol conversion matrix (CONTRACTS §88, docs/CONVERT-MATRIX.md §6.1, §7).
-- conversion_loss_policy: what a converted request may lose before the
-- account refuses it; NULL inherits (account -> group -> allow).
-- usage_logs.conversion: how the request was converted, NULL when native
-- and nothing was refused. Nullable columns without defaults: no rewrite.
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS conversion_loss_policy varchar(10)
  CHECK (conversion_loss_policy IN ('allow', 'safe', 'strict'));
ALTER TABLE groups ADD COLUMN IF NOT EXISTS conversion_loss_policy varchar(10)
  CHECK (conversion_loss_policy IN ('allow', 'safe', 'strict'));
ALTER TABLE usage_logs ADD COLUMN IF NOT EXISTS conversion jsonb;
