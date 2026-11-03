/**
 * services/claudeGateway/requestValidation.ts
 *
 * 2.1.316 新增：网关请求校验
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1ny7cxrt.js (2)
 * attribution: placement 2
 */

/**
 * 校验 model 字段时不深入的键（schema、示例等）。
 */
//@ chunk-1ny7cxrt.js:1341439-1341568 placement
var SKIPPED_SCHEMA_KEYS = new Set([
  "input",
  "input_schema",
  "input_examples",
  "output_schema",
  "output_examples",
  "schema",
  "tags",
  "classifier_context",
]);
/**
 * 递归检查请求中嵌套的 model 字段（深度≤1000、最多 100 个），返回第一个不允许的路径与原因。
 */
//@ chunk-1ny7cxrt.js:1341568-1342433 placement
function findDisallowedNestedModel(e, t, n = [], o = { fields: 0 }) {
  if (n.length >= 1000)
    return {
      path: n.join("."),
      reason: `refused by this gateway: the request JSON is nested more than ${(1000).toLocaleString("en-US")} levels deep`,
    };
  let r = "type" in e && e.type === "fallback";
  for (let [s, a] of Array.isArray(e) ? e.entries() : Object.entries(e))
    if (s === "model" && typeof a === "string") {
      if (n.length === 0) continue;
      if (++o.fields > 100)
        return {
          path: [...n, s].join("."),
          reason: "refused by this gateway: the request names more than 100 models in `model` fields",
        };
      let l = t(a);
      if (l !== void 0) return { path: [...n, s].join("."), reason: l };
    } else if (s === "model" && n.length > 0 && (typeof a !== "object" || Array.isArray(a)))
      return { path: [...n, s].join("."), reason: "refused by this gateway: `model` must be a string" };
    else if (
      typeof a === "object" &&
      a !== null &&
      !SKIPPED_SCHEMA_KEYS.has(s) &&
      !(r && (s === "from" || s === "to"))
    ) {
      n.push(s);
      let l = findDisallowedNestedModel(a, t, n, o);
      if ((n.pop(), l)) return l;
    }
  return;
}

export { findDisallowedNestedModel };
