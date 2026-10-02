-- Plugin migration scripts are idempotent by contract (CONTRACTS §36): a
-- script whose content changed after it was applied runs again, and the
-- record then takes the new checksum. The definer function used under role
-- isolation therefore upserts; the identity check is unchanged.
CREATE OR REPLACE FUNCTION plugin_migration_record(p_key varchar, p_id varchar, p_checksum varchar)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF session_user <> 'plg_' || p_key THEN
        RAISE EXCEPTION 'role % may not record migrations of plugin %', session_user, p_key
            USING ERRCODE = '42501';
    END IF;
    INSERT INTO public.plugin_migrations (plugin_key, migration_id, checksum)
    VALUES (p_key, p_id, p_checksum)
    ON CONFLICT (plugin_key, migration_id) DO UPDATE SET checksum = EXCLUDED.checksum, applied_at = now();
END
$$;

REVOKE ALL ON FUNCTION plugin_migration_record(varchar, varchar, varchar) FROM PUBLIC;
