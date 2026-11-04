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
/**
 * 会话 id 的两种前缀（cse_、session_）。
 */
var CCR_SESSION_ID_PREFIXES = ["cse_", "session_"];
//@ chunk-cjydagjy.js:20155-20897 placement
/**
 * 改写本会话 CCR MCP 地址的会话前缀。
 */
function rewriteCcrSessionMcpUrl(serverName, serverConfig) {
  let parsed = ccrSessionIdFromMcpUrl(serverConfig.url);
  let found = CCR_SESSION_ID_PREFIXES.find((prefix) => parsed?.sessionSegment.startsWith(prefix));
  if (!parsed || found === undefined) return;
  let bareId = sessionIdBody(parsed.sessionSegment);
  if (
    !startupCcrEnv.ownCcrSessionIds.some((ownCcrSessionId) => sessionIdBody(ownCcrSessionId) === bareId) ||
    parsed.mcpServerId !== derivedServerId(parsed.sessionSegment, serverName)
  )
    return;
  let flippedSegment = `${found === "cse_" ? "session_" : "cse_"}${bareId}`;
  let flippedServerId = derivedServerId(flippedSegment, serverName);
  let [baseUrl, query, ...extraParts] = serverConfig.url.split("?");
  let expectedPath = `/v2/ccr-sessions/${parsed.sessionSegment}/mcp`;
  let queryParts = query?.split("&") ?? [];
  let serverIdParam = `mcp_server_id=${parsed.mcpServerId}`;
  if (
    baseUrl === undefined ||
    extraParts.length > 0 ||
    !baseUrl.endsWith(expectedPath) ||
    count(queryParts, (part) => part === serverIdParam) !== 1
  )
    return;
  let rewrittenUrl = `${baseUrl.slice(0, -expectedPath.length)}/v2/ccr-sessions/${flippedSegment}/mcp?${queryParts.map((part) => (part === serverIdParam ? `mcp_server_id=${flippedServerId}` : part)).join("&")}`;
  let reparsed = ccrSessionIdFromMcpUrl(rewrittenUrl);
  return reparsed?.sessionSegment === flippedSegment &&
    reparsed.mcpServerId === flippedServerId &&
    reparsed.toolboxMcpServerId === parsed.toolboxMcpServerId &&
    reparsed.upstreamUrl === parsed.upstreamUrl
    ? {
        ...serverConfig,
        url: rewrittenUrl,
      }
    : undefined;
}
export { rewriteCcrSessionMcpUrl };
