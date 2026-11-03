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
function isPendingServerWithoutTools(o, tools) {
  if (o.type !== "pending") return false;
  let mcpPrefix = getMcpPrefix(o.name);
  return !tools.some((t) => isToolFromMcpServer(t, o.name, mcpPrefix));
}
//@ chunk-h4jqyaw4.js:439-642 placement
/**
 * 轮询等待 MCP 客户端状态：只要还有满足条件（如仍在连接）的客户端就继续等，直到超时或满足 until 条件。
 */
async function waitForMcpClients(o, e, n) {
  let { maxWaitMs, until, pollMs = 50 } = n;
  let i = (r) => r.clients.some((client) => e(client, r));
  if (!i(o())) return;
  let p = Date.now() + maxWaitMs;
  while (Date.now() < p) {
    await sleep(pollMs);
    let r = o();
    if (until?.(r) || !i(r)) return;
  }
}
//@ chunk-h4jqyaw4.js:642-677 placement
function hasCommsRoledServer(o) {
  return o.some(isCommsRoledServer);
}
//@ chunk-h4jqyaw4.js:677-742 placement
function isCommsRoledServer(o) {
  return "role" in o.config && o.config.role === "comms";
}
//@ chunk-h4jqyaw4.js:742-791 placement
function isCoordinatorCommsMcpTool(o) {
  return o.mcpInfo?.role === "comms";
}
//@ chunk-h4jqyaw4.js:791-854 placement
function excludeCoordinatorCommsMcpTools(o) {
  if (isCoordinatorMode_2()) return o.filter((e) => !isCoordinatorCommsMcpTool(e));
  return o;
}
//@ chunk-h4jqyaw4.js:854-952 placement
async function waitForCoordinatorSubagentMcpServers(o) {
  if (!isCoordinatorMode_2()) return;
  await waitForMcpClients(o, (e, n) => isPendingServerWithoutTools(e, n.tools) && !isCommsRoledServer(e), {
    maxWaitMs: TRANSPORT_FALLBACK_TIMEOUT_MS,
  });
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
