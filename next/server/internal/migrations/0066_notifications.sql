-- Notifications (CONTRACTS §74.4): the queue and delivery record of what the
-- core and plugins send through the channels plugins declare. A row is
-- pending, sending (claimed until next_attempt_at, the lease), sent or failed.
CREATE TABLE IF NOT EXISTS notifications (
    id              bigserial    PRIMARY KEY,
    source          varchar(64)  NOT NULL, -- plugin key or 'core'
    channel         varchar(30)  NOT NULL,
    recipients      text[]       NOT NULL,
    subject         text         NOT NULL,
    body            text         NOT NULL,
    severity        varchar(10)  NOT NULL DEFAULT 'info',
    dedupe_key      varchar(200) NOT NULL DEFAULT '',
    status          varchar(10)  NOT NULL DEFAULT 'pending',
    attempts        int          NOT NULL DEFAULT 0,
    next_attempt_at timestamptz  NOT NULL DEFAULT now(),
    last_error      text         NOT NULL DEFAULT '',
    created_at      timestamptz  NOT NULL DEFAULT now(),
    sent_at         timestamptz,
    CONSTRAINT notifications_status_chk CHECK (status IN ('pending', 'sending', 'sent', 'failed'))
);

CREATE INDEX IF NOT EXISTS notifications_due ON notifications (next_attempt_at) WHERE status IN ('pending', 'sending');
CREATE INDEX IF NOT EXISTS notifications_source ON notifications (source, created_at);
CREATE INDEX IF NOT EXISTS notifications_dedupe ON notifications (source, dedupe_key, created_at) WHERE dedupe_key <> '';
