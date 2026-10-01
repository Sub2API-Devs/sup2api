-- One scheduled run per slot, enforced by the database.
--
-- The job scheduler (internal/job) takes a Redis lock per slot and then
-- inserts the run with INSERT ... WHERE NOT EXISTS. The lock is not fenced
-- (it can lapse under a stalled node, or vanish with a Redis restart), and
-- NOT EXISTS alone is not atomic: two transactions can both see no row and
-- both insert. This unique index is the guard that holds when the lock does
-- not; the scheduler treats a violation as "another node has this slot".
--
-- Manual runs are not slots (scheduled_at is the time of the click) and stay
-- out of the index.
--
-- Rows that already break the rule are slots that ran more than once. The
-- first one (smallest id) is kept; the later duplicates are deleted from the
-- history, which is all this table is.

DELETE FROM plugin_job_runs r
 USING plugin_job_runs k
 WHERE NOT r.manual
   AND NOT k.manual
   AND r.plugin_key = k.plugin_key
   AND r.job_id = k.job_id
   AND r.scheduled_at = k.scheduled_at
   AND r.id > k.id;

CREATE UNIQUE INDEX plugin_job_runs_slot_uniq
    ON plugin_job_runs (plugin_key, job_id, scheduled_at)
 WHERE NOT manual;
