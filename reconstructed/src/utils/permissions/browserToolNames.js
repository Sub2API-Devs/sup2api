/**
 * utils/permissions/browserToolNames.ts
 *
 * 2.1.316 新增：当前权限模式下工具是否自动允许；浏览器类 MCP 服务器名集合（Claude Preview、Claude in Chrome）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dcmhvw5a.js (15)
 * attribution: placement 15
 */
import { normalizeNameForMCP } from "../../services/mcp/normalization.js";
import { isHostedDesktopSession } from "../computerUse/toolRendering.js";
import { mcpInfoFromString, getMcpPrefix } from "../../services/mcp/mcpStringUtils.js";
import { COMPUTER_USE_MCP_SERVER_NAME } from "../computerUse/common.js";
import { getOwn } from "../objectSafety.js";
import { getIsNonInteractiveSession } from "../../bootstrap/state.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { preprocess, _enum } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  normalizePermissionModeAlias,
  PERMISSION_MODES,
  EXTERNAL_PERMISSION_MODES,
} from "../../types/permissions.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-dcmhvw5a.js:206103-206379 placement
/**
 * 浏览器类 MCP 服务器名集合（Claude Preview、Claude in Chrome）。
 */
var BROWSER_SERVER_NAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var CHROME_IN_SERVER_NAMES;
var ALL_BROWSER_SERVER_NAMES;
var REMOTE_DEVICES;
var CLAUDE_BROWSER_TOOL_PREFIXES;
var CHROME_TOOL_PREFIXES;
var ALL_BROWSER_TOOL_PREFIXES;
var CLAUDE_DEVICE;
var CHROME;
deferInit("chunk-dcmhvw5a.js:206103", () => {
  BROWSER_SERVER_NAMES = new Set(["Claude Preview", "Claude Browser"]);
  CHROME_IN_SERVER_NAMES = new Set(["claude-in-chrome", "Claude in Chrome"]);
  ALL_BROWSER_SERVER_NAMES = new Set([...CHROME_IN_SERVER_NAMES, ...BROWSER_SERVER_NAMES]);
  REMOTE_DEVICES = "remote-devices";
  CLAUDE_BROWSER_TOOL_PREFIXES = ["Claude_Browser__"];
  CHROME_TOOL_PREFIXES = ["claude-in-chrome__", "Claude_in_Chrome__"];
  ALL_BROWSER_TOOL_PREFIXES = [...CLAUDE_BROWSER_TOOL_PREFIXES, ...CHROME_TOOL_PREFIXES];
  CLAUDE_DEVICE = "claude-device";
  CHROME = "chrome_";
});
//@ chunk-dcmhvw5a.js:206379-206484 placement
function isRemoteDeviceToolWithPrefix(tool, prefixes) {
  if (tool?.serverName !== REMOTE_DEVICES) return false;
  let normalizedToolName = normalizeNameForMCP(tool.toolName);
  return prefixes.some((prefix) => normalizedToolName.startsWith(prefix));
}
//@ chunk-dcmhvw5a.js:206484-206550 placement
function isBrowserComputerUseTool(tool) {
  return (
    (tool !== undefined && BROWSER_SERVER_NAMES.has(tool.serverName)) ||
    isRemoteDeviceToolWithPrefix(tool, CLAUDE_BROWSER_TOOL_PREFIXES)
  );
}
//@ chunk-dcmhvw5a.js:206550-206627 placement
/**
 * 工具是否来自 computer use 服务器（托管桌面）。
 */
function isComputerUseTool(mcpInfo) {
  return (
    isHostedDesktopSession() &&
    mcpInfo != null &&
    mcpInfoFromString(getMcpPrefix(mcpInfo.serverName))?.serverName === COMPUTER_USE_MCP_SERVER_NAME
  );
}
//@ chunk-dcmhvw5a.js:206627-206745 placement
function isBrowserMcpTool(tool) {
  return (
    (tool !== undefined && CHROME_IN_SERVER_NAMES.has(tool.serverName)) ||
    isRemoteDeviceToolWithPrefix(tool, CHROME_TOOL_PREFIXES) ||
    (tool?.serverName === CLAUDE_DEVICE && normalizeNameForMCP(tool.toolName).startsWith(CHROME))
  );
}
//@ chunk-dcmhvw5a.js:206745-207107 placement
/**
 * 当前权限模式下工具是否自动允许。
 */
function isAutoAllowedInMode(tool, toolPermissionContext) {
  let mcpPermissionModeOverride = getMcpPermissionModeOverride(tool, toolPermissionContext);
  let isBypassLike =
    toolPermissionContext.mode === "bypassPermissions" ||
    toolPermissionContext.mode === "auto" ||
    isPlanBypass(toolPermissionContext.mode, toolPermissionContext.isBypassPermissionsModeAvailable);
  if (typeof mcpPermissionModeOverride === "string" && isBypassLike) return mcpPermissionModeOverride;
  if (
    isBypassLike &&
    (isBrowserComputerUseTool(tool?.mcpInfo) ||
      isComputerUseTool(tool?.mcpInfo) ||
      tool?.excludedFromModeBypassAllow?.() === true ||
      (isBrowserMcpTool(tool?.mcpInfo) && toolPermissionContext.chromeClassifierFloorEnabled === true))
  )
    return toolPermissionContext.canAutoClassifierRun === true ? "auto" : "default";
  return toolPermissionContext.mode;
}
//@ chunk-dcmhvw5a.js:207107-207253 placement
/**
 * 取工具所属 MCP 服务器的权限模式覆盖值。
 */
function getMcpPermissionModeOverride(tool, toolPermissionContext) {
  let serverName = tool?.mcpInfo?.serverName;
  return serverName !== undefined && toolPermissionContext.mcpPermissionModeOverrides !== undefined
    ? getOwn(toolPermissionContext.mcpPermissionModeOverrides, serverName)
    : undefined;
}
//@ chunk-dcmhvw5a.js:207253-207390 placement
/**
 * 校验 MCP 权限模式覆盖值：null 表示无覆盖，只接受 default 与 auto。
 */
function parseMcpModeOverride(value) {
  if (value === null)
    return {
      ok: true,
      override: undefined,
    };
  if (value === "default" || value === "auto")
    return {
      ok: true,
      override: value,
    };
  return {
    ok: false,
    rejected: value,
  };
}
//@ chunk-dcmhvw5a.js:207390-207428 placement
function isPlanMode(toolPermissionContext) {
  return toolPermissionContext.mode === "plan";
}
//@ chunk-dcmhvw5a.js:207428-207478 placement
/**
 * 计划模式且可绕过权限。
 */
function isPlanBypass(mode, isBypassPermissionsModeAvailable) {
  return mode === "plan" && isBypassPermissionsModeAvailable === true && !getIsNonInteractiveSession();
}
//@ chunk-dcmhvw5a.js:207478-207589 placement
/**
 * 当前模式是否以绕过方式自动放行该工具（bypassPermissions 或计划模式下的绕过），工具声明排除时除外。
 */
function isBypassAllowedInMode(tool, mode, isBypassPermissionsModeAvailable, forRemoteExecution) {
  return (
    (mode === "bypassPermissions" ||
      (isPlanBypass(mode, isBypassPermissionsModeAvailable) && forRemoteExecution !== true)) &&
    tool.excludedFromModeBypassAllow?.() !== true
  );
}
//@ chunk-dcmhvw5a.js:207589-207652 placement
/**
 * 沙箱自动允许是否关闭或暂停。
 */
function isSandboxAutoAllowOff(toolPermissionContext) {
  return isPlanMode(toolPermissionContext) || toolPermissionContext.sandboxAutoAllowSuspended === true;
}
//@ chunk-dcmhvw5a.js:207652-207786 placement
/**
 * 权限模式 schema（含别名规整）与外部模式 schema，及按宽松程度排序的模式等级表。
 */
var permissionModeSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var externalPermissionModeSchema;
var PERMISSION_MODE_RANK;
deferInit("chunk-dcmhvw5a.js:207652", () => {
  permissionModeSchema = DoctorLazy(() => preprocess(normalizePermissionModeAlias, _enum(PERMISSION_MODES)));
  externalPermissionModeSchema = DoctorLazy(() =>
    preprocess(normalizePermissionModeAlias, _enum(EXTERNAL_PERMISSION_MODES)),
  );
  PERMISSION_MODE_RANK = {
    plan: 0,
    bubble: 1,
    default: 1,
    dontAsk: 1,
    acceptEdits: 2,
    auto: 3,
    bypassPermissions: 4,
  };
});
//@ chunk-dcmhvw5a.js:207786-207885 placement
/**
 * 两个权限模式中取更严格的一个。
 */
function narrowerMode(candidateMode, currentMode) {
  if (!candidateMode) return;
  if (currentMode === "auto" && candidateMode === "acceptEdits") return;
  return PERMISSION_MODE_RANK[candidateMode] <= PERMISSION_MODE_RANK[currentMode] ? candidateMode : undefined;
}
//@ chunk-dcmhvw5a.js:207885-207975 placement
/**
 * isBypassCapableMode：可以绕过权限的模式。
 */
function isBypassCapableMode(mode) {
  return mode === "bypassPermissions" || mode === "acceptEdits" || mode === "auto" || mode === "plan";
}
export {
  isAutoAllowedInMode,
  getMcpPermissionModeOverride,
  isSandboxAutoAllowOff,
  BROWSER_SERVER_NAMES,
  narrowerMode,
  isBypassCapableMode,
  permissionModeSchema,
  isPlanBypass,
  isBypassAllowedInMode,
  isComputerUseTool,
  ALL_BROWSER_SERVER_NAMES,
  ALL_BROWSER_TOOL_PREFIXES,
  CLAUDE_DEVICE,
  CHROME,
  parseMcpModeOverride,
  externalPermissionModeSchema,
};
