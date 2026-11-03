/**
 * utils/swarm/teammateIdleResult.ts
 *
 * 2.1.316 新增：队友空闲结果文本。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s4bxxzsw.js (6)
 * attribution: placement 6
 */
import { dropRetractedOnResume, hasNonEmptyText } from "../conversationRecovery.js";
import { getLastPeerDmSummary, isTeammateWakeupPrompt } from "../teammateMailbox.js";
import { SENDMESSAGE } from "../../tools/SendMessageTool/constants.js";
import { TEAM_LEAD } from "./constants.js";
import { MAIN } from "../sessionPeers.js";
import { logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { sanitizeSubagentOutput } from "../subagentOutputScan.js";
import { withUntrustedPreamble } from "../messages/untrustedArtifactContent.js";
import { logError } from "../log.js";
import { jsonParse } from "../slowOperations.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";

//@ chunk-s4bxxzsw.js:60333-61640 placement
/**
 * 汇总队友（teammate）自上次唤醒以来的工作，生成空闲时交给 leader 的结果文本：取最后的点对点私信摘要、本轮 SendMessage 调用及其结果、最后的助手文本等。
 */
function buildTeammateIdleResult(messages, r) {
  let { live, notice } = dropRetractedOnResume(messages, {
    suppressDropTelemetry: true,
  });
  let summary = getLastPeerDmSummary(live);
  let R = -1;
  for (let j = live.length - 1; j >= 0; j--) {
    let message = live[j];
    if (message && isTeammateWakeupPrompt(message)) {
      R = j;
      break;
    }
  }
  let C = new Set();
  for (let j = R + 1; j < live.length; j++) {
    let k = live[j];
    if (!k || k.type !== "assistant") continue;
    for (let T of k.message.content) if (T.type === "tool_use" && T.name === SENDMESSAGE) C.add(T.id);
  }
  let D = new Map();
  for (let j = R + 1; j < live.length; j++) {
    let k = live[j];
    if (!k || k.type !== "user" || typeof k.message.content === "string") continue;
    for (let T of k.message.content)
      if (T.type === "tool_result" && C.has(T.tool_use_id))
        D.set(T.tool_use_id, T.is_error !== true && !collectTextParts(T.content));
  }
  for (let j = live.length - 1; j >= 0; j--) {
    let message = live[j];
    if (!message) continue;
    if (isTeammateWakeupPrompt(message)) break;
    if (message.type !== "assistant" || message.isApiErrorMessage) continue;
    if (
      message.message.content.some(
        (w) =>
          w.type === "tool_use" &&
          w.name === SENDMESSAGE &&
          typeof w.input === "object" &&
          w.input !== null &&
          "to" in w.input &&
          typeof w.input.to === "string" &&
          (w.input.to === TEAM_LEAD || w.input.to === MAIN) &&
          D.get(w.id) === true,
      )
    ) {
      if (r?.emitTelemetry === true) logFeatureSad("swarm_idle_result_delivery", "suppressed_lead_dm");
      return {
        result: undefined,
        summary,
      };
    }
    if (!hasNonEmptyText(message.message.content)) continue;
    let joined = message.message.content.flatMap((w) =>
      w.type === "text" && typeof w.text === "string" ? [w.text] : [],
    ).join(`
`);
    if (joined) {
      let sanitized = sanitizeSubagentOutput(joined).sanitized;
      let B =
        withUntrustedPreamble(messages) +
        (notice
          ? `\u26A0 ${notice.content}
`
          : "");
      return {
        result: B
          ? `${B}
${sanitized}`
          : sanitized,
        summary,
      };
    }
  }
  return {
    result: undefined,
    summary,
  };
}
//@ chunk-s4bxxzsw.js:61640-61676 placement
/**
 * 取队友空闲结果的文本部分。
 */
function teammateIdleResultText(messages) {
  return buildTeammateIdleResult(messages).result;
}
//@ chunk-s4bxxzsw.js:61676-61766 placement
/**
 * 安全地构造队友空闲结果（失败返回空结果）。
 */
function safeTeammateIdleResult(messages, r) {
  try {
    return buildTeammateIdleResult(messages, r);
  } catch (error) {
    logError(error);
    return {
      result: undefined,
      summary: undefined,
    };
  }
}
//@ chunk-s4bxxzsw.js:61766-62132 placement
function collectTextParts(content) {
  let r = [];
  if (typeof content === "string") r.push(content);
  else if (Array.isArray(content)) {
    for (let n of content)
      if (
        n !== null &&
        typeof n === "object" &&
        "type" in n &&
        n.type === "text" &&
        "text" in n &&
        typeof n.text === "string"
      )
        r.push(n.text);
  }
  for (let n of r) {
    if (!n.startsWith("{")) continue;
    try {
      let s = jsonParse(n);
      if (s !== null && typeof s === "object" && "success" in s && s.success === false) return true;
    } catch {}
  }
  return false;
}
//@ chunk-s4bxxzsw.js:62132-62273 placement
class TeammatePermissionContextSlot {
  permissionContextSetter = null;
  registerSetter(permissionContextSetter) {
    this.permissionContextSetter = permissionContextSetter;
  }
  unregisterSetter() {
    this.permissionContextSetter = null;
  }
}
//@ chunk-s4bxxzsw.js:62273-62300 placement
/**
 * 按会话根缓存的队友权限上下文槽。
 */
var teammatePermissionContextBySessionRoot = new SessionRootSlot(() => new TeammatePermissionContextSlot());
export { safeTeammateIdleResult, teammatePermissionContextBySessionRoot, teammateIdleResultText };
