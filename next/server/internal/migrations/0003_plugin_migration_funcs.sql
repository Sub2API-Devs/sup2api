-- Plugin migrations run on a connection logged in as the plugin role
-- (plg_<key>), so they cannot RESET ROLE back to the host. These definer
-- functions are the only way that role can read and write its own rows in
-- plugin_migrations; the runtime grants EXECUTE to each plugin role.

CREATE FUNCTION plugin_migrations_applied(p_key varchar)
RETURNS TABLE (migration_id varchar, checksum varchar)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT m.migration_id, m.checksum
    FROM public.plugin_migrations m
    WHERE m.plugin_key = p_key AND session_user = 'plg_' || p_key
$$;

CREATE FUNCTION plugin_migration_record(p_key varchar, p_id varchar, p_checksum varchar)
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
    VALUES (p_key, p_id, p_checksum);
END
$$;

REVOKE ALL ON FUNCTION plugin_migrations_applied(varchar) FROM PUBLIC;
REVOKE ALL ON FUNCTION plugin_migration_record(varchar, varchar, varchar) FROM PUBLIC;
