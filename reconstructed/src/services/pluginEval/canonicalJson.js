/**
 * services/pluginEval/canonicalJson.ts
 *
 * 2.1.316 新增：plugin eval 用的规范化 JSON（键排序、限制嵌套深度），用于录制/回放与哈希
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qchp9vrd.js (3)
 * attribution: placement 3
 */
import { jsonStringify } from "../../utils/slowOperations.js";

//@ chunk-qchp9vrd.js:16398-16439 placement
function canonicalJsonStringify(e) {
  return jsonStringify(canonicalizeValue(e, 0)) ?? "null";
}
//@ chunk-qchp9vrd.js:16439-16449 placement
/**
 * 规范化 JSON 时允许的最大嵌套深度（64）。
 */
var MAX_CANONICAL_DEPTH = 64;
//@ chunk-qchp9vrd.js:16449-16712 placement
/**
 * 递归规范化值（对象键排序），嵌套过深时报错。
 */
function canonicalizeValue(e, n) {
  if (n > MAX_CANONICAL_DEPTH) throw RangeError("value nested too deep to canonicalize");
  if (Array.isArray(e)) return e.map((r) => canonicalizeValue(r, n + 1));
  if (e !== null && typeof e === "object") {
    let r = Object.create(null);
    for (let key of Object.keys(e).sort()) r[key] = canonicalizeValue(e[key], n + 1);
    return r;
  }
  return e;
}
export { canonicalJsonStringify };
