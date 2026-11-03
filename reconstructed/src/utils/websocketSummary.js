/**
 * utils/websocketSummary.ts
 *
 * 2.1.316 新增：WebSocket 摘要
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8ktrtjfp.js (4)
 * attribution: placement 4
 */
import { truncateToLength } from "./stringUtils.js";

/**
 * 从 WebSocket 选项中取出字符串子协议列表。
 */
//@ chunk-8ktrtjfp.js:227-397 placement
function websocketSubprotocols(n) {
  if (n === null || typeof n !== "object") return;
  let protocols = n.protocols;
  if (!Array.isArray(protocols)) return;
  let filtered = protocols.filter((r) => typeof r === "string");
  return filtered.length > 0 ? filtered : void 0;
}
/**
 * 生成"(subprotocols: ...)"说明后缀，无子协议时为空串。
 */
//@ chunk-8ktrtjfp.js:397-509 placement
function subprotocolsSuffix(n) {
  let o = websocketSubprotocols(n);
  if (o === void 0) return "";
  return ` (subprotocols: ${o.map((t) => `"${t}"`).join(", ")})`;
}
//@ chunk-8ktrtjfp.js:509-524 placement
var IDr = 4,
  e = 48;
/**
 * 把字符串列表格式化为带引号、逗号分隔的文本（限数量与单项长度，超出注明剩余数）。
 */
//@ chunk-8ktrtjfp.js:524-691 placement
function formatQuotedList(n) {
  let mapped = n.slice(0, IDr).map((r) => (r.length > e ? `${truncateToLength(r, e)}\u2026` : r)),
    t = n.length - mapped.length;
  return `${mapped.map((r) => `"${r}"`).join(", ")}${t > 0 ? ` (+${t} more)` : ""}`;
}

export { formatQuotedList, subprotocolsSuffix, websocketSubprotocols, IDr };
