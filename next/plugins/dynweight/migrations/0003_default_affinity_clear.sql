-- plg_dynweight 0003 (CONTRACTS §74.5, dynweight 0.4.0): the default degrade
-- strategies also clear 30% of the key's sticky sessions.
-- Runs with search_path pinned to the plugin schema (plg_dynweight).
-- Idempotent: a moved layer no longer matches.

-- Sticky requests skip the scheduler, so a lower weight alone only steers new
-- sessions. A layer whose strategies are still exactly the 0.3.0 defaults
-- (jsonb equality: every strategy, action and value unchanged, in the same
-- order) gets the 0.4.0 ones: the same names and triggers, each degrade with
-- an affinity_clear of 30%. A layer whose strategies were changed in any way
-- is left alone. The version moves so every node reloads.
UPDATE config SET doc = jsonb_set(doc, '{strategies}', d.new), version = version + 1, updated_at = now()
FROM (VALUES (
    '[{"name":"错误率过高","when":"错误率过高","actions":[{"type":"weight_degrade","mode":"current_percent","value":30}]},{"name":"首字 p95 过慢","when":"首字 p95 过慢","actions":[{"type":"weight_degrade","mode":"current_percent","value":30}]},{"name":"首字挂死","when":"首字挂死","actions":[{"type":"weight_degrade","mode":"current_percent","value":50}]},{"name":"自动回升","when":"健康恢复","actions":[{"type":"weight_climb","mode":"base_percent","value":10}]},{"name":"复活探测","when":"复活探测","actions":[{"type":"weight_climb","mode":"base_percent","value":10}]}]'::jsonb,
    '[{"name":"错误率过高","when":"错误率过高","actions":[{"type":"weight_degrade","mode":"current_percent","value":30},{"type":"affinity_clear","percent":30}]},{"name":"首字 p95 过慢","when":"首字 p95 过慢","actions":[{"type":"weight_degrade","mode":"current_percent","value":30},{"type":"affinity_clear","percent":30}]},{"name":"首字挂死","when":"首字挂死","actions":[{"type":"weight_degrade","mode":"current_percent","value":50},{"type":"affinity_clear","percent":30}]},{"name":"自动回升","when":"健康恢复","actions":[{"type":"weight_climb","mode":"base_percent","value":10}]},{"name":"复活探测","when":"复活探测","actions":[{"type":"weight_climb","mode":"base_percent","value":10}]}]'::jsonb
)) AS d(old, new)
WHERE config.doc->'strategies' = d.old;

-- The same for every group layer.
UPDATE config SET doc = jsonb_set(doc, '{groups}', (
        SELECT jsonb_object_agg(g.key, CASE WHEN g.value->'strategies' = d.old THEN jsonb_set(g.value, '{strategies}', d.new) ELSE g.value END)
        FROM jsonb_each(config.doc->'groups') AS g)),
    version = version + 1, updated_at = now()
FROM (VALUES (
    '[{"name":"错误率过高","when":"错误率过高","actions":[{"type":"weight_degrade","mode":"current_percent","value":30}]},{"name":"首字 p95 过慢","when":"首字 p95 过慢","actions":[{"type":"weight_degrade","mode":"current_percent","value":30}]},{"name":"首字挂死","when":"首字挂死","actions":[{"type":"weight_degrade","mode":"current_percent","value":50}]},{"name":"自动回升","when":"健康恢复","actions":[{"type":"weight_climb","mode":"base_percent","value":10}]},{"name":"复活探测","when":"复活探测","actions":[{"type":"weight_climb","mode":"base_percent","value":10}]}]'::jsonb,
    '[{"name":"错误率过高","when":"错误率过高","actions":[{"type":"weight_degrade","mode":"current_percent","value":30},{"type":"affinity_clear","percent":30}]},{"name":"首字 p95 过慢","when":"首字 p95 过慢","actions":[{"type":"weight_degrade","mode":"current_percent","value":30},{"type":"affinity_clear","percent":30}]},{"name":"首字挂死","when":"首字挂死","actions":[{"type":"weight_degrade","mode":"current_percent","value":50},{"type":"affinity_clear","percent":30}]},{"name":"自动回升","when":"健康恢复","actions":[{"type":"weight_climb","mode":"base_percent","value":10}]},{"name":"复活探测","when":"复活探测","actions":[{"type":"weight_climb","mode":"base_percent","value":10}]}]'::jsonb
)) AS d(old, new)
WHERE jsonb_typeof(config.doc->'groups') = 'object'
  AND EXISTS (SELECT 1 FROM jsonb_each(config.doc->'groups') AS g WHERE g.value->'strategies' = d.old);
