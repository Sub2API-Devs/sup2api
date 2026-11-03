/**
 * tools/ArtifactTool/reservedKeys.ts
 *
 * 2.1.316 新增：Artifact 保留键
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (6)
 * attribution: placement 6
 */

//@ chunk-e6aww6q8.js:997563-997584 placement
/**
 * 只有 Claude Code 能设置的保留键前缀。
 */
var RESERVED_ARTIFACT_KEY_PREFIX = "__artifact";
//@ chunk-e6aww6q8.js:997584-997693 placement
/**
 * 输入带有只有 Claude Code 才能设置的保留键、而工具本身不生成这些键时，拒绝该调用。
 */
function denyReservedArtifactKeys(tool, n) {
  if (!hasReservedArtifactKey(n)) return null;
  try {
    if (tool.mintsArtifactKeys?.() === true) return null;
  } catch {}
  return reservedKeyDenial();
}
//@ chunk-e6aww6q8.js:997693-997733 placement
/**
 * 输入含保留键时返回拒绝结果，否则 null。
 */
function reservedKeyDenialIfPresent(e) {
  return hasReservedArtifactKey(e) ? reservedKeyDenial() : null;
}
//@ chunk-e6aww6q8.js:997733-997781 placement
/**
 * 判断输入是否包含保留键。
 */
function hasReservedArtifactKey(e) {
  return Object.keys(e).some(isReservedArtifactKeyName);
}
//@ chunk-e6aww6q8.js:997781-997845 placement
/**
 * 判断键名是否以保留前缀开头（忽略大小写）。
 */
function isReservedArtifactKeyName(e) {
  return e.toLowerCase().startsWith("__artifact");
}
//@ chunk-e6aww6q8.js:997845-998058 placement
function reservedKeyDenial() {
  return {
    behavior: "deny",
    message: "Nothing was done. The arguments carry a key that only Claude Code sets.",
    decisionReason: {
      type: "other",
      reason: "tool call carried a key only an artifact check mints",
    },
  };
}
export {
  denyReservedArtifactKeys,
  hasReservedArtifactKey,
  isReservedArtifactKeyName,
  reservedKeyDenialIfPresent,
  RESERVED_ARTIFACT_KEY_PREFIX,
};
