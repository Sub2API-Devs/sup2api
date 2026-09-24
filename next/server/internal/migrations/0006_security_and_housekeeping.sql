-- Client request id kept on usage records (recorded only; the gateway always
-- generates its own request id).
ALTER TABLE usage_logs ADD COLUMN client_request_id varchar(128) NOT NULL DEFAULT '';

-- Hosts each plugin has connected to through the egress tunnel. A host seen
-- for the first time raises plugin.egress_new_domain.
CREATE TABLE plugin_egress_domains (
    plugin_key     varchar(30)  NOT NULL,
    host           varchar(255) NOT NULL,
    first_seen_at  timestamptz  NOT NULL DEFAULT now(),
    last_seen_at   timestamptz  NOT NULL DEFAULT now(),
    connections    bigint       NOT NULL DEFAULT 0,
    PRIMARY KEY (plugin_key, host)
);

-- Egress log rows are written when a connection opens (result 'open') and
-- updated when it closes, so long-lived connections show up at once.
ALTER TABLE plugin_egress_logs ADD COLUMN closed_at timestamptz;
CREATE INDEX plugin_egress_logs_open_idx ON plugin_egress_logs (plugin_key) WHERE result = 'open';

-- Refresh token rotation families: presenting an already rotated token
-- revokes the whole family (token theft detection).
ALTER TABLE refresh_tokens
    ADD COLUMN family_id   varchar(64) NOT NULL DEFAULT '',
    ADD COLUMN replaced_at timestamptz;
UPDATE refresh_tokens SET family_id = token_hash WHERE family_id = '';
CREATE INDEX refresh_tokens_family_idx ON refresh_tokens (family_id);
