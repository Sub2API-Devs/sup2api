/**
 * bridge/mcpApprovalTickets.ts
 *
 * 2.1.316 新增：为主会话里某次 MCP 工具调用记下审批票据（按 toolUseId），用于远端审批回传时核对；按 toolUseId 取出审批票据并核对服务器名与中继来源，不符时上报原因并拒绝。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-rz26abj6.js (8)
 * attribution: placement 8
 */
import { SessionRootSlot } from "../bootstrap/sessionSlices.js";
import { recordToolUseDecision } from "../components/permissions/hooks.js";
import { logFeatureSad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { excludeMainSessionAgentId } from "../utils/agentContext.js";
import {
  isCcrSessionScopedServer,
  ANTHROPIC_APPROVALTICKET,
  APPROVALTICKET,
} from "./bridgePermissionCallbacks.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-rz26abj6.js:979-1040 placement
var MCP_APPROVAL_TICKETS_SLOT; // deferred: uses SessionRootSlot (../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-rz26abj6.js:979", () => {
  MCP_APPROVAL_TICKETS_SLOT = new SessionRootSlot(() => ({
    byToolUse: new Map(),
    ofLateAllows: new Map(),
  }));
});
//@ chunk-rz26abj6.js:1040-1172 placement
function recordMcpApprovalTicket(session, toolUseId, serverName, ticket) {
  if (toolUseId === "") return;
  MCP_APPROVAL_TICKETS_SLOT.of(session).byToolUse.set(toolUseId, {
    serverName,
    ticket,
  });
  recordToolUseDecision(session, toolUseId, () => {
    MCP_APPROVAL_TICKETS_SLOT.peek(session)?.byToolUse.delete(toolUseId);
  });
}
//@ chunk-rz26abj6.js:1172-1493 placement
/**
 * 为主会话里某次 MCP 工具调用记下审批票据（按 toolUseId），用于远端审批回传时核对。
 */
function recordMcpApprovalTicket_2(ticket, input, toolUseId, context) {
  let serverName = input.mcpInfo?.serverName;
  if (ticket === undefined || serverName === undefined || context.forRemoteExecution === true) return;
  if (context.permissionRound === undefined && context.toolUseId !== toolUseId) {
    logFeatureSad("mcp_approval_ticket", "not_own_id");
    return;
  }
  if (excludeMainSessionAgentId(context.agentId, context.agentContext) !== undefined) {
    logFeatureSad("mcp_approval_ticket", "not_main_conversation");
    return;
  }
  recordMcpApprovalTicket(context.session, toolUseId, serverName, ticket);
}
//@ chunk-rz26abj6.js:1493-1620 placement
/**
 * 记下（或在值为 undefined 时清除）某会话里某键对应的"迟到放行"结果；会话为 undefined 时忽略。
 */
function setLateAllowDecision(session, toolUseId, decision) {
  if (session === undefined) return;
  if (decision === undefined) {
    MCP_APPROVAL_TICKETS_SLOT.peek(session)?.ofLateAllows.delete(toolUseId);
    return;
  }
  MCP_APPROVAL_TICKETS_SLOT.of(session).ofLateAllows.set(toolUseId, decision);
}
//@ chunk-rz26abj6.js:1620-1720 placement
/**
 * 取出并删除某会话里某键的"迟到放行"结果（一次性读取）。
 */
function takeLateAllowDecision(session, toolUseId) {
  let ofLateAllows =
    session === undefined ? undefined : MCP_APPROVAL_TICKETS_SLOT.peek(session)?.ofLateAllows;
  let decision = ofLateAllows?.get(toolUseId);
  ofLateAllows?.delete(toolUseId);
  return decision;
}
//@ chunk-rz26abj6.js:1720-2021 placement
/**
 * 按 toolUseId 取出审批票据并核对服务器名与中继来源，不符时上报原因并拒绝。
 */
function consumeMcpApprovalTicket(session, toolUseId, name, server) {
  if (session === undefined || toolUseId === undefined) return;
  let byToolUse = MCP_APPROVAL_TICKETS_SLOT.peek(session)?.byToolUse;
  let record = byToolUse?.get(toolUseId);
  if (record === undefined) return;
  if (record.serverName !== name) {
    logFeatureSad("mcp_approval_ticket", "other_server");
    return;
  }
  if (!isCcrSessionScopedServer(server)) {
    logFeatureSad("mcp_approval_ticket", "not_own_relay");
    return;
  }
  byToolUse?.delete(toolUseId);
  logFeatureOk("mcp_approval_ticket");
  return {
    [ANTHROPIC_APPROVALTICKET]: record.ticket,
  };
}
//@ chunk-rz26abj6.js:2021-2087 placement
/**
 * 桥接权限输入处理：删掉输入里的 anthropic/approvalTicket 字段，并把消费审批票据的结果合并进输入。
 */
function consumeTicketIntoInput(meta, session, toolUseId, name, config) {
  delete meta[ANTHROPIC_APPROVALTICKET];
  Object.assign(meta, consumeMcpApprovalTicket(session, toolUseId, name, config));
}
//@ chunk-rz26abj6.js:2087-2283 placement (2.1.88 match: getRiskColor, 0.786)
function getRiskColor(riskLevel) {
  let { response } = riskLevel;
  if (response.subtype !== "success") return riskLevel;
  let response_2 = response.response;
  if (typeof response_2 !== "object" || response_2 === null || !(APPROVALTICKET in response_2))
    return riskLevel;
  let { [APPROVALTICKET]: ticket, ...rest } = response_2;
  return {
    ...riskLevel,
    response: {
      ...response,
      response: rest,
    },
  };
}
export {
  consumeMcpApprovalTicket,
  consumeTicketIntoInput,
  recordMcpApprovalTicket_2,
  getRiskColor,
  setLateAllowDecision,
  takeLateAllowDecision,
};
