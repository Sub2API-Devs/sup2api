/**
 * utils/permissions/browserToolNames.ts
 *
 * 2.1.316 新增：当前权限模式下工具是否自动允许；浏览器类 MCP 服务器名集合（Claude Preview、Claude in Chrome）等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-z20c443b.js (15)
 * attribution: placement 15
 */
import { CLAUDEAI_SERVER_PREFIX } from "../../services/mcp/normalization.js";
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

//@ chunk-z20c443b.js:200229-200505 placement
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
deferInit("chunk-z20c443b.js:200229", () => {
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
//@ chunk-z20c443b.js:200505-200610 placement
function isRemoteDeviceToolWithPrefix(tool, prefixes) {
  if (tool?.serverName !== REMOTE_DEVICES) return false;
  let normalizedToolName = CLAUDEAI_SERVER_PREFIX(tool.toolName);
  return prefixes.some((prefix) => normalizedToolName.startsWith(prefix));
}
//@ chunk-z20c443b.js:200610-200676 placement
function isBrowserComputerUseTool(tool) {
  return (
    (tool !== undefined && BROWSER_SERVER_NAMES.has(tool.serverName)) ||
    isRemoteDeviceToolWithPrefix(tool, CLAUDE_BROWSER_TOOL_PREFIXES)
  );
}
//@ chunk-z20c443b.js:200676-200753 placement
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
//@ chunk-z20c443b.js:200753-200871 placement
function isBrowserMcpTool(tool) {
  return (
    (tool !== undefined && CHROME_IN_SERVER_NAMES.has(tool.serverName)) ||
    isRemoteDeviceToolWithPrefix(tool, CHROME_TOOL_PREFIXES) ||
    (tool?.serverName === CLAUDE_DEVICE && CLAUDEAI_SERVER_PREFIX(tool.toolName).startsWith(CHROME))
  );
}
//@ chunk-z20c443b.js:200871-201233 placement
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
//@ chunk-z20c443b.js:201233-201379 placement
/**
 * 取工具所属 MCP 服务器的权限模式覆盖值。
 */
function getMcpPermissionModeOverride(tool, toolPermissionContext) {
  let serverName = tool?.mcpInfo?.serverName;
  return serverName !== undefined && toolPermissionContext.mcpPermissionModeOverrides !== undefined
    ? getOwn(toolPermissionContext.mcpPermissionModeOverrides, serverName)
    : undefined;
}
//@ chunk-z20c443b.js:201379-201516 placement
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
//@ chunk-z20c443b.js:201516-201554 placement
function isPlanMode(toolPermissionContext) {
  return toolPermissionContext.mode === "plan";
}
//@ chunk-z20c443b.js:201554-201604 placement
/**
 * 计划模式且可绕过权限。
 */
function isPlanBypass(mode, isBypassPermissionsModeAvailable) {
  return mode === "plan" && isBypassPermissionsModeAvailable === true && !getIsNonInteractiveSession();
}
//@ chunk-z20c443b.js:201604-201715 placement
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
//@ chunk-z20c443b.js:201715-201778 placement
/**
 * 沙箱自动允许是否关闭或暂停。
 */
function isSandboxAutoAllowOff(toolPermissionContext) {
  return isPlanMode(toolPermissionContext) || toolPermissionContext.sandboxAutoAllowSuspended === true;
}
//@ chunk-z20c443b.js:201778-201912 placement
/**
 * 权限模式 schema（含别名规整）与外部模式 schema，及按宽松程度排序的模式等级表。
 */
var permissionModeSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var externalPermissionModeSchema;
var PERMISSION_MODE_RANK;
deferInit("chunk-z20c443b.js:201778", () => {
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
//@ chunk-z20c443b.js:201912-202011 placement (2.1.88 match: getAutoAllowedCommands, 0.728)
/**
 * 两个权限模式中取更严格的一个。
 */
function narrowerMode(candidateMode, currentMode) {
  if (!candidateMode) return;
  if (currentMode === "auto" && candidateMode === "acceptEdits") return;
  return PERMISSION_MODE_RANK[candidateMode] <= PERMISSION_MODE_RANK[currentMode] ? candidateMode : undefined;
}
//@ chunk-z20c443b.js:202011-202101 placement
/**
 * isBypassCapableMode：可以绕过权限的模式。
 */
function isBypassCapableMode(mode) {
  return mode === "bypassPermissions" || mode === "acceptEdits" || mode === "auto" || mode === "plan";
}
export {
  isAutoAllowedInMode,
  getMcpPermissionModeOverride,
  isBypassAllowedInMode,
  isSandboxAutoAllowOff,
  ALL_BROWSER_SERVER_NAMES,
  ALL_BROWSER_TOOL_PREFIXES,
  CLAUDE_DEVICE,
  CHROME,
  isComputerUseTool,
  isPlanBypass,
  narrowerMode,
  externalPermissionModeSchema,
  BROWSER_SERVER_NAMES,
  isBypassCapableMode,
  permissionModeSchema,
  parseMcpModeOverride,
};
