/**
 * coordinator/coordinatorMcpServers.ts
 *
 * 2.1.316 新增：协调者模式下等待子代理的 MCP 服务器连接、排除 comms 角色服务器的工具
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-h4jqyaw4.js (7)
 * attribution: placement 7
 */
import { getMcpPrefix, isToolFromMcpServer } from "../services/mcp/mcpStringUtils.js";
import { sleep } from "../utils/sleep.js";
import { isCoordinatorMode_2 } from "./coordinatorMode.js";
import { TRANSPORT_FALLBACK_TIMEOUT_MS } from "../services/mcp/client.js";

//@ chunk-h4jqyaw4.js:338-439 placement
/**
 * 判断 MCP 服务器是否仍在连接中且其工具尚未出现在工具列表里。
 */
function isPendingServerWithoutTools(server, tools) {
  if (server.type !== "pending") return false;
  let mcpPrefix = getMcpPrefix(server.name);
  return !tools.some((tool) => isToolFromMcpServer(tool, server.name, mcpPrefix));
}
//@ chunk-h4jqyaw4.js:439-642 placement
/**
 * 轮询等待 MCP 客户端状态：只要还有满足条件（如仍在连接）的客户端就继续等，直到超时或满足 until 条件。
 */
async function waitForMcpClients(getTools, isReady, maxWaitMs) {
  let { maxWaitMs: maxWaitMs_2, until, pollMs = 50 } = maxWaitMs;
  let allReady = (state) => state.clients.some((client) => isReady(client, state));
  if (!allReady(getTools())) return;
  let deadline = Date.now() + maxWaitMs_2;
  while (Date.now() < deadline) {
    await sleep(pollMs);
    let tools = getTools();
    if (until?.(tools) || !allReady(tools)) return;
  }
}
//@ chunk-h4jqyaw4.js:642-677 placement
function hasCommsRoledServer(server) {
  return server.some(isCommsRoledServer);
}
//@ chunk-h4jqyaw4.js:677-742 placement
function isCommsRoledServer(server) {
  return "role" in server.config && server.config.role === "comms";
}
//@ chunk-h4jqyaw4.js:742-791 placement
function isCoordinatorCommsMcpTool(tool) {
  return tool.mcpInfo?.role === "comms";
}
//@ chunk-h4jqyaw4.js:791-854 placement
function excludeCoordinatorCommsMcpTools(tools) {
  if (isCoordinatorMode_2()) return tools.filter((tool) => !isCoordinatorCommsMcpTool(tool));
  return tools;
}
//@ chunk-h4jqyaw4.js:854-952 placement
async function waitForCoordinatorSubagentMcpServers(getTools) {
  if (!isCoordinatorMode_2()) return;
  await waitForMcpClients(
    getTools,
    (server, state) => isPendingServerWithoutTools(server, state.tools) && !isCommsRoledServer(server),
    {
      maxWaitMs: TRANSPORT_FALLBACK_TIMEOUT_MS,
    },
  );
}
export {
  excludeCoordinatorCommsMcpTools,
  waitForCoordinatorSubagentMcpServers,
  isCommsRoledServer,
  isCoordinatorCommsMcpTool,
  waitForMcpClients,
  isPendingServerWithoutTools,
  hasCommsRoledServer,
};
