/**
 * utils/shortHash.ts
 *
 * 2.1.316 新增：12 位短哈希
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-xk61q82y.js (3)
 * attribution: placement 3
 */
import { fromSanitizer_SANITIZER_OUTPUT_ONLY } from "../services/analytics/safeMetadata.js";
import { computeContentHash } from "./commitAttribution.js";

//@ chunk-xk61q82y.js:263-307 placement
/**
 * 内容哈希取前 12 位十六进制，作为短哈希。
 */
function shortHash(value) {
  return fromSanitizer_SANITIZER_OUTPUT_ONLY(computeContentHash(value).slice(0, 12));
}
//@ chunk-xk61q82y.js:307-330 placement
var SHORT_HASH_RE = /^[0-9a-f]{12}$/;
//@ chunk-xk61q82y.js:330-376 placement
/**
 * 校验并规范化已有的 12 位短哈希，非法返回 undefined。
 */
function normalizeShortHash(hash) {
  return SHORT_HASH_RE.test(hash) ? fromSanitizer_SANITIZER_OUTPUT_ONLY(hash) : undefined;
}
export { shortHash, normalizeShortHash };
