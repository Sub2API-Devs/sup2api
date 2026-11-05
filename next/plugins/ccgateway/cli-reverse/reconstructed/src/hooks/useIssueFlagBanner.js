/**
 * hooks/useIssueFlagBanner.ts
 *
 * "报告问题"横幅：检测挫败信号且会话可兼容时显示。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useIssueFlagBanner.ts
 * pieces: chunk-czq1j3j2.js (4)
 * attribution: affinity 1, fingerprint 1, placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { SHELL_TOOL_NAMES } from "../utils/shell/shellToolUtils.js";
import { getUserMessageText } from "../utils/messages.js";

//@ chunk-czq1j3j2.js:1810038-1810596 affinity
/**
 * 判断会话涉及网络操作的命令模式（curl、ssh、kubectl、docker 等）。
 */
var NETWORK_COMMAND_PATTERNS = [
  /\bcurl\b/,
  /\bwget\b/,
  /\bssh\b/,
  /\bkubectl\b/,
  /\bsrun\b/,
  /\bdocker\b/,
  /\bbq\b/,
  /\bgsutil\b/,
  /\bgcloud\b/,
  /\baws\b/,
  /\bgit\s+push\b/,
  /\bgit\s+pull\b/,
  /\bgit\s+fetch\b/,
  /\bgh\s+(pr|issue)\b/,
  /\bnc\b/,
  /\bncat\b/,
  /\btelnet\b/,
  /\bftp\b/,
];
var FRUSTRATION_PATTERNS = [
  /^no[,!]\s/i,
  /\bthat'?s (wrong|incorrect|not (what|right|correct))\b/i,
  /\bnot what I (asked|wanted|meant|said)\b/i,
  /\bI (said|asked|wanted|told you|already said)\b/i,
  /\bwhy did you\b/i,
  /\byou should(n'?t| not)? have\b/i,
  /\byou were supposed to\b/i,
  /\btry again\b/i,
  /\b(undo|revert) (that|this|it|what you)\b/i,
];
//@ chunk-czq1j3j2.js:1810596-1810926 fingerprint (2.1.88 match: isSessionContainerCompatible, 1)
function isSessionContainerCompatible(messages) {
  for (let msg of messages) {
    if (msg.type !== "assistant") continue;
    let content = msg.message.content;
    if (!Array.isArray(content)) continue;
    for (let block of content) {
      if (block.type !== "tool_use" || !("name" in block)) continue;
      let toolName = block.name;
      if (toolName.startsWith("mcp__")) return false;
      if (SHELL_TOOL_NAMES.includes(toolName)) {
        let command = block.input?.command || "";
        if (NETWORK_COMMAND_PATTERNS.some((pattern) => pattern.test(command))) return false;
      }
    }
  }
  return true;
}
//@ chunk-czq1j3j2.js:1810926-1811082 placement
function hasFrictionSignal(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    let msg = messages[i];
    if (msg.type !== "user") continue;
    let text = getUserMessageText(msg);
    if (!text) continue;
    return FRUSTRATION_PATTERNS.some((pattern) => pattern.test(text));
  }
  return false;
}
//@ chunk-czq1j3j2.js:1811082-1811444 placement
/**
 * 问题标记横幅的触发阈值与通知定义：达到最少轮数和时间间隔后提示。
 */
var MIN_TURNS_FOR_ISSUE_FLAG = 3;
var ISSUE_FLAG_COOLDOWN_MS = 1800000;
var issueFlagNotification = {
  id: "issue-flag",
  deps: (ctx) => [ctx.transcript.getSnapshot(), ctx.turnAtRender.submitCount, ctx.addNotification],
  setup() {
    let turns = 0;
    let lastTurn = -1;
    let flagged = false;
    function checkTurns(messages, messages_2) {
      if (lastTurn === messages_2) return true;
      if (Date.now() - turns < ISSUE_FLAG_COOLDOWN_MS) return false;
      if (messages_2 < MIN_TURNS_FOR_ISSUE_FLAG) return false;
      if (!isSessionContainerCompatible(messages) || !hasFrictionSignal(messages)) return false;
      turns = Date.now();
      lastTurn = messages_2;
      return true;
    }
    return ({ addNotification, transcript, turnAtRender }) => {};
  },
};
export { issueFlagNotification };
