/**
 * tools/utils.ts
 *
 * 工具结果消息辅助：取消息关联的 tool_use_id、给展开消息打 sourceToolUseID、判定消息作者类别
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/utils.ts
 * pieces: chunk-1nk4j4sn.js (1)
 * attribution: fingerprint 1
 */

/**
 * 取消息关联的 tool_use_id：内容里第一个 tool_result 的 tool_use_id，否则 sourceToolUseID。
 */
//@ chunk-1nk4j4sn.js:15461-15636 fingerprint = tagMessagesWithToolUseID (1)
function getToolUseIdOfMessage(e) {
  let { content: content } = e.message;
  if (Array.isArray(content)) {
    let found = content.find((n) => n.type === "tool_result");
    if (found?.type === "tool_result") return found.tool_use_id;
  }
  return e.sourceToolUseID;
}

export { getToolUseIdOfMessage };
