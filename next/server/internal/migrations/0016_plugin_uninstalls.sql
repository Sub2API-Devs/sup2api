-- A durable lifecycle barrier: an interrupted uninstall must remain disabled
-- until every process that could have served it acknowledged a real drain.
CREATE TABLE plugin_uninstalls (
    plugin_key varchar(30) PRIMARY KEY REFERENCES plugins(key) ON DELETE CASCADE,
    epoch bigint NOT NULL,
    target_boot_ids text[] NOT NULL DEFAULT '{}',
    stopped_boot_ids text[] NOT NULL DEFAULT '{}',
    requested_at timestamptz NOT NULL DEFAULT now()
);

-- Unlike Redis liveness, this record does not disappear during a partition.
-- A lost process needs an explicit stop acknowledgement before destructive
-- cleanup. Register under the plugin row lock before launching a process.
CREATE TABLE plugin_runtime_nodes (
    plugin_key varchar(30) NOT NULL REFERENCES plugins(key) ON DELETE CASCADE,
    boot_id text NOT NULL,
    stopped boolean NOT NULL DEFAULT false,
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY(plugin_key, boot_id)
);
