/**
 * utils/permissions/remoteBrowser.ts
 *
 * 2.1.316 新增：远程浏览器工具的模式门控与调用限制：判断是否处于远程浏览器模式、工具是否受门控、配置是否可接受。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (2), chunk-gz7b768t.js (3)
 * attribution: placement 5
 */
import { isHttpsCcrUrl, isRemoteBrowserCcrUrl } from "../../services/mcp/ccrMcpUrls.js";
import {
  REMOTE_BROWSER_SERVER_NAME,
  isRemoteBrowserAllowed,
} from "../../services/mcp/remoteBrowserServer.js";
import { isCcsTenant, getMcpClientsFromAccessor } from "../../bootstrap/state.js";
import { isCoworkAny } from "../entrypointKinds.js";
import { env } from "../env.js";
import { isPolicyAllowed } from "../../services/policyLimits/index.js";
import { mcpInfoFromString } from "../../services/mcp/mcpStringUtils.js";
import { normalizeNameForMCP } from "../../services/mcp/normalization.js";

//@ chunk-aepeg2w5.js:818839-818904 placement (2.1.88 match: isHTTPConfig, 1)
/**
 * 判断是否指向 CCR 云端浏览器（remote-browser）MCP 端点的 http 配置：type 为 http，且 url 是 `/v2/ccr-sessions/<id>/remote-browser/mcp` 形式（无凭证/查询/hash），或是带 mcp_server_id 的代理形式。旧版名 isHTTPConfig 不准确。
 */
function isRemoteBrowserHttpConfig(config) {
  return config.type === "http" && (isHttpsCcrUrl(config.url) || isRemoteBrowserCcrUrl(config.url));
}
//@ chunk-aepeg2w5.js:818904-818982 placement (2.1.88 match: toScopedConfig, 1)
/**
 * 是否为托管的 Claude in Chrome 动态 MCP 服务器（切分可疑：与 print.ts 关系弱）。
 */
function toScopedConfig(config) {
  return (
    config.name === REMOTE_BROWSER_SERVER_NAME &&
    config.config.scope === "dynamic" &&
    isRemoteBrowserHttpConfig(config.config)
  );
}
//@ chunk-gz7b768t.js:5877-5978 placement
/**
 * 判断远程浏览器（CCR 云端浏览器）"模式下限"是否生效：特定托管环境开关打开，或远程会话里配置了云端浏览器服务器且开关允许。
 */
function isRemoteBrowserModeFloorOn() {
  if (isCcsTenant() && isRemoteBrowserAllowed()) return true;
  return (
    isCoworkAny() &&
    env.CLAUDE_CODE_REMOTE &&
    (getMcpClientsFromAccessor() ?? []).some(toScopedConfig) &&
    isPolicyAllowed()
  );
}
//@ chunk-gz7b768t.js:5978-6058 placement (2.1.88 match: getToolNameForPermissionCheck, 1)
/**
 * 判断工具是否是云端浏览器服务器的工具且模式下限生效（此时该工具不能被自动放行）。旧版名 getToolNameForPermissionCheck 配错。
 */
function isRemoteBrowserToolUnderModeFloor(tool) {
  return (
    (tool.mcpInfo?.serverName ?? mcpInfoFromString(tool.name)?.serverName) === REMOTE_BROWSER_SERVER_NAME &&
    isRemoteBrowserModeFloorOn()
  );
}
//@ chunk-gz7b768t.js:6271-6342 placement (2.1.88 match: getToolNameForPermissionCheck, 1)
/**
 * 对仅有工具名的调用判断是否要拒绝在常规权限检查之外放行云端浏览器调用（把名字当作服务器名套用 SH）。
 */
function refusesRemoteBrowserCallOutsideChecks(tool) {
  let normalizedName = normalizeNameForMCP(tool);
  return isRemoteBrowserToolUnderModeFloor({
    name: normalizedName,
    mcpInfo: {
      serverName: normalizedName,
    },
  });
}
export {
  isRemoteBrowserToolUnderModeFloor,
  isRemoteBrowserModeFloorOn,
  isRemoteBrowserHttpConfig,
  refusesRemoteBrowserCallOutsideChecks,
  toScopedConfig,
};
