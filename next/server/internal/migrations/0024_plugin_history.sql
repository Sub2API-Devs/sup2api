-- No foreign keys: uninstalling a plugin must preserve its history.
CREATE TABLE IF NOT EXISTS plugin_history (
    id bigserial PRIMARY KEY,
    plugin_key varchar(30) NOT NULL,
    rollout_id bigint,
    node_id varchar(100) NOT NULL DEFAULT '',
    boot_id varchar(64) NOT NULL DEFAULT '',
    state varchar(20) NOT NULL,
    version varchar(50) NOT NULL DEFAULT '',
    message text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS plugin_history_key_id ON plugin_history(plugin_key, id DESC);
CREATE INDEX IF NOT EXISTS plugin_history_rollout_id ON plugin_history(rollout_id, id DESC);
CREATE INDEX IF NOT EXISTS plugin_history_created ON plugin_history(created_at);

-- Record transitions in the same transaction as the rollout, including
-- ownership changes. Lease renewals alone deliberately produce no history.
CREATE OR REPLACE FUNCTION record_plugin_rollout_history() RETURNS trigger AS $$
DECLARE event_state text;
BEGIN
    IF TG_OP = 'INSERT' THEN
        event_state := 'created';
    ELSIF NEW.phase IS DISTINCT FROM OLD.phase THEN
        event_state := NEW.phase;
    ELSIF NEW.coordinator_boot_id IS DISTINCT FROM OLD.coordinator_boot_id THEN
        event_state := 'takeover';
    ELSIF NEW.coordinator_lease_until <= clock_timestamp()
          AND OLD.coordinator_lease_until > NEW.coordinator_lease_until THEN
        event_state := 'handoff';
    ELSE
        RETURN NEW;
    END IF;
    INSERT INTO plugin_history(plugin_key, rollout_id, state, version, message)
    VALUES(NEW.plugin_key, NEW.id, event_state, COALESCE(NEW.target_version, ''),
        json_build_object('action', NEW.action, 'from', NEW.from_version,
            'to', NEW.target_version, 'phase', NEW.phase, 'actor', NEW.created_by,
            'coordinator', NEW.coordinator_node_id, 'error', NEW.error)::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS plugin_rollout_history ON plugin_rollouts;
CREATE TRIGGER plugin_rollout_history AFTER INSERT OR UPDATE ON plugin_rollouts
FOR EACH ROW EXECUTE FUNCTION record_plugin_rollout_history();
