/**
 * plugins/functionHooks/mcpServerHooks.ts
 *
 * 2.1.316 新增：MCP 服务器相关事件钩子接入
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (9)
 * attribution: placement 9
 */
import { moduleStore } from "../../services/mcp/mcpClientCapabilities.js";
import { currentSurfaceBinding } from "./surfaceBinding.js";
import { CLAUDEAI_SERVER_PREFIX } from "../../services/mcp/normalization.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:58106-58195 placement
/**
 * 忘掉并移除某 MCP 服务器
 */
function forgetMcpServerFor(plugin) {
  let serverKey = moduleStore.serverKey(plugin);
  moduleStore.forget(plugin);
  if (serverKey !== undefined) currentSurfaceBinding()?.removeMcpServer(serverKey);
}
//@ chunk-5xgkngpb.js:58195-58231 placement (2.1.88 match: getMcpPrefix, 1)
var buildRawMcpToolName = (serverName, name) => `mcp__${CLAUDEAI_SERVER_PREFIX(serverName)}__${name}`;
//@ chunk-5xgkngpb.js:58231-58289 placement
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
//@ chunk-5xgkngpb.js:58289-58303 placement
/**
 * 工具调用槽
 */
var toolCallSlot; // deferred: uses createSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:58289", () => {
  toolCallSlot = createSlot();
});
//@ chunk-5xgkngpb.js:58303-58329 placement
/**
 * 设置当前工具调用
 */
var setCurrentToolCall = (pluginToolsServerHost) => {
  toolCallSlot.set(pluginToolsServerHost);
};
//@ chunk-5xgkngpb.js:58329-58349 placement
/**
 * 当前工具调用
 */
var currentToolCall; // deferred: uses toolCallSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:58329", () => {
  currentToolCall = toolCallSlot.current;
});
//@ chunk-5xgkngpb.js:58349-58447 placement
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
//@ chunk-5xgkngpb.js:58447-58463 placement
var list; // deferred: uses moduleStore (../../services/mcp/mcpClientCapabilities.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:58447", () => {
  list = moduleStore.list;
});
//@ chunk-5xgkngpb.js:58463-58658 placement
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
  currentToolCall,
  forgetMcpServerFor,
  isToolFromServer,
  list,
  registeredMcpToolName,
  buildRawMcpToolName,
  setCurrentToolCall,
};
