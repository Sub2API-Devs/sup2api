/**
 * services/mcp/builtinServerNames.ts
 *
 * 2.1.316 新增：是否为内置/保留的 MCP 服务器名（Slack 登录、远程设备等）；浏览器/远程设备工具名集合等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (16)
 * attribution: placement 16
 */
import { mcpInfoFromString, getMcpPrefix as getMcpPrefix_2 } from "./mcpStringUtils.js";
import {
  REMOTE_DEVICES,
  CLAUDE_AI,
  CCR_EMAIL,
  WIDGETS,
  DOCS_SERVER_NAMES,
  sameNormalizedServer,
  isDocsServerId,
  isMemoryServerId,
  mcpServerIdHeader,
  MEMORY_SERVER_ID_2,
} from "./firstPartyServerIds.js";
import { REMOTE_BROWSER_SERVER_NAME, REMOTE_BROWSER_TOOL_NAMES } from "./remoteBrowserServer.js";
import {
  BROWSER_SERVER_NAMES,
  ALL_BROWSER_SERVER_NAMES,
  CLAUDE_DEVICE,
} from "../../utils/permissions/browserToolNames.js";
import { COMPUTER_USE_MCP_SERVER_NAME } from "../../utils/computerUse/common.js";
import { WORKSPACE } from "../../utils/permissions/permissionRuleParser.js";
import { desktopConnectorNames } from "../../utils/sessionShape.js";
import { CLAUDE_AI as CLAUDE_AI_2, normalizeNameForMCP } from "./normalization.js";
import { isPrototypeKey } from "../../schemas/hookEntryValidation.js";
import { env } from "../../utils/env.js";
import { isPolicyAllowed } from "../policyLimits/index.js";
import { isRemoteBrowserHttpConfig, toScopedConfig } from "../../utils/permissions/remoteBrowser.js";
import {
  CLAUDE_IN_CHROME_MCP_SERVER_NAME,
  isClaudeInChromeMCPServer,
  CHROME_TOOL_NAMES as CHROME_TOOL_NAMES_2,
} from "../../utils/claudeInChrome/common.js";
import { isCcrSessionMcpUrl, isSameOriginAsCcr } from "./ccrMcpUrls.js";
import { CU_TOOL_NAMES } from "../../utils/computerUse/toolRendering.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { FILE_EDIT_TOOL_NAME } from "../../tools/FileEditTool/constants.js";
import { GLOB_TOOL_NAME } from "../../tools/GlobTool/prompt.js";
import { GREP_TOOL_NAME } from "../../tools/GrepTool/prompt.js";

//@ chunk-aepeg2w5.js:817702-817755 placement
/**
 * 由服务器前缀（mcp__<name>__）取出服务器名。
 */
function serverNameFromPrefix(e) {
  return mcpInfoFromString(`${getMcpPrefix_2(e)}tool`)?.serverName;
}
//@ chunk-aepeg2w5.js:817755-817844 placement
/**
 * 把若干前缀批量转成服务器名集合。
 */
function serverNameSet(e) {
  let n = new Set();
  for (let r of e) {
    let s = serverNameFromPrefix(r);
    if (s !== undefined) n.add(s);
  }
  return n;
}
//@ chunk-aepeg2w5.js:817844-817916 placement
/**
 * 远程浏览器服务器的名字。
 */
var MAYBE_LOCAL_SERVER_NAMES = new Set(["hearthbot", REMOTE_DEVICES, CLAUDE_AI, CCR_EMAIL]);
var MAYBE_LOCAL_SERVER_NAME_SET = serverNameSet(MAYBE_LOCAL_SERVER_NAMES);
var WIDGETS_SERVER_NAME = serverNameFromPrefix(WIDGETS);
var REMOTE_BROWSER_SERVER_NAME_2 = serverNameFromPrefix(REMOTE_BROWSER_SERVER_NAME);
//@ chunk-aepeg2w5.js:817916-817990 placement
/**
 * 判断是否涉及 docs 服务器。
 */
function isDocsServer(e, n) {
  for (let r of DOCS_SERVER_NAMES) if (sameNormalizedServer(n, r) || sameNormalizedServer(e, r)) return true;
  return false;
}
//@ chunk-aepeg2w5.js:817990-818032 placement
/**
 * 计算机使用相关服务器名集合。
 */
var BROWSER_SERVER_NAME_SET = serverNameSet(BROWSER_SERVER_NAMES);
var COMPUTER_USE_SERVER_NAME_SET = serverNameSet([
  ...ALL_BROWSER_SERVER_NAMES,
  COMPUTER_USE_MCP_SERVER_NAME,
  WORKSPACE,
  CLAUDE_DEVICE,
]);
//@ chunk-aepeg2w5.js:818032-818090 placement
/**
 * 判断是否为桌面连接器（claude.ai 前缀）服务器名。
 */
function isDesktopConnectorServerName(e) {
  return desktopConnectorNames() && (serverNameFromPrefix(e)?.startsWith(CLAUDE_AI_2) ?? false);
}
//@ chunk-aepeg2w5.js:818090-818839 placement
/**
 * 是否为内置/保留的 MCP 服务器名（Slack 登录、远程设备等）。
 */
function isBuiltinMcpServerName(e, n) {
  if (isPrototypeKey(e)) return true;
  if (e === "Slack sign-in (Claude Code tag)") return true;
  let r = serverNameFromPrefix(e);
  if (isDocsServer(e, r ?? ""))
    return (
      (n?.hosted ?? env.CLAUDE_CODE_REMOTE) &&
      !(n?.hostCarrier && DOCS_SERVER_NAMES.has(e) && (!n.config || isDocsServerId(n.config)))
    );
  if (r === undefined) return false;
  if (isDesktopConnectorServerName(e)) return true;
  if (r === WIDGETS_SERVER_NAME)
    return (n?.hosted ?? env.CLAUDE_CODE_REMOTE) && !(n?.hostCarrier && e === WIDGETS);
  if (r === "webagent" || r === "claude-code-remote") return !(n?.hostCarrier && e === r);
  if (MAYBE_LOCAL_SERVER_NAME_SET.has(r))
    return !(
      n?.hostCarrier &&
      MAYBE_LOCAL_SERVER_NAMES.has(e) &&
      (e !== CLAUDE_AI || !n.config || isMemoryServerId(n.config))
    );
  if (r === REMOTE_BROWSER_SERVER_NAME_2 && isPolicyAllowed())
    return (
      (n?.hosted ?? env.CLAUDE_CODE_REMOTE) &&
      !(
        n?.hostCarrier &&
        e === REMOTE_BROWSER_SERVER_NAME &&
        n.config !== undefined &&
        isRemoteBrowserHttpConfig(n.config)
      )
    );
  if (BROWSER_SERVER_NAME_SET.has(r))
    return !(n?.hostCarrier && n.config && isLocalBrowserServerConfig(e, n.config));
  if (n?.hostCarrier && e === CLAUDE_IN_CHROME_MCP_SERVER_NAME && n.config && isClaudeAiProxyServer(n.config))
    return false;
  return COMPUTER_USE_SERVER_NAME_SET.has(r);
}
//@ chunk-aepeg2w5.js:818982-819099 placement
/**
 * 判断远程会话中的远程浏览器 MCP 服务器是否都是带作用域的受信配置。
 */
function isRemoteBrowserScoped(mcpClientsFromAccessor) {
  let n = mcpClientsFromAccessor ?? [];
  return (
    env.CLAUDE_CODE_REMOTE &&
    n.some((r) => r.name === REMOTE_BROWSER_SERVER_NAME) &&
    n.every((r) => r.name !== REMOTE_BROWSER_SERVER_NAME || toScopedConfig(r))
  );
}
//@ chunk-aepeg2w5.js:819099-819163 placement = isHTTPConfig (1)
/**
 * 是否为 claude.ai 代理 MCP 服务器。
 */
function isClaudeAiProxyServer(config) {
  return (
    config.type === "http" &&
    mcpServerIdHeader(config) === MEMORY_SERVER_ID_2 &&
    isCcrSessionMcpUrl(config.url)
  );
}
//@ chunk-aepeg2w5.js:819163-819308 placement = toScopedConfig (0.78)
/**
 * MCP 配置的 url 有效且作用域合法（动态作用域须来自插件）。
 */
function toScopedConfig_2(config) {
  if (typeof config.url !== "string" || !isSameOriginAsCcr(config.url)) return false;
  if (config.scope === undefined) return false;
  return config.scope !== "dynamic" || config.pluginSource !== undefined;
}
//@ chunk-aepeg2w5.js:819308-819476 placement
/**
 * 列出保留的 MCP 服务器名（内置连接器、浏览器、Computer Use、工作区、设备等），用户配置不能使用这些名称。
 */
function reservedMcpServerNames() {
  let e = [
    "Slack sign-in (Claude Code tag)",
    ...MAYBE_LOCAL_SERVER_NAMES,
    ...DOCS_SERVER_NAMES,
    WIDGETS,
    ...BROWSER_SERVER_NAMES,
    ...ALL_BROWSER_SERVER_NAMES,
    COMPUTER_USE_MCP_SERVER_NAME,
    WORKSPACE,
    CLAUDE_DEVICE,
  ];
  e.push("webagent", "claude-code-remote");
  if (isPolicyAllowed()) e.push(REMOTE_BROWSER_SERVER_NAME);
  return e;
}
//@ chunk-aepeg2w5.js:819476-819520 placement
/**
 * 回环主机名集合。
 */
var LOOPBACK_HOSTNAMES = new Set(["127.0.0.1", "[::1]", "::1"]);
//@ chunk-aepeg2w5.js:819520-819702 placement
function isLocalBrowserServerConfig(e, config) {
  if (!BROWSER_SERVER_NAMES.has(e) || config.type !== "http") return false;
  let r;
  try {
    r = new URL(config.url);
  } catch {
    return false;
  }
  return (
    r.protocol === "http:" && r.username === "" && r.password === "" && LOOPBACK_HOSTNAMES.has(r.hostname)
  );
}
//@ chunk-aepeg2w5.js:819702-819751 placement = getServerCommandArray (1)
/**
 * 是否为 stdio 配置。
 */
function isStdioConfig(config) {
  return config.type === "stdio" || !config.type;
}
//@ chunk-aepeg2w5.js:819751-819796 placement
/**
 * 是否为本机 stdio 服务器。
 */
function isReservedStdioServer(e, n) {
  return isStdioConfig(n) && (isClaudeInChromeMCPServer(e) || false);
}
//@ chunk-aepeg2w5.js:819796-820317 placement
/**
 * 远程协作（cowork）服务器名。
 */
var CHROME_TOOL_NAMES = new Set(CHROME_TOOL_NAMES_2.map((e) => normalizeNameForMCP(e)));
var COMPUTER_USE_TOOL_NAMES = new Set(CU_TOOL_NAMES.map((e) => normalizeNameForMCP(e)));
var DEVICE_TOOL_NAMES = [
  "list_devices",
  "get_device_info",
  "device_bash",
  BASH_TOOL_NAME,
  FILE_READ_TOOL_NAME,
  FILE_WRITE_TOOL_NAME,
  FILE_EDIT_TOOL_NAME,
  GLOB_TOOL_NAME,
  GREP_TOOL_NAME,
  "sync_files",
  "device_list_dir",
  "device_stage_files",
  "device_commit_files",
  "device_request_folder_access",
  "device_request_delete_permission",
  "create_artifact",
  "update_artifact",
  "list_artifacts",
  "project_memory_read",
  "project_memory_write",
];
var UPSTREAM_TOOL_NAME_SET = new Set(REMOTE_BROWSER_TOOL_NAMES.map((e) => normalizeNameForMCP(e)));
var DEVICE_TOOL_NAME_SET = new Set(DEVICE_TOOL_NAMES.map((e) => normalizeNameForMCP(e)));
var REMOTE_COWORK_SERVER_NAMES = new Set([
  "remote_cowork",
  "remote_cowork_trigger",
  "local-agent",
  "local_agent",
]);
export {
  isBuiltinMcpServerName,
  isDesktopConnectorServerName,
  isClaudeAiProxyServer,
  toScopedConfig_2,
  isReservedStdioServer,
  reservedMcpServerNames,
  isStdioConfig,
  REMOTE_COWORK_SERVER_NAMES,
  CHROME_TOOL_NAMES,
  COMPUTER_USE_TOOL_NAMES,
  DEVICE_TOOL_NAME_SET,
  UPSTREAM_TOOL_NAME_SET,
  isRemoteBrowserScoped,
};
