/**
 * services/deviceBridge/passthroughMarker.ts
 *
 * 2.1.316 新增。设备透传工具的 _meta 标记、保留工具名（device_bash 等）判断。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7bxmbzee.js (7)
 * attribution: placement 7
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, literal, stringSchema, unknown } from "../../../vendor/zod/v4/classic/schemas.js";
import { parseAdvert, clipText } from "../../remote/tools/protocolSchemas.js";
import { normalizedKey } from "../mcp/normalization.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-7bxmbzee.js:344-550 placement
/**
 * 透传工具公告里工具名的最大字符数（128）。
 */
var PASSTHROUGH_MARKER_KEY; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var BRIDGE_RESERVED_TOOL_NAMES;
var CLAUDE_BROWSER;
var MAX_ANNOUNCED_TOOL_CHARS;
var PASSTHROUGH_ANNOUNCE_FORMAT_VERSION;
var _;
deferInit("chunk-7bxmbzee.js:344", () => {
  PASSTHROUGH_MARKER_KEY = "anthropic/devicePassthrough";
  BRIDGE_RESERVED_TOOL_NAMES = ["get_device_info", "device_bash", "list_devices", "sync_files"];
  CLAUDE_BROWSER = "Claude_Browser__";
  MAX_ANNOUNCED_TOOL_CHARS = 128;
  PASSTHROUGH_ANNOUNCE_FORMAT_VERSION = 1;
  _ = DoctorLazy(() =>
    objectSchema({
      v: literal(PASSTHROUGH_ANNOUNCE_FORMAT_VERSION),
      tool: stringSchema().min(1).max(MAX_ANNOUNCED_TOOL_CHARS),
      target: unknown().optional(),
    }),
  );
});
//@ chunk-7bxmbzee.js:550-705 placement
function parsePassthroughMarker(raw) {
  let parsed = _().safeParse(raw);
  if (!parsed.success) return;
  let advert = parseAdvert(parsed.data.target);
  return advert === undefined
    ? undefined
    : {
        v: parsed.data.v,
        tool: clipText(parsed.data.tool, MAX_ANNOUNCED_TOOL_CHARS),
        target: advert,
      };
}
//@ chunk-7bxmbzee.js:705-737 placement
/**
 * 浏览器工具名的保留前缀（Claude_Browser__）。
 */
var mapped; // deferred: uses PASSTHROUGH_MARKER_KEY of its import cycle while loading; runs once the cycle is complete
var CLAUDE_BROWSER_RESERVED_PREFIX;
deferInit("chunk-7bxmbzee.js:705", () => {
  mapped = BRIDGE_RESERVED_TOOL_NAMES.map(normalizedKey);
  CLAUDE_BROWSER_RESERVED_PREFIX = `${normalizedKey(CLAUDE_BROWSER)}_`;
});
//@ chunk-7bxmbzee.js:737-811 placement
/**
 * 判断工具名是否属于桥接保留工具（get_device_info、device_bash 等）。
 */
function isReservedBridgeTool(name) {
  let prefix = `${normalizedKey(name)}_`;
  return mapped.some((name) => prefix.startsWith(`${name}_`));
}
//@ chunk-7bxmbzee.js:811-968 placement
/**
 * 设备权限请求类工具名
 */
var DEVICE_PERMISSION_REQUEST_TOOLS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var DEVICE_BASH;
deferInit("chunk-7bxmbzee.js:811", () => {
  DEVICE_PERMISSION_REQUEST_TOOLS = new Set([
    "computer_request_access",
    "computer_request_full_control",
    "device_request_folder_access",
    "device_request_delete_permission",
  ]);
  DEVICE_BASH = "device_bash";
});
//@ chunk-7bxmbzee.js:968-1112 placement
function isServiceReservedToolName(name) {
  let index = name.lastIndexOf("__");
  let suffix = index === -1 ? name : name.slice(index + 2);
  return (
    DEVICE_PERMISSION_REQUEST_TOOLS.has(suffix) ||
    name === DEVICE_BASH ||
    `__${name}`.endsWith("__Claude_Browser__request_access")
  );
}
//@ chunk-7bxmbzee.js:1112-1177 placement
function mayBePassthroughTool(name) {
  return (
    !isReservedBridgeTool(name) &&
    !`${normalizedKey(name)}_`.startsWith(CLAUDE_BROWSER_RESERVED_PREFIX) &&
    !isServiceReservedToolName(name)
  );
}
export {
  mayBePassthroughTool,
  parsePassthroughMarker,
  PASSTHROUGH_MARKER_KEY,
  isServiceReservedToolName,
  PASSTHROUGH_ANNOUNCE_FORMAT_VERSION,
  BRIDGE_RESERVED_TOOL_NAMES,
};
