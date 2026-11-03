/**
 * services/analytics/metadata.ts
 *
 * 事件元数据：envContext、getEventMetadata、1P protobuf 格式转换、工具名/工具输入脱敏与截断、进程指标。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/analytics/metadata.ts
 * pieces: chunk-18hwfzwa.js (1), chunk-1wpnxx5r.js (1), chunk-6vnxsn99.js (1), chunk-aepeg2w5.js (137)
 * attribution: fingerprint 15, placement 83, sole-consumer 2, layout 39, file-local 1
 */
import { join, basename, extname } from "path";
import { createHash, randomBytes } from "crypto";
import { getSessionEntrypoint, isTopHostSession } from "../../utils/sessionShape.js";
import {
  REMOTE_COWORK_SERVER_NAMES,
  CHROME_TOOL_NAMES,
  COMPUTER_USE_TOOL_NAMES,
  DEVICE_TOOL_NAME_SET,
  UPSTREAM_TOOL_NAME_SET,
  isReservedStdioServer,
} from "../mcp/builtinServerNames.js";
import { isClaudeInChromeMCPServer } from "../../utils/claudeInChrome/common.js";
import { isComputerUseServer } from "../../utils/computerUse/toolRendering.js";
import {
  REMOTE_DEVICES,
  derivedServerId,
  ARTIFACTS_SERVER_ID,
  CLAUDE_ARTIFACTS,
  CCR_ARTIFACTS_MCP_PATH,
} from "../mcp/firstPartyServerIds.js";
import { REMOTE_BROWSER_SERVER_NAME, isRemoteBrowserEnabled } from "../mcp/remoteBrowserServer.js";
import { isPolicyAllowed } from "../policyLimits/index.js";
import { env, getHostPlatformForAnalytics, getShellForAnalytics } from "../../utils/env.js";
import { HostScoped } from "../../utils/hostScoped.js";
import {
  getRootSession,
  isCcsTenant,
  isDiskless,
  getMcpClientsFromAccessor,
  getParentSessionId,
  getPromptId,
  getSessionId,
  getAttacherCaps,
  getRendererModeForAnalytics,
  getIsInteractive,
  getClientType,
} from "../../bootstrap/state.js";
import { normalizeNameForMCP } from "../mcp/normalization.js";
import { classifyQuerySource, querySourceFamily, normalizeAgentQuerySource } from "../api/requestHeaders.js";
import { logError } from "../../utils/log.js";
import { hashPluginId } from "../../utils/telemetry/pluginTelemetry.js";
import { jsonStringifyRaw, jsonStringify } from "../../utils/slowOperations.js";
import {
  fromSanitizer_SANITIZER_OUTPUT_ONLY,
  lit,
  mcpNameForAnalytics_GATE_EVALUATED,
  fromEnum,
  fromEnumOpt,
} from "./safeMetadata.js";
import { getHostState } from "../../utils/hostEnvironment.js";
import { buildMcpToolName, mcpInfoFromString } from "../mcp/mcpStringUtils.js";
import {
  ARTIFACT_TOOL_NAME,
  ARTIFACT_COMMENTS_TOOL_NAME,
  ARTIFACT_DATA_TOOL_NAME,
} from "../../tools/ArtifactTool/constants.js";
import {
  CLAUDE_CODE_REMOTE,
  REPO_TOOL_NAMES_WITH_ROOT,
  X_MCP_SERVER_ID,
  BF7C680D_5FDC_5EF4_B4A0_ABADB619BF0A,
  CCR_META_MCP_PATH,
} from "../mcp/ccrMetaMcp.js";
import { getCliOwnedState, firstPartyServerIdFor } from "../mcp/cliOwnedClients.js";
import { isRosyElephantEnabled } from "./growthbookGates.js";
import { startupCcrEnv } from "../../tasks/RemoteAgentTask/remoteAgentKinds.js";
import { ToolPermissionValueSchema } from "../mcp/types.js";
import { isSafeMode, getClaudeConfigDir, isEnvTruthy } from "../../utils/envUtils.js";
import { xr } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { getCcrOrigin, CCR_SESSION_BASE_PATHS, BRIDGE_DEVICE_URL_PREFIXES } from "../mcp/ccrMcpUrls.js";
import { toInfraSessionId, sessionIdBody, isSafeBridgeId } from "../../bridge/sessionIdCompat.js";
import { uniq } from "../../utils/collections.js";
import { isValidKeySegment, STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { slugifyPromptWords, shortWordSlugFromSeed } from "../../utils/words.js";
import { isStableAddressEnabled } from "../../utils/sessionAddresses.js";
import { hashSessionAddress } from "../../utils/sessionUrl.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  WORKSPACE_BASH_TOOL,
  WORKSPACE_WEB_FETCH_TOOL,
} from "../../utils/permissions/permissionRuleParser.js";
import { shortHash } from "../../utils/shortHash.js";
import {
  IOS_SIMULATOR_DISPLAY_NAME,
  ANDROID_EMULATOR_DISPLAY_NAME,
  isOfficialMcpUrl,
} from "../routines/routinesApi.js";
import { isDesignMcpUrl } from "../mcp/auth.js";
import { COMPUTER_USE_MCP_SERVER_NAME } from "../../utils/computerUse/common.js";
import {
  isOfficialMarketplaceName_3,
  parsePluginIdentifier_2,
} from "../../utils/plugins/pluginIdentifier.js";
import { isKnownProxyEndpointUrl } from "../../tools/WebFetchTool/utils.js";
import { isRemoteBrowserHttpConfig } from "../../utils/permissions/remoteBrowser.js";
import { getLoggingSafeMcpBaseUrl } from "../mcp/utils.js";
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import { truncateNormalizedText } from "./eventSerialization.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { logEvent } from "./index.js";
import { FILE_EDIT_TOOL_NAME } from "../../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { NOTEBOOK_EDIT_TOOL_NAME } from "../../tools/NotebookEditTool/constants.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";
import { SEND_USER_FILE_TOOL_NAME } from "../../tools/SendUserFileTool/prompt.js";
import { BRIEF_TOOL_NAME } from "../../tools/BriefTool/prompt.js";
import { contextKeyStorage } from "../../utils/cwd.js";
import {
  getAgentId,
  getParentSessionId as getParentSessionId_2,
  getTeamName,
  isTeammate,
} from "../../utils/teammate.js";
import { envDynamicProbe } from "../../utils/envDynamic.js";
import { linuxDistroInfo, detectVcs, getWslVersion } from "../../utils/platform.js";
import { getRepoRemoteHash } from "../../utils/git.js";
import { getCachedHead } from "../../utils/git/gitFilesystem.js";
import { getMainLoopModel } from "../../utils/model/model.js";
import { hashToolNames, hydrateMaskedIds } from "../../utils/model/modelCatalog/maskedIds.js";
import { betaHeaderValues, getModelBetas } from "../../utils/betas.js";
import { currentAuthSurface, getCurrentAuthSurface } from "./authOutcomeTelemetry.js";
import { isClaudeAISubscriber, getSubscriptionType, isConsumerPlan } from "../../utils/auth.js";
import { sampleChildMemoryPeaks } from "../../utils/telemetry/memorySummary.js";
import { getCachedAgentAnswer } from "../../utils/agentContext.js";
import { maskModelIdForTelemetry } from "../../utils/model/modelCatalog/catalogEntries.js";
import { envSessionKind } from "../../utils/concurrentSessions.js";
import { desktopEntrypointSetting, getEntrypointKind } from "../../utils/entrypointKinds.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { FIRST_PARTY_API_HOSTS } from "../../utils/model/providers.js";

//@ chunk-aepeg2w5.js:820317-820372 sole-consumer
function isRemoteDevicesBuiltinVisible() {
  let sessionEntrypoint = getSessionEntrypoint();
  return sessionEntrypoint === undefined || !REMOTE_COWORK_SERVER_NAMES.has(sessionEntrypoint);
}
//@ chunk-aepeg2w5.js:820372-820486 sole-consumer
/**
 * 内置 MCP 服务器（Chrome、computer use、远程设备、远程浏览器）的已知工具名集合。
 */
function knownToolNamesForServer(e) {
  if (isClaudeInChromeMCPServer(e)) return CHROME_TOOL_NAMES;
  if (isComputerUseServer(e)) return COMPUTER_USE_TOOL_NAMES;
  if (e === REMOTE_DEVICES && isRemoteDevicesBuiltinVisible()) return DEVICE_TOOL_NAME_SET;
  if (e === REMOTE_BROWSER_SERVER_NAME && isPolicyAllowed()) return UPSTREAM_TOOL_NAME_SET;
  return;
}
//@ chunk-aepeg2w5.js:820486-820531 fingerprint = isToolDetailsLoggingEnabled (1)
/**
 * OTEL_LOG_TOOL_DETAILS 是否开启（决定是否记录 MCP 服务器/工具名与工具输入）。
 */
function isToolDetailsLoggingEnabled() {
  return env.OTEL_LOG_TOOL_DETAILS;
}
//@ chunk-aepeg2w5.js:820531-820685 placement
/**
 * 遥测用的 MCP/插件登记：第一方插件、可记录的服务器、隐藏工具名的服务器、指标归因。
 */
class AnalyticsMcpRegistry {
  firstPartyPlugins = new Map();
  loggableMcpServers = new Set();
  toolNamesWithheldMcpServers = new Map();
  anthropicMetricAttribution = new Map();
  emittedUnredacted = false;
}
//@ chunk-aepeg2w5.js:820685-820710 placement
/**
 * 遥测用的 MCP 登记表（按宿主）：第一方插件、可记录服务器、工具名是否扣留、CCR 注入配置等，以及归因字段可见性规则。
 */
var analyticsMcpRegistrySlot = new HostScoped(() => new AnalyticsMcpRegistry());
//@ chunk-aepeg2w5.js:820710-820747 placement
function analyticsMcpRegistry() {
  return analyticsMcpRegistrySlot.of(getRootSession().host);
}
//@ chunk-aepeg2w5.js:820747-820797 placement
/**
 * 导出函数 `registerFirstPartyPlugin`：参数 e, n。
 */
function registerFirstPartyPlugin(name, marketplace) {
  analyticsMcpRegistry().firstPartyPlugins.set(name, marketplace);
}
//@ chunk-aepeg2w5.js:820797-820849 placement
function firstPartyPluginId(attributionPlugin) {
  return analyticsMcpRegistry().firstPartyPlugins.get(attributionPlugin);
}
//@ chunk-aepeg2w5.js:820849-820896 placement
/**
 * 导出函数 `markMcpServerLoggable`：参数 e。
 */
function markMcpServerLoggable(name) {
  analyticsMcpRegistry().loggableMcpServers.add(name);
}
//@ chunk-aepeg2w5.js:820896-820998 placement
/**
 * 登记某服务器的工具名不进入遥测。
 */
function withholdToolNames(e) {
  let toolNamesWithheldMcpServers = analyticsMcpRegistry().toolNamesWithheldMcpServers;
  let r = normalizeNameForMCP(e);
  let s = toolNamesWithheldMcpServers.get(r) ?? new Set();
  s.add(e);
  toolNamesWithheldMcpServers.set(r, s);
}
//@ chunk-aepeg2w5.js:820998-821130 placement
/**
 * 取消对某服务器工具名的隐藏。
 */
function releaseToolNames(e) {
  let toolNamesWithheldMcpServers = analyticsMcpRegistry().toolNamesWithheldMcpServers;
  let r = normalizeNameForMCP(e);
  let s = toolNamesWithheldMcpServers.get(r);
  if (s === undefined) return;
  s.delete(e);
  if (s.size === 0) toolNamesWithheldMcpServers.delete(r);
}
//@ chunk-aepeg2w5.js:821130-821196 placement
function withholdsToolNames(e) {
  return analyticsMcpRegistry().toolNamesWithheldMcpServers.has(normalizeNameForMCP(e));
}
//@ chunk-aepeg2w5.js:821196-821241 placement
var CUSTOM = "custom";
var THIRD_PARTY = "third-party";
var CUSTOM_2 = "custom";
//@ chunk-aepeg2w5.js:821241-821422 placement
/**
 * 生成遥测归因（agent、skill、plugin、MCP 服务器/工具）。
 */
function buildAttribution(querySource, spawnedBySkill, activeSkill, activeMcpServer, activeMcpTool) {
  try {
    let y = attributionFromQuerySource(querySource, spawnedBySkill, activeSkill);
    if (activeMcpServer) {
      let S = classifyQuerySource(querySource);
      if (S === "main" || S === "subagent") {
        y.attributionMcpServer = activeMcpServer;
        if (activeMcpTool) y.attributionMcpTool = activeMcpTool;
      }
    }
    return y;
  } catch (error) {
    logError(error);
    return {};
  }
}
//@ chunk-aepeg2w5.js:821422-821712 placement
/**
 * 按查询来源（内置/自定义 agent、主线程）生成归因字段。
 */
function attributionFromQuerySource(e, n, r) {
  if (!e) return {};
  if (e.startsWith("agent:builtin:"))
    return {
      attributionAgent: e.slice(14),
      ...skillAttribution(n),
    };
  if (e.startsWith("agent:custom:")) {
    let sliced = e.slice(13);
    return {
      attributionAgent: sliced,
      ...skillAttribution(n, querySourceFamily(sliced)),
    };
  }
  if (e.startsWith("agent:")) return skillAttribution(n);
  if (classifyQuerySource(e) === "main" && r) return skillAttribution(r);
  return {};
}
//@ chunk-aepeg2w5.js:821712-821839 placement
/**
 * 技能与所属插件的归因字段。
 */
function skillAttribution(e, sourceFamily) {
  if (!e)
    return sourceFamily
      ? {
          attributionPlugin: sourceFamily,
        }
      : {};
  let r = querySourceFamily(e) ?? sourceFamily;
  return {
    attributionSkill: e,
    ...(r && {
      attributionPlugin: r,
    }),
  };
}
//@ chunk-aepeg2w5.js:821839-822747 placement
/**
 * 按可记录性对归因字段做哈希/隐去。
 */
function redactAttribution(querySource, attribution) {
  let attribution_2 = resolveAttributionSafe(querySource, attribution);
  let s = {};
  if (attribution_2.attributionAgent !== undefined) {
    s.attributionAgent = sanitizeAttributionValue(attribution_2.attributionAgent);
    let h = metricAttributionKey(attribution.attributionAgent, attribution_2.attributionAgent, CUSTOM);
    if (h !== undefined) s.attributionAgentHash = h;
  }
  if (attribution_2.attributionSkill !== undefined) {
    s.attributionSkill = sanitizeAttributionValue(attribution_2.attributionSkill);
    let h = metricAttributionKey(attribution.attributionSkill, attribution_2.attributionSkill, THIRD_PARTY);
    if (h !== undefined) s.attributionSkillHash = h;
  }
  if (attribution_2.attributionPlugin !== undefined) {
    s.attributionPlugin = sanitizeAttributionValue(attribution_2.attributionPlugin);
    let h = metricAttributionKey(attribution.attributionPlugin, attribution_2.attributionPlugin, THIRD_PARTY);
    if (h !== undefined) s.attributionPluginHash = h;
  }
  if (attribution_2.attributionMcpServer !== undefined) {
    s.attributionMcpServer = sanitizeAttributionValue(attribution_2.attributionMcpServer);
    let h = metricAttributionKey(
      attribution.attributionMcpServer,
      attribution_2.attributionMcpServer,
      CUSTOM_2,
    );
    if (h !== undefined) s.attributionMcpServerHash = h;
  }
  if (attribution_2.attributionMcpTool !== undefined) {
    s.attributionMcpTool = sanitizeAttributionValue(attribution_2.attributionMcpTool);
    let h = metricAttributionKey(attribution.attributionMcpTool, attribution_2.attributionMcpTool, CUSTOM_2);
    if (h !== undefined) s.attributionMcpToolHash = h;
  }
  return s;
}
//@ chunk-aepeg2w5.js:822747-822819 placement
function metricAttributionKey(e, n, r) {
  if (n !== r || e === undefined || e === r) return;
  return sanitizeAttributionValue(hashPluginId(e));
}
//@ chunk-aepeg2w5.js:822819-823041 placement
/**
 * 指标归因键与不一致时的占位值。
 */
var ATTRIBUTION_KEYS = [
  "agent.name",
  "skill.name",
  "plugin.name",
  "marketplace.name",
  "mcp_server.name",
  "mcp_tool.name",
];
var ATTRIBUTION_FALLBACKS = {
  "agent.name": CUSTOM,
  "skill.name": THIRD_PARTY,
  "plugin.name": THIRD_PARTY,
  "marketplace.name": undefined,
  "mcp_server.name": CUSTOM_2,
  "mcp_tool.name": CUSTOM_2,
};
//@ chunk-aepeg2w5.js:823041-823077 placement
/**
 * 生成日志用的归因字段。
 */
function attributionForLog(querySource, attribution) {
  return attributionFor(querySource, attribution, false);
}
//@ chunk-aepeg2w5.js:823077-823113 placement
/**
 * 导出函数 `attributionWithMetrics`：参数 e, n，返回 attributionFor(e, n, !0)。
 */
function attributionWithMetrics(querySource, attribution) {
  return attributionFor(querySource, attribution, true);
}
//@ chunk-aepeg2w5.js:823113-823463 placement
/**
 * 生成归因字段（可选包含指标归因映射）。
 */
function attributionFor(e, n, r) {
  try {
    let attributionAttributes = toAttributionAttributes(resolveAttribution(e, n));
    let { attributionMcpServer, attributionMcpTool } = n;
    let S = isToolDetailsLoggingEnabled()
      ? toAttributionAttributes({
          ...n,
          attributionMcpServer: attributionMcpServer && normalizeNameForMCP(attributionMcpServer),
          attributionMcpTool:
            attributionMcpServer && attributionMcpTool && normalizeNameForMCP(attributionMcpTool),
        })
      : attributionAttributes;
    if (!r) return S;
    let w = analyticsMcpRegistry();
    let anthropicMetricAttribution = w.anthropicMetricAttribution;
    let x = attributionKeySignature(S);
    if (x !== attributionKeySignature(attributionAttributes)) w.emittedUnredacted = true;
    let P = anthropicMetricAttribution.get(x);
    anthropicMetricAttribution.set(
      x,
      P === undefined ? attributionAttributes : mergeAttribution(P, attributionAttributes),
    );
    return S;
  } catch (error) {
    logError(error);
    return {};
  }
}
//@ chunk-aepeg2w5.js:823463-823829 placement
/**
 * 给指标附加归因标签。
 */
function applyMetricAttribution(attributes) {
  let n = {};
  for (let y of ATTRIBUTION_KEYS) {
    let S = attributes[y];
    if (S !== undefined) n[y] = String(S);
  }
  if (Object.keys(n).length === 0) return attributes;
  let r = attributionKeySignature(n);
  let s;
  try {
    let y = analyticsMcpRegistry();
    if (!y.emittedUnredacted && !isToolDetailsLoggingEnabled()) return attributes;
    s = y.anthropicMetricAttribution.get(r) ?? mergeAttribution(n, {});
  } catch (error) {
    logError(error);
    s = mergeAttribution(n, {});
  }
  if (attributionKeySignature(s) === r) return attributes;
  let h = {
    ...attributes,
  };
  for (let y of ATTRIBUTION_KEYS)
    if (s[y] === undefined) delete h[y];
    else h[y] = s[y];
  return h;
}
//@ chunk-aepeg2w5.js:823829-824128 placement
/**
 * 归因对象转为 agent.name/skill.name/plugin.name 等属性。
 */
function toAttributionAttributes({
  attributionAgent,
  attributionSkill,
  attributionPlugin,
  attributionMcpServer,
  attributionMcpTool,
}) {
  let y = attributionPlugin ? firstPartyPluginId(attributionPlugin) : undefined;
  return {
    ...(attributionAgent && {
      "agent.name": attributionAgent,
    }),
    ...(attributionSkill && {
      "skill.name": attributionSkill,
    }),
    ...(attributionPlugin && {
      "plugin.name": attributionPlugin,
    }),
    ...(y && {
      "marketplace.name": y,
    }),
    ...(attributionMcpServer && {
      "mcp_server.name": attributionMcpServer,
    }),
    ...(attributionMcpTool && {
      "mcp_tool.name": attributionMcpTool,
    }),
  };
}
//@ chunk-aepeg2w5.js:824128-824230 placement
/**
 * 两组归因相同时保留，不同时用占位值。
 */
function mergeAttribution(e, n) {
  let r = {};
  for (let s of ATTRIBUTION_KEYS) {
    let h = e[s] === n[s] ? e[s] : ATTRIBUTION_FALLBACKS[s];
    if (h !== undefined) r[s] = h;
  }
  return r;
}
//@ chunk-aepeg2w5.js:824230-824274 placement
function attributionKeySignature(e) {
  return jsonStringifyRaw(ATTRIBUTION_KEYS.map((n) => e[n]));
}
//@ chunk-aepeg2w5.js:824274-824335 placement
function resolveAttributionSafe(e, n) {
  try {
    return resolveAttribution(e, n);
  } catch (error) {
    logError(error);
    return {};
  }
}
//@ chunk-aepeg2w5.js:824335-825050 placement
/**
 * 按第一方插件、可记录 MCP 服务器等规则决定归因的可见性。
 */
function resolveAttribution(e, n) {
  let { attributionAgent, attributionSkill, attributionPlugin, attributionMcpServer, attributionMcpTool } = n;
  let { firstPartyPlugins, loggableMcpServers, toolNamesWithheldMcpServers } = analyticsMcpRegistry();
  let P = {};
  if (attributionMcpServer !== undefined) {
    let F = loggableMcpServers.has(attributionMcpServer);
    P.attributionMcpServer = F ? normalizeNameForMCP(attributionMcpServer) : CUSTOM_2;
    if (attributionMcpTool !== undefined) {
      let L = F ? knownToolNamesForServer(attributionMcpServer) : undefined;
      let G =
        F &&
        !toolNamesWithheldMcpServers.has(normalizeNameForMCP(attributionMcpServer)) &&
        (L === undefined || L.has(normalizeNameForMCP(attributionMcpTool)));
      P.attributionMcpTool = G ? normalizeNameForMCP(attributionMcpTool) : CUSTOM_2;
    }
  }
  if (attributionAgent !== undefined)
    if (e?.startsWith("agent:builtin:")) P.attributionAgent = attributionAgent;
    else {
      let F = attributionPlugin !== undefined && firstPartyPlugins.has(attributionPlugin);
      P.attributionAgent = F ? attributionAgent : CUSTOM;
    }
  if (attributionPlugin !== undefined) {
    if (firstPartyPlugins.has(attributionPlugin)) {
      P.attributionPlugin = attributionPlugin;
      if (attributionSkill !== undefined) P.attributionSkill = attributionSkill;
    } else {
      P.attributionPlugin = THIRD_PARTY;
      if (attributionSkill !== undefined) P.attributionSkill = THIRD_PARTY;
    }
  } else if (attributionSkill !== undefined) P.attributionSkill = attributionSkill;
  return P;
}
//@ chunk-aepeg2w5.js:825050-825078 placement
function sanitizeAttributionValue(e) {
  return fromSanitizer_SANITIZER_OUTPUT_ONLY(e);
}
//@ chunk-aepeg2w5.js:825078-825247 placement
/**
 * 内置工具是否由 MCP 提供（返回工具名）。
 */
function builtinToolServedByMcp(e) {
  let builtinToolsServedByMcp = getHostState().builtinToolsServedByMcp;
  let mcpInfo = e.mcpInfo;
  return builtinToolsServedByMcp !== undefined &&
    mcpInfo !== undefined &&
    mcpInfo.serverName === builtinToolsServedByMcp.serverName &&
    builtinToolsServedByMcp.toolNames.has(mcpInfo.toolName)
    ? mcpInfo.toolName
    : undefined;
}
//@ chunk-aepeg2w5.js:825247-825381 placement
/**
 * 由 MCP 提供的内置工具对应的原工具名。
 */
function builtinToolNameForMcp(e) {
  let builtinToolsServedByMcp = getHostState().builtinToolsServedByMcp;
  return builtinToolsServedByMcp === undefined
    ? undefined
    : Array.from(builtinToolsServedByMcp.toolNames).find(
        (toolName) => buildMcpToolName(builtinToolsServedByMcp.serverName, toolName) === e,
      );
}
//@ chunk-aepeg2w5.js:825381-826238 placement
/**
 * Artifact MCP 工具名映射。
 */
var ARTIFACT_MCP_TOOL_NAMES = new Map([
  ["publish_version", ARTIFACT_TOOL_NAME],
  ["edit_version", ARTIFACT_TOOL_NAME],
  ["publish_files", ARTIFACT_TOOL_NAME],
  ["authorize_upload", ARTIFACT_TOOL_NAME],
  ["copy_file", ARTIFACT_TOOL_NAME],
  ["create_from_type", ARTIFACT_TOOL_NAME],
  ["list_types", ARTIFACT_TOOL_NAME],
  ["describe_type", ARTIFACT_TOOL_NAME],
  ["declare_capabilities", ARTIFACT_TOOL_NAME],
  ["describe_capabilities", ARTIFACT_TOOL_NAME],
  ["read_declaration", ARTIFACT_TOOL_NAME],
  ["get_artifact", ARTIFACT_TOOL_NAME],
  ["read_artifact", ARTIFACT_TOOL_NAME],
  ["read_shared_artifact", ARTIFACT_TOOL_NAME],
  ["list_artifacts", ARTIFACT_TOOL_NAME],
  ["delete_artifact", ARTIFACT_TOOL_NAME],
  ["pin_artifact", ARTIFACT_TOOL_NAME],
  ["unpin_artifact", ARTIFACT_TOOL_NAME],
  ["guide", ARTIFACT_TOOL_NAME],
  ["list_files", ARTIFACT_TOOL_NAME],
  ["read_file", ARTIFACT_TOOL_NAME],
  ["upload_asset", ARTIFACT_TOOL_NAME],
  ["list_assets", ARTIFACT_TOOL_NAME],
  ["read_asset", ARTIFACT_TOOL_NAME],
  ["copy_asset", ARTIFACT_TOOL_NAME],
  ["delete_asset", ARTIFACT_TOOL_NAME],
  ["read_comments", ARTIFACT_COMMENTS_TOOL_NAME],
  ["reply_comment", ARTIFACT_COMMENTS_TOOL_NAME],
  ["reply_shared_comment", ARTIFACT_COMMENTS_TOOL_NAME],
  ["resolve_comment", ARTIFACT_COMMENTS_TOOL_NAME],
  ["watch", ARTIFACT_COMMENTS_TOOL_NAME],
  ["unwatch", ARTIFACT_COMMENTS_TOOL_NAME],
  ["db_get", ARTIFACT_DATA_TOOL_NAME],
  ["db_list", ARTIFACT_DATA_TOOL_NAME],
  ["db_query", ARTIFACT_DATA_TOOL_NAME],
  ["db_write", ARTIFACT_DATA_TOOL_NAME],
  ["db_str_replace", ARTIFACT_DATA_TOOL_NAME],
  ["db_usage", ARTIFACT_DATA_TOOL_NAME],
  ["db_whoami", ARTIFACT_DATA_TOOL_NAME],
  ["db_profiles", ARTIFACT_DATA_TOOL_NAME],
  ["db_rules_get", ARTIFACT_DATA_TOOL_NAME],
]);
var ARTIFACT_TOOL_NAMES_DISKLESS = new Map([]);
//@ chunk-aepeg2w5.js:826238-826340 placement
/**
 * 按谓词过滤对象键。
 */
function filterObject(e, n) {
  let r = Object.create(null);
  for (let [key, value] of Object.entries(e)) if (n(value, key)) r[key] = value;
  return r;
}
//@ chunk-aepeg2w5.js:826340-826576 placement
/**
 * URL 查询参数是否每个只出现一次。
 */
function hasUniqueQueryParams(url, n) {
  if (url.includes("#")) return false;
  let index = url.indexOf("?");
  if (index === -1) return true;
  let sliced = url.slice(index + 1);
  if (sliced.includes(";") || /%(?![0-9A-Fa-f]{2})/.test(sliced)) return false;
  let uRLSearchParams = new URLSearchParams(sliced);
  return n.every((y) => uRLSearchParams.getAll(y).length <= 1);
}
//@ chunk-aepeg2w5.js:826576-827026 placement
/**
 * CCR 注入的 MCP 服务器路径模式（slackbot、slack-thread 等）。
 */
var CCR_INJECTED_MCP_PATHS = new Map([
  ["slackbot", /^\/v2\/ccr-sessions\/[A-Za-z0-9_-]+\/slackbot\/mcp$/],
  ["slackbot_read", /^\/v2\/ccr-sessions\/[A-Za-z0-9_-]+\/slackbot\/mcp\/read$/],
  ["ccr-slack-thread", /^\/v2\/ccr-sessions\/[A-Za-z0-9_-]+\/slack-thread\/mcp$/],
  ["teamsbot", /^\/v2\/ccr-sessions\/[A-Za-z0-9_-]+\/teamsbot\/mcp$/],
]);
var INJECTED_MCP_SERVER_NAMES = [...CCR_INJECTED_MCP_PATHS.keys()];
var INJECTED_MCP_CONFIG_KEYS = new Set([
  "type",
  "url",
  "headers",
  "tools",
  "toolPermissions",
  "request_timeout_ms",
  "timeout",
  "role",
  "alwaysLoad",
  "scope",
]);
//@ chunk-aepeg2w5.js:827026-827258 placement
/**
 * 标记 CCR 注入的 MCP 配置。
 */
function markCcrInjectedConfig(e, n, isLockedOutByOrgMcpPolicy = () => false) {
  if (e !== CLAUDE_CODE_REMOTE) {
    let h = CCR_INJECTED_MCP_PATHS.get(e);
    let y = h && isRemoteStartupMcpConfig(n);
    if (y && y.search === "" && h?.test(y.pathname)) getCliOwnedState().ccrInjectedConfigs.add(n);
    return n;
  }
  let s = ccrMetaEntryFor(n);
  if (s === undefined || isRosyElephantEnabled() || !isLockedOutByOrgMcpPolicy(e, n)) return n;
  getCliOwnedState().ccrMetaEntries.add(s);
  return s;
}
//@ chunk-aepeg2w5.js:827258-827452 placement
/**
 * 复制配置对象上的 CCR 标记。
 */
function copyCcrMarks(e, n) {
  if (typeof e === "object" && e !== null) {
    let cliOwnedState = getCliOwnedState();
    if (cliOwnedState.ccrMetaEntries.has(e)) cliOwnedState.ccrMetaEntries.add(n);
    else if (cliOwnedState.ccrInjectedConfigs.has(e)) cliOwnedState.ccrInjectedConfigs.add(n);
  }
  return copyOwnServerMarks(e, n);
}
//@ chunk-aepeg2w5.js:827452-827750 placement
/**
 * 配置替换时把“自有工具容器/回复服务器”标记复制到新配置。
 */
function copyOwnServerMarks(e, n) {
  if (
    typeof e === "object" &&
    e !== null &&
    Reflect.get(n, "type") === Reflect.get(e, "type") &&
    Reflect.get(n, "url") === Reflect.get(e, "url")
  ) {
    let cliOwnedState = getCliOwnedState();
    if (cliOwnedState.ownToolContainerConfigs.has(e)) cliOwnedState.ownToolContainerConfigs.add(n);
    if (cliOwnedState.ownReplyServerConfigs.has(e)) cliOwnedState.ownReplyServerConfigs.add(n);
  }
  return n;
}
//@ chunk-aepeg2w5.js:827750-827840 placement
/**
 * 导出函数 `isOwnToolContainerConfig`：参数 e，返回 typeof e === "object" && e !== null && ht().ownToolContainerConfigs.has(e)。
 */
function isOwnToolContainerConfig(e) {
  return typeof e === "object" && e !== null && getCliOwnedState().ownToolContainerConfigs.has(e);
}
//@ chunk-aepeg2w5.js:827840-827975 placement
/**
 * 配置是否为 CCR 注入。
 */
function isCcrInjectedConfig(e) {
  return hasCcrMeta(e)
    ? !isRosyElephantEnabled()
    : typeof e === "object" &&
        e !== null &&
        (getCliOwnedState().ccrInjectedConfigs.has(e) || getCliOwnedState().ownReplyServerConfigs.has(e));
}
//@ chunk-aepeg2w5.js:827975-828523 placement
/**
 * CCR 注入配置的主机列表。
 */
function ccrConfigHosts(config) {
  if (
    typeof config !== "object" ||
    config === null ||
    !(
      getCliOwnedState().ccrInjectedConfigs.has(config) ||
      getCliOwnedState().ownReplyServerConfigs.has(config) ||
      getCliOwnedState().ccrMetaEntries.has(config)
    ) ||
    !("url" in config) ||
    typeof config.url !== "string"
  )
    return [];
  let n = URL.parse(config.url);
  if (n === null) return [];
  let r = getCliOwnedState().ownReplyServerConfigs.has(config)
    ? [n.pathname, n.pathname.replace(/^(\/v2\/ccr-sessions\/)[^/]+/, "$1-")]
    : [n.pathname];
  return [n.hostname, "api.anthropic.com"].flatMap((s) =>
    r.map((pathname) => {
      let y = new URL(n.href);
      if (s === "api.anthropic.com") y.protocol = "https:";
      y.hostname = s;
      y.port = "";
      y.pathname = pathname;
      return y.href;
    }),
  );
}
//@ chunk-aepeg2w5.js:828523-828604 placement
/**
 * 导出函数 `hasCcrMeta`：参数 e，返回 typeof e === "object" && e !== null && ht().ccrMetaEntries.has(e)。
 */
function hasCcrMeta(e) {
  return typeof e === "object" && e !== null && getCliOwnedState().ccrMetaEntries.has(e);
}
//@ chunk-aepeg2w5.js:828604-828650 placement
function isCcrShapedConfig(e) {
  return hasCcrMeta(e) || "onlyTools" in e;
}
//@ chunk-aepeg2w5.js:828650-828719 placement
/**
 * 对 claude-code-remote 服务器只保留允许的工具。
 */
function filterRemoteRepoTools(config, n) {
  return isCcrShapedConfig(config) ? n.filter((r) => REPO_TOOL_NAMES_WITH_ROOT.includes(r.name)) : n;
}
//@ chunk-aepeg2w5.js:828719-828964 placement
/**
 * 包装 fetch：claude-code-remote 只允许仓库相关调用。
 */
function restrictRemoteRepoCalls(e, serverRef) {
  if (!isCcrShapedConfig(serverRef)) return e;
  return async (r, s) => {
    if (s?.body != null && !isAllowedRemoteRepoCall(s.body))
      throw Error(
        "claude-code-remote serves only add_repo, check_repo_access, list_repos, register_repo_root under your organization's MCP policy",
      );
    return e(r, s);
  };
}
//@ chunk-aepeg2w5.js:828964-829024 placement
var MCP_CONTROL_METHODS = ["initialize", "server/discover", "ping", "tools/list"];
//@ chunk-aepeg2w5.js:829024-829340 placement
/**
 * 请求体是否只调用允许的工具。
 */
function isAllowedRemoteRepoCall(body) {
  let n;
  try {
    n = typeof body === "string" ? JSON.parse(body) : null;
  } catch {
    return false;
  }
  return (Array.isArray(n) ? n : [n]).every((r) => {
    let caseExactKey = readCaseExactKey(r, "method");
    let caseExactKey_2 = readCaseExactKey(readCaseExactKey(r, "params"), "name");
    return caseExactKey === "tools/call"
      ? typeof caseExactKey_2 === "string" && REPO_TOOL_NAMES_WITH_ROOT.includes(caseExactKey_2)
      : caseExactKey === undefined ||
          MCP_CONTROL_METHODS.includes(caseExactKey) ||
          (typeof caseExactKey === "string" && caseExactKey.startsWith("notifications/"));
  });
}
//@ chunk-aepeg2w5.js:829340-829368 placement
var UNREADABLE_SENTINEL = Symbol("unreadable");
//@ chunk-aepeg2w5.js:829368-829518 placement
/**
 * 对象只有大小写精确的该键时取值。
 */
function readCaseExactKey(e, n) {
  return typeof e === "object" &&
    e !== null &&
    !Array.isArray(e) &&
    Object.keys(e).every((key) => key === n || key.toUpperCase().toLowerCase() !== n)
    ? e[n]
    : UNREADABLE_SENTINEL;
}
//@ chunk-aepeg2w5.js:829518-829885 placement
/**
 * 配置是否为远程会话启动时注入的 MCP。
 */
function isRemoteStartupMcpConfig(e, n = false) {
  let r = URL.parse(startupCcrEnv.atStartup ?? "");
  let s = "url" in e && typeof e.url === "string" ? URL.parse(e.url) : null;
  return env.CLAUDE_CODE_REMOTE &&
    r !== null &&
    s !== null &&
    Object.keys(e).every((key) => INJECTED_MCP_CONFIG_KEYS.has(key)) &&
    "type" in e &&
    e.type === "http" &&
    s.origin === r.origin &&
    (n ? s.origin !== "null" : s.protocol === "https:" && isFirstPartyApiHost(s.hostname)) &&
    s.username === "" &&
    s.password === "" &&
    s.hash === ""
    ? s
    : undefined;
}
//@ chunk-aepeg2w5.js:829885-829916 placement
var SAFE_MCP_KEY_RE = /^[a-zA-Z0-9_-]{1,64}$/;
//@ chunk-aepeg2w5.js:829916-829990 placement
function toolPermissionValueOrBlocked(orgMaxPermission) {
  let n = ToolPermissionValueSchema().safeParse(orgMaxPermission);
  return n.success ? n.data : "blocked";
}
//@ chunk-aepeg2w5.js:829990-831205 placement
/**
 * 生成 CCR 注入配置的元信息条目。
 */
function ccrMetaEntryFor(e) {
  let n = isRemoteStartupMcpConfig(e) && ccrMcpUrls().find(({ url }) => "url" in e && url === e.url);
  let headers = "headers" in e ? e.headers : undefined;
  let filtered = Object.entries(headers ?? {}).filter(
    ([key]) => key.toLowerCase() === X_MCP_SERVER_ID.toLowerCase(),
  );
  let tools = "tools" in e ? e.tools : undefined;
  let toolPermissions = "toolPermissions" in e ? e.toolPermissions : undefined;
  let alwaysLoad = "alwaysLoad" in e ? e.alwaysLoad : undefined;
  if (
    !startupCcrEnv.isSelfHostedRunnerChild ||
    isSafeMode() ||
    n === undefined ||
    filtered.length !== 1 ||
    filtered[0]?.[1] !== BF7C680D_5FDC_5EF4_B4A0_ABADB619BF0A ||
    ("role" in e && e.role !== undefined) ||
    (tools !== undefined && !Array.isArray(tools)) ||
    (toolPermissions !== undefined &&
      (typeof toolPermissions !== "object" ||
        toolPermissions === null ||
        Array.isArray(toolPermissions) ||
        !Object.keys(toolPermissions).every((key) => SAFE_MCP_KEY_RE.test(key)))) ||
    (alwaysLoad !== undefined && typeof alwaysLoad !== "boolean") ||
    ("scope" in e && e.scope !== "dynamic")
  )
    return;
  let w = [];
  for (let R of tools ?? []) {
    if (typeof R !== "object" || R === null || typeof R.name !== "string" || !SAFE_MCP_KEY_RE.test(R.name))
      return;
    if (!REPO_TOOL_NAMES_WITH_ROOT.includes(R.name)) continue;
    let permissionPolicy = R.permission_policy;
    w.push({
      name: R.name,
      ...((permissionPolicy === "always_ask" ||
        permissionPolicy === "always_deny" ||
        permissionPolicy === "always_allow") && {
        permission_policy: permissionPolicy,
      }),
      ...(R.org_max_permission && {
        org_max_permission: toolPermissionValueOrBlocked(R.org_max_permission),
      }),
    });
  }
  return {
    type: "http",
    url: n.url,
    headers: {
      [X_MCP_SERVER_ID]: BF7C680D_5FDC_5EF4_B4A0_ABADB619BF0A,
      "X-Session-UUID": n.sessionId,
    },
    ...(tools !== undefined && {
      tools: w,
    }),
    ...(toolPermissions !== undefined && {
      toolPermissions: xr(
        filterObject(toolPermissions, (R, x) => REPO_TOOL_NAMES_WITH_ROOT.includes(x)),
        toolPermissionValueOrBlocked,
      ),
    }),
    ...(alwaysLoad !== undefined && {
      alwaysLoad,
    }),
    ...("scope" in e && {
      scope: e.scope,
    }),
    onlyTools: REPO_TOOL_NAMES_WITH_ROOT,
  };
}
//@ chunk-aepeg2w5.js:831205-831472 placement
/**
 * 本会话 CCR MCP 服务器的可能 URL 列表。
 */
function ccrMcpUrls() {
  let ccrOrigin = getCcrOrigin();
  if (ccrOrigin === null) return [];
  return [...new Set(startupCcrEnv.ownCcrSessionIds.map(toInfraSessionId))].flatMap((r) => {
    let s = `${r}/mcp?mcp_server_id=${derivedServerId(r, CLAUDE_CODE_REMOTE)}&mcp_url=${encodeURIComponent(ccrOrigin + CCR_META_MCP_PATH)}&toolbox_mcp_server_id=${BF7C680D_5FDC_5EF4_B4A0_ABADB619BF0A}`;
    return CCR_SESSION_BASE_PATHS.map((h) => ({
      url: ccrOrigin + h + s,
      sessionId: r,
    }));
  });
}
//@ chunk-aepeg2w5.js:831472-831615 placement
/**
 * Anthropic API 主机与 CCR MCP URL 查询参数名。
 */
var ANTHROPIC_API_HOSTS = ["api.anthropic.com", "api-staging.anthropic.com", "api-pr-preview.anthropic.com"];
var CCR_MCP_QUERY_KEYS = ["toolbox_mcp_server_id", "mcp_server_id", "mcp_url"];
//@ chunk-aepeg2w5.js:831615-831707 placement
function isOwnCcrMcpServerMeta(e) {
  return isCcsTenant()
    ? startupCcrEnv.isSessionIngressUrlSet
    : e.protocol === "https:" && isFirstPartyApiHost(e.hostname);
}
//@ chunk-aepeg2w5.js:831707-832490 placement
/**
 * 是否为本会话自己的 CCR MCP 服务器。
 */
function isOwnCcrMcpServer(config) {
  if (
    !env.CLAUDE_CODE_REMOTE ||
    typeof config !== "object" ||
    config === null ||
    !("type" in config) ||
    config.type !== "http" ||
    !("url" in config) ||
    typeof config.url !== "string"
  )
    return false;
  let ccrOrigin = getCcrOrigin();
  let r = URL.parse(config.url);
  if (
    ccrOrigin === null ||
    r === null ||
    r.origin !== ccrOrigin ||
    !isOwnCcrMcpServerMeta(r) ||
    r.username !== "" ||
    r.password !== "" ||
    r.hash !== "" ||
    !hasUniqueQueryParams(config.url, CCR_MCP_QUERY_KEYS) ||
    [...r.searchParams.keys()].length !== CCR_MCP_QUERY_KEYS.length
  )
    return false;
  let found = uniq(
    startupCcrEnv.ownCcrSessionIds.flatMap((ownCcrSessionId) => [
      toInfraSessionId(ownCcrSessionId),
      ownCcrSessionId,
    ]),
  ).find((y) => CCR_SESSION_BASE_PATHS.some((S) => r.pathname === `${S}${y}/mcp`));
  if (
    found === undefined ||
    r.searchParams.get("toolbox_mcp_server_id") !== ARTIFACTS_SERVER_ID ||
    r.searchParams.get("mcp_server_id") !== derivedServerId(found, CLAUDE_ARTIFACTS)
  )
    return false;
  let h = URL.parse(r.searchParams.get("mcp_url") ?? "");
  return (
    h !== null &&
    h.protocol === "https:" &&
    h.username === "" &&
    h.password === "" &&
    h.search === "" &&
    h.hash === "" &&
    h.port === "" &&
    ANTHROPIC_API_HOSTS.includes(h.hostname) &&
    h.pathname === CCR_ARTIFACTS_MCP_PATH
  );
}
//@ chunk-aepeg2w5.js:832490-832856 placement
/**
 * 本会话的 CCR 会话 URL 列表。
 */
function buildCcrMcpProxyUrls(prefix) {
  let ccrOrigin = getCcrOrigin();
  if (ccrOrigin === null) return [];
  return [...new Set(startupCcrEnv.ownCcrSessionIds.map(sessionIdBody))].flatMap((s) => {
    let h = `${prefix}${s}`;
    let y = derivedServerId(h, REMOTE_DEVICES);
    let S =
      prefix === "session_"
        ? [y, derivedServerId(`cse_${s}`, REMOTE_DEVICES), REMOTE_DEVICES]
        : [y, REMOTE_DEVICES];
    return BRIDGE_DEVICE_URL_PREFIXES.flatMap((w) => {
      let R = `${ccrOrigin}/v2/ccr-sessions/${h}/mcp?mcp_server_id=${y}&mcp_url=${encodeURIComponent(w)}`;
      return [...S.map((x) => `${R}&toolbox_mcp_server_id=${x}`), R];
    });
  });
}
//@ chunk-aepeg2w5.js:832856-832966 placement = toCompatSessionId (0.874)
/**
 * 本进程自己的云会话 ID 前缀集合（cse_ 及已登记会话对应的前缀）。
 */
function ownSessionIdPrefixes() {
  return uniq([
    "cse_",
    ...startupCcrEnv.ownCcrSessionIds.map((ownCcrSessionId) =>
      ownCcrSessionId.startsWith("session_") ? "session_" : "cse_",
    ),
  ]);
}
//@ chunk-aepeg2w5.js:832966-833150 placement = getServerUrl (1)
/**
 * 把服务器配置的 URL 映射到受支持的远程地址变体（用于策略匹配别名）。
 */
function getServerUrl(config) {
  if (!("url" in config)) return [];
  let url = config.url;
  let mapped = ccrMcpUrls().map(({ url }) => url);
  if (!mapped.some((s) => s === url)) return [];
  return [...mapped.filter((s) => s !== url), `${getCcrOrigin()}${CCR_META_MCP_PATH}`].map((url) => ({
    ...config,
    url,
  }));
}
//@ chunk-aepeg2w5.js:833150-833416 placement
/**
 * 远程会话中该配置 URL 是否为启动时注入的 CCR 服务器。
 */
function isInjectedCcrServer(e) {
  if (
    !env.CLAUDE_CODE_REMOTE ||
    typeof e !== "object" ||
    e === null ||
    !("url" in e) ||
    typeof e.url !== "string"
  )
    return false;
  return [e.url, URL.parse(e.url)?.href ?? ""].some((n) =>
    n
      .replace(/%([0-9a-f]{2})/gi, (r, s) => String.fromCharCode(Number.parseInt(s, 16)))
      .includes(CCR_ARTIFACTS_MCP_PATH),
  );
}
//@ chunk-aepeg2w5.js:833416-833588 placement
/**
 * 自托管 runner 子进程中的动态 CCR 服务器。
 */
function isRunnerDynamicServer(config) {
  return (
    startupCcrEnv.isSelfHostedRunnerChild &&
    isOwnCcrMcpServer(config) &&
    typeof config === "object" &&
    config !== null &&
    "scope" in config &&
    config.scope === "dynamic" &&
    !("pluginSource" in config && config.pluginSource !== undefined)
  );
}
//@ chunk-aepeg2w5.js:833588-833654 placement
/**
 * 导出函数 `isSelfHostedRunnerCcrServer`：参数 e，返回 startupCcrEnv.isSelfHostedRunnerChild && isInjectedCcrServer(e) && !isRunnerDynamicServer(e)。
 */
function isSelfHostedRunnerCcrServer(e) {
  return startupCcrEnv.isSelfHostedRunnerChild && isInjectedCcrServer(e) && !isRunnerDynamicServer(e);
}
//@ chunk-aepeg2w5.js:833654-833730 placement
/**
 * 导出函数 `isOwnArtifactMcpTool`：参数 e, n，返回 !1; if (firstPartyServerIdFor(n) === ARTIFACTS_SERVER_ID) return !0; return isOwnCcrMcpServer(n)。
 */
function isOwnArtifactMcpTool(name, config) {
  if (name !== CLAUDE_ARTIFACTS) return false;
  if (firstPartyServerIdFor(config) === ARTIFACTS_SERVER_ID) return true;
  return isOwnCcrMcpServer(config);
}
//@ chunk-aepeg2w5.js:833730-834024 placement
/**
 * Artifact MCP 工具在遥测中的映射名（只在服务器为自有时）。
 */
function artifactToolNameForAnalytics(toolName) {
  let n = mcpInfoFromString(toolName);
  let r =
    n?.serverName === CLAUDE_ARTIFACTS && n.toolName !== undefined
      ? (ARTIFACT_MCP_TOOL_NAMES.get(n.toolName) ??
        (isDiskless() ? undefined : ARTIFACT_TOOL_NAMES_DISKLESS.get(n.toolName)))
      : undefined;
  if (r === undefined || getCliOwnedState().subagentBroughtOwnArtifactsServer) return;
  let filtered = (getMcpClientsFromAccessor() ?? []).filter((h) => h.name === CLAUDE_ARTIFACTS);
  return filtered.length > 0 && filtered.every((h) => isOwnArtifactMcpTool(h.name, h.config)) ? r : undefined;
}
//@ chunk-aepeg2w5.js:834319-834357 placement
/**
 * 导出函数 `jobsDir`：返回 join_11(getClaudeConfigDir(), "jobs")。
 */
function jobsDir() {
  return join(getClaudeConfigDir(), "jobs");
}
//@ chunk-aepeg2w5.js:834357-834393 placement
/**
 * 导出常量或表 `JOB_PARENT_TRANSCRIPT_FILE`：值为 ["parent-transcript.jsonl"]。
 */
var JOB_PARENT_TRANSCRIPT_FILE = ["parent-transcript.jsonl"];
//@ chunk-aepeg2w5.js:834393-834476 placement
/**
 * 导出函数 `jobStorageSpace`：参数 e, n，返回 STORAGE_SPACES.job(r, n)。
 */
function jobStorageSpace(e, n) {
  let r = basename(e);
  if (!isValidKeySegment(r) || e !== join(jobsDir(), r)) return;
  return STORAGE_SPACES.job(r, n);
}
//@ chunk-aepeg2w5.js:834564-834693 placement
/**
 * 由目录名与随机或种子短词生成会话 slug。
 */
function sessionSlug(e, sessionId) {
  let r = slugifyPromptWords(basename(e)) || "claude";
  let s = isStableAddressEnabled()
    ? shortWordSlugFromSeed(createHash("sha256").update(sessionId).digest())
    : randomBytes(1).toString("hex");
  return `${r}-${s}`;
}
//@ chunk-aepeg2w5.js:834693-834858 placement
/**
 * 会话启动方式是否沿用原会话 id。
 */
function keepsSessionId(e) {
  switch (e) {
    case "resume":
    case "remote_attach":
    case "spare_claim":
    case "hydrate":
    case "startup_custom_id":
      return true;
    case "clear":
    case "fork":
    case "cd":
      return false;
  }
}
//@ chunk-aepeg2w5.js:834858-834892 placement
/**
 * 本地任务 id 格式。
 */
var LOCAL_TASK_ID_PATTERN = /^local_[0-9a-f-]{8,72}$/;
//@ chunk-aepeg2w5.js:834892-834957 placement
/**
 * 导出函数 `isValidLocalTaskId`：参数 e，返回 typeof e === "string" && LOCAL_TASK_ID_PATTERN.test(e) ? e : void 0。
 */
function isValidLocalTaskId(hostSessionId) {
  return typeof hostSessionId === "string" && LOCAL_TASK_ID_PATTERN.test(hostSessionId)
    ? hostSessionId
    : undefined;
}
//@ chunk-aepeg2w5.js:855622-855705 placement
/**
 * 会话相关 MCP 的固定名称：anthropic/session、anthropic/sessionEndHooks 及空名称常量。
 */
var ANTHROPIC_SESSION = "anthropic/session";
var EMPTY_SESSION_NAME = "";
var ANTHROPIC_SESSIONENDHOOKS = "anthropic/sessionEndHooks";
var EMPTY_SESSION_HOOKS_NAME = "";
var MAX_INJECTED_CONFIG_BYTES = 8192;
//@ chunk-aepeg2w5.js:855705-855813 placement
/**
 * 合法的桥接会话 id 转为 {sessionId, remoteSessionId}。
 */
function parseBridgeSessionId(e) {
  return typeof e === "string" && e.length <= 128 && isSafeBridgeId(e)
    ? {
        sessionId: hashSessionAddress(e),
        remoteSessionId: e,
      }
    : undefined;
}
//@ chunk-aepeg2w5.js:855813-855836 placement
var mcpServeNamedSession = new HostScoped(() => ({}));
//@ chunk-aepeg2w5.js:855836-856073 placement
/**
 * mcp serve 调用指定会话 id 时设置事件归属。
 */
function setMcpServeSession(host, n) {
  if (n === undefined) return false;
  let bridgeSessionId = parseBridgeSessionId(n);
  if (bridgeSessionId === undefined && n !== EMPTY_SESSION_NAME)
    logForDebugging(
      `mcp serve: a call's _meta['${ANTHROPIC_SESSION}'] is not a session id, so events are logged under this process's own id`,
      {
        level: "warn",
      },
    );
  mcpServeNamedSession.of(host).named = bridgeSessionId;
  return bridgeSessionId !== undefined;
}
//@ chunk-aepeg2w5.js:856073-856110 placement
function mcpServeSessionName(host) {
  return mcpServeNamedSession.of(host).named;
}
//@ chunk-aepeg2w5.js:856110-856173 placement
/**
 * 遥测中按 MCP 工具名推断的内置工具名（Bash、WebFetch）映射与 Artifact 工具名集合。
 */
var MCP_INFERRED_TOOL_NAMES = {
  [WORKSPACE_BASH_TOOL]: "Bash",
  [WORKSPACE_WEB_FETCH_TOOL]: "WebFetch",
};
var ARTIFACT_TOOL_NAME_SET = new Set(ARTIFACT_MCP_TOOL_NAMES.values());
//@ chunk-aepeg2w5.js:856173-856216 placement
/**
 * 导出函数 `isInferredMcpToolName`：参数 e，返回 Object.hasOwn(Td, e)。
 */
function isInferredMcpToolName(e) {
  return Object.hasOwn(MCP_INFERRED_TOOL_NAMES, e);
}
//@ chunk-aepeg2w5.js:856216-856244 placement
/**
 * 遥测用工具名。
 */
function toolNameForTelemetry(e) {
  return shortHash(e);
}
//@ chunk-aepeg2w5.js:856244-856324 placement
/**
 * 导出函数 `isMcpFamilyToolName`：参数 e，返回 e === "mcp_tool" || Object.values(Td).includes(e) || qY.has(e)。
 */
function isMcpFamilyToolName(name) {
  return (
    name === "mcp_tool" ||
    Object.values(MCP_INFERRED_TOOL_NAMES).includes(name) ||
    ARTIFACT_TOOL_NAME_SET.has(name)
  );
}
//@ chunk-aepeg2w5.js:856324-856493 fingerprint = sanitizeToolNameForAnalytics (1)
/**
 * 工具名脱敏：MCP 工具（mcp__*）统一记为 mcp_tool，内置工具原样。
 */
function sanitizeToolNameForAnalytics(toolName) {
  let n = Object.hasOwn(MCP_INFERRED_TOOL_NAMES, toolName) ? MCP_INFERRED_TOOL_NAMES[toolName] : undefined;
  if (n) return fromSanitizer_SANITIZER_OUTPUT_ONLY(n);
  if (toolName.startsWith("mcp__")) {
    let r = builtinToolNameForMcp(toolName) ?? artifactToolNameForAnalytics(toolName);
    return r === undefined ? lit("mcp_tool") : fromSanitizer_SANITIZER_OUTPUT_ONLY(r);
  }
  return fromSanitizer_SANITIZER_OUTPUT_ONLY(toolName);
}
//@ chunk-aepeg2w5.js:856493-856563 layout
function sanitizeToolNameWithMcpFlag(e, n) {
  let r = sanitizeToolNameForAnalytics(e);
  return n && String(r) === e ? lit("mcp_tool") : r;
}
//@ chunk-aepeg2w5.js:856563-856699 layout
var SECURE_STORAGE_KINDS_2 = new Set([
  "keychain",
  "plaintext",
  "windows-credman",
  "keychain-with-plaintext-fallback",
  "windows-credman-with-plaintext-fallback",
]);
//@ chunk-aepeg2w5.js:856699-856761 layout
function sanitizeStorageKindForAnalytics(backendName) {
  return backendName !== undefined && SECURE_STORAGE_KINDS_2.has(backendName)
    ? fromSanitizer_SANITIZER_OUTPUT_ONLY(backendName)
    : lit("other");
}
//@ chunk-aepeg2w5.js:856761-856848 layout
function getUnknownToolAnalyticsName(toolName) {
  if (toolName.startsWith("mcp__")) return lit("mcp_tool");
  return lit("unknown_tool");
}
//@ chunk-aepeg2w5.js:856848-857094 fingerprint = mcpToolDetailsForAnalytics (1)
function mcpToolDetailsForAnalytics(toolName, mcpServerType, mcpServerBaseUrl) {
  if (!mcpServerType) return {};
  let details = extractMcpToolDetails(toolName);
  if (!details) return {};
  if (!mcpServerBaseUrl && !FIRST_PARTY_MCP_SERVERS.has(details.serverName)) return {};
  let mcpServerName = mcpNameForAnalytics_GATE_EVALUATED(details.serverName, mcpServerType);
  if (knownToolNamesForServer(details.serverName)?.has(details.mcpToolName))
    return {
      mcpServerName,
      mcpToolName: mcpNameForAnalytics_GATE_EVALUATED(details.mcpToolName, mcpServerType),
    };
  return {
    mcpServerName,
  };
}
//@ chunk-aepeg2w5.js:857094-857144 layout
function isSdkMcpServerWithDetails(e) {
  return e?.serverType === "sdk" && isTopHostSession();
}
//@ chunk-aepeg2w5.js:857144-857215 placement
var SDK_HOST_SERVER_SOURCES = {
  [IOS_SIMULATOR_DISPLAY_NAME]: "mobile_simulator_ios",
  [ANDROID_EMULATOR_DISPLAY_NAME]: "mobile_simulator_android",
};
//@ chunk-aepeg2w5.js:857215-857324 placement
/**
 * SDK 宿主内置 MCP 工具的来源映射。
 */
function sdkHostToolSource(e) {
  if (!e || !isSdkMcpServerWithDetails(e)) return;
  let { serverName } = e;
  return serverName !== undefined && Object.hasOwn(SDK_HOST_SERVER_SOURCES, serverName)
    ? SDK_HOST_SERVER_SOURCES[serverName]
    : undefined;
}
//@ chunk-aepeg2w5.js:857324-857419 placement
/**
 * 工具来源（builtin/sdk_host_builtin_mcp/mcp）。
 */
function toolSourceMetadata(mcpInfo) {
  let n = !mcpInfo ? "builtin" : isSdkMcpServerWithDetails(mcpInfo) ? "sdk_host_builtin_mcp" : "mcp";
  return {
    tool_source: fromEnum(n),
  };
}
//@ chunk-aepeg2w5.js:857419-857456 placement
/**
 * 遥测用的 agent 类型。
 */
function agentTypeForTelemetry(querySource) {
  return fromSanitizer_SANITIZER_OUTPUT_ONLY(normalizeAgentQuerySource(querySource) ?? "");
}
//@ chunk-aepeg2w5.js:857516-857681 fingerprint = isAnalyticsToolDetailsLoggingEnabled (1)
function isAnalyticsToolDetailsLoggingEnabled(mcpServerType, mcpServerBaseUrl) {
  if (process.env.CLAUDE_CODE_ENTRYPOINT === "local-agent") return true;
  if (mcpServerType === "claudeai-proxy") return true;
  if (mcpServerBaseUrl && isOfficialMcpUrl(mcpServerBaseUrl)) return true;
  if (mcpServerBaseUrl && isDesignMcpUrl(mcpServerBaseUrl)) return true;
  return false;
}
//@ chunk-aepeg2w5.js:857681-857702 layout
var FIRST_PARTY_MCP_SERVERS = new Set([COMPUTER_USE_MCP_SERVER_NAME]);
//@ chunk-aepeg2w5.js:857702-858054 layout
/**
 * 官方市场且被担保的插件远程 MCP 服务器。
 */
function isOfficialPluginServer(e) {
  if (!("pluginSource" in e) || typeof e.pluginSource !== "string") return false;
  if (!("pluginOfficialSourceVouched" in e) || e.pluginOfficialSourceVouched !== true) return false;
  if ("pluginEndpointTemplated" in e && e.pluginEndpointTemplated) return false;
  if ((e.type !== "http" && e.type !== "sse" && e.type !== "ws") || !("url" in e)) return false;
  return isOfficialMarketplaceName_3(parsePluginIdentifier_2(e.pluginSource).marketplace);
}
//@ chunk-aepeg2w5.js:858054-858314 layout = getServerUrl (1)
/**
 * isMcpServerLoggableInAnalytics：决定该服务器的工具名/详情能否进入遥测（内置、官方注册表 URL 等）。
 */
function isMcpServerLoggableInAnalytics(name, config) {
  if (config === undefined) {
    if (FIRST_PARTY_MCP_SERVERS.has(name)) return true;
    return isAnalyticsToolDetailsLoggingEnabled(undefined, undefined);
  }
  if (isReservedStdioServer(name, config)) return true;
  if ("url" in config && isKnownProxyEndpointUrl(config.url) && normalizeNameForMCP(name) === REMOTE_DEVICES)
    return true;
  if (name === REMOTE_BROWSER_SERVER_NAME && isRemoteBrowserHttpConfig(config) && isRemoteBrowserEnabled())
    return true;
  if (isAnalyticsToolDetailsLoggingEnabled(config.type, getLoggingSafeMcpBaseUrl(config))) {
    if (isOfficialPluginServer(config)) releaseToolNames(name);
    return true;
  }
  if (isOfficialPluginServer(config)) {
    withholdToolNames(name);
    return true;
  }
  return false;
}
//@ chunk-aepeg2w5.js:858314-858700 layout
/**
 * MCP 工具的遥测字段（服务器/工具名或其哈希，按可记录性）。
 */
function mcpToolAnalyticsFields(name, mcpNameLoggable) {
  let mcpToolDetails = extractMcpToolDetails(name);
  if (!mcpToolDetails) return {};
  if (!mcpNameLoggable)
    return {
      mcpServerNameHash: fromSanitizer_SANITIZER_OUTPUT_ONLY(hashPluginId(mcpToolDetails.serverName)),
      mcpToolNameHash: fromSanitizer_SANITIZER_OUTPUT_ONLY(hashPluginId(mcpToolDetails.mcpToolName)),
    };
  let mcpServerName = mcpNameForAnalytics_GATE_EVALUATED(mcpToolDetails.serverName, mcpNameLoggable);
  if (withholdsToolNames(mcpToolDetails.serverName))
    return {
      mcpServerName,
      mcpToolNameHash: fromSanitizer_SANITIZER_OUTPUT_ONLY(hashPluginId(mcpToolDetails.mcpToolName)),
    };
  let h = knownToolNamesForServer(mcpToolDetails.serverName);
  if (h !== undefined && !h.has(mcpToolDetails.mcpToolName))
    return {
      mcpServerName,
    };
  return {
    mcpServerName,
    mcpToolName: mcpNameForAnalytics_GATE_EVALUATED(mcpToolDetails.mcpToolName, mcpNameLoggable),
  };
}
//@ chunk-aepeg2w5.js:858700-858809 layout
/**
 * claude.ai 代理服务器的 mcpServerId 字段。
 */
function claudeAiServerIdField(mcpInfo) {
  if (mcpInfo?.serverType !== "claudeai-proxy" || !mcpInfo.serverId) return {};
  return {
    mcpServerId: sanitizeMarkName(mcpInfo.serverId),
  };
}
//@ chunk-aepeg2w5.js:858809-858929 layout
/**
 * 可记录的 MCP 工具名（内置服务器只记已知工具）。
 */
function loggableMcpToolName(e, n, r) {
  if (!r || withholdsToolNames(e)) return;
  let s = knownToolNamesForServer(e);
  if (s === undefined) return fromSanitizer_SANITIZER_OUTPUT_ONLY(n);
  let h = normalizeNameForMCP(n);
  return s.has(h) ? fromSanitizer_SANITIZER_OUTPUT_ONLY(h) : undefined;
}
//@ chunk-aepeg2w5.js:858929-859106 fingerprint = extractMcpToolDetails (1)
function extractMcpToolDetails(toolName) {
  if (!toolName.startsWith("mcp__")) return;
  let parts = toolName.split("__");
  if (parts.length < 3) return;
  let serverName = parts[1];
  let mcpToolName = parts.slice(2).join("__");
  if (!serverName || !mcpToolName) return;
  return {
    serverName,
    mcpToolName,
  };
}
//@ chunk-aepeg2w5.js:859106-859241 fingerprint = extractSkillName (1)
function extractSkillName(toolName, input) {
  if (toolName !== "Skill") return;
  if (typeof input === "object" && input !== null && "skill" in input && typeof input.skill === "string")
    return input.skill;
  return;
}
//@ chunk-aepeg2w5.js:859241-859412 layout
function extractSubagentType(toolName, input) {
  if (toolName !== "Agent" && toolName !== "Task") return;
  if (
    typeof input === "object" &&
    input !== null &&
    "subagent_type" in input &&
    typeof input.subagent_type === "string"
  )
    return input.subagent_type;
  return;
}
//@ chunk-aepeg2w5.js:859412-860389 layout
function extractToolInputDetailsForAnalytics(toolName, observableInput, mcpInfo) {
  let s = {};
  if (!isToolDetailsLoggingEnabled()) {
    if (mcpInfo && isSdkMcpServerWithDetails(mcpInfo)) {
      s.mcp_server_name = truncateNormalizedText(mcpInfo.serverName);
      s.mcp_tool_name = truncateNormalizedText(mcpInfo.toolName);
    }
    return s;
  }
  let h =
    toolName === BASH_TOOL_NAME &&
    observableInput !== null &&
    typeof observableInput === "object" &&
    "command" in observableInput &&
    typeof observableInput.command === "string";
  let y =
    toolName === WORKSPACE_BASH_TOOL &&
    observableInput !== null &&
    typeof observableInput === "object" &&
    "command" in observableInput &&
    typeof observableInput.command === "string";
  if (h) {
    let R = observableInput;
    let parts = R.command.trim().split(/\s+/);
    s.bash_command = parts[0] || "";
    s.full_command = R.command;
    if (R.timeout !== undefined) s.timeout = R.timeout;
    if (R.description !== undefined) s.description = R.description;
    if ("dangerouslyDisableSandbox" in R) s.dangerouslyDisableSandbox = R.dangerouslyDisableSandbox;
  } else if (y) {
    let R = observableInput;
    let parts = R.command.trim().split(/\s+/);
    s.bash_command = parts[0] || "";
    s.full_command = R.command;
    if (R.timeout_ms !== undefined) s.timeout = R.timeout_ms;
  }
  if (mcpInfo && isSdkMcpServerWithDetails(mcpInfo)) {
    s.mcp_server_name = truncateNormalizedText(mcpInfo.serverName);
    s.mcp_tool_name = truncateNormalizedText(mcpInfo.toolName);
  } else {
    let mcpToolDetails = extractMcpToolDetails(toolName);
    if (mcpToolDetails) {
      s.mcp_server_name = mcpToolDetails.serverName;
      s.mcp_tool_name = mcpToolDetails.mcpToolName;
    }
  }
  let skillName = extractSkillName(toolName, observableInput);
  if (skillName) s.skill_name = skillName;
  let subagentType = extractSubagentType(toolName, observableInput);
  if (subagentType) s.subagent_type = subagentType;
  return s;
}
//@ chunk-aepeg2w5.js:860389-860426 layout
/**
 * 遥测里工具输入的截断限额：字符串 512、JSON 4096、数组/键 20 项、嵌套深度 2；另有扩展名与地区信息正则。
 */
var MAX_TOOL_INPUT_STRING_CHARS = 512;
var MAX_ARRAY_ENTRIES = 128;
var MAX_TOOL_INPUT_JSON_CHARS = 4096;
var MAX_TOOL_INPUT_ITEMS = 20;
var MAX_TOOL_INPUT_DEPTH = 2;
//@ chunk-aepeg2w5.js:860426-860991 fingerprint = truncateToolInputValue (1)
/**
 * 遥测用工具输入截断：字符串 512 字、嵌套深度/数组长度受限。
 */
function truncateToolInputValue(value, depth = 0) {
  if (typeof value === "string") {
    if (value.length > MAX_TOOL_INPUT_STRING_CHARS)
      return `${value.slice(0, MAX_ARRAY_ENTRIES)}\u2026[${value.length} chars]`;
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean" || value === null || value === undefined)
    return value;
  if (depth >= MAX_TOOL_INPUT_DEPTH) return "<nested>";
  if (Array.isArray(value)) {
    let mapped = value.slice(0, MAX_TOOL_INPUT_ITEMS).map((v) => truncateToolInputValue(v, depth + 1));
    if (value.length > MAX_TOOL_INPUT_ITEMS) mapped.push(`\u2026[${value.length} items]`);
    return mapped;
  }
  if (typeof value === "object") {
    let entries = Object.entries(value).filter(([k]) => !k.startsWith("_"));
    let mapped = entries
      .slice(0, MAX_TOOL_INPUT_ITEMS)
      .map(([k, v]) => [k, truncateToolInputValue(v, depth + 1)]);
    if (entries.length > MAX_TOOL_INPUT_ITEMS) mapped.push(["\u2026", `${entries.length} keys`]);
    return Object.fromEntries(mapped);
  }
  return String(value);
}
//@ chunk-aepeg2w5.js:860991-861102 layout = extractToolInputForTelemetry (1)
function extractToolInputForTelemetry_2(input) {
  if (!isToolDetailsLoggingEnabled()) return;
  let truncated = truncateToolInputValue(input);
  let json = jsonStringify(truncated);
  if (json.length > MAX_TOOL_INPUT_JSON_CHARS)
    json = json.slice(0, MAX_TOOL_INPUT_JSON_CHARS) + "\u2026[truncated]";
  return json;
}
//@ chunk-aepeg2w5.js:861102-861112 layout
var MAX_EXTENSION_CHARS = 10;
//@ chunk-aepeg2w5.js:861112-861238 file-local
function getFileExtensionForAnalytics(filePath) {
  let ext = extname(filePath).toLowerCase();
  if (!ext || ext === ".") return;
  let extension = ext.slice(1);
  if (extension.length > MAX_EXTENSION_CHARS) return lit("other");
  return fromSanitizer_SANITIZER_OUTPUT_ONLY(extension);
}
//@ chunk-aepeg2w5.js:861238-861404 fingerprint = FILE_COMMANDS (1)
/**
 * 统计文件扩展名时识别的命令与分隔正则。
 */
var FILE_COMMANDS = new Set([
  "rm",
  "mv",
  "cp",
  "touch",
  "mkdir",
  "chmod",
  "chown",
  "cat",
  "head",
  "tail",
  "sort",
  "stat",
  "diff",
  "wc",
  "grep",
  "rg",
  "sed",
]);
var COMMAND_SEPARATOR_RE = /\s*(?:&&|\|\||[;|])\s*/;
var WHITESPACE_RE = /\s+/;
//@ chunk-aepeg2w5.js:861404-861772 layout = getFileExtensionsFromBashCommand (1)
function getFileExtensionsFromBashCommand_2(command) {
  if (!command.includes(".")) return;
  let result;
  let seen = new Set();
  for (let subcmd of command.split(COMMAND_SEPARATOR_RE)) {
    if (!subcmd) continue;
    let tokens = subcmd.split(WHITESPACE_RE);
    if (tokens.length < 2) continue;
    let firstToken = tokens[0];
    let slashIdx = firstToken.lastIndexOf("/");
    let baseCmd = slashIdx >= 0 ? firstToken.slice(slashIdx + 1) : firstToken;
    if (!FILE_COMMANDS.has(baseCmd)) continue;
    for (let i = 1; i < tokens.length; i++) {
      let arg = tokens[i];
      if (arg.charCodeAt(0) === 45) continue;
      let ext = getFileExtensionForAnalytics(arg);
      if (ext && !seen.has(ext)) {
        seen.add(ext);
        result = result ? result + "," + ext : ext;
      }
    }
  }
  if (!result) return;
  return fromSanitizer_SANITIZER_OUTPUT_ONLY(result);
}
//@ chunk-aepeg2w5.js:861772-861843 layout
var DOCUMENT_EXTENSION_RE = /\.(csv|docx?|html|json|md|od[pst]|pdf|pptx?|rtf|txt|xlsx?)\b/g;
//@ chunk-aepeg2w5.js:861843-862018 layout
/**
 * 从 shell 命令中提取文件扩展名（排序去重）。
 */
function extensionsInCommand(command) {
  if (!command.includes(".")) return;
  let n = new Set();
  for (let s of command.toLowerCase().matchAll(DOCUMENT_EXTENSION_RE)) n.add(s[1]);
  if (n.size === 0) return;
  let joined = [...n].sort().join(",");
  return fromSanitizer_SANITIZER_OUTPUT_ONLY(joined);
}
//@ chunk-aepeg2w5.js:862018-862054 layout
var MCP_COWORK_PRESENT_FILES = "mcp__cowork__present_files";
//@ chunk-aepeg2w5.js:862054-862253 layout
/**
 * 记 tengu_file_activity 事件。
 */
function logFileActivity(e) {
  logEvent("tengu_file_activity", {
    messageID: e.messageID,
    activity: fromEnum(e.activity),
    fileExtension: e.fileExtension,
    toolName: sanitizeToolNameForAnalytics(e.toolName),
    isNewFile: e.isNewFile,
    deliverChannel: fromEnumOpt(e.deliverChannel),
  });
}
//@ chunk-aepeg2w5.js:862253-862678 layout
/**
 * 对交付的文件按扩展名去重后记录文件活动。
 */
function logDeliveredFiles(e, toolName, deliverChannel, messageID) {
  let h = new Set();
  for (let y of e) {
    let S;
    if (typeof y === "string") S = y;
    else if (y && typeof y === "object" && "file_name" in y && typeof y.file_name === "string")
      S = y.file_name;
    else if (y && typeof y === "object" && "file_path" in y && typeof y.file_path === "string")
      S = y.file_path;
    else continue;
    let fileExtensionForAnalytics = getFileExtensionForAnalytics(S);
    if (h.has(fileExtensionForAnalytics)) continue;
    h.add(fileExtensionForAnalytics);
    logFileActivity({
      activity: "deliver",
      fileExtension: fileExtensionForAnalytics,
      toolName,
      isNewFile: undefined,
      deliverChannel,
      messageID,
    });
  }
}
//@ chunk-aepeg2w5.js:862678-863780 layout
/**
 * 按工具（编辑、写入、notebook、shell、artifact、发送文件等）记录文件活动遥测。
 */
function logToolFileActivity(e, observableInput, messageId) {
  if (!observableInput || typeof observableInput !== "object") return;
  let s = observableInput;
  let h = sanitizeMarkName(messageId);
  if (e === FILE_EDIT_TOOL_NAME && typeof s.file_path === "string")
    logFileActivity({
      activity: "edit",
      fileExtension: getFileExtensionForAnalytics(s.file_path),
      toolName: e,
      isNewFile: s.old_string === "",
      deliverChannel: undefined,
      messageID: h,
    });
  else if (e === FILE_WRITE_TOOL_NAME && typeof s.file_path === "string")
    logFileActivity({
      activity: "write",
      fileExtension: getFileExtensionForAnalytics(s.file_path),
      toolName: e,
      isNewFile: undefined,
      deliverChannel: undefined,
      messageID: h,
    });
  else if (e === NOTEBOOK_EDIT_TOOL_NAME && typeof s.notebook_path === "string")
    logFileActivity({
      activity: "notebook_edit",
      fileExtension: getFileExtensionForAnalytics(s.notebook_path),
      toolName: e,
      isNewFile: false,
      deliverChannel: undefined,
      messageID: h,
    });
  else if (
    (e === BASH_TOOL_NAME || e === WORKSPACE_BASH_TOOL || e === POWERSHELL_TOOL_NAME) &&
    typeof s.command === "string"
  ) {
    let y = extensionsInCommand(s.command);
    if (y)
      for (let S of y.split(","))
        logFileActivity({
          activity: "bash_mention",
          fileExtension: fromSanitizer_SANITIZER_OUTPUT_ONLY(S),
          toolName: e,
          isNewFile: undefined,
          deliverChannel: undefined,
          messageID: h,
        });
  } else if (e === ARTIFACT_TOOL_NAME && typeof s.file_path === "string")
    logDeliveredFiles([s.file_path], e, "artifact", h);
  else if (e === MCP_COWORK_PRESENT_FILES && Array.isArray(s.files))
    logDeliveredFiles(s.files, e, "cowork_present_files", h);
  else if (e === SEND_USER_FILE_TOOL_NAME && Array.isArray(s.files))
    logDeliveredFiles(s.files, e, "send_user_file", h);
  else if (e === BRIEF_TOOL_NAME && Array.isArray(s.attachments))
    logDeliveredFiles(s.attachments, e, "brief", h);
}
//@ chunk-aepeg2w5.js:863780-864019 layout = isMedia (1)
function isMedia(block) {
  if (!block) return 0;
  let n = 0;
  for (let r of block) {
    if (r.type !== "user" && r.type !== "assistant") continue;
    let content = r.message.content;
    if (!Array.isArray(content)) continue;
    for (let h of content) if (h.type === "document" || h.type === "image") n += jsonStringify(h).length;
  }
  return n;
}
//@ chunk-aepeg2w5.js:864019-864229 layout
var VERSION_STRING_RE =
  /^\d{1,8}\.\d{1,8}\.\d{1,8}(?!\d)(-(?:dev|alpha|beta|rc|test|nightly|engine|aot|byoc|gateway|ccs)(?![A-Za-z_-])\d{0,8}(?![A-Za-z0-9_-])(?:\.(?:\d{1,8}|t\d{6}|sha[0-9a-f]{1,40})(?![A-Za-z0-9_-])){0,4})?/;
//@ chunk-aepeg2w5.js:864229-864370 layout
/**
 * 版本字符串规范化（不合格式为 other，空为 none）。
 */
function sanitizeVersion(e) {
  if (e == null) return lit("none");
  if (typeof e !== "string") return lit("other");
  let match = e.match(VERSION_STRING_RE);
  if (match) return fromSanitizer_SANITIZER_OUTPUT_ONLY(match[0]);
  return lit("other");
}
//@ chunk-aepeg2w5.js:864370-864705 layout
var KNOWN_PLATFORMS = new Set([
  "darwin",
  "linux",
  "win32",
  "freebsd",
  "openbsd",
  "netbsd",
  "android",
  "aix",
  "sunos",
  "cygwin",
  "haiku",
  "macos",
  "windows",
  "wsl",
  "unknown",
  "darwin-x64",
  "darwin-arm64",
  "win32-x64",
  "win32-arm64",
  "linux-x64",
  "linux-arm64",
  "linux-x64-musl",
  "linux-arm64-musl",
  "linux-x64-android",
  "linux-arm64-android",
  "freebsd-x64",
  "freebsd-arm64",
]);
//@ chunk-aepeg2w5.js:864705-864792 layout
/**
 * 导出函数 `platformOrOther`：参数 e，返回 lit("none"); if (KNOWN_PLATFORMS.has(e)) return fromSanitizer_SANITIZER_OUTPUT_ONLY(e); return lit("other")。
 */
function platformOrOther(platform) {
  if (platform == null) return lit("none");
  if (KNOWN_PLATFORMS.has(platform)) return fromSanitizer_SANITIZER_OUTPUT_ONLY(platform);
  return lit("other");
}
//@ chunk-aepeg2w5.js:864792-864837 layout
var LOCALE_RE = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})?$/;
//@ chunk-aepeg2w5.js:864837-864906 layout
/**
 * 导出函数 `localeOrNonconforming`：参数 e，返回 fromSanitizer_SANITIZER_OUTPUT_ONLY(e); return lit("nonconforming")。
 */
function localeOrNonconforming(e) {
  if (LOCALE_RE.test(e)) return fromSanitizer_SANITIZER_OUTPUT_ONLY(e);
  return lit("nonconforming");
}
//@ chunk-aepeg2w5.js:864906-865361 fingerprint = getAgentIdentification (0.874)
function getAgentIdentification() {
  let agentContext = contextKeyStorage.getStore();
  if (agentContext) {
    let result = {
      agentId: agentContext.agentId,
      parentSessionId: agentContext.parentSessionId,
      agentType: agentContext.agentType,
    };
    if (agentContext.parentAgentId) result.parentAgentId = agentContext.parentAgentId;
    if (agentContext.agentType === "teammate") result.teamName = agentContext.teamName;
    return result;
  }
  let agentId = getAgentId();
  let parentSessionId = getParentSessionId_2();
  let teamName = getTeamName();
  let agentType = isTeammate() ? "teammate" : agentId ? "standalone" : undefined;
  if (agentId || agentType || parentSessionId || teamName)
    return {
      ...(agentId && {
        agentId,
      }),
      ...(agentType && {
        agentType,
      }),
      ...(parentSessionId && {
        parentSessionId,
      }),
      ...(teamName && {
        teamName,
      }),
    };
  let stateParentSessionId = getParentSessionId();
  if (stateParentSessionId)
    return {
      parentSessionId: stateParentSessionId,
    };
  return {};
}
//@ chunk-aepeg2w5.js:865361-865926 layout
function getVersionBase() {
  let match = {
    ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
    PACKAGE_URL: "@anthropic-ai/claude-code",
    README_URL: "https://code.claude.com/docs/en/overview",
    VERSION: "2.1.316",
    FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
    BUILD_TIME: "2026-10-30T23:28:13Z",
    GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
    HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
    DD_SOURCEMAP_GROUP: "default",
  }.VERSION.match(/^\d+\.\d+\.\d+(?:-[a-z]+)?/);
  return match ? match[0] : undefined;
}
//@ chunk-aepeg2w5.js:865926-868471 fingerprint = buildEnvContext (0.806)
/**
 * 构造环境上下文（进程内缓存）：platform/platformRaw/arch/nodeVersion/terminal/shell/包管理器/运行时/是否 CI/远程/GitHub Action、版本与构建时间、部署环境、WSL、Linux 发行版、VCS。
 */
async function buildEnvContext() {
  let e = isDiskless();
  let n = e ? undefined : await detectEnvToolchain();
  return {
    platform: getHostPlatformForAnalytics(),
    platformRaw: process.env.CLAUDE_CODE_HOST_PLATFORM || "linux",
    arch: env.arch,
    nodeVersion: env.nodeVersion,
    terminal: e ? null : envDynamicProbe.terminal,
    shell: e ? "none" : getShellForAnalytics(),
    packageManagers: n?.packageManagers.join(","),
    runtimes: n?.runtimes.join(","),
    isRunningWithBun: env.isRunningWithBun(),
    isCi: isEnvTruthy(false),
    isClaubbit: env.CLAUBBIT,
    isClaudeCodeRemote: isEnvTruthy(process.env.CLAUDE_CODE_REMOTE),
    isLocalAgentMode: process.env.CLAUDE_CODE_ENTRYPOINT === "local-agent",
    isConductor: env.isConductor(),
    ...(process.env.CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE && {
      remoteEnvironmentType: process.env.CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE,
    }),
    ...{},
    ...(process.env.CLAUDE_CODE_CONTAINER_ID && {
      claudeCodeContainerId: process.env.CLAUDE_CODE_CONTAINER_ID,
    }),
    ...(process.env.CLAUDE_CODE_REMOTE_SESSION_ID && {
      claudeCodeRemoteSessionId: process.env.CLAUDE_CODE_REMOTE_SESSION_ID,
    }),
    ...(process.env.CLAUDE_CODE_TAGS && {
      tags: process.env.CLAUDE_CODE_TAGS,
    }),
    isGithubAction: isEnvTruthy(process.env.GITHUB_ACTIONS),
    isClaudeCodeAction: isEnvTruthy(process.env.CLAUDE_CODE_ACTION),
    version: {
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.316",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-10-30T23:28:13Z",
      GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.VERSION,
    versionBase: getVersionBase(),
    buildTime: {
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.316",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-10-30T23:28:13Z",
      GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.BUILD_TIME,
    deploymentEnvironment: n?.deploymentEnvironment,
    ...(isEnvTruthy(process.env.GITHUB_ACTIONS) && {
      githubEventName: process.env.GITHUB_EVENT_NAME,
      githubActionsRunnerEnvironment: process.env.RUNNER_ENVIRONMENT,
      githubActionsRunnerOs: process.env.RUNNER_OS,
      githubActionRef: process.env.GITHUB_ACTION_PATH?.includes("claude-code-action/")
        ? process.env.GITHUB_ACTION_PATH.split("claude-code-action/")[1]
        : undefined,
    }),
    ...(n?.wslVersion && {
      wslVersion: n.wslVersion,
    }),
    ...n?.linuxDistroInfo,
    ...(n &&
      n.vcs.length > 0 && {
        vcs: n.vcs.join(","),
      }),
  };
}
//@ chunk-aepeg2w5.js:868471-868708 layout
/**
 * 探测运行环境工具链：包管理器、运行时、Linux 发行版信息、VCS 类型（envContext 用）。
 */
async function detectEnvToolchain() {
  let [e, n, r, s] = await Promise.all([
    env.getPackageManagers(),
    env.getRuntimes(),
    linuxDistroInfo(),
    detectVcs(),
  ]);
  return {
    packageManagers: e,
    runtimes: n,
    linuxDistroInfo: r,
    vcs: s,
    deploymentEnvironment: env.detectDeploymentEnvironment(),
    wslVersion: getWslVersion(),
  };
}
//@ chunk-aepeg2w5.js:868708-868747 layout
async function getRepoHashForAnalytics() {
  return await getRepoRemoteHash();
}
//@ chunk-aepeg2w5.js:868747-868786 layout
async function getHeadShaForAnalytics() {
  return await getCachedHead();
}
//@ chunk-aepeg2w5.js:868786-868890 layout
class EventMetadataState {
  envContext = undefined;
  prevCpuUsage = null;
  prevWallTimeMs = null;
  memPeaks = {
    rss: 0,
    heapUsed: 0,
    external: 0,
  };
}
//@ chunk-aepeg2w5.js:868890-868915 layout
var eventMetadataStateByHost = new HostScoped(() => new EventMetadataState());
//@ chunk-aepeg2w5.js:868915-868966 layout
function getMemoryPeaks() {
  return {
    ...eventMetadataStateByHost.of(getRootSession().host).memPeaks,
  };
}
//@ chunk-aepeg2w5.js:868966-869590 fingerprint = buildProcessMetrics (0.833)
/**
 * 进程指标：RSS、堆、CPU 使用差值、内存峰值等。
 */
function buildProcessMetrics(e) {
  let { memPeaks } = e;
  try {
    let mem = process.memoryUsage();
    if (mem.rss > memPeaks.rss) memPeaks.rss = mem.rss;
    if (mem.heapUsed > memPeaks.heapUsed) memPeaks.heapUsed = mem.heapUsed;
    if (mem.external > memPeaks.external) memPeaks.external = mem.external;
    let cpu = process.cpuUsage();
    let now = Date.now();
    let cpuPercent;
    let cpuWindowMs;
    let { prevCpuUsage, prevWallTimeMs } = e;
    if (prevCpuUsage && prevWallTimeMs) {
      let wallDeltaMs = now - prevWallTimeMs;
      if (wallDeltaMs > 0) {
        let userDeltaUs = cpu.user - prevCpuUsage.user;
        let systemDeltaUs = cpu.system - prevCpuUsage.system;
        cpuPercent = ((userDeltaUs + systemDeltaUs) / (wallDeltaMs * 1000)) * 100;
        cpuWindowMs = wallDeltaMs;
      }
    }
    e.prevCpuUsage = cpu;
    e.prevWallTimeMs = now;
    return {
      uptime: process.uptime(),
      rss: mem.rss,
      heapTotal: mem.heapTotal,
      heapUsed: mem.heapUsed,
      external: mem.external,
      arrayBuffers: mem.arrayBuffers,
      constrainedMemory: process.constrainedMemory(),
      cpuUsage: cpu,
      cpuPercent,
      cpuWindowMs,
    };
  } catch {
    return;
  }
}
//@ chunk-aepeg2w5.js:869590-869597 layout
var currentEventModel;
//@ chunk-aepeg2w5.js:869597-869658 layout
function withEventModel(currentModel, n) {
  let r = currentEventModel;
  currentEventModel = currentModel;
  try {
    return n();
  } finally {
    currentEventModel = r;
  }
}
//@ chunk-aepeg2w5.js:869658-871072 fingerprint = getEventMetadata (0.64)
/**
 * 构造每个事件附带的元数据：model、sessionId、userType=external、betas、envContext、isClaudeAiAuth、entrypoint、sessionKind、agentSdkVersion、isInteractive、clientType、processMetrics、SWE-bench id、agent 标识、subscriptionType、rh（仓库哈希）、head_sha（消费者计划）、promptId 等。
 */
async function getEventMetadata(options = {}) {
  let n = options.model ? String(options.model) : (currentEventModel ?? getMainLoopModel());
  let betas =
    typeof options.betas === "string" ? options.betas : hashToolNames(betaHeaderValues(getModelBetas(n)));
  let processMetrics = getPromptId();
  let h = currentAuthSurface();
  let currentAuthSurface_2 = getCurrentAuthSurface();
  let S = false;
  let w = isClaudeAISubscriber();
  let plan = getSubscriptionType();
  let sessionId = getSessionId();
  let rootSession = getRootSession();
  let F = mcpServeSessionName(rootSession.host);
  let L = isDiskless();
  let G = !L && ((w && plan !== null && isConsumerPlan(plan)) || false);
  let j = eventMetadataStateByHost.of(rootSession.host);
  j.envContext ??= buildEnvContext();
  let [ee, q, Q, , , re] = await Promise.all([
    j.envContext,
    L ? undefined : getRepoHashForAnalytics(),
    L ? undefined : getHeadShaForAnalytics(),
    hydrateMaskedIds(),
    L ? undefined : sampleChildMemoryPeaks(),
    G ? getCachedAgentAnswer(rootSession, sessionId) : undefined,
  ]);
  let model = maskModelIdForTelemetry(n);
  let processMetrics_2 = L ? undefined : buildProcessMetrics(j);
  let ae = envSessionKind();
  let ie = ae ? (getAttacherCaps() ? "1" : "0") : undefined;
  let rendererModeForAnalytics = getRendererModeForAnalytics();
  let CLAUDE_AGENT_SDK_VERSION = env.CLAUDE_AGENT_SDK_VERSION;
  let fe = desktopEntrypointSetting();
  return {
    model,
    sessionId: F?.sessionId ?? sessionId,
    userType: "external",
    ...(betas.length > 0 && {
      betas,
    }),
    envContext: F
      ? {
          ...ee,
          claudeCodeRemoteSessionId: F.remoteSessionId,
        }
      : ee,
    isClaudeAiAuth: w,
    ...(process.env.CLAUDE_CODE_ENTRYPOINT && {
      entrypoint: getEntrypointKind() ?? "other",
    }),
    ...(ae && {
      sessionKind: ae,
    }),
    ...(ie && {
      hasAttacher: ie,
    }),
    ...(CLAUDE_AGENT_SDK_VERSION && {
      agentSdkVersion:
        CLAUDE_AGENT_SDK_VERSION === "unknown" ? "unknown" : sanitizeVersion(CLAUDE_AGENT_SDK_VERSION),
    }),
    ...(fe && {
      desktopAppVersion: sanitizeVersion(fe),
    }),
    isInteractive: String(getIsInteractive()),
    clientType: getClientType(),
    ...(processMetrics_2 && {
      processMetrics: processMetrics_2,
    }),
    sweBenchRunId: process.env.SWE_BENCH_RUN_ID || "",
    sweBenchInstanceId: process.env.SWE_BENCH_INSTANCE_ID || "",
    sweBenchTaskId: process.env.SWE_BENCH_TASK_ID || "",
    ...getAgentIdentification(),
    ...(plan && {
      subscriptionType: plan,
    }),
    ...(q && {
      rh: q,
    }),
    ...(Q &&
      G && {
        head_sha: Q,
      }),
    ...(re !== undefined && {
      is_clean_tree_at_start: re.isCleanTree,
      changed_file_count_at_start: re.changedFileCount,
      untracked_file_count_at_start: re.untrackedFileCount,
    }),
    ...(rendererModeForAnalytics && {
      rendererMode: rendererModeForAnalytics,
    }),
    ...(h && {
      remoteControlLane: h,
    }),
    ...(currentAuthSurface_2 && {
      projectsSession: "1",
    }),
    ...{},
    ...(processMetrics && {
      promptId: processMetrics,
    }),
  };
}
//@ chunk-aepeg2w5.js:871072-874435 fingerprint = to1PEventFormat (0.865)
/**
 * 把内部事件元数据映射成 ClaudeCodeInternalEvent 字段：env（platform、arch、terminal、is_ci、version…）、core（session_id、model、user_type、betas、entrypoint、agent_id…）、process 指标 base64、其余放 additional_metadata。
 */
function to1PEventFormat(metadata, userMetadata, additionalMetadata = {}) {
  let {
    envContext,
    isClaudeAiAuth,
    processMetrics,
    rh,
    head_sha: headSha,
    is_clean_tree_at_start: isCleanTreeAtStart,
    changed_file_count_at_start: changedFileCountAtStart,
    untracked_file_count_at_start: untrackedFileCountAtStart,
    coachMode,
    observerMode,
    sessionKind,
    hasAttacher,
    rendererMode,
    remoteControlLane,
    projectsSession,
    replMode,
    subscriptionType,
    parentAgentId,
    promptId,
    desktopAppVersion,
    ...coreFields
  } = metadata;
  let env = {
    platform: envContext.platform,
    platform_raw: envContext.platformRaw,
    arch: envContext.arch,
    node_version: envContext.nodeVersion,
    terminal: envContext.terminal || "unknown",
    shell: envContext.shell,
    package_managers: envContext.packageManagers,
    runtimes: envContext.runtimes,
    is_running_with_bun: envContext.isRunningWithBun,
    is_ci: envContext.isCi,
    is_claubbit: envContext.isClaubbit,
    is_claude_code_remote: envContext.isClaudeCodeRemote,
    is_local_agent_mode: envContext.isLocalAgentMode,
    is_conductor: envContext.isConductor,
    is_github_action: envContext.isGithubAction,
    is_claude_code_action: envContext.isClaudeCodeAction,
    is_claude_ai_auth: isClaudeAiAuth,
    version: envContext.version,
    build_time: envContext.buildTime,
    deployment_environment: envContext.deploymentEnvironment,
  };
  if (envContext.remoteEnvironmentType) env.remote_environment_type = envContext.remoteEnvironmentType;
  if (envContext.claudeCodeContainerId) env.claude_code_container_id = envContext.claudeCodeContainerId;
  if (envContext.claudeCodeRemoteSessionId)
    env.claude_code_remote_session_id = envContext.claudeCodeRemoteSessionId;
  if (envContext.tags)
    env.tags = envContext.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  if (envContext.githubEventName) env.github_event_name = envContext.githubEventName;
  if (envContext.githubActionsRunnerEnvironment)
    env.github_actions_runner_environment = envContext.githubActionsRunnerEnvironment;
  if (envContext.githubActionsRunnerOs) env.github_actions_runner_os = envContext.githubActionsRunnerOs;
  if (envContext.githubActionRef) env.github_action_ref = envContext.githubActionRef;
  if (envContext.wslVersion) env.wsl_version = envContext.wslVersion;
  if (envContext.linuxDistroId) env.linux_distro_id = envContext.linuxDistroId;
  if (envContext.linuxDistroVersion) env.linux_distro_version = envContext.linuxDistroVersion;
  if (envContext.linuxKernel) env.linux_kernel = envContext.linuxKernel;
  if (envContext.vcs) env.vcs = envContext.vcs;
  if (envContext.versionBase) env.version_base = envContext.versionBase;
  let core = {
    session_id: coreFields.sessionId,
    model: coreFields.model,
    user_type: coreFields.userType,
    is_interactive: coreFields.isInteractive === "true",
    client_type: coreFields.clientType,
  };
  if (coreFields.betas) core.betas = coreFields.betas;
  if (coreFields.entrypoint) core.entrypoint = coreFields.entrypoint;
  if (coreFields.agentSdkVersion) core.agent_sdk_version = coreFields.agentSdkVersion;
  if (coreFields.sweBenchRunId) core.swe_bench_run_id = coreFields.sweBenchRunId;
  if (coreFields.sweBenchInstanceId) core.swe_bench_instance_id = coreFields.sweBenchInstanceId;
  if (coreFields.sweBenchTaskId) core.swe_bench_task_id = coreFields.sweBenchTaskId;
  if (coreFields.agentId) core.agent_id = coreFields.agentId;
  if (coreFields.parentSessionId) core.parent_session_id = coreFields.parentSessionId;
  if (coreFields.agentType) core.agent_type = coreFields.agentType;
  if (coreFields.teamName) core.team_name = coreFields.teamName;
  if (userMetadata.githubActionsMetadata) {
    let ghMeta = userMetadata.githubActionsMetadata;
    env.github_actions_metadata = {
      actor_id: ghMeta.actorId,
      repository_id: ghMeta.repositoryId,
      repository_owner_id: ghMeta.repositoryOwnerId,
    };
  }
  let auth;
  if (userMetadata.accountUuid || userMetadata.organizationUuid)
    auth = {
      account_uuid: userMetadata.accountUuid,
      organization_uuid: userMetadata.organizationUuid,
    };
  return {
    env,
    ...(processMetrics && {
      process: Buffer.from(jsonStringify(processMetrics)).toString("base64"),
    }),
    ...(auth && {
      auth,
    }),
    core,
    additional: {
      ...(rh && {
        rh,
      }),
      ...(headSha && {
        _PROTO_head_sha: headSha,
      }),
      ...(isCleanTreeAtStart !== undefined && {
        _PROTO_is_clean_tree_at_start: isCleanTreeAtStart,
      }),
      ...(changedFileCountAtStart !== undefined && {
        _PROTO_changed_file_count_at_start: changedFileCountAtStart,
      }),
      ...(untrackedFileCountAtStart !== undefined && {
        _PROTO_untracked_file_count_at_start: untrackedFileCountAtStart,
      }),
      ...(coachMode && {
        coach_mode: coachMode,
      }),
      ...(observerMode && {
        observer_mode: observerMode,
      }),
      ...(sessionKind && {
        session_kind: sessionKind,
      }),
      ...(hasAttacher && {
        has_attacher: hasAttacher,
      }),
      ...(rendererMode && {
        renderer_mode: rendererMode,
      }),
      ...(remoteControlLane && {
        remote_control_lane: remoteControlLane,
      }),
      ...(projectsSession && {
        projects_session: projectsSession,
      }),
      ...{},
      ...(subscriptionType && {
        subscription_type: subscriptionType,
      }),
      ...(parentAgentId && {
        parent_agent_id: parentAgentId,
      }),
      ...(promptId && {
        cc_prompt_id: promptId,
      }),
      ...(desktopAppVersion && {
        desktop_app_version: desktopAppVersion,
      }),
      ...additionalMetadata,
    },
  };
}
//@ chunk-18hwfzwa.js:1743869-1743938 fingerprint = extractToolInputForTelemetry (1)
function extractToolInputForTelemetry(h, x) {
  return h.length <= x ? h : `${truncateToLength(h, x)} \u2026[truncated]`;
}
//@ chunk-1wpnxx5r.js:920-952 placement
/**
 * 主机名是否为第一方 API 主机。
 */
function isFirstPartyApiHost(hostname) {
  return FIRST_PARTY_API_HOSTS.has(hostname);
}
//@ chunk-6vnxsn99.js:43721-44057 fingerprint = getFileExtensionsFromBashCommand (1)
function getFileExtensionsFromBashCommand(command, simulatedSedEditFilePath) {
  let min = Math.min(command.length, simulatedSedEditFilePath.length);
  let o = 0;
  while (o < min && command.charCodeAt(o) === simulatedSedEditFilePath.charCodeAt(o)) o++;
  o =
    o === 0
      ? 0
      : command.lastIndexOf(
          `
`,
          o - 1,
        ) + 1;
  let s = 0;
  while (
    s < min - o &&
    command.charCodeAt(command.length - 1 - s) ===
      simulatedSedEditFilePath.charCodeAt(simulatedSedEditFilePath.length - 1 - s)
  )
    s++;
  let index = command.indexOf(
    `
`,
    command.length - s,
  );
  s = s === 0 || index === -1 ? 0 : command.length - index - 1;
  return [
    command.slice(o, command.length - s),
    simulatedSedEditFilePath.slice(o, simulatedSedEditFilePath.length - s),
  ];
}
export {
  builtinToolNameForMcp,
  localeOrNonconforming,
  getUnknownToolAnalyticsName,
  sanitizeToolNameForAnalytics,
  builtinToolServedByMcp,
  isToolDetailsLoggingEnabled,
  THIRD_PARTY,
  getServerUrl,
  copyCcrMarks,
  ccrConfigHosts,
  isCcrInjectedConfig,
  isOwnToolContainerConfig,
  isSelfHostedRunnerCcrServer,
  hasCcrMeta,
  agentTypeForTelemetry,
  sanitizeVersion,
  isMcpFamilyToolName,
  getEventMetadata,
  platformOrOther,
  filterObject,
  JOB_PARENT_TRANSCRIPT_FILE,
  toolNameForTelemetry,
  restrictRemoteRepoCalls,
  filterRemoteRepoTools,
  isMcpServerLoggableInAnalytics,
  isRunnerDynamicServer,
  isOwnCcrMcpServer,
  isOwnArtifactMcpTool,
  markMcpServerLoggable,
  loggableMcpToolName,
  markCcrInjectedConfig,
  copyOwnServerMarks,
  getVersionBase,
  LOCAL_TASK_ID_PATTERN,
  extractToolInputForTelemetry,
  buildAttribution,
  getMemoryPeaks,
  to1PEventFormat,
  isValidLocalTaskId,
  sessionSlug,
  keepsSessionId,
  jobStorageSpace,
  getFileExtensionsFromBashCommand,
  getFileExtensionForAnalytics,
  EMPTY_SESSION_HOOKS_NAME,
  MAX_INJECTED_CONFIG_BYTES,
  ANTHROPIC_SESSIONENDHOOKS,
  setMcpServeSession,
  EMPTY_SESSION_NAME,
  ANTHROPIC_SESSION,
  hasUniqueQueryParams,
  applyMetricAttribution,
  extractMcpToolDetails,
  registerFirstPartyPlugin,
  isInferredMcpToolName,
  sdkHostToolSource,
  sanitizeToolNameWithMcpFlag,
  claudeAiServerIdField,
  mcpToolDetailsForAnalytics,
  mcpToolAnalyticsFields,
  extractSkillName,
  extractSubagentType,
  extractToolInputDetailsForAnalytics,
  toolSourceMetadata,
  extractToolInputForTelemetry_2,
  isMedia,
  getFileExtensionsFromBashCommand_2,
  extensionsInCommand,
  logToolFileActivity,
  attributionWithMetrics,
  redactAttribution,
  attributionForLog,
  INJECTED_MCP_SERVER_NAMES,
  withEventModel,
  ownSessionIdPrefixes,
  buildCcrMcpProxyUrls,
  sanitizeStorageKindForAnalytics,
  isInjectedCcrServer,
  jobsDir,
};
