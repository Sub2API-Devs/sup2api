/**
 * services/mcp/ccrSessionMcpUrl.ts
 *
 * 2.1.316 新增：改写本会话 CCR MCP 地址的会话前缀。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-cjydagjy.js (2)
 * attribution: placement 2
 */
import { ccrSessionIdFromMcpUrl } from "./ccrMcpUrls.js";
import { sessionIdBody } from "../../bridge/sessionIdCompat.js";
import { startupCcrEnv } from "../../tasks/RemoteAgentTask/remoteAgentKinds.js";
import { derivedServerId } from "./firstPartyServerIds.js";
import { count } from "../../utils/collections.js";

//@ chunk-cjydagjy.js:20128-20155 placement
var Yo = ["cse_", "session_"];
/**
 * 改写本会话 CCR MCP 地址的会话前缀。
 */
//@ chunk-cjydagjy.js:20155-20897 placement
function rewriteCcrSessionMcpUrl(e, r) {
  let n = ccrSessionIdFromMcpUrl(r.url),
    found = Yo.find((x) => n?.sessionSegment.startsWith(x));
  if (!n || found === void 0) return;
  let S = sessionIdBody(n.sessionSegment);
  if (
    !startupCcrEnv.ownCcrSessionIds.some((ownCcrSessionId) => sessionIdBody(ownCcrSessionId) === S) ||
    n.mcpServerId !== derivedServerId(n.sessionSegment, e)
  )
    return;
  let y = `${found === "cse_" ? "session_" : "cse_"}${S}`,
    P = derivedServerId(y, e),
    [E, A, ...M] = r.url.split("?"),
    h = `/v2/ccr-sessions/${n.sessionSegment}/mcp`,
    k = A?.split("&") ?? [],
    L = `mcp_server_id=${n.mcpServerId}`;
  if (E === void 0 || M.length > 0 || !E.endsWith(h) || count(k, (x) => x === L) !== 1) return;
  let U = `${E.slice(0, -h.length)}/v2/ccr-sessions/${y}/mcp?${k.map((x) => (x === L ? `mcp_server_id=${P}` : x)).join("&")}`,
    q = ccrSessionIdFromMcpUrl(U);
  return q?.sessionSegment === y &&
    q.mcpServerId === P &&
    q.toolboxMcpServerId === n.toolboxMcpServerId &&
    q.upstreamUrl === n.upstreamUrl
    ? { ...r, url: U }
    : void 0;
}

export { rewriteCcrSessionMcpUrl };
