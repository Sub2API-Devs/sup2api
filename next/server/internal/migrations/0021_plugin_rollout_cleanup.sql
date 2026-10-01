-- Terminal rollouts track, per boot that may still run an old instance, whether
-- that instance has stopped. Kept apart from plugin_rollout_nodes so the
-- per-node rollout outcome (active/failed) survives the cleanup barrier.
CREATE TABLE plugin_rollout_cleanup (
    rollout_id  bigint       NOT NULL REFERENCES plugin_rollouts(id) ON DELETE CASCADE,
    boot_id     varchar(64)  NOT NULL,
    state       varchar(20)  NOT NULL CHECK (state IN ('cleanup_pending','cleaned')),
    updated_at  timestamptz  NOT NULL DEFAULT now(),
    PRIMARY KEY (rollout_id, boot_id)
);
CREATE INDEX plugin_rollout_cleanup_pending ON plugin_rollout_cleanup (boot_id) WHERE state = 'cleanup_pending';

-- Development builds recorded the barrier in plugin_rollout_nodes; move it.
INSERT INTO plugin_rollout_cleanup (rollout_id, boot_id, state, updated_at)
SELECT rollout_id, boot_id, state, updated_at FROM plugin_rollout_nodes
WHERE state IN ('cleanup_pending','cleaned');
DELETE FROM plugin_rollout_nodes WHERE state IN ('cleanup_pending','cleaned');
