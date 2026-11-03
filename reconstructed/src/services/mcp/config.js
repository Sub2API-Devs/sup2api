/**
 * services/mcp/config.ts
 *
 * MCP 配置：按作用域读取（user/project/local/managed/enterprise/插件/dynamic/claude.ai）、解析与 ${VAR} 展开、合并去重、组织 allow/deny 策略与连接时封锁、claude mcp add/remove、启用/禁用。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/mcp/config.ts
 * pieces: chunk-0h4e7gnq.js (1), chunk-18hwfzwa.js (1), chunk-1wpnxx5r.js (5), chunk-2yv46yc2.js (4), chunk-3wek6r2k.js (1), chunk-dcmhvw5a.js (2), chunk-e6aww6q8.js (155)
 * attribution: fingerprint 15, placement 11, shared-adjacent 2, affinity 1, file-local 4, layout 78, callgraph-witnessed 2, facade-majority 56
 */
import { join, parse, dirname } from "path";
import { randomBytes, createHash } from "crypto";
import {
  isIdeOrSdkType,
  McpStdioServerConfigSchema,
  McpSSEServerConfigSchema,
  McpHTTPServerConfigSchema,
  McpWebSocketServerConfigSchema,
  McpSdkServerConfigSchema,
  McpClaudeAIProxyServerConfigSchema,
  isManagedConfigScope,
  isValidServerId,
  McpServerConfigSchema,
  MANAGED_CONFIG_SCOPES,
} from "./types.js";
import { isGateOOn, isLovelyUmbrellaOn } from "../../utils/settings/settingsSourceTrust.js";
import { MEMORY, CLAUDE_ARTIFACTS } from "./firstPartyServerIds.js";
import { normalizedKey } from "./normalization.js";
import { getPrefixServerKey } from "../../components/agents/ToolSelector.js";
import { isCliOwnedConfig, registerCliOwnedConfig } from "./cliOwnedClients.js";
import { HostScoped } from "../../utils/hostScoped.js";
import {
  getRootSession,
  getProjectConfigRoot,
  getPolicyPredicateTelemetryEmitted,
  getIsRemoteMode,
  isDiskless,
  getOriginalCwd,
  getOriginalCwdOrNull,
  getStrictMcpConfig,
} from "../../bootstrap/state.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  withTelemetryMessage,
  toError,
  errorMessage,
  getErrnoCode,
} from "../../utils/errors.js";
import { runCommandHint, claudeCommand } from "../../utils/worktreeResumeHint.js";
import { capitalize } from "../../utils/stringUtils.js";
import { isSdkEntrypoint } from "../../utils/entrypointKinds.js";
import {
  getAllPolicyTierSettings,
  getSettingsForSource,
  getMcpPolicyView,
  getInitialSettings_2,
  getDurablePolicyTierSettings,
  hasDisableClaudeAiConnectors,
  projectSettingsAliasesUserSettings,
  getMachineAdminPolicyTier,
} from "../../utils/settings/settings.js";
import { armedFromUserWritableBase } from "../../utils/settings/policyHelper/helperRemote.js";
import { scrubbedEnvKeys, expandMcpCredentialEnvVars } from "../../utils/envExpansion.js";
import { uniq } from "../../utils/collections.js";
import { xr } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { containsEnvRef, ENV_REF_PATTERN } from "./envExpansion.js";
import { jsonStringify, clone } from "../../utils/slowOperations.js";
import { CLAUDE_CODE_REMOTE, ccrMetaMcpServerConfig, REPO_TOOL_NAMES_WITH_ROOT } from "./ccrMetaMcp.js";
import {
  originIfValid,
  parseCcrSessionMcpUrl,
  isToolboxMcpServerConfig,
  isCcrMemoryMcpServer,
  hasOnlyAllowedCcrParams,
  matchesCcrMcpServerId,
  isSameOriginAsCcr,
  urlPathOf,
} from "./ccrMcpUrls.js";
import { startupCcrEnv } from "../../tasks/RemoteAgentTask/remoteAgentKinds.js";
import { u, record, string, unknown } from "../../../vendor/zod/v4/classic/schemas.js";
import { replaceControlChars } from "../../utils/resultError.js";
import { formatWithheldEnvNotice, withHostEnvRestored } from "../../utils/settings/managedSettingsFiles.js";
import { isPrototypeKey } from "../../schemas/hookEntryValidation.js";
import { env } from "../../utils/env.js";
import {
  isBuiltinMcpServerName,
  isDesktopConnectorServerName,
  isClaudeAiProxyServer,
  toScopedConfig_2,
  isReservedStdioServer,
} from "./builtinServerNames.js";
import { BROWSER_SERVER_NAMES } from "../../utils/permissions/browserToolNames.js";
import { claimOnce } from "../api/verificationRequired.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../analytics/featureTelemetry.js";
import { stdioIdentityDiff } from "./serverIdentity.js";
import { sessionHostKind } from "../../utils/telemetry/memorySummary.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum, mcpNameForAnalytics_GATE_EVALUATED } from "../analytics/safeMetadata.js";
import {
  isWorkspacePersistedTrusted,
  getGlobalConfig,
  getCurrentProjectConfig,
  saveGlobalConfigDurably,
  saveCurrentProjectConfigDurably,
  getProjectPathForConfig,
  readGlobalConfigFromDiskOrThrow,
  CONFIG_READ_RETRY_DELAYS_MS,
  saveCurrentProjectConfig,
} from "../../utils/config.js";
import { getManagedFilePath } from "../../utils/settings/managedPath.js";
import { getCwd } from "../../utils/cwd.js";
import { writeFileAtomic as writeFileAtomic_2_2 } from "../../utils/file.js";
import { ATOMIC_WRITE_DIRNAME } from "../../utils/plugins/safeCopy.js";
import {
  getPreSettingsEnvSnapshot,
  filterEnvForPolicyPredicateMatch,
  getLegacyEnvMap,
} from "../../utils/managedEnvApply.js";
import { isEvalPolicySnapshotOnly } from "../remoteManagedSettings/remoteSettingsState.js";
import { isSettingSourceEnabled, REPO_DIR_SETTING_SOURCE_LIST } from "../../utils/settings/constants.js";
import { logForDebugging } from "../../utils/debug.js";
import { parseHostPattern, buildHostPatternRegex } from "../../utils/hooks/ssrfGuard.js";
import { PLUGIN_ENV_VAR_NAMES } from "../../utils/plugins/lspPluginIntegration.js";
import { normalizeMcpServerUrl } from "../routines/routinesApi.js";
import { describeEndpointOrigin, mcpTransportType } from "./mcpServerEndpoint.js";
import { readMcpOAuthStore } from "./credentialStoreRead.js";
import { needsClientRegistration, hasExpiredAccessTokenOnly } from "./registrationStatus.js";
import { getAllowedMcpServersFromTiers, resolvePathStepsSync } from "./managedMcpPolicy.js";
import {
  flattened as flattened_3,
  sanitizeIndexUrlEnv,
  HTTP_INDEX_INVALID,
} from "../../utils/settings/policyHelper/helperExec.js";
import { isSecretEnvName, containsCredential } from "../../utils/settings/policyHelper/helperEnv.js";
import {
  isMcpServerUrlEntry,
  isMcpServerCommandEntry,
  isMcpServerNameEntry,
} from "../../utils/settings/types.js";
import { getOauthConfig } from "../../constants/oauth.js";
import {
  normalizeConnectorId,
  lookupClaudeAiConnectorById,
  fetchClaudeAiConfigsOnce,
  printClaudeAiConnectorNotice,
} from "./claudeai.js";
import {
  getServerUrl as getServerUrl_3,
  copyCcrMarks,
  ccrConfigHosts,
  isCcrInjectedConfig,
  isOwnToolContainerConfig,
  isSelfHostedRunnerCcrServer,
  hasCcrMeta,
} from "../analytics/metadata.js";
import {
  isClaudeInChromeMCPServer,
  getClaudeInChromeStdioServerConfig,
  isClaudeInChromeMcpLaunch,
} from "../../utils/claudeInChrome/common.js";
import { isManagedPluginScope, runWithPluginWriteScope } from "../../utils/plugins/pluginScopedWrite.js";
import { isHostedDesktopSession, isComputerUseServer } from "../../utils/computerUse/toolRendering.js";
import { isDesktopComputerUseCommand } from "./client.js";
import { COMPUTER_USE_MCP_SERVER_NAME } from "../../utils/computerUse/common.js";
import {
  officialPluginId,
  pluginDisplayKey,
  isProjectLocalPlugin,
  parsePluginIdentifier,
} from "../../utils/plugins/pluginIdentifier.js";
import { BUILTIN } from "../../utils/telemetry/pluginTelemetry.js";
import { getHostState } from "../../utils/hostEnvironment.js";
import { logError } from "../../utils/log.js";
import { hasSessionIngressAuthToken } from "../../utils/sessionIngressAuth.js";
import { identity as identity_2 } from "../../utils/identity.js";
import { isPolicyAllowed as isPolicyAllowed_2 } from "../policyLimits/policyVerdicts.js";
import { hasComplianceTaint } from "../policyLimits/complianceTaints.js";
import { isConnectTimeMcpBlockEnabled, setVerdictJudge } from "../analytics/growthbookGates.js";
import { isRestrictedToPluginOnly } from "../../utils/settings/pluginOnlyPolicy.js";
import {
  describeMcpConfigFilePath,
  getEffectiveProjectMcpServerStatus,
  getProjectMcpServerStatusFromSettings,
  getProjectMcpServerStatus,
  resolveProjectMcpServerApproval,
} from "./utils.js";
import { sleep } from "../../utils/sleep.js";
import { readSmallFileChecked, readSmallFileCheckedSync } from "../../utils/readSmallFile.js";
import { getFsImplementation } from "../../utils/fsOperations.js";
import { safeParseJSON } from "../../utils/json.js";
import { isLocalSettingsReadable } from "../../utils/claudemd.js";
import { initClassifierToolSet } from "../../utils/permissions/classifierModelConfig.js";
import { isCustomizationDisabled } from "../../utils/settings/customizationDisabled.js";
import { loadAllPluginsCacheOnly, loadAllPluginsForPreview } from "../../utils/plugins/pluginLoader.js";
import { pluginErrorText } from "../../types/plugin.js";
import { getPolicyAllowedSet } from "../../utils/plugins/pluginPolicy.js";
import { getPluginMcpServers } from "../../utils/plugins/mcpPluginIntegration.js";
import { pickByHelper } from "../../utils/git/gitSafeEnv.js";
import { getPlatform } from "../../utils/platform.js";
import { commandSyncNameState } from "../../utils/settings/commandSyncNames.js";
import { isManagedFolderWritable } from "../../plugins/functionHooks/sites/promptContextSites.js";
import { isBareMode } from "../../utils/envUtils.js";
import { deliveredReaderSlot, deliveredNamesOf } from "../../plugins/functionHooks/api/settingsRead.js";
import { mcpServerSource } from "./fileReference/fileReferencePolicy.js";
import { isConnectedOrCached } from "../../skills/bundled/scheduleRemoteAgents.js";
import { mcpAuthErrorCode } from "../../entrypoints/sdk/coreSchemas.js";
import { MCP_TRANSPORTS_SUPPORTING_TOOLS } from "../tools/toolExecutionTelemetry.js";
import { PRIVATE_DNS_SUFFIXES } from "../../cli/cloudSession/validateCloudFlags.js";

//@ chunk-e6aww6q8.js:2316830-2316945 placement
/**
 * 判断 MCP 传输类型能否由用户配置添加：IDE/SDK 类型只由宿主提供，claude.ai 代理类型需开关开启。
 */
function unaddableTransportReason(type) {
  if (isIdeOrSdkType(type)) return "host-only";
  if (type === "claudeai-proxy" && !isGateOOn()) return "claudeai-connector";
  return null;
}
//@ chunk-e6aww6q8.js:3820777-3820790 placement
/**
 * 记录中“提示绑定的桥接载体”的标记值。
 */
var recordedPromptBoundCarrier = null;
//@ chunk-e6aww6q8.js:3820790-3820812 placement
/**
 * 记录提示绑定的桥接载体。
 */
function setPromptBoundCarrier(e) {
  recordedPromptBoundCarrier = e;
}
//@ chunk-e6aww6q8.js:3820812-3820823 placement
/**
 * 内置记忆服务器的名字。
 */
var MEMORY_SERVER_NAME = MEMORY;
//@ chunk-e6aww6q8.js:3820823-3820862 placement
/**
 * 判断服务器名是否就是记忆服务器。
 */
function isMemoryServerName(e) {
  return normalizedKey(getPrefixServerKey(e)) === MEMORY_SERVER_NAME;
}
//@ chunk-e6aww6q8.js:3820862-3820898 layout
function isBridgeCarrierDynamicConfig(e) {
  return isCliOwnedConfig(e?.[MEMORY_SERVER_NAME]);
}
//@ chunk-e6aww6q8.js:3820898-3821175 fingerprint = getAllMcpConfigs (0.507)
/**
 * refuseReservedNamesForCarrier：Remote Control carrier 会话中，保留名的非 carrier 服务器被拒绝加载，返回 {servers, refused}。
 */
function refuseReservedNamesForCarrier(e, n) {
  if (!isBridgeCarrierDynamicConfig(n))
    return {
      servers: e,
      refused: [],
    };
  let r = [];
  let s;
  for (let [key, value] of Object.entries(e)) {
    if (isCliOwnedConfig(value) || !isMemoryServerName(key)) continue;
    s ??= Object.assign(Object.create(null), e);
    delete s[key];
    r.push({
      name: key,
      scope: value.scope,
    });
  }
  return s === undefined
    ? {
        servers: e,
        refused: [],
      }
    : {
        servers: s,
        refused: r,
      };
}
//@ chunk-e6aww6q8.js:3821175-3821608 layout
function describeScopeOrigin(e) {
  return "";
  switch (e) {
    case "user":
      return "your user settings";
    case "local":
      return "this project's local settings";
    case "project":
      return "this project's .mcp.json";
    case "dynamic":
      return "--mcp-config";
    case "agent":
      return "the agent's frontmatter";
    case "managed":
      return "your organization's managed settings";
    case "enterprise":
      return "your organization's enterprise MCP configuration";
    case "claudeai":
      return "claude.ai";
    default:
      return e;
  }
}
//@ chunk-e6aww6q8.js:3821608-3821633 layout
/**
 * 恒返回空串的占位函数。
 */
function emptyString_2(e) {
  return "";
}
//@ chunk-e6aww6q8.js:3821633-3821655 layout
/**
 * 按宿主保存的“保留名被拒”记录。
 */
var refusedReservedNameHostState = new HostScoped(() => []);
//@ chunk-e6aww6q8.js:3821655-3821778 layout
/**
 * 记录一次"保留服务器名被拒绝"事件到按宿主隔离的列表（同 scope+name 去重），供 useManageMCPConnections 汇总提示；代理 frontmatter 的 mcpServers 被拒时以 scope=agent 记录。
 */
function addAgentModelOverrideNotice(e, n = getRootSession().host) {
  let r = refusedReservedNameHostState.of(n);
  if (r.some((s) => s.scope === e.scope && s.name === e.name)) return false;
  r.push(e);
  return true;
}
//@ chunk-e6aww6q8.js:3821778-3821841 layout
/**
 * 是否已有名为 memory 的 CLI 自有服务器。
 */
function hasCliOwnedMemoryServer(configs) {
  return configs.some((config) => config.name === MEMORY_SERVER_NAME && isCliOwnedConfig(config.config));
}
//@ chunk-e6aww6q8.js:3821841-3821883 layout
/**
 * 取当前宿主记录的保留名拒绝列表。
 */
function refusedReservedNames(e = getRootSession().host) {
  return refusedReservedNameHostState.of(e);
}
//@ chunk-e6aww6q8.js:3821883-3822005 layout
/**
 * 合并两组保留名拒绝记录，按 scope+name 去重保持先后顺序。
 */
function mergeUniqueServerRefs(e, reservedNameRefusals) {
  let r = [];
  for (let s of [...e, ...reservedNameRefusals])
    if (!r.some((h) => h.scope === s.scope && h.name === s.name)) r.push(s);
  return r;
}
//@ chunk-e6aww6q8.js:3822005-3822068 layout
/**
 * 生成 “ (local scope for …)” 的说明后缀。
 */
function localScopeNote(e) {
  return e === undefined ? "" : ` (local scope for ${e})`;
}
//@ chunk-e6aww6q8.js:3822068-3822452 layout
function mcpConfigWriteNotSavedError(name, filePath, operation, projectPath) {
  let h = operation === "add" ? `was not saved to ${filePath}` : `was not removed from ${filePath}`;
  let y = operation === "add" ? "add the server again" : "remove the server again";
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `MCP server "${name}" ${h}${localScopeNote(projectPath)}. If that file is read-only or protected by a sandbox, make it writable or run the command outside the sandbox, then ${y}.`,
    "MCP server config write did not reach the global config file",
  );
}
//@ chunk-e6aww6q8.js:3822452-3822943 layout
function mcpConfigWriteUnconfirmedError(e, n, r, s, h) {
  let y = r === "add" ? "saved" : "removed";
  let S =
    r === "add" ? "add the server again if it is missing" : "remove the server again if it is still listed";
  let w = s === undefined ? "" : `from ${s} `;
  let L = runCommandHint("mcp get", e, {
    tail: `${w}to check`,
    fallback: `run \`claude mcp list\` ${w}to check`,
  });
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `MCP server "${e}" may not have been ${y}${localScopeNote(s)}: ${n} could not be read to confirm the change (${h}). ${capitalize(L)}, then ${S}.`,
    "MCP server config write to the global config file could not be confirmed",
  );
}
//@ chunk-e6aww6q8.js:3822943-3823011 layout
function getManagedMcpServersIfReadable() {
  if (isSdkEntrypoint() || getAllPolicyTierSettings().length === 0 || armedFromUserWritableBase()) return;
  return getPolicyManagedMcpServers();
}
//@ chunk-e6aww6q8.js:3823011-3823325 layout
function getManagedMcpServersIgnoredWarnings() {
  if (!isSdkEntrypoint() || !getPolicyManagedMcpServers()) return [];
  return [
    {
      file: "managed settings",
      path: "managedMcpServers",
      message:
        "The organization's MCP servers in managed settings (managedMcpServers) are not read in this session: Claude Desktop supplies and locks this session's MCP servers itself.",
      severity: "warning",
      statusOnly: true,
    },
  ];
}
//@ chunk-e6aww6q8.js:3823325-3823429 layout
function getPolicyManagedMcpServers() {
  let managedMcpServers = getSettingsForSource("policySettings")?.managedMcpServers;
  return managedMcpServers && Object.keys(managedMcpServers).length > 0 ? managedMcpServers : undefined;
}
//@ chunk-e6aww6q8.js:3823429-3823509 layout
/**
 * 生成"`<名字>` 是保留的 MCP 服务器名，未加载"的提示文案。
 */
function reservedServerNameMessage(e) {
  return `"${e}" is a reserved MCP server name and was not loaded`;
}
//@ chunk-e6aww6q8.js:3823509-3823792 layout
/**
 * expandServerConfigEnvVars：对 stdio 的 command/args/env 或远程的 url/headers 做 ${VAR} 展开，返回展开结果、缺失变量与 url 是否展开为空。
 */
function expandServerConfigEnvVars(config) {
  let n = [];
  let urlExpandedToEmpty = false;
  let blankList;
  return {
    expanded: mapServerConfigStrings(config, (y, S, remoteSink) => {
      if (y.includes("${")) blankList ??= scrubbedEnvKeys();
      let L = expandMcpCredentialEnvVars(y, undefined, undefined, {
        remoteSink,
        blankList,
      });
      n.push(...L.missingVars);
      if (S === "url") urlExpandedToEmpty = y.trim() !== "" && L.expanded.trim() === "";
      return L.expanded;
    }),
    missingVars: uniq(n),
    urlExpandedToEmpty,
  };
}
//@ chunk-e6aww6q8.js:3823792-3824192 layout
function mapServerConfigStrings(config, n) {
  switch (config.type) {
    case undefined:
    case "stdio": {
      let stdioConfig = config;
      return {
        ...stdioConfig,
        command: n(stdioConfig.command, "command", false),
        args: stdioConfig.args.map((arg) => n(arg, "args", false)),
        env: stdioConfig.env ? xr(stdioConfig.env, (s) => n(s, "env", false)) : undefined,
      };
    }
    case "sse":
    case "http":
    case "ws": {
      let remoteConfig = config;
      return {
        ...remoteConfig,
        url: n(remoteConfig.url, "url", true),
        headers: remoteConfig.headers ? xr(remoteConfig.headers, (s) => n(s, "headers", true)) : undefined,
      };
    }
    case "sse-ide":
    case "ws-ide":
    case "sdk":
    case "claudeai-proxy":
      return config;
  }
}
//@ chunk-e6aww6q8.js:3824192-3824256 layout
function cloneAsWrittenEntry(e) {
  try {
    return containsEnvRef(jsonStringify(e)) ? undefined : clone(e);
  } catch {
    return;
  }
}
//@ chunk-e6aww6q8.js:3824256-3824330 layout
function configReferencesEnvVars(config) {
  let n = false;
  mapServerConfigStrings(config, (r, s) => {
    n ||= s !== "env" && containsEnvRef(r);
    return r;
  });
  return n;
}
//@ chunk-e6aww6q8.js:3824330-3824425 layout
var SERVER_CONFIG_SCHEMAS_BY_TYPE = {
  stdio: McpStdioServerConfigSchema,
  sse: McpSSEServerConfigSchema,
  http: McpHTTPServerConfigSchema,
  "streamable-http": McpHTTPServerConfigSchema,
  ws: McpWebSocketServerConfigSchema,
  sdk: McpSdkServerConfigSchema,
  "claudeai-proxy": McpClaudeAIProxyServerConfigSchema,
};
//@ chunk-e6aww6q8.js:3824425-3824885 layout
function findWhitespacePaddedFields(e) {
  let n = [];
  function r(s, h) {
    if (h !== h.trim()) n.push(s);
  }
  if ("command" in e) r("command", e.command);
  if ("url" in e) r("url", e.url);
  if ("args" in e && e.args) e.args.forEach((arg, h) => r(`args[${h}]`, arg));
  if ("env" in e && e.env)
    for (let [key, value] of Object.entries(e.env)) {
      if (key !== key.trim()) n.push(`env name ${jsonStringify(key)}`);
      r(`env.${key}`, value);
    }
  if ("headers" in e && e.headers)
    for (let [key, value] of Object.entries(e.headers)) {
      if (key !== key.trim()) n.push(`header name ${jsonStringify(key)}`);
      r(`headers.${key}`, value);
    }
  return n;
}
//@ chunk-e6aww6q8.js:3824885-3825662 layout
var BRIDGE_CARRIER_DROP_MESSAGES = {
  bridge_carrier_foreign_entry:
    "is not the Remote Control meta server entry and was not loaded (only that entry loads from this --mcp-config)",
  bridge_carrier_not_http: 'was not loaded: the Remote Control meta server entry must be type "http"',
  bridge_carrier_url_mismatch:
    "was not loaded: its url is not this session's meta server proxy route on the session ingress origin",
  bridge_carrier_no_ingress_origin:
    "was not loaded: no approved session ingress origin was set at startup to verify and rebuild the meta server entry against (SESSION_INGRESS_URL is set by the Remote Control spawner)",
  bridge_carrier_no_session_id:
    "was not loaded: no --sdk-url/--session-id was passed to verify and rebuild the meta server entry against (both are set by the Remote Control spawner)",
};
//@ chunk-e6aww6q8.js:3825662-3826018 layout
/**
 * verifyBridgeCarrierEntry：Remote Control carrier 子进程只接受名为 claude-code-remote 的 http 条目，且 URL 必须是本会话 ingress 的 meta server 路由。
 */
function verifyBridgeCarrierEntry(name, config, sessionId) {
  if (name !== CLAUDE_CODE_REMOTE)
    return {
      drop: "bridge_carrier_foreign_entry",
    };
  if (config.type !== "http")
    return {
      drop: "bridge_carrier_not_http",
    };
  let s = originIfValid(startupCcrEnv.atStartup);
  if (!s)
    return {
      drop: "bridge_carrier_no_ingress_origin",
    };
  if (!sessionId)
    return {
      drop: "bridge_carrier_no_session_id",
    };
  let ccrSessionMcpUrl = parseCcrSessionMcpUrl(config.url, s, sessionId);
  if (!ccrSessionMcpUrl)
    return {
      drop: "bridge_carrier_url_mismatch",
    };
  return {
    url: ccrSessionMcpUrl,
    sessionId,
  };
}
//@ chunk-e6aww6q8.js:3826018-3830489 callgraph-witnessed = parseMcpConfig (0.222)
/**
 * parseMcpConfig：校验 {mcpServers} 对象并逐项处理：保留名、未知 type、sdk/claudeai-proxy 只能出现在 dynamic、zod 校验（url 缺 type 给专门提示）、bridge carrier 条目验证、${VAR} 展开（缺失变量、url 展开为空）、首尾空白警告、企业配置是否引用环境变量。返回 {config, errors, asWrittenEntries}。
 */
function parseMcpConfig(params) {
  let { configObject, expandVars, scope, filePath, bridgeSessionId } = params;
  let schemaResult = u({
    mcpServers: record(string(), unknown()),
  }).safeParse(configObject);
  if (!schemaResult.success) {
    let ke =
      configObject !== null &&
      typeof configObject === "object" &&
      "servers" in configObject &&
      !("mcpServers" in configObject);
    return {
      config: null,
      errors: schemaResult.error.issues.map((issue) => ({
        ...(filePath && {
          file: filePath,
        }),
        path: issue.path.join("."),
        message: ke
          ? 'Missing "mcpServers" \u2014 found "servers" instead. Claude Code reads MCP servers from the "mcpServers" key.'
          : issue.message,
        ...(ke && {
          suggestion: `Rename the top-level "servers" key to "mcpServers" in ${filePath ?? "your MCP config"}`,
        }),
        mcpErrorMetadata: {
          scope,
          severity: "fatal",
        },
      })),
      asWrittenEntries: {},
    };
  }
  let errors = [];
  let servers = {};
  let asWrittenEntries = {};
  function pushServerError(ke, we, Ee, Ae) {
    errors.push({
      ...(filePath && {
        file: filePath,
      }),
      path: `mcpServers.${ke}`,
      message: replaceControlChars(we),
      ...(Ee && {
        suggestion: replaceControlChars(Ee),
      }),
      mcpErrorMetadata: {
        scope,
        serverName: ke,
        severity: "warning",
        ...(Ae && {
          skipReason: Ae,
        }),
      },
    });
  }
  function pushMissingEnvVarsError(ke, we) {
    if (we.length > 0)
      pushServerError(
        ke,
        formatWithheldEnvNotice(we, isManagedConfigScope(scope)),
        `Set the following environment variables: ${we.join(", ")}`,
      );
  }
  let mcpServers = configObject.mcpServers;
  for (let key of Object.keys(mcpServers).filter(isPrototypeKey))
    pushServerError(
      key,
      reservedServerNameMessage(key),
      "Rename this server in your MCP config \u2014 " + `"${key}" cannot be used as a server name`,
      "reserved_name",
    );
  for (let [key, value] of Object.entries(schemaResult.data.mcpServers)) {
    if (isPrototypeKey(key)) continue;
    let Ee =
      value && typeof value === "object" && "type" in value && typeof value.type === "string"
        ? value.type
        : "stdio";
    let Ae = Object.hasOwn(SERVER_CONFIG_SCHEMAS_BY_TYPE, Ee) ? SERVER_CONFIG_SCHEMAS_BY_TYPE[Ee] : undefined;
    if (!Ae) {
      pushServerError(
        key,
        `Skipped \u2014 unknown MCP server type "${Ee}" for server "${key}"`,
        `Valid types are: stdio, sse, http (or streamable-http), ws${scope === "dynamic" ? ", sdk" : ""}`,
        "unknown_type",
      );
      continue;
    }
    if (Ee === "sdk" && scope !== "dynamic") {
      pushServerError(
        key,
        `Skipped \u2014 MCP server "${key}" declares type "sdk", which only an SDK host application can register`,
        `Remove "${key}" from your MCP config: in-process SDK servers are registered by the host application at startup, not read from configuration files`,
        "invalid_config",
      );
      continue;
    }
    if (scope !== "dynamic" && unaddableTransportReason(Ee) === "claudeai-connector") {
      pushServerError(
        key,
        `Skipped \u2014 MCP server "${key}" declares type "claudeai-proxy", which only claude.ai connectors use`,
        `Remove "${key}" from your MCP config: connect the service at claude.ai/customize/connectors and it appears in Claude Code automatically, or add it here with type "http"`,
        "invalid_config",
      );
      continue;
    }
    let Ie = Ae().safeParse(value);
    if (!Ie.success) {
      if (
        value !== null &&
        typeof value === "object" &&
        !("type" in value) &&
        "url" in value &&
        !("command" in value)
      ) {
        pushServerError(
          key,
          `Skipped \u2014 MCP server "${key}" has a "url" but no "type"; add "type": "http" (or "sse" / "ws") to this entry`,
          undefined,
          "url_missing_type",
        );
        continue;
      }
      let joined = Ie.error.issues
        .map((issue) => {
          let replaced = issue.message.replace(/^Invalid input: /, "");
          return `${issue.path.join(".") || "(root)"}: ${replaced}`;
        })
        .join("; ");
      pushServerError(
        key,
        `Skipped \u2014 invalid MCP server config for "${key}": ${joined}`,
        undefined,
        "invalid_config",
      );
      continue;
    }
    let config = Ie.data;
    if (config.type === "sdk") {
      let { tools, connectorId, ...Et } = config;
      config = Et;
    }
    if (scope === "dynamic" && startupCcrEnv.isBridgeCarrierChild) {
      let nt = verifyBridgeCarrierEntry(key, config, bridgeSessionId);
      if ("drop" in nt) {
        pushServerError(key, `"${key}" ${BRIDGE_CARRIER_DROP_MESSAGES[nt.drop]}`, undefined, nt.drop);
        continue;
      }
      servers[key] = registerCliOwnedConfig(ccrMetaMcpServerConfig(nt.url, nt.sessionId));
      continue;
    }
    let We = scope === "dynamic" && (params.hostCarrier ?? env.CLAUDE_CODE_REMOTE);
    let ze = expandVars
      ? isManagedConfigScope(scope)
        ? withHostEnvRestored(() => expandServerConfigEnvVars(config))
        : expandServerConfigEnvVars(config)
      : undefined;
    if (
      isBuiltinMcpServerName(key, {
        hostCarrier: We,
        ...(params.hostCarrier && {
          hosted: true,
        }),
        config: ze?.expanded ?? config,
      }) &&
      config.type !== "sdk"
    ) {
      if (We && BROWSER_SERVER_NAMES.has(key)) {
        pushMissingEnvVarsError(key, ze?.missingVars ?? []);
        pushServerError(
          key,
          `"${key}" on a hosted session is reserved except as an http server on a loopback IP literal (e.g. http://127.0.0.1:PORT/mcp) and was not loaded`,
          `Point "${key}" at the in-container listener over plain http by loopback IP literal, or rename this server`,
          "reserved_name",
        );
        continue;
      }
      if (isDesktopConnectorServerName(key) && claimOnce().claim("desktop_connector_name_refused"))
        logFeatureSad("mcp_desktop_connector_name", "name_refused");
      pushServerError(
        key,
        reservedServerNameMessage(key),
        `Rename this server in your MCP config \u2014 "${key}" is reserved for internal use`,
        "reserved_name",
      );
      continue;
    }
    let whitespacePaddedFields = findWhitespacePaddedFields(config);
    if (whitespacePaddedFields.length > 0)
      pushServerError(
        key,
        `Leading or trailing whitespace in: ${whitespacePaddedFields.join(", ")}`,
        `Remove the whitespace from these values in the "${key}" entry \u2014 they are used exactly as written`,
      );
    let configToCheck = config;
    if (ze) {
      let { expanded, missingVars, urlExpandedToEmpty } = ze;
      pushMissingEnvVarsError(key, missingVars);
      let yt = "command" in config && "command" in expanded ? stdioIdentityDiff(config, expanded) : undefined;
      configToCheck = {
        ...expanded,
        ...(yt && {
          configuredCommand: yt,
        }),
      };
      if (urlExpandedToEmpty && "url" in config)
        configToCheck = {
          ...expanded,
          configError: `'url' ${jsonStringify(config.url)} expanded to an empty string. Set the referenced environment variable, or update the server's config and reconnect.`,
          configErrorReason: "url_invalid",
        };
    }
    if (scope === "enterprise" && configReferencesEnvVars(config))
      configToCheck = {
        ...configToCheck,
        expandedFromEnv: true,
      };
    servers[key] = configToCheck;
    if (We) asWrittenEntries[key] = "url" in configToCheck ? cloneAsWrittenEntry(value) : undefined;
  }
  return {
    config: {
      mcpServers: servers,
    },
    errors,
    asWrittenEntries,
  };
}
//@ chunk-e6aww6q8.js:3830489-3830528 layout
var MCP_PROJECT_SERVERS_APPROVED = "mcp_project_servers_approved";
//@ chunk-e6aww6q8.js:3830528-3831255 layout
/**
 * logProjectServersApprovedOnce：每会话一次记录 tengu_mcp_project_servers_approved（按审批方式与传输计数）。
 */
function logProjectServersApprovedOnce(approvedProjectServers, n, resolveProjectMcpServerApproval) {
  let s = sessionHostKind();
  if (s === "none" || claimOnce().has(MCP_PROJECT_SERVERS_APPROVED)) return;
  let h = {
    settings: 0,
    bypass: 0,
    non_interactive: 0,
  };
  let y = {
    stdio: 0,
    http: 0,
    sse: 0,
    ws: 0,
    other: 0,
  };
  for (let [w, L] of [...Object.entries(approvedProjectServers), ...Object.entries(n)]) {
    let G = resolveProjectMcpServerApproval(w);
    if (G.status === "approved") {
      h[G.by]++;
      let q = L.type ?? "stdio";
      let Z = q === "stdio" || q === "http" || q === "sse" || q === "ws";
      y[Z ? q : "other"]++;
    }
  }
  if (h.settings + h.bypass + h.non_interactive > 0 && claimOnce().claim(MCP_PROJECT_SERVERS_APPROVED))
    logEvent("tengu_mcp_project_servers_approved", {
      hostedKind: fromEnum(s),
      approvedBySettings: h.settings,
      approvedByBypass: h.bypass,
      approvedByNonInteractive: h.non_interactive,
      stdioCount: y.stdio,
      httpCount: y.http,
      sseCount: y.sse,
      wsCount: y.ws,
      otherTransportCount: y.other,
      fromRepoPluginsCount: Object.keys(n).length,
      workspacePersistedTrusted: isWorkspacePersistedTrusted(),
    });
}
//@ chunk-e6aww6q8.js:3831255-3831306 facade-majority = getEnterpriseMcpFilePath (1)
/**
 * 企业 MCP 配置文件路径：`<managed 设置目录>/managed-mcp.json`。
 */
function getEnterpriseMcpFilePath() {
  return join(getManagedFilePath(), "managed-mcp.json");
}
//@ chunk-e6aww6q8.js:3831306-3831507 layout
var ENTERPRISE_EXCLUSIVE_HINT =
  "only your organization's managed MCP servers can load until it is fixed or removed and Claude Code is restarted";
var ENTERPRISE_EXCLUSIVE_MESSAGE = `This file keeps exclusive control of MCP servers while it exists: ${ENTERPRISE_EXCLUSIVE_HINT}`;
//@ chunk-e6aww6q8.js:3831507-3831548 facade-majority
/**
 * 创建无原型的空对象（Object.create(null)）作为服务器名到配置的映射，避免原型链键名冲突。
 */
function emptyServerMap() {
  return Object.create(null);
}
//@ chunk-e6aww6q8.js:3831548-3831685 layout
function addScopeToServers(mcpServers, scope, r) {
  let scopedServers = emptyServerMap();
  if (mcpServers)
    for (let [name, config] of Object.entries(mcpServers))
      scopedServers[name] =
        r === undefined
          ? {
              ...config,
              scope,
            }
          : {
              ...config,
              scope,
              declaredIn: r,
            };
  return scopedServers;
}
//@ chunk-e6aww6q8.js:3831685-3831865 layout
function assertProjectScopeWritable() {
  if (getProjectConfigRoot() !== null)
    throw Error(
      "Project-scope MCP server changes are unavailable in a session started with --project-config-root. Use the local or user scope instead.",
    );
}
//@ chunk-e6aww6q8.js:3831865-3832001 callgraph-witnessed = writeMcpjsonFile (0.367)
async function writeMcpjsonFile(config) {
  let mcpJsonPath = join(getCwd(), ".mcp.json");
  await writeFileAtomic_2_2(mcpJsonPath, jsonStringify(config, null, 2), {
    encoding: "utf-8",
    mode: 420,
    stagingDir: join(getCwd(), ".claude", ATOMIC_WRITE_DIRNAME),
  });
}
//@ chunk-e6aww6q8.js:3832001-3832083 file-local
function commandArraysMatch(a, b) {
  if (a.length !== b.length) return false;
  return a.every((val, idx) => val === b[idx]);
}
//@ chunk-e6aww6q8.js:3832083-3832184 layout
function expandEnvString(serverUrl, blankList, { remoteSink: r = false } = {}) {
  return expandMcpCredentialEnvVars(serverUrl, undefined, undefined, {
    remoteSink: r,
    blankList,
  }).expanded;
}
//@ chunk-e6aww6q8.js:3832184-3832229 layout
function expandEnvInArray(serverCommandArray, n) {
  return serverCommandArray.map((r) => expandEnvString(r, n));
}
//@ chunk-e6aww6q8.js:3832229-3832269 layout
function getPolicyExpansionEnv() {
  return {
    ...getPreSettingsEnvSnapshot(),
    ...getAdminTierEnv(),
  };
}
//@ chunk-e6aww6q8.js:3832269-3832371 file-local
function getAdminTierEnv() {
  let scopedServers = {};
  for (let n of getAllPolicyTierSettings())
    for (let [name, config] of Object.entries(filterEnvForPolicyPredicateMatch(n.env)))
      scopedServers[name] ??= config;
  return scopedServers;
}
//@ chunk-e6aww6q8.js:3832371-3832456 layout
function getPolicyMatchEnv() {
  if (!env.CLAUDE_CODE_EVAL_CONFINED && !isEvalPolicySnapshotOnly()) return getPolicyExpansionEnv();
  return {
    ...getAdminTierEnv(),
  };
}
//@ chunk-e6aww6q8.js:3832456-3832714 layout
function getPolicyExpansionEnvs() {
  let e = {};
  Object.assign(
    e,
    filterEnvForPolicyPredicateMatch(getLegacyEnvMap(), "globalConfig"),
    isSettingSourceEnabled("userSettings")
      ? filterEnvForPolicyPredicateMatch(getSettingsForSource("userSettings")?.env, "userSettings")
      : {},
    filterEnvForPolicyPredicateMatch(getSettingsForSource("flagSettings")?.env, "flagSettings"),
    filterEnvForPolicyPredicateMatch(getSettingsForSource("policySettings")?.env, "policySettings"),
  );
  return {
    env: getPolicyExpansionEnv(),
    fallbackEnv: e,
  };
}
//@ chunk-e6aww6q8.js:3832714-3832992 layout
function expandPolicyCommandPart(e, n, blankList, s) {
  let { expanded, missingVars, blankedVars } = expandMcpCredentialEnvVars(e, n, s, {
    blankAsLive: true,
    blankList,
  });
  if (missingVars.length > 0)
    logForDebugging(
      `MCP policy predicate references environment variable(s) not present in the policy expansion env: ${missingVars.join(", ")}`,
    );
  warnBlankedCredentialVars(blankedVars);
  return {
    expanded,
    missingVars,
  };
}
//@ chunk-e6aww6q8.js:3832992-3833227 layout
function warnBlankedCredentialVars(blankedVars) {
  if (blankedVars.length > 0)
    logForDebugging(
      `MCP policy predicate references credential variable(s) that are read as empty for matching: ${blankedVars.join(", ")} \u2014 an entry keyed on one cannot match a config that spells the value out`,
      {
        level: "warn",
      },
    );
}
//@ chunk-e6aww6q8.js:3833227-3833290 layout
/**
 * 解析主机模式时用来占位通配符的随机哨兵串。
 */
var HOST_PATTERN_WILDCARD_SENTINEL = `zzadminwc${randomBytes(8).toString("hex")}zz`;
var ZZENVSUBZZ = "zzenvsubzz";
//@ chunk-e6aww6q8.js:3833290-3833531 layout
function maskEnvValueForProbe(e) {
  let n = /\.+$/.exec(e)?.[0];
  if (n && e.length > n.length) return `${maskEnvValueForProbe(e.slice(0, -n.length))}${n}`;
  if (/^[0-9]+(\.[0-9]+)*$/.test(e)) return e.replace(/[0-9]+/g, "0");
  if (e.includes(":") && /^[0-9a-fA-F:.]+$/.test(e)) return "::";
  return ZZENVSUBZZ;
}
//@ chunk-e6aww6q8.js:3833531-3834362 layout
function classifyUrlVarPositions(e, env) {
  let r = [];
  for (let w of e.matchAll(new RegExp(ENV_REF_PATTERN, "g"))) {
    let L = w[1];
    if (!r.includes(L) && Object.hasOwn(env, L) && typeof env[L] === "string") r.push(L);
  }
  let s = new Map();
  let h = (w, L) => {
    let G = `zzv${r.indexOf(w)}zz`;
    let proxy = new Proxy(
      {},
      {
        get: (ke, we) => {
          if (typeof we !== "string") return;
          if (we === w) return G;
          if (!Object.hasOwn(env, we) || typeof env[we] !== "string") return;
          return L.has(we) ? String(env[we]) : maskEnvValueForProbe(String(env[we]));
        },
      },
    );
    let expanded = expandMcpCredentialEnvVars(e, proxy).expanded;
    let hostPattern = parseHostPattern(expanded, HOST_PATTERN_WILDCARD_SENTINEL);
    if (hostPattern === null) return "authority";
    if (hostPattern.protocol.includes(G)) return "scheme";
    if (
      hostPattern.username.includes(G) ||
      hostPattern.password.includes(G) ||
      hostPattern.hostname.includes(G) ||
      hostPattern.port.includes(G)
    )
      return "authority";
    if (hostPattern.pathname.includes(G) || hostPattern.search.includes(G) || hostPattern.hash.includes(G))
      return "rest";
    return "scheme";
  };
  let y = new Set();
  let S = new Set(r.filter((w) => h(w, y) === "scheme"));
  for (let w of r) s.set(w, S.has(w) ? "scheme" : h(w, S));
  return s;
}
//@ chunk-e6aww6q8.js:3834362-3834401 layout
/**
 * 协议部分里不允许的字符正则。
 */
var UNSAFE_PATH_CHARS_RE = /[/@#?\\\s]/;
var UNSAFE_SCHEME_CHARS_RE = /[:/@#?\\\s]/;
//@ chunk-e6aww6q8.js:3834401-3834544 layout
function hasUnsafeSchemeOrHostValue(e, env) {
  for (let [r, s] of e) {
    if (s === "rest") continue;
    let h = env[r];
    if (typeof h === "string" && (s === "scheme" ? UNSAFE_SCHEME_CHARS_RE : UNSAFE_PATH_CHARS_RE).test(h))
      return true;
  }
  return false;
}
//@ chunk-e6aww6q8.js:3834544-3834585 layout
/**
 * 匹配路径中的 . 或 .. 段的正则。
 */
var DOT_SEGMENT_RE = /(^|\/)(\.|%2e)(\.|%2e)?(\/|$)/i;
//@ chunk-e6aww6q8.js:3834585-3834829 layout
function hasUnsafePathExpansion(e, env) {
  for (let r of e.matchAll(new RegExp(ENV_REF_PATTERN, "g"))) {
    let s = env[r[1]];
    if (typeof s !== "string") continue;
    if (/[?#]/.test(s)) return true;
    let replaced = s
      .replace(/[\t\n\r]/g, "")
      .replaceAll("\\", "/")
      .replace(/%2e/gi, ".");
    if (DOT_SEGMENT_RE.test(replaced)) return true;
  }
  return false;
}
//@ chunk-e6aww6q8.js:3834829-3835083 layout
function hasDotSegmentPath(expanded) {
  let n = 0;
  let r = expanded.length;
  while (n < r && expanded.charCodeAt(n) <= 32) n++;
  while (r > n && expanded.charCodeAt(r - 1) <= 32) r--;
  let replaced = expanded
    .slice(n, r)
    .replace(/[\t\n\r]/g, "")
    .replaceAll("\\", "/")
    .replace(/%2e/gi, ".");
  let h = replaced.search(/[?#]/);
  let y = h === -1 ? replaced : replaced.slice(0, h);
  return DOT_SEGMENT_RE.test(y);
}
//@ chunk-e6aww6q8.js:3835083-3837046 layout
/**
 * expandPolicyUrlPattern：展开 allow/deny 策略里的 URL 模式（* 通配保留），检测值注入通配、改变 URL 结构、点段等"不安全展开"，对白名单失败关闭。
 */
function expandPolicyUrlPattern(pattern, env, blankList, fallbackEnv, { asConfigured: h = false } = {}) {
  let replaced = pattern.replace(/[\t\n\r]/g, "");
  let replaced_2 = replaced.replaceAll("*", HOST_PATTERN_WILDCARD_SENTINEL);
  let w = expandMcpCredentialEnvVars(replaced_2, env, fallbackEnv, {
    remoteSink: !h,
    blankAsLive: !h,
    blankList,
  });
  warnBlankedCredentialVars(w.blankedVars);
  let proxy = new Proxy(
    {},
    {
      get: (Me, We) =>
        typeof We === "string" && Object.hasOwn(env, We) ? maskEnvValueForProbe(String(env[We])) : undefined,
    },
  );
  let G = expandMcpCredentialEnvVars(replaced_2, proxy, undefined, {
    remoteSink: !h,
    blankAsLive: !h,
    blankList,
  });
  let hostPattern = parseHostPattern(w.expanded, HOST_PATTERN_WILDCARD_SENTINEL);
  let hostPattern_2 = parseHostPattern(G.expanded, HOST_PATTERN_WILDCARD_SENTINEL);
  let hostname = hostPattern?.hostname ?? null;
  let hostname_2 = hostPattern_2?.hostname ?? null;
  let we = G.expanded !== replaced_2;
  let Ee = we ? classifyUrlVarPositions(replaced_2, env) : new Map();
  let Ae = replaced.includes("$") && hasDotSegmentPath(w.expanded);
  let Ie =
    w.wildcardVars.length > 0 ||
    (we && hasUnsafeSchemeOrHostValue(Ee, env)) ||
    (hostname === null) !== (hostname_2 === null) ||
    (we && hostname === null) ||
    (hostPattern !== null &&
      ((hostPattern.hash !== "" && (hostPattern_2?.hash ?? "") === "") ||
        (hostPattern.search !== "" && (hostPattern_2?.search ?? "") === ""))) ||
    (we && hasUnsafePathExpansion(replaced_2, env)) ||
    Ae ||
    (hostname !== null &&
      ((hostname.includes("*") && !(hostname_2 ?? "").includes("*")) ||
        (hostname.endsWith(".") && !(hostname_2 ?? "").endsWith(".")) ||
        (hostname.includes(HOST_PATTERN_WILDCARD_SENTINEL) &&
          !(hostname_2 ?? "").includes(HOST_PATTERN_WILDCARD_SENTINEL))));
  if (w.missingVars.length > 0)
    logForDebugging(
      `MCP policy predicate references environment variable(s) not present in the policy expansion env: ${w.missingVars.join(", ")}`,
    );
  if (Ie) {
    let Me =
      w.wildcardVars.length > 0
        ? w.wildcardVars
        : [
            ...Object.keys(env).filter(
              (key) => pattern.includes("${" + key + "}") || pattern.includes("${" + key + ":"),
            ),
            ...w.missingVars,
          ];
    let matches = new RegExp(ENV_REF_PATTERN).test(replaced);
    logForDebugging(
      `MCP policy URL predicate expansion was unsafe \u2014 ${w.wildcardVars.length > 0 ? "a value injected wildcard semantics" : Ae ? `the expanded entry's path carries a dot segment ('..' or '.') that URL parsing would collapse \u2014 remove dot segments from the pattern${matches ? ", or set the referenced variable(s)" : " (the pattern's '$' text is not a ${NAME} reference, so environment values cannot affect it)"}` : "a value restructured the URL, or the expansion is unparseable as a URL (e.g. a whole-URL ${VAR}: rewrite as https://${HOST}/path \u2014 hostname-position variables are fully supported)"} (variables: ${Me.join(", ") || "unknown"}) \u2014 allowlist URL entries using it fail closed; denylist entries are unaffected`,
    );
  }
  return {
    expanded: w.expanded.replaceAll(HOST_PATTERN_WILDCARD_SENTINEL, "*"),
    unsafeExpansion: Ie,
    missingVars: w.missingVars,
  };
}
//@ chunk-e6aww6q8.js:3837046-3837067 layout
var SIGNATURE_IGNORED_ENV = new Set(PLUGIN_ENV_VAR_NAMES);
//@ chunk-e6aww6q8.js:3837067-3837449 facade-majority = getMcpServerSignature (0.578)
/**
 * getMcpServerSignature：服务器去重签名：stdio 为 stdio:JSON(命令数组)[:JSON(排序后 env)]，远程为 url:规范化 URL（CCR 代理取 mcp_url）。
 */
function getMcpServerSignature(config, options) {
  if ("configError" in config && config.configError) return null;
  let cmd = getServerCommandArray(config);
  if (cmd) {
    if (options?.includeEnv === false) return `stdio:${jsonStringify(cmd)}`;
    let sorted = Object.entries(config.env ?? {})
      .filter(([key]) => !SIGNATURE_IGNORED_ENV.has(key))
      .sort(([w], [L]) => (w < L ? -1 : w > L ? 1 : 0));
    let S = sorted.length > 0 ? `:${jsonStringify(Object.fromEntries(sorted))}` : "";
    return `stdio:${jsonStringify(cmd)}${S}`;
  }
  let url = getServerUrl(config);
  if (url) {
    let h = unwrapCcrProxyUrl(url);
    return options?.exactUrl ? `url:${h}` : `url:${normalizeMcpServerUrl(h)}`;
  }
  return null;
}
//@ chunk-e6aww6q8.js:3837449-3838062 fingerprint = dedupPluginMcpServers (0.942)
/**
 * dedupPluginMcpServers：插件服务器与手工配置签名相同（不含 env）或与更早插件服务器重复时压制，返回 {servers, suppressed}。
 */
function dedupPluginMcpServers(pluginServers, manualServers) {
  let manualSigs = new Map();
  for (let [name, config] of Object.entries(manualServers)) {
    let sig = getMcpServerSignature(config, {
      includeEnv: false,
    });
    if (sig && !manualSigs.has(sig)) manualSigs.set(sig, name);
  }
  let servers = {};
  let suppressed = [];
  let seenPluginSigs = new Map();
  for (let [name, config] of Object.entries(pluginServers)) {
    let sig = getMcpServerSignature(config);
    if (sig === null) {
      servers[name] = config;
      continue;
    }
    let mcpServerSignature = getMcpServerSignature(config, {
      includeEnv: false,
    });
    let manualDup = mcpServerSignature !== null ? manualSigs.get(mcpServerSignature) : undefined;
    if (manualDup !== undefined) {
      logForDebugging(
        `Suppressing plugin MCP server "${name}": duplicates manually-configured "${manualDup}"`,
      );
      suppressed.push({
        name,
        duplicateOf: manualDup,
      });
      continue;
    }
    let pluginDup = seenPluginSigs.get(sig);
    if (pluginDup !== undefined) {
      logForDebugging(
        `Suppressing plugin MCP server "${name}": duplicates earlier plugin server "${pluginDup}"`,
      );
      suppressed.push({
        name,
        duplicateOf: pluginDup,
      });
      continue;
    }
    seenPluginSigs.set(sig, name);
    servers[name] = config;
  }
  return {
    servers,
    suppressed,
  };
}
//@ chunk-e6aww6q8.js:3838062-3838136 layout
/**
 * 生成配置端点的来源描述。
 */
function endpointOriginFor(e) {
  return describeEndpointOrigin({
    authoredUnexpanded: e,
    expanded: e,
    cliOwned: false,
  });
}
//@ chunk-e6aww6q8.js:3838136-3839118 facade-majority
/**
 * findMultiScopeEndpointConflicts：同名服务器在多个作用域端点不同时生成警告（OAuth 令牌按端点存，不会通用）。
 */
function getMcpScopeConflicts(scopeEntries) {
  let n = new Map();
  for (let { scope, servers, displayServers } of scopeEntries)
    for (let [key, value] of Object.entries(servers)) {
      let mcpServerSignature = getMcpServerSignature(value, {
        includeEnv: false,
        exactUrl: true,
      });
      if (!mcpServerSignature) continue;
      let G = n.get(key);
      if (!G) n.set(key, (G = []));
      let q = displayServers[key];
      G.push({
        scope,
        sig: mcpServerSignature,
        endpoint: q ? endpointOriginFor(q) : mcpTransportType(value),
      });
    }
  let r = [];
  for (let [s, h] of n) {
    if (h.length < 2) continue;
    if (new Set(h.map((S) => S.sig)).size < 2) continue;
    let filtered = h.map((S) => claudeCommand("mcp remove", s, `-s ${S.scope}`)).filter((S) => S !== null);
    r.push({
      path: `mcpServers.${s}`,
      message: `Server "${s}" is defined in multiple scopes with different endpoints: ${h.map((S) => `${S.scope} (${S.endpoint})`).join(", ")}. OAuth tokens are stored per endpoint, so authenticating in one context will not carry over.`,
      severity: "warning",
      suggestion:
        filtered.length > 0
          ? `Keep the correct endpoint and remove the others: ${filtered.map((S) => `\`${S}\``).join(" or ")}`
          : "Keep the correct endpoint and remove the others from the scopes listed above.",
      mcpErrorMetadata: {
        scope: h[0].scope,
        serverName: s,
        severity: "warning",
      },
    });
  }
  return r;
}
//@ chunk-e6aww6q8.js:3839118-3839280 facade-majority
/**
 * suppressedListsEqual：比较两次去重压制列表是否相同。
 */
function suppressedConnectorsEqual(e, n) {
  return (
    e.length === n.length &&
    e.every(
      (r, s) =>
        r.name === n[s]?.name &&
        r.duplicateOf === n[s]?.duplicateOf &&
        r.duplicateOfScope === n[s]?.duplicateOfScope,
    )
  );
}
//@ chunk-e6aww6q8.js:3839280-3839853 facade-majority = dedupClaudeAiMcpServers (0.747)
/**
 * dedupClaudeAiMcpServers：claude.ai 连接器与已启用的手工配置签名相同时压制。
 */
async function dedupClaudeAiMcpServers(claudeAiServers, manualServers) {
  let mcpOAuthStore = await readMcpOAuthStore();
  let manualSigs = new Map();
  for (let [key, value] of Object.entries(manualServers)) {
    if (isMcpServerDisabled(key)) continue;
    if (
      (value.type === "sse" || value.type === "http") &&
      (needsClientRegistration(
        key,
        {
          ...value,
          redialToRelearnRegistration: undefined,
        },
        mcpOAuthStore,
      ) ||
        hasExpiredAccessTokenOnly(key, value, mcpOAuthStore))
    )
      continue;
    let sig = getMcpServerSignature(value);
    if (sig && !manualSigs.has(sig))
      manualSigs.set(sig, {
        name: key,
        scope: value.scope,
      });
  }
  let servers = {};
  let suppressed = [];
  for (let [name, config] of Object.entries(claudeAiServers)) {
    let sig = getMcpServerSignature(config);
    let manualDup = sig !== null ? manualSigs.get(sig) : undefined;
    if (manualDup !== undefined) {
      logForDebugging(
        `Suppressing claude.ai connector "${name}": duplicates manually-configured "${manualDup.name}"`,
      );
      suppressed.push({
        name,
        duplicateOf: manualDup.name,
        duplicateOfScope: manualDup.scope,
      });
      continue;
    }
    servers[name] = config;
  }
  return {
    servers,
    suppressed,
  };
}
//@ chunk-e6aww6q8.js:3839853-3839926 fingerprint = isMcpServerAllowedByPolicy (0.426)
function getMcpAllowlistPolicy() {
  if (isManagedMcpServersOnly())
    return {
      allowedMcpServers: getAllowedMcpServersFromTiers(getMcpPolicyView()),
    };
  return getInitialSettings_2();
}
//@ chunk-e6aww6q8.js:3839926-3840169 layout
function getMcpDenylistPolicy() {
  let deniedMcpServers = getInitialSettings_2().deniedMcpServers;
  let flattened = getDurablePolicyTierSettings().flatMap((h) => h.deniedMcpServers ?? []);
  if (deniedMcpServers === undefined && flattened.length === 0) return {};
  let r = new Set();
  let s = [];
  for (let h of [...(deniedMcpServers ?? []), ...flattened]) {
    let y = jsonStringify(h);
    if (!r.has(y)) {
      r.add(y);
      s.push(h);
    }
  }
  return {
    deniedMcpServers: s,
  };
}
//@ chunk-e6aww6q8.js:3840169-3840313 facade-majority
/**
 * 计算当前生效的 MCP 组织策略指纹（只用管理员服务器、allow/deny 名单、受控标志、managedMcpServers 序列化），用于判断策略是否变化以失效缓存。
 */
function getEffectiveMcpPolicyKey() {
  return jsonStringify([
    isManagedMcpServersOnly(),
    getMcpAllowlistPolicy().allowedMcpServers ?? null,
    getMcpDenylistPolicy().deniedMcpServers ?? null,
    hasDisableClaudeAiConnectors(),
    getSettingsForSource("policySettings")?.managedMcpServers ?? null,
  ]);
}
//@ chunk-e6aww6q8.js:3840313-3840440 layout
function recordPolicyPredicateOutcome(e) {
  let policyPredicateTelemetryEmitted = getPolicyPredicateTelemetryEmitted();
  if (policyPredicateTelemetryEmitted.has(e)) return;
  policyPredicateTelemetryEmitted.add(e);
  if (e === "ok") logFeatureOk("mcp_policy_predicate");
  else logFeatureSad("mcp_policy_predicate", e);
}
//@ chunk-e6aww6q8.js:3840440-3840518 layout
function recordPolicyExpansionIssues(e, n) {
  if (e) recordPolicyPredicateOutcome("missing_policy_var");
  if (n) recordPolicyPredicateOutcome("unsafe_expansion");
}
//@ chunk-e6aww6q8.js:3840518-3841609 facade-majority
/**
 * expandMcpPolicyForDisplay：把 allow/deny 策略中的 ${VAR} 用屏蔽后的环境值展开，用于展示与比较。
 */
function expandMcpPolicyPredicates(e) {
  if (!e.deniedMcpServers && !e.allowedMcpServers) return e;
  let n = new Set(flattened_3.map((q) => q.toUpperCase()));
  let r = (q, Z) =>
    isSecretEnvName(q) || n.has(q.toUpperCase()) || (Z !== undefined && containsCredential(Z));
  let s = (q, Z) => {
    if (isSecretEnvName(q) || n.has(q.toUpperCase())) return "*";
    let Se = sanitizeIndexUrlEnv(q, Z).value;
    if (Se === HTTP_INDEX_INVALID) return "*";
    return !Z.endsWith("/") && Se.endsWith("/") ? Se.slice(0, -1) : Se;
  };
  let h = {
    ...getPolicyExpansionEnv(),
  };
  let y = {
    ...h,
  };
  let blankList = scrubbedEnvKeys();
  for (let [key, value] of Object.entries(h))
    if (r(key, value)) {
      delete h[key];
      if (value === undefined) delete y[key];
      else y[key] = s(key, value);
    }
  let w = {
    ...getPolicyExpansionEnvs().fallbackEnv,
  };
  let L = {
    ...w,
  };
  for (let [key, value] of Object.entries(w))
    if (r(key, value)) {
      delete L[key];
      if (value === undefined) delete w[key];
      else w[key] = s(key, value);
    }
  let G = (entry, Z) => {
    let fallbackEnv = Z === "deny" ? w : undefined;
    let env = Z === "deny" ? y : h;
    if (isMcpServerUrlEntry(entry)) {
      let we = expandPolicyUrlPattern(entry.serverUrl, env, blankList, fallbackEnv, {
        asConfigured: Z === "deny",
      });
      return Z === "allow" && we.unsafeExpansion
        ? entry
        : {
            ...entry,
            serverUrl: we.expanded,
          };
    }
    if (isMcpServerCommandEntry(entry))
      return {
        ...entry,
        serverCommand: entry.serverCommand.map(
          (we) => expandPolicyCommandPart(we, h, blankList, Z === "deny" ? L : undefined).expanded,
        ),
      };
    return entry;
  };
  return {
    ...e,
    ...(e.deniedMcpServers && {
      deniedMcpServers: e.deniedMcpServers.map((deniedMcpServer) => G(deniedMcpServer, "deny")),
    }),
    ...(e.allowedMcpServers && {
      allowedMcpServers: e.allowedMcpServers.map((allowedMcpServer) => G(allowedMcpServer, "allow")),
    }),
  };
}
//@ chunk-e6aww6q8.js:3841609-3841744 layout
function getClaudeAiProxyUrl(e) {
  if (!isValidServerId(e.id)) return null;
  let { MCP_PROXY_URL, MCP_PROXY_PATH } = getOauthConfig();
  return `${MCP_PROXY_URL}${MCP_PROXY_PATH.replace("{server_id}", normalizeConnectorId(e.id))}`;
}
//@ chunk-e6aww6q8.js:3841744-3841814 layout
function isNonClaudeAiScopedProxyConfig(config) {
  return config.type === "claudeai-proxy" && config.scope !== "claudeai";
}
//@ chunk-e6aww6q8.js:3841814-3841907 facade-majority
/**
 * 判断是否存在 MCP 组织策略：deny 名单非空或配置了 allow 名单。
 */
function hasManagedMcpPolicy() {
  return (
    (getMcpDenylistPolicy().deniedMcpServers?.length ?? 0) > 0 ||
    getMcpAllowlistPolicy().allowedMcpServers !== undefined
  );
}
//@ chunk-e6aww6q8.js:3841907-3842069 layout
function admitClaudeAiConnectorByPolicy(config) {
  if (!hasManagedMcpPolicy()) return "admit";
  let claudeAiConnectorById = lookupClaudeAiConnectorById(config.id);
  if (claudeAiConnectorById.kind === "found")
    return isMcpServerDenied(claudeAiConnectorById.name, claudeAiConnectorById.config) ? "refuse" : "admit";
  return claudeAiConnectorById.kind === "pending" ? "hold" : "refuse";
}
//@ chunk-e6aww6q8.js:3842069-3842128 facade-majority
/**
 * 判断一个非 claude.ai 作用域的代理配置是否要按 claude.ai 连接器列表来裁决：能解析出 claude.ai 代理 URL、非受控环境且存在组织策略。
 */
function isJudgedOnClaudeAiConnectorList(e) {
  return (
    isNonClaudeAiScopedProxyConfig(e) &&
    getClaudeAiProxyUrl(e) !== null &&
    !hasDisableClaudeAiConnectors() &&
    hasManagedMcpPolicy()
  );
}
//@ chunk-e6aww6q8.js:3842128-3842343 layout
function getClaudeAiProxyUrlVariants(e) {
  let claudeAiProxyUrl = getClaudeAiProxyUrl(e);
  if (claudeAiProxyUrl === null) return [];
  let r = normalizeConnectorId(e.id);
  let s = r.startsWith("mcpsrv") ? `mcprs${r.slice(6)}` : r;
  let { MCP_PROXY_URL, MCP_PROXY_PATH } = getOauthConfig();
  let S = `${MCP_PROXY_URL}${MCP_PROXY_PATH.replace("{server_id}", s)}`;
  return S === claudeAiProxyUrl ? [claudeAiProxyUrl] : [claudeAiProxyUrl, S];
}
//@ chunk-e6aww6q8.js:3842343-3842486 layout
function claudeAiProxyUrlVariantsWithSiblings(config) {
  let n = new Set(getClaudeAiProxyUrlVariants(config));
  let claudeAiConnectorById = lookupClaudeAiConnectorById(config.id);
  if (claudeAiConnectorById.kind === "found")
    for (let id of claudeAiConnectorById.siblingIds)
      for (let h of getClaudeAiProxyUrlVariants({
        id,
      }))
        n.add(h);
  return [...n];
}
//@ chunk-e6aww6q8.js:3842486-3842539 layout
/**
 * 取配置的端点地址（代理配置取代理地址）。
 */
function configEndpointUrl(config) {
  if (isNonClaudeAiScopedProxyConfig(config)) return getClaudeAiProxyUrl(config);
  return getServerUrl(config);
}
//@ chunk-e6aww6q8.js:3842539-3842619 facade-majority
/**
 * 判断服务器是否被 deny 名单拒绝：本名命中，或其配置的任一别名（如代理 URL 的另一形式）命中都算。
 */
function isMcpServerDenied(serverName, config) {
  return (
    isMcpServerDenied_2(serverName, config) ||
    (config !== undefined &&
      getServerUrl_3(config).some((r) => isMcpServerDenied_2(serverName, copyCcrMarks(config, r))))
  );
}
//@ chunk-e6aww6q8.js:3842619-3843520 fingerprint = isMcpServerDenied (0.562)
/**
 * isMcpServerDenied：deniedMcpServers 中 name、command（逐段展开后比较）或 url 模式（含 claude.ai 代理 URL 与兄弟 ID）任一命中即拒绝。
 */
function isMcpServerDenied_2(serverName, config) {
  let settings = getMcpDenylistPolicy();
  if (!settings.deniedMcpServers) return false;
  for (let entry of settings.deniedMcpServers)
    if (isMcpServerNameEntry(entry) && entry.serverName === serverName) return true;
  if (
    config !== undefined &&
    isClaudeInChromeMCPServer(serverName) &&
    isClaudeAiProxyServer(config) &&
    isMcpServerDenied(serverName, getClaudeInChromeStdioServerConfig())
  )
    return true;
  if (config !== undefined && isNonClaudeAiScopedProxyConfig(config)) {
    let serverCommand = lookupClaudeAiConnectorById(config.id);
    if (serverCommand.kind === "found" && isMcpServerDenied(serverCommand.name, serverCommand.config))
      return true;
  }
  if (config) {
    let { env, fallbackEnv } = getPolicyExpansionEnvs();
    let blankList = scrubbedEnvKeys();
    let serverCommandArray = getServerCommandArray(config);
    if (serverCommandArray) {
      let G = expandEnvInArray(serverCommandArray, blankList);
      let q = isManagedPluginScope(config)
        ? [G, runWithPluginWriteScope(config, () => expandEnvInArray(serverCommandArray, blankList))]
        : [G];
      for (let entry of settings.deniedMcpServers) {
        if (!isMcpServerCommandEntry(entry)) continue;
        let mapped = entry.serverCommand.map(
          (ke) => expandPolicyCommandPart(ke, env, blankList, fallbackEnv).expanded,
        );
        if (q.some((ke) => commandArraysMatch(mapped, ke))) return true;
      }
    }
    let serverUrl = getServerUrl(config);
    let L = isNonClaudeAiScopedProxyConfig(config)
      ? claudeAiProxyUrlVariantsWithSiblings(config)
      : ccrConfigHosts(config);
    if (serverUrl || L.length > 0) {
      let G = [
        ...(serverUrl
          ? [
              expandEnvString(serverUrl, blankList, {
                remoteSink: true,
              }),
              expandEnvString(serverUrl, blankList),
              ...(isManagedPluginScope(config)
                ? runWithPluginWriteScope(config, () => [
                    expandEnvString(serverUrl, blankList, {
                      remoteSink: true,
                    }),
                    expandEnvString(serverUrl, blankList),
                  ])
                : []),
            ]
          : []),
        ...L.filter((q) => q !== serverUrl),
      ];
      for (let entry of settings.deniedMcpServers) {
        if (!isMcpServerUrlEntry(entry)) continue;
        let mapped = [false, true].map(
          (asConfigured) =>
            expandPolicyUrlPattern(entry.serverUrl, env, blankList, fallbackEnv, {
              asConfigured,
            }).expanded,
        );
        if (G.some((Se) => mapped.some((ke) => buildHostPatternRegex(Se, ke)))) return true;
      }
    }
  }
  return false;
}
//@ chunk-e6aww6q8.js:3843520-3843728 layout
function isDesktopEntryRegisteredByCli(serverName, config) {
  if (!isHostedDesktopSession() || !isDesktopComputerUseCommand(config) || isCliOwnedConfig(config))
    return false;
  logForDebugging(
    `MCP server "${serverName}" starts this session's desktop and was not connected: Claude Code registers the desktop itself, as "${COMPUTER_USE_MCP_SERVER_NAME}".`,
    {
      level: "warn",
    },
  );
  return true;
}
//@ chunk-e6aww6q8.js:3843728-3845175 facade-majority
/**
 * isMcpServerAllowedByPolicy：组织策略判定：被拒绝（deniedMcpServers 的 name/command/url 条目）→ 否；managed/enterprise 作用域直接允许；有 allowedMcpServers 时按 command 或 url 条目（含 ${VAR} 安全展开）或 name 匹配。
 */
function isMcpServerAllowedByPolicy(serverName, config) {
  if (config !== undefined && toScopedConfig_2(config)) return false;
  if (config !== undefined && isDesktopEntryRegisteredByCli(serverName, config)) return false;
  if (config !== undefined && config.type === "claudeai-proxy") {
    if (getClaudeAiProxyUrl(config) === null) return false;
    if (isNonClaudeAiScopedProxyConfig(config) && admitClaudeAiConnectorByPolicy(config) !== "admit")
      return false;
  }
  if (isMcpServerDenied(serverName, config)) return false;
  if (
    config?.scope !== undefined &&
    isManagedConfigScope(config.scope) &&
    !config.expandedFromEnv &&
    !config.pluginSource
  )
    return true;
  let settings = getMcpAllowlistPolicy();
  if (!settings.allowedMcpServers) return true;
  if (isCcrInjectedConfig(config) || isOwnToolContainerConfig(config)) return true;
  if (settings.allowedMcpServers.length === 0) return false;
  let hasCommandEntries = settings.allowedMcpServers.some(isMcpServerCommandEntry);
  let hasUrlEntries = settings.allowedMcpServers.some(isMcpServerUrlEntry);
  if (config) {
    let env = getPolicyMatchEnv();
    let serverCommandArray = getServerCommandArray(config);
    let serverUrl = configEndpointUrl(config);
    if (serverCommandArray) {
      if (hasCommandEntries) {
        let blankList = scrubbedEnvKeys();
        let G = runWithPluginWriteScope(config, () => expandEnvInArray(serverCommandArray, blankList));
        let q = false;
        for (let allowedMcpServer of settings.allowedMcpServers)
          if (isMcpServerCommandEntry(allowedMcpServer)) {
            let mapped = allowedMcpServer.serverCommand.map((ke) => {
              let we = expandPolicyCommandPart(ke, env, blankList);
              q ||= we.missingVars.length > 0;
              return we.expanded;
            });
            if (commandArraysMatch(mapped, G)) {
              recordPolicyPredicateOutcome("ok");
              return true;
            }
          }
        recordPolicyExpansionIssues(q, false);
        return false;
      } else {
        for (let entry of settings.allowedMcpServers)
          if (isMcpServerNameEntry(entry) && entry.serverName === serverName) return true;
        return false;
      }
    } else if (serverUrl) {
      if (hasUrlEntries) {
        let blankList = scrubbedEnvKeys();
        let G = runWithPluginWriteScope(config, () =>
          expandEnvString(serverUrl, blankList, {
            remoteSink: true,
          }),
        );
        let q = false;
        let Z = false;
        for (let allowedMcpServer of settings.allowedMcpServers) {
          if (!isMcpServerUrlEntry(allowedMcpServer)) continue;
          let { expanded, unsafeExpansion, missingVars } = expandPolicyUrlPattern(
            allowedMcpServer.serverUrl,
            env,
            blankList,
          );
          q ||= missingVars.length > 0;
          Z ||= unsafeExpansion;
          if (unsafeExpansion) continue;
          if (buildHostPatternRegex(G, expanded)) {
            recordPolicyPredicateOutcome("ok");
            return true;
          }
        }
        recordPolicyExpansionIssues(q, Z);
        return false;
      } else {
        let L = serverName;
        if (isNonClaudeAiScopedProxyConfig(config)) {
          let claudeAiConnectorById = lookupClaudeAiConnectorById(config.id);
          if (claudeAiConnectorById.kind !== "found") return false;
          L = claudeAiConnectorById.name;
        }
        for (let entry of settings.allowedMcpServers)
          if (isMcpServerNameEntry(entry) && entry.serverName === L) return true;
        return false;
      }
    } else {
      for (let entry of settings.allowedMcpServers)
        if (isMcpServerNameEntry(entry) && entry.serverName === serverName) return true;
      return false;
    }
  }
  for (let entry of settings.allowedMcpServers)
    if (isMcpServerNameEntry(entry) && entry.serverName === serverName) return true;
  return false;
}
//@ chunk-e6aww6q8.js:3845175-3845212 facade-majority
/**
 * 判断是否内置进程内 MCP 服务器（Claude in Chrome 或 Computer Use 一类保留名）。
 */
function isBuiltinInProcessMcpServer(name) {
  return isClaudeInChromeMCPServer(name) || isComputerUseServer(name);
}
//@ chunk-e6aww6q8.js:3845212-3845377 facade-majority = filterMcpServersByPolicy (1)
/**
 * filterMcpServersByPolicy：sdk 类型或通过 isMcpServerAllowedByPolicy 的留下，其余列为 blocked。
 */
function filterMcpServersByPolicy(configs) {
  let allowed = Object.create(null);
  let blocked = [];
  for (let [name, config] of Object.entries(configs)) {
    let y = config;
    if (y.type === "sdk" || isMcpServerAllowedByPolicy(name, y)) allowed[name] = config;
    else blocked.push(name);
  }
  return {
    allowed,
    blocked,
  };
}
//@ chunk-e6aww6q8.js:3845377-3845425 layout
var CONNECT_TIME_POLICY_SCOPES = new Set(["dynamic", "agent", "claudeai"]);
//@ chunk-e6aww6q8.js:3845425-3845817 facade-majority
/**
 * isRefusedByBuiltinPlugin：内置插件声明 mayConnectMcpServer 且返回 false 时拒绝其服务器（异常也拒绝）。
 */
function isWithdrawnBuiltinPluginServer(name, config) {
  let pluginSource = config.pluginSource;
  let s = config.type === "sdk" || pluginSource === undefined ? undefined : officialPluginId(pluginSource);
  if (s === undefined) return false;
  let sliced = s.slice(0, -`@${BUILTIN}`.length);
  let mayConnectMcpServer = getHostState().builtinPlugins.get(sliced)?.mayConnectMcpServer;
  if (mayConnectMcpServer === undefined) return false;
  let S = `plugin:${pluginDisplayKey(sliced, s)}:`;
  try {
    return !mayConnectMcpServer(name.startsWith(S) ? name.slice(S.length) : name);
  } catch (error) {
    logError(
      withTelemetryMessage(
        toError(error),
        "a built-in plugin's mayConnectMcpServer threw; its server is refused",
      ),
    );
    return true;
  }
}
//@ chunk-e6aww6q8.js:3845817-3846051 facade-majority
/**
 * pluginRefusedServerError：插件拒绝其服务器时工具调用返回的错误。
 */
function withdrawnBuiltinPluginServerError(name) {
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `MCP server "${name}" was not called: the plugin that provides it refused this call. Try the call once more. If it is refused again, the plugin has turned the server off.`,
    "MCP server refused by its plugin",
  );
}
//@ chunk-e6aww6q8.js:3846051-3846108 facade-majority
/**
 * 判断该服务器连接会接到 Claude in Chrome 桥（名字是 Chrome 内置名或配置指向 Chrome 桥），sdk 类型除外。
 */
function dialsClaudeInChromeBridge(e, config) {
  return config.type !== "sdk" && (isClaudeInChromeMCPServer(e) || isClaudeInChromeMcpLaunch(config));
}
//@ chunk-e6aww6q8.js:3846108-3846163 layout
/**
 * 是否已设置会话入口地址或令牌。
 */
function hasSessionIngress() {
  return startupCcrEnv.isSessionIngressUrlSet || hasSessionIngressAuthToken();
}
//@ chunk-e6aww6q8.js:3846163-3846213 layout
/**
 * 判断该 toolbox 服务器是否需要入口令牌。
 */
function isToolboxServerNeedingIngress(name, config) {
  return isToolboxMcpServerConfig(config) && !isCcrMemoryMcpServer(name, config) && hasSessionIngress();
}
//@ chunk-e6aww6q8.js:3846213-3846272 layout
/**
 * 按宿主记录“连接时被阻止”的提示状态。
 */
var notedConnectBlockState = identity_2(
  {
    noted: new WeakMap(),
  },
  (e) => {
    e.noted = new WeakMap();
  },
);
//@ chunk-e6aww6q8.js:3846272-3846667 layout
function noteStrayMemoryRouteEntry(serverName, config, r) {
  if (notedConnectBlockState.noted.get(config) === r) return;
  notedConnectBlockState.noted.set(config, r);
  logForDebugging(
    `MCP server "${serverName}" could reach the account memory server but is not the entry the cloud service provides for it: ${r ? "let through, the refusal is lifted" : "refused at connect, so its tools are not available"}.`,
    {
      level: "warn",
    },
  );
  logEvent("tengu_mcp_stray_memory_route_entry", {
    reason: fromEnum(serverName === MEMORY ? "not_canonical" : "other_name"),
    lifted: r,
  });
}
//@ chunk-e6aww6q8.js:3846667-3847384 facade-majority
/**
 * isMcpServerBlockedAtConnectTime：连接前的封锁判断：浏览器扩展开关、HIPAA、桌面入口、保留地址、账号记忆路由、claude.ai 代理可用性与策略 admit/hold/refuse、dynamic/agent/claudeai 作用域的策略。
 */
function isMcpServerBlockedAtConnectTime(
  serverName,
  config,
  { leavesReservedAddressEntries: r = false } = {},
) {
  if (dialsClaudeInChromeBridge(serverName, config) && !isPolicyAllowed_2("allow_claude_browser_extension"))
    return true;
  if (config.type !== "sdk" && isComputerUseServer(serverName) && hasComplianceTaint("hipaa")) return true;
  if (isDesktopEntryRegisteredByCli(serverName, config)) return true;
  if (config.type !== "sdk" && toScopedConfig_2(config)) return true;
  if (
    "url" in config &&
    typeof config.url === "string" &&
    hasOnlyAllowedCcrParams(config.url) &&
    !(isClaudeInChromeMCPServer(serverName) && isClaudeAiProxyServer(config))
  )
    return true;
  if ("url" in config && typeof config.url === "string" && matchesCcrMcpServerId(serverName, config.url))
    return true;
  if (!r && isToolboxServerNeedingIngress(serverName, config)) {
    let s = isConnectTimeMcpBlockEnabled();
    noteStrayMemoryRouteEntry(serverName, config, s);
    if (!s) return true;
  }
  if (!r && isSelfHostedRunnerCcrServer(config)) return true;
  if (
    config.type === "claudeai-proxy" &&
    (hasDisableClaudeAiConnectors() || getClaudeAiProxyUrl(config) === null)
  )
    return true;
  if (isNonClaudeAiScopedProxyConfig(config) && admitClaudeAiConnectorByPolicy(config) !== "admit")
    return true;
  if (!CONNECT_TIME_POLICY_SCOPES.has(config.scope)) return false;
  if (config.type === "sdk") return false;
  if (isClaudeInChromeMCPServer(serverName) && isClaudeAiProxyServer(config))
    return !isMcpServerAllowedByPolicy(serverName, config);
  if (
    isReservedStdioServer(serverName, config) ||
    (isCliOwnedConfig(config) && serverName !== CLAUDE_ARTIFACTS) ||
    config.type === "sse-ide" ||
    config.type === "ws-ide"
  )
    return isMcpServerDenied(serverName, config);
  return !isMcpServerAllowedByPolicy(serverName, config);
}
//@ chunk-e6aww6q8.js:3847384-3847423 facade-majority
/**
 * 判断连接时是否被策略阻止（mcpDialBlockCause 非空）。
 */
function isMcpDialBlockedByPolicy(e, n) {
  return mcpDialBlockCause(e, n) !== null;
}
//@ chunk-e6aww6q8.js:3847423-3847557 facade-majority
/**
 * 给出连接被阻止的原因：连接时策略拦截或不在 allow 名单返回 managed-policy；不属于设置类作用域的不判；其余看作用域门控（可能返回其他原因或 null）。
 */
function mcpDialBlockCause(e, n) {
  if (isMcpServerBlockedAtConnectTime(e, n)) return "managed-policy";
  if (!MCP_SETTINGS_SCOPE_SET.has(n.scope)) return null;
  if (!isMcpServerAllowedByPolicy(e, n)) return "managed-policy";
  return getMcpServerScopeGate(e, n);
}
//@ chunk-e6aww6q8.js:3847557-3847652 layout
/**
 * 动态配置在连接时是否应被阻止的判断函数。
 */
function dynamicBlockPredicate(e, n) {
  return (
    ((isToolboxServerNeedingIngress(e, n) && !isConnectTimeMcpBlockEnabled()) ||
      isSelfHostedRunnerCcrServer(n)) &&
    !isMcpServerBlockedAtConnectTime(e, n, {
      leavesReservedAddressEntries: true,
    })
  );
}
//@ chunk-e6aww6q8.js:3847652-3847661 layout
setVerdictJudge(dynamicBlockPredicate);
//@ chunk-e6aww6q8.js:3847661-3847917 facade-majority
/**
 * partitionByConnectTimePolicy：把服务器分成可连、被封锁、暂缓（等待连接器列表）三组。
 */
function filterDynamicMcpServersByPolicy(e) {
  if (!e)
    return {
      configs: {},
      blocked: [],
      held: [],
    };
  let n = {};
  let r = [];
  let s = [];
  for (let [key, value] of Object.entries(e))
    if (isJudgedOnClaudeAiConnectorList(value) && admitClaudeAiConnectorByPolicy(value) === "hold")
      s.push(key);
    else if (
      isMcpServerBlockedAtConnectTime(key, value, {
        leavesReservedAddressEntries: true,
      })
    )
      r.push(key);
    else n[key] = value;
  return {
    configs: n,
    blocked: r,
    held: s,
  };
}
//@ chunk-e6aww6q8.js:3847917-3848116 facade-majority
/**
 * getRepoMcpPolicyFlags：仓库内设置源是否带 allowedMcpServers / deniedMcpServers（遥测）。
 */
function getRepoMcpListsForAnalytics() {
  let e = projectSettingsAliasesUserSettings()
    ? []
    : REPO_DIR_SETTING_SOURCE_LIST.filter(isSettingSourceEnabled).map((n) => getSettingsForSource(n));
  return {
    repoMcpAllowList: !isManagedMcpServersOnly() && e.some((n) => n?.allowedMcpServers !== undefined),
    repoMcpDenyList: e.some((n) => (n?.deniedMcpServers?.length ?? 0) > 0),
  };
}
//@ chunk-e6aww6q8.js:3848116-3848243 facade-majority
/**
 * 列出 CCR 注入的、按 allow 名单本应被拦、但因保留地址条目而被保留下来的服务器名（用于诊断提示）。
 */
function ccrInjectedKeptDespiteAllowlist(configs) {
  return Object.entries(configs)
    .filter(
      ([key, value]) =>
        isCcrInjectedConfig(value) &&
        isMcpServerBlockedAtConnectTime(
          key,
          {
            ...value,
          },
          {
            leavesReservedAddressEntries: true,
          },
        ),
    )
    .map(([key]) => key);
}
//@ chunk-e6aww6q8.js:3848243-3848643 facade-majority
/**
 * getRestrictedRemoteServerNote：组织限制 MCP 时，说明 claude-code-remote 服务器只保留仓库工具的提示文本。
 */
function ccrRepoToolsOnlyNote(servers) {
  return Object.values(servers).some(hasCcrMeta)
    ? `Note: because this organization restricts MCP servers, Claude Code keeps only the repository tools (${REPO_TOOL_NAMES_WITH_ROOT.join(", ")}) of ${CLAUDE_CODE_REMOTE}, the server it adds to its own remote sessions. That server's other tools (managing cloud scheduled tasks, starting and steering other sessions, following pull request activity) are not available in this session.`
    : undefined;
}
//@ chunk-e6aww6q8.js:3848643-3848808 layout
var INVALID_SERVER_NAME_MESSAGE =
  "Invalid name <redacted>. Names can only contain letters, numbers, hyphens, and underscores.";
var RESERVED_SERVER_NAME_MESSAGE = "Cannot add MCP server <redacted>: this name is reserved.";
//@ chunk-e6aww6q8.js:3848808-3851867 facade-majority = addMcpConfig (0.683)
/**
 * addMcpConfig：claude mcp add 的实现：校验名字/保留名/企业独占/仅插件策略/schema/宿主专用类型/策略，再按作用域写入 .mcp.json、全局配置或项目配置，写后重读确认。
 */
async function addMcpConfig(name, config, scope, storageV5) {
  if (name.match(/[^a-zA-Z0-9_-]/))
    throw withTelemetryMessage(
      Error(`Invalid name ${name}. Names can only contain letters, numbers, hyphens, and underscores.`),
      INVALID_SERVER_NAME_MESSAGE,
    );
  if (isBuiltinMcpServerName(name))
    throw withTelemetryMessage(
      Error(`Cannot add MCP server "${name}": this name is reserved.`),
      RESERVED_SERVER_NAME_MESSAGE,
    );
  if (doesEnterpriseMcpConfigExist()) {
    let unusableEnterpriseMcpConfigMessage = getUnusableEnterpriseMcpConfigMessage();
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Cannot add MCP server: enterprise MCP configuration is active and has exclusive control over MCP servers${unusableEnterpriseMcpConfigMessage === null ? "" : `. ${unusableEnterpriseMcpConfigMessage}`}`,
      "Cannot add MCP server: enterprise MCP configuration is active and has exclusive control over MCP servers",
    );
  }
  if (isRestrictedToPluginOnly("mcp"))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "Cannot add MCP server: your organization's managed settings allow only MCP servers that plugins provide. Install a plugin that provides this server, or ask your administrator to make it available.",
    );
  let result = McpServerConfigSchema().safeParse(config);
  if (!result.success) {
    let formattedErrors = result.error.issues
      .map((err) => `${err.path.join(".")}: ${err.message}`)
      .join(", ");
    throw withTelemetryMessage(
      Error(`Invalid configuration: ${formattedErrors}`),
      "Invalid configuration: <redacted>",
    );
  }
  let validatedConfig = result.data;
  let S = unaddableTransportReason(validatedConfig.type);
  if (S === "host-only")
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Cannot add MCP server "${name}": type "${validatedConfig.type}" servers are registered by the host application at runtime, not stored in configuration`,
      "Cannot add MCP server: host-only transport type",
    );
  if (S === "claudeai-connector")
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Cannot add MCP server "${name}": type "claudeai-proxy" is used only by claude.ai connectors \u2014 connect the service at claude.ai/customize/connectors, or add it with type "http"`,
      "Cannot add MCP server: claudeai-proxy transport type",
    );
  if (isMcpServerDenied(name, validatedConfig))
    throw withTelemetryMessage(
      Error(`Cannot add MCP server "${name}": server is explicitly blocked by enterprise policy`),
      "Cannot add MCP server: server is explicitly blocked by enterprise policy",
    );
  if (!isMcpServerAllowedByPolicy(name, validatedConfig))
    throw withTelemetryMessage(
      Error(`Cannot add MCP server "${name}": not allowed by enterprise policy`),
      "Cannot add MCP server: not allowed by enterprise policy",
    );
  switch (scope) {
    case "project": {
      assertProjectScopeWritable();
      let rawMcpJsonServersFromCwd = await readRawMcpJsonServersFromCwd();
      if (Object.hasOwn(rawMcpJsonServersFromCwd, name))
        throw withTelemetryMessage(
          Error(`MCP server ${name} already exists in .mcp.json`),
          "MCP server already exists in .mcp.json",
        );
      break;
    }
    case "user": {
      if (getGlobalConfig().mcpServers?.[name])
        throw withTelemetryMessage(
          Error(`MCP server ${name} already exists in user config`),
          "MCP server already exists in user config",
        );
      break;
    }
    case "local": {
      if (getCurrentProjectConfig().mcpServers?.[name])
        throw withTelemetryMessage(
          Error(`MCP server ${name} already exists in local config`),
          "MCP server already exists in local config",
        );
      break;
    }
    case "dynamic":
      throw Error("Cannot add MCP server to scope: dynamic");
    case "enterprise":
      throw Error("Cannot add MCP server to scope: enterprise");
    case "managed":
      throw Error("Cannot add MCP server to scope: managed");
    case "claudeai":
      throw Error("Cannot add MCP server to scope: claudeai");
  }
  switch (scope) {
    case "project": {
      let rawMcpJsonServersFromCwd = await readRawMcpJsonServersFromCwd();
      rawMcpJsonServersFromCwd[name] = validatedConfig;
      try {
        await writeMcpjsonFile({
          mcpServers: rawMcpJsonServersFromCwd,
        });
      } catch (error) {
        logFeatureBad("mcp_config_add", "mcp_config_write_failed");
        throw Error(`Failed to write to .mcp.json: ${error}`);
      }
      break;
    }
    case "user": {
      if (
        !(await saveGlobalConfigDurably(
          (current) => ({
            ...current,
            mcpServers: {
              ...current.mcpServers,
              [name]: validatedConfig,
            },
          }),
          storageV5,
        ))
      )
        await verifyGlobalConfigWrite(name, scope, "add", storageV5);
      break;
    }
    case "local": {
      if (
        !(await saveCurrentProjectConfigDurably(
          (current) => ({
            ...current,
            mcpServers: {
              ...current.mcpServers,
              [name]: validatedConfig,
            },
          }),
          storageV5,
        ))
      )
        await verifyGlobalConfigWrite(name, scope, "add", storageV5);
      break;
    }
    default:
      throw Error(`Cannot add MCP server to scope: ${scope}`);
  }
  logFeatureOk("mcp_config_add");
}
//@ chunk-e6aww6q8.js:3851867-3852452 layout
/**
 * verifyGlobalConfigWrite：重读全局配置（带重试）确认 add/remove 生效，否则抛"未保存/无法确认"错误。
 */
async function verifyGlobalConfigWrite(name, scope, operation, s) {
  let h = operation === "add" ? "mcp_config_add" : "mcp_config_remove";
  let filePath = describeMcpConfigFilePath("user");
  let projectPath = scope === "local" ? getProjectPathForConfig() : undefined;
  let w;
  for (let idx = 0; ; idx++)
    try {
      w = await readGlobalConfigFromDiskOrThrow(s);
      break;
    } catch (error) {
      let ke = CONFIG_READ_RETRY_DELAYS_MS[idx];
      if (ke !== undefined) {
        await sleep(ke);
        continue;
      }
      logForDebugging(
        `MCP config: could not re-read ${filePath} to check that server "${name}" was ${operation === "add" ? "added" : "removed"}: ${errorMessage(error)}`,
        {
          level: "error",
        },
      );
      logFeatureBad(h, "mcp_config_write_unconfirmed");
      throw mcpConfigWriteUnconfirmedError(name, filePath, operation, projectPath, errorMessage(error));
    }
  let L = projectPath === undefined ? w : getProp(getProp(w, "projects"), projectPath);
  let prop = getProp(L, "mcpServers");
  if ((isObjectLike_4(prop) && Object.hasOwn(prop, name)) === (operation === "add")) return;
  logFeatureBad(h, "mcp_config_write_failed");
  throw mcpConfigWriteNotSavedError(name, filePath, operation, projectPath);
}
//@ chunk-e6aww6q8.js:3852452-3852505 layout
function isObjectLike_4(e) {
  return typeof e === "object" && e !== null;
}
//@ chunk-e6aww6q8.js:3852505-3852549 layout
function getProp(e, n) {
  return isObjectLike_4(e) ? e[n] : undefined;
}
//@ chunk-e6aww6q8.js:3852549-3853366 facade-majority = removeMcpConfig (0.501)
/**
 * removeMcpConfig：claude mcp remove 的实现，按作用域删除并确认落盘。
 */
async function removeMcpConfig(name, scope, r) {
  switch (scope) {
    case "project": {
      assertProjectScopeWritable();
      let rawMcpJsonServersFromCwd = await readRawMcpJsonServersFromCwd();
      if (!Object.hasOwn(rawMcpJsonServersFromCwd, name))
        throw Error(`No MCP server named "${name}" in .mcp.json`);
      delete rawMcpJsonServersFromCwd[name];
      try {
        await writeMcpjsonFile({
          mcpServers: rawMcpJsonServersFromCwd,
        });
      } catch (error) {
        logFeatureBad("mcp_config_remove", "mcp_config_write_failed");
        throw Error(`Failed to remove from .mcp.json: ${error}`);
      }
      break;
    }
    case "user": {
      if (!getGlobalConfig().mcpServers?.[name]) throw Error(`No MCP server named "${name}" in user scope`);
      if (
        !(await saveGlobalConfigDurably((current) => {
          let { [name]: S, ...restMcpServers } = current.mcpServers ?? {};
          return {
            ...current,
            mcpServers: restMcpServers,
          };
        }, r))
      )
        await verifyGlobalConfigWrite(name, scope, "remove", r);
      break;
    }
    case "local": {
      if (!getCurrentProjectConfig().mcpServers?.[name])
        throw Error(`No MCP server named "${name}" in local scope`);
      if (
        !(await saveCurrentProjectConfigDurably((current) => {
          let { [name]: S, ...restMcpServers } = current.mcpServers ?? {};
          return {
            ...current,
            mcpServers: restMcpServers,
          };
        }, r))
      )
        await verifyGlobalConfigWrite(name, scope, "remove", r);
      break;
    }
    default:
      throw Error(`Cannot remove MCP server from scope: ${scope}`);
  }
  logFeatureOk("mcp_config_remove");
}
//@ chunk-e6aww6q8.js:3853366-3853419 facade-majority
/**
 * 判断 user 作用域（~/.claude.json 顶层 mcpServers）是否已有同名服务器。
 */
function userScopeMcpServerExists(e) {
  return getGlobalConfig().mcpServers?.[e] !== undefined;
}
//@ chunk-e6aww6q8.js:3853419-3853984 facade-majority = getProjectMcpConfigsFromCwd (0.205)
/**
 * getProjectMcpConfigsFromCwd：读取 cwd/.mcp.json 的 mcpServers（普通文件、≤2 MiB），不存在返回空对象。
 */
async function readRawMcpJsonServersFromCwd() {
  let mcpJsonPath = join(getCwd(), ".mcp.json");
  let n;
  try {
    let smallFileChecked = await readSmallFileChecked(
      getFsImplementation(),
      mcpJsonPath,
      MAX_MCP_CONFIG_FILE_BYTES,
    );
    if (smallFileChecked === null)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Can't read .mcp.json: it isn't a regular file or is larger than ${MAX_MCP_CONFIG_FILE_BYTES} bytes. Fix or remove it, then run the command again.`,
        "Project .mcp.json is not a regular file or exceeds the size limit",
      );
    n = smallFileChecked;
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT") return {};
    throw error;
  }
  if (!n.trim()) return {};
  let r = u({
    mcpServers: record(string(), unknown()).default({}),
  }).safeParse(safeParseJSON(n, false));
  if (!r.success) throw Error(".mcp.json is malformed (not valid JSON, or mcpServers is not an object)");
  return r.data.mcpServers;
}
//@ chunk-e6aww6q8.js:3853984-3854094 facade-majority = SCOPE_ORDER (0.845)
/**
 * 实际读取配置的作用域顺序（含 local/project/user）。
 */
var MCP_SETTINGS_SCOPES = ["enterprise", "managed", "local", "user", "project"];
var MCP_SETTINGS_SCOPE_SET = new Set(MCP_SETTINGS_SCOPES);
var CONFIG_READ_SCOPES = [...MANAGED_CONFIG_SCOPES, "local", "project", "user"];
//@ chunk-e6aww6q8.js:3854094-3854198 facade-majority
/**
 * 按作用域读取 MCP 配置的外层：安全模式（禁用自动发现）下返回空集，否则交给真正的读取实现，可选是否展开环境变量。
 */
function getMcpConfigsByScope(scope, { expandVars: n = true } = {}) {
  if (getIsRemoteMode())
    return {
      servers: emptyServerMap(),
      errors: [],
    };
  return getMcpConfigsByScope_2(scope, {
    expandVars: n,
  });
}
//@ chunk-e6aww6q8.js:3854198-3856139 fingerprint = getMcpConfigsByScope (0.904)
/**
 * getMcpConfigsByScope：按作用域读取服务器：project 从项目根到 cwd 逐级读 .mcp.json；user 读全局配置 mcpServers；local 读项目配置 mcpServers；managed 读 policySettings.managedMcpServers；enterprise 读 managed-mcp.json。每项补 scope（与 declaredIn）。
 */
function getMcpConfigsByScope_2(scope, { expandVars = true } = {}) {
  let sourceMap = {
    project: "projectSettings",
    user: "userSettings",
    local: "localSettings",
  };
  if (
    scope in sourceMap &&
    !(scope === "local" ? isLocalSettingsReadable() : isSettingSourceEnabled(sourceMap[scope]))
  )
    return {
      servers: emptyServerMap(),
      errors: [],
    };
  switch (scope) {
    case "project": {
      if (isDiskless())
        return {
          servers: emptyServerMap(),
          errors: [],
        };
      let allServers = emptyServerMap();
      let allErrors = [];
      let dirs = [];
      let currentDir = getOriginalCwd();
      let currentDir_2 = getProjectConfigRoot() ?? currentDir;
      while (currentDir_2 !== parse(currentDir_2).root) {
        dirs.push(currentDir_2);
        currentDir_2 = dirname(currentDir_2);
      }
      for (let dir of dirs.reverse()) {
        let mcpJsonPath = join(dir, ".mcp.json");
        let { config, errors } = parseMcpConfigFromFilePath({
          filePath: mcpJsonPath,
          expandVars,
          scope: "project",
        });
        if (!config) {
          let nonMissingErrors = errors.filter((e) => !e.message.startsWith("MCP config file not found"));
          if (nonMissingErrors.length > 0) {
            logForDebugging(
              `MCP config errors for ${mcpJsonPath}: ${jsonStringify(nonMissingErrors.map((e) => e.message))}`,
              {
                level: "error",
              },
            );
            allErrors.push(...nonMissingErrors);
          }
          continue;
        }
        if (config.mcpServers)
          Object.assign(allServers, addScopeToServers(config.mcpServers, scope, currentDir));
        if (errors.length > 0) allErrors.push(...errors);
      }
      return {
        servers: allServers,
        errors: allErrors,
      };
    }
    case "user": {
      let mcpServers = getGlobalConfig().mcpServers;
      initClassifierToolSet(Object.keys(mcpServers ?? {}));
      if (!mcpServers)
        return {
          servers: emptyServerMap(),
          errors: [],
        };
      let { config, errors } = parseMcpConfig({
        configObject: {
          mcpServers,
        },
        expandVars,
        scope: "user",
      });
      return {
        servers: addScopeToServers(config?.mcpServers, scope),
        errors,
      };
    }
    case "local": {
      let originalCwdOrNull = getOriginalCwdOrNull();
      if (originalCwdOrNull === null)
        return {
          servers: emptyServerMap(),
          errors: [],
        };
      let mcpServers = getCurrentProjectConfig().mcpServers;
      if (!mcpServers)
        return {
          servers: emptyServerMap(),
          errors: [],
        };
      let { config, errors } = parseMcpConfig({
        configObject: {
          mcpServers,
        },
        expandVars,
        scope: "local",
      });
      return {
        servers: addScopeToServers(config?.mcpServers, scope, originalCwdOrNull),
        errors,
      };
    }
    case "managed": {
      let enterpriseMcpPath = getManagedMcpServersIfReadable();
      if (!enterpriseMcpPath)
        return {
          servers: emptyServerMap(),
          errors: getManagedMcpServersIgnoredWarnings(),
        };
      let { config, errors } = parseMcpConfig({
        configObject: {
          mcpServers: enterpriseMcpPath,
        },
        expandVars: false,
        scope: "managed",
      });
      return {
        servers: addScopeToServers(config?.mcpServers, scope),
        errors,
      };
    }
    case "enterprise": {
      let { config, errors, present } = doesEnterpriseMcpConfigExist_2(expandVars);
      if (present) getEnterpriseMcpConfigState().judgeLink();
      if (getEnterpriseMcpConfigState().isHeld(present))
        return {
          servers: emptyServerMap(),
          errors: [],
        };
      if (!config) {
        let nonMissingErrors = errors.filter((e) => !e.message.startsWith("MCP config file not found"));
        if (nonMissingErrors.length > 0) {
          logForDebugging(
            `Enterprise MCP config errors for ${getEnterpriseMcpFilePath()}: ${jsonStringify(nonMissingErrors.map((e) => e.message))}`,
            {
              level: "error",
            },
          );
          return {
            servers: emptyServerMap(),
            errors: present
              ? nonMissingErrors.map((nonMissingError) => ({
                  ...nonMissingError,
                  suggestion: nonMissingError.suggestion
                    ? `${nonMissingError.suggestion}. ${ENTERPRISE_EXCLUSIVE_MESSAGE}`
                    : ENTERPRISE_EXCLUSIVE_MESSAGE,
                }))
              : nonMissingErrors,
          };
        }
        return {
          servers: emptyServerMap(),
          errors: [],
        };
      }
      return {
        servers: addScopeToServers(config.mcpServers, scope),
        errors,
      };
    }
  }
}
//@ chunk-e6aww6q8.js:3856139-3856180 layout
function isMcpServerUngated(e, n) {
  return getMcpServerScopeGate(e, n) === null;
}
//@ chunk-e6aww6q8.js:3856180-3856426 fingerprint = getMcpConfigByName (0.33)
/**
 * getMcpServerScopeGate：作用域门控原因：安全模式或企业/插件独占时 managed-policy，未批准的 project 为 project-approval，否则 null。
 */
function getMcpServerScopeGate(e, n) {
  if (!MCP_SETTINGS_SCOPE_SET.has(n.scope)) return null;
  if (isCustomizationDisabled("mcpAutoDiscovered")) return "managed-policy";
  if (doesEnterpriseMcpConfigExist() || isRestrictedToPluginOnly("mcp"))
    return isManagedConfigScope(n.scope) ? null : "managed-policy";
  if (n.scope === "project")
    return getEffectiveProjectMcpServerStatus(e) === "approved" ? null : "project-approval";
  return null;
}
//@ chunk-e6aww6q8.js:3856426-3856556 facade-majority
/**
 * 在设置类作用域（按优先顺序）中按名字找服务器配置；project 作用域只认已批准的 .mcp.json 服务器；找不到返回 null。
 */
function getSettingsMcpConfigByName(e) {
  for (let n of CONFIG_READ_SCOPES) {
    if (n === "project" && getEffectiveProjectMcpServerStatus(e) !== "approved") continue;
    let r = getMcpConfigsByScope(n).servers[e];
    if (r) return r;
  }
  return null;
}
//@ chunk-e6aww6q8.js:3856556-3856728 facade-majority
/**
 * getMcpConfigByName：按作用域优先级查找可用的同名配置（受企业独占、仅插件、审批限制）。
 */
function getMcpConfigByName(e) {
  if (isCustomizationDisabled("mcpAutoDiscovered")) return null;
  for (let n of CONFIG_READ_SCOPES) {
    if (!isManagedConfigScope(n) && (doesEnterpriseMcpConfigExist() || isRestrictedToPluginOnly("mcp")))
      return null;
    let r = getMcpConfigsByScope(n).servers[e];
    if (r && isMcpServerUngated(e, r)) return r;
  }
  return null;
}
//@ chunk-e6aww6q8.js:3856728-3860255 facade-majority = getClaudeCodeMcpConfigs (0.733)
/**
 * getClaudeCodeMcpConfigs：合并 Claude Code 自身的配置：企业 managed-mcp.json 存在时独占；否则合并 user、已批准的 project、local、managed、插件与 dynamic 服务器，经禁用列表、审批状态与策略过滤；插件服务器与手工配置按签名去重（被压制的记为警告），保留名冲突的 carrier 条目单独报告。
 */
async function getClaudeCodeMcpConfigs(dynamicServers = {}, extraDedupTargets = {}) {
  if (isCustomizationDisabled("mcpAutoDiscovered"))
    return {
      servers: emptyServerMap(),
      pendingProjectServers: new Set(),
      rejectedProjectServers: new Set(),
      errors: [],
      warnings: [],
      reservedNameRefusals: [],
    };
  let getScopeConfigs =
    extraDedupTargets.purpose === "deviceBridge" ? getMcpConfigsByScope_2 : getMcpConfigsByScope;
  let { admits } = extraDedupTargets;
  let h = admits
    ? (rn) => {
        let pn = emptyServerMap();
        for (let [key, value] of Object.entries(getScopeConfigs(rn).servers))
          if (admits(key, value)) pn[key] = value;
        return {
          servers: pn,
        };
      }
    : getScopeConfigs;
  let { servers: enterpriseServers } = h("enterprise");
  let { servers } = h("managed");
  if (doesEnterpriseMcpConfigExist()) {
    let filtered = emptyServerMap();
    for (let [name, serverConfig] of Object.entries({
      ...servers,
      ...enterpriseServers,
    })) {
      if (!isMcpServerAllowedByPolicy(name, serverConfig)) continue;
      filtered[name] = serverConfig;
    }
    return {
      servers: filtered,
      pendingProjectServers: new Set(),
      rejectedProjectServers: new Set(),
      errors: [],
      warnings: [],
      reservedNameRefusals: [],
    };
  }
  let mcpLocked = isRestrictedToPluginOnly("mcp");
  let noServers = {
    servers: emptyServerMap(),
  };
  let { servers: userServers } = mcpLocked ? noServers : h("user");
  let { servers: projectServers } = mcpLocked ? noServers : h("project");
  let { servers: localServers } = mcpLocked ? noServers : h("local");
  let pluginServers = emptyServerMap();
  let pluginLoadResult =
    extraDedupTargets.pluginLoadResult ??
    (await loadAllPluginsCacheOnly(extraDedupTargets.storageV5, extraDedupTargets.credentials));
  let pluginErrors = [];
  let warnings = [];
  if (pluginLoadResult.errors.length > 0)
    for (let error of pluginLoadResult.errors)
      if (
        error.type === "mcp-config-invalid" ||
        error.type === "mcpb-download-failed" ||
        error.type === "mcpb-extract-failed" ||
        error.type === "mcpb-invalid-manifest"
      ) {
        let errorMessage = `Plugin MCP loading error - ${error.type}: ${pluginErrorText(error)}`;
        logForDebugging(errorMessage, {
          level: "error",
        });
      } else {
        let errorType = error.type;
        logForDebugging(`Plugin not available for MCP: ${error.source} - error type: ${errorType}`);
      }
  let pendingProjectServers = new Set();
  let rejectedProjectServers = new Set();
  let getProjectStatus =
    extraDedupTargets.purpose === "deviceBridge"
      ? getProjectMcpServerStatusFromSettings
      : extraDedupTargets.includePendingProjectServers || extraDedupTargets.includeRejectedProjectServers
        ? getProjectMcpServerStatus
        : getEffectiveProjectMcpServerStatus;
  let We = emptyServerMap();
  let ze = extraDedupTargets.purpose === "deviceBridge" ? getPolicyAllowedSet() : null;
  let pluginServerResults = await Promise.all(
    pluginLoadResult.enabled.map(async (plugin) => {
      let pluginMcpServers = await getPluginMcpServers(
        plugin,
        pluginErrors,
        extraDedupTargets.storageV5,
        undefined,
        warnings,
      );
      let no =
        pluginMcpServers && admits
          ? pickByHelper(pluginMcpServers, (ho, yn) => admits(yn, ho))
          : pluginMcpServers;
      if (
        no &&
        extraDedupTargets.purpose === "deviceBridge" &&
        (ze?.has(plugin.source) === true || plugin.admittedByManagedLock === true)
      )
        return xr(no, (ho) => ({
          ...ho,
          scope: "managed",
        }));
      if (!no || !isProjectLocalPlugin(plugin)) return no;
      let hn = pickByHelper(no, (ho, yn) => {
        let projectStatus = getProjectStatus(yn);
        if (projectStatus === "approved") return true;
        if (projectStatus === "pending" && extraDedupTargets.includePendingProjectServers) {
          pendingProjectServers.add(yn);
          return true;
        }
        if (projectStatus === "rejected" && extraDedupTargets.includeRejectedProjectServers) {
          rejectedProjectServers.add(yn);
          return true;
        }
        return false;
      });
      Object.assign(We, hn);
      return extraDedupTargets.purpose === "deviceBridge"
        ? xr(hn, (ho) => ({
            ...ho,
            scope: "project",
          }))
        : hn;
    }),
  );
  for (let servers of pluginServerResults) if (servers) Object.assign(pluginServers, servers);
  if (pluginErrors.length > 0)
    for (let error of pluginErrors) {
      let errorMessage = `Plugin MCP server error - ${error.type}: ${pluginErrorText(error)}`;
      logForDebugging(errorMessage, {
        level: "error",
      });
    }
  let approvedProjectServers = emptyServerMap();
  for (let [key, value] of Object.entries(projectServers)) {
    let projectStatus = getProjectStatus(key);
    if (projectStatus === "approved") {
      approvedProjectServers[key] = value;
      continue;
    }
    if (key in localServers || key in userServers || key in servers || key in pluginServers) continue;
    if (projectStatus === "pending" && extraDedupTargets.includePendingProjectServers) {
      approvedProjectServers[key] = value;
      pendingProjectServers.add(key);
    } else if (projectStatus === "rejected" && extraDedupTargets.includeRejectedProjectServers) {
      approvedProjectServers[key] = value;
      rejectedProjectServers.add(key);
    }
  }
  if (getProjectStatus === getEffectiveProjectMcpServerStatus)
    logProjectServersApprovedOnce(approvedProjectServers, We, resolveProjectMcpServerApproval);
  let nt = isBridgeCarrierDynamicConfig(dynamicServers);
  let manualServers = {};
  for (let [name, config] of Object.entries({
    ...userServers,
    ...approvedProjectServers,
    ...localServers,
    ...servers,
    ...dynamicServers,
  }))
    if (
      !isMcpServerDisabled(name) &&
      !pendingProjectServers.has(name) &&
      !rejectedProjectServers.has(name) &&
      isMcpServerAllowedByPolicy(name, config) &&
      !(nt && isMemoryServerName(name) && !isCliOwnedConfig(config))
    )
      manualServers[name] = config;
  let enabledPluginServers = {};
  let disabledPluginServers = {};
  for (let [name, config] of Object.entries(pluginServers))
    if (
      isMcpServerDisabled(name) ||
      pendingProjectServers.has(name) ||
      rejectedProjectServers.has(name) ||
      !isMcpServerAllowedByPolicy(name, config)
    )
      disabledPluginServers[name] = config;
    else enabledPluginServers[name] = config;
  let { servers: dedupedPluginServers, suppressed } = dedupPluginMcpServers(
    enabledPluginServers,
    manualServers,
  );
  Object.assign(dedupedPluginServers, disabledPluginServers);
  for (let { name, duplicateOf } of suppressed) {
    let parts = name.split(":");
    if (parts[0] !== "plugin" || parts.length < 3) continue;
    let pluginIdentifier = parsePluginIdentifier(enabledPluginServers[name]?.pluginSource ?? "");
    warnings.push({
      type: "mcp-server-suppressed-duplicate",
      source: name,
      plugin: pluginIdentifier.marketplace === BUILTIN ? pluginIdentifier.name : parts[1],
      serverName: parts.slice(2).join(":"),
      duplicateOf,
    });
  }
  let configs = Object.assign(
    {},
    dedupedPluginServers,
    userServers,
    approvedProjectServers,
    localServers,
    servers,
  );
  let Yt = emptyServerMap();
  for (let [key, value] of Object.entries(configs)) {
    let no = value;
    if (!isMcpServerAllowedByPolicy(key, no)) continue;
    Yt[key] = no;
  }
  for (let rn of [pendingProjectServers, rejectedProjectServers])
    for (let pn of rn) {
      let scope = Yt[pn]?.scope;
      if (scope !== "project" && scope !== "dynamic") rn.delete(pn);
    }
  let { servers: servers_2, refused } = refuseReservedNamesForCarrier(Yt, dynamicServers);
  for (let rn of refused) {
    pendingProjectServers.delete(rn.name);
    rejectedProjectServers.delete(rn.name);
  }
  return {
    servers: servers_2,
    pendingProjectServers,
    rejectedProjectServers,
    errors: pluginErrors,
    warnings,
    reservedNameRefusals: refused,
  };
}
//@ chunk-e6aww6q8.js:3860255-3860830 facade-majority
/**
 * getAllMcpConfigs：getClaudeCodeMcpConfigs + claude.ai 连接器（策略过滤后与手工配置按签名去重），合并成最终服务器表。
 */
async function getAllMcpConfigs(e = {}) {
  if (shouldSkipClaudeAiFetchForEnterpriseLockdown() || e.admits) return getClaudeCodeMcpConfigs({}, e);
  let claudeAiConfigs = fetchClaudeAiConfigsOnce();
  if (isGateOOn() && hasManagedMcpPolicy()) await claudeAiConfigs.catch(() => ({}));
  let { servers, pendingProjectServers, rejectedProjectServers, errors, warnings } =
    await getClaudeCodeMcpConfigs({}, e);
  let { allowed: claudeaiMcpServers } = filterMcpServersByPolicy((await claudeAiConfigs) ?? {});
  printClaudeAiConnectorNotice();
  let manualServers =
    e.includePendingProjectServers || e.includeRejectedProjectServers
      ? pickByHelper(servers, (Z, Se) => !pendingProjectServers.has(Se) && !rejectedProjectServers.has(Se))
      : servers;
  let { servers: servers_2 } = await dedupClaudeAiMcpServers(claudeaiMcpServers, manualServers);
  let merged = Object.assign(emptyServerMap(), servers_2, servers);
  for (let Z of [pendingProjectServers, rejectedProjectServers])
    for (let Se of Z)
      if (Object.hasOwn(servers_2, Se)) {
        merged[Se] = servers_2[Se];
        Z.delete(Se);
      }
  return {
    servers: merged,
    pendingProjectServers,
    rejectedProjectServers,
    errors,
    warnings,
  };
}
//@ chunk-e6aww6q8.js:3860830-3861065 facade-majority
/**
 * getPluginProvidedServerNames：当前配置中由插件提供的服务器名集合。
 */
async function getConnectablePluginMcpServerNames(
  e = {},
  storageV5,
  r = () => loadAllPluginsForPreview(storageV5),
  admits,
) {
  if (getStrictMcpConfig()) return new Set();
  let pluginLoadResult = await r();
  let { servers } = await getClaudeCodeMcpConfigs(e, {
    pluginLoadResult,
    storageV5,
    admits,
  });
  let S = new Set();
  for (let [key, value] of Object.entries(servers)) if (value.pluginSource !== undefined) S.add(key);
  return S;
}
//@ chunk-e6aww6q8.js:3861065-3861151 facade-majority
/**
 * 若本进程是 Remote Control 的 MCP carrier 子进程，把环境变量 `CLAUDE_CODE_BRIDGE_MCP_CARRIER` 写成标记值（消费 carrier 标记）。
 */
function consumeBridgeMcpCarrierMarker() {
  if (startupCcrEnv.isBridgeCarrierChild) env.set("CLAUDE_CODE_BRIDGE_MCP_CARRIER", SPENT);
}
//@ chunk-e6aww6q8.js:3861151-3861242 facade-majority
/**
 * 判断是否处于绑定了提示词的 bridge carrier（设置了 `CLAUDE_CODE_BRIDGE_PROMPT_SHA256` 或本身是 carrier 子进程）。
 */
function isBridgeCarrierPromptBound() {
  return env.CLAUDE_CODE_BRIDGE_PROMPT_SHA256 !== undefined || startupCcrEnv.isBridgeCarrierChild;
}
//@ chunk-e6aww6q8.js:3861242-3861577 facade-majority
/**
 * verifyBridgeAppendPromptFile：bridge carrier 子进程校验 --append-system-prompt-file 内容的 SHA-256 与守护进程写入的一致，否则丢弃。
 */
function verifyBridgeCarrierPrompt(file) {
  let n = isBridgeCarrierPromptBound();
  let CLAUDE_CODE_BRIDGE_PROMPT_SHA256 = env.CLAUDE_CODE_BRIDGE_PROMPT_SHA256;
  env.unset("CLAUDE_CODE_BRIDGE_PROMPT_SHA256");
  if (
    !n ||
    (CLAUDE_CODE_BRIDGE_PROMPT_SHA256 !== undefined &&
      createHash("sha256").update(file).digest("hex") === CLAUDE_CODE_BRIDGE_PROMPT_SHA256.toLowerCase())
  )
    return file.toString("utf8");
  logForDebugging(
    "[bridge:carrier] --append-system-prompt-file does not match the prompt the daemon wrote; dropped",
    {
      level: "error",
    },
  );
  return;
}
//@ chunk-e6aww6q8.js:3861577-3861593 layout
var MAX_MCP_CONFIG_FILE_BYTES = 2097152;
//@ chunk-e6aww6q8.js:3861593-3863797 facade-majority = parseMcpConfigFromFilePath (0.584)
/**
 * parseMcpConfigFromFilePath：读取并解析 MCP 配置文件（project/enterprise 限普通文件且 ≤2 MiB；dynamic 直接读），区分不存在、读失败、非 JSON、schema 错误，返回 {config, errors, present}。
 */
function parseMcpConfigFromFilePath(params) {
  let { filePath, expandVars, scope, bridgeSessionId } = params;
  let fs = getFsImplementation();
  let S = {
    scope: fromEnum(scope),
  };
  let configContent;
  try {
    let q =
      scope === "dynamic"
        ? fs.readFileSync(filePath, {
            encoding: "utf8",
          })
        : readSmallFileCheckedSync(fs, filePath, MAX_MCP_CONFIG_FILE_BYTES);
    if (q === null) {
      logForDebugging(
        `MCP config skipped for ${filePath} (scope=${scope}): not a regular file or exceeds ${MAX_MCP_CONFIG_FILE_BYTES} byte limit`,
        {
          level: "warn",
        },
      );
      logFeatureBad("mcp_config_parse", "mcp_config_shape_gate", S);
      return {
        config: null,
        errors: [
          {
            file: filePath,
            path: "",
            message: `MCP config is not a regular file or exceeds ${MAX_MCP_CONFIG_FILE_BYTES} bytes: ${filePath}`,
            suggestion: "Check that the path is a plain JSON file (not a device, FIFO, or symlink to one)",
            mcpErrorMetadata: {
              scope,
              severity: "fatal",
            },
          },
        ],
        present: true,
      };
    }
    configContent = q;
  } catch (error) {
    let code = getErrnoCode(error);
    if (code === "ENOENT" || code === "ENOTDIR")
      return {
        config: null,
        errors: [
          {
            file: filePath,
            path: "",
            message: `MCP config file not found: ${filePath}`,
            suggestion: "Check that the file path is correct",
            mcpErrorMetadata: {
              scope,
              severity: "fatal",
            },
          },
        ],
        present: false,
      };
    let syscall =
      typeof error === "object" && error !== null && "syscall" in error ? error.syscall : undefined;
    let ke =
      code === "EACCES" &&
      (syscall === "stat" || syscall === "statx" || syscall === "lstat") &&
      getPlatform() !== "windows";
    logForDebugging(
      `MCP config read error for ${filePath} (scope=${scope}): ${error}${ke ? " \u2014 a parent directory is not searchable; treating the config as not deployed" : ""}`,
      {
        level: "error",
      },
    );
    if (ke) logFeatureSad("mcp_config_parse", "mcp_config_ancestor_inaccessible", S);
    else logFeatureBad("mcp_config_parse", "mcp_config_read_failed", S);
    return {
      config: null,
      errors: [
        {
          file: filePath,
          path: "",
          message: `Failed to read file: ${error}`,
          suggestion: "Check file permissions and ensure the file exists",
          mcpErrorMetadata: {
            scope,
            severity: "fatal",
          },
        },
      ],
      present: !ke,
    };
  }
  if (scope === "project" && !configContent.trim()) {
    logForDebugging(`MCP config is blank, read as no servers: ${filePath}`);
    return {
      config: {
        mcpServers: {},
      },
      errors: [],
      present: true,
    };
  }
  let parsedJson = safeParseJSON(configContent, false);
  if (!parsedJson) {
    logForDebugging(
      `MCP config is not valid JSON: ${filePath} (scope=${scope}, length=${configContent.length}, first100=${jsonStringify(configContent.slice(0, 100))})`,
      {
        level: "error",
      },
    );
    logFeatureBad("mcp_config_parse", "mcp_config_invalid_json", S);
    return {
      config: null,
      errors: [
        {
          file: filePath,
          path: "",
          message: "MCP config is not a valid JSON",
          suggestion: "Fix the JSON syntax errors in the file",
          mcpErrorMetadata: {
            scope,
            severity: "fatal",
          },
        },
      ],
      present: true,
    };
  }
  let parsedJson_2 = parseMcpConfig({
    configObject: parsedJson,
    expandVars,
    scope,
    filePath,
    bridgeSessionId,
  });
  if (parsedJson_2.config === null) logFeatureBad("mcp_config_parse", "mcp_config_invalid_schema", S);
  else logFeatureOk("mcp_config_parse", S);
  return {
    ...parsedJson_2,
    present: true,
  };
}
//@ chunk-e6aww6q8.js:3863797-3863913 fingerprint = doesEnterpriseMcpConfigExist (0.88)
function doesEnterpriseMcpConfigExist_2(expandVars) {
  return isDiskless()
    ? {
        config: null,
        errors: [],
        present: false,
      }
    : parseMcpConfigFromFilePath({
        filePath: getEnterpriseMcpFilePath(),
        expandVars,
        scope: "enterprise",
      });
}
//@ chunk-e6aww6q8.js:3863913-3864425 layout
/**
 * EnterpriseMcpConfigState：managed-mcp.json 的加载缓存（每个宿主一份），提供 check/isHeld/fatalErrors/reset。
 */
class EnterpriseMcpConfigState {
  result = undefined;
  linkJudged = false;
  load() {
    if (this.result === undefined) {
      this.result = doesEnterpriseMcpConfigExist_2(true);
      if (this.result.present) this.judgeLink();
    }
    return this.result;
  }
  judgeLink() {
    if (this.linkJudged) return;
    this.linkJudged = true;
    commandSyncNameState().managedDocumentLinks.managedMcp = resolvePathStepsSync(
      getManagedFilePath(),
      ["managed-mcp.json"],
      undefined,
      new Map(),
      new Map(),
    );
  }
  isHeld(e = this.load().present) {
    return e && isManagedFolderWritable(getEnterpriseMcpFilePath());
  }
  check() {
    return this.load().present;
  }
  fatalErrors() {
    let { present, config, errors } = this.load();
    return present && config === null ? errors : [];
  }
  reset() {
    this.result = undefined;
    this.linkJudged = false;
  }
}
//@ chunk-e6aww6q8.js:3864425-3864452 layout
/**
 * 按宿主保存的企业 MCP 配置状态。
 */
var enterpriseMcpConfigState = new HostScoped(() => new EnterpriseMcpConfigState());
//@ chunk-e6aww6q8.js:3864452-3864487 facade-majority
/**
 * 判断企业 MCP 配置（managed-mcp.json）是否存在；存在即独占其他作用域。
 */
function doesEnterpriseMcpConfigExist() {
  return getEnterpriseMcpConfigState().check();
}
//@ chunk-e6aww6q8.js:3864487-3864524 facade-majority
/**
 * 判断企业 MCP 配置当前是否处于"暂扣"状态（尚在等待读取/判定）。
 */
function isEnterpriseMcpConfigHeld() {
  return getEnterpriseMcpConfigState().isHeld();
}
//@ chunk-e6aww6q8.js:3864524-3864638 facade-majority
/**
 * 在企业配置未暂扣时等待额外的配置读取，若读完后仍未暂扣则用新结果，否则回退到原 Promise；出错只记录。用于启动时等待 MCP 配置就绪。
 */
async function mcpConfigsAfterWaits(e, n, r) {
  try {
    if (n && !isEnterpriseMcpConfigHeld()) {
      let s = await r();
      if (!isEnterpriseMcpConfigHeld()) {
        e.catch(logError);
        return s;
      }
    }
  } catch (error) {
    logError(error);
  }
  return e;
}
//@ chunk-e6aww6q8.js:3864638-3864677 layout
function getEnterpriseMcpConfigState() {
  return enterpriseMcpConfigState.of(getRootSession().host);
}
//@ chunk-e6aww6q8.js:3864677-3865168 facade-majority
/**
 * getEnterpriseMcpConfigNotice：企业 MCP 配置被持有或无法解析时的说明文本，否则 null。
 */
function getUnusableEnterpriseMcpConfigMessage() {
  let enterpriseMcpConfigState = getEnterpriseMcpConfigState();
  if (enterpriseMcpConfigState.isHeld())
    return `${getEnterpriseMcpFilePath()} adds no MCP servers in this session, because the session takes its managed settings from your organization. MCP servers from other sources stay blocked. Servers the session's host provides still load.`;
  let n = enterpriseMcpConfigState.fatalErrors();
  if (n.length === 0) return null;
  let joined = n.map((s) => (s.path ? `${s.path}: ${s.message}` : s.message)).join("; ");
  return `Enterprise MCP config ${getEnterpriseMcpFilePath()} cannot be read or parsed (${joined}), so it keeps exclusive control: ${ENTERPRISE_EXCLUSIVE_HINT}`;
}
//@ chunk-e6aww6q8.js:3865168-3865266 facade-majority
/**
 * 企业 MCP 配置存在且没有任何策略来源允许 allowAllClaudeAiMcps 时，跳过拉取 claude.ai 连接器（企业锁定）。
 */
function shouldSkipClaudeAiFetchForEnterpriseLockdown() {
  if (!doesEnterpriseMcpConfigExist()) return false;
  if (getAllPolicyTierSettings().some((e) => e.allowAllClaudeAiMcps === true)) return false;
  return true;
}
//@ chunk-e6aww6q8.js:3865266-3865333 layout
/**
 * 托管 MCP 是否允许 Claude in Chrome。
 */
function chromeAllowedByManagedMcp() {
  return getMachineAdminPolicyTier()?.allowClaudeInChromeWithManagedMcp === true;
}
//@ chunk-e6aww6q8.js:3865333-3865527 facade-majority
/**
 * Claude in Chrome 被 managed-mcp.json 阻止时的提示文本。
 */
var CLAUDE_IN_CHROME_MANAGED_MCP_REFUSAL =
  "Claude in Chrome is blocked by your organization's managed MCP configuration (managed-mcp.json). An administrator can allow it with allowClaudeInChromeWithManagedMcp in device policy.";
//@ chunk-e6aww6q8.js:3865527-3865576 facade-majority
/**
 * 企业配置存在、可用、但组织没有为 Claude in Chrome 选择加入时，拒绝启用 Chrome 内置服务器。
 */
function isClaudeInChromeRefusedForManagedMcpOptIn() {
  return (
    doesEnterpriseMcpConfigExist() &&
    getUnusableEnterpriseMcpConfigMessage() === null &&
    !chromeAllowedByManagedMcp()
  );
}
//@ chunk-e6aww6q8.js:3865576-3865627 facade-majority
/**
 * 企业配置存在且（不可用或组织未选择加入）时，Claude in Chrome 被企业 MCP 配置阻止。
 */
function isClaudeInChromeBlockedByEnterpriseMcpConfig() {
  return (
    doesEnterpriseMcpConfigExist() &&
    (getUnusableEnterpriseMcpConfigMessage() !== null || !chromeAllowedByManagedMcp())
  );
}
//@ chunk-e6aww6q8.js:3865627-3865669 facade-majority
/**
 * 判断无头模式是否同步 claude.ai 连接器：非受限环境、未被企业锁定、且未禁用非必要流量。
 */
function headlessSyncsClaudeAiConnectors() {
  return !getStrictMcpConfig() && !shouldSkipClaudeAiFetchForEnterpriseLockdown() && !isBareMode();
}
//@ chunk-e6aww6q8.js:3865669-3865747 layout
setPromptBoundCarrier({
  headlessSyncsClaudeAiConnectors,
  isMcpServerBlockedAtConnectTime,
});
//@ chunk-e6aww6q8.js:3865747-3865780 layout
function isManagedMcpServersOnly() {
  return shouldAllowManagedMcpServersOnly(getMcpPolicyView());
}
//@ chunk-e6aww6q8.js:3865780-3865847 facade-majority
/**
 * 判断一组 MCP 配置是否全是 sdk 类型（用于企业配置存在时放行 SDK 传入的服务器）。
 */
function areMcpConfigsAllSdkType(configs) {
  return Object.values(configs).every((n) => n.type === "sdk");
}
//@ chunk-e6aww6q8.js:3865847-3865913 facade-majority
/**
 * 判断一组动态 MCP 配置在企业配置存在时是否全部允许（逐个调用单条判定）。
 */
function areMcpConfigsAllowedWithEnterpriseMcpConfig(e) {
  return Object.entries(e).every(([key, value]) => areMcpConfigsAllowedWithEnterpriseMcpConfig_2(key, value));
}
//@ chunk-e6aww6q8.js:3865913-3866005 fingerprint = areMcpConfigsAllowedWithEnterpriseMcpConfig (1)
function areMcpConfigsAllowedWithEnterpriseMcpConfig_2(e, n) {
  return (
    (n.type === "sdk" && n.name === "claude-vscode") ||
    isCcrInjectedConfig(n) ||
    (isChromeStdioServer(e, n) && !isClaudeInChromeBlockedByEnterpriseMcpConfig())
  );
}
//@ chunk-e6aww6q8.js:3866005-3866046 layout
/**
 * 判断是否是被管理的 Chrome stdio 服务器。
 */
function isChromeStdioServer(e, n) {
  return isClaudeInChromeMCPServer(e) && isReservedStdioServer(e, n);
}
//@ chunk-e6aww6q8.js:3866046-3866669 facade-majority
/**
 * filterDynamicConfigForEnterprise：企业 MCP 配置存在时，--strict-mcp-config 被拒绝；--mcp-config 中不允许的服务器整体拒绝或逐个丢弃。
 */
function gateDynamicMcpConfigForEnterpriseMcpConfig({ dynamicMcpConfig, strictMcpConfig }) {
  if (!doesEnterpriseMcpConfigExist())
    return {
      kind: "continue",
      servers: dynamicMcpConfig,
      dropped: [],
    };
  if (getUnusableEnterpriseMcpConfigMessage() === null) {
    if (strictMcpConfig)
      return {
        kind: "refuse",
        message: "You cannot use --strict-mcp-config when an enterprise MCP config is present",
      };
    let filtered = Object.entries(dynamicMcpConfig).filter(
      ([key, value]) => !areMcpConfigsAllowedWithEnterpriseMcpConfig_2(key, value),
    );
    if (filtered.length > 0)
      return {
        kind: "refuse",
        message: filtered.every(([y, S]) => isChromeStdioServer(y, S))
          ? CLAUDE_IN_CHROME_MANAGED_MCP_REFUSAL
          : "You cannot dynamically configure MCP servers when an enterprise MCP config is present",
      };
    return {
      kind: "continue",
      servers: dynamicMcpConfig,
      dropped: [],
    };
  }
  let r = emptyServerMap();
  let s = [];
  for (let [key, value] of Object.entries(dynamicMcpConfig))
    if (areMcpConfigsAllowedWithEnterpriseMcpConfig_2(key, value)) r[key] = value;
    else s.push(key);
  return {
    kind: "continue",
    servers: r,
    dropped: s,
  };
}
//@ chunk-e6aww6q8.js:3866669-3866707 layout
function isOptInBuiltinServer(name) {
  return name === COMPUTER_USE_MCP_SERVER_NAME && !isHostedDesktopSession();
}
//@ chunk-e6aww6q8.js:3866707-3866751 layout
function asArray(e) {
  return Array.isArray(e) ? e : [];
}
//@ chunk-e6aww6q8.js:3866751-3866874 facade-majority = isMcpServerDisabled (1)
/**
 * isMcpServerDisabled：项目配置 disabledMcpServers 包含该名字；默认关闭的内置服务器（computer-use）看 enabledMcpServers。
 */
function isMcpServerDisabled(name) {
  let projectConfig = getCurrentProjectConfig();
  if (isOptInBuiltinServer(name)) return !asArray(projectConfig.enabledMcpServers).includes(name);
  return asArray(projectConfig.disabledMcpServers).includes(name);
}
//@ chunk-e6aww6q8.js:3866874-3866924 facade-majority
/**
 * 读取设置中被关掉的 MCP 服务器名单 `disabledMcpServers`。
 */
function getSwitchedOffMcpServers() {
  return asArray(getCurrentProjectConfig().disabledMcpServers);
}
//@ chunk-e6aww6q8.js:3866924-3867072 facade-majority
/**
 * 把一批服务器名加入 `disabledMcpServers`（已全部在内则不写），写入指定设置源。
 */
function switchOffMcpServers(e, n) {
  saveCurrentProjectConfig((r) => {
    let s = asArray(r.disabledMcpServers);
    let h = new Set(s);
    return e.every((y) => h.has(y))
      ? r
      : {
          ...r,
          disabledMcpServers: uniq([...s, ...e]),
        };
  }, n);
}
//@ chunk-e6aww6q8.js:3867072-3867161 file-local
function toggleMembership(list, name, shouldContain) {
  if (list.includes(name) === shouldContain) return list;
  return shouldContain ? [...list, name] : list.filter((h) => h !== name);
}
//@ chunk-e6aww6q8.js:3867161-3867218 facade-majority
/**
 * 启用/禁用某个 MCP 服务器（委托给实际写设置的实现），并打点 `mcp_server_toggle`。
 */
function setMcpServerEnabled(name, enabled, storageV5) {
  setMcpServerEnabled_2(saveCurrentProjectConfig, name, enabled, storageV5);
  logFeatureOk("mcp_server_toggle");
}
//@ chunk-e6aww6q8.js:3867218-3867423 facade-majority
/**
 * setMcpServerEnabledVerified：写本地配置切换启用状态，写入无法确认时回滚。
 */
function setMcpServerEnabledDurably(name, enabled, storageV5) {
  let s = saveCurrentProjectConfigDurably;
  let h = isMcpServerDisabled(name);
  return setMcpServerEnabled_2(s, name, enabled, storageV5).then(async function (S) {
    if (S) {
      logFeatureOk("mcp_server_toggle");
      return true;
    }
    logFeatureBad("mcp_server_toggle", "mcp_config_write_unconfirmed");
    await setMcpServerEnabled_2(s, name, !h, storageV5);
    return false;
  });
}
//@ chunk-e6aww6q8.js:3867423-3867840 fingerprint = setMcpServerEnabled (1)
/**
 * setMcpServerEnabled：切换项目配置中的 enabledMcpServers/disabledMcpServers；内置服务器切换记录 tengu_builtin_mcp_toggle。
 */
function setMcpServerEnabled_2(e, name, enabled, s) {
  let isBuiltinStateChange = isOptInBuiltinServer(name) && isMcpServerDisabled(name) === enabled;
  let y = e((current) => {
    if (isOptInBuiltinServer(name)) {
      let enabledMcpServers = current.enabledMcpServers;
      let list = asArray(enabledMcpServers);
      let next = toggleMembership(list, name, enabled);
      if (next === list && (enabledMcpServers === undefined || Array.isArray(enabledMcpServers)))
        return current;
      return {
        ...current,
        enabledMcpServers: next,
      };
    }
    let disabledMcpServers = current.disabledMcpServers;
    let list = asArray(disabledMcpServers);
    let next = toggleMembership(list, name, !enabled);
    if (next === list && (disabledMcpServers === undefined || Array.isArray(disabledMcpServers)))
      return current;
    return {
      ...current,
      disabledMcpServers: next,
    };
  }, s);
  if (isBuiltinStateChange)
    logEvent("tengu_builtin_mcp_toggle", {
      serverName: mcpNameForAnalytics_GATE_EVALUATED(name, isOptInBuiltinServer(name)),
      enabled,
    });
  return y;
}
//@ chunk-e6aww6q8.js:3867840-3867900 shared-adjacent = doesEnterpriseMcpConfigExist (0.88)
deliveredReaderSlot.set(() =>
  doesEnterpriseMcpConfigExist()
    ? deliveredNamesOf(
        getMcpConfigsByScope_2("enterprise", {
          expandVars: false,
        }),
      )
    : [],
);
//@ chunk-e6aww6q8.js:3873177-3873356 fingerprint = expandEnvVars (0.913)
/**
 * supportsEnvExpansion：按 type 判断（stdio/sse/http/sdk 为 true）。
 */
function supportsEnvExpansion(config) {
  switch (config.type) {
    case undefined:
    case "stdio":
    case "sse":
    case "http":
    case "sdk":
      return true;
    case "ws":
    case "sse-ide":
    case "ws-ide":
    case "claudeai-proxy":
      return false;
    default:
      return false;
  }
}
//@ chunk-1wpnxx5r.js:3164-3514 fingerprint = CCR_PROXY_PATH_MARKERS (0.563)
/**
 * CCR 代理路径常量：/v2/ccr-sessions/、/v1/code/、session_ingress shttp/ws 路径与 MCP 路由正则。
 */
var CCR_SESSION_PATH_PREFIXES = ["/v2/ccr-sessions/", "/v1/code/"];
var CCR_PROXY_PATH_MARKERS = [
  "/v2/session_ingress/shttp/mcp/",
  "/v2/session_ingress/mcp/ws/",
  ...CCR_SESSION_PATH_PREFIXES,
];
var CCR_MCP_PATH_PATTERNS = [
  /^\/v2\/ccr-sessions\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\/mcp(?:\/[A-Za-z0-9_-]+)?$/,
  /^\/v1\/code\/sessions\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\/mcp(?:\/[A-Za-z0-9_-]+)?$/,
  /^\/v1\/code\/mcp\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)?$/,
];
var SPENT = "spent";
//@ chunk-1wpnxx5r.js:15428-15515 fingerprint = getServerUrl (1)
/**
 * 判断是否 CCR 托管的 MCP 配置：url 指向 CCR MCP 代理，或配置本身带 CCR 托管标记。
 */
function isCcrHostedConfig(config) {
  if ("url" in config && typeof config.url === "string" && isSameOriginAsCcr(config.url)) return true;
  return isCliOwnedConfig(config);
}
//@ chunk-1wpnxx5r.js:16374-16417 shared-adjacent = getServerUrl (1)
/**
 * 取服务器配置的 url（没有 url 字段的类型返回 null）。
 */
function getServerUrl(config) {
  return "url" in config ? config.url : null;
}
//@ chunk-1wpnxx5r.js:16417-16522 affinity = getServerCommandArray (1)
/**
 * 取 stdio 服务器的命令数组 [command, ...args]；非 stdio 返回 null。用于签名去重与策略匹配。
 */
function getServerCommandArray(config) {
  if (config.type !== undefined && config.type !== "stdio") return null;
  let stdioConfig = config;
  return [stdioConfig.command, ...(stdioConfig.args ?? [])];
}
//@ chunk-1wpnxx5r.js:16522-16647 fingerprint = unwrapCcrProxyUrl (1)
/**
 * 若 URL 是 CCR MCP 代理地址（含代理路径标记），取出查询参数 `mcp_url` 指向的原始服务器地址；否则或解析失败原样返回。用于签名去重。
 */
function unwrapCcrProxyUrl(url) {
  if (!CCR_PROXY_PATH_MARKERS.some((m) => url.includes(m))) return url;
  try {
    return new URL(url).searchParams.get("mcp_url") || url;
  } catch {
    return url;
  }
}
//@ chunk-2yv46yc2.js:340-381 placement
/**
 * 托管设置值的占位文案。
 */
var ORG_VALUE_PLACEHOLDER = "(value set by your organization)";
//@ chunk-2yv46yc2.js:381-500 placement = isInstallationRelevantToCurrentProject (0.769)
/**
 * managed 作用域的 MCP 服务器配置脱敏（URL 与 headers 打码）。名字配错且应归 MCP，见 lead 建议。
 */
function redactManagedMcpServerConfig(r, scope) {
  if (scope !== "managed") return r;
  return {
    ...r,
    url: urlPathOf(r.url) ?? ORG_VALUE_PLACEHOLDER,
    ...(r.headers && {
      headers: xr(r.headers, () => ORG_VALUE_PLACEHOLDER),
    }),
  };
}
//@ chunk-2yv46yc2.js:500-548 placement
/**
 * 把客户端状态转成快照时的状态映射（cached → pending）。
 */
function clientStatusForSnapshot(type) {
  return type === "cached" ? "pending" : type;
}
//@ chunk-2yv46yc2.js:548-1131 placement
/**
 * 把 MCP 客户端列表转成对外的状态快照（名字、状态、脱敏后的连接配置、作用域、来源、serverInfo、错误与认证错误码）。
 */
function mcpServerStatusSnapshots(clients) {
  return clients.map((client) => {
    let o;
    if (client.config.type === "sse" || client.config.type === "http")
      o = redactManagedMcpServerConfig(
        {
          type: client.config.type,
          url: client.config.url,
          headers: client.config.headers,
        },
        client.config.scope,
      );
    else if (client.config.type === "claudeai-proxy")
      o = {
        type: "claudeai-proxy",
        url: client.config.url,
        id: client.config.id,
      };
    else if (client.config.type === "stdio" || client.config.type === undefined)
      o = {
        type: "stdio",
        command: client.config.command,
        args: client.config.args,
      };
    return {
      name: client.name,
      status: clientStatusForSnapshot(client.type),
      config: o,
      scope: client.config.scope,
      source: mcpServerSource(client.name, client.config),
      serverInfo: isConnectedOrCached(client) ? client.serverInfo : undefined,
      error: client.type === "failed" ? client.error : undefined,
      error_code: mcpAuthErrorCode(client),
    };
  });
}
//@ chunk-dcmhvw5a.js:422731-422935 placement
/**
 * 与 MCP 策略相关的设置键（允许/拒绝列表、项目 MCP 启用、claude.ai 连接器开关、托管服务器）。
 */
var MCP_POLICY_SETTING_KEYS = [
  "allowManagedMcpServersOnly",
  "allowedMcpServers",
  "deniedMcpServers",
  "disabledMcpjsonServers",
  "enabledMcpjsonServers",
  "enableAllProjectMcpServers",
  "disableClaudeAiConnectors",
  "managedMcpServers",
];
//@ chunk-dcmhvw5a.js:422935-423061 fingerprint = shouldAllowManagedMcpServersOnly (0.416)
/**
 * shouldAllowManagedMcpServersOnly：策略槽或管理员层设置 allowManagedMcpServersOnly。
 */
function shouldAllowManagedMcpServersOnly({ slot, adminTiers }) {
  return (
    slot?.allowManagedMcpServersOnly === true ||
    adminTiers.some((adminTier) => adminTier.allowManagedMcpServersOnly === true)
  );
}
//@ chunk-0h4e7gnq.js:29912-30007 fingerprint = getServerCommandArray (1)
function getMcpTransportTelemetryLabel(config) {
  let n = config.type ?? "stdio";
  return typeof n === "string" && Object.hasOwn(MCP_TRANSPORTS_SUPPORTING_TOOLS, n) ? n : "other";
}
//@ chunk-18hwfzwa.js:1738045-1738247 placement = hasBlockingResult (0.495)
/**
 * 在已扣住的 MCP 配置之外，再把需要审批的项目 MCP 服务器移入 blocked。旧版名 hasBlockingResult 存疑，疑似 MCP 配置代码误归 hooks.ts。
 */
function filterUnapprovedMcpServers(h, browserExtensionAllowed) {
  let D = filterDynamicMcpServersByPolicy(h);
  if (browserExtensionAllowed || isLovelyUmbrellaOn()) return D;
  let L = {};
  let ee = [...D.blocked];
  for (let [key, value] of Object.entries(D.configs))
    if (dialsClaudeInChromeBridge(key, value)) ee.push(key);
    else L[key] = value;
  return {
    configs: L,
    blocked: ee,
    held: D.held,
  };
}
//@ chunk-3wek6r2k.js:59775-60150 file-local
function isPrivateNetworkHost(e) {
  if (!e.includes(".") && !e.includes(":")) return true;
  if (
    /^10\.\d+\.\d+\.\d+$/.test(e) ||
    /^192\.168\.\d+\.\d+$/.test(e) ||
    /^172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(e) ||
    /^169\.254\.\d+\.\d+$/.test(e) ||
    /^100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d+\.\d+$/.test(e) ||
    /^f[cd][0-9a-f]{2}:/.test(e) ||
    /^fe[89ab][0-9a-f]:/.test(e)
  )
    return true;
  return PRIVATE_DNS_SUFFIXES.some((o) => e.endsWith(o));
}
export {
  getMcpTransportTelemetryLabel,
  getMcpConfigByName,
  unaddableTransportReason,
  doesEnterpriseMcpConfigExist,
  isMemoryServerName,
  hasCliOwnedMemoryServer,
  filterMcpServersByPolicy,
  mcpDialBlockCause,
  isCcrHostedConfig,
  isMcpServerDisabled,
  filterDynamicMcpServersByPolicy,
  getClaudeCodeMcpConfigs,
  getMcpConfigsByScope,
  isMcpServerAllowedByPolicy,
  mcpServerStatusSnapshots,
  isWithdrawnBuiltinPluginServer,
  withdrawnBuiltinPluginServerError,
  isMcpServerBlockedAtConnectTime,
  isMcpDialBlockedByPolicy,
  getAllMcpConfigs,
  emptyServerMap,
  MCP_SETTINGS_SCOPE_SET,
  supportsEnvExpansion,
  isBuiltinInProcessMcpServer,
  reservedServerNameMessage,
  mergeUniqueServerRefs,
  refusedReservedNames,
  emptyString_2,
  filterUnapprovedMcpServers,
  dialsClaudeInChromeBridge,
  shouldSkipClaudeAiFetchForEnterpriseLockdown,
  dedupClaudeAiMcpServers,
  hasManagedMcpPolicy,
  setMcpServerEnabled,
  getEffectiveMcpPolicyKey,
  consumeBridgeMcpCarrierMarker,
  isBridgeCarrierPromptBound,
  verifyBridgeCarrierPrompt,
  getRepoMcpListsForAnalytics,
  parseMcpConfig,
  parseMcpConfigFromFilePath,
  areMcpConfigsAllSdkType,
  areMcpConfigsAllowedWithEnterpriseMcpConfig,
  ccrInjectedKeptDespiteAllowlist,
  ccrRepoToolsOnlyNote,
  getUnusableEnterpriseMcpConfigMessage,
  isMcpServerDenied,
  isClaudeInChromeBlockedByEnterpriseMcpConfig,
  gateDynamicMcpConfigForEnterpriseMcpConfig,
  headlessSyncsClaudeAiConnectors,
  isEnterpriseMcpConfigHeld,
  mcpConfigsAfterWaits,
  CCR_PROXY_PATH_MARKERS,
  CCR_SESSION_PATH_PREFIXES,
  CCR_MCP_PATH_PATTERNS,
  getEnterpriseMcpFilePath,
  getServerUrl,
  getServerCommandArray,
  unwrapCcrProxyUrl,
  MCP_SETTINGS_SCOPES,
  isPrivateNetworkHost,
  refuseReservedNamesForCarrier,
  addAgentModelOverrideNotice,
  getConnectablePluginMcpServerNames,
  addMcpConfig,
  shouldAllowManagedMcpServersOnly,
  getMcpScopeConflicts,
  getMcpServerSignature,
  isClaudeInChromeRefusedForManagedMcpOptIn,
  CLAUDE_IN_CHROME_MANAGED_MCP_REFUSAL,
  getSettingsMcpConfigByName,
  removeMcpConfig,
  readRawMcpJsonServersFromCwd,
  redactManagedMcpServerConfig,
  MCP_POLICY_SETTING_KEYS,
  isJudgedOnClaudeAiConnectorList,
  clientStatusForSnapshot,
  userScopeMcpServerExists,
  suppressedConnectorsEqual,
  expandMcpPolicyPredicates,
  switchOffMcpServers,
  getSwitchedOffMcpServers,
  setMcpServerEnabledDurably,
};
