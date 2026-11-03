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
import { Ka, U } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  normalizePermissionModeAlias,
  PERMISSION_MODES,
  EXTERNAL_PERMISSION_MODES,
} from "../../types/permissions.js";

/**
 * 浏览器类 MCP 服务器名集合（Claude Preview、Claude in Chrome）。
 */
//@ chunk-dcmhvw5a.js:206103-206379 placement
var BROWSER_SERVER_NAMES = new Set(["Claude Preview", "Claude Browser"]),
  ic = new Set(["claude-in-chrome", "Claude in Chrome"]),
  tOn = new Set([...ic, ...BROWSER_SERVER_NAMES]),
  REMOTE_DEVICES = "remote-devices",
  ac = ["Claude_Browser__"],
  lc = ["claude-in-chrome__", "Claude_in_Chrome__"],
  R_r = [...ac, ...lc],
  CLAUDE_DEVICE = "claude-device",
  CHROME = "chrome_";
//@ chunk-dcmhvw5a.js:206379-206484 placement
function isRemoteDeviceToolWithPrefix(e, n) {
  if (e?.serverName !== REMOTE_DEVICES) return !1;
  let r = normalizeNameForMCP(e.toolName);
  return n.some((s) => r.startsWith(s));
}
//@ chunk-dcmhvw5a.js:206484-206550 placement
function Fb(e) {
  return (e !== void 0 && BROWSER_SERVER_NAMES.has(e.serverName)) || isRemoteDeviceToolWithPrefix(e, ac);
}
/**
 * 工具是否来自 computer use 服务器（托管桌面）。
 */
//@ chunk-dcmhvw5a.js:206550-206627 placement
function isComputerUseTool(e) {
  return (
    isHostedDesktopSession() &&
    e != null &&
    mcpInfoFromString(getMcpPrefix(e.serverName))?.serverName === COMPUTER_USE_MCP_SERVER_NAME
  );
}
//@ chunk-dcmhvw5a.js:206627-206745 placement
function isBrowserMcpTool(e) {
  return (
    (e !== void 0 && ic.has(e.serverName)) ||
    isRemoteDeviceToolWithPrefix(e, lc) ||
    (e?.serverName === CLAUDE_DEVICE && normalizeNameForMCP(e.toolName).startsWith(CHROME))
  );
}
/**
 * 当前权限模式下工具是否自动允许。
 */
//@ chunk-dcmhvw5a.js:206745-207107 placement
function isAutoAllowedInMode(e, n) {
  let r = getMcpPermissionModeOverride(e, n),
    s =
      n.mode === "bypassPermissions" ||
      n.mode === "auto" ||
      isPlanBypass(n.mode, n.isBypassPermissionsModeAvailable);
  if (typeof r === "string" && s) return r;
  if (
    s &&
    (Fb(e?.mcpInfo) ||
      isComputerUseTool(e?.mcpInfo) ||
      e?.excludedFromModeBypassAllow?.() === !0 ||
      (isBrowserMcpTool(e?.mcpInfo) && n.chromeClassifierFloorEnabled === !0))
  )
    return n.canAutoClassifierRun === !0 ? "auto" : "default";
  return n.mode;
}
/**
 * 取工具所属 MCP 服务器的权限模式覆盖值。
 */
//@ chunk-dcmhvw5a.js:207107-207253 placement
function getMcpPermissionModeOverride(e, n) {
  let r = e?.mcpInfo?.serverName;
  return r !== void 0 && n.mcpPermissionModeOverrides !== void 0
    ? getOwn(n.mcpPermissionModeOverrides, r)
    : void 0;
}
/**
 * 校验 MCP 权限模式覆盖值：null 表示无覆盖，只接受 default 与 auto。
 */
//@ chunk-dcmhvw5a.js:207253-207390 placement
function parseMcpModeOverride(e) {
  if (e === null) return { ok: !0, override: void 0 };
  if (e === "default" || e === "auto") return { ok: !0, override: e };
  return { ok: !1, rejected: e };
}
//@ chunk-dcmhvw5a.js:207390-207428 placement
function Gb(e) {
  return e.mode === "plan";
}
/**
 * 计划模式且可绕过权限。
 */
//@ chunk-dcmhvw5a.js:207428-207478 placement
function isPlanBypass(e, n) {
  return e === "plan" && n === !0 && !getIsNonInteractiveSession();
}
/**
 * 当前模式是否以绕过方式自动放行该工具（bypassPermissions 或计划模式下的绕过），工具声明排除时除外。
 */
//@ chunk-dcmhvw5a.js:207478-207589 placement
function isBypassAllowedInMode(e, n, r, s) {
  return (
    (n === "bypassPermissions" || (isPlanBypass(n, r) && s !== !0)) &&
    e.excludedFromModeBypassAllow?.() !== !0
  );
}
/**
 * 沙箱自动允许是否关闭或暂停。
 */
//@ chunk-dcmhvw5a.js:207589-207652 placement
function isSandboxAutoAllowOff(e) {
  return Gb(e) || e.sandboxAutoAllowSuspended === !0;
}
/**
 * 权限模式 schema（含别名规整）与外部模式 schema，及按宽松程度排序的模式等级表。
 */
//@ chunk-dcmhvw5a.js:207652-207786 placement
var permissionModeSchema = DoctorLazy(() => Ka(normalizePermissionModeAlias, U(PERMISSION_MODES))),
  externalPermissionModeSchema = DoctorLazy(() =>
    Ka(normalizePermissionModeAlias, U(EXTERNAL_PERMISSION_MODES)),
  ),
  PERMISSION_MODE_RANK = {
    plan: 0,
    bubble: 1,
    default: 1,
    dontAsk: 1,
    acceptEdits: 2,
    auto: 3,
    bypassPermissions: 4,
  };
/**
 * 两个权限模式中取更严格的一个。
 */
//@ chunk-dcmhvw5a.js:207786-207885 placement
function narrowerMode(e, n) {
  if (!e) return;
  if (n === "auto" && e === "acceptEdits") return;
  return PERMISSION_MODE_RANK[e] <= PERMISSION_MODE_RANK[n] ? e : void 0;
}
//@ chunk-dcmhvw5a.js:207885-207975 placement
function I_r(e) {
  return e === "bypassPermissions" || e === "acceptEdits" || e === "auto" || e === "plan";
}

export {
  isAutoAllowedInMode,
  getMcpPermissionModeOverride,
  isSandboxAutoAllowOff,
  BROWSER_SERVER_NAMES,
  narrowerMode,
  I_r,
  permissionModeSchema,
  isPlanBypass,
  isBypassAllowedInMode,
  isComputerUseTool,
  tOn,
  R_r,
  CLAUDE_DEVICE,
  CHROME,
  parseMcpModeOverride,
  externalPermissionModeSchema,
};
