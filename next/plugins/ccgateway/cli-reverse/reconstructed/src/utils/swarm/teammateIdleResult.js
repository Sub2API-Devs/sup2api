/**
 * utils/swarm/teammateIdleResult.ts
 *
 * 2.1.316 新增：队友空闲结果文本。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-g4tsxwy3.js (6)
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-g4tsxwy3.js:61771-63077 placement
/**
 * 汇总队友（teammate）自上次唤醒以来的工作，生成空闲时交给 leader 的结果文本：取最后的点对点私信摘要、本轮 SendMessage 调用及其结果、最后的助手文本等。
 */
function buildTeammateIdleResult(messages, options) {
  let { live, notice } = dropRetractedOnResume(messages, {
    suppressDropTelemetry: true,
  });
  let summary = getLastPeerDmSummary(live);
  let wakeupIndex = -1;
  for (let j = live.length - 1; j >= 0; j--) {
    let message = live[j];
    if (message && isTeammateWakeupPrompt(message)) {
      wakeupIndex = j;
      break;
    }
  }
  let sendMessageIds = new Set();
  for (let j = wakeupIndex + 1; j < live.length; j++) {
    let message = live[j];
    if (!message || message.type !== "assistant") continue;
    for (let block of message.message.content)
      if (block.type === "tool_use" && block.name === SENDMESSAGE) sendMessageIds.add(block.id);
  }
  let deliveryById = new Map();
  for (let j = wakeupIndex + 1; j < live.length; j++) {
    let message = live[j];
    if (!message || message.type !== "user" || typeof message.message.content === "string") continue;
    for (let block of message.message.content)
      if (block.type === "tool_result" && sendMessageIds.has(block.tool_use_id))
        deliveryById.set(block.tool_use_id, block.is_error !== true && !collectTextParts(block.content));
  }
  for (let j = live.length - 1; j >= 0; j--) {
    let message = live[j];
    if (!message) continue;
    if (isTeammateWakeupPrompt(message)) break;
    if (message.type !== "assistant" || message.isApiErrorMessage) continue;
    if (
      message.message.content.some(
        (block) =>
          block.type === "tool_use" &&
          block.name === SENDMESSAGE &&
          typeof block.input === "object" &&
          block.input !== null &&
          "to" in block.input &&
          typeof block.input.to === "string" &&
          (block.input.to === TEAM_LEAD || block.input.to === MAIN) &&
          deliveryById.get(block.id) === true,
      )
    ) {
      if (options?.emitTelemetry === true) logFeatureSad("swarm_idle_result_delivery", "suppressed_lead_dm");
      return {
        result: undefined,
        summary,
      };
    }
    if (!hasNonEmptyText(message.message.content)) continue;
    let joined = message.message.content.flatMap((block) =>
      block.type === "text" && typeof block.text === "string" ? [block.text] : [],
    ).join(`
`);
    if (joined) {
      let sanitized = sanitizeSubagentOutput(joined).sanitized;
      let preamble =
        withUntrustedPreamble(messages) +
        (notice
          ? `\u26A0 ${notice.content}
`
          : "");
      return {
        result: preamble
          ? `${preamble}
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
//@ chunk-g4tsxwy3.js:63077-63113 placement
/**
 * 取队友空闲结果的文本部分。
 */
function teammateIdleResultText(messages) {
  return buildTeammateIdleResult(messages).result;
}
//@ chunk-g4tsxwy3.js:63113-63203 placement
/**
 * 安全地构造队友空闲结果（失败返回空结果）。
 */
function safeTeammateIdleResult(messages, options) {
  try {
    return buildTeammateIdleResult(messages, options);
  } catch (error) {
    logError(error);
    return {
      result: undefined,
      summary: undefined,
    };
  }
}
//@ chunk-g4tsxwy3.js:63203-63569 placement
function collectTextParts(content) {
  let texts = [];
  if (typeof content === "string") texts.push(content);
  else if (Array.isArray(content)) {
    for (let block of content)
      if (
        block !== null &&
        typeof block === "object" &&
        "type" in block &&
        block.type === "text" &&
        "text" in block &&
        typeof block.text === "string"
      )
        texts.push(block.text);
  }
  for (let text of texts) {
    if (!text.startsWith("{")) continue;
    try {
      let parsed = jsonParse(text);
      if (parsed !== null && typeof parsed === "object" && "success" in parsed && parsed.success === false)
        return true;
    } catch {}
  }
  return false;
}
//@ chunk-g4tsxwy3.js:63569-63710 placement
class TeammatePermissionContextSlot {
  permissionContextSetter = null;
  registerSetter(permissionContextSetter) {
    this.permissionContextSetter = permissionContextSetter;
  }
  unregisterSetter() {
    this.permissionContextSetter = null;
  }
}
//@ chunk-g4tsxwy3.js:63710-63737 placement
/**
 * 按会话根缓存的队友权限上下文槽。
 */
var teammatePermissionContextBySessionRoot; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-g4tsxwy3.js:63710", () => {
  teammatePermissionContextBySessionRoot = new SessionRootSlot(() => new TeammatePermissionContextSlot());
});
export { teammatePermissionContextBySessionRoot, safeTeammateIdleResult, teammateIdleResultText };
