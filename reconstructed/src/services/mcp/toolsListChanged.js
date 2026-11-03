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

//@ chunk-h3xx37yv.js:226-752 placement
/**
 * 解析 SDK 宿主随请求带来的 MCP 清单字段：按服务器名取出 initializeResult（及可选 toolsListResult），字段不是对象或条目格式不对时分别记为整体畸形或单个服务器畸形。
 */
function parseHostManifests(field, serverNames) {
  let manifests = new Map();
  let malformedNames = [];
  if (field === undefined || field === null)
    return {
      manifests,
      malformedField: false,
      malformedServerNames: malformedNames,
    };
  if (!isPlainObject(field))
    return {
      manifests,
      malformedField: true,
      malformedServerNames: malformedNames,
    };
  for (let serverName of serverNames) {
    if (!Object.hasOwn(field, serverName)) continue;
    let n = field[serverName];
    let initializeResult = isPlainObject(n) ? n.initializeResult : undefined;
    let toolsListResult = isPlainObject(n) && n.toolsListResult !== null ? n.toolsListResult : undefined;
    if (isPlainObject(initializeResult) && (toolsListResult === undefined || isPlainObject(toolsListResult)))
      manifests.set(
        serverName,
        toolsListResult === undefined
          ? {
              initializeResult,
            }
          : {
              initializeResult,
              toolsListResult,
            },
      );
    else malformedNames.push(serverName);
  }
  return {
    manifests,
    malformedField: false,
    malformedServerNames: malformedNames,
  };
}
//@ chunk-h3xx37yv.js:752-793 placement
var NOTIFICATIONS_TOOLS_LIST_CHANGED = "notifications/tools/list_changed";
//@ chunk-h3xx37yv.js:793-848 placement
/**
 * 判断消息是否为 tools/list_changed 通知（无 id）。
 */
function isToolListChangedNotification(e) {
  return isPlainObject(e) && !("id" in e) && e.method === NOTIFICATIONS_TOOLS_LIST_CHANGED;
}
export { parseHostManifests, isToolListChangedNotification };
