/**
 * bridge/bridgePermissionCallbacks.ts
 *
 * 并入已有模块：桥接权限回调的辅助声明。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/bridge/bridgePermissionCallbacks.ts
 * pieces: chunk-gv8haye8.js (5)
 * attribution: placement 3, layout 1, fingerprint 1
 */
import { isPluginServerConfig } from "../services/mcp/types.js";
import { startupCcrEnv } from "../tasks/RemoteAgentTask/remoteAgentKinds.js";
import { isCcrSessionScopedMcpUrl } from "../services/mcp/ccrMcpUrls.js";
import {
  stripHostToolMeta,
  ANTHROPIC_SOURCES,
  COM_ANTHROPIC_SOURCES_RELAY,
  RANDOM_PLUGIN_META_ID,
} from "../plugins/functionHooks/sites/toolSites.js";

//@ chunk-gv8haye8.js:496-620 placement
function isCcrSessionScopedServer(server) {
  return (
    server.scope === "dynamic" &&
    !isPluginServerConfig(server) &&
    startupCcrEnv.bridgeCarrier === undefined &&
    "url" in server &&
    typeof server.url === "string" &&
    isCcrSessionScopedMcpUrl(server.url)
  );
}
//@ chunk-gv8haye8.js:620-659 placement
/**
 * CCR 会话级服务器保留 host 元数据，其余情况剥掉 host 工具元数据（桥接权限回调的前置处理）。
 */
function stripHostMetaUnlessCcrScoped(server, requestMeta) {
  return isCcrSessionScopedServer(server) ? requestMeta : stripHostToolMeta(requestMeta);
}
//@ chunk-gv8haye8.js:659-753 placement
/**
 * CCR 会话级服务器上把 anthropic/sources 改写为中继来源标记，其他情况原样返回。
 */
function rewriteAnthropicSourcesForCcr(server, sources) {
  if (
    sources === undefined ||
    !Object.hasOwn(sources, ANTHROPIC_SOURCES) ||
    !isCcrSessionScopedServer(server)
  )
    return sources;
  return {
    ...sources,
    [COM_ANTHROPIC_SOURCES_RELAY]: RANDOM_PLUGIN_META_ID,
  };
}
//@ chunk-gv8haye8.js:753-812 layout
var APPROVALTICKET = "approvalTicket";
var ANTHROPIC_APPROVALTICKET = "anthropic/approvalTicket";
var MAX_APPROVAL_TICKET_CHARS = 8192;
//@ chunk-gv8haye8.js:812-979 fingerprint = isBridgePermissionResponse (1)
/**
 * allow 决定若带非空且不超长的审批票据（APPROVALTICKET 字段）则返回票据，否则 undefined。
 */
function getApprovalTicket(decision) {
  let ticket =
    typeof decision === "object" &&
    decision !== null &&
    "behavior" in decision &&
    decision.behavior === "allow" &&
    APPROVALTICKET in decision
      ? decision[APPROVALTICKET]
      : undefined;
  return typeof ticket === "string" && ticket !== "" && ticket.length <= MAX_APPROVAL_TICKET_CHARS
    ? ticket
    : undefined;
}
export {
  stripHostMetaUnlessCcrScoped,
  rewriteAnthropicSourcesForCcr,
  getApprovalTicket,
  isCcrSessionScopedServer,
  ANTHROPIC_APPROVALTICKET,
  APPROVALTICKET,
};
