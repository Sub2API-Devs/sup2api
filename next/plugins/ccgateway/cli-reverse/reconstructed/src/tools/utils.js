/**
 * tools/utils.ts
 *
 * 工具结果消息辅助：取消息关联的 tool_use_id、给展开消息打 sourceToolUseID、判定消息作者类别
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/utils.ts
 * pieces: chunk-8fb5jme0.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-8fb5jme0.js:16609-16784 placement (2.1.88 match: tagMessagesWithToolUseID, 1)
/**
 * 取消息关联的 tool_use_id：内容里第一个 tool_result 的 tool_use_id，否则 sourceToolUseID。
 */
function answeredToolUseId(message) {
  let { content } = message.message;
  if (Array.isArray(content)) {
    let found = content.find((block) => block.type === "tool_result");
    if (found?.type === "tool_result") return found.tool_use_id;
  }
  return message.sourceToolUseID;
}
export { answeredToolUseId };
