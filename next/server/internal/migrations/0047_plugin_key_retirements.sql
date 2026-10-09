-- Keys of uninstalled plugins and the publisher that owned them (audit
-- 2026-10-09 P1-4). Accounts, the plg_<key> schema and KV entries can outlive
-- an uninstall; a different publisher may not claim the key - and inherit
-- them - until an administrator releases it. The same publisher reinstalls
-- freely. NULL publisher_id: an unsigned plugin.
CREATE TABLE IF NOT EXISTS plugin_key_retirements (
    plugin_key   varchar(30) PRIMARY KEY,
    publisher_id bigint,
    retired_at   timestamptz NOT NULL DEFAULT now(),
    retired_by   bigint
);
