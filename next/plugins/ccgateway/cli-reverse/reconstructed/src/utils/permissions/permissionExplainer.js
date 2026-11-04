/**
 * utils/permissions/permissionExplainer.ts
 *
 * 实际内容是模型白名单/角色模型限制的提示文字（切分误归，旧版的权限解释器不在此）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/permissions/permissionExplainer.ts
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: fingerprint 1
 */

//@ chunk-1ny7cxrt.js:1347778-1347874 fingerprint (2.1.88 match: extractConversationContext, 0.675)
/**
 * 去掉非可打印 ASCII 字符并截断到 128 字符，用于错误提示里回显模型名。
 */
function sanitizeModelIdForMessage(modelId) {
  let replaced = modelId.replace(/[^\x20-\x7e]/g, "");
  return replaced.length > 128 ? `${replaced.slice(0, 128)}...` : replaced;
}
export { sanitizeModelIdForMessage };
