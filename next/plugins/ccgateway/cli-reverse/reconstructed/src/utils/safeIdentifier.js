/**
 * utils/safeIdentifier.ts
 *
 * 2.1.316 新增：安全标识符校验
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s3dfv2tr.js (2)
 * attribution: placement 2
 */

//@ chunk-s3dfv2tr.js:191-226 placement
/**
 * SAFE_IDENTIFIER_RE：安全标识符格式。
 */
var SAFE_IDENTIFIER_RE = /^[A-Za-z0-9_.:-]{1,128}$/;
//@ chunk-s3dfv2tr.js:226-290 placement
/**
 * safeIdentifierOrUndefined：安全标识符或 undefined。
 */
function safeIdentifierOrUndefined(value) {
  return typeof value === "string" && SAFE_IDENTIFIER_RE.test(value) ? value : undefined;
}
export { safeIdentifierOrUndefined, SAFE_IDENTIFIER_RE };
