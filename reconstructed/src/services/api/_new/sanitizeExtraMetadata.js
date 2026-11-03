/**
 * services/api/_new/sanitizeExtraMetadata.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-w5ndchqs.js (2)
 * attribution: sole-consumer-new 2
 */

/**
 * ti/os/sb/he/uf/ap/tk：CLAUDE_CODE_EXTRA_METADATA 不能覆盖的保留键；512 为 user_id JSON 的长度上限。
 */
//@ chunk-w5ndchqs.js:2496-2556 sole-consumer-new
var RESERVED_METADATA_KEYS = new Set(["ti", "os", "sb", "he", "uf", "ap", "tk"]),
  MAX_METADATA_USER_ID_LENGTH = 512;
/**
 * 去掉保留键，只保留字符串/数字/布尔值的附加 metadata 字段。
 */
//@ chunk-w5ndchqs.js:2556-2709 sole-consumer-new
function sanitizeExtraMetadata(e) {
  let n = {};
  for (let [r, s] of Object.entries(e))
    if (
      !RESERVED_METADATA_KEYS.has(r) &&
      (typeof s === "string" || typeof s === "number" || typeof s === "boolean")
    )
      n[r] = s;
  return n;
}

export { sanitizeExtraMetadata, MAX_METADATA_USER_ID_LENGTH };
