-- Scheduled task framework (TASK-FRAMEWORK-DESIGN §8, §9.2).
--
-- scheduled_tasks is the registry of the cluster tasks (run once per cluster
-- through River) and holds the latest run of each: a core node upserts its
-- tasks at start without touching the run columns. lease_* keeps two runs of
-- one task from overlapping across slots: the worker takes the lease with a
-- conditional UPDATE and clears it when the run ends; a lease of a dead node
-- expires after the task's timeout. The run history itself is river_job
-- (kind sup2api.task), searched by task name through river_job_task_name_idx.
--
-- plugin_job_runs.scope is for the plugin tasks of the second stage (node or
-- cluster); added now so that stage needs no schema change.
--
-- Only a new table, an index and a column with a default: an older core
-- ignores all of them.
CREATE TABLE IF NOT EXISTS scheduled_tasks (
  name                  text PRIMARY KEY,
  source                text NOT NULL,
  plugin_key            text,
  schedule              text NOT NULL DEFAULT '',
  timeout_ms            integer NOT NULL,
  max_attempts          integer NOT NULL DEFAULT 0,
  args                  jsonb,
  enabled               boolean NOT NULL DEFAULT true,
  seen_version          text NOT NULL DEFAULT '',
  seen_at               timestamptz NOT NULL DEFAULT now(),
  lease_job_id          bigint,
  lease_node            text,
  lease_until           timestamptz,
  last_job_id           bigint,
  last_node             text,
  last_started_at       timestamptz,
  last_finished_at      timestamptz,
  last_status           text,
  last_count            integer,
  last_message          text,
  last_error            text,
  last_success_at       timestamptz,
  consecutive_failures  integer NOT NULL DEFAULT 0,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT scheduled_tasks_source_check CHECK (source IN ('core', 'plugin_manifest', 'plugin_runtime')),
  CONSTRAINT scheduled_tasks_status_check CHECK (last_status IS NULL OR last_status IN ('succeeded', 'failed', 'timeout', 'skipped'))
);

CREATE INDEX IF NOT EXISTS scheduled_tasks_plugin_idx ON scheduled_tasks (plugin_key) WHERE plugin_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS river_job_task_name_idx
  ON river_job ((args->>'name'), id DESC) WHERE kind = 'sup2api.task';

ALTER TABLE plugin_job_runs ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'cluster';
