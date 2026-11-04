/**
 * services/mcp/utils.ts
 *
 * MCP 工具/服务器名辅助
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/mcp/utils.ts
 * pieces: chunk-1wpnxx5r.js (1), chunk-bk3xs38h.js (4), chunk-e6aww6q8.js (33), chunk-qaeygs3y.js (2), chunk-wy9dbk5f.js (1), chunk-z8q591p0.js (1)
 * attribution: fingerprint 14, placement 13, callgraph-fingerprint 1, file-local 3, layout 11
 */
import { join } from "path";
import { serverFilePresenceSlot } from "../remoteManagedSettings/seating.js";
import { doesEnterpriseMcpConfigExist, getEnterpriseMcpFilePath, getMcpConfigByName } from "./config.js";
import { UNREACHABLE_ERRNOS } from "./mcpResultErrors.js";
import { shouldBypassProxy } from "../../upstreamproxy/relay.js";
import { normalizeNameForMCP } from "./normalization.js";
import {
  getMcpPrefix as getMcpPrefix_2,
  isToolFromMcpServer,
  isSameMcpServerName,
  mcpInfoFromString,
} from "./mcpStringUtils.js";
import { REOPEN_REFETCH, BEFORE_HANDLER } from "./mcpCallConstants.js";
import { lit as lit_2 } from "../analytics/safeMetadata.js";
import { logMCPDebug } from "../../utils/log.js";
import { getOwn } from "../../utils/objectSafety.js";
import { configHash } from "./client.js";
import { describeGlobalConfigFile } from "../../utils/env.js";
import {
  getProjectConfigRoot,
  getSessionApprovedMcpServers,
  getSessionBypassPermissionsMode,
  getIsNonInteractiveSession,
} from "../../bootstrap/state.js";
import { getCwd } from "../../utils/cwd.js";
import {
  getProjectPathForConfig,
  getWorkspacePersistedTrustKey,
  isLocalSettingsGitTracked,
  isWorkspacePersistedTrusted,
} from "../../utils/config.js";
import { ConfigScopeSchema } from "./types.js";
import {
  projectSettingsAliasesUserSettings,
  getSettingsForSource,
  getSettings_DEPRECATED,
  hasVouchedSkipDangerousModePermissionPrompt,
} from "../../utils/settings/settings.js";
import { getEnabledSettingSources, isSettingSourceEnabled } from "../../utils/settings/constants.js";
import { isReservedStdioServer } from "./builtinServerNames.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, stringSchema, booleanSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-1wpnxx5r.js:15976-16167 fingerprint (2.1.88 match: getLoggingSafeMcpBaseUrl, 0.636)
/**
 * getLoggingSafeMcpBaseUrl：去掉 query、用户名密码、hash 与末尾斜杠的 URL，用于遥测。
 */
function getLoggingSafeMcpBaseUrl(config) {
  if (!("url" in config) || typeof config.url !== "string") return;
  try {
    let url = new URL(config.url);
    url.search = "";
    url.username = "";
    url.password = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return;
  }
}
//@ chunk-qaeygs3y.js:949-1013 fingerprint (2.1.88 match: isMcpTool, 1)
/**
 * isMcpTool：名字以 mcp__ 开头或 isMcp === true。
 */
function isMcpTool(tool) {
  return tool.name?.startsWith("mcp__") || tool.isMcp === true;
}
//@ chunk-qaeygs3y.js:1013-1118 placement (2.1.88 match: findMcpServerConnection, 0.857)
/**
 * 取工具所属 MCP 服务器名：mcpInfo.serverName，或从 mcp__<server>__<tool> 名字中解析。
 */
function getMcpServerNameOfTool(tool) {
  return tool.mcpInfo?.serverName ?? (tool.name?.startsWith("mcp__") ? tool.name.split("__")[1] : undefined);
}
//@ chunk-e6aww6q8.js:3867900-3867912 placement
// deferred: uses serverFilePresenceSlot (../remoteManagedSettings/seating.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:3867900", () => {
  serverFilePresenceSlot.set(doesEnterpriseMcpConfigExist);
});
//@ chunk-e6aww6q8.js:3867912-3868162 placement
/**
 * 可重试的远程 MCP 失败判定所用的集合：远程传输类型、令牌被拒错误码与可重试错误码。
 */
var REMOTE_TRANSPORTS; // deferred: uses CCR_NEEDS_APPROVAL_CODE (./mcpResultErrors.js) of its import cycle while loading; runs once the cycle is complete
var BEARER_REJECT_CODES;
var RETRYABLE_CONNECT_CODES;
deferInit("chunk-e6aww6q8.js:3867912", () => {
  REMOTE_TRANSPORTS = new Set(["http", "sse", "claudeai-proxy"]);
  BEARER_REJECT_CODES = new Set(["CLI_OWNED_BEARER_REJECTED", "HEADERS_HELPER_AUTH_REJECTED"]);
  RETRYABLE_CONNECT_CODES = new Set([
    "500",
    "502",
    "503",
    "504",
    ...UNREACHABLE_ERRNOS,
    "23",
    ...BEARER_REJECT_CODES,
    "CONNECT_TIMEOUT",
    "CONNECT_SUSPENDED",
    "CREDENTIAL_STORE_UNAVAILABLE",
  ]);
});
//@ chunk-e6aww6q8.js:3868162-3868364 placement
/**
 * 判断远程 MCP 连接失败是否可重试（代理 403 除外，按错误码判断，无错误码时 SSE 视为可重试）。
 */
function isRetryableRemoteFailure(client) {
  if (client.type !== "failed") return false;
  let transportType = client.config.type ?? "";
  if (!REMOTE_TRANSPORTS.has(transportType)) return false;
  if (client.proxyConnectStatus === 403) return false;
  if (client.errorCode !== undefined) return RETRYABLE_CONNECT_CODES.has(client.errorCode);
  return transportType === "sse";
}
//@ chunk-e6aww6q8.js:3868364-3868532 placement
/**
 * 判断远程 MCP 连接是否因代理返回 403 而失败（绕过代理的地址除外）。
 */
function isProxyForbiddenFailure(client) {
  return (
    client.type === "failed" &&
    client.proxyConnectStatus === 403 &&
    REMOTE_TRANSPORTS.has(client.config.type ?? "") &&
    !((client.config.type === "http" || client.config.type === "sse") && shouldBypassProxy(client.config.url))
  );
}
//@ chunk-e6aww6q8.js:3868532-3868609 placement
/**
 * 判断远程失败是否可重试（排除 bearer 拒绝类错误）。
 */
function isRetryableConnectionFailure(client) {
  return (
    isRetryableRemoteFailure(client) &&
    (client.errorCode === undefined || !BEARER_REJECT_CODES.has(client.errorCode))
  );
}
//@ chunk-e6aww6q8.js:3868609-3868647 placement
/**
 * 判断是否可重试或属于代理禁止。
 */
function isRetriableOrForbidden(error) {
  return isRetryableRemoteFailure(error) || isProxyForbiddenFailure(error);
}
//@ chunk-e6aww6q8.js:3868647-3868733 placement (2.1.88 match: getMcpPrefix, 1)
/**
 * filterToolsByServer：按 mcp__server__ 前缀过滤工具。
 */
function filterToolsByServer(fullName, serverName) {
  let prefix = `mcp__${normalizeNameForMCP(serverName)}__`;
  return fullName.filter((tool) => tool.name?.startsWith(prefix));
}
//@ chunk-e6aww6q8.js:3868733-3868844 placement (2.1.88 match: getMcpPrefix, 1)
/**
 * commandBelongsToServer：命令名以 mcp__server__ 或 server: 开头。
 */
function commandBelongsToServer(command, serverName) {
  let normalized = normalizeNameForMCP(serverName);
  let name = command.name;
  if (!name) return false;
  return name.startsWith(`mcp__${normalized}__`) || name.startsWith(`${normalized}:`);
}
//@ chunk-e6aww6q8.js:3868844-3868936 fingerprint (2.1.88 match: filterMcpPromptsByServer, 1)
/**
 * 从命令列表中挑出属于某服务器、但不是 MCP 提示词命令的条目（即 MCP skills 等），用于刷新时保留/替换。
 */
function filterMcpPromptsByServer(commands, serverName) {
  return commands.filter(
    (command) =>
      commandBelongsToServer(command, serverName) &&
      !(command.type === "prompt" && command.loadedFrom === "mcp"),
  );
}
//@ chunk-e6aww6q8.js:3868936-3868998 file-local
/**
 * 从工具列表中移除属于某服务器的工具（按服务器名前缀匹配）。
 */
function filterCommandsByServer(commands, serverName) {
  let mcpPrefix = getMcpPrefix_2(serverName);
  return commands.filter((command) => !isToolFromMcpServer(command, serverName, mcpPrefix));
}
//@ chunk-e6aww6q8.js:3868998-3869047 file-local
/**
 * 从命令列表中移除属于某服务器的命令。
 */
function excludeCommandsByServer(commands, serverName) {
  return commands.filter((command) => !commandBelongsToServer(command, serverName));
}
//@ chunk-e6aww6q8.js:3869047-3869099 layout
/**
 * 从对象里删掉某个键并返回新对象。
 */
function omitKey(resources, name) {
  let copy = {
    ...resources,
  };
  delete copy[name];
  return copy;
}
//@ chunk-e6aww6q8.js:3869099-3869170 layout
/**
 * 把刷新原因转成遥测取值。
 */
function refetchReasonTelemetry(cause) {
  return cause === REOPEN_REFETCH
    ? lit_2(REOPEN_REFETCH)
    : cause === BEFORE_HANDLER
      ? lit_2(BEFORE_HANDLER)
      : lit_2("notification");
}
//@ chunk-e6aww6q8.js:3869170-3869276 layout (2.1.88 match: isMcpServerFromProjectOrLocalSettings, 0.81)
/**
 * 判断 project/local 作用域的服务器是否声明在另一个工作区根（declaredIn 与当前根不同）。
 */
function isDeclaredUnderOtherWorkspaceRoot(config, workspaceRoot) {
  return (
    (config.scope === "project" || config.scope === "local") &&
    config.declaredIn !== undefined &&
    config.declaredIn !== workspaceRoot
  );
}
//@ chunk-e6aww6q8.js:3869276-3869649 fingerprint (2.1.88 match: excludeStalePluginClients, 0.728)
/**
 * removeMcpClientsWhere：按谓词剔除客户端，并同步去掉其工具、命令、资源与资源模板，返回剩余状态与 stale 列表。
 */
function removeMcpClientsWhere(mcp, isStale) {
  let stale = mcp.clients.filter(isStale);
  if (stale.length === 0)
    return {
      ...mcp,
      stale: [],
    };
  let { tools, commands, resources } = mcp;
  let resourceTemplates = {
    ...mcp.resourceTemplates,
  };
  for (let client of stale) {
    tools = filterCommandsByServer(tools, client.name);
    commands = excludeCommandsByServer(commands, client.name);
    resources = omitKey(resources, client.name);
    delete resourceTemplates[client.name];
  }
  let staleNames = new Set(stale.map((client) => client.name));
  return {
    clients: mcp.clients.filter((client) => !staleNames.has(client.name)),
    tools,
    commands,
    resources,
    resourceTemplates,
    stale,
  };
}
//@ chunk-e6aww6q8.js:3869649-3870114 layout
/**
 * excludeStalePluginClients：配置刷新后找出过期客户端：声明于旧工作区根、已删除的 dynamic/managed 服务器、配置哈希变化。
 */
function excludeStalePluginClients(mcp, configs, workspaceRoot) {
  return removeMcpClientsWhere(mcp, (client) => {
    if (workspaceRoot !== undefined && isDeclaredUnderOtherWorkspaceRoot(client.config, workspaceRoot)) {
      logMCPDebug(
        client.name,
        "excludeStalePluginClients: marking stale (declared under a previous workspace root)",
      );
      return true;
    }
    let currentConfig = getOwn(configs, client.name);
    if (!currentConfig) {
      if (client.config.scope === "dynamic" || client.config.scope === "managed") {
        logMCPDebug(client.name, "excludeStalePluginClients: marking stale (removed)");
        return true;
      }
      return false;
    }
    if (configHash(client.config) !== configHash(currentConfig)) {
      logMCPDebug(client.name, "excludeStalePluginClients: marking stale (config hash changed)");
      return true;
    }
    return false;
  });
}
//@ chunk-e6aww6q8.js:3870114-3870484 fingerprint (2.1.88 match: describeMcpConfigFilePath, 0.801)
/**
 * describeMcpConfigFilePath：作用域对应的配置位置描述（~/.claude.json、<项目>/.mcp.json、managed-mcp.json、managedMcpServers、claude.ai、agent frontmatter 等）。
 */
function describeMcpConfigFilePath(scope) {
  switch (scope) {
    case "user":
      return describeGlobalConfigFile();
    case "project":
      return join(getProjectConfigRoot() ?? getCwd(), ".mcp.json");
    case "local":
      return `${describeGlobalConfigFile()} [project: ${getProjectPathForConfig()}]`;
    case "dynamic":
      return "Dynamically configured";
    case "enterprise":
      return getEnterpriseMcpFilePath();
    case "managed":
      return "managed settings (managedMcpServers)";
    case "claudeai":
      return "claude.ai";
    case "agent":
      return "agent frontmatter";
    default:
      return scope;
  }
}
//@ chunk-e6aww6q8.js:3870484-3871018 fingerprint (2.1.88 match: getScopeLabel, 0.849)
/**
 * getScopeLabel：作用域的人类可读标签（Local/Project/User/Dynamic/Enterprise/Managed/claude.ai/Agent config）。
 */
function getScopeLabel(scope) {
  switch (scope) {
    case "local":
      return "Local config (private to you in this project)";
    case "project":
      return "Project config (shared via .mcp.json)";
    case "user":
      return "User config (available in all your projects)";
    case "dynamic":
      return "Dynamic config (from command line)";
    case "enterprise":
      return "Enterprise config (managed by your organization)";
    case "managed":
      return "Managed settings (provided by your organization)";
    case "claudeai":
      return "claude.ai config";
    case "agent":
      return "Agent config (from agent frontmatter)";
    default:
      return scope;
  }
}
//@ chunk-e6aww6q8.js:3871018-3871173 fingerprint (2.1.88 match: ensureConfigScope, 1)
/**
 * ensureConfigScope：校验 --scope 参数，缺省 local。
 */
function ensureConfigScope(scope) {
  if (!scope) return "local";
  if (!ConfigScopeSchema().options.includes(scope))
    throw Error(`Invalid scope: ${scope}. Must be one of: ${ConfigScopeSchema().options.join(", ")}`);
  return scope;
}
//@ chunk-e6aww6q8.js:3871173-3871393 fingerprint (2.1.88 match: ensureTransport, 0.75)
/**
 * ensureTransport：校验 --transport，缺省 stdio，streamable-http 归为 http，只接受 stdio/sse/http。
 */
function ensureTransport(type) {
  if (!type) return "stdio";
  if (type === "streamable-http") return "http";
  if (type !== "stdio" && type !== "sse" && type !== "http")
    throw Error(`Invalid transport type: ${type}. Must be one of: stdio, sse, http (or streamable-http)`);
  return type;
}
//@ chunk-e6aww6q8.js:3871393-3871695 fingerprint (2.1.88 match: parseHeaders, 1)
/**
 * parseHeaders：把 "Name: value" 字符串数组解析成头对象，格式不对抛错。
 */
function parseHeaders(headerArray) {
  let headers = {};
  for (let header of headerArray) {
    let colonIndex = header.indexOf(":");
    if (colonIndex === -1)
      throw Error(`Invalid header format: "${header}". Expected format: "Header-Name: value"`);
    let key = header.substring(0, colonIndex).trim();
    let value = header.substring(colonIndex + 1).trim();
    if (!key) throw Error(`Invalid header: "${header}". Header name cannot be empty.`);
    headers[key] = value;
  }
  return headers;
}
//@ chunk-e6aww6q8.js:3871695-3872056 layout
/**
 * isProjectMcpServerApprovedInSettings：工作区审批记录或任一启用的设置源中 enableAllProjectMcpServers / enabledMcpjsonServers 命中即批准。
 */
function isProjectMcpServerApprovedInSettings(serverName) {
  let workspacePersistedTrustKey = getWorkspacePersistedTrustKey();
  if (
    getSessionApprovedMcpServers().some(
      (approved) =>
        approved.workspaceKey === workspacePersistedTrustKey &&
        isSameMcpServerName(approved.name, serverName),
    )
  )
    return true;
  let aliasProjectToUser = !projectSettingsAliasesUserSettings();
  let localTracked = isLocalSettingsGitTracked({
    onIndeterminate: "tracked",
  });
  for (let source of getEnabledSettingSources()) {
    if (source === "projectSettings" && aliasProjectToUser) continue;
    if (source === "localSettings" && localTracked) continue;
    let settingsForSource = getSettingsForSource(source);
    if (!settingsForSource) continue;
    if (settingsForSource.enableAllProjectMcpServers) return true;
    if (
      settingsForSource.enabledMcpjsonServers?.some((enabledMcpjsonServer) =>
        isSameMcpServerName(enabledMcpjsonServer, serverName),
      )
    )
      return true;
  }
  return false;
}
//@ chunk-e6aww6q8.js:3872056-3872307 fingerprint (2.1.88 match: getProjectMcpServerStatus, 0.919)
/**
 * getProjectMcpServerStatus：.mcp.json 服务器审批状态 approved/rejected/pending；disabledMcpjsonServers 优先拒绝，未信任工作区时只看设置。
 */
function getProjectMcpServerStatus(serverName) {
  let settings = getSettings_DEPRECATED();
  if (settings?.disabledMcpjsonServers?.some((name) => isSameMcpServerName(name, serverName)))
    return "rejected";
  if (!isWorkspacePersistedTrusted())
    return isProjectMcpServerApprovedInSettings(serverName) ? "approved" : "pending";
  if (
    settings?.enabledMcpjsonServers?.some((name) => isSameMcpServerName(name, serverName)) ||
    settings?.enableAllProjectMcpServers
  )
    return "approved";
  return "pending";
}
//@ chunk-e6aww6q8.js:3872307-3872428 layout (2.1.88 match: getProjectMcpServerStatus, 0.751)
function getProjectMcpServerStatusFromSettings(serverName) {
  if (getSettings_DEPRECATED()?.disabledMcpjsonServers?.some((name) => isSameMcpServerName(name, serverName)))
    return "rejected";
  return isProjectMcpServerApprovedInSettings(serverName) ? "approved" : "pending";
}
//@ chunk-e6aww6q8.js:3872428-3872465 layout
/**
 * 取项目 .mcp.json 服务器的有效审批状态（approved/pending/rejected）。
 */
function getEffectiveProjectMcpServerStatus(serverName) {
  return resolveProjectMcpServerApproval(serverName).status;
}
//@ chunk-e6aww6q8.js:3872465-3872749 layout
/**
 * resolveProjectMcpServerApproval：pending 时，bypass 权限模式或非交互会话（且 projectSettings 源启用）自动批准，返回 {status, by}。
 */
function resolveProjectMcpServerApproval(serverName) {
  let projectMcpServerStatus = getProjectMcpServerStatus(serverName);
  if (projectMcpServerStatus !== "pending")
    return projectMcpServerStatus === "approved"
      ? {
          status: projectMcpServerStatus,
          by: "settings",
        }
      : {
          status: projectMcpServerStatus,
        };
  if (
    getSessionBypassPermissionsMode() &&
    hasVouchedSkipDangerousModePermissionPrompt() &&
    isSettingSourceEnabled("projectSettings")
  )
    return {
      status: "approved",
      by: "bypass",
    };
  if (getIsNonInteractiveSession() && isSettingSourceEnabled("projectSettings"))
    return {
      status: "approved",
      by: "non_interactive",
    };
  return {
    status: "pending",
  };
}
//@ chunk-e6aww6q8.js:3872749-3872931 fingerprint (2.1.88 match: getMcpServerScopeFromToolName, 1)
/**
 * getMcpServerScopeFromToolName：从 mcp__server__tool 名反查服务器作用域，claude_ai_ 前缀无配置时视为 claudeai。
 */
function getMcpServerScopeFromToolName(toolName) {
  if (
    !isMcpTool({
      name: toolName,
    })
  )
    return null;
  let mcpInfo = mcpInfoFromString(toolName);
  if (!mcpInfo) return null;
  let serverConfig = getMcpConfigByName(mcpInfo.serverName);
  if (!serverConfig && mcpInfo.serverName.startsWith("claude_ai_")) return "claudeai";
  return serverConfig?.scope ?? null;
}
//@ chunk-e6aww6q8.js:3872931-3873006 layout
function getMcpToolScope(tool) {
  if (!isMcpTool(tool)) return null;
  return tool.mcpInfo?.scope ?? getMcpServerScopeFromToolName(tool.name);
}
//@ chunk-e6aww6q8.js:3873006-3873063 layout (2.1.88 match: getServerCommandArray, 1)
/**
 * 判断是否 stdio 配置（type 为 stdio 或未写）。
 */
function isStdioConfig(config) {
  return config.type === "stdio" || config.type === undefined;
}
//@ chunk-e6aww6q8.js:3873063-3873101 fingerprint (2.1.88 match: isSSEConfig, 1)
function isSSEConfig(config) {
  return config.type === "sse";
}
//@ chunk-e6aww6q8.js:3873101-3873140 layout (2.1.88 match: isHTTPConfig, 1)
function isHTTPConfig(config) {
  return config.type === "http";
}
//@ chunk-e6aww6q8.js:3873140-3873177 file-local
function isWebSocketConfig(config) {
  return config.type === "ws";
}
//@ chunk-e6aww6q8.js:3873356-3874164 fingerprint (2.1.88 match: extractAgentMcpServers, 1)
/**
 * extractAgentMcpServers：从代理定义的 mcpServers 中收集内联服务器配置，按名合并来源代理并给出 transport/needsAuth 摘要。
 */
function extractAgentMcpServers(agents) {
  let serverMap = new Map();
  for (let agent of agents) {
    if (!agent.mcpServers?.length) continue;
    for (let spec of agent.mcpServers) {
      if (typeof spec === "string") continue;
      let entries = Object.entries(spec);
      if (entries.length !== 1) continue;
      let [serverName, serverConfig] = entries[0];
      let existing = serverMap.get(serverName);
      if (existing) {
        if (!existing.sourceAgents.includes(agent.agentType)) existing.sourceAgents.push(agent.agentType);
      } else
        serverMap.set(serverName, {
          config: {
            ...serverConfig,
            name: serverName,
          },
          sourceAgents: [agent.agentType],
        });
    }
  }
  let result = [];
  for (let [name, { config, sourceAgents }] of serverMap)
    if (isStdioConfig(config))
      result.push({
        name,
        sourceAgents,
        transport: "stdio",
        command: config.command,
        needsAuth: false,
      });
    else if (isSSEConfig(config))
      result.push({
        name,
        sourceAgents,
        transport: "sse",
        url: config.url,
        needsAuth: true,
      });
    else if (isHTTPConfig(config))
      result.push({
        name,
        sourceAgents,
        transport: "http",
        url: config.url,
        needsAuth: true,
      });
    else if (isWebSocketConfig(config))
      result.push({
        name,
        sourceAgents,
        transport: "ws",
        url: config.url,
        needsAuth: false,
      });
  return result.sort((left, right) => left.name.localeCompare(right.name));
}
//@ chunk-bk3xs38h.js:227-302 placement
/**
 * 需要按上传文件询问的服务器键集合。
 */
var _; // deferred: uses normalizeNameForMCP (./normalization.js) of its import cycle while loading; runs once the cycle is complete
var CLAUDE_BROWSER_NAME;
var CLAUDE_PREVIEW_KEY;
var CLAUDE_BROWSER_KEY;
var CLAUDE_BROWSER_SERVER_KEYS;
deferInit("chunk-bk3xs38h.js:227", () => {
  _ = "Claude Preview";
  CLAUDE_BROWSER_NAME = "Claude Browser";
  CLAUDE_PREVIEW_KEY = normalizeNameForMCP(_);
  CLAUDE_BROWSER_KEY = normalizeNameForMCP(CLAUDE_BROWSER_NAME);
  CLAUDE_BROWSER_SERVER_KEYS = new Set([CLAUDE_PREVIEW_KEY, CLAUDE_BROWSER_KEY]);
});
//@ chunk-bk3xs38h.js:302-338 placement
/**
 * 服务器是否需要按上传文件逐一询问。
 */
function isFileUploadServer(serverName) {
  return CLAUDE_BROWSER_SERVER_KEYS.has(normalizeNameForMCP(serverName));
}
//@ chunk-bk3xs38h.js:338-442 placement
/**
 * 生成工具参数描述时排除的字段（description、activeForm）。
 */
var FILE_UPLOAD_TOOLS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var ANTHROPIC_HOSTASKSPERUPLOADEDFILE;
var NON_DESCRIPTION_FIELDS;
deferInit("chunk-bk3xs38h.js:338", () => {
  FILE_UPLOAD_TOOLS = ["file_upload"];
  ANTHROPIC_HOSTASKSPERUPLOADEDFILE = "anthropic/hostAsksPerUploadedFile";
  NON_DESCRIPTION_FIELDS = new Set(["description", "activeForm"]);
});
//@ chunk-bk3xs38h.js:442-926 callgraph-fingerprint (2.1.88 match: filterToolsByServer, 0.172)
/**
 * buildMcpToolPermissionOverrides：为扩展提供的 MCP 工具生成 checkPermissions（ask，建议会话级 allow 规则 mcp__server__tool）与 toAutoClassifierInput。
 */
function buildMcpToolPermissionOverrides(
  serverName,
  toolName,
  properties,
  mcpToolInputToAutoClassifierInput,
) {
  let prefix = `mcp__${normalizeNameForMCP(serverName)}__${toolName}`;
  return {
    async checkPermissions() {
      return {
        behavior: "ask",
        message: `${serverName} requires permission.`,
        suggestions: [
          {
            type: "addRules",
            rules: [
              {
                toolName: prefix,
                ruleContent: undefined,
              },
            ],
            behavior: "allow",
            destination: "session",
          },
        ],
        metadata: {
          command: {
            name: prefix,
            chrome: {
              hostHandlesOriginConsent: true,
            },
          },
        },
      };
    },
    ...(properties !== undefined &&
      Object.hasOwn(properties, "code") && {
        toAutoClassifierInput(input) {
          let filtered = Object.keys(input).filter((tool) => !NON_DESCRIPTION_FIELDS.has(tool));
          return mcpToolInputToAutoClassifierInput(
            Object.fromEntries(filtered.map((field) => [field, input[field]])),
            toolName,
          );
        },
      }),
  };
}
//@ chunk-z8q591p0.js:265-298 placement
/**
 * 判断配置是否为非保留的 stdio 服务器。
 */
var isNonReservedStdioConfig = (serverName, config) =>
  isStdioConfig(config) && !isReservedStdioServer(serverName, config);
//@ chunk-wy9dbk5f.js:36800-36875 fingerprint (2.1.88 match: filterResourcesByServer, 0.693)
var SetMcpServerEnabledInputSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-wy9dbk5f.js:36800", () => {
  SetMcpServerEnabledInputSchema = DoctorLazy(() =>
    objectSchema({
      server: stringSchema(),
      enabled: booleanSchema(),
      requestId: stringSchema().max(64).optional(),
    }),
  );
});
export {
  isMcpTool,
  describeMcpConfigFilePath,
  getEffectiveProjectMcpServerStatus,
  getProjectMcpServerStatusFromSettings,
  getProjectMcpServerStatus,
  resolveProjectMcpServerApproval,
  getMcpServerNameOfTool,
  isNonReservedStdioConfig,
  getLoggingSafeMcpBaseUrl,
  isFileUploadServer,
  buildMcpToolPermissionOverrides,
  FILE_UPLOAD_TOOLS,
  ANTHROPIC_HOSTASKSPERUPLOADEDFILE,
  commandBelongsToServer,
  refetchReasonTelemetry,
  filterCommandsByServer,
  excludeCommandsByServer,
  removeMcpClientsWhere,
  isDeclaredUnderOtherWorkspaceRoot,
  isStdioConfig,
  isRetryableRemoteFailure,
  BEARER_REJECT_CODES,
  ensureConfigScope,
  ensureTransport,
  parseHeaders,
  getScopeLabel,
  filterToolsByServer,
  RETRYABLE_CONNECT_CODES,
  getMcpToolScope,
  extractAgentMcpServers,
  isRetryableConnectionFailure,
  excludeStalePluginClients,
  isRetriableOrForbidden,
  isProxyForbiddenFailure,
  omitKey,
  filterMcpPromptsByServer,
  SetMcpServerEnabledInputSchema,
};
