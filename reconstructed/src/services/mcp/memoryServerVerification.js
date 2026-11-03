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
import { VPn } from "./firstPartyServerIds.js";

//@ chunk-hf6kt4yn.js:228-241 placement
var i = void 0;
//@ chunk-hf6kt4yn.js:241-336 placement
function l(e) {
  return (e.startsWith(VPn) && !e.slice(VPn.length).includes("__")) || (i !== void 0 && e === i);
}
//@ chunk-hf6kt4yn.js:336-551 placement
function memoryPlacementOf(e) {
  let mcpInfo = e.mcpInfo;
  if (mcpInfo === void 0) return "unplaced";
  if (mcpInfo.accountMemoryServer === !0) return "verified";
  let n = mcpInfo.source ?? (mcpInfo.serverType === "sdk" ? "sdk" : void 0);
  return n === void 0 || n === "sdk" ? "unplaced" : "other_server";
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
  if (o === void 0) {
    let n = new Map();
    for (let r of e) {
      let c = memoryPlacementOf(r);
      for (let t of [r.name, ...(r.aliases ?? [])]) n.set(t, mergeMemoryPlacement(n.get(t), c));
    }
    ((o = n), weakMap.set(e, o));
  }
  return o;
}
/**
 * 创建账户记忆服务器的验证函数（缓存已验证名）。
 */
//@ chunk-hf6kt4yn.js:870-1035 placement
function createMemoryServerVerifier(e) {
  let o = new Set();
  return (n) => {
    if (o.has(n)) return "verified";
    let r = e(),
      c = r === void 0 ? "unplaced" : (memoryPlacementByName(r).get(n) ?? "unplaced");
    if (c === "verified") o.add(n);
    return c;
  };
}
//@ chunk-hf6kt4yn.js:1035-1093 placement
function Dcr(e) {
  return (o) => (e.has(o) ? "verified" : "unplaced");
}
/**
 * 判断工具是否来自可信的记忆服务器。
 */
//@ chunk-hf6kt4yn.js:1093-1219 placement
function isTrustedMemoryTool(e, o, n) {
  switch (o?.(e)) {
    case "verified":
      return !0;
    case "other_server":
      return n === "history" && l(e);
    default:
      return l(e);
  }
}
/**
 * 当前是否为可信的记忆工具（实时）。
 */
//@ chunk-hf6kt4yn.js:1219-1270 placement
function isLiveMemoryTool(e) {
  return isTrustedMemoryTool(e.name, () => memoryPlacementOf(e), "live");
}

export { createMemoryServerVerifier, Dcr, isLiveMemoryTool, isTrustedMemoryTool };
