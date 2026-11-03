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

//@ chunk-e6aww6q8.js:3247040-3247357 fingerprint = useIdeConnectionStatus (1)
function useIdeConnectionStatus(mcpClients) {
  let found = mcpClients.find((client) => client.name === "ide");
  if (!found) return { status: null, ideName: null };
  let config = found.config,
    ideName = config.type === "sse-ide" || config.type === "ws-ide" ? config.ideName : null;
  if (found.type === "connected") return { status: "connected", ideName: ideName };
  if (found.type === "pending") return { status: "pending", ideName: ideName };
  return { status: "disconnected", ideName: ideName };
}

export { useIdeConnectionStatus };
