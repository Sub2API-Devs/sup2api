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

//@ chunk-e6aww6q8.js:55650-55739 placement
/**
 * 忘掉并移除某 MCP 服务器
 */
function forgetMcpServerFor(e) {
  let n = moduleStore.serverKey(e);
  moduleStore.forget(e);
  if (n !== undefined) currentSurfaceBinding()?.removeMcpServer(n);
}
//@ chunk-e6aww6q8.js:55739-55775 placement = getMcpPrefix (1)
var buildRawMcpToolName = (serverName, name) => `mcp__${normalizeNameForMCP(serverName)}__${name}`;
//@ chunk-e6aww6q8.js:55775-55833 placement
/**
 * 简单可变槽
 */
function createSlot() {
  let e;
  return {
    set: (n) => {
      e = n;
    },
    current: () => e,
  };
}
//@ chunk-e6aww6q8.js:55833-55847 placement
/**
 * 工具调用槽
 */
var toolCallSlot = createSlot();
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
var currentToolCall = toolCallSlot.current;
//@ chunk-e6aww6q8.js:55893-55991 placement
/**
 * 工具是否属于某服务器
 */
function isToolFromServer(e, tool) {
  let r = moduleStore.serverKey(e);
  return r !== undefined && moduleStore.list(e).some((s) => buildRawMcpToolName(r, s.name) === tool);
}
//@ chunk-e6aww6q8.js:55991-56007 placement
var list = moduleStore.list;
//@ chunk-e6aww6q8.js:56007-56202 placement
/**
 * 若插件登记的工具已原样出现在会话工具中，返回其 mcp__服务器__工具 全名。
 */
function registeredMcpToolName(e, n, r) {
  let found = moduleStore.list(r).find((L) => L.name === n.name);
  let h = moduleStore.serverKey(r);
  if (found === undefined || h === undefined || jsonStringify(found) !== jsonStringify(n)) return;
  let rawMcpToolName = buildRawMcpToolName(h, n.name);
  return e.tools().some((L) => L.name === rawMcpToolName) ? rawMcpToolName : undefined;
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
