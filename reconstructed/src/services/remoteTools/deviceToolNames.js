/**
 * services/remoteTools/deviceToolNames.ts
 *
 * 2.1.316 新增：设备工具名
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s5mxraj2.js (2)
 * attribution: placement 2
 */
import { buildMcpToolName } from "../mcp/mcpStringUtils.js";
import { REMOTE_DEVICES } from "../mcp/firstPartyServerIds.js";
import { getTeleportCacheState } from "../teleport/relayState.js";
import { stripAnyVersatileSuffix } from "../../utils/model/modelIds.js";
import { canDeclareToolChangeAhead } from "../api/declaredToolSet.js";
import { getFeatureValue_SESSION_PINNED } from "../analytics/growthbook.js";

//@ chunk-s5mxraj2.js:5056-5259 placement
/**
 * 远程设备里可以走 teleport 缓存的工具全名集合及其特性开关名。
 */
var TENGU_QUIRKY_SKETCH = "tengu_quirky_sketch";
var TELEPORT_CACHEABLE_DEVICE_TOOLS = new Set(
  [
    "device_bash",
    "device_commit_files",
    "device_list_dir",
    "device_request_delete_permission",
    "device_stage_files",
    "get_device_info",
    "list_devices",
  ].map((name) => buildMcpToolName(REMOTE_DEVICES, name)),
);
//@ chunk-s5mxraj2.js:5259-5493 placement
/**
 * 判断工具是否为可走 teleport 缓存的设备工具（远程设备 MCP、始终加载、缓存有效且模型匹配、开关开启）。
 */
function isCachedDeviceTool(tool, context, model) {
  if (
    tool.isMcp !== true ||
    tool.alwaysLoad !== true ||
    tool.mcpInfo?.serverName !== REMOTE_DEVICES ||
    !TELEPORT_CACHEABLE_DEVICE_TOOLS.has(tool.name)
  )
    return false;
  let teleportCacheState = getTeleportCacheState();
  if (teleportCacheState.status !== "active") return false;
  if (model === undefined || stripAnyVersatileSuffix(model) !== teleportCacheState.marker.model) return false;
  if (!canDeclareToolChangeAhead(context, model)) return false;
  return getFeatureValue_SESSION_PINNED(TENGU_QUIRKY_SKETCH, false);
}
export { isCachedDeviceTool };
