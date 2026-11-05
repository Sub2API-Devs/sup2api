/**
 * utils/hooks/replHookFeedback.ts
 *
 * Code 模式一次运行内 hook 反馈的折叠与去重：限制最多 50 条/50000 字符、按类型去重、超限时在末尾补一条说明；hook_stopped_continuation 恒保留（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0wbdaeqh.js (8)
 * attribution: placement 8
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { createAttachmentMessage_2 as createAttachmentMessage } from "../debug.js";

//@ chunk-0wbdaeqh.js:342-399 placement
/**
 * 新建一次代码运行的 hook 停止/累计状态（消息数组、已提交下标、是否已停止）。
 */
function createHookMessages() {
  return {
    messages: [],
    committed: 0,
    halted: false,
  };
}
//@ chunk-0wbdaeqh.js:470-564 placement
/**
 * 判定消息是否为 hook_stopped_continuation 附件；多个 poll_event 与折叠逻辑依赖它。
 */
function isStoppedContinuation(message) {
  return message.type === "attachment" && message.attachment.type === "hook_stopped_continuation";
}
//@ chunk-0wbdaeqh.js:564-655 placement
/**
 * 取出状态里尚未提交的消息并推进已提交下标。
 */
function takeUncommitted(state) {
  let uncommitted = state.messages.slice(state.committed);
  state.committed = state.messages.length;
  return uncommitted;
}
//@ chunk-0wbdaeqh.js:655-836 placement
/**
 * 在一次代码运行里首次遇到 PreToolUse hook 的 continue:false 时置停止标记并推入 hook_stopped_continuation 消息。
 */
function stopContinuation(state, toolName, hookName, detail) {
  if (state.halted) return;
  state.halted = true;
  state.messages.push(
    createAttachmentMessage({
      type: "hook_stopped_continuation",
      message: detail,
      hookName: `PreToolUse:${toolName}`,
      toolUseID: hookName,
      hookEvent: "PreToolUse",
    }),
  );
}
//@ chunk-0wbdaeqh.js:836-1522 placement
/**
 * hook 停止原因、hook 失败重试建议与被丢弃 hook 消息的说明文案常量。
 */
var TOOL_DID_NOT_RUN_LINE =
  "This tool call did not run. A hook returned continue: false for another tool call from the same piece of code, so every further tool call from it is refused. The hook's reason is sent with that code's result.";
var HOOK_HUNG_REFUSAL =
  "A tool call from code is refused when a PreToolUse hook that matches it doesn't finish, or fails without giving an answer. If the code made many calls at once, or one with a very large input, make this call again on its own. If it fails again, tell the user which hook it is so that they can fix it, and don't change the hook yourself.";
var MAX_HOOK_MESSAGES = 50;
var MAX_HOOK_CHARS = 50000;
var MAX_HOOK_MESSAGES_PER_TOOL = 200;
var HOOK_MESSAGES_CUT_NOTICE = `Some hook messages weren't shown: each message is shown once, and at most ${MAX_HOOK_MESSAGES_PER_TOOL} for one piece of code.`;
//@ chunk-0wbdaeqh.js:1522-1625 placement
/**
 * 新建 hook 反馈去重状态（已发内容集合、条数/字数、是否已提示、system 消息集合）。
 */
function createHookMessageBudget() {
  return {
    sent: new Set(),
    messages: 0,
    characters: 0,
    noted: false,
    systemSent: new Set(),
    systemNoted: false,
  };
}
//@ chunk-0wbdaeqh.js:1625-1723 placement
/**
 * 取 hook_additional_context 附件的正文并按行拼接。
 */
function hookContextText(message) {
  let attachment = message.attachment;
  return attachment.type === "hook_additional_context"
    ? attachment.content.join(`
`)
    : "";
}
//@ chunk-0wbdaeqh.js:1723-2861 placement
/**
 * 一次代码运行内的 hook 反馈折叠：停止与阻断信息恒保留，其余按内容去重并限制 50 条/50000 字符，超限或被裁时补一条说明，system 消息另有额度。
 */
function filterHookMessages(budget, messages) {
  let kept = [];
  let noted = false;
  let notice;
  for (let message of messages) {
    let attachment = message.attachment;
    let type = attachment.type;
    if (type === "hook_stopped_continuation" || type === "hook_blocking_error") {
      kept.push(message);
      continue;
    }
    if (attachment.type === "hook_system_message") {
      if (budget.systemSent.has(attachment.content) || budget.systemSent.size >= MAX_HOOK_MESSAGES_PER_TOOL) {
        notice ??= message;
        continue;
      }
      budget.systemSent.add(attachment.content);
      kept.push(message);
      continue;
    }
    let content = hookContextText(message);
    let dedupeKey = `${type}\x00${content}`;
    if (budget.sent.has(dedupeKey)) {
      noted = true;
      continue;
    }
    if (budget.messages >= MAX_HOOK_MESSAGES || budget.characters + content.length > MAX_HOOK_CHARS) {
      noted = true;
      continue;
    }
    budget.sent.add(dedupeKey);
    budget.messages++;
    budget.characters += content.length;
    kept.push(message);
  }
  if (noted && !budget.noted) {
    budget.noted = true;
    kept.push(
      createAttachmentMessage({
        type: "hook_additional_context",
        content: [
          `Claude Code left out hook messages from this code's tool calls that repeated one already sent, or that went past the limit of ${MAX_HOOK_MESSAGES} messages or ${MAX_HOOK_CHARS.toLocaleString("en-US")} characters in one run of code. Block reasons and stops are always sent.`,
        ],
        hookName: "PostToolUse",
        toolUseID: "repl-hook-feedback-limit",
        hookEvent: "PostToolUse",
      }),
    );
  }
  if (notice !== undefined && notice.attachment.type === "hook_system_message" && !budget.systemNoted) {
    budget.systemNoted = true;
    kept.push(
      createAttachmentMessage({
        type: "hook_system_message",
        content: HOOK_MESSAGES_CUT_NOTICE,
        hookName: "Claude Code",
        toolUseID: notice.attachment.toolUseID,
        hookEvent: notice.attachment.hookEvent,
      }),
    );
  }
  return kept;
}
export {
  isStoppedContinuation,
  HOOK_HUNG_REFUSAL,
  stopContinuation,
  createHookMessages,
  takeUncommitted,
  TOOL_DID_NOT_RUN_LINE,
  createHookMessageBudget,
  filterHookMessages,
};
