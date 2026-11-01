-- API keys and plugin history outlive their group (sub2api parity).
--
-- Deleting a group used to be refused while any API key still pointed at it,
-- and the provider_* history tables (resources, contexts, fallback credits,
-- diagnostics, helper history) referenced groups without ON DELETE, so a
-- group that had served plugin traffic could not be deleted at all. A key is
-- now only loosely bound to its group: deleting the group moves its keys to
-- another group or leaves them unbound (group_id NULL). An unbound key is
-- kept and answers 403 group_deleted until its owner picks a new group, in
-- place of failing later as if the group had no accounts.
--
-- The history rows keep their group_id as a plain owner-scope value; nothing
-- joins them to groups.
ALTER TABLE api_keys ALTER COLUMN group_id DROP NOT NULL;
ALTER TABLE api_keys DROP CONSTRAINT IF EXISTS api_keys_group_id_fkey;
ALTER TABLE api_keys ADD CONSTRAINT api_keys_group_id_fkey
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL;

DO $$
DECLARE r record;
BEGIN
    FOR r IN
        SELECT c.conrelid::regclass AS tbl, c.conname
        FROM pg_constraint c
        WHERE c.contype = 'f'
          AND c.confrelid = 'groups'::regclass
          AND c.conrelid IN (
              'provider_resources'::regclass,
              'provider_resource_contexts'::regclass,
              'provider_fallback_credits'::regclass,
              'provider_diagnostic_messages'::regclass,
              'provider_helper_attempts'::regclass,
              'provider_helper_records'::regclass)
    LOOP
        EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.conname);
    END LOOP;
END $$;
