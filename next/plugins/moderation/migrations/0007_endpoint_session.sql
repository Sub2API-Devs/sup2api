-- plg_moderation 0007: moderation 0.4 (CONTRACTS §72.14): the client
-- endpoint (path pattern, e.g. /v1/messages) and the sticky-session
-- fingerprint of each record, from RequestMeta.endpoint and
-- session_fingerprint, so records can be filtered by endpoint and session
-- (new-api moderation_records.endpoint / session_fp). Idempotent; the columns
-- have defaults so older versions ignore them.

ALTER TABLE events ADD COLUMN IF NOT EXISTS endpoint   text NOT NULL DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS session_fp text NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS events_session_fp_idx ON events (session_fp, created_at) WHERE session_fp <> '';
