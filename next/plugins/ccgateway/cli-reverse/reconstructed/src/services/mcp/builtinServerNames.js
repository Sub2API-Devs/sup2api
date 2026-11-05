/**
 * services/mcp/builtinServerNames.ts
 *
 * 2.1.316 新增：是否为内置/保留的 MCP 服务器名（Slack 登录、远程设备等）；浏览器/远程设备工具名集合等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-exfmq47h.js (16)
 * attribution: placement 16
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { mcpInfoFromString, getMcpPrefix as getMcpPrefix_2 } from "./mcpStringUtils.js";
import {
  REMOTE_DEVICES,
  ARTIFACTS_SERVER_NAME,
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
import { CLAUDE_AI, CLAUDEAI_SERVER_PREFIX } from "./normalization.js";
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
import { READ } from "../../tools/FileReadTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { EDIT } from "../../tools/FileEditTool/constants.js";
import { GLOB_TOOL_NAME } from "../../tools/GlobTool/prompt.js";
import { GREP_TOOL_NAME } from "../../tools/GrepTool/prompt.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-exfmq47h.js:840072-840125 placement
/**
 * 由服务器前缀（mcp__<name>__）取出服务器名。
 */
function serverNameFromPrefix(prefix) {
  return mcpInfoFromString(`${getMcpPrefix_2(prefix)}tool`)?.serverName;
}
//@ chunk-exfmq47h.js:840125-840214 placement
/**
 * 把若干前缀批量转成服务器名集合。
 */
function serverNameSet(prefixes) {
  let names = new Set();
  for (let prefix of prefixes) {
    let serverName = serverNameFromPrefix(prefix);
    if (serverName !== undefined) names.add(serverName);
  }
  return names;
}
//@ chunk-exfmq47h.js:840214-840286 placement
/**
 * 远程浏览器服务器的名字。
 */
var MAYBE_LOCAL_SERVER_NAMES; // deferred: uses REMOTE_DEVICES (./firstPartyServerIds.js) of its import cycle while loading; runs once the cycle is complete
var MAYBE_LOCAL_SERVER_NAME_SET;
var WIDGETS_SERVER_NAME;
var REMOTE_BROWSER_SERVER_NAME_2;
deferInit("chunk-exfmq47h.js:840214", () => {
  MAYBE_LOCAL_SERVER_NAMES = new Set(["hearthbot", REMOTE_DEVICES, ARTIFACTS_SERVER_NAME, CCR_EMAIL]);
  MAYBE_LOCAL_SERVER_NAME_SET = serverNameSet(MAYBE_LOCAL_SERVER_NAMES);
  WIDGETS_SERVER_NAME = serverNameFromPrefix(WIDGETS);
  REMOTE_BROWSER_SERVER_NAME_2 = serverNameFromPrefix(REMOTE_BROWSER_SERVER_NAME);
});
//@ chunk-exfmq47h.js:840286-840360 placement
/**
 * 判断是否涉及 docs 服务器。
 */
function isDocsServer(name, serverName) {
  for (let candidate of DOCS_SERVER_NAMES)
    if (sameNormalizedServer(serverName, candidate) || sameNormalizedServer(name, candidate)) return true;
  return false;
}
//@ chunk-exfmq47h.js:840360-840402 placement
/**
 * 计算机使用相关服务器名集合。
 */
var BROWSER_SERVER_NAME_SET; // deferred: uses serverNameSet of its import cycle while loading; runs once the cycle is complete
var COMPUTER_USE_SERVER_NAME_SET;
deferInit("chunk-exfmq47h.js:840360", () => {
  BROWSER_SERVER_NAME_SET = serverNameSet(BROWSER_SERVER_NAMES);
  COMPUTER_USE_SERVER_NAME_SET = serverNameSet([
    ...ALL_BROWSER_SERVER_NAMES,
    COMPUTER_USE_MCP_SERVER_NAME,
    WORKSPACE,
    CLAUDE_DEVICE,
  ]);
});
//@ chunk-exfmq47h.js:840402-840460 placement
/**
 * 判断是否为桌面连接器（claude.ai 前缀）服务器名。
 */
function isDesktopConnectorServerName(prefix) {
  return desktopConnectorNames() && (serverNameFromPrefix(prefix)?.startsWith(CLAUDE_AI) ?? false);
}
//@ chunk-exfmq47h.js:840460-841209 placement
/**
 * 是否为内置/保留的 MCP 服务器名（Slack 登录、远程设备等）。
 */
function isBuiltinMcpServerName(name, ctx) {
  if (isPrototypeKey(name)) return true;
  if (name === "Slack sign-in (Claude Code tag)") return true;
  let serverName = serverNameFromPrefix(name);
  if (isDocsServer(name, serverName ?? ""))
    return (
      (ctx?.hosted ?? env.CLAUDE_CODE_REMOTE) &&
      !(ctx?.hostCarrier && DOCS_SERVER_NAMES.has(name) && (!ctx.config || isDocsServerId(ctx.config)))
    );
  if (serverName === undefined) return false;
  if (isDesktopConnectorServerName(name)) return true;
  if (serverName === WIDGETS_SERVER_NAME)
    return (ctx?.hosted ?? env.CLAUDE_CODE_REMOTE) && !(ctx?.hostCarrier && name === WIDGETS);
  if (serverName === "webagent" || serverName === "claude-code-remote")
    return !(ctx?.hostCarrier && name === serverName);
  if (MAYBE_LOCAL_SERVER_NAME_SET.has(serverName))
    return !(
      ctx?.hostCarrier &&
      MAYBE_LOCAL_SERVER_NAMES.has(name) &&
      (name !== ARTIFACTS_SERVER_NAME || !ctx.config || isMemoryServerId(ctx.config))
    );
  if (serverName === REMOTE_BROWSER_SERVER_NAME_2 && isPolicyAllowed())
    return (
      (ctx?.hosted ?? env.CLAUDE_CODE_REMOTE) &&
      !(
        ctx?.hostCarrier &&
        name === REMOTE_BROWSER_SERVER_NAME &&
        ctx.config !== undefined &&
        isRemoteBrowserHttpConfig(ctx.config)
      )
    );
  if (BROWSER_SERVER_NAME_SET.has(serverName))
    return !(ctx?.hostCarrier && ctx.config && isLocalBrowserServerConfig(name, ctx.config));
  if (
    ctx?.hostCarrier &&
    name === CLAUDE_IN_CHROME_MCP_SERVER_NAME &&
    ctx.config &&
    isClaudeAiProxyServer(ctx.config)
  )
    return false;
  return COMPUTER_USE_SERVER_NAME_SET.has(serverName);
}
//@ chunk-exfmq47h.js:841352-841469 placement
/**
 * 判断远程会话中的远程浏览器 MCP 服务器是否都是带作用域的受信配置。
 */
function isRemoteBrowserScoped(mcpClientsFromAccessor) {
  let clients = mcpClientsFromAccessor ?? [];
  return (
    env.CLAUDE_CODE_REMOTE &&
    clients.some((client) => client.name === REMOTE_BROWSER_SERVER_NAME) &&
    clients.every((client) => client.name !== REMOTE_BROWSER_SERVER_NAME || toScopedConfig(client))
  );
}
//@ chunk-exfmq47h.js:841469-841533 placement (2.1.88 match: isHTTPConfig, 1)
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
//@ chunk-exfmq47h.js:841533-841678 placement (2.1.88 match: toScopedConfig, 0.779)
/**
 * MCP 配置的 url 有效且作用域合法（动态作用域须来自插件）。
 */
function toScopedConfig_2(config) {
  if (typeof config.url !== "string" || !isSameOriginAsCcr(config.url)) return false;
  if (config.scope === undefined) return false;
  return config.scope !== "dynamic" || config.pluginSource !== undefined;
}
//@ chunk-exfmq47h.js:841678-841846 placement
/**
 * 列出保留的 MCP 服务器名（内置连接器、浏览器、Computer Use、工作区、设备等），用户配置不能使用这些名称。
 */
function reservedMcpServerNames() {
  let names = [
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
  names.push("webagent", "claude-code-remote");
  if (isPolicyAllowed()) names.push(REMOTE_BROWSER_SERVER_NAME);
  return names;
}
//@ chunk-exfmq47h.js:841846-841890 placement
/**
 * 回环主机名集合。
 */
var LOOPBACK_HOSTNAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-exfmq47h.js:841846", () => {
  LOOPBACK_HOSTNAMES = new Set(["127.0.0.1", "[::1]", "::1"]);
});
//@ chunk-exfmq47h.js:841890-842072 placement
function isLocalBrowserServerConfig(name, config) {
  if (!BROWSER_SERVER_NAMES.has(name) || config.type !== "http") return false;
  let parsed;
  try {
    parsed = new URL(config.url);
  } catch {
    return false;
  }
  return (
    parsed.protocol === "http:" &&
    parsed.username === "" &&
    parsed.password === "" &&
    LOOPBACK_HOSTNAMES.has(parsed.hostname)
  );
}
//@ chunk-exfmq47h.js:842072-842121 placement (2.1.88 match: getServerCommandArray, 1)
/**
 * 是否为 stdio 配置。
 */
function isStdioConfig(config) {
  return config.type === "stdio" || !config.type;
}
//@ chunk-exfmq47h.js:842121-842166 placement
/**
 * 是否为本机 stdio 服务器。
 */
function isReservedStdioServer(name, config) {
  return isStdioConfig(config) && (isClaudeInChromeMCPServer(name) || false);
}
//@ chunk-exfmq47h.js:842166-842687 placement
/**
 * 远程协作（cowork）服务器名。
 */
var CHROME_TOOL_NAMES; // deferred: uses BATCH_RESTRICTED_TOOLS (../../utils/claudeInChrome/common.js) of its import cycle while loading; runs once the cycle is complete
var COMPUTER_USE_TOOL_NAMES;
var DEVICE_TOOL_NAMES;
var UPSTREAM_TOOL_NAME_SET;
var DEVICE_TOOL_NAME_SET;
var REMOTE_COWORK_SERVER_NAMES;
deferInit("chunk-exfmq47h.js:842166", () => {
  CHROME_TOOL_NAMES = new Set(CHROME_TOOL_NAMES_2.map((toolName) => CLAUDEAI_SERVER_PREFIX(toolName)));
  COMPUTER_USE_TOOL_NAMES = new Set(CU_TOOL_NAMES.map((toolName) => CLAUDEAI_SERVER_PREFIX(toolName)));
  DEVICE_TOOL_NAMES = [
    "list_devices",
    "get_device_info",
    "device_bash",
    BASH_TOOL_NAME,
    READ,
    FILE_WRITE_TOOL_NAME,
    EDIT,
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
  UPSTREAM_TOOL_NAME_SET = new Set(
    REMOTE_BROWSER_TOOL_NAMES.map((toolName) => CLAUDEAI_SERVER_PREFIX(toolName)),
  );
  DEVICE_TOOL_NAME_SET = new Set(DEVICE_TOOL_NAMES.map((toolName) => CLAUDEAI_SERVER_PREFIX(toolName)));
  REMOTE_COWORK_SERVER_NAMES = new Set([
    "remote_cowork",
    "remote_cowork_trigger",
    "local-agent",
    "local_agent",
  ]);
});
export {
  REMOTE_COWORK_SERVER_NAMES,
  CHROME_TOOL_NAMES,
  COMPUTER_USE_TOOL_NAMES,
  DEVICE_TOOL_NAME_SET,
  UPSTREAM_TOOL_NAME_SET,
  isReservedStdioServer,
  isBuiltinMcpServerName,
  isStdioConfig,
  isClaudeAiProxyServer,
  isRemoteBrowserScoped,
  isDesktopConnectorServerName,
  toScopedConfig_2,
  reservedMcpServerNames,
};
