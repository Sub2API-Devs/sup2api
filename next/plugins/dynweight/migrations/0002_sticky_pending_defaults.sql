-- plg_dynweight 0002 (CONTRACTS §74.5, dynweight 0.3.0): pending sticky
-- clears, and the 0.2.0 default rules moved over to the 0.3.0 ones.
-- Runs with search_path pinned to the plugin schema (plg_dynweight).
-- Idempotent: the table is created once, and a moved layer no longer matches.

-- Sticky clears an evaluation decided and the core has not done yet, one per
-- (account, group, client model). Written in the transaction of the state
-- write that decided them; the evaluate job runs them after it recorded the
-- events and the notifications, within a budget of its own, and deletes each
-- once done. salt is the window start (the same salt selects the same
-- bindings, so a retry is idempotent). claimed_until leases a row to one run.
CREATE TABLE IF NOT EXISTS sticky_pending (
    account_id    bigint           NOT NULL,
    group_id      bigint           NOT NULL,
    model         text             NOT NULL,
    salt          text             NOT NULL,
    percent       integer          NOT NULL,
    strategies    text             NOT NULL DEFAULT '',
    zero          boolean          NOT NULL DEFAULT false,
    weight        double precision NOT NULL DEFAULT 0,
    attempts      integer          NOT NULL DEFAULT 0,
    created_at    timestamptz      NOT NULL DEFAULT now(),
    claimed_until timestamptz      NOT NULL DEFAULT '-infinity',
    PRIMARY KEY (account_id, group_id, model)
);
CREATE INDEX IF NOT EXISTS sticky_pending_created_idx ON sticky_pending (created_at);

-- The 0.2.0 default rules timed the whole attempt of streams (a normal long
-- stream degraded the key by half and kept it down) and needed first token
-- samples to recover (a key without streams never climbed back). A layer
-- whose rules are still exactly those defaults (jsonb equality: as saved,
-- normalized, every rule, condition and value unchanged, in the same order)
-- gets the 0.3.0 defaults; the rule names are the same, so the strategies
-- keep referencing them. A layer whose rules were changed in any way is left
-- alone: saving it warns about the same risks. The version moves so every
-- node reloads.
UPDATE config SET doc = jsonb_set(doc, '{rules}', d.new), version = version + 1, updated_at = now()
FROM (VALUES (
    '[{"name":"错误率过高","conditions":[{"metric":"error_rate","op":"gte","value":30}],"periods":3,"hit_periods":2},{"name":"首字 p95 过慢","conditions":[{"metric":"ttfb","p":95,"op":"gte","value":10000}],"periods":3,"hit_periods":2},{"name":"首字挂死","conditions":[{"metric":"ttfb","p":100,"op":"gte","value":60000},{"join":"or","metric":"latency","p":100,"op":"gte","value":120000}],"periods":1,"hit_periods":1},{"name":"健康恢复","conditions":[{"metric":"error_rate","op":"lt","value":15},{"join":"and","metric":"ttfb","p":95,"op":"lt","value":10000},{"join":"and","metric":"ttfb","p":100,"op":"lt","value":60000},{"join":"and","metric":"latency","p":100,"op":"lt","value":120000}],"periods":1,"hit_periods":1},{"name":"复活探测","conditions":[{"metric":"weight","op":"lte","value":0}],"periods":2,"hit_periods":2}]'::jsonb,
    '[{"name":"错误率过高","conditions":[{"metric":"error_rate","op":"gte","value":30}],"periods":3,"hit_periods":2},{"name":"首字 p95 过慢","conditions":[{"metric":"ttfb","p":95,"op":"gte","value":10000}],"periods":3,"hit_periods":2},{"name":"首字挂死","conditions":[{"metric":"ttfb","p":100,"op":"gte","value":60000},{"join":"or","metric":"latency","p":100,"op":"gte","value":120000,"scope":"non_stream"}],"periods":1,"hit_periods":1},{"name":"健康恢复","conditions":[{"metric":"error_rate","op":"lt","value":15},{"join":"and","metric":"ttfb","p":95,"op":"lt","value":10000,"when_empty":"pass"},{"join":"and","metric":"ttfb","p":100,"op":"lt","value":60000,"when_empty":"pass"},{"join":"and","metric":"latency","p":100,"op":"lt","value":120000,"scope":"non_stream","when_empty":"pass"}],"periods":1,"hit_periods":1},{"name":"复活探测","conditions":[{"metric":"weight","op":"lte","value":0}],"periods":2,"hit_periods":2}]'::jsonb
)) AS d(old, new)
WHERE config.doc->'rules' = d.old;

-- The same for every group layer.
UPDATE config SET doc = jsonb_set(doc, '{groups}', (
        SELECT jsonb_object_agg(g.key, CASE WHEN g.value->'rules' = d.old THEN jsonb_set(g.value, '{rules}', d.new) ELSE g.value END)
        FROM jsonb_each(config.doc->'groups') AS g)),
    version = version + 1, updated_at = now()
FROM (VALUES (
    '[{"name":"错误率过高","conditions":[{"metric":"error_rate","op":"gte","value":30}],"periods":3,"hit_periods":2},{"name":"首字 p95 过慢","conditions":[{"metric":"ttfb","p":95,"op":"gte","value":10000}],"periods":3,"hit_periods":2},{"name":"首字挂死","conditions":[{"metric":"ttfb","p":100,"op":"gte","value":60000},{"join":"or","metric":"latency","p":100,"op":"gte","value":120000}],"periods":1,"hit_periods":1},{"name":"健康恢复","conditions":[{"metric":"error_rate","op":"lt","value":15},{"join":"and","metric":"ttfb","p":95,"op":"lt","value":10000},{"join":"and","metric":"ttfb","p":100,"op":"lt","value":60000},{"join":"and","metric":"latency","p":100,"op":"lt","value":120000}],"periods":1,"hit_periods":1},{"name":"复活探测","conditions":[{"metric":"weight","op":"lte","value":0}],"periods":2,"hit_periods":2}]'::jsonb,
    '[{"name":"错误率过高","conditions":[{"metric":"error_rate","op":"gte","value":30}],"periods":3,"hit_periods":2},{"name":"首字 p95 过慢","conditions":[{"metric":"ttfb","p":95,"op":"gte","value":10000}],"periods":3,"hit_periods":2},{"name":"首字挂死","conditions":[{"metric":"ttfb","p":100,"op":"gte","value":60000},{"join":"or","metric":"latency","p":100,"op":"gte","value":120000,"scope":"non_stream"}],"periods":1,"hit_periods":1},{"name":"健康恢复","conditions":[{"metric":"error_rate","op":"lt","value":15},{"join":"and","metric":"ttfb","p":95,"op":"lt","value":10000,"when_empty":"pass"},{"join":"and","metric":"ttfb","p":100,"op":"lt","value":60000,"when_empty":"pass"},{"join":"and","metric":"latency","p":100,"op":"lt","value":120000,"scope":"non_stream","when_empty":"pass"}],"periods":1,"hit_periods":1},{"name":"复活探测","conditions":[{"metric":"weight","op":"lte","value":0}],"periods":2,"hit_periods":2}]'::jsonb
)) AS d(old, new)
WHERE jsonb_typeof(config.doc->'groups') = 'object'
  AND EXISTS (SELECT 1 FROM jsonb_each(config.doc->'groups') AS g WHERE g.value->'rules' = d.old);
