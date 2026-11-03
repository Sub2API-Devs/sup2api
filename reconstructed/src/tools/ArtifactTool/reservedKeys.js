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
var H1t = "__artifact";
/**
 * 输入带有只有 Claude Code 才能设置的保留键、而工具本身不生成这些键时，拒绝该调用。
 */
//@ chunk-e6aww6q8.js:997584-997693 placement
function denyReservedArtifactKeys(e, n) {
  if (!SWt(n)) return null;
  try {
    if (e.mintsArtifactKeys?.() === !0) return null;
  } catch {}
  return reservedKeyDenial();
}
//@ chunk-e6aww6q8.js:997693-997733 placement
function G7(e) {
  return SWt(e) ? reservedKeyDenial() : null;
}
//@ chunk-e6aww6q8.js:997733-997781 placement
function SWt(e) {
  return Object.keys(e).some(xGe);
}
//@ chunk-e6aww6q8.js:997781-997845 placement
function xGe(e) {
  return e.toLowerCase().startsWith("__artifact");
}
//@ chunk-e6aww6q8.js:997845-998058 placement
function reservedKeyDenial() {
  return {
    behavior: "deny",
    message: "Nothing was done. The arguments carry a key that only Claude Code sets.",
    decisionReason: { type: "other", reason: "tool call carried a key only an artifact check mints" },
  };
}

export { denyReservedArtifactKeys, SWt, xGe, G7, H1t };
