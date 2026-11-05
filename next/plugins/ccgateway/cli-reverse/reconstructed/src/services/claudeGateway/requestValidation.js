/**
 * services/claudeGateway/requestValidation.ts
 *
 * 2.1.316 新增：网关请求校验
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-1hnjmk23.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-1hnjmk23.js:1342402-1342531 placement
/**
 * 校验 model 字段时不深入的键（schema、示例等）。
 */
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
//@ chunk-1hnjmk23.js:1342531-1343396 placement
/**
 * 递归检查请求中嵌套的 model 字段（深度≤1000、最多 100 个），返回第一个不允许的路径与原因。
 */
function findDisallowedNestedModel(
  value,
  checkModel,
  path = [],
  counter = {
    fields: 0,
  },
) {
  if (path.length >= 1000)
    return {
      path: path.join("."),
      reason: `refused by this gateway: the request JSON is nested more than ${(1000).toLocaleString("en-US")} levels deep`,
    };
  let isFallback = "type" in value && value.type === "fallback";
  for (let [key, child] of Array.isArray(value) ? value.entries() : Object.entries(value))
    if (key === "model" && typeof child === "string") {
      if (path.length === 0) continue;
      if (++counter.fields > 100)
        return {
          path: [...path, key].join("."),
          reason: "refused by this gateway: the request names more than 100 models in `model` fields",
        };
      let reason = checkModel(child);
      if (reason !== undefined)
        return {
          path: [...path, key].join("."),
          reason,
        };
    } else if (key === "model" && path.length > 0 && (typeof child !== "object" || Array.isArray(child)))
      return {
        path: [...path, key].join("."),
        reason: "refused by this gateway: `model` must be a string",
      };
    else if (
      typeof child === "object" &&
      child !== null &&
      !SKIPPED_SCHEMA_KEYS.has(key) &&
      !(isFallback && (key === "from" || key === "to"))
    ) {
      path.push(key);
      let disallowedNestedModel = findDisallowedNestedModel(child, checkModel, path, counter);
      path.pop();
      if (disallowedNestedModel) return disallowedNestedModel;
    }
  return;
}
export { findDisallowedNestedModel };
