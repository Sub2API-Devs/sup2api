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
import { zPe } from "../messages/untrustedArtifactContent.js";
import { logError } from "../log.js";
import { jsonParse } from "../slowOperations.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";

/**
 * 汇总队友（teammate）自上次唤醒以来的工作，生成空闲时交给 leader 的结果文本：取最后的点对点私信摘要、本轮 SendMessage 调用及其结果、最后的助手文本等。
 */
//@ chunk-s4bxxzsw.js:60333-61640 placement
function buildTeammateIdleResult(messages, r) {
  let { live: live, notice: notice } = dropRetractedOnResume(messages, { suppressDropTelemetry: !0 }),
    y = getLastPeerDmSummary(live),
    R = -1;
  for (let S = live.length - 1; S >= 0; S--) {
    let k = live[S];
    if (k && isTeammateWakeupPrompt(k)) {
      R = S;
      break;
    }
  }
  let C = new Set();
  for (let S = R + 1; S < live.length; S++) {
    let k = live[S];
    if (!k || k.type !== "assistant") continue;
    for (let T of k.message.content) if (T.type === "tool_use" && T.name === SENDMESSAGE) C.add(T.id);
  }
  let D = new Map();
  for (let S = R + 1; S < live.length; S++) {
    let k = live[S];
    if (!k || k.type !== "user" || typeof k.message.content === "string") continue;
    for (let T of k.message.content)
      if (T.type === "tool_result" && C.has(T.tool_use_id))
        D.set(T.tool_use_id, T.is_error !== !0 && !collectTextParts(T.content));
  }
  for (let S = live.length - 1; S >= 0; S--) {
    let k = live[S];
    if (!k) continue;
    if (isTeammateWakeupPrompt(k)) break;
    if (k.type !== "assistant" || k.isApiErrorMessage) continue;
    if (
      k.message.content.some(
        (w) =>
          w.type === "tool_use" &&
          w.name === SENDMESSAGE &&
          typeof w.input === "object" &&
          w.input !== null &&
          "to" in w.input &&
          typeof w.input.to === "string" &&
          (w.input.to === TEAM_LEAD || w.input.to === MAIN) &&
          D.get(w.id) === !0,
      )
    ) {
      if (r?.emitTelemetry === !0) logFeatureSad("swarm_idle_result_delivery", "suppressed_lead_dm");
      return { result: void 0, summary: y };
    }
    if (!hasNonEmptyText(k.message.content)) continue;
    let joined = k.message.content.flatMap((w) =>
      w.type === "text" && typeof w.text === "string" ? [w.text] : [],
    ).join(`
`);
    if (joined) {
      let sanitized = sanitizeSubagentOutput(joined).sanitized,
        B =
          zPe(messages) +
          (notice
            ? `\u26A0 ${notice.content}
`
            : "");
      return {
        result: B
          ? `${B}
${sanitized}`
          : sanitized,
        summary: y,
      };
    }
  }
  return { result: void 0, summary: y };
}
//@ chunk-s4bxxzsw.js:61640-61676 placement
function R0s(e) {
  return buildTeammateIdleResult(e).result;
}
//@ chunk-s4bxxzsw.js:61676-61766 placement
function yht(e, r) {
  try {
    return buildTeammateIdleResult(e, r);
  } catch (error) {
    return (logError(error), { result: void 0, summary: void 0 });
  }
}
//@ chunk-s4bxxzsw.js:61766-62132 placement
function collectTextParts(e) {
  let r = [];
  if (typeof e === "string") r.push(e);
  else if (Array.isArray(e)) {
    for (let n of e)
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
      if (s !== null && typeof s === "object" && "success" in s && s.success === !1) return !0;
    } catch {}
  }
  return !1;
}
//@ chunk-s4bxxzsw.js:62132-62273 placement
class TeammatePermissionContextSlot {
  permissionContextSetter = null;
  registerSetter(e) {
    this.permissionContextSetter = e;
  }
  unregisterSetter() {
    this.permissionContextSetter = null;
  }
}
//@ chunk-s4bxxzsw.js:62273-62300 placement
var mWn = new SessionRootSlot(() => new TeammatePermissionContextSlot());

export { yht, mWn, R0s };
