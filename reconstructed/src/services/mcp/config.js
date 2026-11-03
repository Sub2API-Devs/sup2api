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
  parse,
  parse as parse_2,
  parse as parse_3,
  parse as parse_4,
  parse as parse_5,
  parse as parse_6,
  parse as parse_7,
  parse as parse_8,
  parse as parse_9,
  parse as parse_10,
  parse as parse_11,
  parse as parse_12,
  parse as parse_13,
  parse as parse_14,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  dirname as dirname_7,
  dirname as dirname_8,
  dirname as dirname_9,
  dirname as dirname_10,
  dirname as dirname_11,
  dirname as dirname_12,
  dirname as dirname_13,
  dirname as dirname_14,
  dirname as dirname_15,
  dirname as dirname_16,
  dirname as dirname_17,
  dirname as dirname_18,
  dirname as dirname_19,
  dirname as dirname_20,
  dirname as dirname_21,
  dirname as dirname_22,
  dirname as dirname_23,
  dirname as dirname_24,
  dirname as dirname_25,
  dirname as dirname_26,
  dirname as dirname_27,
  dirname as dirname_28,
  dirname as dirname_29,
  dirname as dirname_30,
  dirname as dirname_31,
  dirname as dirname_32,
  dirname as dirname_33,
  dirname as dirname_34,
  dirname as dirname_35,
  dirname as dirname_36,
  dirname as dirname_37,
  dirname as dirname_38,
  dirname as dirname_39,
  dirname as dirname_40,
  dirname as dirname_41,
  dirname as dirname_42,
  dirname as dirname_43,
  dirname as dirname_44,
  dirname as dirname_45,
  dirname as dirname_46,
  dirname as dirname_47,
  dirname as dirname_48,
  dirname as dirname_49,
  dirname as dirname_50,
  dirname as dirname_51,
  dirname as dirname_52,
  dirname as dirname_53,
  dirname as dirname_54,
  dirname as dirname_55,
  dirname as dirname_56,
  dirname as dirname_57,
  dirname as dirname_58,
  dirname as dirname_59,
  dirname as dirname_60,
  dirname as dirname_61,
  dirname as dirname_62,
  dirname as dirname_63,
  dirname as dirname_64,
  dirname as dirname_65,
  dirname as dirname_66,
  dirname as dirname_67,
  dirname as dirname_68,
  dirname as dirname_69,
  dirname as dirname_70,
  dirname as dirname_71,
  dirname as dirname_72,
  dirname as dirname_73,
  dirname as dirname_74,
  dirname as dirname_75,
  dirname as dirname_76,
  dirname as dirname_77,
} from "path";
import {
  randomBytes,
  randomBytes as randomBytes_2,
  randomBytes as randomBytes_3,
  randomBytes as randomBytes_4,
  randomBytes as randomBytes_5,
  randomBytes as randomBytes_6,
  randomBytes as randomBytes_7,
  randomBytes as randomBytes_8,
  randomBytes as randomBytes_9,
  randomBytes as randomBytes_10,
  randomBytes as randomBytes_11,
  randomBytes as randomBytes_12,
  randomBytes as randomBytes_13,
  randomBytes as randomBytes_14,
  createHash,
  createHash as createHash_2,
  createHash as createHash_3,
  createHash as createHash_4,
  createHash as createHash_5,
  createHash as createHash_6,
  createHash as createHash_7,
  createHash as createHash_8,
  createHash as createHash_9,
  createHash as createHash_10,
  createHash as createHash_11,
  createHash as createHash_12,
  createHash as createHash_13,
  createHash as createHash_14,
  createHash as createHash_15,
  createHash as createHash_16,
  createHash as createHash_17,
  createHash as createHash_18,
  createHash as createHash_19,
  createHash as createHash_20,
  createHash as createHash_21,
  createHash as createHash_22,
  createHash as createHash_23,
  createHash as createHash_24,
} from "crypto";
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
import { _Y } from "./normalization.js";
import { getPrefixServerKey } from "../../components/agents/ToolSelector.js";
import { Zl, registerCliOwnedConfig } from "./cliOwnedClients.js";
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
import { Kdt } from "../../utils/settings/policyHelper/helperRemote.js";
import { scrubbedEnvKeys, expandMcpCredentialEnvVars } from "../../utils/envExpansion.js";
import { uniq } from "../../utils/collections.js";
import { xr } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { Ove, _8e } from "./envExpansion.js";
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
import { u, pe, o, oe } from "../../../vendor/zod/v4/classic/schemas.js";
import { replaceControlChars } from "../../utils/resultError.js";
import { formatWithheldEnvNotice, AQ } from "../../utils/settings/managedSettingsFiles.js";
import { isPrototypeKey } from "../../schemas/hookEntryValidation.js";
import { env } from "../../utils/env.js";
import {
  isBuiltinMcpServerName,
  nas,
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
  O$e,
  lookupClaudeAiConnectorById,
  fetchClaudeAiConfigsOnce,
  printClaudeAiConnectorNotice,
} from "./claudeai.js";
import {
  getServerUrl as getServerUrl_3,
  copyCcrMarks,
  ccrConfigHosts,
  isCcrInjectedConfig,
  xgr,
  ias,
  OPt,
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
import { ge } from "../../utils/identity.js";
import { isPolicyAllowed as isPolicyAllowed_2 } from "../policyLimits/policyVerdicts.js";
import { hasComplianceTaint } from "../policyLimits/complianceTaints.js";
import { isConnectTimeMcpBlockEnabled, wki } from "../analytics/growthbookGates.js";
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
import { Do } from "../../utils/git/gitSafeEnv.js";
import { getPlatform } from "../../utils/platform.js";
import { is } from "../../utils/settings/commandSyncNames.js";
import { isManagedFolderWritable } from "../../plugins/functionHooks/sites/promptContextSites.js";
import { isBareMode } from "../../utils/envUtils.js";
import { deliveredReaderSlot, deliveredNamesOf } from "../../plugins/functionHooks/api/settingsRead.js";
import { mcpServerSource } from "./fileReference/fileReferencePolicy.js";
import { isConnectedOrCached } from "../../skills/bundled/scheduleRemoteAgents.js";
import { mcpAuthErrorCode } from "../../entrypoints/sdk/coreSchemas.js";
import { td } from "../tools/toolExecutionTelemetry.js";
import { PRIVATE_DNS_SUFFIXES } from "../../cli/cloudSession/validateCloudFlags.js";

/**
 * 判断 MCP 传输类型能否由用户配置添加：IDE/SDK 类型只由宿主提供，claude.ai 代理类型需开关开启。
 */
//@ chunk-e6aww6q8.js:2316830-2316945 placement
function unaddableTransportReason(e) {
  if (isIdeOrSdkType(e)) return "host-only";
  if (e === "claudeai-proxy" && !isGateOOn()) return "claudeai-connector";
  return null;
}
//@ chunk-e6aww6q8.js:3820777-3820790 placement
var G4r = null;
//@ chunk-e6aww6q8.js:3820790-3820812 placement
function xFn(e) {
  G4r = e;
}
//@ chunk-e6aww6q8.js:3820812-3820823 placement
var Aoe = MEMORY;
//@ chunk-e6aww6q8.js:3820823-3820862 placement
function zXn(e) {
  return _Y(getPrefixServerKey(e)) === Aoe;
}
//@ chunk-e6aww6q8.js:3820862-3820898 layout
function isBridgeCarrierDynamicConfig(e) {
  return Zl(e?.[Aoe]);
}
/**
 * refuseReservedNamesForCarrier：Remote Control carrier 会话中，保留名的非 carrier 服务器被拒绝加载，返回 {servers, refused}。
 */
//@ chunk-e6aww6q8.js:3820898-3821175 fingerprint = getAllMcpConfigs (0.507)
function refuseReservedNamesForCarrier(e, n) {
  if (!isBridgeCarrierDynamicConfig(n)) return { servers: e, refused: [] };
  let r = [],
    s;
  for (let [h, y] of Object.entries(e)) {
    if (Zl(y) || !zXn(h)) continue;
    ((s ??= Object.assign(Object.create(null), e)), delete s[h], r.push({ name: h, scope: y.scope }));
  }
  return s === void 0 ? { servers: e, refused: [] } : { servers: s, refused: r };
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
/**
 * 保留服务器名被拒加载时提示文案的生成函数，316 构建里直接返回空串（该提示被关闭）。
 */
//@ chunk-e6aww6q8.js:3821608-3821633 layout
function I3s(e) {
  return "";
}
//@ chunk-e6aww6q8.js:3821633-3821655 layout
var PFn = new HostScoped(() => []);
/**
 * 记录一次"保留服务器名被拒绝"事件到按宿主隔离的列表（同 scope+name 去重），供 useManageMCPConnections 汇总提示；代理 frontmatter 的 mcpServers 被拒时以 scope=agent 记录。
 */
//@ chunk-e6aww6q8.js:3821655-3821778 layout
function addAgentModelOverrideNotice(e, n = getRootSession().host) {
  let of = PFn.of(n);
  if (of.some((s) => s.scope === e.scope && s.name === e.name)) return !1;
  return (of.push(e), !0);
}
/**
 * 判断服务器列表中是否有名为内置 memory 服务器且为 CCR 托管配置的条目（代理初始化 MCP 时用于特判）。
 */
//@ chunk-e6aww6q8.js:3821778-3821841 layout
function M3s(e) {
  return e.some((n) => n.name === Aoe && Zl(n.config));
}
/**
 * 读取当前宿主记录的"保留服务器名被拒"列表。
 */
//@ chunk-e6aww6q8.js:3821841-3821883 layout
function D3s(e = getRootSession().host) {
  return PFn.of(e);
}
/**
 * 合并两组保留名拒绝记录，按 scope+name 去重保持先后顺序。
 */
//@ chunk-e6aww6q8.js:3821883-3822005 layout
function mergeUniqueServerRefs(e, n) {
  let r = [];
  for (let s of [...e, ...n]) if (!r.some((h) => h.scope === s.scope && h.name === s.name)) r.push(s);
  return r;
}
//@ chunk-e6aww6q8.js:3822005-3822068 layout
function MFn(e) {
  return e === void 0 ? "" : ` (local scope for ${e})`;
}
//@ chunk-e6aww6q8.js:3822068-3822452 layout
function mcpConfigWriteNotSavedError(name, filePath, operation, projectPath) {
  let h = operation === "add" ? `was not saved to ${filePath}` : `was not removed from ${filePath}`,
    y = operation === "add" ? "add the server again" : "remove the server again";
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `MCP server "${name}" ${h}${MFn(projectPath)}. If that file is read-only or protected by a sandbox, make it writable or run the command outside the sandbox, then ${y}.`,
    "MCP server config write did not reach the global config file",
  );
}
//@ chunk-e6aww6q8.js:3822452-3822943 layout
function mcpConfigWriteUnconfirmedError(e, n, r, s, h) {
  let y = r === "add" ? "saved" : "removed",
    S =
      r === "add" ? "add the server again if it is missing" : "remove the server again if it is still listed",
    w = s === void 0 ? "" : `from ${s} `,
    L = runCommandHint("mcp get", e, {
      tail: `${w}to check`,
      fallback: `run \`claude mcp list\` ${w}to check`,
    });
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `MCP server "${e}" may not have been ${y}${MFn(s)}: ${n} could not be read to confirm the change (${h}). ${capitalize(L)}, then ${S}.`,
    "MCP server config write to the global config file could not be confirmed",
  );
}
//@ chunk-e6aww6q8.js:3822943-3823011 layout
function getManagedMcpServersIfReadable() {
  if (isSdkEntrypoint() || getAllPolicyTierSettings().length === 0 || Kdt()) return;
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
      statusOnly: !0,
    },
  ];
}
//@ chunk-e6aww6q8.js:3823325-3823429 layout
function getPolicyManagedMcpServers() {
  let e = getSettingsForSource("policySettings")?.managedMcpServers;
  return e && Object.keys(e).length > 0 ? e : void 0;
}
/**
 * 生成"`<名字>` 是保留的 MCP 服务器名，未加载"的提示文案。
 */
//@ chunk-e6aww6q8.js:3823429-3823509 layout
function reservedServerNameMessage(e) {
  return `"${e}" is a reserved MCP server name and was not loaded`;
}
/**
 * expandServerConfigEnvVars：对 stdio 的 command/args/env 或远程的 url/headers 做 ${VAR} 展开，返回展开结果、缺失变量与 url 是否展开为空。
 */
//@ chunk-e6aww6q8.js:3823509-3823792 layout
function expandServerConfigEnvVars(e) {
  let n = [],
    r = !1,
    s;
  return {
    expanded: mapServerConfigStrings(e, (y, S, w) => {
      if (y.includes("${")) s ??= scrubbedEnvKeys();
      let L = expandMcpCredentialEnvVars(y, void 0, void 0, { remoteSink: w, blankList: s });
      if ((n.push(...L.missingVars), S === "url")) r = y.trim() !== "" && L.expanded.trim() === "";
      return L.expanded;
    }),
    missingVars: uniq(n),
    urlExpandedToEmpty: r,
  };
}
//@ chunk-e6aww6q8.js:3823792-3824192 layout
function mapServerConfigStrings(e, n) {
  switch (e.type) {
    case void 0:
    case "stdio": {
      let r = e;
      return {
        ...r,
        command: n(r.command, "command", !1),
        args: r.args.map((arg) => n(arg, "args", !1)),
        env: r.env ? xr(r.env, (s) => n(s, "env", !1)) : void 0,
      };
    }
    case "sse":
    case "http":
    case "ws": {
      let r = e;
      return {
        ...r,
        url: n(r.url, "url", !0),
        headers: r.headers ? xr(r.headers, (s) => n(s, "headers", !0)) : void 0,
      };
    }
    case "sse-ide":
    case "ws-ide":
    case "sdk":
    case "claudeai-proxy":
      return e;
  }
}
//@ chunk-e6aww6q8.js:3824192-3824256 layout
function cloneAsWrittenEntry(e) {
  try {
    return Ove(jsonStringify(e)) ? void 0 : clone(e);
  } catch {
    return;
  }
}
//@ chunk-e6aww6q8.js:3824256-3824330 layout
function configReferencesEnvVars(e) {
  let n = !1;
  return (mapServerConfigStrings(e, (r, s) => ((n ||= s !== "env" && Ove(r)), r)), n);
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
    for (let [s, h] of Object.entries(e.env)) {
      if (s !== s.trim()) n.push(`env name ${jsonStringify(s)}`);
      r(`env.${s}`, h);
    }
  if ("headers" in e && e.headers)
    for (let [s, h] of Object.entries(e.headers)) {
      if (s !== s.trim()) n.push(`header name ${jsonStringify(s)}`);
      r(`headers.${s}`, h);
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
/**
 * verifyBridgeCarrierEntry：Remote Control carrier 子进程只接受名为 claude-code-remote 的 http 条目，且 URL 必须是本会话 ingress 的 meta server 路由。
 */
//@ chunk-e6aww6q8.js:3825662-3826018 layout
function verifyBridgeCarrierEntry(name, config, sessionId) {
  if (name !== CLAUDE_CODE_REMOTE) return { drop: "bridge_carrier_foreign_entry" };
  if (config.type !== "http") return { drop: "bridge_carrier_not_http" };
  let s = originIfValid(startupCcrEnv.atStartup);
  if (!s) return { drop: "bridge_carrier_no_ingress_origin" };
  if (!sessionId) return { drop: "bridge_carrier_no_session_id" };
  let h = parseCcrSessionMcpUrl(config.url, s, sessionId);
  if (!h) return { drop: "bridge_carrier_url_mismatch" };
  return { url: h, sessionId: sessionId };
}
/**
 * parseMcpConfig：校验 {mcpServers} 对象并逐项处理：保留名、未知 type、sdk/claudeai-proxy 只能出现在 dynamic、zod 校验（url 缺 type 给专门提示）、bridge carrier 条目验证、${VAR} 展开（缺失变量、url 展开为空）、首尾空白警告、企业配置是否引用环境变量。返回 {config, errors, asWrittenEntries}。
 */
//@ chunk-e6aww6q8.js:3826018-3830489 callgraph-witnessed = parseMcpConfig (0.222)
function parseMcpConfig(params) {
  let {
      configObject: configObject,
      expandVars: expandVars,
      scope: scope,
      filePath: filePath,
      bridgeSessionId: bridgeSessionId,
    } = params,
    schemaResult = u({ mcpServers: pe(o(), oe()) }).safeParse(configObject);
  if (!schemaResult.success) {
    let ke =
      configObject !== null &&
      typeof configObject === "object" &&
      "servers" in configObject &&
      !("mcpServers" in configObject);
    return {
      config: null,
      errors: schemaResult.error.issues.map((issue) => ({
        ...(filePath && { file: filePath }),
        path: issue.path.join("."),
        message: ke
          ? 'Missing "mcpServers" \u2014 found "servers" instead. Claude Code reads MCP servers from the "mcpServers" key.'
          : issue.message,
        ...(ke && {
          suggestion: `Rename the top-level "servers" key to "mcpServers" in ${filePath ?? "your MCP config"}`,
        }),
        mcpErrorMetadata: { scope: scope, severity: "fatal" },
      })),
      asWrittenEntries: {},
    };
  }
  let errors = [],
    servers = {},
    asWrittenEntries = {};
  function pushServerError(ke, we, Ee, Ae) {
    errors.push({
      ...(filePath && { file: filePath }),
      path: `mcpServers.${ke}`,
      message: replaceControlChars(we),
      ...(Ee && { suggestion: replaceControlChars(Ee) }),
      mcpErrorMetadata: { scope: scope, serverName: ke, severity: "warning", ...(Ae && { skipReason: Ae }) },
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
  for (let ke of Object.keys(mcpServers).filter(isPrototypeKey))
    pushServerError(
      ke,
      reservedServerNameMessage(ke),
      "Rename this server in your MCP config \u2014 " + `"${ke}" cannot be used as a server name`,
      "reserved_name",
    );
  for (let [ke, we] of Object.entries(schemaResult.data.mcpServers)) {
    if (isPrototypeKey(ke)) continue;
    let Ee = we && typeof we === "object" && "type" in we && typeof we.type === "string" ? we.type : "stdio",
      Ae = Object.hasOwn(SERVER_CONFIG_SCHEMAS_BY_TYPE, Ee) ? SERVER_CONFIG_SCHEMAS_BY_TYPE[Ee] : void 0;
    if (!Ae) {
      pushServerError(
        ke,
        `Skipped \u2014 unknown MCP server type "${Ee}" for server "${ke}"`,
        `Valid types are: stdio, sse, http (or streamable-http), ws${scope === "dynamic" ? ", sdk" : ""}`,
        "unknown_type",
      );
      continue;
    }
    if (Ee === "sdk" && scope !== "dynamic") {
      pushServerError(
        ke,
        `Skipped \u2014 MCP server "${ke}" declares type "sdk", which only an SDK host application can register`,
        `Remove "${ke}" from your MCP config: in-process SDK servers are registered by the host application at startup, not read from configuration files`,
        "invalid_config",
      );
      continue;
    }
    if (scope !== "dynamic" && unaddableTransportReason(Ee) === "claudeai-connector") {
      pushServerError(
        ke,
        `Skipped \u2014 MCP server "${ke}" declares type "claudeai-proxy", which only claude.ai connectors use`,
        `Remove "${ke}" from your MCP config: connect the service at claude.ai/customize/connectors and it appears in Claude Code automatically, or add it here with type "http"`,
        "invalid_config",
      );
      continue;
    }
    let safeParse = Ae().safeParse(we);
    if (!safeParse.success) {
      if (we !== null && typeof we === "object" && !("type" in we) && "url" in we && !("command" in we)) {
        pushServerError(
          ke,
          `Skipped \u2014 MCP server "${ke}" has a "url" but no "type"; add "type": "http" (or "sse" / "ws") to this entry`,
          void 0,
          "url_missing_type",
        );
        continue;
      }
      let joined = safeParse.error.issues
        .map((issue) => {
          let replaced = issue.message.replace(/^Invalid input: /, "");
          return `${issue.path.join(".") || "(root)"}: ${replaced}`;
        })
        .join("; ");
      pushServerError(
        ke,
        `Skipped \u2014 invalid MCP server config for "${ke}": ${joined}`,
        void 0,
        "invalid_config",
      );
      continue;
    }
    let Me = safeParse.data;
    if (Me.type === "sdk") {
      let { tools: tools, connectorId: connectorId, ...Et } = Me;
      Me = Et;
    }
    if (scope === "dynamic" && startupCcrEnv.isBridgeCarrierChild) {
      let nt = verifyBridgeCarrierEntry(ke, Me, bridgeSessionId);
      if ("drop" in nt) {
        pushServerError(ke, `"${ke}" ${BRIDGE_CARRIER_DROP_MESSAGES[nt.drop]}`, void 0, nt.drop);
        continue;
      }
      servers[ke] = registerCliOwnedConfig(ccrMetaMcpServerConfig(nt.url, nt.sessionId));
      continue;
    }
    let We = scope === "dynamic" && (params.hostCarrier ?? env.CLAUDE_CODE_REMOTE),
      ze = expandVars
        ? isManagedConfigScope(scope)
          ? AQ(() => expandServerConfigEnvVars(Me))
          : expandServerConfigEnvVars(Me)
        : void 0;
    if (
      isBuiltinMcpServerName(ke, {
        hostCarrier: We,
        ...(params.hostCarrier && { hosted: !0 }),
        config: ze?.expanded ?? Me,
      }) &&
      Me.type !== "sdk"
    ) {
      if (We && BROWSER_SERVER_NAMES.has(ke)) {
        (pushMissingEnvVarsError(ke, ze?.missingVars ?? []),
          pushServerError(
            ke,
            `"${ke}" on a hosted session is reserved except as an http server on a loopback IP literal (e.g. http://127.0.0.1:PORT/mcp) and was not loaded`,
            `Point "${ke}" at the in-container listener over plain http by loopback IP literal, or rename this server`,
            "reserved_name",
          ));
        continue;
      }
      if (nas(ke) && claimOnce().claim("desktop_connector_name_refused"))
        logFeatureSad("mcp_desktop_connector_name", "name_refused");
      pushServerError(
        ke,
        reservedServerNameMessage(ke),
        `Rename this server in your MCP config \u2014 "${ke}" is reserved for internal use`,
        "reserved_name",
      );
      continue;
    }
    let lt = findWhitespacePaddedFields(Me);
    if (lt.length > 0)
      pushServerError(
        ke,
        `Leading or trailing whitespace in: ${lt.join(", ")}`,
        `Remove the whitespace from these values in the "${ke}" entry \u2014 they are used exactly as written`,
      );
    let configToCheck = Me;
    if (ze) {
      let { expanded: expanded, missingVars: missingVars, urlExpandedToEmpty: urlExpandedToEmpty } = ze;
      pushMissingEnvVarsError(ke, missingVars);
      let yt = "command" in Me && "command" in expanded ? stdioIdentityDiff(Me, expanded) : void 0;
      if (
        ((configToCheck = { ...expanded, ...(yt && { configuredCommand: yt }) }),
        urlExpandedToEmpty && "url" in Me)
      )
        configToCheck = {
          ...expanded,
          configError: `'url' ${jsonStringify(Me.url)} expanded to an empty string. Set the referenced environment variable, or update the server's config and reconnect.`,
          configErrorReason: "url_invalid",
        };
    }
    if (scope === "enterprise" && configReferencesEnvVars(Me))
      configToCheck = { ...configToCheck, expandedFromEnv: !0 };
    if (((servers[ke] = configToCheck), We))
      asWrittenEntries[ke] = "url" in configToCheck ? cloneAsWrittenEntry(we) : void 0;
  }
  return { config: { mcpServers: servers }, errors: errors, asWrittenEntries: asWrittenEntries };
}
//@ chunk-e6aww6q8.js:3830489-3830528 layout
var MCP_PROJECT_SERVERS_APPROVED = "mcp_project_servers_approved";
/**
 * logProjectServersApprovedOnce：每会话一次记录 tengu_mcp_project_servers_approved（按审批方式与传输计数）。
 */
//@ chunk-e6aww6q8.js:3830528-3831255 layout
function logProjectServersApprovedOnce(e, n, r) {
  let s = sessionHostKind();
  if (s === "none" || claimOnce().has(MCP_PROJECT_SERVERS_APPROVED)) return;
  let h = { settings: 0, bypass: 0, non_interactive: 0 },
    y = { stdio: 0, http: 0, sse: 0, ws: 0, other: 0 };
  for (let [w, L] of [...Object.entries(e), ...Object.entries(n)]) {
    let G = r(w);
    if (G.status === "approved") {
      h[G.by]++;
      let q = L.type ?? "stdio",
        Z = q === "stdio" || q === "http" || q === "sse" || q === "ws";
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
/**
 * 企业 MCP 配置文件路径：`<managed 设置目录>/managed-mcp.json`。
 */
//@ chunk-e6aww6q8.js:3831255-3831306 facade-majority = getEnterpriseMcpFilePath (1)
function getEnterpriseMcpFilePath() {
  return join_99(getManagedFilePath(), "managed-mcp.json");
}
//@ chunk-e6aww6q8.js:3831306-3831507 layout
var ENTERPRISE_EXCLUSIVE_HINT =
    "only your organization's managed MCP servers can load until it is fixed or removed and Claude Code is restarted",
  ENTERPRISE_EXCLUSIVE_MESSAGE = `This file keeps exclusive control of MCP servers while it exists: ${ENTERPRISE_EXCLUSIVE_HINT}`;
/**
 * 创建无原型的空对象（Object.create(null)）作为服务器名到配置的映射，避免原型链键名冲突。
 */
//@ chunk-e6aww6q8.js:3831507-3831548 facade-majority
function emptyServerMap() {
  return Object.create(null);
}
//@ chunk-e6aww6q8.js:3831548-3831685 layout
function addScopeToServers(e, n, r) {
  let s = emptyServerMap();
  if (e)
    for (let [h, y] of Object.entries(e))
      s[h] = r === void 0 ? { ...y, scope: n } : { ...y, scope: n, declaredIn: r };
  return s;
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
  let mcpJsonPath = join_99(getCwd(), ".mcp.json");
  await writeFileAtomic_2_2(mcpJsonPath, jsonStringify(config, null, 2), {
    encoding: "utf-8",
    mode: 420,
    stagingDir: join_99(getCwd(), ".claude", ATOMIC_WRITE_DIRNAME),
  });
}
//@ chunk-e6aww6q8.js:3832001-3832083 file-local
function commandArraysMatch(a, b) {
  if (a.length !== b.length) return !1;
  return a.every((val, idx) => val === b[idx]);
}
//@ chunk-e6aww6q8.js:3832083-3832184 layout
function expandEnvString(e, n, { remoteSink: r = !1 } = {}) {
  return expandMcpCredentialEnvVars(e, void 0, void 0, { remoteSink: r, blankList: n }).expanded;
}
//@ chunk-e6aww6q8.js:3832184-3832229 layout
function expandEnvInArray(e, n) {
  return e.map((r) => expandEnvString(r, n));
}
//@ chunk-e6aww6q8.js:3832229-3832269 layout
function getPolicyExpansionEnv() {
  return { ...getPreSettingsEnvSnapshot(), ...getAdminTierEnv() };
}
//@ chunk-e6aww6q8.js:3832269-3832371 file-local
function getAdminTierEnv() {
  let scopedServers = {};
  for (let n of getAllPolicyTierSettings())
    for (let [r, s] of Object.entries(filterEnvForPolicyPredicateMatch(n.env))) scopedServers[r] ??= s;
  return scopedServers;
}
//@ chunk-e6aww6q8.js:3832371-3832456 layout
function getPolicyMatchEnv() {
  if (!env.CLAUDE_CODE_EVAL_CONFINED && !isEvalPolicySnapshotOnly()) return getPolicyExpansionEnv();
  return { ...getAdminTierEnv() };
}
//@ chunk-e6aww6q8.js:3832456-3832714 layout
function getPolicyExpansionEnvs() {
  let e = {};
  return (
    Object.assign(
      e,
      filterEnvForPolicyPredicateMatch(getLegacyEnvMap(), "globalConfig"),
      isSettingSourceEnabled("userSettings")
        ? filterEnvForPolicyPredicateMatch(getSettingsForSource("userSettings")?.env, "userSettings")
        : {},
      filterEnvForPolicyPredicateMatch(getSettingsForSource("flagSettings")?.env, "flagSettings"),
      filterEnvForPolicyPredicateMatch(getSettingsForSource("policySettings")?.env, "policySettings"),
    ),
    { env: getPolicyExpansionEnv(), fallbackEnv: e }
  );
}
//@ chunk-e6aww6q8.js:3832714-3832992 layout
function expandPolicyCommandPart(e, n, r, s) {
  let {
    expanded: expanded,
    missingVars: missingVars,
    blankedVars: blankedVars,
  } = expandMcpCredentialEnvVars(e, n, s, { blankAsLive: !0, blankList: r });
  if (missingVars.length > 0)
    logForDebugging(
      `MCP policy predicate references environment variable(s) not present in the policy expansion env: ${missingVars.join(", ")}`,
    );
  return (warnBlankedCredentialVars(blankedVars), { expanded: expanded, missingVars: missingVars });
}
//@ chunk-e6aww6q8.js:3832992-3833227 layout
function warnBlankedCredentialVars(e) {
  if (e.length > 0)
    logForDebugging(
      `MCP policy predicate references credential variable(s) that are read as empty for matching: ${e.join(", ")} \u2014 an entry keyed on one cannot match a config that spells the value out`,
      { level: "warn" },
    );
}
//@ chunk-e6aww6q8.js:3833227-3833290 layout
var gj = `zzadminwc${randomBytes_9(8).toString("hex")}zz`,
  ZZENVSUBZZ = "zzenvsubzz";
//@ chunk-e6aww6q8.js:3833290-3833531 layout
function maskEnvValueForProbe(e) {
  let n = /\.+$/.exec(e)?.[0];
  if (n && e.length > n.length) return `${maskEnvValueForProbe(e.slice(0, -n.length))}${n}`;
  if (/^[0-9]+(\.[0-9]+)*$/.test(e)) return e.replace(/[0-9]+/g, "0");
  if (e.includes(":") && /^[0-9a-fA-F:.]+$/.test(e)) return "::";
  return ZZENVSUBZZ;
}
//@ chunk-e6aww6q8.js:3833531-3834362 layout
function classifyUrlVarPositions(e, n) {
  let r = [];
  for (let w of e.matchAll(new RegExp(_8e, "g"))) {
    let L = w[1];
    if (!r.includes(L) && Object.hasOwn(n, L) && typeof n[L] === "string") r.push(L);
  }
  let s = new Map(),
    h = (w, L) => {
      let G = `zzv${r.indexOf(w)}zz`,
        proxy = new Proxy(
          {},
          {
            get: (ke, we) => {
              if (typeof we !== "string") return;
              if (we === w) return G;
              if (!Object.hasOwn(n, we) || typeof n[we] !== "string") return;
              return L.has(we) ? String(n[we]) : maskEnvValueForProbe(String(n[we]));
            },
          },
        ),
        expanded = expandMcpCredentialEnvVars(e, proxy).expanded,
        Se = parseHostPattern(expanded, gj);
      if (Se === null) return "authority";
      if (Se.protocol.includes(G)) return "scheme";
      if (
        Se.username.includes(G) ||
        Se.password.includes(G) ||
        Se.hostname.includes(G) ||
        Se.port.includes(G)
      )
        return "authority";
      if (Se.pathname.includes(G) || Se.search.includes(G) || Se.hash.includes(G)) return "rest";
      return "scheme";
    },
    y = new Set(),
    S = new Set(r.filter((w) => h(w, y) === "scheme"));
  for (let w of r) s.set(w, S.has(w) ? "scheme" : h(w, S));
  return s;
}
//@ chunk-e6aww6q8.js:3834362-3834401 layout
var i6r = /[/@#?\\\s]/,
  a6r = /[:/@#?\\\s]/;
//@ chunk-e6aww6q8.js:3834401-3834544 layout
function hasUnsafeSchemeOrHostValue(e, n) {
  for (let [r, s] of e) {
    if (s === "rest") continue;
    let h = n[r];
    if (typeof h === "string" && (s === "scheme" ? a6r : i6r).test(h)) return !0;
  }
  return !1;
}
//@ chunk-e6aww6q8.js:3834544-3834585 layout
var n$n = /(^|\/)(\.|%2e)(\.|%2e)?(\/|$)/i;
//@ chunk-e6aww6q8.js:3834585-3834829 layout
function hasUnsafePathExpansion(e, n) {
  for (let r of e.matchAll(new RegExp(_8e, "g"))) {
    let s = n[r[1]];
    if (typeof s !== "string") continue;
    if (/[?#]/.test(s)) return !0;
    let replaced = s
      .replace(/[\t\n\r]/g, "")
      .replaceAll("\\", "/")
      .replace(/%2e/gi, ".");
    if (n$n.test(replaced)) return !0;
  }
  return !1;
}
//@ chunk-e6aww6q8.js:3834829-3835083 layout
function hasDotSegmentPath(e) {
  let n = 0,
    r = e.length;
  while (n < r && e.charCodeAt(n) <= 32) n++;
  while (r > n && e.charCodeAt(r - 1) <= 32) r--;
  let replaced = e
      .slice(n, r)
      .replace(/[\t\n\r]/g, "")
      .replaceAll("\\", "/")
      .replace(/%2e/gi, "."),
    search = replaced.search(/[?#]/),
    y = search === -1 ? replaced : replaced.slice(0, search);
  return n$n.test(y);
}
/**
 * expandPolicyUrlPattern：展开 allow/deny 策略里的 URL 模式（* 通配保留），检测值注入通配、改变 URL 结构、点段等"不安全展开"，对白名单失败关闭。
 */
//@ chunk-e6aww6q8.js:3835083-3837046 layout
function expandPolicyUrlPattern(pattern, env, blankList, fallbackEnv, { asConfigured: h = !1 } = {}) {
  let replaced = pattern.replace(/[\t\n\r]/g, ""),
    replaced_2 = replaced.replaceAll("*", gj),
    w = expandMcpCredentialEnvVars(replaced_2, env, fallbackEnv, {
      remoteSink: !h,
      blankAsLive: !h,
      blankList: blankList,
    });
  warnBlankedCredentialVars(w.blankedVars);
  let proxy = new Proxy(
      {},
      {
        get: (Me, We) =>
          typeof We === "string" && Object.hasOwn(env, We) ? maskEnvValueForProbe(String(env[We])) : void 0,
      },
    ),
    G = expandMcpCredentialEnvVars(replaced_2, proxy, void 0, {
      remoteSink: !h,
      blankAsLive: !h,
      blankList: blankList,
    }),
    q = parseHostPattern(w.expanded, gj),
    Z = parseHostPattern(G.expanded, gj),
    Se = q?.hostname ?? null,
    ke = Z?.hostname ?? null,
    we = G.expanded !== replaced_2,
    Ee = we ? classifyUrlVarPositions(replaced_2, env) : new Map(),
    Ae = replaced.includes("$") && hasDotSegmentPath(w.expanded),
    Ie =
      w.wildcardVars.length > 0 ||
      (we && hasUnsafeSchemeOrHostValue(Ee, env)) ||
      (Se === null) !== (ke === null) ||
      (we && Se === null) ||
      (q !== null &&
        ((q.hash !== "" && (Z?.hash ?? "") === "") || (q.search !== "" && (Z?.search ?? "") === ""))) ||
      (we && hasUnsafePathExpansion(replaced_2, env)) ||
      Ae ||
      (Se !== null &&
        ((Se.includes("*") && !(ke ?? "").includes("*")) ||
          (Se.endsWith(".") && !(ke ?? "").endsWith(".")) ||
          (Se.includes(gj) && !(ke ?? "").includes(gj))));
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
                (ze) => pattern.includes("${" + ze + "}") || pattern.includes("${" + ze + ":"),
              ),
              ...w.missingVars,
            ],
      matches = new RegExp(_8e).test(replaced);
    logForDebugging(
      `MCP policy URL predicate expansion was unsafe \u2014 ${w.wildcardVars.length > 0 ? "a value injected wildcard semantics" : Ae ? `the expanded entry's path carries a dot segment ('..' or '.') that URL parsing would collapse \u2014 remove dot segments from the pattern${matches ? ", or set the referenced variable(s)" : " (the pattern's '$' text is not a ${NAME} reference, so environment values cannot affect it)"}` : "a value restructured the URL, or the expansion is unparseable as a URL (e.g. a whole-URL ${VAR}: rewrite as https://${HOST}/path \u2014 hostname-position variables are fully supported)"} (variables: ${Me.join(", ") || "unknown"}) \u2014 allowlist URL entries using it fail closed; denylist entries are unaffected`,
    );
  }
  return { expanded: w.expanded.replaceAll(gj, "*"), unsafeExpansion: Ie, missingVars: w.missingVars };
}
//@ chunk-e6aww6q8.js:3837046-3837067 layout
var SIGNATURE_IGNORED_ENV = new Set(PLUGIN_ENV_VAR_NAMES);
/**
 * getMcpServerSignature：服务器去重签名：stdio 为 stdio:JSON(命令数组)[:JSON(排序后 env)]，远程为 url:规范化 URL（CCR 代理取 mcp_url）。
 */
//@ chunk-e6aww6q8.js:3837067-3837449 facade-majority = getMcpServerSignature (0.578)
function getMcpServerSignature(config, options) {
  if ("configError" in config && config.configError) return null;
  let cmd = getServerCommandArray(config);
  if (cmd) {
    if (options?.includeEnv === !1) return `stdio:${jsonStringify(cmd)}`;
    let sorted = Object.entries(config.env ?? {})
        .filter(([w]) => !SIGNATURE_IGNORED_ENV.has(w))
        .sort(([w], [L]) => (w < L ? -1 : w > L ? 1 : 0)),
      S = sorted.length > 0 ? `:${jsonStringify(Object.fromEntries(sorted))}` : "";
    return `stdio:${jsonStringify(cmd)}${S}`;
  }
  let url = getServerUrl_2(config);
  if (url) {
    let h = unwrapCcrProxyUrl(url);
    return options?.exactUrl ? `url:${h}` : `url:${normalizeMcpServerUrl(h)}`;
  }
  return null;
}
/**
 * dedupPluginMcpServers：插件服务器与手工配置签名相同（不含 env）或与更早插件服务器重复时压制，返回 {servers, suppressed}。
 */
//@ chunk-e6aww6q8.js:3837449-3838062 fingerprint = dedupPluginMcpServers (0.942)
function dedupPluginMcpServers(pluginServers, manualServers) {
  let manualSigs = new Map();
  for (let [S, w] of Object.entries(manualServers)) {
    let L = getMcpServerSignature(w, { includeEnv: !1 });
    if (L && !manualSigs.has(L)) manualSigs.set(L, S);
  }
  let servers = {},
    suppressed = [],
    seenPluginSigs = new Map();
  for (let [S, w] of Object.entries(pluginServers)) {
    let sig = getMcpServerSignature(w);
    if (sig === null) {
      servers[S] = w;
      continue;
    }
    let G = getMcpServerSignature(w, { includeEnv: !1 }),
      q = G !== null ? manualSigs.get(G) : void 0;
    if (q !== void 0) {
      (logForDebugging(`Suppressing plugin MCP server "${S}": duplicates manually-configured "${q}"`),
        suppressed.push({ name: S, duplicateOf: q }));
      continue;
    }
    let manualDup = seenPluginSigs.get(sig);
    if (manualDup !== void 0) {
      (logForDebugging(
        `Suppressing plugin MCP server "${S}": duplicates earlier plugin server "${manualDup}"`,
      ),
        suppressed.push({ name: S, duplicateOf: manualDup }));
      continue;
    }
    (seenPluginSigs.set(sig, S), (servers[S] = w));
  }
  return { servers: servers, suppressed: suppressed };
}
//@ chunk-e6aww6q8.js:3838062-3838136 layout
function S6r(e) {
  return describeEndpointOrigin({ authoredUnexpanded: e, expanded: e, cliOwned: !1 });
}
/**
 * findMultiScopeEndpointConflicts：同名服务器在多个作用域端点不同时生成警告（OAuth 令牌按端点存，不会通用）。
 */
//@ chunk-e6aww6q8.js:3838136-3839118 facade-majority
function getMcpScopeConflicts(scopeEntries) {
  let n = new Map();
  for (let { scope: scope, servers: servers, displayServers: displayServers } of scopeEntries)
    for (let [S, w] of Object.entries(servers)) {
      let L = getMcpServerSignature(w, { includeEnv: !1, exactUrl: !0 });
      if (!L) continue;
      let G = n.get(S);
      if (!G) n.set(S, (G = []));
      let q = displayServers[S];
      G.push({ scope: scope, sig: L, endpoint: q ? S6r(q) : mcpTransportType(w) });
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
      mcpErrorMetadata: { scope: h[0].scope, serverName: s, severity: "warning" },
    });
  }
  return r;
}
/**
 * suppressedListsEqual：比较两次去重压制列表是否相同。
 */
//@ chunk-e6aww6q8.js:3839118-3839280 facade-majority
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
/**
 * dedupClaudeAiMcpServers：claude.ai 连接器与已启用的手工配置签名相同时压制。
 */
//@ chunk-e6aww6q8.js:3839280-3839853 facade-majority = dedupClaudeAiMcpServers (0.747)
async function dedupClaudeAiMcpServers(claudeAiServers, manualServers) {
  let r = await readMcpOAuthStore(),
    manualSigs = new Map();
  for (let [S, w] of Object.entries(manualServers)) {
    if (isMcpServerDisabled(S)) continue;
    if (
      (w.type === "sse" || w.type === "http") &&
      (needsClientRegistration(S, { ...w, redialToRelearnRegistration: void 0 }, r) ||
        hasExpiredAccessTokenOnly(S, w, r))
    )
      continue;
    let sig = getMcpServerSignature(w);
    if (sig && !manualSigs.has(sig)) manualSigs.set(sig, { name: S, scope: w.scope });
  }
  let servers = {},
    suppressed = [];
  for (let [S, w] of Object.entries(claudeAiServers)) {
    let sig = getMcpServerSignature(w),
      manualDup = sig !== null ? manualSigs.get(sig) : void 0;
    if (manualDup !== void 0) {
      (logForDebugging(
        `Suppressing claude.ai connector "${S}": duplicates manually-configured "${manualDup.name}"`,
      ),
        suppressed.push({ name: S, duplicateOf: manualDup.name, duplicateOfScope: manualDup.scope }));
      continue;
    }
    servers[S] = w;
  }
  return { servers: servers, suppressed: suppressed };
}
//@ chunk-e6aww6q8.js:3839853-3839926 fingerprint = isMcpServerAllowedByPolicy (0.426)
function getMcpAllowlistPolicy() {
  if (isManagedMcpServersOnly())
    return { allowedMcpServers: getAllowedMcpServersFromTiers(getMcpPolicyView()) };
  return getInitialSettings_2();
}
//@ chunk-e6aww6q8.js:3839926-3840169 layout
function getMcpDenylistPolicy() {
  let deniedMcpServers = getInitialSettings_2().deniedMcpServers,
    flattened = getDurablePolicyTierSettings().flatMap((h) => h.deniedMcpServers ?? []);
  if (deniedMcpServers === void 0 && flattened.length === 0) return {};
  let r = new Set(),
    s = [];
  for (let h of [...(deniedMcpServers ?? []), ...flattened]) {
    let y = jsonStringify(h);
    if (!r.has(y)) (r.add(y), s.push(h));
  }
  return { deniedMcpServers: s };
}
/**
 * 计算当前生效的 MCP 组织策略指纹（只用管理员服务器、allow/deny 名单、受控标志、managedMcpServers 序列化），用于判断策略是否变化以失效缓存。
 */
//@ chunk-e6aww6q8.js:3840169-3840313 facade-majority
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
  let n = getPolicyPredicateTelemetryEmitted();
  if (n.has(e)) return;
  if ((n.add(e), e === "ok")) logFeatureOk("mcp_policy_predicate");
  else logFeatureSad("mcp_policy_predicate", e);
}
//@ chunk-e6aww6q8.js:3840440-3840518 layout
function recordPolicyExpansionIssues(e, n) {
  if (e) recordPolicyPredicateOutcome("missing_policy_var");
  if (n) recordPolicyPredicateOutcome("unsafe_expansion");
}
/**
 * expandMcpPolicyForDisplay：把 allow/deny 策略中的 ${VAR} 用屏蔽后的环境值展开，用于展示与比较。
 */
//@ chunk-e6aww6q8.js:3840518-3841609 facade-majority
function expandMcpPolicyPredicates(e) {
  if (!e.deniedMcpServers && !e.allowedMcpServers) return e;
  let n = new Set(flattened_3.map((q) => q.toUpperCase())),
    r = (q, Z) => isSecretEnvName(q) || n.has(q.toUpperCase()) || (Z !== void 0 && containsCredential(Z)),
    s = (q, Z) => {
      if (isSecretEnvName(q) || n.has(q.toUpperCase())) return "*";
      let Se = sanitizeIndexUrlEnv(q, Z).value;
      if (Se === HTTP_INDEX_INVALID) return "*";
      return !Z.endsWith("/") && Se.endsWith("/") ? Se.slice(0, -1) : Se;
    },
    h = { ...getPolicyExpansionEnv() },
    y = { ...h },
    S = scrubbedEnvKeys();
  for (let [q, Z] of Object.entries(h))
    if (r(q, Z))
      if ((delete h[q], Z === void 0)) delete y[q];
      else y[q] = s(q, Z);
  let w = { ...getPolicyExpansionEnvs().fallbackEnv },
    L = { ...w };
  for (let [q, Z] of Object.entries(w))
    if (r(q, Z))
      if ((delete L[q], Z === void 0)) delete w[q];
      else w[q] = s(q, Z);
  let G = (q, Z) => {
    let Se = Z === "deny" ? w : void 0,
      ke = Z === "deny" ? y : h;
    if (isMcpServerUrlEntry(q)) {
      let we = expandPolicyUrlPattern(q.serverUrl, ke, S, Se, { asConfigured: Z === "deny" });
      return Z === "allow" && we.unsafeExpansion ? q : { ...q, serverUrl: we.expanded };
    }
    if (isMcpServerCommandEntry(q))
      return {
        ...q,
        serverCommand: q.serverCommand.map(
          (we) => expandPolicyCommandPart(we, h, S, Z === "deny" ? L : void 0).expanded,
        ),
      };
    return q;
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
  let { MCP_PROXY_URL: MCP_PROXY_URL, MCP_PROXY_PATH: MCP_PROXY_PATH } = getOauthConfig();
  return `${MCP_PROXY_URL}${MCP_PROXY_PATH.replace("{server_id}", O$e(e.id))}`;
}
//@ chunk-e6aww6q8.js:3841744-3841814 layout
function isNonClaudeAiScopedProxyConfig(e) {
  return e.type === "claudeai-proxy" && e.scope !== "claudeai";
}
/**
 * 判断是否存在 MCP 组织策略：deny 名单非空或配置了 allow 名单。
 */
//@ chunk-e6aww6q8.js:3841814-3841907 facade-majority
function hasManagedMcpPolicy() {
  return (
    (getMcpDenylistPolicy().deniedMcpServers?.length ?? 0) > 0 ||
    getMcpAllowlistPolicy().allowedMcpServers !== void 0
  );
}
//@ chunk-e6aww6q8.js:3841907-3842069 layout
function admitClaudeAiConnectorByPolicy(e) {
  if (!hasManagedMcpPolicy()) return "admit";
  let n = lookupClaudeAiConnectorById(e.id);
  if (n.kind === "found") return isMcpServerDenied(n.name, n.config) ? "refuse" : "admit";
  return n.kind === "pending" ? "hold" : "refuse";
}
/**
 * 判断一个非 claude.ai 作用域的代理配置是否要按 claude.ai 连接器列表来裁决：能解析出 claude.ai 代理 URL、非受控环境且存在组织策略。
 */
//@ chunk-e6aww6q8.js:3842069-3842128 facade-majority
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
  let n = getClaudeAiProxyUrl(e);
  if (n === null) return [];
  let r = O$e(e.id),
    s = r.startsWith("mcpsrv") ? `mcprs${r.slice(6)}` : r,
    { MCP_PROXY_URL: MCP_PROXY_URL, MCP_PROXY_PATH: MCP_PROXY_PATH } = getOauthConfig(),
    S = `${MCP_PROXY_URL}${MCP_PROXY_PATH.replace("{server_id}", s)}`;
  return S === n ? [n] : [n, S];
}
//@ chunk-e6aww6q8.js:3842343-3842486 layout
function claudeAiProxyUrlVariantsWithSiblings(e) {
  let n = new Set(getClaudeAiProxyUrlVariants(e)),
    r = lookupClaudeAiConnectorById(e.id);
  if (r.kind === "found")
    for (let siblingId of r.siblingIds)
      for (let h of getClaudeAiProxyUrlVariants({ id: siblingId })) n.add(h);
  return [...n];
}
//@ chunk-e6aww6q8.js:3842486-3842539 layout
function w6r(e) {
  if (isNonClaudeAiScopedProxyConfig(e)) return getClaudeAiProxyUrl(e);
  return getServerUrl_2(e);
}
/**
 * 判断服务器是否被 deny 名单拒绝：本名命中，或其配置的任一别名（如代理 URL 的另一形式）命中都算。
 */
//@ chunk-e6aww6q8.js:3842539-3842619 facade-majority
function isMcpServerDenied(e, n) {
  return (
    isMcpServerDenied_2(e, n) ||
    (n !== void 0 && getServerUrl_3(n).some((r) => isMcpServerDenied_2(e, copyCcrMarks(n, r))))
  );
}
/**
 * isMcpServerDenied：deniedMcpServers 中 name、command（逐段展开后比较）或 url 模式（含 claude.ai 代理 URL 与兄弟 ID）任一命中即拒绝。
 */
//@ chunk-e6aww6q8.js:3842619-3843520 fingerprint = isMcpServerDenied (0.562)
function isMcpServerDenied_2(serverName, config) {
  let settings = getMcpDenylistPolicy();
  if (!settings.deniedMcpServers) return !1;
  for (let entry of settings.deniedMcpServers)
    if (isMcpServerNameEntry(entry) && entry.serverName === serverName) return !0;
  if (
    config !== void 0 &&
    isClaudeInChromeMCPServer(serverName) &&
    isClaudeAiProxyServer(config) &&
    isMcpServerDenied(serverName, getClaudeInChromeStdioServerConfig())
  )
    return !0;
  if (config !== void 0 && isNonClaudeAiScopedProxyConfig(config)) {
    let serverCommand = lookupClaudeAiConnectorById(config.id);
    if (serverCommand.kind === "found" && isMcpServerDenied(serverCommand.name, serverCommand.config))
      return !0;
  }
  if (config) {
    let { env: env, fallbackEnv: fallbackEnv } = getPolicyExpansionEnvs(),
      y = scrubbedEnvKeys(),
      S = getServerCommandArray(config);
    if (S) {
      let G = expandEnvInArray(S, y),
        q = isManagedPluginScope(config)
          ? [G, runWithPluginWriteScope(config, () => expandEnvInArray(S, y))]
          : [G];
      for (let entry of settings.deniedMcpServers) {
        if (!isMcpServerCommandEntry(entry)) continue;
        let mapped = entry.serverCommand.map(
          (ke) => expandPolicyCommandPart(ke, env, y, fallbackEnv).expanded,
        );
        if (q.some((ke) => commandArraysMatch(mapped, ke))) return !0;
      }
    }
    let serverUrl = getServerUrl_2(config),
      L = isNonClaudeAiScopedProxyConfig(config)
        ? claudeAiProxyUrlVariantsWithSiblings(config)
        : ccrConfigHosts(config);
    if (serverUrl || L.length > 0) {
      let G = [
        ...(serverUrl
          ? [
              expandEnvString(serverUrl, y, { remoteSink: !0 }),
              expandEnvString(serverUrl, y),
              ...(isManagedPluginScope(config)
                ? runWithPluginWriteScope(config, () => [
                    expandEnvString(serverUrl, y, { remoteSink: !0 }),
                    expandEnvString(serverUrl, y),
                  ])
                : []),
            ]
          : []),
        ...L.filter((q) => q !== serverUrl),
      ];
      for (let entry of settings.deniedMcpServers) {
        if (!isMcpServerUrlEntry(entry)) continue;
        let mapped = [!1, !0].map(
          (Se) => expandPolicyUrlPattern(entry.serverUrl, env, y, fallbackEnv, { asConfigured: Se }).expanded,
        );
        if (G.some((Se) => mapped.some((ke) => buildHostPatternRegex(Se, ke)))) return !0;
      }
    }
  }
  return !1;
}
//@ chunk-e6aww6q8.js:3843520-3843728 layout
function isDesktopEntryRegisteredByCli(e, n) {
  if (!isHostedDesktopSession() || !isDesktopComputerUseCommand(n) || Zl(n)) return !1;
  return (
    logForDebugging(
      `MCP server "${e}" starts this session's desktop and was not connected: Claude Code registers the desktop itself, as "${COMPUTER_USE_MCP_SERVER_NAME}".`,
      { level: "warn" },
    ),
    !0
  );
}
/**
 * isMcpServerAllowedByPolicy：组织策略判定：被拒绝（deniedMcpServers 的 name/command/url 条目）→ 否；managed/enterprise 作用域直接允许；有 allowedMcpServers 时按 command 或 url 条目（含 ${VAR} 安全展开）或 name 匹配。
 */
//@ chunk-e6aww6q8.js:3843728-3845175 facade-majority
function isMcpServerAllowedByPolicy(serverName, config) {
  if (config !== void 0 && toScopedConfig_2(config)) return !1;
  if (config !== void 0 && isDesktopEntryRegisteredByCli(serverName, config)) return !1;
  if (config !== void 0 && config.type === "claudeai-proxy") {
    if (getClaudeAiProxyUrl(config) === null) return !1;
    if (isNonClaudeAiScopedProxyConfig(config) && admitClaudeAiConnectorByPolicy(config) !== "admit")
      return !1;
  }
  if (isMcpServerDenied(serverName, config)) return !1;
  if (
    config?.scope !== void 0 &&
    isManagedConfigScope(config.scope) &&
    !config.expandedFromEnv &&
    !config.pluginSource
  )
    return !0;
  let r = getMcpAllowlistPolicy();
  if (!r.allowedMcpServers) return !0;
  if (isCcrInjectedConfig(config) || xgr(config)) return !0;
  if (r.allowedMcpServers.length === 0) return !1;
  let any = r.allowedMcpServers.some(isMcpServerCommandEntry),
    any_2 = r.allowedMcpServers.some(isMcpServerUrlEntry);
  if (config) {
    let y = getPolicyMatchEnv(),
      S = getServerCommandArray(config),
      w = w6r(config);
    if (S)
      if (any) {
        let L = scrubbedEnvKeys(),
          G = runWithPluginWriteScope(config, () => expandEnvInArray(S, L)),
          q = !1;
        for (let allowedMcpServer of r.allowedMcpServers)
          if (isMcpServerCommandEntry(allowedMcpServer)) {
            let mapped = allowedMcpServer.serverCommand.map((ke) => {
              let we = expandPolicyCommandPart(ke, y, L);
              return ((q ||= we.missingVars.length > 0), we.expanded);
            });
            if (commandArraysMatch(mapped, G)) return (recordPolicyPredicateOutcome("ok"), !0);
          }
        return (recordPolicyExpansionIssues(q, !1), !1);
      } else {
        for (let allowedMcpServer of r.allowedMcpServers)
          if (isMcpServerNameEntry(allowedMcpServer) && allowedMcpServer.serverName === serverName) return !0;
        return !1;
      }
    else if (w)
      if (any_2) {
        let L = scrubbedEnvKeys(),
          G = runWithPluginWriteScope(config, () => expandEnvString(w, L, { remoteSink: !0 })),
          q = !1,
          Z = !1;
        for (let allowedMcpServer of r.allowedMcpServers) {
          if (!isMcpServerUrlEntry(allowedMcpServer)) continue;
          let {
            expanded: expanded,
            unsafeExpansion: unsafeExpansion,
            missingVars: missingVars,
          } = expandPolicyUrlPattern(allowedMcpServer.serverUrl, y, L);
          if (((q ||= missingVars.length > 0), (Z ||= unsafeExpansion), unsafeExpansion)) continue;
          if (buildHostPatternRegex(G, expanded)) return (recordPolicyPredicateOutcome("ok"), !0);
        }
        return (recordPolicyExpansionIssues(q, Z), !1);
      } else {
        let L = serverName;
        if (isNonClaudeAiScopedProxyConfig(config)) {
          let G = lookupClaudeAiConnectorById(config.id);
          if (G.kind !== "found") return !1;
          L = G.name;
        }
        for (let allowedMcpServer of r.allowedMcpServers)
          if (isMcpServerNameEntry(allowedMcpServer) && allowedMcpServer.serverName === L) return !0;
        return !1;
      }
    else {
      for (let allowedMcpServer of r.allowedMcpServers)
        if (isMcpServerNameEntry(allowedMcpServer) && allowedMcpServer.serverName === serverName) return !0;
      return !1;
    }
  }
  for (let allowedMcpServer of r.allowedMcpServers)
    if (isMcpServerNameEntry(allowedMcpServer) && allowedMcpServer.serverName === serverName) return !0;
  return !1;
}
/**
 * 判断是否内置进程内 MCP 服务器（Claude in Chrome 或 Computer Use 一类保留名）。
 */
//@ chunk-e6aww6q8.js:3845175-3845212 facade-majority
function isBuiltinInProcessMcpServer(e) {
  return isClaudeInChromeMCPServer(e) || isComputerUseServer(e);
}
/**
 * filterMcpServersByPolicy：sdk 类型或通过 isMcpServerAllowedByPolicy 的留下，其余列为 blocked。
 */
//@ chunk-e6aww6q8.js:3845212-3845377 facade-majority = filterMcpServersByPolicy (1)
function filterMcpServersByPolicy(configs) {
  let create = Object.create(null),
    blocked = [];
  for (let [s, h] of Object.entries(configs)) {
    let y = h;
    if (y.type === "sdk" || isMcpServerAllowedByPolicy(s, y)) create[s] = h;
    else blocked.push(s);
  }
  return { allowed: create, blocked: blocked };
}
//@ chunk-e6aww6q8.js:3845377-3845425 layout
var CONNECT_TIME_POLICY_SCOPES = new Set(["dynamic", "agent", "claudeai"]);
/**
 * isRefusedByBuiltinPlugin：内置插件声明 mayConnectMcpServer 且返回 false 时拒绝其服务器（异常也拒绝）。
 */
//@ chunk-e6aww6q8.js:3845425-3845817 facade-majority
function isWithdrawnBuiltinPluginServer(e, n) {
  let pluginSource = n.pluginSource,
    s = n.type === "sdk" || pluginSource === void 0 ? void 0 : officialPluginId(pluginSource);
  if (s === void 0) return !1;
  let sliced = s.slice(0, -`@${BUILTIN}`.length),
    y = getHostState().builtinPlugins.get(sliced)?.mayConnectMcpServer;
  if (y === void 0) return !1;
  let S = `plugin:${pluginDisplayKey(sliced, s)}:`;
  try {
    return !y(e.startsWith(S) ? e.slice(S.length) : e);
  } catch (error) {
    return (
      logError(
        withTelemetryMessage(
          toError(error),
          "a built-in plugin's mayConnectMcpServer threw; its server is refused",
        ),
      ),
      !0
    );
  }
}
/**
 * pluginRefusedServerError：插件拒绝其服务器时工具调用返回的错误。
 */
//@ chunk-e6aww6q8.js:3845817-3846051 facade-majority
function withdrawnBuiltinPluginServerError(e) {
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `MCP server "${e}" was not called: the plugin that provides it refused this call. Try the call once more. If it is refused again, the plugin has turned the server off.`,
    "MCP server refused by its plugin",
  );
}
/**
 * 判断该服务器连接会接到 Claude in Chrome 桥（名字是 Chrome 内置名或配置指向 Chrome 桥），sdk 类型除外。
 */
//@ chunk-e6aww6q8.js:3846051-3846108 facade-majority
function dialsClaudeInChromeBridge(e, n) {
  return n.type !== "sdk" && (isClaudeInChromeMCPServer(e) || isClaudeInChromeMcpLaunch(n));
}
//@ chunk-e6aww6q8.js:3846108-3846163 layout
function v6r() {
  return startupCcrEnv.isSessionIngressUrlSet || hasSessionIngressAuthToken();
}
//@ chunk-e6aww6q8.js:3846163-3846213 layout
function r$n(e, n) {
  return isToolboxMcpServerConfig(n) && !isCcrMemoryMcpServer(e, n) && v6r();
}
//@ chunk-e6aww6q8.js:3846213-3846272 layout
var qFn = ge({ noted: new WeakMap() }, (e) => {
  e.noted = new WeakMap();
});
//@ chunk-e6aww6q8.js:3846272-3846667 layout
function noteStrayMemoryRouteEntry(e, n, r) {
  if (qFn.noted.get(n) === r) return;
  (qFn.noted.set(n, r),
    logForDebugging(
      `MCP server "${e}" could reach the account memory server but is not the entry the cloud service provides for it: ${r ? "let through, the refusal is lifted" : "refused at connect, so its tools are not available"}.`,
      { level: "warn" },
    ),
    logEvent("tengu_mcp_stray_memory_route_entry", {
      reason: fromEnum(e === MEMORY ? "not_canonical" : "other_name"),
      lifted: r,
    }));
}
/**
 * isMcpServerBlockedAtConnectTime：连接前的封锁判断：浏览器扩展开关、HIPAA、桌面入口、保留地址、账号记忆路由、claude.ai 代理可用性与策略 admit/hold/refuse、dynamic/agent/claudeai 作用域的策略。
 */
//@ chunk-e6aww6q8.js:3846667-3847384 facade-majority
function isMcpServerBlockedAtConnectTime(serverName, config, { leavesReservedAddressEntries: r = !1 } = {}) {
  if (dialsClaudeInChromeBridge(serverName, config) && !isPolicyAllowed_2("allow_claude_browser_extension"))
    return !0;
  if (config.type !== "sdk" && isComputerUseServer(serverName) && hasComplianceTaint("hipaa")) return !0;
  if (isDesktopEntryRegisteredByCli(serverName, config)) return !0;
  if (config.type !== "sdk" && toScopedConfig_2(config)) return !0;
  if (
    "url" in config &&
    typeof config.url === "string" &&
    hasOnlyAllowedCcrParams(config.url) &&
    !(isClaudeInChromeMCPServer(serverName) && isClaudeAiProxyServer(config))
  )
    return !0;
  if ("url" in config && typeof config.url === "string" && matchesCcrMcpServerId(serverName, config.url))
    return !0;
  if (!r && r$n(serverName, config)) {
    let s = isConnectTimeMcpBlockEnabled();
    if ((noteStrayMemoryRouteEntry(serverName, config, s), !s)) return !0;
  }
  if (!r && ias(config)) return !0;
  if (
    config.type === "claudeai-proxy" &&
    (hasDisableClaudeAiConnectors() || getClaudeAiProxyUrl(config) === null)
  )
    return !0;
  if (isNonClaudeAiScopedProxyConfig(config) && admitClaudeAiConnectorByPolicy(config) !== "admit") return !0;
  if (!CONNECT_TIME_POLICY_SCOPES.has(config.scope)) return !1;
  if (config.type === "sdk") return !1;
  if (isClaudeInChromeMCPServer(serverName) && isClaudeAiProxyServer(config))
    return !isMcpServerAllowedByPolicy(serverName, config);
  if (
    isReservedStdioServer(serverName, config) ||
    (Zl(config) && serverName !== CLAUDE_ARTIFACTS) ||
    config.type === "sse-ide" ||
    config.type === "ws-ide"
  )
    return isMcpServerDenied(serverName, config);
  return !isMcpServerAllowedByPolicy(serverName, config);
}
/**
 * 判断连接时是否被策略阻止（mcpDialBlockCause 非空）。
 */
//@ chunk-e6aww6q8.js:3847384-3847423 facade-majority
function isMcpDialBlockedByPolicy(e, n) {
  return mcpDialBlockCause(e, n) !== null;
}
/**
 * 给出连接被阻止的原因：连接时策略拦截或不在 allow 名单返回 managed-policy；不属于设置类作用域的不判；其余看作用域门控（可能返回其他原因或 null）。
 */
//@ chunk-e6aww6q8.js:3847423-3847557 facade-majority
function mcpDialBlockCause(e, n) {
  if (isMcpServerBlockedAtConnectTime(e, n)) return "managed-policy";
  if (!MCP_SETTINGS_SCOPE_SET.has(n.scope)) return null;
  if (!isMcpServerAllowedByPolicy(e, n)) return "managed-policy";
  return getMcpServerScopeGate(e, n);
}
//@ chunk-e6aww6q8.js:3847557-3847652 layout
function C6r(e, n) {
  return (
    ((r$n(e, n) && !isConnectTimeMcpBlockEnabled()) || ias(n)) &&
    !isMcpServerBlockedAtConnectTime(e, n, { leavesReservedAddressEntries: !0 })
  );
}
//@ chunk-e6aww6q8.js:3847652-3847661 layout
wki(C6r);
/**
 * partitionByConnectTimePolicy：把服务器分成可连、被封锁、暂缓（等待连接器列表）三组。
 */
//@ chunk-e6aww6q8.js:3847661-3847917 facade-majority
function filterDynamicMcpServersByPolicy(e) {
  if (!e) return { configs: {}, blocked: [], held: [] };
  let n = {},
    r = [],
    s = [];
  for (let [h, y] of Object.entries(e))
    if (isJudgedOnClaudeAiConnectorList(y) && admitClaudeAiConnectorByPolicy(y) === "hold") s.push(h);
    else if (isMcpServerBlockedAtConnectTime(h, y, { leavesReservedAddressEntries: !0 })) r.push(h);
    else n[h] = y;
  return { configs: n, blocked: r, held: s };
}
/**
 * getRepoMcpPolicyFlags：仓库内设置源是否带 allowedMcpServers / deniedMcpServers（遥测）。
 */
//@ chunk-e6aww6q8.js:3847917-3848116 facade-majority
function getRepoMcpListsForAnalytics() {
  let e = projectSettingsAliasesUserSettings()
    ? []
    : REPO_DIR_SETTING_SOURCE_LIST.filter(isSettingSourceEnabled).map((n) => getSettingsForSource(n));
  return {
    repoMcpAllowList: !isManagedMcpServersOnly() && e.some((n) => n?.allowedMcpServers !== void 0),
    repoMcpDenyList: e.some((n) => (n?.deniedMcpServers?.length ?? 0) > 0),
  };
}
/**
 * 列出 CCR 注入的、按 allow 名单本应被拦、但因保留地址条目而被保留下来的服务器名（用于诊断提示）。
 */
//@ chunk-e6aww6q8.js:3848116-3848243 facade-majority
function ccrInjectedKeptDespiteAllowlist(e) {
  return Object.entries(e)
    .filter(
      ([n, r]) =>
        isCcrInjectedConfig(r) &&
        isMcpServerBlockedAtConnectTime(n, { ...r }, { leavesReservedAddressEntries: !0 }),
    )
    .map(([n]) => n);
}
/**
 * getRestrictedRemoteServerNote：组织限制 MCP 时，说明 claude-code-remote 服务器只保留仓库工具的提示文本。
 */
//@ chunk-e6aww6q8.js:3848243-3848643 facade-majority
function ccrRepoToolsOnlyNote(e) {
  return Object.values(e).some(OPt)
    ? `Note: because this organization restricts MCP servers, Claude Code keeps only the repository tools (${REPO_TOOL_NAMES_WITH_ROOT.join(", ")}) of ${CLAUDE_CODE_REMOTE}, the server it adds to its own remote sessions. That server's other tools (managing cloud scheduled tasks, starting and steering other sessions, following pull request activity) are not available in this session.`
    : void 0;
}
//@ chunk-e6aww6q8.js:3848643-3848808 layout
var INVALID_SERVER_NAME_MESSAGE =
    "Invalid name <redacted>. Names can only contain letters, numbers, hyphens, and underscores.",
  RESERVED_SERVER_NAME_MESSAGE = "Cannot add MCP server <redacted>: this name is reserved.";
/**
 * addMcpConfig：claude mcp add 的实现：校验名字/保留名/企业独占/仅插件策略/schema/宿主专用类型/策略，再按作用域写入 .mcp.json、全局配置或项目配置，写后重读确认。
 */
//@ chunk-e6aww6q8.js:3848808-3851867 facade-majority = addMcpConfig (0.683)
async function addMcpConfig(name, config, scope, s) {
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
    let w = getUnusableEnterpriseMcpConfigMessage();
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Cannot add MCP server: enterprise MCP configuration is active and has exclusive control over MCP servers${w === null ? "" : `. ${w}`}`,
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
  let validatedConfig = result.data,
    S = unaddableTransportReason(validatedConfig.type);
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
      let w = await readRawMcpJsonServersFromCwd();
      if (Object.hasOwn(w, name))
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
      let w = await readRawMcpJsonServersFromCwd();
      w[name] = validatedConfig;
      try {
        await writeMcpjsonFile({ mcpServers: w });
      } catch (error) {
        throw (
          logFeatureBad("mcp_config_add", "mcp_config_write_failed"),
          Error(`Failed to write to .mcp.json: ${error}`)
        );
      }
      break;
    }
    case "user": {
      if (
        !(await saveGlobalConfigDurably(
          (current) => ({ ...current, mcpServers: { ...current.mcpServers, [name]: validatedConfig } }),
          s,
        ))
      )
        await verifyGlobalConfigWrite(name, scope, "add", s);
      break;
    }
    case "local": {
      if (
        !(await saveCurrentProjectConfigDurably(
          (current) => ({ ...current, mcpServers: { ...current.mcpServers, [name]: validatedConfig } }),
          s,
        ))
      )
        await verifyGlobalConfigWrite(name, scope, "add", s);
      break;
    }
    default:
      throw Error(`Cannot add MCP server to scope: ${scope}`);
  }
  logFeatureOk("mcp_config_add");
}
/**
 * verifyGlobalConfigWrite：重读全局配置（带重试）确认 add/remove 生效，否则抛"未保存/无法确认"错误。
 */
//@ chunk-e6aww6q8.js:3851867-3852452 layout
async function verifyGlobalConfigWrite(e, n, r, s) {
  let h = r === "add" ? "mcp_config_add" : "mcp_config_remove",
    y = describeMcpConfigFilePath("user"),
    S = n === "local" ? getProjectPathForConfig() : void 0,
    w;
  for (let Z = 0; ; Z++)
    try {
      w = await readGlobalConfigFromDiskOrThrow(s);
      break;
    } catch (error) {
      let ke = CONFIG_READ_RETRY_DELAYS_MS[Z];
      if (ke !== void 0) {
        await sleep(ke);
        continue;
      }
      throw (
        logForDebugging(
          `MCP config: could not re-read ${y} to check that server "${e}" was ${r === "add" ? "added" : "removed"}: ${errorMessage(error)}`,
          { level: "error" },
        ),
        logFeatureBad(h, "mcp_config_write_unconfirmed"),
        mcpConfigWriteUnconfirmedError(e, y, r, S, errorMessage(error))
      );
    }
  let L = S === void 0 ? w : getProp(getProp(w, "projects"), S),
    G = getProp(L, "mcpServers");
  if ((isObjectLike(G) && Object.hasOwn(G, e)) === (r === "add")) return;
  throw (logFeatureBad(h, "mcp_config_write_failed"), mcpConfigWriteNotSavedError(e, y, r, S));
}
//@ chunk-e6aww6q8.js:3852452-3852505 layout
function isObjectLike(e) {
  return typeof e === "object" && e !== null;
}
//@ chunk-e6aww6q8.js:3852505-3852549 layout
function getProp(e, n) {
  return isObjectLike(e) ? e[n] : void 0;
}
/**
 * removeMcpConfig：claude mcp remove 的实现，按作用域删除并确认落盘。
 */
//@ chunk-e6aww6q8.js:3852549-3853366 facade-majority = removeMcpConfig (0.501)
async function removeMcpConfig(name, scope, r) {
  switch (scope) {
    case "project": {
      assertProjectScopeWritable();
      let s = await readRawMcpJsonServersFromCwd();
      if (!Object.hasOwn(s, name)) throw Error(`No MCP server named "${name}" in .mcp.json`);
      delete s[name];
      try {
        await writeMcpjsonFile({ mcpServers: s });
      } catch (error) {
        throw (
          logFeatureBad("mcp_config_remove", "mcp_config_write_failed"),
          Error(`Failed to remove from .mcp.json: ${error}`)
        );
      }
      break;
    }
    case "user": {
      if (!getGlobalConfig().mcpServers?.[name]) throw Error(`No MCP server named "${name}" in user scope`);
      if (
        !(await saveGlobalConfigDurably((current) => {
          let { [name]: S, ...w } = current.mcpServers ?? {};
          return { ...current, mcpServers: w };
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
          let { [name]: S, ...w } = current.mcpServers ?? {};
          return { ...current, mcpServers: w };
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
/**
 * 判断 user 作用域（~/.claude.json 顶层 mcpServers）是否已有同名服务器。
 */
//@ chunk-e6aww6q8.js:3853366-3853419 facade-majority
function userScopeMcpServerExists(e) {
  return getGlobalConfig().mcpServers?.[e] !== void 0;
}
/**
 * getProjectMcpConfigsFromCwd：读取 cwd/.mcp.json 的 mcpServers（普通文件、≤2 MiB），不存在返回空对象。
 */
//@ chunk-e6aww6q8.js:3853419-3853984 facade-majority = getProjectMcpConfigsFromCwd (0.205)
async function readRawMcpJsonServersFromCwd() {
  let mcpJsonPath = join_99(getCwd(), ".mcp.json"),
    n;
  try {
    let s = await readSmallFileChecked(getFsImplementation(), mcpJsonPath, MAX_MCP_CONFIG_FILE_BYTES);
    if (s === null)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Can't read .mcp.json: it isn't a regular file or is larger than ${MAX_MCP_CONFIG_FILE_BYTES} bytes. Fix or remove it, then run the command again.`,
        "Project .mcp.json is not a regular file or exceeds the size limit",
      );
    n = s;
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT") return {};
    throw error;
  }
  if (!n.trim()) return {};
  let safeParse = u({ mcpServers: pe(o(), oe()).default({}) }).safeParse(safeParseJSON(n, !1));
  if (!safeParse.success)
    throw Error(".mcp.json is malformed (not valid JSON, or mcpServers is not an object)");
  return safeParse.data.mcpServers;
}
//@ chunk-e6aww6q8.js:3853984-3854094 facade-majority = SCOPE_ORDER (0.845)
var MCP_SETTINGS_SCOPES = ["enterprise", "managed", "local", "user", "project"],
  MCP_SETTINGS_SCOPE_SET = new Set(MCP_SETTINGS_SCOPES),
  i$n = [...MANAGED_CONFIG_SCOPES, "local", "project", "user"];
/**
 * 按作用域读取 MCP 配置的外层：安全模式（禁用自动发现）下返回空集，否则交给真正的读取实现，可选是否展开环境变量。
 */
//@ chunk-e6aww6q8.js:3854094-3854198 facade-majority
function getMcpConfigsByScope(e, { expandVars: n = !0 } = {}) {
  if (getIsRemoteMode()) return { servers: emptyServerMap(), errors: [] };
  return getMcpConfigsByScope_2(e, { expandVars: n });
}
/**
 * getMcpConfigsByScope：按作用域读取服务器：project 从项目根到 cwd 逐级读 .mcp.json；user 读全局配置 mcpServers；local 读项目配置 mcpServers；managed 读 policySettings.managedMcpServers；enterprise 读 managed-mcp.json。每项补 scope（与 declaredIn）。
 */
//@ chunk-e6aww6q8.js:3854198-3856139 fingerprint = getMcpConfigsByScope (0.904)
function getMcpConfigsByScope_2(scope, { expandVars: n = !0 } = {}) {
  let sourceMap = { project: "projectSettings", user: "userSettings", local: "localSettings" };
  if (
    scope in sourceMap &&
    !(scope === "local" ? isLocalSettingsReadable() : isSettingSourceEnabled(sourceMap[scope]))
  )
    return { servers: emptyServerMap(), errors: [] };
  switch (scope) {
    case "project": {
      if (isDiskless()) return { servers: emptyServerMap(), errors: [] };
      let s = emptyServerMap(),
        h = [],
        y = [],
        currentDir = getOriginalCwd(),
        w = getProjectConfigRoot() ?? currentDir;
      while (w !== parse_13(w).root) (y.push(w), (w = dirname_57(w)));
      for (let dir of y.reverse()) {
        let mcpJsonPath = join_99(dir, ".mcp.json"),
          { config: config, errors: errors } = parseMcpConfigFromFilePath({
            filePath: mcpJsonPath,
            expandVars: n,
            scope: "project",
          });
        if (!config) {
          let nonMissingErrors = errors.filter((ke) => !ke.message.startsWith("MCP config file not found"));
          if (nonMissingErrors.length > 0)
            (logForDebugging(
              `MCP config errors for ${mcpJsonPath}: ${jsonStringify(nonMissingErrors.map((ke) => ke.message))}`,
              { level: "error" },
            ),
              h.push(...nonMissingErrors));
          continue;
        }
        if (config.mcpServers) Object.assign(s, addScopeToServers(config.mcpServers, scope, currentDir));
        if (errors.length > 0) h.push(...errors);
      }
      return { servers: s, errors: h };
    }
    case "user": {
      let mcpServers = getGlobalConfig().mcpServers;
      if ((initClassifierToolSet(Object.keys(mcpServers ?? {})), !mcpServers))
        return { servers: emptyServerMap(), errors: [] };
      let { config: config, errors: errors } = parseMcpConfig({
        configObject: { mcpServers: mcpServers },
        expandVars: n,
        scope: "user",
      });
      return { servers: addScopeToServers(config?.mcpServers, scope), errors: errors };
    }
    case "local": {
      let s = getOriginalCwdOrNull();
      if (s === null) return { servers: emptyServerMap(), errors: [] };
      let mcpServers = getCurrentProjectConfig().mcpServers;
      if (!mcpServers) return { servers: emptyServerMap(), errors: [] };
      let { config: config, errors: errors } = parseMcpConfig({
        configObject: { mcpServers: mcpServers },
        expandVars: n,
        scope: "local",
      });
      return { servers: addScopeToServers(config?.mcpServers, scope, s), errors: errors };
    }
    case "managed": {
      let enterpriseMcpPath = getManagedMcpServersIfReadable();
      if (!enterpriseMcpPath)
        return { servers: emptyServerMap(), errors: getManagedMcpServersIgnoredWarnings() };
      let { config: config, errors: errors } = parseMcpConfig({
        configObject: { mcpServers: enterpriseMcpPath },
        expandVars: !1,
        scope: "managed",
      });
      return { servers: addScopeToServers(config?.mcpServers, scope), errors: errors };
    }
    case "enterprise": {
      let { config: config, errors: errors, present: present } = doesEnterpriseMcpConfigExist_2(n);
      if (present) getEnterpriseMcpConfigState().judgeLink();
      if (getEnterpriseMcpConfigState().isHeld(present)) return { servers: emptyServerMap(), errors: [] };
      if (!config) {
        let nonMissingErrors = errors.filter((w) => !w.message.startsWith("MCP config file not found"));
        if (nonMissingErrors.length > 0)
          return (
            logForDebugging(
              `Enterprise MCP config errors for ${getEnterpriseMcpFilePath()}: ${jsonStringify(nonMissingErrors.map((w) => w.message))}`,
              { level: "error" },
            ),
            {
              servers: emptyServerMap(),
              errors: present
                ? nonMissingErrors.map((w) => ({
                    ...w,
                    suggestion: w.suggestion
                      ? `${w.suggestion}. ${ENTERPRISE_EXCLUSIVE_MESSAGE}`
                      : ENTERPRISE_EXCLUSIVE_MESSAGE,
                  }))
                : nonMissingErrors,
            }
          );
        return { servers: emptyServerMap(), errors: [] };
      }
      return { servers: addScopeToServers(config.mcpServers, scope), errors: errors };
    }
  }
}
//@ chunk-e6aww6q8.js:3856139-3856180 layout
function isMcpServerUngated(e, n) {
  return getMcpServerScopeGate(e, n) === null;
}
/**
 * getMcpServerScopeGate：作用域门控原因：安全模式或企业/插件独占时 managed-policy，未批准的 project 为 project-approval，否则 null。
 */
//@ chunk-e6aww6q8.js:3856180-3856426 fingerprint = getMcpConfigByName (0.33)
function getMcpServerScopeGate(e, n) {
  if (!MCP_SETTINGS_SCOPE_SET.has(n.scope)) return null;
  if (isCustomizationDisabled("mcpAutoDiscovered")) return "managed-policy";
  if (doesEnterpriseMcpConfigExist() || isRestrictedToPluginOnly("mcp"))
    return isManagedConfigScope(n.scope) ? null : "managed-policy";
  if (n.scope === "project")
    return getEffectiveProjectMcpServerStatus(e) === "approved" ? null : "project-approval";
  return null;
}
/**
 * 在设置类作用域（按优先顺序）中按名字找服务器配置；project 作用域只认已批准的 .mcp.json 服务器；找不到返回 null。
 */
//@ chunk-e6aww6q8.js:3856426-3856556 facade-majority
function getSettingsMcpConfigByName(e) {
  for (let n of i$n) {
    if (n === "project" && getEffectiveProjectMcpServerStatus(e) !== "approved") continue;
    let r = getMcpConfigsByScope(n).servers[e];
    if (r) return r;
  }
  return null;
}
/**
 * getMcpConfigByName：按作用域优先级查找可用的同名配置（受企业独占、仅插件、审批限制）。
 */
//@ chunk-e6aww6q8.js:3856556-3856728 facade-majority
function getMcpConfigByName(e) {
  if (isCustomizationDisabled("mcpAutoDiscovered")) return null;
  for (let n of i$n) {
    if (!isManagedConfigScope(n) && (doesEnterpriseMcpConfigExist() || isRestrictedToPluginOnly("mcp")))
      return null;
    let r = getMcpConfigsByScope(n).servers[e];
    if (r && isMcpServerUngated(e, r)) return r;
  }
  return null;
}
/**
 * getClaudeCodeMcpConfigs：合并 Claude Code 自身的配置：企业 managed-mcp.json 存在时独占；否则合并 user、已批准的 project、local、managed、插件与 dynamic 服务器，经禁用列表、审批状态与策略过滤；插件服务器与手工配置按签名去重（被压制的记为警告），保留名冲突的 carrier 条目单独报告。
 */
//@ chunk-e6aww6q8.js:3856728-3860255 facade-majority = getClaudeCodeMcpConfigs (0.733)
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
      extraDedupTargets.purpose === "deviceBridge" ? getMcpConfigsByScope_2 : getMcpConfigsByScope,
    { admits: admits } = extraDedupTargets,
    h = admits
      ? (rn) => {
          let pn = emptyServerMap();
          for (let [no, hn] of Object.entries(getScopeConfigs(rn).servers)) if (admits(no, hn)) pn[no] = hn;
          return { servers: pn };
        }
      : getScopeConfigs,
    { servers: enterpriseServers } = h("enterprise"),
    { servers: servers } = h("managed");
  if (doesEnterpriseMcpConfigExist()) {
    let rn = emptyServerMap();
    for (let [pn, no] of Object.entries({ ...servers, ...enterpriseServers })) {
      if (!isMcpServerAllowedByPolicy(pn, no)) continue;
      rn[pn] = no;
    }
    return {
      servers: rn,
      pendingProjectServers: new Set(),
      rejectedProjectServers: new Set(),
      errors: [],
      warnings: [],
      reservedNameRefusals: [],
    };
  }
  let mcpLocked = isRestrictedToPluginOnly("mcp"),
    noServers = { servers: emptyServerMap() },
    { servers: userServers } = mcpLocked ? noServers : h("user"),
    { servers: projectServers } = mcpLocked ? noServers : h("project"),
    { servers: localServers } = mcpLocked ? noServers : h("local"),
    pluginServers = emptyServerMap(),
    pluginLoadResult =
      extraDedupTargets.pluginLoadResult ??
      (await loadAllPluginsCacheOnly(extraDedupTargets.storageV5, extraDedupTargets.credentials)),
    pluginErrors = [],
    warnings = [];
  if (pluginLoadResult.errors.length > 0)
    for (let error of pluginLoadResult.errors)
      if (
        error.type === "mcp-config-invalid" ||
        error.type === "mcpb-download-failed" ||
        error.type === "mcpb-extract-failed" ||
        error.type === "mcpb-invalid-manifest"
      ) {
        let errorMessage = `Plugin MCP loading error - ${error.type}: ${pluginErrorText(error)}`;
        logForDebugging(errorMessage, { level: "error" });
      } else {
        let errorType = error.type;
        logForDebugging(`Plugin not available for MCP: ${error.source} - error type: ${errorType}`);
      }
  let pendingProjectServers = new Set(),
    rejectedProjectServers = new Set(),
    getProjectStatus =
      extraDedupTargets.purpose === "deviceBridge"
        ? getProjectMcpServerStatusFromSettings
        : extraDedupTargets.includePendingProjectServers || extraDedupTargets.includeRejectedProjectServers
          ? getProjectMcpServerStatus
          : getEffectiveProjectMcpServerStatus,
    We = emptyServerMap(),
    ze = extraDedupTargets.purpose === "deviceBridge" ? getPolicyAllowedSet() : null,
    pluginServerResults = await Promise.all(
      pluginLoadResult.enabled.map(async (plugin) => {
        let pn = await getPluginMcpServers(
            plugin,
            pluginErrors,
            extraDedupTargets.storageV5,
            void 0,
            warnings,
          ),
          no = pn && admits ? Do(pn, (ho, yn) => admits(yn, ho)) : pn;
        if (
          no &&
          extraDedupTargets.purpose === "deviceBridge" &&
          (ze?.has(plugin.source) === !0 || plugin.admittedByManagedLock === !0)
        )
          return xr(no, (ho) => ({ ...ho, scope: "managed" }));
        if (!no || !isProjectLocalPlugin(plugin)) return no;
        let hn = Do(no, (ho, yn) => {
          let Kn = getProjectStatus(yn);
          if (Kn === "approved") return !0;
          if (Kn === "pending" && extraDedupTargets.includePendingProjectServers)
            return (pendingProjectServers.add(yn), !0);
          if (Kn === "rejected" && extraDedupTargets.includeRejectedProjectServers)
            return (rejectedProjectServers.add(yn), !0);
          return !1;
        });
        return (
          Object.assign(We, hn),
          extraDedupTargets.purpose === "deviceBridge" ? xr(hn, (ho) => ({ ...ho, scope: "project" })) : hn
        );
      }),
    );
  for (let servers of pluginServerResults) if (servers) Object.assign(pluginServers, servers);
  if (pluginErrors.length > 0)
    for (let error of pluginErrors) {
      let errorMessage = `Plugin MCP server error - ${error.type}: ${pluginErrorText(error)}`;
      logForDebugging(errorMessage, { level: "error" });
    }
  let approvedProjectServers = emptyServerMap();
  for (let [rn, pn] of Object.entries(projectServers)) {
    let no = getProjectStatus(rn);
    if (no === "approved") {
      approvedProjectServers[rn] = pn;
      continue;
    }
    if (rn in localServers || rn in userServers || rn in servers || rn in pluginServers) continue;
    if (no === "pending" && extraDedupTargets.includePendingProjectServers)
      ((approvedProjectServers[rn] = pn), pendingProjectServers.add(rn));
    else if (no === "rejected" && extraDedupTargets.includeRejectedProjectServers)
      ((approvedProjectServers[rn] = pn), rejectedProjectServers.add(rn));
  }
  if (getProjectStatus === getEffectiveProjectMcpServerStatus)
    logProjectServersApprovedOnce(approvedProjectServers, We, resolveProjectMcpServerApproval);
  let nt = isBridgeCarrierDynamicConfig(dynamicServers),
    manualServers = {};
  for (let [rn, pn] of Object.entries({
    ...userServers,
    ...approvedProjectServers,
    ...localServers,
    ...servers,
    ...dynamicServers,
  }))
    if (
      !isMcpServerDisabled(rn) &&
      !pendingProjectServers.has(rn) &&
      !rejectedProjectServers.has(rn) &&
      isMcpServerAllowedByPolicy(rn, pn) &&
      !(nt && zXn(rn) && !Zl(pn))
    )
      manualServers[rn] = pn;
  let Et = {},
    yt = {};
  for (let [rn, pn] of Object.entries(pluginServers))
    if (
      isMcpServerDisabled(rn) ||
      pendingProjectServers.has(rn) ||
      rejectedProjectServers.has(rn) ||
      !isMcpServerAllowedByPolicy(rn, pn)
    )
      yt[rn] = pn;
    else Et[rn] = pn;
  let { servers: dedupedPluginServers, suppressed: suppressed } = dedupPluginMcpServers(Et, manualServers);
  Object.assign(dedupedPluginServers, yt);
  for (let { name: name, duplicateOf: duplicateOf } of suppressed) {
    let parts = name.split(":");
    if (parts[0] !== "plugin" || parts.length < 3) continue;
    let hn = parsePluginIdentifier(Et[name]?.pluginSource ?? "");
    warnings.push({
      type: "mcp-server-suppressed-duplicate",
      source: name,
      plugin: hn.marketplace === BUILTIN ? hn.name : parts[1],
      serverName: parts.slice(2).join(":"),
      duplicateOf: duplicateOf,
    });
  }
  let merged = Object.assign(
      {},
      dedupedPluginServers,
      userServers,
      approvedProjectServers,
      localServers,
      servers,
    ),
    Yt = emptyServerMap();
  for (let [rn, pn] of Object.entries(merged)) {
    let no = pn;
    if (!isMcpServerAllowedByPolicy(rn, no)) continue;
    Yt[rn] = no;
  }
  for (let rn of [pendingProjectServers, rejectedProjectServers])
    for (let pn of rn) {
      let no = Yt[pn]?.scope;
      if (no !== "project" && no !== "dynamic") rn.delete(pn);
    }
  let { servers: servers_2, refused: refused } = refuseReservedNamesForCarrier(Yt, dynamicServers);
  for (let rn of refused) (pendingProjectServers.delete(rn.name), rejectedProjectServers.delete(rn.name));
  return {
    servers: servers_2,
    pendingProjectServers: pendingProjectServers,
    rejectedProjectServers: rejectedProjectServers,
    errors: pluginErrors,
    warnings: warnings,
    reservedNameRefusals: refused,
  };
}
/**
 * getAllMcpConfigs：getClaudeCodeMcpConfigs + claude.ai 连接器（策略过滤后与手工配置按签名去重），合并成最终服务器表。
 */
//@ chunk-e6aww6q8.js:3860255-3860830 facade-majority
async function getAllMcpConfigs(e = {}) {
  if (shouldSkipClaudeAiFetchForEnterpriseLockdown() || e.admits) return getClaudeCodeMcpConfigs({}, e);
  let n = fetchClaudeAiConfigsOnce();
  if (isGateOOn() && hasManagedMcpPolicy()) await n.catch(() => ({}));
  let {
      servers: servers,
      pendingProjectServers: pendingProjectServers,
      rejectedProjectServers: rejectedProjectServers,
      errors: errors,
      warnings: warnings,
    } = await getClaudeCodeMcpConfigs({}, e),
    { allowed: allowed } = filterMcpServersByPolicy((await n) ?? {});
  printClaudeAiConnectorNotice();
  let L =
      e.includePendingProjectServers || e.includeRejectedProjectServers
        ? Do(servers, (Z, Se) => !pendingProjectServers.has(Se) && !rejectedProjectServers.has(Se))
        : servers,
    { servers: servers_2 } = await dedupClaudeAiMcpServers(allowed, L),
    merged = Object.assign(emptyServerMap(), servers_2, servers);
  for (let Z of [pendingProjectServers, rejectedProjectServers])
    for (let Se of Z) if (Object.hasOwn(servers_2, Se)) ((merged[Se] = servers_2[Se]), Z.delete(Se));
  return {
    servers: merged,
    pendingProjectServers: pendingProjectServers,
    rejectedProjectServers: rejectedProjectServers,
    errors: errors,
    warnings: warnings,
  };
}
/**
 * getPluginProvidedServerNames：当前配置中由插件提供的服务器名集合。
 */
//@ chunk-e6aww6q8.js:3860830-3861065 facade-majority
async function getConnectablePluginMcpServerNames(e = {}, n, r = () => loadAllPluginsForPreview(n), s) {
  if (getStrictMcpConfig()) return new Set();
  let h = await r(),
    { servers: servers } = await getClaudeCodeMcpConfigs(e, { pluginLoadResult: h, storageV5: n, admits: s }),
    S = new Set();
  for (let [w, L] of Object.entries(servers)) if (L.pluginSource !== void 0) S.add(w);
  return S;
}
/**
 * 若本进程是 Remote Control 的 MCP carrier 子进程，把环境变量 `CLAUDE_CODE_BRIDGE_MCP_CARRIER` 写成标记值（消费 carrier 标记）。
 */
//@ chunk-e6aww6q8.js:3861065-3861151 facade-majority
function consumeBridgeMcpCarrierMarker() {
  if (startupCcrEnv.isBridgeCarrierChild) env.set("CLAUDE_CODE_BRIDGE_MCP_CARRIER", SPENT);
}
/**
 * 判断是否处于绑定了提示词的 bridge carrier（设置了 `CLAUDE_CODE_BRIDGE_PROMPT_SHA256` 或本身是 carrier 子进程）。
 */
//@ chunk-e6aww6q8.js:3861151-3861242 facade-majority
function isBridgeCarrierPromptBound() {
  return env.CLAUDE_CODE_BRIDGE_PROMPT_SHA256 !== void 0 || startupCcrEnv.isBridgeCarrierChild;
}
/**
 * verifyBridgeAppendPromptFile：bridge carrier 子进程校验 --append-system-prompt-file 内容的 SHA-256 与守护进程写入的一致，否则丢弃。
 */
//@ chunk-e6aww6q8.js:3861242-3861577 facade-majority
function verifyBridgeCarrierPrompt(e) {
  let n = isBridgeCarrierPromptBound(),
    CLAUDE_CODE_BRIDGE_PROMPT_SHA256 = env.CLAUDE_CODE_BRIDGE_PROMPT_SHA256;
  if (
    (env.unset("CLAUDE_CODE_BRIDGE_PROMPT_SHA256"),
    !n ||
      (CLAUDE_CODE_BRIDGE_PROMPT_SHA256 !== void 0 &&
        createHash_20("sha256").update(e).digest("hex") === CLAUDE_CODE_BRIDGE_PROMPT_SHA256.toLowerCase()))
  )
    return e.toString("utf8");
  logForDebugging(
    "[bridge:carrier] --append-system-prompt-file does not match the prompt the daemon wrote; dropped",
    { level: "error" },
  );
  return;
}
//@ chunk-e6aww6q8.js:3861577-3861593 layout
var MAX_MCP_CONFIG_FILE_BYTES = 2097152;
/**
 * parseMcpConfigFromFilePath：读取并解析 MCP 配置文件（project/enterprise 限普通文件且 ≤2 MiB；dynamic 直接读），区分不存在、读失败、非 JSON、schema 错误，返回 {config, errors, present}。
 */
//@ chunk-e6aww6q8.js:3861593-3863797 facade-majority = parseMcpConfigFromFilePath (0.584)
function parseMcpConfigFromFilePath(params) {
  let { filePath: filePath, expandVars: expandVars, scope: scope, bridgeSessionId: bridgeSessionId } = params,
    fs = getFsImplementation(),
    S = { scope: fromEnum(scope) },
    configContent;
  try {
    let q =
      scope === "dynamic"
        ? fs.readFileSync(filePath, { encoding: "utf8" })
        : readSmallFileCheckedSync(fs, filePath, MAX_MCP_CONFIG_FILE_BYTES);
    if (q === null)
      return (
        logForDebugging(
          `MCP config skipped for ${filePath} (scope=${scope}): not a regular file or exceeds ${MAX_MCP_CONFIG_FILE_BYTES} byte limit`,
          { level: "warn" },
        ),
        logFeatureBad("mcp_config_parse", "mcp_config_shape_gate", S),
        {
          config: null,
          errors: [
            {
              file: filePath,
              path: "",
              message: `MCP config is not a regular file or exceeds ${MAX_MCP_CONFIG_FILE_BYTES} bytes: ${filePath}`,
              suggestion: "Check that the path is a plain JSON file (not a device, FIFO, or symlink to one)",
              mcpErrorMetadata: { scope: scope, severity: "fatal" },
            },
          ],
          present: !0,
        }
      );
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
            mcpErrorMetadata: { scope: scope, severity: "fatal" },
          },
        ],
        present: !1,
      };
    let Se = typeof error === "object" && error !== null && "syscall" in error ? error.syscall : void 0,
      ke =
        code === "EACCES" &&
        (Se === "stat" || Se === "statx" || Se === "lstat") &&
        getPlatform() !== "windows";
    if (
      (logForDebugging(
        `MCP config read error for ${filePath} (scope=${scope}): ${error}${ke ? " \u2014 a parent directory is not searchable; treating the config as not deployed" : ""}`,
        { level: "error" },
      ),
      ke)
    )
      logFeatureSad("mcp_config_parse", "mcp_config_ancestor_inaccessible", S);
    else logFeatureBad("mcp_config_parse", "mcp_config_read_failed", S);
    return {
      config: null,
      errors: [
        {
          file: filePath,
          path: "",
          message: `Failed to read file: ${error}`,
          suggestion: "Check file permissions and ensure the file exists",
          mcpErrorMetadata: { scope: scope, severity: "fatal" },
        },
      ],
      present: !ke,
    };
  }
  if (scope === "project" && !configContent.trim())
    return (
      logForDebugging(`MCP config is blank, read as no servers: ${filePath}`),
      { config: { mcpServers: {} }, errors: [], present: !0 }
    );
  let L = safeParseJSON(configContent, !1);
  if (!L)
    return (
      logForDebugging(
        `MCP config is not valid JSON: ${filePath} (scope=${scope}, length=${configContent.length}, first100=${jsonStringify(configContent.slice(0, 100))})`,
        { level: "error" },
      ),
      logFeatureBad("mcp_config_parse", "mcp_config_invalid_json", S),
      {
        config: null,
        errors: [
          {
            file: filePath,
            path: "",
            message: "MCP config is not a valid JSON",
            suggestion: "Fix the JSON syntax errors in the file",
            mcpErrorMetadata: { scope: scope, severity: "fatal" },
          },
        ],
        present: !0,
      }
    );
  let parsedJson = parseMcpConfig({
    configObject: L,
    expandVars: expandVars,
    scope: scope,
    filePath: filePath,
    bridgeSessionId: bridgeSessionId,
  });
  if (parsedJson.config === null) logFeatureBad("mcp_config_parse", "mcp_config_invalid_schema", S);
  else logFeatureOk("mcp_config_parse", S);
  return { ...parsedJson, present: !0 };
}
//@ chunk-e6aww6q8.js:3863797-3863913 fingerprint = doesEnterpriseMcpConfigExist (0.88)
function doesEnterpriseMcpConfigExist_2(e) {
  return isDiskless()
    ? { config: null, errors: [], present: !1 }
    : parseMcpConfigFromFilePath({
        filePath: getEnterpriseMcpFilePath(),
        expandVars: e,
        scope: "enterprise",
      });
}
/**
 * EnterpriseMcpConfigState：managed-mcp.json 的加载缓存（每个宿主一份），提供 check/isHeld/fatalErrors/reset。
 */
//@ chunk-e6aww6q8.js:3863913-3864425 layout
class EnterpriseMcpConfigState {
  result = void 0;
  linkJudged = !1;
  load() {
    if (this.result === void 0) {
      if (((this.result = doesEnterpriseMcpConfigExist_2(!0)), this.result.present)) this.judgeLink();
    }
    return this.result;
  }
  judgeLink() {
    if (this.linkJudged) return;
    ((this.linkJudged = !0),
      (is().managedDocumentLinks.managedMcp = resolvePathStepsSync(
        getManagedFilePath(),
        ["managed-mcp.json"],
        void 0,
        new Map(),
        new Map(),
      )));
  }
  isHeld(e = this.load().present) {
    return e && isManagedFolderWritable(getEnterpriseMcpFilePath());
  }
  check() {
    return this.load().present;
  }
  fatalErrors() {
    let { present: present, config: config, errors: errors } = this.load();
    return present && config === null ? errors : [];
  }
  reset() {
    ((this.result = void 0), (this.linkJudged = !1));
  }
}
//@ chunk-e6aww6q8.js:3864425-3864452 layout
var I6r = new HostScoped(() => new EnterpriseMcpConfigState());
/**
 * 判断企业 MCP 配置（managed-mcp.json）是否存在；存在即独占其他作用域。
 */
//@ chunk-e6aww6q8.js:3864452-3864487 facade-majority
function doesEnterpriseMcpConfigExist() {
  return getEnterpriseMcpConfigState().check();
}
/**
 * 判断企业 MCP 配置当前是否处于"暂扣"状态（尚在等待读取/判定）。
 */
//@ chunk-e6aww6q8.js:3864487-3864524 facade-majority
function isEnterpriseMcpConfigHeld() {
  return getEnterpriseMcpConfigState().isHeld();
}
/**
 * 在企业配置未暂扣时等待额外的配置读取，若读完后仍未暂扣则用新结果，否则回退到原 Promise；出错只记录。用于启动时等待 MCP 配置就绪。
 */
//@ chunk-e6aww6q8.js:3864524-3864638 facade-majority
async function mcpConfigsAfterWaits(e, n, r) {
  try {
    if (n && !isEnterpriseMcpConfigHeld()) {
      let s = await r();
      if (!isEnterpriseMcpConfigHeld()) return (e.catch(logError), s);
    }
  } catch (error) {
    logError(error);
  }
  return e;
}
//@ chunk-e6aww6q8.js:3864638-3864677 layout
function getEnterpriseMcpConfigState() {
  return I6r.of(getRootSession().host);
}
/**
 * getEnterpriseMcpConfigNotice：企业 MCP 配置被持有或无法解析时的说明文本，否则 null。
 */
//@ chunk-e6aww6q8.js:3864677-3865168 facade-majority
function getUnusableEnterpriseMcpConfigMessage() {
  let e = getEnterpriseMcpConfigState();
  if (e.isHeld())
    return `${getEnterpriseMcpFilePath()} adds no MCP servers in this session, because the session takes its managed settings from your organization. MCP servers from other sources stay blocked. Servers the session's host provides still load.`;
  let fatalErrors = e.fatalErrors();
  if (fatalErrors.length === 0) return null;
  let joined = fatalErrors.map((s) => (s.path ? `${s.path}: ${s.message}` : s.message)).join("; ");
  return `Enterprise MCP config ${getEnterpriseMcpFilePath()} cannot be read or parsed (${joined}), so it keeps exclusive control: ${ENTERPRISE_EXCLUSIVE_HINT}`;
}
/**
 * 企业 MCP 配置存在且没有任何策略来源允许 allowAllClaudeAiMcps 时，跳过拉取 claude.ai 连接器（企业锁定）。
 */
//@ chunk-e6aww6q8.js:3865168-3865266 facade-majority
function shouldSkipClaudeAiFetchForEnterpriseLockdown() {
  if (!doesEnterpriseMcpConfigExist()) return !1;
  if (getAllPolicyTierSettings().some((e) => e.allowAllClaudeAiMcps === !0)) return !1;
  return !0;
}
//@ chunk-e6aww6q8.js:3865266-3865333 layout
function u$n() {
  return getMachineAdminPolicyTier()?.allowClaudeInChromeWithManagedMcp === !0;
}
/**
 * Claude in Chrome 被 managed-mcp.json 阻止时的提示文本。
 */
//@ chunk-e6aww6q8.js:3865333-3865527 facade-majority
var CLAUDE_IN_CHROME_MANAGED_MCP_REFUSAL =
  "Claude in Chrome is blocked by your organization's managed MCP configuration (managed-mcp.json). An administrator can allow it with allowClaudeInChromeWithManagedMcp in device policy.";
/**
 * 企业配置存在、可用、但组织没有为 Claude in Chrome 选择加入时，拒绝启用 Chrome 内置服务器。
 */
//@ chunk-e6aww6q8.js:3865527-3865576 facade-majority
function isClaudeInChromeRefusedForManagedMcpOptIn() {
  return doesEnterpriseMcpConfigExist() && getUnusableEnterpriseMcpConfigMessage() === null && !u$n();
}
/**
 * 企业配置存在且（不可用或组织未选择加入）时，Claude in Chrome 被企业 MCP 配置阻止。
 */
//@ chunk-e6aww6q8.js:3865576-3865627 facade-majority
function isClaudeInChromeBlockedByEnterpriseMcpConfig() {
  return doesEnterpriseMcpConfigExist() && (getUnusableEnterpriseMcpConfigMessage() !== null || !u$n());
}
/**
 * 判断无头模式是否同步 claude.ai 连接器：非受限环境、未被企业锁定、且未禁用非必要流量。
 */
//@ chunk-e6aww6q8.js:3865627-3865669 facade-majority
function headlessSyncsClaudeAiConnectors() {
  return !getStrictMcpConfig() && !shouldSkipClaudeAiFetchForEnterpriseLockdown() && !isBareMode();
}
//@ chunk-e6aww6q8.js:3865669-3865747 layout
xFn({
  headlessSyncsClaudeAiConnectors: headlessSyncsClaudeAiConnectors,
  isMcpServerBlockedAtConnectTime: isMcpServerBlockedAtConnectTime,
});
//@ chunk-e6aww6q8.js:3865747-3865780 layout
function isManagedMcpServersOnly() {
  return shouldAllowManagedMcpServersOnly(getMcpPolicyView());
}
/**
 * 判断一组 MCP 配置是否全是 sdk 类型（用于企业配置存在时放行 SDK 传入的服务器）。
 */
//@ chunk-e6aww6q8.js:3865780-3865847 facade-majority
function areMcpConfigsAllSdkType(e) {
  return Object.values(e).every((n) => n.type === "sdk");
}
/**
 * 判断一组动态 MCP 配置在企业配置存在时是否全部允许（逐个调用单条判定）。
 */
//@ chunk-e6aww6q8.js:3865847-3865913 facade-majority
function areMcpConfigsAllowedWithEnterpriseMcpConfig(e) {
  return Object.entries(e).every(([n, r]) => areMcpConfigsAllowedWithEnterpriseMcpConfig_2(n, r));
}
//@ chunk-e6aww6q8.js:3865913-3866005 fingerprint = areMcpConfigsAllowedWithEnterpriseMcpConfig (1)
function areMcpConfigsAllowedWithEnterpriseMcpConfig_2(e, n) {
  return (
    (n.type === "sdk" && n.name === "claude-vscode") ||
    isCcrInjectedConfig(n) ||
    (c$n(e, n) && !isClaudeInChromeBlockedByEnterpriseMcpConfig())
  );
}
//@ chunk-e6aww6q8.js:3866005-3866046 layout
function c$n(e, n) {
  return isClaudeInChromeMCPServer(e) && isReservedStdioServer(e, n);
}
/**
 * filterDynamicConfigForEnterprise：企业 MCP 配置存在时，--strict-mcp-config 被拒绝；--mcp-config 中不允许的服务器整体拒绝或逐个丢弃。
 */
//@ chunk-e6aww6q8.js:3866046-3866669 facade-majority
function gateDynamicMcpConfigForEnterpriseMcpConfig({
  dynamicMcpConfig: dynamicMcpConfig,
  strictMcpConfig: strictMcpConfig,
}) {
  if (!doesEnterpriseMcpConfigExist()) return { kind: "continue", servers: dynamicMcpConfig, dropped: [] };
  if (getUnusableEnterpriseMcpConfigMessage() === null) {
    if (strictMcpConfig)
      return {
        kind: "refuse",
        message: "You cannot use --strict-mcp-config when an enterprise MCP config is present",
      };
    let filtered = Object.entries(dynamicMcpConfig).filter(
      ([y, S]) => !areMcpConfigsAllowedWithEnterpriseMcpConfig_2(y, S),
    );
    if (filtered.length > 0)
      return {
        kind: "refuse",
        message: filtered.every(([y, S]) => c$n(y, S))
          ? CLAUDE_IN_CHROME_MANAGED_MCP_REFUSAL
          : "You cannot dynamically configure MCP servers when an enterprise MCP config is present",
      };
    return { kind: "continue", servers: dynamicMcpConfig, dropped: [] };
  }
  let r = emptyServerMap(),
    s = [];
  for (let [h, y] of Object.entries(dynamicMcpConfig))
    if (areMcpConfigsAllowedWithEnterpriseMcpConfig_2(h, y)) r[h] = y;
    else s.push(h);
  return { kind: "continue", servers: r, dropped: s };
}
//@ chunk-e6aww6q8.js:3866669-3866707 layout
function isOptInBuiltinServer(e) {
  return e === COMPUTER_USE_MCP_SERVER_NAME && !isHostedDesktopSession();
}
//@ chunk-e6aww6q8.js:3866707-3866751 layout
function asArray(e) {
  return Array.isArray(e) ? e : [];
}
/**
 * isMcpServerDisabled：项目配置 disabledMcpServers 包含该名字；默认关闭的内置服务器（computer-use）看 enabledMcpServers。
 */
//@ chunk-e6aww6q8.js:3866751-3866874 facade-majority = isMcpServerDisabled (1)
function isMcpServerDisabled(name) {
  let projectConfig = getCurrentProjectConfig();
  if (isOptInBuiltinServer(name)) return !asArray(projectConfig.enabledMcpServers).includes(name);
  return asArray(projectConfig.disabledMcpServers).includes(name);
}
/**
 * 读取设置中被关掉的 MCP 服务器名单 `disabledMcpServers`。
 */
//@ chunk-e6aww6q8.js:3866874-3866924 facade-majority
function getSwitchedOffMcpServers() {
  return asArray(getCurrentProjectConfig().disabledMcpServers);
}
/**
 * 把一批服务器名加入 `disabledMcpServers`（已全部在内则不写），写入指定设置源。
 */
//@ chunk-e6aww6q8.js:3866924-3867072 facade-majority
function switchOffMcpServers(e, n) {
  saveCurrentProjectConfig((r) => {
    let s = asArray(r.disabledMcpServers),
      h = new Set(s);
    return e.every((y) => h.has(y)) ? r : { ...r, disabledMcpServers: uniq([...s, ...e]) };
  }, n);
}
//@ chunk-e6aww6q8.js:3867072-3867161 file-local
function toggleMembership(list, name, shouldContain) {
  if (list.includes(name) === shouldContain) return list;
  return shouldContain ? [...list, name] : list.filter((h) => h !== name);
}
/**
 * 启用/禁用某个 MCP 服务器（委托给实际写设置的实现），并打点 `mcp_server_toggle`。
 */
//@ chunk-e6aww6q8.js:3867161-3867218 facade-majority
function setMcpServerEnabled(e, n, r) {
  (setMcpServerEnabled_2(saveCurrentProjectConfig, e, n, r), logFeatureOk("mcp_server_toggle"));
}
/**
 * setMcpServerEnabledVerified：写本地配置切换启用状态，写入无法确认时回滚。
 */
//@ chunk-e6aww6q8.js:3867218-3867423 facade-majority
function setMcpServerEnabledDurably(e, n, r) {
  let s = saveCurrentProjectConfigDurably,
    h = isMcpServerDisabled(e);
  return setMcpServerEnabled_2(s, e, n, r).then(async function (S) {
    if (S) return (logFeatureOk("mcp_server_toggle"), !0);
    return (
      logFeatureBad("mcp_server_toggle", "mcp_config_write_unconfirmed"),
      await setMcpServerEnabled_2(s, e, !h, r),
      !1
    );
  });
}
/**
 * setMcpServerEnabled：切换项目配置中的 enabledMcpServers/disabledMcpServers；内置服务器切换记录 tengu_builtin_mcp_toggle。
 */
//@ chunk-e6aww6q8.js:3867423-3867840 fingerprint = setMcpServerEnabled (1)
function setMcpServerEnabled_2(e, n, r, s) {
  let h = isOptInBuiltinServer(n) && isMcpServerDisabled(n) === r,
    y = e((current) => {
      if (isOptInBuiltinServer(n)) {
        let enabledMcpServers = current.enabledMcpServers,
          Z = asArray(enabledMcpServers),
          next = toggleMembership(Z, n, r);
        if (next === Z && (enabledMcpServers === void 0 || Array.isArray(enabledMcpServers))) return current;
        return { ...current, enabledMcpServers: next };
      }
      let disabledMcpServers = current.disabledMcpServers,
        L = asArray(disabledMcpServers),
        next = toggleMembership(L, n, !r);
      if (next === L && (disabledMcpServers === void 0 || Array.isArray(disabledMcpServers))) return current;
      return { ...current, disabledMcpServers: next };
    }, s);
  if (h)
    logEvent("tengu_builtin_mcp_toggle", {
      serverName: mcpNameForAnalytics_GATE_EVALUATED(n, isOptInBuiltinServer(n)),
      enabled: r,
    });
  return y;
}
//@ chunk-e6aww6q8.js:3867840-3867900 shared-adjacent = doesEnterpriseMcpConfigExist (0.88)
deliveredReaderSlot.set(() =>
  doesEnterpriseMcpConfigExist()
    ? deliveredNamesOf(getMcpConfigsByScope_2("enterprise", { expandVars: !1 }))
    : [],
);
/**
 * supportsEnvExpansion：按 type 判断（stdio/sse/http/sdk 为 true）。
 */
//@ chunk-e6aww6q8.js:3873177-3873356 fingerprint = expandEnvVars (0.913)
function supportsEnvExpansion(config) {
  switch (config.type) {
    case void 0:
    case "stdio":
    case "sse":
    case "http":
    case "sdk":
      return !0;
    case "ws":
    case "sse-ide":
    case "ws-ide":
    case "claudeai-proxy":
      return !1;
    default:
      return !1;
  }
}
/**
 * CCR 代理路径常量：/v2/ccr-sessions/、/v1/code/、session_ingress shttp/ws 路径与 MCP 路由正则。
 */
//@ chunk-1wpnxx5r.js:3164-3514 fingerprint = CCR_PROXY_PATH_MARKERS (0.563)
var CCR_SESSION_PATH_PREFIXES = ["/v2/ccr-sessions/", "/v1/code/"],
  CCR_PROXY_PATH_MARKERS = [
    "/v2/session_ingress/shttp/mcp/",
    "/v2/session_ingress/mcp/ws/",
    ...CCR_SESSION_PATH_PREFIXES,
  ],
  CCR_MCP_PATH_PATTERNS = [
    /^\/v2\/ccr-sessions\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\/mcp(?:\/[A-Za-z0-9_-]+)?$/,
    /^\/v1\/code\/sessions\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\/mcp(?:\/[A-Za-z0-9_-]+)?$/,
    /^\/v1\/code\/mcp\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)?$/,
  ],
  SPENT = "spent";
/**
 * 判断是否 CCR 托管的 MCP 配置：url 指向 CCR MCP 代理，或配置本身带 CCR 托管标记。
 */
//@ chunk-1wpnxx5r.js:15428-15515 fingerprint = getServerUrl (1)
function isCcrHostedConfig(config) {
  if ("url" in config && typeof config.url === "string" && isSameOriginAsCcr(config.url)) return !0;
  return Zl(config);
}
/**
 * 取服务器配置的 url（没有 url 字段的类型返回 null）。
 */
//@ chunk-1wpnxx5r.js:16374-16417 shared-adjacent = getServerUrl (1)
function getServerUrl(config) {
  return "url" in config ? config.url : null;
}
/**
 * 取 stdio 服务器的命令数组 [command, ...args]；非 stdio 返回 null。用于签名去重与策略匹配。
 */
//@ chunk-1wpnxx5r.js:16417-16522 affinity = getServerCommandArray (1)
function getServerCommandArray(config) {
  if (config.type !== void 0 && config.type !== "stdio") return null;
  let stdioConfig = config;
  return [stdioConfig.command, ...(stdioConfig.args ?? [])];
}
/**
 * 若 URL 是 CCR MCP 代理地址（含代理路径标记），取出查询参数 `mcp_url` 指向的原始服务器地址；否则或解析失败原样返回。用于签名去重。
 */
//@ chunk-1wpnxx5r.js:16522-16647 fingerprint = unwrapCcrProxyUrl (1)
function unwrapCcrProxyUrl(url) {
  if (!CCR_PROXY_PATH_MARKERS.some((r) => url.includes(r))) return url;
  try {
    return new URL(url).searchParams.get("mcp_url") || url;
  } catch {
    return url;
  }
}
//@ chunk-2yv46yc2.js:340-381 placement
var t = "(value set by your organization)";
/**
 * managed 作用域的 MCP 服务器配置脱敏（URL 与 headers 打码）。名字配错且应归 MCP，见 lead 建议。
 */
//@ chunk-2yv46yc2.js:381-500 placement = isInstallationRelevantToCurrentProject (0.769)
function redactManagedMcpServerConfig(r, e) {
  if (e !== "managed") return r;
  return { ...r, url: urlPathOf(r.url) ?? t, ...(r.headers && { headers: xr(r.headers, () => t) }) };
}
//@ chunk-2yv46yc2.js:500-548 placement
function Kgt(r) {
  return r === "cached" ? "pending" : r;
}
/**
 * 把 MCP 客户端列表转成对外的状态快照（名字、状态、脱敏后的连接配置、作用域、来源、serverInfo、错误与认证错误码）。
 */
//@ chunk-2yv46yc2.js:548-1131 placement
function mcpServerStatusSnapshots(clients) {
  return clients.map((e) => {
    let o;
    if (e.config.type === "sse" || e.config.type === "http")
      o = redactManagedMcpServerConfig(
        { type: e.config.type, url: e.config.url, headers: e.config.headers },
        e.config.scope,
      );
    else if (e.config.type === "claudeai-proxy")
      o = { type: "claudeai-proxy", url: e.config.url, id: e.config.id };
    else if (e.config.type === "stdio" || e.config.type === void 0)
      o = { type: "stdio", command: e.config.command, args: e.config.args };
    return {
      name: e.name,
      status: Kgt(e.type),
      config: o,
      scope: e.config.scope,
      source: mcpServerSource(e.name, e.config),
      serverInfo: isConnectedOrCached(e) ? e.serverInfo : void 0,
      error: e.type === "failed" ? e.error : void 0,
      error_code: mcpAuthErrorCode(e),
    };
  });
}
/**
 * 与 MCP 策略相关的设置键（允许/拒绝列表、项目 MCP 启用、claude.ai 连接器开关、托管服务器）。
 */
//@ chunk-dcmhvw5a.js:422731-422935 placement
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
/**
 * shouldAllowManagedMcpServersOnly：策略槽或管理员层设置 allowManagedMcpServersOnly。
 */
//@ chunk-dcmhvw5a.js:422935-423061 fingerprint = shouldAllowManagedMcpServersOnly (0.416)
function shouldAllowManagedMcpServersOnly({ slot: slot, adminTiers: adminTiers }) {
  return (
    slot?.allowManagedMcpServersOnly === !0 || adminTiers.some((r) => r.allowManagedMcpServersOnly === !0)
  );
}
//@ chunk-0h4e7gnq.js:29912-30007 fingerprint = getServerCommandArray (1)
function getMcpTransportTelemetryLabel(config) {
  let n = config.type ?? "stdio";
  return typeof n === "string" && Object.hasOwn(td, n) ? n : "other";
}
/**
 * 在已扣住的 MCP 配置之外，再把需要审批的项目 MCP 服务器移入 blocked。旧版名 hasBlockingResult 存疑，疑似 MCP 配置代码误归 hooks.ts。
 */
//@ chunk-18hwfzwa.js:1738045-1738247 placement = hasBlockingResult (0.495)
function filterUnapprovedMcpServers(h, x) {
  let D = filterDynamicMcpServersByPolicy(h);
  if (x || isLovelyUmbrellaOn()) return D;
  let L = {},
    ee = [...D.blocked];
  for (let [ke, Re] of Object.entries(D.configs))
    if (dialsClaudeInChromeBridge(ke, Re)) ee.push(ke);
    else L[ke] = Re;
  return { configs: L, blocked: ee, held: D.held };
}
//@ chunk-3wek6r2k.js:59775-60150 file-local
function isPrivateNetworkHost(e) {
  if (!e.includes(".") && !e.includes(":")) return !0;
  if (
    /^10\.\d+\.\d+\.\d+$/.test(e) ||
    /^192\.168\.\d+\.\d+$/.test(e) ||
    /^172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(e) ||
    /^169\.254\.\d+\.\d+$/.test(e) ||
    /^100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d+\.\d+$/.test(e) ||
    /^f[cd][0-9a-f]{2}:/.test(e) ||
    /^fe[89ab][0-9a-f]:/.test(e)
  )
    return !0;
  return PRIVATE_DNS_SUFFIXES.some((o) => e.endsWith(o));
}
const getServerUrl_2 = getServerUrl; //@ cross-chunk alias

export {
  getMcpTransportTelemetryLabel,
  getMcpConfigByName,
  unaddableTransportReason,
  doesEnterpriseMcpConfigExist,
  zXn,
  M3s,
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
  D3s,
  I3s,
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
  Kgt,
  userScopeMcpServerExists,
  suppressedConnectorsEqual,
  expandMcpPolicyPredicates,
  switchOffMcpServers,
  getSwitchedOffMcpServers,
  setMcpServerEnabledDurably,
};
