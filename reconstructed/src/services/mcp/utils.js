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
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
  join as join_21,
  join as join_22,
  join as join_23,
  join as join_24,
  join as join_25,
  join as join_26,
  join as join_27,
  join as join_28,
  join as join_29,
  join as join_30,
  join as join_31,
  join as join_32,
  join as join_33,
  join as join_34,
  join as join_35,
  join as join_36,
  join as join_37,
  join as join_38,
  join as join_40,
  join as join_41,
  join as join_42,
  join as join_43,
  join as join_44,
  join as join_45,
  join as join_46,
  join as join_47,
  join as join_48,
  join as join_49,
  join as join_50,
  join as join_51,
  join as join_52,
  join as join_53,
  join as join_54,
  join as join_55,
  join as join_56,
  join as join_57,
  join as join_58,
  join as join_59,
  join as join_60,
  join as join_61,
  join as join_62,
  join as join_63,
  join as join_64,
  join as join_65,
  join as join_66,
  join as join_67,
  join as join_68,
  join as join_69,
  join as join_70,
  join as join_71,
  join as join_72,
  join as join_73,
  join as join_74,
  join as join_75,
  join as join_76,
  join as join_77,
  join as join_78,
  join as join_79,
  join as join_80,
  join as join_81,
  join as join_82,
  join as join_84,
  join as join_85,
  join as join_86,
  join as join_87,
  join as join_88,
  join as join_89,
  join as join_90,
  join as join_91,
  join as join_92,
  join as join_93,
  join as join_94,
  join as join_95,
  join as join_96,
  join as join_97,
  join as join_98,
  join as join_99,
  join as join_100,
  join as join_101,
  join as join_102,
  join as join_103,
  join as join_104,
  join as join_105,
  join as join_106,
  join as join_107,
  join as join_108,
  join as join_109,
  join as join_110,
  join as join_111,
  join as join_112,
  join as join_113,
  join as join_114,
  join as join_115,
  join as join_116,
  join as join_117,
  join as join_118,
  join as join_119,
  join as join_120,
  join as join_121,
  join as join_122,
  join as join_123,
  join as join_124,
  join as join_125,
  join as join_126,
  join as join_127,
  join as join_128,
  join as join_129,
} from "path";
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
import { Yz } from "./client.js";
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
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u as u_2, o, M } from "../../../vendor/zod/v4/classic/schemas.js";
import { isReservedStdioServer } from "./builtinServerNames.js";

//@ chunk-e6aww6q8.js:3867900-3867912 placement
serverFilePresenceSlot.set(doesEnterpriseMcpConfigExist);
/**
 * 可重试的远程 MCP 失败判定所用的集合：远程传输类型、令牌被拒错误码与可重试错误码。
 */
//@ chunk-e6aww6q8.js:3867912-3868162 placement
var REMOTE_TRANSPORTS = new Set(["http", "sse", "claudeai-proxy"]),
  BEARER_REJECT_CODES = new Set(["CLI_OWNED_BEARER_REJECTED", "HEADERS_HELPER_AUTH_REJECTED"]),
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
/**
 * 判断远程 MCP 连接失败是否可重试（代理 403 除外，按错误码判断，无错误码时 SSE 视为可重试）。
 */
//@ chunk-e6aww6q8.js:3868162-3868364 placement
function isRetryableRemoteFailure(e) {
  if (e.type !== "failed") return !1;
  let n = e.config.type ?? "";
  if (!REMOTE_TRANSPORTS.has(n)) return !1;
  if (e.proxyConnectStatus === 403) return !1;
  if (e.errorCode !== void 0) return RETRYABLE_CONNECT_CODES.has(e.errorCode);
  return n === "sse";
}
/**
 * 判断远程 MCP 连接是否因代理返回 403 而失败（绕过代理的地址除外）。
 */
//@ chunk-e6aww6q8.js:3868364-3868532 placement
function isProxyForbiddenFailure(e) {
  return (
    e.type === "failed" &&
    e.proxyConnectStatus === 403 &&
    REMOTE_TRANSPORTS.has(e.config.type ?? "") &&
    !((e.config.type === "http" || e.config.type === "sse") && shouldBypassProxy(e.config.url))
  );
}
//@ chunk-e6aww6q8.js:3868532-3868609 placement
function Njt(e) {
  return isRetryableRemoteFailure(e) && (e.errorCode === void 0 || !BEARER_REJECT_CODES.has(e.errorCode));
}
//@ chunk-e6aww6q8.js:3868609-3868647 placement
function Bfn(e) {
  return isRetryableRemoteFailure(e) || isProxyForbiddenFailure(e);
}
/**
 * filterToolsByServer：按 mcp__server__ 前缀过滤工具。
 */
//@ chunk-e6aww6q8.js:3868647-3868733 placement = getMcpPrefix (1)
function filterToolsByServer(e, n) {
  let r = `mcp__${normalizeNameForMCP(n)}__`;
  return e.filter((s) => s.name?.startsWith(r));
}
/**
 * commandBelongsToServer：命令名以 mcp__server__ 或 server: 开头。
 */
//@ chunk-e6aww6q8.js:3868733-3868844 placement = getMcpPrefix (1)
function commandBelongsToServer(e, n) {
  let r = normalizeNameForMCP(n),
    s = e.name;
  if (!s) return !1;
  return s.startsWith(`mcp__${r}__`) || s.startsWith(`${r}:`);
}
/**
 * 从命令列表中挑出属于某服务器、但不是 MCP 提示词命令的条目（即 MCP skills 等），用于刷新时保留/替换。
 */
//@ chunk-e6aww6q8.js:3868844-3868936 fingerprint = filterMcpPromptsByServer (1)
function filterMcpPromptsByServer(commands, serverName) {
  return commands.filter(
    (r) => commandBelongsToServer(r, serverName) && !(r.type === "prompt" && r.loadedFrom === "mcp"),
  );
}
/**
 * 从工具列表中移除属于某服务器的工具（按服务器名前缀匹配）。
 */
//@ chunk-e6aww6q8.js:3868936-3868998 file-local
function filterCommandsByServer(commands, serverName) {
  let r = getMcpPrefix_2(serverName);
  return commands.filter((s) => !isToolFromMcpServer(s, serverName, r));
}
/**
 * 从命令列表中移除属于某服务器的命令。
 */
//@ chunk-e6aww6q8.js:3868998-3869047 file-local
function excludeCommandsByServer(commands, serverName) {
  return commands.filter((r) => !commandBelongsToServer(r, serverName));
}
/**
 * 返回删除了某服务器键的资源映射浅拷贝。
 */
//@ chunk-e6aww6q8.js:3869047-3869099 layout
function $jt(e, n) {
  let r = { ...e };
  return (delete r[n], r);
}
/**
 * 把 list_changed 刷新的触发原因转成遥测值：重开订阅流后合成的刷新（reopen_refetch）、处理器注册前收到（before_handler），其余为 notification。
 */
//@ chunk-e6aww6q8.js:3869099-3869170 layout
function Y2e(e) {
  return e === REOPEN_REFETCH
    ? lit_2(REOPEN_REFETCH)
    : e === BEFORE_HANDLER
      ? lit_2(BEFORE_HANDLER)
      : lit_2("notification");
}
/**
 * 判断 project/local 作用域的服务器是否声明在另一个工作区根（declaredIn 与当前根不同）。
 */
//@ chunk-e6aww6q8.js:3869170-3869276 layout = isMcpServerFromProjectOrLocalSettings (0.81)
function isDeclaredUnderOtherWorkspaceRoot(e, n) {
  return (e.scope === "project" || e.scope === "local") && e.declaredIn !== void 0 && e.declaredIn !== n;
}
/**
 * removeMcpClientsWhere：按谓词剔除客户端，并同步去掉其工具、命令、资源与资源模板，返回剩余状态与 stale 列表。
 */
//@ chunk-e6aww6q8.js:3869276-3869649 fingerprint = excludeStalePluginClients (0.728)
function removeMcpClientsWhere(mcp, isStale) {
  let stale = mcp.clients.filter(isStale);
  if (stale.length === 0) return { ...mcp, stale: [] };
  let { tools: tools, commands: commands, resources: resources } = mcp,
    S = { ...mcp.resourceTemplates };
  for (let L of stale)
    ((tools = filterCommandsByServer(tools, L.name)),
      (commands = excludeCommandsByServer(commands, L.name)),
      (resources = $jt(resources, L.name)),
      delete S[L.name]);
  let staleNames = new Set(stale.map((L) => L.name));
  return {
    clients: mcp.clients.filter((client) => !staleNames.has(client.name)),
    tools: tools,
    commands: commands,
    resources: resources,
    resourceTemplates: S,
    stale: stale,
  };
}
/**
 * excludeStalePluginClients：配置刷新后找出过期客户端：声明于旧工作区根、已删除的 dynamic/managed 服务器、配置哈希变化。
 */
//@ chunk-e6aww6q8.js:3869649-3870114 layout
function excludeStalePluginClients(mcp, configs, workspaceRoot) {
  return removeMcpClientsWhere(mcp, (s) => {
    if (workspaceRoot !== void 0 && isDeclaredUnderOtherWorkspaceRoot(s.config, workspaceRoot))
      return (
        logMCPDebug(
          s.name,
          "excludeStalePluginClients: marking stale (declared under a previous workspace root)",
        ),
        !0
      );
    let h = getOwn(configs, s.name);
    if (!h) {
      if (s.config.scope === "dynamic" || s.config.scope === "managed")
        return (logMCPDebug(s.name, "excludeStalePluginClients: marking stale (removed)"), !0);
      return !1;
    }
    if (Yz(s.config) !== Yz(h))
      return (logMCPDebug(s.name, "excludeStalePluginClients: marking stale (config hash changed)"), !0);
    return !1;
  });
}
/**
 * describeMcpConfigFilePath：作用域对应的配置位置描述（~/.claude.json、<项目>/.mcp.json、managed-mcp.json、managedMcpServers、claude.ai、agent frontmatter 等）。
 */
//@ chunk-e6aww6q8.js:3870114-3870484 fingerprint = describeMcpConfigFilePath (0.801)
function describeMcpConfigFilePath(scope) {
  switch (scope) {
    case "user":
      return describeGlobalConfigFile();
    case "project":
      return join_98(getProjectConfigRoot() ?? getCwd(), ".mcp.json");
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
/**
 * getScopeLabel：作用域的人类可读标签（Local/Project/User/Dynamic/Enterprise/Managed/claude.ai/Agent config）。
 */
//@ chunk-e6aww6q8.js:3870484-3871018 fingerprint = getScopeLabel (0.849)
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
/**
 * ensureConfigScope：校验 --scope 参数，缺省 local。
 */
//@ chunk-e6aww6q8.js:3871018-3871173 fingerprint = ensureConfigScope (1)
function ensureConfigScope(scope) {
  if (!scope) return "local";
  if (!ConfigScopeSchema().options.includes(scope))
    throw Error(`Invalid scope: ${scope}. Must be one of: ${ConfigScopeSchema().options.join(", ")}`);
  return scope;
}
/**
 * ensureTransport：校验 --transport，缺省 stdio，streamable-http 归为 http，只接受 stdio/sse/http。
 */
//@ chunk-e6aww6q8.js:3871173-3871393 fingerprint = ensureTransport (0.75)
function ensureTransport(type) {
  if (!type) return "stdio";
  if (type === "streamable-http") return "http";
  if (type !== "stdio" && type !== "sse" && type !== "http")
    throw Error(`Invalid transport type: ${type}. Must be one of: stdio, sse, http (or streamable-http)`);
  return type;
}
/**
 * parseHeaders：把 "Name: value" 字符串数组解析成头对象，格式不对抛错。
 */
//@ chunk-e6aww6q8.js:3871393-3871695 fingerprint = parseHeaders (1)
function parseHeaders(headerArray) {
  let headers = {};
  for (let header of headerArray) {
    let colonIndex = header.indexOf(":");
    if (colonIndex === -1)
      throw Error(`Invalid header format: "${header}". Expected format: "Header-Name: value"`);
    let key = header.substring(0, colonIndex).trim(),
      value = header.substring(colonIndex + 1).trim();
    if (!key) throw Error(`Invalid header: "${header}". Header name cannot be empty.`);
    headers[key] = value;
  }
  return headers;
}
/**
 * isProjectMcpServerApprovedInSettings：工作区审批记录或任一启用的设置源中 enableAllProjectMcpServers / enabledMcpjsonServers 命中即批准。
 */
//@ chunk-e6aww6q8.js:3871695-3872056 layout
function isProjectMcpServerApprovedInSettings(e) {
  let n = getWorkspacePersistedTrustKey();
  if (getSessionApprovedMcpServers().some((h) => h.workspaceKey === n && isSameMcpServerName(h.name, e)))
    return !0;
  let r = !projectSettingsAliasesUserSettings(),
    s = isLocalSettingsGitTracked({ onIndeterminate: "tracked" });
  for (let h of getEnabledSettingSources()) {
    if (h === "projectSettings" && r) continue;
    if (h === "localSettings" && s) continue;
    let y = getSettingsForSource(h);
    if (!y) continue;
    if (y.enableAllProjectMcpServers) return !0;
    if (y.enabledMcpjsonServers?.some((S) => isSameMcpServerName(S, e))) return !0;
  }
  return !1;
}
/**
 * getProjectMcpServerStatus：.mcp.json 服务器审批状态 approved/rejected/pending；disabledMcpjsonServers 优先拒绝，未信任工作区时只看设置。
 */
//@ chunk-e6aww6q8.js:3872056-3872307 fingerprint = getProjectMcpServerStatus (0.919)
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
//@ chunk-e6aww6q8.js:3872307-3872428 layout = getProjectMcpServerStatus (0.751)
function getProjectMcpServerStatusFromSettings(serverName) {
  if (getSettings_DEPRECATED()?.disabledMcpjsonServers?.some((name) => isSameMcpServerName(name, serverName)))
    return "rejected";
  return isProjectMcpServerApprovedInSettings(serverName) ? "approved" : "pending";
}
/**
 * 取项目 .mcp.json 服务器的有效审批状态（approved/pending/rejected）。
 */
//@ chunk-e6aww6q8.js:3872428-3872465 layout
function getEffectiveProjectMcpServerStatus(e) {
  return resolveProjectMcpServerApproval(e).status;
}
/**
 * resolveProjectMcpServerApproval：pending 时，bypass 权限模式或非交互会话（且 projectSettings 源启用）自动批准，返回 {status, by}。
 */
//@ chunk-e6aww6q8.js:3872465-3872749 layout
function resolveProjectMcpServerApproval(e) {
  let n = getProjectMcpServerStatus(e);
  if (n !== "pending") return n === "approved" ? { status: n, by: "settings" } : { status: n };
  if (
    getSessionBypassPermissionsMode() &&
    hasVouchedSkipDangerousModePermissionPrompt() &&
    isSettingSourceEnabled("projectSettings")
  )
    return { status: "approved", by: "bypass" };
  if (getIsNonInteractiveSession() && isSettingSourceEnabled("projectSettings"))
    return { status: "approved", by: "non_interactive" };
  return { status: "pending" };
}
/**
 * getMcpServerScopeFromToolName：从 mcp__server__tool 名反查服务器作用域，claude_ai_ 前缀无配置时视为 claudeai。
 */
//@ chunk-e6aww6q8.js:3872749-3872931 fingerprint = getMcpServerScopeFromToolName (1)
function getMcpServerScopeFromToolName(toolName) {
  if (!isMcpTool({ name: toolName })) return null;
  let mcpInfo = mcpInfoFromString(toolName);
  if (!mcpInfo) return null;
  let serverConfig = getMcpConfigByName(mcpInfo.serverName);
  if (!serverConfig && mcpInfo.serverName.startsWith("claude_ai_")) return "claudeai";
  return serverConfig?.scope ?? null;
}
//@ chunk-e6aww6q8.js:3872931-3873006 layout
function getMcpToolScope(e) {
  if (!isMcpTool(e)) return null;
  return e.mcpInfo?.scope ?? getMcpServerScopeFromToolName(e.name);
}
/**
 * 判断是否 stdio 配置（type 为 stdio 或未写）。
 */
//@ chunk-e6aww6q8.js:3873006-3873063 layout = getServerCommandArray (1)
function isStdioConfig(config) {
  return config.type === "stdio" || config.type === void 0;
}
//@ chunk-e6aww6q8.js:3873063-3873101 fingerprint = isSSEConfig (1)
function isSSEConfig(config) {
  return config.type === "sse";
}
//@ chunk-e6aww6q8.js:3873101-3873140 layout = isHTTPConfig (1)
function isHTTPConfig(config) {
  return config.type === "http";
}
//@ chunk-e6aww6q8.js:3873140-3873177 file-local
function isWebSocketConfig(config) {
  return config.type === "ws";
}
/**
 * extractAgentMcpServers：从代理定义的 mcpServers 中收集内联服务器配置，按名合并来源代理并给出 transport/needsAuth 摘要。
 */
//@ chunk-e6aww6q8.js:3873356-3874164 fingerprint = extractAgentMcpServers (1)
function extractAgentMcpServers(agents) {
  let serverMap = new Map();
  for (let agent of agents) {
    if (!agent.mcpServers?.length) continue;
    for (let spec of agent.mcpServers) {
      if (typeof spec === "string") continue;
      let entries = Object.entries(spec);
      if (entries.length !== 1) continue;
      let [S, w] = entries[0],
        existing = serverMap.get(S);
      if (existing) {
        if (!existing.sourceAgents.includes(agent.agentType)) existing.sourceAgents.push(agent.agentType);
      } else serverMap.set(S, { config: { ...w, name: S }, sourceAgents: [agent.agentType] });
    }
  }
  let result = [];
  for (let [s, { config: h, sourceAgents: y }] of serverMap)
    if (isStdioConfig(h))
      result.push({ name: s, sourceAgents: y, transport: "stdio", command: h.command, needsAuth: !1 });
    else if (isSSEConfig(h))
      result.push({ name: s, sourceAgents: y, transport: "sse", url: h.url, needsAuth: !0 });
    else if (isHTTPConfig(h))
      result.push({ name: s, sourceAgents: y, transport: "http", url: h.url, needsAuth: !0 });
    else if (isWebSocketConfig(h))
      result.push({ name: s, sourceAgents: y, transport: "ws", url: h.url, needsAuth: !1 });
  return result.sort((s, h) => s.name.localeCompare(h.name));
}
//@ chunk-bk3xs38h.js:227-302 placement
var _ = "Claude Preview",
  c = "Claude Browser",
  E = normalizeNameForMCP(_),
  l = normalizeNameForMCP(c),
  u = new Set([E, l]);
/**
 * 服务器是否需要按上传文件逐一询问。
 */
//@ chunk-bk3xs38h.js:302-338 placement
function isFileUploadServer(e) {
  return u.has(normalizeNameForMCP(e));
}
/**
 * 文件上传工具名与 _meta 键。
 */
//@ chunk-bk3xs38h.js:338-442 placement
var FILE_UPLOAD_TOOLS = ["file_upload"],
  ANTHROPIC_HOSTASKSPERUPLOADEDFILE = "anthropic/hostAsksPerUploadedFile",
  d = new Set(["description", "activeForm"]);
/**
 * buildMcpToolPermissionOverrides：为扩展提供的 MCP 工具生成 checkPermissions（ask，建议会话级 allow 规则 mcp__server__tool）与 toAutoClassifierInput。
 */
//@ chunk-bk3xs38h.js:442-926 callgraph-fingerprint = filterToolsByServer (0.172)
function buildMcpToolPermissionOverrides(serverName, toolName, n, i) {
  let prefix = `mcp__${normalizeNameForMCP(serverName)}__${toolName}`;
  return {
    async checkPermissions() {
      return {
        behavior: "ask",
        message: `${serverName} requires permission.`,
        suggestions: [
          {
            type: "addRules",
            rules: [{ toolName: prefix, ruleContent: void 0 }],
            behavior: "allow",
            destination: "session",
          },
        ],
        metadata: { command: { name: prefix, chrome: { hostHandlesOriginConsent: !0 } } },
      };
    },
    ...(n !== void 0 &&
      Object.hasOwn(n, "code") && {
        toAutoClassifierInput(r) {
          let filtered = Object.keys(r).filter((tool) => !d.has(tool));
          return i(Object.fromEntries(filtered.map((s) => [s, r[s]])), toolName);
        },
      }),
  };
}
/**
 * isMcpTool：名字以 mcp__ 开头或 isMcp === true。
 */
//@ chunk-qaeygs3y.js:949-1013 fingerprint = isMcpTool (1)
function isMcpTool(tool) {
  return tool.name?.startsWith("mcp__") || tool.isMcp === !0;
}
/**
 * 取工具所属 MCP 服务器名：mcpInfo.serverName，或从 mcp__<server>__<tool> 名字中解析。
 */
//@ chunk-qaeygs3y.js:1013-1118 placement = findMcpServerConnection (0.857)
function getMcpServerNameOfTool(e) {
  return e.mcpInfo?.serverName ?? (e.name?.startsWith("mcp__") ? e.name.split("__")[1] : void 0);
}
/**
 * getLoggingSafeMcpBaseUrl：去掉 query、用户名密码、hash 与末尾斜杠的 URL，用于遥测。
 */
//@ chunk-1wpnxx5r.js:15976-16167 fingerprint = getLoggingSafeMcpBaseUrl (0.636)
function getLoggingSafeMcpBaseUrl(config) {
  if (!("url" in config) || typeof config.url !== "string") return;
  try {
    let url = new URL(config.url);
    return (
      (url.search = ""),
      (url.username = ""),
      (url.password = ""),
      (url.hash = ""),
      url.toString().replace(/\/$/, "")
    );
  } catch {
    return;
  }
}
//@ chunk-wy9dbk5f.js:36800-36875 fingerprint = filterResourcesByServer (0.693)
var SetMcpServerEnabledInputSchema = DoctorLazy(() =>
  u_2({ server: o(), enabled: M(), requestId: o().max(64).optional() }),
);
//@ chunk-z8q591p0.js:265-298 placement
var spt = (r, o) => isStdioConfig(o) && !isReservedStdioServer(r, o);

export {
  isMcpTool,
  describeMcpConfigFilePath,
  getEffectiveProjectMcpServerStatus,
  getProjectMcpServerStatusFromSettings,
  getProjectMcpServerStatus,
  resolveProjectMcpServerApproval,
  getMcpServerNameOfTool,
  spt,
  isFileUploadServer,
  buildMcpToolPermissionOverrides,
  FILE_UPLOAD_TOOLS,
  ANTHROPIC_HOSTASKSPERUPLOADEDFILE,
  getLoggingSafeMcpBaseUrl,
  Y2e,
  filterCommandsByServer,
  excludeCommandsByServer,
  commandBelongsToServer,
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
  Njt,
  excludeStalePluginClients,
  Bfn,
  isProxyForbiddenFailure,
  $jt,
  filterMcpPromptsByServer,
  SetMcpServerEnabledInputSchema,
};
