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

//@ chunk-8ktrtjfp.js:227-397 placement
/**
 * 从 WebSocket 选项中取出字符串子协议列表。
 */
function websocketSubprotocols(n) {
  if (n === null || typeof n !== "object") return;
  let protocols = n.protocols;
  if (!Array.isArray(protocols)) return;
  let filtered = protocols.filter((protocol) => typeof protocol === "string");
  return filtered.length > 0 ? filtered : undefined;
}
//@ chunk-8ktrtjfp.js:397-509 placement
/**
 * 生成"(subprotocols: ...)"说明后缀，无子协议时为空串。
 */
function subprotocolsSuffix(n) {
  let o = websocketSubprotocols(n);
  if (o === undefined) return "";
  return ` (subprotocols: ${o.map((t) => `"${t}"`).join(", ")})`;
}
//@ chunk-8ktrtjfp.js:509-524 placement
/**
 * 引号列表最多列出的项数与单项长度。
 */
var MAX_QUOTED_ITEMS = 4;
var MAX_QUOTED_ITEM_CHARS = 48;
//@ chunk-8ktrtjfp.js:524-691 placement
/**
 * 把字符串列表格式化为带引号、逗号分隔的文本（限数量与单项长度，超出注明剩余数）。
 */
function formatQuotedList(protocols) {
  let mapped = protocols
    .slice(0, MAX_QUOTED_ITEMS)
    .map((r) =>
      r.length > MAX_QUOTED_ITEM_CHARS ? `${truncateToLength(r, MAX_QUOTED_ITEM_CHARS)}\u2026` : r,
    );
  let t = protocols.length - mapped.length;
  return `${mapped.map((r) => `"${r}"`).join(", ")}${t > 0 ? ` (+${t} more)` : ""}`;
}
export { formatQuotedList, subprotocolsSuffix, websocketSubprotocols, MAX_QUOTED_ITEMS };
