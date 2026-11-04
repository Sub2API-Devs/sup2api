/**
 * services/mcp/memoryServerVerification.ts
 *
 * 2.1.316 新增：创建账户记忆服务器的验证函数（缓存已验证名）；判断工具是否来自可信的记忆服务器等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hf6kt4yn.js (10)
 * attribution: placement 10
 */
import { MEMORY_TOOL_PREFIX } from "./firstPartyServerIds.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-hf6kt4yn.js:228-241 placement
/**
 * 可选的记忆服务器别名。
 */
var alternatesServerName = undefined;
//@ chunk-hf6kt4yn.js:241-336 placement
/**
 * 判断工具名是否来自记忆服务器。
 */
function isMemoryServerToolName(toolName) {
  return (
    (toolName.startsWith(MEMORY_TOOL_PREFIX) && !toolName.slice(MEMORY_TOOL_PREFIX.length).includes("__")) ||
    (alternatesServerName !== undefined && toolName === alternatesServerName)
  );
}
//@ chunk-hf6kt4yn.js:336-551 placement
function memoryPlacementOf(tool) {
  let mcpInfo = tool.mcpInfo;
  if (mcpInfo === undefined) return "unplaced";
  if (mcpInfo.accountMemoryServer === true) return "verified";
  let source = mcpInfo.source ?? (mcpInfo.serverType === "sdk" ? "sdk" : undefined);
  return source === undefined || source === "sdk" ? "unplaced" : "other_server";
}
//@ chunk-hf6kt4yn.js:551-682 placement
function mergeMemoryPlacement(a, b) {
  if (a === "verified" || b === "verified") return "verified";
  return a === "unplaced" || b === "unplaced" ? "unplaced" : "other_server";
}
//@ chunk-hf6kt4yn.js:682-700 placement
var weakMap; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hf6kt4yn.js:682", () => {
  weakMap = new WeakMap();
});
//@ chunk-hf6kt4yn.js:700-870 placement
function memoryPlacementByName(tools) {
  let cached = weakMap.get(tools);
  if (cached === undefined) {
    let byName = new Map();
    for (let tool of tools) {
      let placement = memoryPlacementOf(tool);
      for (let name of [tool.name, ...(tool.aliases ?? [])])
        byName.set(name, mergeMemoryPlacement(byName.get(name), placement));
    }
    cached = byName;
    weakMap.set(tools, cached);
  }
  return cached;
}
//@ chunk-hf6kt4yn.js:870-1035 placement
/**
 * 创建账户记忆服务器的验证函数（缓存已验证名）。
 */
function createMemoryServerVerifier(getTools) {
  let verifiedCache = new Set();
  return (toolName) => {
    if (verifiedCache.has(toolName)) return "verified";
    let tools = getTools();
    let placement =
      tools === undefined ? "unplaced" : (memoryPlacementByName(tools).get(toolName) ?? "unplaced");
    if (placement === "verified") verifiedCache.add(toolName);
    return placement;
  };
}
//@ chunk-hf6kt4yn.js:1035-1093 placement
/**
 * 返回判断函数：工具是否已登记（verified / unplaced）。
 */
function classifyPlacedTool(verifiedNames) {
  return (toolName) => (verifiedNames.has(toolName) ? "verified" : "unplaced");
}
//@ chunk-hf6kt4yn.js:1093-1219 placement
/**
 * 判断工具是否来自可信的记忆服务器。
 */
function isTrustedMemoryTool(toolName, placementOf, caller) {
  switch (placementOf?.(toolName)) {
    case "verified":
      return true;
    case "other_server":
      return caller === "history" && isMemoryServerToolName(toolName);
    default:
      return isMemoryServerToolName(toolName);
  }
}
//@ chunk-hf6kt4yn.js:1219-1270 placement
/**
 * 当前是否为可信的记忆工具（实时）。
 */
function isLiveMemoryTool(tool) {
  return isTrustedMemoryTool(tool.name, () => memoryPlacementOf(tool), "live");
}
export { createMemoryServerVerifier, classifyPlacedTool, isLiveMemoryTool, isTrustedMemoryTool };
