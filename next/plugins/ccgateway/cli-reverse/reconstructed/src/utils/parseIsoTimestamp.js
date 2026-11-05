/**
 * utils/parseIsoTimestamp.ts
 *
 * 2.1.316 新增：严格解析 ISO 8601 时间戳
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-71gwbk7s.js (2)
 * attribution: placement 2
 */

//@ chunk-71gwbk7s.js:191-276 placement
var ISO_TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}[Tt ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:[zZ]|[+-]\d{2}:?\d{2})$/;
//@ chunk-71gwbk7s.js:276-334 placement
/**
 * 解析 ISO 时间戳，不合法返回 NaN。
 */
function parseIsoTimestamp(text) {
  return ISO_TIMESTAMP_RE.test(text) ? Date.parse(text) : Number.NaN;
}
export { parseIsoTimestamp };
