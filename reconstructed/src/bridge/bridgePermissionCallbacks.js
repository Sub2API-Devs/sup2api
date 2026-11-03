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
  Ffr,
} from "../plugins/functionHooks/sites/toolSites.js";

//@ chunk-gv8haye8.js:496-620 placement
function isCcrSessionScopedServer(e) {
  return (
    e.scope === "dynamic" &&
    !isPluginServerConfig(e) &&
    startupCcrEnv.bridgeCarrier === void 0 &&
    "url" in e &&
    typeof e.url === "string" &&
    isCcrSessionScopedMcpUrl(e.url)
  );
}
//@ chunk-gv8haye8.js:620-659 placement
function mYn(e, n) {
  return isCcrSessionScopedServer(e) ? n : stripHostToolMeta(n);
}
//@ chunk-gv8haye8.js:659-753 placement
function gYn(e, n) {
  if (n === void 0 || !Object.hasOwn(n, ANTHROPIC_SOURCES) || !isCcrSessionScopedServer(e)) return n;
  return { ...n, [COM_ANTHROPIC_SOURCES_RELAY]: Ffr };
}
//@ chunk-gv8haye8.js:753-812 layout
var APPROVALTICKET = "approvalTicket",
  ANTHROPIC_APPROVALTICKET = "anthropic/approvalTicket",
  c = 8192;
/**
 * allow 决定若带非空且不超长的审批票据（APPROVALTICKET 字段）则返回票据，否则 undefined。
 */
//@ chunk-gv8haye8.js:812-979 fingerprint = isBridgePermissionResponse (1)
function getApprovalTicket(decision) {
  let n =
    typeof decision === "object" &&
    decision !== null &&
    "behavior" in decision &&
    decision.behavior === "allow" &&
    APPROVALTICKET in decision
      ? decision[APPROVALTICKET]
      : void 0;
  return typeof n === "string" && n !== "" && n.length <= c ? n : void 0;
}

export { mYn, gYn, getApprovalTicket, isCcrSessionScopedServer, ANTHROPIC_APPROVALTICKET, APPROVALTICKET };
