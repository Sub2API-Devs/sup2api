-- Attribute canonical usage records to the Worker/data plane that executed them.
-- Main-server requests keep the empty default and remain visible in the global view.
ALTER TABLE usage_logs
    ADD COLUMN IF NOT EXISTS data_plane_id VARCHAR(128) NOT NULL DEFAULT '';

-- Backfill records produced before canonical Worker attribution existed. The
-- legacy worker_logs.channel_id field contains the authoritative account ID.
UPDATE usage_logs AS ul
SET data_plane_id = w.remote_worker_id
FROM worker_logs AS wl
JOIN workers AS w ON w.id = wl.worker_id
WHERE ul.data_plane_id = ''
  AND ul.request_id = wl.request_id
  AND ul.account_id = wl.channel_id;

CREATE INDEX IF NOT EXISTS idx_usage_logs_data_plane_created
    ON usage_logs(data_plane_id, created_at DESC, id DESC)
    WHERE data_plane_id <> '';
