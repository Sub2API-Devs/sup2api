/**
 * hooks/notifs/useMcpConnectivityStatus.tsx
 *
 * MCP 服务器连接失败/需要认证的通知（排除 IDE 与 claude.ai 代理）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/notifs/useMcpConnectivityStatus.tsx
 * pieces: chunk-2sw13wfh.js (2), chunk-e6aww6q8.js (1)
 * attribution: fingerprint 2, placement 1
 */
import { isUnconfiguredFailure, isArtifacts404Failure } from "../../services/mcp/redactMcpErrors.js";

//@ chunk-2sw13wfh.js:419-491 fingerprint = _temp4 (0.681)
/**
 * 函数 isMcpConnectivityIssue（failed（非认证类）或 needs-auth）；位于「MCP 服务器连接失败/需要认证的通知（排除 IDE 与 claude.ai 代理）」模块。
 */
function isMcpConnectivityIssue(client) {
  return (client.type === "failed" && !isUnconfiguredFailure(client)) || client.type === "needs-auth";
}
//@ chunk-2sw13wfh.js:491-535 placement
function isUnhiddenFailedServer(e, n) {
  return isMcpConnectivityIssue(e) && !n(e.name);
}
//@ chunk-e6aww6q8.js:3574628-3574833 fingerprint = _temp (0.918)
/**
 * 判断 MCP 服务器是否应出现在连接状态提示中：排除隐藏与 IDE 服务器，claude.ai 连接器按资格与回调判断。
 */
function isNoticeableMcpServer(client, n, r) {
  if (isUnconfiguredFailure(client) || isArtifacts404Failure(client)) return false;
  if (client.config.type === "claudeai-proxy") {
    if (client.config.eligible === false && !r(client.name)) return false;
    return n(client.name);
  }
  return client.config.type !== "sse-ide" && client.config.type !== "ws-ide";
}
export { isNoticeableMcpServer, isUnhiddenFailedServer, isMcpConnectivityIssue };
