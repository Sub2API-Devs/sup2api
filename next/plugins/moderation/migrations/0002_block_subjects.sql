-- A durable parent row serializes decisions even while the user is not banned.
-- Never delete these rows during history cleanup: an absent blocks/unblocks row
-- cannot protect a concurrent automatic ban from a completed manual unblock.
CREATE TABLE IF NOT EXISTS block_subjects (
    user_id bigint PRIMARY KEY
);
