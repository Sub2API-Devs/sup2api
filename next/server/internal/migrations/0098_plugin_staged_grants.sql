-- Staged plugin grants (CONTRACTS §5.7): the host permission decisions of a
-- consent to a version that is not active yet, while another version runs.
-- plugin_permission_grants holds one row per (plugin, permission) and is
-- what the running version is granted, so a consent to the next version
-- written there reached the running one at once (its next start, a
-- refresh) and stayed when the upgrade failed. A staged set is complete
-- (every host permission the version asks for, granted or denied), reaches
-- only instances of its own version, moves into plugin_permission_grants
-- when the version is activated (the rollout commit) and is withdrawn when
-- its upgrade fails or is cancelled. A new table, nothing rewritten: an
-- older core ignores it. Reversed by deploy/rollback/0.1.286-authz-down.sql.

SET LOCAL lock_timeout = '10s';

CREATE TABLE IF NOT EXISTS plugin_staged_grants (
    plugin_key      varchar(30)  NOT NULL,
    version         varchar(50)  NOT NULL,
    permission      varchar(100) NOT NULL,
    scope           jsonb        NOT NULL DEFAULT '{}',
    status          varchar(20)  NOT NULL,                 -- granted | denied | revoked
    manifest_hash   varchar(64)  NOT NULL,
    granted_by      bigint       REFERENCES users(id),
    granted_at      timestamptz  NOT NULL DEFAULT now(),
    PRIMARY KEY (plugin_key, version, permission),
    FOREIGN KEY (plugin_key, version) REFERENCES plugin_versions(plugin_key, version) ON DELETE CASCADE
);
