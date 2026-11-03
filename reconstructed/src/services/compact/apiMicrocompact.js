/**
 * services/compact/apiMicrocompact.ts
 *
 * API 侧上下文管理：生成请求体 context_management.edits（clear_thinking_20251015 + 可选 clear_tool_uses 编辑）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/compact/apiMicrocompact.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */

//@ chunk-e6aww6q8.js:1537686-1537857 fingerprint = getAPIContextManagement (0.533)
/**
 * 生成 API 侧 context_management：有 thinking 时加 {type:"clear_thinking_20251015", keep:"all"}，再追加可选的工具结果清理编辑（clear_tool_uses_20250919）；都没有时返回 undefined。queryModel 只在带 context-management beta 时放进请求体。
 */
function getAPIContextManagement(options) {
  let { hasThinking = false, toolClearing } = options ?? {};
  let strategies = [];
  if (hasThinking)
    strategies.push({
      type: "clear_thinking_20251015",
      keep: "all",
    });
  if (toolClearing) strategies.push(toolClearing);
  return strategies.length > 0
    ? {
        edits: strategies,
      }
    : undefined;
}
export { getAPIContextManagement };
