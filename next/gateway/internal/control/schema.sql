-- The shell control schema is installed explicitly, independently of core migrations.
CREATE SCHEMA IF NOT EXISTS updater;
CREATE TABLE IF NOT EXISTS updater.clusters (
 cluster_id text PRIMARY KEY, primary_node text NOT NULL, baseline text NOT NULL,
 revision bigint NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS updater.releases (
 digest text PRIMARY KEY, release_id text NOT NULL UNIQUE, manifest jsonb NOT NULL,
 signed_manifest jsonb NOT NULL, bundle_base text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE updater.clusters ADD COLUMN IF NOT EXISTS update_repository text NOT NULL DEFAULT '';
ALTER TABLE updater.clusters ADD COLUMN IF NOT EXISTS update_source_revision bigint NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS updater.nodes (
 node_id text PRIMARY KEY, cluster_id text NOT NULL REFERENCES updater.clusters(cluster_id),
 peer_url text NOT NULL, shell_boot_id text NOT NULL, release_digest text NOT NULL DEFAULT '',
 core_boot_id text NOT NULL DEFAULT '', mode text NOT NULL DEFAULT 'maintenance',
 ready boolean NOT NULL DEFAULT false, last_seen timestamptz NOT NULL DEFAULT now(),
 error text NOT NULL DEFAULT '', os text NOT NULL, arch text NOT NULL, runtime_abi text NOT NULL,
 route_revision bigint NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS updater.upgrades (
 id text PRIMARY KEY, cluster_id text NOT NULL REFERENCES updater.clusters(cluster_id),
 release_digest text NOT NULL REFERENCES updater.releases(digest), nodes jsonb NOT NULL,
 status text NOT NULL DEFAULT 'running', cursor integer NOT NULL DEFAULT 0,
 error text NOT NULL DEFAULT '', actor text NOT NULL, idempotency_key text NOT NULL,
 request_hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(cluster_id,idempotency_key)
);
CREATE UNIQUE INDEX IF NOT EXISTS updater_one_active_upgrade ON updater.upgrades(cluster_id)
 WHERE status IN ('running','paused');
CREATE TABLE IF NOT EXISTS updater.steps (
 upgrade_id text NOT NULL REFERENCES updater.upgrades(id), step_id integer NOT NULL,
 node_id text NOT NULL, action text NOT NULL, target_digest text NOT NULL,
 peer_node text NOT NULL DEFAULT '', status text NOT NULL DEFAULT 'pending',
 result jsonb NOT NULL DEFAULT '{}', error text NOT NULL DEFAULT '', updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(upgrade_id,step_id)
);
CREATE TABLE IF NOT EXISTS updater.node_admissions (
 node_id text PRIMARY KEY, cluster_id text NOT NULL, core_boot_id text NOT NULL,
 release_digest text NOT NULL, revision bigint NOT NULL,
 serve_http boolean NOT NULL DEFAULT false, claim_background boolean NOT NULL DEFAULT false,
 coordinate_plugins boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS updater.events (
 id bigserial PRIMARY KEY, upgrade_id text NOT NULL REFERENCES updater.upgrades(id),
 kind text NOT NULL, message text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
-- Additive shell-schema evolution. Existing plans retain their old strategy.
ALTER TABLE updater.upgrades ADD COLUMN IF NOT EXISTS strategy text NOT NULL DEFAULT 'legacy-rolling';
ALTER TABLE updater.upgrades ADD COLUMN IF NOT EXISTS source_digest text NOT NULL DEFAULT '';
ALTER TABLE updater.nodes ADD COLUMN IF NOT EXISTS stopped boolean NOT NULL DEFAULT false;
ALTER TABLE updater.nodes ADD COLUMN IF NOT EXISTS enabled boolean NOT NULL DEFAULT true;
ALTER TABLE updater.nodes ADD COLUMN IF NOT EXISTS peer_protocol integer NOT NULL DEFAULT 0;
ALTER TABLE updater.nodes ADD COLUMN IF NOT EXISTS strategy text NOT NULL DEFAULT '';
ALTER TABLE updater.nodes ADD COLUMN IF NOT EXISTS joining_plan text NOT NULL DEFAULT '';
-- A boot-scoped capability marker permits rolling shell upgrades and downgrades.
ALTER TABLE updater.nodes ADD COLUMN IF NOT EXISTS telemetry_boot_id text NOT NULL DEFAULT '';
CREATE TABLE IF NOT EXISTS updater.stop_confirmations (
 cluster_id text NOT NULL, node_id text NOT NULL, shell_boot_id text NOT NULL,
 upgrade_id text NOT NULL REFERENCES updater.upgrades(id), step_id integer,
 core_boot_id text NOT NULL DEFAULT '', confirmed_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(cluster_id,node_id,upgrade_id)
);
-- CPU offload (2026-10-02): the cluster setting, and each node's measured load.
-- A NULL cpu_percent is an unmeasured node or an older shell; neither takes
-- offloaded traffic.
ALTER TABLE updater.clusters ADD COLUMN IF NOT EXISTS offload_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE updater.clusters ADD COLUMN IF NOT EXISTS offload_cpu_percent integer NOT NULL DEFAULT 80;
ALTER TABLE updater.nodes ADD COLUMN IF NOT EXISTS cpu_percent real;
ALTER TABLE updater.nodes ADD COLUMN IF NOT EXISTS offloading boolean NOT NULL DEFAULT false;
