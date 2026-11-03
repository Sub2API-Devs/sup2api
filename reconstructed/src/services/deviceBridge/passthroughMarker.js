/**
 * services/deviceBridge/passthroughMarker.ts
 *
 * 2.1.316 新增。设备透传工具的 _meta 标记、保留工具名（device_bash 等）判断。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-rmg81gxr.js (7)
 * attribution: placement 7
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, T, o, oe } from "../../../vendor/zod/v4/classic/schemas.js";
import { parseAdvert, clipText } from "../../remote/tools/protocolSchemas.js";
import { _Y } from "../mcp/normalization.js";

//@ chunk-rmg81gxr.js:344-550 placement
var PASSTHROUGH_MARKER_KEY = "anthropic/devicePassthrough",
  BRIDGE_RESERVED_TOOL_NAMES = ["get_device_info", "device_bash", "list_devices", "sync_files"],
  CLAUDE_BROWSER = "Claude_Browser__",
  n = 128,
  PASSTHROUGH_ANNOUNCE_FORMAT_VERSION = 1,
  _ = DoctorLazy(() =>
    u({ v: T(PASSTHROUGH_ANNOUNCE_FORMAT_VERSION), tool: o().min(1).max(n), target: oe().optional() }),
  );
//@ chunk-rmg81gxr.js:550-705 placement
function parsePassthroughMarker(t) {
  let safeParse = _().safeParse(t);
  if (!safeParse.success) return;
  let s = parseAdvert(safeParse.data.target);
  return s === void 0 ? void 0 : { v: safeParse.data.v, tool: clipText(safeParse.data.tool, n), target: s };
}
//@ chunk-rmg81gxr.js:705-737 placement
var mapped = BRIDGE_RESERVED_TOOL_NAMES.map(_Y),
  c = `${_Y(CLAUDE_BROWSER)}_`;
//@ chunk-rmg81gxr.js:737-811 placement
function i(t) {
  let e = `${_Y(t)}_`;
  return mapped.some((s) => e.startsWith(`${s}_`));
}
/**
 * 设备权限请求类工具名
 */
//@ chunk-rmg81gxr.js:811-968 placement
var DEVICE_PERMISSION_REQUEST_TOOLS = new Set([
    "computer_request_access",
    "computer_request_full_control",
    "device_request_folder_access",
    "device_request_delete_permission",
  ]),
  DEVICE_BASH = "device_bash";
//@ chunk-rmg81gxr.js:968-1112 placement
function isServiceReservedToolName(t) {
  let index = t.lastIndexOf("__"),
    s = index === -1 ? t : t.slice(index + 2);
  return (
    DEVICE_PERMISSION_REQUEST_TOOLS.has(s) ||
    t === DEVICE_BASH ||
    `__${t}`.endsWith("__Claude_Browser__request_access")
  );
}
//@ chunk-rmg81gxr.js:1112-1177 placement
function mayBePassthroughTool(t) {
  return !i(t) && !`${_Y(t)}_`.startsWith(c) && !isServiceReservedToolName(t);
}

export {
  mayBePassthroughTool,
  PASSTHROUGH_MARKER_KEY,
  parsePassthroughMarker,
  isServiceReservedToolName,
  PASSTHROUGH_ANNOUNCE_FORMAT_VERSION,
};
