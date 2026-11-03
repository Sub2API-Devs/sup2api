/**
 * bridge/mcpApprovalTickets.ts
 *
 * 2.1.316 新增：为主会话里某次 MCP 工具调用记下审批票据（按 toolUseId），用于远端审批回传时核对；按 toolUseId 取出审批票据并核对服务器名与中继来源，不符时上报原因并拒绝。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-gv8haye8.js (8)
 * attribution: placement 8
 */
import { SessionRootSlot } from "../bootstrap/sessionSlices.js";
import { kCt } from "../components/permissions/hooks.js";
import { logFeatureSad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { excludeMainSessionAgentId } from "../utils/agentContext.js";
import {
  isCcrSessionScopedServer,
  ANTHROPIC_APPROVALTICKET,
  APPROVALTICKET,
} from "./bridgePermissionCallbacks.js";

//@ chunk-gv8haye8.js:979-1040 placement
var i = new SessionRootSlot(() => ({ byToolUse: new Map(), ofLateAllows: new Map() }));
//@ chunk-gv8haye8.js:1040-1172 placement
function recordMcpApprovalTicket(e, n, t, o) {
  if (n === "") return;
  (i.of(e).byToolUse.set(n, { serverName: t, ticket: o }),
    kCt(e, n, () => {
      i.peek(e)?.byToolUse.delete(n);
    }));
}
/**
 * 为主会话里某次 MCP 工具调用记下审批票据（按 toolUseId），用于远端审批回传时核对。
 */
//@ chunk-gv8haye8.js:1172-1493 placement
function recordMcpApprovalTicket_2(e, n, t, o) {
  let r = n.mcpInfo?.serverName;
  if (e === void 0 || r === void 0 || o.forRemoteExecution === !0) return;
  if (o.permissionRound === void 0 && o.toolUseId !== t) {
    logFeatureSad("mcp_approval_ticket", "not_own_id");
    return;
  }
  if (excludeMainSessionAgentId(o.agentId, o.agentContext) !== void 0) {
    logFeatureSad("mcp_approval_ticket", "not_main_conversation");
    return;
  }
  recordMcpApprovalTicket(o.session, t, r, e);
}
/**
 * 记下（或在值为 undefined 时清除）某会话里某键对应的"迟到放行"结果；会话为 undefined 时忽略。
 */
//@ chunk-gv8haye8.js:1493-1620 placement
function setLateAllowDecision(e, n, t) {
  if (e === void 0) return;
  if (t === void 0) {
    i.peek(e)?.ofLateAllows.delete(n);
    return;
  }
  i.of(e).ofLateAllows.set(n, t);
}
/**
 * 取出并删除某会话里某键的"迟到放行"结果（一次性读取）。
 */
//@ chunk-gv8haye8.js:1620-1720 placement
function takeLateAllowDecision(e, n) {
  let t = e === void 0 ? void 0 : i.peek(e)?.ofLateAllows,
    o = t?.get(n);
  return (t?.delete(n), o);
}
/**
 * 按 toolUseId 取出审批票据并核对服务器名与中继来源，不符时上报原因并拒绝。
 */
//@ chunk-gv8haye8.js:1720-2021 placement
function consumeMcpApprovalTicket(e, n, t, o) {
  if (e === void 0 || n === void 0) return;
  let r = i.peek(e)?.byToolUse,
    d = r?.get(n);
  if (d === void 0) return;
  if (d.serverName !== t) {
    logFeatureSad("mcp_approval_ticket", "other_server");
    return;
  }
  if (!isCcrSessionScopedServer(o)) {
    logFeatureSad("mcp_approval_ticket", "not_own_relay");
    return;
  }
  return (r?.delete(n), logFeatureOk("mcp_approval_ticket"), { [ANTHROPIC_APPROVALTICKET]: d.ticket });
}
//@ chunk-gv8haye8.js:2021-2087 placement
function yYn(e, n, t, o, r) {
  (delete e[ANTHROPIC_APPROVALTICKET], Object.assign(e, consumeMcpApprovalTicket(n, t, o, r)));
}
//@ chunk-gv8haye8.js:2087-2283 placement = getRiskColor (0.785)
function getRiskColor(riskLevel) {
  let { response: response } = riskLevel;
  if (response.subtype !== "success") return riskLevel;
  let response_2 = response.response;
  if (typeof response_2 !== "object" || response_2 === null || !(APPROVALTICKET in response_2))
    return riskLevel;
  let { [APPROVALTICKET]: o, ...r } = response_2;
  return { ...riskLevel, response: { ...response, response: r } };
}

export {
  takeLateAllowDecision,
  recordMcpApprovalTicket_2,
  consumeMcpApprovalTicket,
  yYn,
  getRiskColor,
  setLateAllowDecision,
};
