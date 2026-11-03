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
import { YM, r1 } from "../../services/mcp/redactMcpErrors.js";

//@ chunk-2sw13wfh.js:419-491 fingerprint = _temp4 (0.681)
function t$r(client_2) {
  return (client_2.type === "failed" && !YM(client_2)) || client_2.type === "needs-auth";
}
//@ chunk-2sw13wfh.js:491-535 placement
function isUnhiddenFailedServer(e, n) {
  return t$r(e) && !n(e.name);
}
/**
 * 判断 MCP 服务器是否应出现在连接状态提示中：排除隐藏与 IDE 服务器，claude.ai 连接器按资格与回调判断。
 */
//@ chunk-e6aww6q8.js:3574628-3574833 fingerprint = _temp (0.918)
function isNoticeableMcpServer(e, n, r) {
  if (YM(e) || r1(e)) return !1;
  if (e.config.type === "claudeai-proxy") {
    if (e.config.eligible === !1 && !r(e.name)) return !1;
    return n(e.name);
  }
  return e.config.type !== "sse-ide" && e.config.type !== "ws-ide";
}

export { isNoticeableMcpServer, isUnhiddenFailedServer, t$r };
