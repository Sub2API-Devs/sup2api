ALTER TABLE async_tasks ADD COLUMN poll_failures integer NOT NULL DEFAULT 0 CHECK (poll_failures >= 0);
ALTER TABLE async_tasks ADD COLUMN failure_code text NOT NULL DEFAULT '';
ALTER TABLE pending_settlements ADD COLUMN poll_failures integer NOT NULL DEFAULT 0 CHECK (poll_failures >= 0);
