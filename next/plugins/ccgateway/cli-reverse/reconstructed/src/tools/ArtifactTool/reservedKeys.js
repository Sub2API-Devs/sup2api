/**
 * tools/ArtifactTool/reservedKeys.ts
 *
 * 2.1.316 新增：Artifact 保留键
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (6)
 * attribution: placement 6
 */

//@ chunk-5xgkngpb.js:1011328-1011349 placement
/**
 * 只有 Claude Code 能设置的保留键前缀。
 */
var RESERVED_ARTIFACT_KEY_PREFIX = "__artifact";
//@ chunk-5xgkngpb.js:1011349-1011458 placement
/**
 * 输入带有只有 Claude Code 才能设置的保留键、而工具本身不生成这些键时，拒绝该调用。
 */
function denyReservedArtifactKeys(tool, input) {
  if (!hasReservedArtifactKey(input)) return null;
  try {
    if (tool.mintsArtifactKeys?.() === true) return null;
  } catch {}
  return reservedKeyDenial();
}
//@ chunk-5xgkngpb.js:1011458-1011498 placement
/**
 * 输入含保留键时返回拒绝结果，否则 null。
 */
function reservedKeyDenialIfPresent(input) {
  return hasReservedArtifactKey(input) ? reservedKeyDenial() : null;
}
//@ chunk-5xgkngpb.js:1011498-1011546 placement
/**
 * 判断输入是否包含保留键。
 */
function hasReservedArtifactKey(input) {
  return Object.keys(input).some(isReservedArtifactKeyName);
}
//@ chunk-5xgkngpb.js:1011546-1011610 placement
/**
 * 判断键名是否以保留前缀开头（忽略大小写）。
 */
function isReservedArtifactKeyName(key) {
  return key.toLowerCase().startsWith("__artifact");
}
//@ chunk-5xgkngpb.js:1011610-1011823 placement
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
