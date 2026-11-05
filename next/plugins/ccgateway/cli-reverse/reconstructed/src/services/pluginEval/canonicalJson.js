/**
 * services/pluginEval/canonicalJson.ts
 *
 * 2.1.316 新增：plugin eval 用的规范化 JSON（键排序、限制嵌套深度），用于录制/回放与哈希
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-af1hzzme.js (3)
 * attribution: placement 3
 */
import { jsonStringify } from "../../utils/slowOperations.js";

//@ chunk-af1hzzme.js:17729-17770 placement
function canonicalJsonStringify(value) {
  return jsonStringify(canonicalizeValue(value, 0)) ?? "null";
}
//@ chunk-af1hzzme.js:17770-17780 placement
/**
 * 规范化 JSON 时允许的最大嵌套深度（64）。
 */
var MAX_CANONICAL_DEPTH = 64;
//@ chunk-af1hzzme.js:17780-18043 placement
/**
 * 递归规范化值（对象键排序），嵌套过深时报错。
 */
function canonicalizeValue(value, depth) {
  if (depth > MAX_CANONICAL_DEPTH) throw RangeError("value nested too deep to canonicalize");
  if (Array.isArray(value)) return value.map((item) => canonicalizeValue(item, depth + 1));
  if (value !== null && typeof value === "object") {
    let result = Object.create(null);
    for (let key of Object.keys(value).sort()) result[key] = canonicalizeValue(value[key], depth + 1);
    return result;
  }
  return value;
}
export { canonicalJsonStringify };
