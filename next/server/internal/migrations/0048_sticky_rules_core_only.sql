-- Plugins take no part in sticky sessions (CONTRACTS §5.6): the rules are the
-- core's defaults of the built-in platforms and the administrator's own, and
-- the session value always comes from the request (body, header, API key,
-- user). Rules a plugin brought (source plugin_default) and rules reading the
-- value from a plugin go. plugin_key stays for nodes still running the
-- previous core during a rolling upgrade; it can only be NULL from now on.
DELETE FROM sticky_rules
WHERE source NOT IN ('builtin', 'admin')
   OR plugin_key IS NOT NULL
   OR key_sources @> '[{"type": "plugin"}]'::jsonb;

ALTER TABLE sticky_rules DROP CONSTRAINT IF EXISTS sticky_rules_core_only;
ALTER TABLE sticky_rules ADD CONSTRAINT sticky_rules_core_only CHECK (
    source IN ('builtin', 'admin')
    AND plugin_key IS NULL
    AND NOT key_sources @> '[{"type": "plugin"}]'::jsonb
);
