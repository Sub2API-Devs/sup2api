CREATE SEQUENCE IF NOT EXISTS account_quota_generation_seq;

ALTER TABLE account_quota_snapshots
    ADD COLUMN IF NOT EXISTS revision bigint NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS generation bigint NOT NULL DEFAULT nextval('account_quota_generation_seq'),
    ADD COLUMN IF NOT EXISTS plugin_revision text NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS auto_refresh boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS next_check_at timestamptz,
    ADD COLUMN IF NOT EXISTS refresh_status text NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS failures integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS lease_token bigint NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS lease_until timestamptz;

UPDATE account_quota_snapshots SET revision=1, refresh_status=CASE WHEN error<>'' THEN 'error' WHEN updated_at IS NOT NULL THEN 'ready' ELSE 'pending' END WHERE revision=0;
CREATE INDEX IF NOT EXISTS account_quota_due_idx ON account_quota_snapshots(next_check_at,account_id) WHERE auto_refresh;

CREATE OR REPLACE FUNCTION invalidate_account_quota_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF (NEW.credentials_enc,NEW.settings,NEW.proxy_id,NEW.plugin_key,NEW.type) IS DISTINCT FROM
       (OLD.credentials_enc,OLD.settings,OLD.proxy_id,OLD.plugin_key,OLD.type) THEN
        UPDATE account_quota_snapshots SET windows='{}',source='',error='',updated_at=NULL,last_passive_at=NULL,
            generation=nextval('account_quota_generation_seq'),revision=revision+1,lease_until=NULL,
            next_check_at=CASE WHEN auto_refresh THEN now() END,refresh_status='pending',failures=0
        WHERE account_id=NEW.id;
    ELSIF (NEW.status,NEW.schedulable,NEW.deleted_at) IS DISTINCT FROM (OLD.status,OLD.schedulable,OLD.deleted_at) THEN
        UPDATE account_quota_snapshots SET generation=nextval('account_quota_generation_seq'),lease_until=NULL
        WHERE account_id=NEW.id;
    END IF;
    RETURN NEW;
END;
$$;
CREATE OR REPLACE TRIGGER account_quota_identity AFTER UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION invalidate_account_quota_identity();

CREATE OR REPLACE FUNCTION invalidate_plugin_quota_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF (NEW.status,NEW.active_version) IS DISTINCT FROM (OLD.status,OLD.active_version) THEN
        UPDATE account_quota_snapshots q SET generation=nextval('account_quota_generation_seq'),lease_until=NULL,
            next_check_at=CASE WHEN q.auto_refresh THEN now() END
        FROM accounts a WHERE a.id=q.account_id AND a.plugin_key=NEW.key;
    END IF;
    RETURN NEW;
END;
$$;
CREATE OR REPLACE TRIGGER account_quota_plugin_revision AFTER UPDATE ON plugins FOR EACH ROW EXECUTE FUNCTION invalidate_plugin_quota_revision();
