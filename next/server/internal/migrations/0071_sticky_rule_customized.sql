-- Sticky rules (CONTRACTS §5.6): a built-in rule an administrator edited
-- keeps its definition across core upgrades; the start-up sync of the
-- built-in defaults skips it until it is restored to the default. Old cores
-- ignore the column (and overwrite edited definitions as before).
ALTER TABLE sticky_rules ADD COLUMN IF NOT EXISTS customized boolean NOT NULL DEFAULT false;
