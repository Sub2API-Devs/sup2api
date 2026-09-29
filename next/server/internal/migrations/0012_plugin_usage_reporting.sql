-- What a plugin stated about the upstream response of this request, verbatim
-- (CONTRACTS §25.3): the detail_json of PlatformService.ExtractUsage, for the
-- endpoints whose usage rules declare usage.source "plugin".
--
-- It is the ONLY part of a usage row a plugin writes. Attribution (user, api
-- key, group, account), the request's own facts (status, attempts, latency,
-- node, timestamps) and everything about money (multiplier, price, mode,
-- tier, cost, billing status) are filled by the core and overwrite whatever a
-- plugin reported - a plugin states usage, never what it costs or whom it is
-- charged to.
--
-- Nothing reads this column for billing. It is shown in the console's usage
-- detail and capped at 4 KiB by the gateway; '{}' means the plugin said
-- nothing, which is every request of every endpoint using the declarative
-- usage rules.

ALTER TABLE usage_logs ADD COLUMN plugin_detail jsonb NOT NULL DEFAULT '{}';
