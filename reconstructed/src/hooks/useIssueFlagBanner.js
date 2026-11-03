/**
 * hooks/useIssueFlagBanner.ts
 *
 * "报告问题"横幅：检测挫败信号且会话可兼容时显示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useIssueFlagBanner.ts
 * pieces: chunk-18hwfzwa.js (4)
 * attribution: affinity 2, fingerprint 1, file-local 1
 */
import { SHELL_TOOL_NAMES } from "../utils/shell/shellToolUtils.js";
import { getUserMessageText } from "../utils/messages.js";

/**
 * 判断会话涉及网络操作的命令模式（curl、ssh、kubectl、docker 等）。
 */
//@ chunk-18hwfzwa.js:1762777-1763335 affinity
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
  ],
  FRUSTRATION_PATTERNS = [
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
//@ chunk-18hwfzwa.js:1763335-1763665 fingerprint = isSessionContainerCompatible (1)
function isSessionContainerCompatible(messages) {
  for (let msg of messages) {
    if (msg.type !== "assistant") continue;
    let content = msg.message.content;
    if (!Array.isArray(content)) continue;
    for (let block of content) {
      if (block.type !== "tool_use" || !("name" in block)) continue;
      let toolName = block.name;
      if (toolName.startsWith("mcp__")) return !1;
      if (SHELL_TOOL_NAMES.includes(toolName)) {
        let command = block.input?.command || "";
        if (NETWORK_COMMAND_PATTERNS.some((Be) => Be.test(command))) return !1;
      }
    }
  }
  return !0;
}
//@ chunk-18hwfzwa.js:1763665-1763821 file-local
function hasFrictionSignal(messages) {
  for (let x = messages.length - 1; x >= 0; x--) {
    let msg = messages[x];
    if (msg.type !== "user") continue;
    let text = getUserMessageText(msg);
    if (!text) continue;
    return FRUSTRATION_PATTERNS.some((ee) => ee.test(text));
  }
  return !1;
}
/**
 * 问题标记横幅的触发阈值与通知定义：达到最少轮数和时间间隔后提示。
 */
//@ chunk-18hwfzwa.js:1763821-1764183 affinity
var MIN_TURNS_FOR_ISSUE_FLAG = 3,
  ISSUE_FLAG_COOLDOWN_MS = 1800000,
  issueFlagNotification = {
    id: "issue-flag",
    deps: (h) => [h.transcript.getSnapshot(), h.turnAtRender.submitCount, h.addNotification],
    setup() {
      let h = 0,
        x = -1,
        D = !1;
      function L(ee, ke) {
        if (x === ke) return !0;
        if (Date.now() - h < ISSUE_FLAG_COOLDOWN_MS) return !1;
        if (ke < MIN_TURNS_FOR_ISSUE_FLAG) return !1;
        if (!isSessionContainerCompatible(ee) || !hasFrictionSignal(ee)) return !1;
        return ((h = Date.now()), (x = ke), !0);
      }
      return ({ addNotification: addNotification, transcript: transcript, turnAtRender: turnAtRender }) => {};
    },
  };

export { issueFlagNotification };
