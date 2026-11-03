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

//@ chunk-hf6kt4yn.js:228-241 placement
/**
 * 可选的记忆服务器别名。
 */
var alternatesServerName = undefined;
//@ chunk-hf6kt4yn.js:241-336 placement
/**
 * 判断工具名是否来自记忆服务器。
 */
function isMemoryServerToolName(e) {
  return (
    (e.startsWith(MEMORY_TOOL_PREFIX) && !e.slice(MEMORY_TOOL_PREFIX.length).includes("__")) ||
    (alternatesServerName !== undefined && e === alternatesServerName)
  );
}
//@ chunk-hf6kt4yn.js:336-551 placement
function memoryPlacementOf(e) {
  let mcpInfo = e.mcpInfo;
  if (mcpInfo === undefined) return "unplaced";
  if (mcpInfo.accountMemoryServer === true) return "verified";
  let n = mcpInfo.source ?? (mcpInfo.serverType === "sdk" ? "sdk" : undefined);
  return n === undefined || n === "sdk" ? "unplaced" : "other_server";
}
//@ chunk-hf6kt4yn.js:551-682 placement
function mergeMemoryPlacement(e, o) {
  if (e === "verified" || o === "verified") return "verified";
  return e === "unplaced" || o === "unplaced" ? "unplaced" : "other_server";
}
//@ chunk-hf6kt4yn.js:682-700 placement
var weakMap = new WeakMap();
//@ chunk-hf6kt4yn.js:700-870 placement
function memoryPlacementByName(e) {
  let o = weakMap.get(e);
  if (o === undefined) {
    let n = new Map();
    for (let r of e) {
      let c = memoryPlacementOf(r);
      for (let t of [r.name, ...(r.aliases ?? [])]) n.set(t, mergeMemoryPlacement(n.get(t), c));
    }
    o = n;
    weakMap.set(e, o);
  }
  return o;
}
//@ chunk-hf6kt4yn.js:870-1035 placement
/**
 * 创建账户记忆服务器的验证函数（缓存已验证名）。
 */
function createMemoryServerVerifier(e) {
  let o = new Set();
  return (n) => {
    if (o.has(n)) return "verified";
    let r = e();
    let c = r === undefined ? "unplaced" : (memoryPlacementByName(r).get(n) ?? "unplaced");
    if (c === "verified") o.add(n);
    return c;
  };
}
//@ chunk-hf6kt4yn.js:1035-1093 placement
/**
 * 返回判断函数：工具是否已登记（verified / unplaced）。
 */
function classifyPlacedTool(e) {
  return (o) => (e.has(o) ? "verified" : "unplaced");
}
//@ chunk-hf6kt4yn.js:1093-1219 placement
/**
 * 判断工具是否来自可信的记忆服务器。
 */
function isTrustedMemoryTool(e, o, n) {
  switch (o?.(e)) {
    case "verified":
      return true;
    case "other_server":
      return n === "history" && isMemoryServerToolName(e);
    default:
      return isMemoryServerToolName(e);
  }
}
//@ chunk-hf6kt4yn.js:1219-1270 placement
/**
 * 当前是否为可信的记忆工具（实时）。
 */
function isLiveMemoryTool(e) {
  return isTrustedMemoryTool(e.name, () => memoryPlacementOf(e), "live");
}
export { createMemoryServerVerifier, classifyPlacedTool, isLiveMemoryTool, isTrustedMemoryTool };
