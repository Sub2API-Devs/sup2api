/**
 * services/mcp/toolsListChanged.ts
 *
 * MCP tools/list_changed 处理（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-h3xx37yv.js (3)
 * attribution: placement 3
 */
import { isPlainObject } from "../../utils/isPlainObject.js";

/**
 * 解析 SDK 宿主随请求带来的 MCP 清单字段：按服务器名取出 initializeResult（及可选 toolsListResult），字段不是对象或条目格式不对时分别记为整体畸形或单个服务器畸形。
 */
//@ chunk-h3xx37yv.js:226-752 placement
function parseHostManifests(field, serverNames) {
  let manifests = new Map(),
    malformedNames = [];
  if (field === void 0 || field === null)
    return { manifests: manifests, malformedField: !1, malformedServerNames: malformedNames };
  if (!isPlainObject(field))
    return { manifests: manifests, malformedField: !0, malformedServerNames: malformedNames };
  for (let r of serverNames) {
    if (!Object.hasOwn(field, r)) continue;
    let n = field[r],
      s = isPlainObject(n) ? n.initializeResult : void 0,
      i = isPlainObject(n) && n.toolsListResult !== null ? n.toolsListResult : void 0;
    if (isPlainObject(s) && (i === void 0 || isPlainObject(i)))
      manifests.set(r, i === void 0 ? { initializeResult: s } : { initializeResult: s, toolsListResult: i });
    else malformedNames.push(r);
  }
  return { manifests: manifests, malformedField: !1, malformedServerNames: malformedNames };
}
//@ chunk-h3xx37yv.js:752-793 placement
var NOTIFICATIONS_TOOLS_LIST_CHANGED = "notifications/tools/list_changed";
//@ chunk-h3xx37yv.js:793-848 placement
function yBn(e) {
  return isPlainObject(e) && !("id" in e) && e.method === NOTIFICATIONS_TOOLS_LIST_CHANGED;
}

export { parseHostManifests, yBn };
