/**
 * hooks/useIdeConnectionStatus.ts
 *
 * 从 MCP 客户端列表得出 IDE 连接状态（connected/pending/disconnected）与 IDE 名称。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useIdeConnectionStatus.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */

//@ chunk-e6aww6q8.js:3247040-3247357 fingerprint (2.1.88 match: useIdeConnectionStatus, 1)
function useIdeConnectionStatus(mcpClients) {
  let ideClient = mcpClients.find((client) => client.name === "ide");
  if (!ideClient)
    return {
      status: null,
      ideName: null,
    };
  let config = ideClient.config;
  let ideName = config.type === "sse-ide" || config.type === "ws-ide" ? config.ideName : null;
  if (ideClient.type === "connected")
    return {
      status: "connected",
      ideName,
    };
  if (ideClient.type === "pending")
    return {
      status: "pending",
      ideName,
    };
  return {
    status: "disconnected",
    ideName,
  };
}
export { useIdeConnectionStatus };
