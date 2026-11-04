/**
 * plugins/functionHooks/mcpServerHooks.ts
 *
 * 2.1.316 新增：MCP 服务器相关事件钩子接入
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (9)
 * attribution: placement 9
 */
import { moduleStore } from "../../services/mcp/mcpClientCapabilities.js";
import { currentSurfaceBinding } from "./surfaceBinding.js";
import { normalizeNameForMCP } from "../../services/mcp/normalization.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:55650-55739 placement
/**
 * 忘掉并移除某 MCP 服务器
 */
function forgetMcpServerFor(plugin) {
  let serverKey = moduleStore.serverKey(plugin);
  moduleStore.forget(plugin);
  if (serverKey !== undefined) currentSurfaceBinding()?.removeMcpServer(serverKey);
}
//@ chunk-e6aww6q8.js:55739-55775 placement (2.1.88 match: getMcpPrefix, 1)
var buildRawMcpToolName = (serverName, name) => `mcp__${normalizeNameForMCP(serverName)}__${name}`;
//@ chunk-e6aww6q8.js:55775-55833 placement
/**
 * 简单可变槽
 */
function createSlot() {
  let slotValue;
  return {
    set: (value) => {
      slotValue = value;
    },
    current: () => slotValue,
  };
}
//@ chunk-e6aww6q8.js:55833-55847 placement
/**
 * 工具调用槽
 */
var toolCallSlot; // deferred: uses createSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:55833", () => {
  toolCallSlot = createSlot();
});
//@ chunk-e6aww6q8.js:55847-55873 placement
/**
 * 设置当前工具调用
 */
var setCurrentToolCall = (pluginToolsServerHost) => {
  toolCallSlot.set(pluginToolsServerHost);
};
//@ chunk-e6aww6q8.js:55873-55893 placement
/**
 * 当前工具调用
 */
var currentToolCall; // deferred: uses toolCallSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:55873", () => {
  currentToolCall = toolCallSlot.current;
});
//@ chunk-e6aww6q8.js:55893-55991 placement
/**
 * 工具是否属于某服务器
 */
function isToolFromServer(plugin, tool) {
  let serverKey = moduleStore.serverKey(plugin);
  return (
    serverKey !== undefined &&
    moduleStore.list(plugin).some((serverTool) => buildRawMcpToolName(serverKey, serverTool.name) === tool)
  );
}
//@ chunk-e6aww6q8.js:55991-56007 placement
var list; // deferred: uses moduleStore (../../services/mcp/mcpClientCapabilities.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:55991", () => {
  list = moduleStore.list;
});
//@ chunk-e6aww6q8.js:56007-56202 placement
/**
 * 若插件登记的工具已原样出现在会话工具中，返回其 mcp__服务器__工具 全名。
 */
function registeredMcpToolName(connection, serverTool, plugin) {
  let found = moduleStore.list(plugin).find((listedTool) => listedTool.name === serverTool.name);
  let serverKey = moduleStore.serverKey(plugin);
  if (found === undefined || serverKey === undefined || jsonStringify(found) !== jsonStringify(serverTool))
    return;
  let rawMcpToolName = buildRawMcpToolName(serverKey, serverTool.name);
  return connection.tools().some((tool) => tool.name === rawMcpToolName) ? rawMcpToolName : undefined;
}
export {
  forgetMcpServerFor,
  isToolFromServer,
  list,
  registeredMcpToolName,
  currentToolCall,
  buildRawMcpToolName,
  setCurrentToolCall,
};
