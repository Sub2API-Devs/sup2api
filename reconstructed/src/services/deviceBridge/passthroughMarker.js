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
import { u, literal, string, unknown } from "../../../vendor/zod/v4/classic/schemas.js";
import { parseAdvert, clipText } from "../../remote/tools/protocolSchemas.js";
import { normalizedKey } from "../mcp/normalization.js";

//@ chunk-rmg81gxr.js:344-550 placement
/**
 * 透传工具公告里工具名的最大字符数（128）。
 */
var PASSTHROUGH_MARKER_KEY = "anthropic/devicePassthrough";
var BRIDGE_RESERVED_TOOL_NAMES = ["get_device_info", "device_bash", "list_devices", "sync_files"];
var CLAUDE_BROWSER = "Claude_Browser__";
var MAX_ANNOUNCED_TOOL_CHARS = 128;
var PASSTHROUGH_ANNOUNCE_FORMAT_VERSION = 1;
var _ = DoctorLazy(() =>
  u({
    v: literal(PASSTHROUGH_ANNOUNCE_FORMAT_VERSION),
    tool: string().min(1).max(MAX_ANNOUNCED_TOOL_CHARS),
    target: unknown().optional(),
  }),
);
//@ chunk-rmg81gxr.js:550-705 placement
function parsePassthroughMarker(t) {
  let e = _().safeParse(t);
  if (!e.success) return;
  let advert = parseAdvert(e.data.target);
  return advert === undefined
    ? undefined
    : {
        v: e.data.v,
        tool: clipText(e.data.tool, MAX_ANNOUNCED_TOOL_CHARS),
        target: advert,
      };
}
//@ chunk-rmg81gxr.js:705-737 placement
/**
 * 浏览器工具名的保留前缀（Claude_Browser__）。
 */
var mapped = BRIDGE_RESERVED_TOOL_NAMES.map(normalizedKey);
var CLAUDE_BROWSER_RESERVED_PREFIX = `${normalizedKey(CLAUDE_BROWSER)}_`;
//@ chunk-rmg81gxr.js:737-811 placement
/**
 * 判断工具名是否属于桥接保留工具（get_device_info、device_bash 等）。
 */
function isReservedBridgeTool(t) {
  let e = `${normalizedKey(t)}_`;
  return mapped.some((s) => e.startsWith(`${s}_`));
}
//@ chunk-rmg81gxr.js:811-968 placement
/**
 * 设备权限请求类工具名
 */
var DEVICE_PERMISSION_REQUEST_TOOLS = new Set([
  "computer_request_access",
  "computer_request_full_control",
  "device_request_folder_access",
  "device_request_delete_permission",
]);
var DEVICE_BASH = "device_bash";
//@ chunk-rmg81gxr.js:968-1112 placement
function isServiceReservedToolName(t) {
  let index = t.lastIndexOf("__");
  let s = index === -1 ? t : t.slice(index + 2);
  return (
    DEVICE_PERMISSION_REQUEST_TOOLS.has(s) ||
    t === DEVICE_BASH ||
    `__${t}`.endsWith("__Claude_Browser__request_access")
  );
}
//@ chunk-rmg81gxr.js:1112-1177 placement
function mayBePassthroughTool(name) {
  return (
    !isReservedBridgeTool(name) &&
    !`${normalizedKey(name)}_`.startsWith(CLAUDE_BROWSER_RESERVED_PREFIX) &&
    !isServiceReservedToolName(name)
  );
}
export {
  mayBePassthroughTool,
  PASSTHROUGH_MARKER_KEY,
  parsePassthroughMarker,
  isServiceReservedToolName,
  PASSTHROUGH_ANNOUNCE_FORMAT_VERSION,
};
