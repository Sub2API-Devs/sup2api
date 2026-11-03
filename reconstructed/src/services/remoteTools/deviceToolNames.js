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
import { Bn } from "../../utils/model/modelIds.js";
import { d$e } from "../api/declaredToolSet.js";
import { getFeatureValue_SESSION_PINNED } from "../analytics/growthbook.js";

//@ chunk-s5mxraj2.js:5056-5259 placement
var TENGU_QUIRKY_SKETCH = "tengu_quirky_sketch",
  s = new Set(
    [
      "device_bash",
      "device_commit_files",
      "device_list_dir",
      "device_request_delete_permission",
      "device_stage_files",
      "get_device_info",
      "list_devices",
    ].map((e) => buildMcpToolName(REMOTE_DEVICES, e)),
  );
/**
 * 判断工具是否为可走 teleport 缓存的设备工具（远程设备 MCP、始终加载、缓存有效且模型匹配、开关开启）。
 */
//@ chunk-s5mxraj2.js:5259-5493 placement
function isCachedDeviceTool(e, i, t) {
  if (e.isMcp !== !0 || e.alwaysLoad !== !0 || e.mcpInfo?.serverName !== REMOTE_DEVICES || !s.has(e.name))
    return !1;
  let r = getTeleportCacheState();
  if (r.status !== "active") return !1;
  if (t === void 0 || Bn(t) !== r.marker.model) return !1;
  if (!d$e(i, t)) return !1;
  return getFeatureValue_SESSION_PINNED(TENGU_QUIRKY_SKETCH, !1);
}
