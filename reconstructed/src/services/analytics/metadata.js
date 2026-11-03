/**
 * services/analytics/metadata.ts
 *
 * 事件元数据：envContext、getEventMetadata、1P protobuf 格式转换、工具名/工具输入脱敏与截断、进程指标。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/analytics/metadata.ts
 * pieces: chunk-18hwfzwa.js (1), chunk-6vnxsn99.js (1), chunk-aepeg2w5.js (137)
 * attribution: fingerprint 15, sole-consumer 2, placement 82, layout 39, file-local 1
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
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  extname,
} from "path";
import {
  createHash,
  createHash as createHash_2,
  createHash as createHash_3,
  createHash as createHash_4,
  createHash as createHash_5,
  randomBytes,
  randomBytes as randomBytes_2,
  randomBytes as randomBytes_3,
  randomBytes as randomBytes_4,
  randomBytes as randomBytes_5,
  randomBytes as randomBytes_6,
} from "crypto";
import { getSessionEntrypoint, isTopHostSession } from "../../utils/sessionShape.js";
import { jV, CHROME_TOOL_NAMES, GV, zV, WV, isReservedStdioServer } from "../mcp/builtinServerNames.js";
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
import { classifyQuerySource, gp, normalizeAgentQuerySource } from "../api/requestHeaders.js";
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
import { ht, firstPartyServerIdFor } from "../mcp/cliOwnedClients.js";
import { Vm } from "./growthbookGates.js";
import { startupCcrEnv } from "../../tasks/RemoteAgentTask/remoteAgentKinds.js";
import { isFirstPartyApiHost } from "./_new/isFirstPartyApiHost.js";
import { ToolPermissionValueSchema } from "../mcp/types.js";
import { isSafeMode, getClaudeConfigDir, isEnvTruthy } from "../../utils/envUtils.js";
import { xr } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { getCcrOrigin, CCR_SESSION_BASE_PATHS, BRIDGE_DEVICE_URL_PREFIXES } from "../mcp/ccrMcpUrls.js";
import { toInfraSessionId, sessionIdBody, isSafeBridgeId } from "../../bridge/sessionIdCompat.js";
import { uniq } from "../../utils/collections.js";
import { isValidKeySegment, STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { slugifyPromptWords, shortWordSlugFromSeed } from "../../utils/words.js";
import { isStableAddressEnabled } from "../../utils/sessionAddresses.js";
import { ADt } from "../../utils/sessionUrl.js";
import { logForDebugging } from "../../utils/debug.js";
import { w8e, Zbr } from "../../utils/permissions/permissionRuleParser.js";
import { gn } from "../../utils/shortHash.js";
import { Aro, Cro, isOfficialMcpUrl } from "../routines/routinesApi.js";
import { isDesignMcpUrl } from "../mcp/auth.js";
import { COMPUTER_USE_MCP_SERVER_NAME } from "../../utils/computerUse/common.js";
import {
  isOfficialMarketplaceName_3,
  parsePluginIdentifier_2,
} from "../../utils/plugins/pluginIdentifier.js";
import { isKnownProxyEndpointUrl } from "../../tools/WebFetchTool/utils.js";
import { isRemoteBrowserHttpConfig } from "../../utils/permissions/remoteBrowser.js";
import { getLoggingSafeMcpBaseUrl } from "../mcp/utils.js";
import { ye } from "../../utils/startupMarks.js";
import { K6e } from "./eventSerialization.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { logEvent } from "./index.js";
import { FILE_EDIT_TOOL_NAME } from "../../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { NOTEBOOK_EDIT_TOOL_NAME } from "../../tools/NotebookEditTool/constants.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";
import { SEND_USER_FILE_TOOL_NAME } from "../../tools/SendUserFileTool/prompt.js";
import { BRIEF_TOOL_NAME } from "../../tools/BriefTool/prompt.js";
import { bgr } from "../../utils/cwd.js";
import {
  getAgentId,
  getParentSessionId as getParentSessionId_2,
  getTeamName,
  isTeammate,
} from "../../utils/teammate.js";
import { envDynamicProbe } from "../../utils/envDynamic.js";
import { Iwr, detectVcs, getWslVersion } from "../../utils/platform.js";
import { getRepoRemoteHash } from "../../utils/git.js";
import { getCachedHead } from "../../utils/git/gitFilesystem.js";
import { getMainLoopModel } from "../../utils/model/model.js";
import { hashToolNames, hydrateMaskedIds } from "../../utils/model/modelCatalog/maskedIds.js";
import { betaHeaderValues, getModelBetas } from "../../utils/betas.js";
import { aro, getCurrentAuthSurface } from "./authOutcomeTelemetry.js";
import { isClaudeAISubscriber, getSubscriptionType, isConsumerPlan } from "../../utils/auth.js";
import { Rx } from "../../utils/telemetry/memorySummary.js";
import { rP } from "../../utils/agentContext.js";
import { maskModelIdForTelemetry } from "../../utils/model/modelCatalog/catalogEntries.js";
import { envSessionKind } from "../../utils/concurrentSessions.js";
import { desktopEntrypointSetting, getEntrypointKind } from "../../utils/entrypointKinds.js";
import { truncateToLength } from "../../utils/stringUtils.js";

//@ chunk-aepeg2w5.js:820317-820372 sole-consumer
function VV() {
  let e = getSessionEntrypoint();
  return e === void 0 || !jV.has(e);
}
/**
 * 内置 MCP 服务器（Chrome、computer use、远程设备、远程浏览器）的已知工具名集合。
 */
//@ chunk-aepeg2w5.js:820372-820486 sole-consumer
function knownToolNamesForServer(e) {
  if (isClaudeInChromeMCPServer(e)) return CHROME_TOOL_NAMES;
  if (isComputerUseServer(e)) return GV;
  if (e === REMOTE_DEVICES && VV()) return zV;
  if (e === REMOTE_BROWSER_SERVER_NAME && isPolicyAllowed()) return WV;
  return;
}
/**
 * OTEL_LOG_TOOL_DETAILS 是否开启（决定是否记录 MCP 服务器/工具名与工具输入）。
 */
//@ chunk-aepeg2w5.js:820486-820531 fingerprint = isToolDetailsLoggingEnabled (1)
function isToolDetailsLoggingEnabled() {
  return env.OTEL_LOG_TOOL_DETAILS;
}
/**
 * 遥测用的 MCP/插件登记：第一方插件、可记录的服务器、隐藏工具名的服务器、指标归因。
 */
//@ chunk-aepeg2w5.js:820531-820685 placement
class AnalyticsMcpRegistry {
  firstPartyPlugins = new Map();
  loggableMcpServers = new Set();
  toolNamesWithheldMcpServers = new Map();
  anthropicMetricAttribution = new Map();
  emittedUnredacted = !1;
}
//@ chunk-aepeg2w5.js:820685-820710 placement
var YV = new HostScoped(() => new AnalyticsMcpRegistry());
//@ chunk-aepeg2w5.js:820710-820747 placement
function $n() {
  return YV.of(getRootSession().host);
}
//@ chunk-aepeg2w5.js:820747-820797 placement
function Xki(e, n) {
  $n().firstPartyPlugins.set(e, n);
}
//@ chunk-aepeg2w5.js:820797-820849 placement
function qV(e) {
  return $n().firstPartyPlugins.get(e);
}
//@ chunk-aepeg2w5.js:820849-820896 placement
function Cgr(e) {
  $n().loggableMcpServers.add(e);
}
/**
 * 登记某服务器的工具名不进入遥测。
 */
//@ chunk-aepeg2w5.js:820896-820998 placement
function withholdToolNames(e) {
  let toolNamesWithheldMcpServers = $n().toolNamesWithheldMcpServers,
    r = normalizeNameForMCP(e),
    s = toolNamesWithheldMcpServers.get(r) ?? new Set();
  (s.add(e), toolNamesWithheldMcpServers.set(r, s));
}
/**
 * 取消对某服务器工具名的隐藏。
 */
//@ chunk-aepeg2w5.js:820998-821130 placement
function releaseToolNames(e) {
  let toolNamesWithheldMcpServers = $n().toolNamesWithheldMcpServers,
    r = normalizeNameForMCP(e),
    s = toolNamesWithheldMcpServers.get(r);
  if (s === void 0) return;
  if ((s.delete(e), s.size === 0)) toolNamesWithheldMcpServers.delete(r);
}
//@ chunk-aepeg2w5.js:821130-821196 placement
function Gg(e) {
  return $n().toolNamesWithheldMcpServers.has(normalizeNameForMCP(e));
}
//@ chunk-aepeg2w5.js:821196-821241 placement
var CUSTOM = "custom",
  THIRD_PARTY = "third-party",
  CUSTOM_2 = "custom";
/**
 * 生成遥测归因（agent、skill、plugin、MCP 服务器/工具）。
 */
//@ chunk-aepeg2w5.js:821241-821422 placement
function buildAttribution(e, n, r, s, h) {
  try {
    let y = attributionFromQuerySource(e, n, r);
    if (s) {
      let S = classifyQuerySource(e);
      if (S === "main" || S === "subagent") {
        if (((y.attributionMcpServer = s), h)) y.attributionMcpTool = h;
      }
    }
    return y;
  } catch (error) {
    return (logError(error), {});
  }
}
/**
 * 按查询来源（内置/自定义 agent、主线程）生成归因字段。
 */
//@ chunk-aepeg2w5.js:821422-821712 placement
function attributionFromQuerySource(e, n, r) {
  if (!e) return {};
  if (e.startsWith("agent:builtin:")) return { attributionAgent: e.slice(14), ...skillAttribution(n) };
  if (e.startsWith("agent:custom:")) {
    let sliced = e.slice(13);
    return { attributionAgent: sliced, ...skillAttribution(n, gp(sliced)) };
  }
  if (e.startsWith("agent:")) return skillAttribution(n);
  if (classifyQuerySource(e) === "main" && r) return skillAttribution(r);
  return {};
}
/**
 * 技能与所属插件的归因字段。
 */
//@ chunk-aepeg2w5.js:821712-821839 placement
function skillAttribution(e, n) {
  if (!e) return n ? { attributionPlugin: n } : {};
  let r = gp(e) ?? n;
  return { attributionSkill: e, ...(r && { attributionPlugin: r }) };
}
/**
 * 按可记录性对归因字段做哈希/隐去。
 */
//@ chunk-aepeg2w5.js:821839-822747 placement
function redactAttribution(e, n) {
  let r = QV(e, n),
    s = {};
  if (r.attributionAgent !== void 0) {
    s.attributionAgent = jo(r.attributionAgent);
    let h = bs(n.attributionAgent, r.attributionAgent, CUSTOM);
    if (h !== void 0) s.attributionAgentHash = h;
  }
  if (r.attributionSkill !== void 0) {
    s.attributionSkill = jo(r.attributionSkill);
    let h = bs(n.attributionSkill, r.attributionSkill, THIRD_PARTY);
    if (h !== void 0) s.attributionSkillHash = h;
  }
  if (r.attributionPlugin !== void 0) {
    s.attributionPlugin = jo(r.attributionPlugin);
    let h = bs(n.attributionPlugin, r.attributionPlugin, THIRD_PARTY);
    if (h !== void 0) s.attributionPluginHash = h;
  }
  if (r.attributionMcpServer !== void 0) {
    s.attributionMcpServer = jo(r.attributionMcpServer);
    let h = bs(n.attributionMcpServer, r.attributionMcpServer, CUSTOM_2);
    if (h !== void 0) s.attributionMcpServerHash = h;
  }
  if (r.attributionMcpTool !== void 0) {
    s.attributionMcpTool = jo(r.attributionMcpTool);
    let h = bs(n.attributionMcpTool, r.attributionMcpTool, CUSTOM_2);
    if (h !== void 0) s.attributionMcpToolHash = h;
  }
  return s;
}
//@ chunk-aepeg2w5.js:822747-822819 placement
function bs(e, n, r) {
  if (n !== r || e === void 0 || e === r) return;
  return jo(hashPluginId(e));
}
/**
 * 指标归因键与不一致时的占位值。
 */
//@ chunk-aepeg2w5.js:822819-823041 placement
var ATTRIBUTION_KEYS = [
    "agent.name",
    "skill.name",
    "plugin.name",
    "marketplace.name",
    "mcp_server.name",
    "mcp_tool.name",
  ],
  ATTRIBUTION_FALLBACKS = {
    "agent.name": CUSTOM,
    "skill.name": THIRD_PARTY,
    "plugin.name": THIRD_PARTY,
    "marketplace.name": void 0,
    "mcp_server.name": CUSTOM_2,
    "mcp_tool.name": CUSTOM_2,
  };
/**
 * 生成日志用的归因字段。
 */
//@ chunk-aepeg2w5.js:823041-823077 placement
function attributionForLog(e, n) {
  return attributionFor(e, n, !1);
}
//@ chunk-aepeg2w5.js:823077-823113 placement
function Jki(e, n) {
  return attributionFor(e, n, !0);
}
/**
 * 生成归因字段（可选包含指标归因映射）。
 */
//@ chunk-aepeg2w5.js:823113-823463 placement
function attributionFor(e, n, r) {
  try {
    let s = toAttributionAttributes(resolveAttribution(e, n)),
      { attributionMcpServer: attributionMcpServer, attributionMcpTool: attributionMcpTool } = n,
      S = isToolDetailsLoggingEnabled()
        ? toAttributionAttributes({
            ...n,
            attributionMcpServer: attributionMcpServer && normalizeNameForMCP(attributionMcpServer),
            attributionMcpTool:
              attributionMcpServer && attributionMcpTool && normalizeNameForMCP(attributionMcpTool),
          })
        : s;
    if (!r) return S;
    let w = $n(),
      anthropicMetricAttribution = w.anthropicMetricAttribution,
      x = fd(S);
    if (x !== fd(s)) w.emittedUnredacted = !0;
    let P = anthropicMetricAttribution.get(x);
    return (anthropicMetricAttribution.set(x, P === void 0 ? s : mergeAttribution(P, s)), S);
  } catch (error) {
    return (logError(error), {});
  }
}
/**
 * 给指标附加归因标签。
 */
//@ chunk-aepeg2w5.js:823463-823829 placement
function applyMetricAttribution(e) {
  let n = {};
  for (let y of ATTRIBUTION_KEYS) {
    let S = e[y];
    if (S !== void 0) n[y] = String(S);
  }
  if (Object.keys(n).length === 0) return e;
  let r = fd(n),
    s;
  try {
    let y = $n();
    if (!y.emittedUnredacted && !isToolDetailsLoggingEnabled()) return e;
    s = y.anthropicMetricAttribution.get(r) ?? mergeAttribution(n, {});
  } catch (error) {
    (logError(error), (s = mergeAttribution(n, {})));
  }
  if (fd(s) === r) return e;
  let h = { ...e };
  for (let y of ATTRIBUTION_KEYS)
    if (s[y] === void 0) delete h[y];
    else h[y] = s[y];
  return h;
}
/**
 * 归因对象转为 agent.name/skill.name/plugin.name 等属性。
 */
//@ chunk-aepeg2w5.js:823829-824128 placement
function toAttributionAttributes({
  attributionAgent: attributionAgent,
  attributionSkill: attributionSkill,
  attributionPlugin: attributionPlugin,
  attributionMcpServer: attributionMcpServer,
  attributionMcpTool: attributionMcpTool,
}) {
  let y = attributionPlugin ? qV(attributionPlugin) : void 0;
  return {
    ...(attributionAgent && { "agent.name": attributionAgent }),
    ...(attributionSkill && { "skill.name": attributionSkill }),
    ...(attributionPlugin && { "plugin.name": attributionPlugin }),
    ...(y && { "marketplace.name": y }),
    ...(attributionMcpServer && { "mcp_server.name": attributionMcpServer }),
    ...(attributionMcpTool && { "mcp_tool.name": attributionMcpTool }),
  };
}
/**
 * 两组归因相同时保留，不同时用占位值。
 */
//@ chunk-aepeg2w5.js:824128-824230 placement
function mergeAttribution(e, n) {
  let r = {};
  for (let s of ATTRIBUTION_KEYS) {
    let h = e[s] === n[s] ? e[s] : ATTRIBUTION_FALLBACKS[s];
    if (h !== void 0) r[s] = h;
  }
  return r;
}
//@ chunk-aepeg2w5.js:824230-824274 placement
function fd(e) {
  return jsonStringifyRaw(ATTRIBUTION_KEYS.map((n) => e[n]));
}
//@ chunk-aepeg2w5.js:824274-824335 placement
function QV(e, n) {
  try {
    return resolveAttribution(e, n);
  } catch (error) {
    return (logError(error), {});
  }
}
/**
 * 按第一方插件、可记录 MCP 服务器等规则决定归因的可见性。
 */
//@ chunk-aepeg2w5.js:824335-825050 placement
function resolveAttribution(e, n) {
  let {
      attributionAgent: attributionAgent,
      attributionSkill: attributionSkill,
      attributionPlugin: attributionPlugin,
      attributionMcpServer: attributionMcpServer,
      attributionMcpTool: attributionMcpTool,
    } = n,
    {
      firstPartyPlugins: firstPartyPlugins,
      loggableMcpServers: loggableMcpServers,
      toolNamesWithheldMcpServers: toolNamesWithheldMcpServers,
    } = $n(),
    P = {};
  if (attributionMcpServer !== void 0) {
    let F = loggableMcpServers.has(attributionMcpServer);
    if (
      ((P.attributionMcpServer = F ? normalizeNameForMCP(attributionMcpServer) : CUSTOM_2),
      attributionMcpTool !== void 0)
    ) {
      let L = F ? knownToolNamesForServer(attributionMcpServer) : void 0,
        G =
          F &&
          !toolNamesWithheldMcpServers.has(normalizeNameForMCP(attributionMcpServer)) &&
          (L === void 0 || L.has(normalizeNameForMCP(attributionMcpTool)));
      P.attributionMcpTool = G ? normalizeNameForMCP(attributionMcpTool) : CUSTOM_2;
    }
  }
  if (attributionAgent !== void 0)
    if (e?.startsWith("agent:builtin:")) P.attributionAgent = attributionAgent;
    else {
      let F = attributionPlugin !== void 0 && firstPartyPlugins.has(attributionPlugin);
      P.attributionAgent = F ? attributionAgent : CUSTOM;
    }
  if (attributionPlugin !== void 0) {
    if (firstPartyPlugins.has(attributionPlugin)) {
      if (((P.attributionPlugin = attributionPlugin), attributionSkill !== void 0))
        P.attributionSkill = attributionSkill;
    } else if (((P.attributionPlugin = THIRD_PARTY), attributionSkill !== void 0))
      P.attributionSkill = THIRD_PARTY;
  } else if (attributionSkill !== void 0) P.attributionSkill = attributionSkill;
  return P;
}
//@ chunk-aepeg2w5.js:825050-825078 placement
function jo(e) {
  return fromSanitizer_SANITIZER_OUTPUT_ONLY(e);
}
/**
 * 内置工具是否由 MCP 提供（返回工具名）。
 */
//@ chunk-aepeg2w5.js:825078-825247 placement
function builtinToolServedByMcp(e) {
  let builtinToolsServedByMcp = getHostState().builtinToolsServedByMcp,
    mcpInfo = e.mcpInfo;
  return builtinToolsServedByMcp !== void 0 &&
    mcpInfo !== void 0 &&
    mcpInfo.serverName === builtinToolsServedByMcp.serverName &&
    builtinToolsServedByMcp.toolNames.has(mcpInfo.toolName)
    ? mcpInfo.toolName
    : void 0;
}
/**
 * 由 MCP 提供的内置工具对应的原工具名。
 */
//@ chunk-aepeg2w5.js:825247-825381 placement
function builtinToolNameForMcp(e) {
  let builtinToolsServedByMcp = getHostState().builtinToolsServedByMcp;
  return builtinToolsServedByMcp === void 0
    ? void 0
    : Array.from(builtinToolsServedByMcp.toolNames).find(
        (r) => buildMcpToolName(builtinToolsServedByMcp.serverName, r) === e,
      );
}
/**
 * Artifact MCP 工具名映射。
 */
//@ chunk-aepeg2w5.js:825381-826238 placement
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
  ]),
  SO = new Map([]);
/**
 * 按谓词过滤对象键。
 */
//@ chunk-aepeg2w5.js:826238-826340 placement
function filterObject(e, n) {
  let create = Object.create(null);
  for (let [s, h] of Object.entries(e)) if (n(h, s)) create[s] = h;
  return create;
}
/**
 * URL 查询参数是否每个只出现一次。
 */
//@ chunk-aepeg2w5.js:826340-826576 placement
function hasUniqueQueryParams(e, n) {
  if (e.includes("#")) return !1;
  let index = e.indexOf("?");
  if (index === -1) return !0;
  let sliced = e.slice(index + 1);
  if (sliced.includes(";") || /%(?![0-9A-Fa-f]{2})/.test(sliced)) return !1;
  let uRLSearchParams = new URLSearchParams(sliced);
  return n.every((y) => uRLSearchParams.getAll(y).length <= 1);
}
/**
 * CCR 注入的 MCP 服务器路径模式（slackbot、slack-thread 等）。
 */
//@ chunk-aepeg2w5.js:826576-827026 placement
var CCR_INJECTED_MCP_PATHS = new Map([
    ["slackbot", /^\/v2\/ccr-sessions\/[A-Za-z0-9_-]+\/slackbot\/mcp$/],
    ["slackbot_read", /^\/v2\/ccr-sessions\/[A-Za-z0-9_-]+\/slackbot\/mcp\/read$/],
    ["ccr-slack-thread", /^\/v2\/ccr-sessions\/[A-Za-z0-9_-]+\/slack-thread\/mcp$/],
    ["teamsbot", /^\/v2\/ccr-sessions\/[A-Za-z0-9_-]+\/teamsbot\/mcp$/],
  ]),
  Zki = [...CCR_INJECTED_MCP_PATHS.keys()],
  ZV = new Set([
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
/**
 * 标记 CCR 注入的 MCP 配置。
 */
//@ chunk-aepeg2w5.js:827026-827258 placement
function markCcrInjectedConfig(e, n, r = () => !1) {
  if (e !== CLAUDE_CODE_REMOTE) {
    let h = CCR_INJECTED_MCP_PATHS.get(e),
      y = h && isRemoteStartupMcpConfig(n);
    if (y && y.search === "" && h?.test(y.pathname)) ht().ccrInjectedConfigs.add(n);
    return n;
  }
  let s = ccrMetaEntryFor(n);
  if (s === void 0 || Vm() || !r(e, n)) return n;
  return (ht().ccrMetaEntries.add(s), s);
}
/**
 * 复制配置对象上的 CCR 标记。
 */
//@ chunk-aepeg2w5.js:827258-827452 placement
function copyCcrMarks(e, n) {
  if (typeof e === "object" && e !== null) {
    let r = ht();
    if (r.ccrMetaEntries.has(e)) r.ccrMetaEntries.add(n);
    else if (r.ccrInjectedConfigs.has(e)) r.ccrInjectedConfigs.add(n);
  }
  return copyOwnServerMarks(e, n);
}
/**
 * 配置替换时把“自有工具容器/回复服务器”标记复制到新配置。
 */
//@ chunk-aepeg2w5.js:827452-827750 placement
function copyOwnServerMarks(e, n) {
  if (
    typeof e === "object" &&
    e !== null &&
    Reflect.get(n, "type") === Reflect.get(e, "type") &&
    Reflect.get(n, "url") === Reflect.get(e, "url")
  ) {
    let r = ht();
    if (r.ownToolContainerConfigs.has(e)) r.ownToolContainerConfigs.add(n);
    if (r.ownReplyServerConfigs.has(e)) r.ownReplyServerConfigs.add(n);
  }
  return n;
}
//@ chunk-aepeg2w5.js:827750-827840 placement
function xgr(e) {
  return typeof e === "object" && e !== null && ht().ownToolContainerConfigs.has(e);
}
/**
 * 配置是否为 CCR 注入。
 */
//@ chunk-aepeg2w5.js:827840-827975 placement
function isCcrInjectedConfig(e) {
  return OPt(e)
    ? !Vm()
    : typeof e === "object" &&
        e !== null &&
        (ht().ccrInjectedConfigs.has(e) || ht().ownReplyServerConfigs.has(e));
}
/**
 * CCR 注入配置的主机列表。
 */
//@ chunk-aepeg2w5.js:827975-828523 placement
function ccrConfigHosts(e) {
  if (
    typeof e !== "object" ||
    e === null ||
    !(ht().ccrInjectedConfigs.has(e) || ht().ownReplyServerConfigs.has(e) || ht().ccrMetaEntries.has(e)) ||
    !("url" in e) ||
    typeof e.url !== "string"
  )
    return [];
  let parse = URL.parse(e.url);
  if (parse === null) return [];
  let r = ht().ownReplyServerConfigs.has(e)
    ? [parse.pathname, parse.pathname.replace(/^(\/v2\/ccr-sessions\/)[^/]+/, "$1-")]
    : [parse.pathname];
  return [parse.hostname, "api.anthropic.com"].flatMap((s) =>
    r.map((h) => {
      let y = new URL(parse.href);
      if (s === "api.anthropic.com") y.protocol = "https:";
      return ((y.hostname = s), (y.port = ""), (y.pathname = h), y.href);
    }),
  );
}
//@ chunk-aepeg2w5.js:828523-828604 placement
function OPt(e) {
  return typeof e === "object" && e !== null && ht().ccrMetaEntries.has(e);
}
//@ chunk-aepeg2w5.js:828604-828650 placement
function NO(e) {
  return OPt(e) || "onlyTools" in e;
}
/**
 * 对 claude-code-remote 服务器只保留允许的工具。
 */
//@ chunk-aepeg2w5.js:828650-828719 placement
function filterRemoteRepoTools(e, n) {
  return NO(e) ? n.filter((r) => REPO_TOOL_NAMES_WITH_ROOT.includes(r.name)) : n;
}
/**
 * 包装 fetch：claude-code-remote 只允许仓库相关调用。
 */
//@ chunk-aepeg2w5.js:828719-828964 placement
function restrictRemoteRepoCalls(e, n) {
  if (!NO(n)) return e;
  return async (r, s) => {
    if (s?.body != null && !isAllowedRemoteRepoCall(s.body))
      throw Error(
        "claude-code-remote serves only add_repo, check_repo_access, list_repos, register_repo_root under your organization's MCP policy",
      );
    return e(r, s);
  };
}
//@ chunk-aepeg2w5.js:828964-829024 placement
var tY = ["initialize", "server/discover", "ping", "tools/list"];
/**
 * 请求体是否只调用允许的工具。
 */
//@ chunk-aepeg2w5.js:829024-829340 placement
function isAllowedRemoteRepoCall(e) {
  let n;
  try {
    n = typeof e === "string" ? JSON.parse(e) : null;
  } catch {
    return !1;
  }
  return (Array.isArray(n) ? n : [n]).every((r) => {
    let s = readCaseExactKey(r, "method"),
      h = readCaseExactKey(readCaseExactKey(r, "params"), "name");
    return s === "tools/call"
      ? typeof h === "string" && REPO_TOOL_NAMES_WITH_ROOT.includes(h)
      : s === void 0 || tY.includes(s) || (typeof s === "string" && s.startsWith("notifications/"));
  });
}
//@ chunk-aepeg2w5.js:829340-829368 placement
var rY = Symbol("unreadable");
/**
 * 对象只有大小写精确的该键时取值。
 */
//@ chunk-aepeg2w5.js:829368-829518 placement
function readCaseExactKey(e, n) {
  return typeof e === "object" &&
    e !== null &&
    !Array.isArray(e) &&
    Object.keys(e).every((r) => r === n || r.toUpperCase().toLowerCase() !== n)
    ? e[n]
    : rY;
}
/**
 * 配置是否为远程会话启动时注入的 MCP。
 */
//@ chunk-aepeg2w5.js:829518-829885 placement
function isRemoteStartupMcpConfig(e, n = !1) {
  let parse = URL.parse(startupCcrEnv.atStartup ?? ""),
    s = "url" in e && typeof e.url === "string" ? URL.parse(e.url) : null;
  return env.CLAUDE_CODE_REMOTE &&
    parse !== null &&
    s !== null &&
    Object.keys(e).every((h) => ZV.has(h)) &&
    "type" in e &&
    e.type === "http" &&
    s.origin === parse.origin &&
    (n ? s.origin !== "null" : s.protocol === "https:" && isFirstPartyApiHost(s.hostname)) &&
    s.username === "" &&
    s.password === "" &&
    s.hash === ""
    ? s
    : void 0;
}
//@ chunk-aepeg2w5.js:829885-829916 placement
var vO = /^[a-zA-Z0-9_-]{1,64}$/;
//@ chunk-aepeg2w5.js:829916-829990 placement
function EO(e) {
  let safeParse = ToolPermissionValueSchema().safeParse(e);
  return safeParse.success ? safeParse.data : "blocked";
}
/**
 * 生成 CCR 注入配置的元信息条目。
 */
//@ chunk-aepeg2w5.js:829990-831205 placement
function ccrMetaEntryFor(e) {
  let n = isRemoteStartupMcpConfig(e) && ccrMcpUrls().find(({ url: url }) => "url" in e && url === e.url),
    r = "headers" in e ? e.headers : void 0,
    filtered = Object.entries(r ?? {}).filter(([R]) => R.toLowerCase() === X_MCP_SERVER_ID.toLowerCase()),
    h = "tools" in e ? e.tools : void 0,
    y = "toolPermissions" in e ? e.toolPermissions : void 0,
    S = "alwaysLoad" in e ? e.alwaysLoad : void 0;
  if (
    !startupCcrEnv.isSelfHostedRunnerChild ||
    isSafeMode() ||
    n === void 0 ||
    filtered.length !== 1 ||
    filtered[0]?.[1] !== BF7C680D_5FDC_5EF4_B4A0_ABADB619BF0A ||
    ("role" in e && e.role !== void 0) ||
    (h !== void 0 && !Array.isArray(h)) ||
    (y !== void 0 &&
      (typeof y !== "object" ||
        y === null ||
        Array.isArray(y) ||
        !Object.keys(y).every((R) => vO.test(R)))) ||
    (S !== void 0 && typeof S !== "boolean") ||
    ("scope" in e && e.scope !== "dynamic")
  )
    return;
  let w = [];
  for (let R of h ?? []) {
    if (typeof R !== "object" || R === null || typeof R.name !== "string" || !vO.test(R.name)) return;
    if (!REPO_TOOL_NAMES_WITH_ROOT.includes(R.name)) continue;
    let permission_policy = R.permission_policy;
    w.push({
      name: R.name,
      ...((permission_policy === "always_ask" ||
        permission_policy === "always_deny" ||
        permission_policy === "always_allow") && { permission_policy: permission_policy }),
      ...(R.org_max_permission && { org_max_permission: EO(R.org_max_permission) }),
    });
  }
  return {
    type: "http",
    url: n.url,
    headers: { [X_MCP_SERVER_ID]: BF7C680D_5FDC_5EF4_B4A0_ABADB619BF0A, "X-Session-UUID": n.sessionId },
    ...(h !== void 0 && { tools: w }),
    ...(y !== void 0 && {
      toolPermissions: xr(
        filterObject(y, (R, x) => REPO_TOOL_NAMES_WITH_ROOT.includes(x)),
        EO,
      ),
    }),
    ...(S !== void 0 && { alwaysLoad: S }),
    ...("scope" in e && { scope: e.scope }),
    onlyTools: REPO_TOOL_NAMES_WITH_ROOT,
  };
}
/**
 * 本会话 CCR MCP 服务器的可能 URL 列表。
 */
//@ chunk-aepeg2w5.js:831205-831472 placement
function ccrMcpUrls() {
  let e = getCcrOrigin();
  if (e === null) return [];
  return [...new Set(startupCcrEnv.ownCcrSessionIds.map(toInfraSessionId))].flatMap((r) => {
    let s = `${r}/mcp?mcp_server_id=${derivedServerId(r, CLAUDE_CODE_REMOTE)}&mcp_url=${encodeURIComponent(e + CCR_META_MCP_PATH)}&toolbox_mcp_server_id=${BF7C680D_5FDC_5EF4_B4A0_ABADB619BF0A}`;
    return CCR_SESSION_BASE_PATHS.map((h) => ({ url: e + h + s, sessionId: r }));
  });
}
/**
 * Anthropic API 主机与 CCR MCP URL 查询参数名。
 */
//@ chunk-aepeg2w5.js:831472-831615 placement
var ANTHROPIC_API_HOSTS = ["api.anthropic.com", "api-staging.anthropic.com", "api-pr-preview.anthropic.com"],
  CCR_MCP_QUERY_KEYS = ["toolbox_mcp_server_id", "mcp_server_id", "mcp_url"];
//@ chunk-aepeg2w5.js:831615-831707 placement
function sY(e) {
  return isCcsTenant()
    ? startupCcrEnv.isSessionIngressUrlSet
    : e.protocol === "https:" && isFirstPartyApiHost(e.hostname);
}
/**
 * 是否为本会话自己的 CCR MCP 服务器。
 */
//@ chunk-aepeg2w5.js:831707-832490 placement
function isOwnCcrMcpServer(e) {
  if (
    !env.CLAUDE_CODE_REMOTE ||
    typeof e !== "object" ||
    e === null ||
    !("type" in e) ||
    e.type !== "http" ||
    !("url" in e) ||
    typeof e.url !== "string"
  )
    return !1;
  let n = getCcrOrigin(),
    parse = URL.parse(e.url);
  if (
    n === null ||
    parse === null ||
    parse.origin !== n ||
    !sY(parse) ||
    parse.username !== "" ||
    parse.password !== "" ||
    parse.hash !== "" ||
    !hasUniqueQueryParams(e.url, CCR_MCP_QUERY_KEYS) ||
    [...parse.searchParams.keys()].length !== CCR_MCP_QUERY_KEYS.length
  )
    return !1;
  let found = uniq(
    startupCcrEnv.ownCcrSessionIds.flatMap((ownCcrSessionId) => [
      toInfraSessionId(ownCcrSessionId),
      ownCcrSessionId,
    ]),
  ).find((y) => CCR_SESSION_BASE_PATHS.some((S) => parse.pathname === `${S}${y}/mcp`));
  if (
    found === void 0 ||
    parse.searchParams.get("toolbox_mcp_server_id") !== ARTIFACTS_SERVER_ID ||
    parse.searchParams.get("mcp_server_id") !== derivedServerId(found, CLAUDE_ARTIFACTS)
  )
    return !1;
  let parse_2 = URL.parse(parse.searchParams.get("mcp_url") ?? "");
  return (
    parse_2 !== null &&
    parse_2.protocol === "https:" &&
    parse_2.username === "" &&
    parse_2.password === "" &&
    parse_2.search === "" &&
    parse_2.hash === "" &&
    parse_2.port === "" &&
    ANTHROPIC_API_HOSTS.includes(parse_2.hostname) &&
    parse_2.pathname === CCR_ARTIFACTS_MCP_PATH
  );
}
/**
 * 本会话的 CCR 会话 URL 列表。
 */
//@ chunk-aepeg2w5.js:832490-832856 placement
function buildCcrMcpProxyUrls(prefix) {
  let n = getCcrOrigin();
  if (n === null) return [];
  return [...new Set(startupCcrEnv.ownCcrSessionIds.map(sessionIdBody))].flatMap((s) => {
    let h = `${prefix}${s}`,
      y = derivedServerId(h, REMOTE_DEVICES),
      S =
        prefix === "session_"
          ? [y, derivedServerId(`cse_${s}`, REMOTE_DEVICES), REMOTE_DEVICES]
          : [y, REMOTE_DEVICES];
    return BRIDGE_DEVICE_URL_PREFIXES.flatMap((w) => {
      let R = `${n}/v2/ccr-sessions/${h}/mcp?mcp_server_id=${y}&mcp_url=${encodeURIComponent(w)}`;
      return [...S.map((x) => `${R}&toolbox_mcp_server_id=${x}`), R];
    });
  });
}
/**
 * 本进程自己的云会话 ID 前缀集合（cse_ 及已登记会话对应的前缀）。
 */
//@ chunk-aepeg2w5.js:832856-832966 placement = toCompatSessionId (0.874)
function ownSessionIdPrefixes() {
  return uniq([
    "cse_",
    ...startupCcrEnv.ownCcrSessionIds.map((ownCcrSessionId) =>
      ownCcrSessionId.startsWith("session_") ? "session_" : "cse_",
    ),
  ]);
}
/**
 * 把服务器配置的 URL 映射到受支持的远程地址变体（用于策略匹配别名）。
 */
//@ chunk-aepeg2w5.js:832966-833150 placement = getServerUrl (1)
function getServerUrl(config) {
  if (!("url" in config)) return [];
  let url = config.url,
    mapped = ccrMcpUrls().map(({ url: url }) => url);
  if (!mapped.some((s) => s === url)) return [];
  return [...mapped.filter((s) => s !== url), `${getCcrOrigin()}${CCR_META_MCP_PATH}`].map((s) => ({
    ...config,
    url: s,
  }));
}
/**
 * 远程会话中该配置 URL 是否为启动时注入的 CCR 服务器。
 */
//@ chunk-aepeg2w5.js:833150-833416 placement
function isInjectedCcrServer(e) {
  if (
    !env.CLAUDE_CODE_REMOTE ||
    typeof e !== "object" ||
    e === null ||
    !("url" in e) ||
    typeof e.url !== "string"
  )
    return !1;
  return [e.url, URL.parse(e.url)?.href ?? ""].some((n) =>
    n
      .replace(/%([0-9a-f]{2})/gi, (r, s) => String.fromCharCode(Number.parseInt(s, 16)))
      .includes(CCR_ARTIFACTS_MCP_PATH),
  );
}
/**
 * 自托管 runner 子进程中的动态 CCR 服务器。
 */
//@ chunk-aepeg2w5.js:833416-833588 placement
function isRunnerDynamicServer(e) {
  return (
    startupCcrEnv.isSelfHostedRunnerChild &&
    isOwnCcrMcpServer(e) &&
    typeof e === "object" &&
    e !== null &&
    "scope" in e &&
    e.scope === "dynamic" &&
    !("pluginSource" in e && e.pluginSource !== void 0)
  );
}
//@ chunk-aepeg2w5.js:833588-833654 placement
function ias(e) {
  return startupCcrEnv.isSelfHostedRunnerChild && isInjectedCcrServer(e) && !isRunnerDynamicServer(e);
}
//@ chunk-aepeg2w5.js:833654-833730 placement
function nxn(e, n) {
  if (e !== CLAUDE_ARTIFACTS) return !1;
  if (firstPartyServerIdFor(n) === ARTIFACTS_SERVER_ID) return !0;
  return isOwnCcrMcpServer(n);
}
/**
 * Artifact MCP 工具在遥测中的映射名（只在服务器为自有时）。
 */
//@ chunk-aepeg2w5.js:833730-834024 placement
function artifactToolNameForAnalytics(e) {
  let n = mcpInfoFromString(e),
    r =
      n?.serverName === CLAUDE_ARTIFACTS && n.toolName !== void 0
        ? (ARTIFACT_MCP_TOOL_NAMES.get(n.toolName) ?? (isDiskless() ? void 0 : SO.get(n.toolName)))
        : void 0;
  if (r === void 0 || ht().subagentBroughtOwnArtifactsServer) return;
  let filtered = (getMcpClientsFromAccessor() ?? []).filter((h) => h.name === CLAUDE_ARTIFACTS);
  return filtered.length > 0 && filtered.every((h) => nxn(h.name, h.config)) ? r : void 0;
}
//@ chunk-aepeg2w5.js:834319-834357 placement
function aas() {
  return join_11(getClaudeConfigDir(), "jobs");
}
//@ chunk-aepeg2w5.js:834357-834393 placement
var las = ["parent-transcript.jsonl"];
//@ chunk-aepeg2w5.js:834393-834476 placement
function Oro(e, n) {
  let r = basename_3(e);
  if (!isValidKeySegment(r) || e !== join_11(aas(), r)) return;
  return STORAGE_SPACES.job(r, n);
}
/**
 * 由目录名与随机或种子短词生成会话 slug。
 */
//@ chunk-aepeg2w5.js:834564-834693 placement
function sessionSlug(e, n) {
  let r = slugifyPromptWords(basename_4(e)) || "claude",
    s = isStableAddressEnabled()
      ? shortWordSlugFromSeed(createHash_5("sha256").update(n).digest())
      : randomBytes_6(1).toString("hex");
  return `${r}-${s}`;
}
/**
 * 会话启动方式是否沿用原会话 id。
 */
//@ chunk-aepeg2w5.js:834693-834858 placement
function keepsSessionId(e) {
  switch (e) {
    case "resume":
    case "remote_attach":
    case "spare_claim":
    case "hydrate":
    case "startup_custom_id":
      return !0;
    case "clear":
    case "fork":
    case "cd":
      return !1;
  }
}
/**
 * 本地任务 id 格式。
 */
//@ chunk-aepeg2w5.js:834858-834892 placement
var LOCAL_TASK_ID_PATTERN = /^local_[0-9a-f-]{8,72}$/;
//@ chunk-aepeg2w5.js:834892-834957 placement
function Igr(e) {
  return typeof e === "string" && LOCAL_TASK_ID_PATTERN.test(e) ? e : void 0;
}
//@ chunk-aepeg2w5.js:855622-855705 placement
var ANTHROPIC_SESSION = "anthropic/session",
  V8t = "",
  ANTHROPIC_SESSIONENDHOOKS = "anthropic/sessionEndHooks",
  gas = "",
  uTi = 8192;
/**
 * 合法的桥接会话 id 转为 {sessionId, remoteSessionId}。
 */
//@ chunk-aepeg2w5.js:855705-855813 placement
function parseBridgeSessionId(e) {
  return typeof e === "string" && e.length <= 128 && isSafeBridgeId(e)
    ? { sessionId: ADt(e), remoteSessionId: e }
    : void 0;
}
//@ chunk-aepeg2w5.js:855813-855836 placement
var iP = new HostScoped(() => ({}));
/**
 * mcp serve 调用指定会话 id 时设置事件归属。
 */
//@ chunk-aepeg2w5.js:855836-856073 placement
function setMcpServeSession(e, n) {
  if (n === void 0) return !1;
  let r = parseBridgeSessionId(n);
  if (r === void 0 && n !== V8t)
    logForDebugging(
      `mcp serve: a call's _meta['${ANTHROPIC_SESSION}'] is not a session id, so events are logged under this process's own id`,
      { level: "warn" },
    );
  return ((iP.of(e).named = r), r !== void 0);
}
//@ chunk-aepeg2w5.js:856073-856110 placement
function sP(e) {
  return iP.of(e).named;
}
//@ chunk-aepeg2w5.js:856110-856173 placement
var Td = { [w8e]: "Bash", [Zbr]: "WebFetch" },
  qY = new Set(ARTIFACT_MCP_TOOL_NAMES.values());
//@ chunk-aepeg2w5.js:856173-856216 placement
function fTi(e) {
  return Object.hasOwn(Td, e);
}
/**
 * 遥测用工具名。
 */
//@ chunk-aepeg2w5.js:856216-856244 placement
function toolNameForTelemetry(e) {
  return gn(e);
}
//@ chunk-aepeg2w5.js:856244-856324 placement
function pTi(e) {
  return e === "mcp_tool" || Object.values(Td).includes(e) || qY.has(e);
}
/**
 * 工具名脱敏：MCP 工具（mcp__*）统一记为 mcp_tool，内置工具原样。
 */
//@ chunk-aepeg2w5.js:856324-856493 fingerprint = sanitizeToolNameForAnalytics (1)
function sanitizeToolNameForAnalytics(toolName) {
  let n = Object.hasOwn(Td, toolName) ? Td[toolName] : void 0;
  if (n) return fromSanitizer_SANITIZER_OUTPUT_ONLY(n);
  if (toolName.startsWith("mcp__")) {
    let r = builtinToolNameForMcp(toolName) ?? artifactToolNameForAnalytics(toolName);
    return r === void 0 ? lit("mcp_tool") : fromSanitizer_SANITIZER_OUTPUT_ONLY(r);
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
function sanitizeStorageKindForAnalytics(e) {
  return e !== void 0 && SECURE_STORAGE_KINDS_2.has(e)
    ? fromSanitizer_SANITIZER_OUTPUT_ONLY(e)
    : lit("other");
}
//@ chunk-aepeg2w5.js:856761-856848 layout
function getUnknownToolAnalyticsName(e) {
  if (e.startsWith("mcp__")) return lit("mcp_tool");
  return lit("unknown_tool");
}
//@ chunk-aepeg2w5.js:856848-857094 fingerprint = mcpToolDetailsForAnalytics (1)
function mcpToolDetailsForAnalytics(toolName, mcpServerType, mcpServerBaseUrl) {
  if (!mcpServerType) return {};
  let details = extractMcpToolDetails(toolName);
  if (!details) return {};
  if (!mcpServerBaseUrl && !cP.has(details.serverName)) return {};
  let h = mcpNameForAnalytics_GATE_EVALUATED(details.serverName, mcpServerType);
  if (knownToolNamesForServer(details.serverName)?.has(details.mcpToolName))
    return {
      mcpServerName: h,
      mcpToolName: mcpNameForAnalytics_GATE_EVALUATED(details.mcpToolName, mcpServerType),
    };
  return { mcpServerName: h };
}
//@ chunk-aepeg2w5.js:857094-857144 layout
function isSdkMcpServerWithDetails(e) {
  return e?.serverType === "sdk" && isTopHostSession();
}
//@ chunk-aepeg2w5.js:857144-857215 placement
var aP = { [Aro]: "mobile_simulator_ios", [Cro]: "mobile_simulator_android" };
/**
 * SDK 宿主内置 MCP 工具的来源映射。
 */
//@ chunk-aepeg2w5.js:857215-857324 placement
function sdkHostToolSource(e) {
  if (!e || !isSdkMcpServerWithDetails(e)) return;
  let { serverName: serverName } = e;
  return serverName !== void 0 && Object.hasOwn(aP, serverName) ? aP[serverName] : void 0;
}
/**
 * 工具来源（builtin/sdk_host_builtin_mcp/mcp）。
 */
//@ chunk-aepeg2w5.js:857324-857419 placement
function toolSourceMetadata(e) {
  let n = !e ? "builtin" : isSdkMcpServerWithDetails(e) ? "sdk_host_builtin_mcp" : "mcp";
  return { tool_source: fromEnum(n) };
}
/**
 * 遥测用的 agent 类型。
 */
//@ chunk-aepeg2w5.js:857419-857456 placement
function agentTypeForTelemetry(e) {
  return fromSanitizer_SANITIZER_OUTPUT_ONLY(normalizeAgentQuerySource(e) ?? "");
}
//@ chunk-aepeg2w5.js:857516-857681 fingerprint = isAnalyticsToolDetailsLoggingEnabled (1)
function isAnalyticsToolDetailsLoggingEnabled(mcpServerType, mcpServerBaseUrl) {
  if (process.env.CLAUDE_CODE_ENTRYPOINT === "local-agent") return !0;
  if (mcpServerType === "claudeai-proxy") return !0;
  if (mcpServerBaseUrl && isOfficialMcpUrl(mcpServerBaseUrl)) return !0;
  if (mcpServerBaseUrl && isDesignMcpUrl(mcpServerBaseUrl)) return !0;
  return !1;
}
//@ chunk-aepeg2w5.js:857681-857702 layout
var cP = new Set([COMPUTER_USE_MCP_SERVER_NAME]);
/**
 * 官方市场且被担保的插件远程 MCP 服务器。
 */
//@ chunk-aepeg2w5.js:857702-858054 layout
function isOfficialPluginServer(e) {
  if (!("pluginSource" in e) || typeof e.pluginSource !== "string") return !1;
  if (!("pluginOfficialSourceVouched" in e) || e.pluginOfficialSourceVouched !== !0) return !1;
  if ("pluginEndpointTemplated" in e && e.pluginEndpointTemplated) return !1;
  if ((e.type !== "http" && e.type !== "sse" && e.type !== "ws") || !("url" in e)) return !1;
  return isOfficialMarketplaceName_3(parsePluginIdentifier_2(e.pluginSource).marketplace);
}
/**
 * isMcpServerLoggableInAnalytics：决定该服务器的工具名/详情能否进入遥测（内置、官方注册表 URL 等）。
 */
//@ chunk-aepeg2w5.js:858054-858314 layout = getServerUrl (1)
function isMcpServerLoggableInAnalytics(e, n) {
  if (n === void 0) {
    if (cP.has(e)) return !0;
    return isAnalyticsToolDetailsLoggingEnabled(void 0, void 0);
  }
  if (isReservedStdioServer(e, n)) return !0;
  if ("url" in n && isKnownProxyEndpointUrl(n.url) && normalizeNameForMCP(e) === REMOTE_DEVICES) return !0;
  if (e === REMOTE_BROWSER_SERVER_NAME && isRemoteBrowserHttpConfig(n) && isRemoteBrowserEnabled()) return !0;
  if (isAnalyticsToolDetailsLoggingEnabled(n.type, getLoggingSafeMcpBaseUrl(n))) {
    if (isOfficialPluginServer(n)) releaseToolNames(e);
    return !0;
  }
  if (isOfficialPluginServer(n)) return (withholdToolNames(e), !0);
  return !1;
}
/**
 * MCP 工具的遥测字段（服务器/工具名或其哈希，按可记录性）。
 */
//@ chunk-aepeg2w5.js:858314-858700 layout
function mcpToolAnalyticsFields(e, n) {
  let r = extractMcpToolDetails(e);
  if (!r) return {};
  if (!n)
    return {
      mcpServerNameHash: fromSanitizer_SANITIZER_OUTPUT_ONLY(hashPluginId(r.serverName)),
      mcpToolNameHash: fromSanitizer_SANITIZER_OUTPUT_ONLY(hashPluginId(r.mcpToolName)),
    };
  let s = mcpNameForAnalytics_GATE_EVALUATED(r.serverName, n);
  if (Gg(r.serverName))
    return {
      mcpServerName: s,
      mcpToolNameHash: fromSanitizer_SANITIZER_OUTPUT_ONLY(hashPluginId(r.mcpToolName)),
    };
  let h = knownToolNamesForServer(r.serverName);
  if (h !== void 0 && !h.has(r.mcpToolName)) return { mcpServerName: s };
  return { mcpServerName: s, mcpToolName: mcpNameForAnalytics_GATE_EVALUATED(r.mcpToolName, n) };
}
/**
 * claude.ai 代理服务器的 mcpServerId 字段。
 */
//@ chunk-aepeg2w5.js:858700-858809 layout
function claudeAiServerIdField(e) {
  if (e?.serverType !== "claudeai-proxy" || !e.serverId) return {};
  return { mcpServerId: ye(e.serverId) };
}
/**
 * 可记录的 MCP 工具名（内置服务器只记已知工具）。
 */
//@ chunk-aepeg2w5.js:858809-858929 layout
function loggableMcpToolName(e, n, r) {
  if (!r || Gg(e)) return;
  let s = knownToolNamesForServer(e);
  if (s === void 0) return fromSanitizer_SANITIZER_OUTPUT_ONLY(n);
  let h = normalizeNameForMCP(n);
  return s.has(h) ? fromSanitizer_SANITIZER_OUTPUT_ONLY(h) : void 0;
}
//@ chunk-aepeg2w5.js:858929-859106 fingerprint = extractMcpToolDetails (1)
function extractMcpToolDetails(toolName) {
  if (!toolName.startsWith("mcp__")) return;
  let parts = toolName.split("__");
  if (parts.length < 3) return;
  let serverName = parts[1],
    mcpToolName = parts.slice(2).join("__");
  if (!serverName || !mcpToolName) return;
  return { serverName: serverName, mcpToolName: mcpToolName };
}
//@ chunk-aepeg2w5.js:859106-859241 fingerprint = extractSkillName (1)
function extractSkillName(toolName, input) {
  if (toolName !== "Skill") return;
  if (typeof input === "object" && input !== null && "skill" in input && typeof input.skill === "string")
    return input.skill;
  return;
}
//@ chunk-aepeg2w5.js:859241-859412 layout
function extractSubagentType(e, n) {
  if (e !== "Agent" && e !== "Task") return;
  if (typeof n === "object" && n !== null && "subagent_type" in n && typeof n.subagent_type === "string")
    return n.subagent_type;
  return;
}
//@ chunk-aepeg2w5.js:859412-860389 layout
function extractToolInputDetailsForAnalytics(e, n, r) {
  let s = {};
  if (!isToolDetailsLoggingEnabled()) {
    if (r && isSdkMcpServerWithDetails(r))
      ((s.mcp_server_name = K6e(r.serverName)), (s.mcp_tool_name = K6e(r.toolName)));
    return s;
  }
  let h =
      e === BASH_TOOL_NAME &&
      n !== null &&
      typeof n === "object" &&
      "command" in n &&
      typeof n.command === "string",
    y = e === w8e && n !== null && typeof n === "object" && "command" in n && typeof n.command === "string";
  if (h) {
    let R = n,
      parts = R.command.trim().split(/\s+/);
    if (((s.bash_command = parts[0] || ""), (s.full_command = R.command), R.timeout !== void 0))
      s.timeout = R.timeout;
    if (R.description !== void 0) s.description = R.description;
    if ("dangerouslyDisableSandbox" in R) s.dangerouslyDisableSandbox = R.dangerouslyDisableSandbox;
  } else if (y) {
    let R = n,
      parts = R.command.trim().split(/\s+/);
    if (((s.bash_command = parts[0] || ""), (s.full_command = R.command), R.timeout_ms !== void 0))
      s.timeout = R.timeout_ms;
  }
  if (r && isSdkMcpServerWithDetails(r))
    ((s.mcp_server_name = K6e(r.serverName)), (s.mcp_tool_name = K6e(r.toolName)));
  else {
    let R = extractMcpToolDetails(e);
    if (R) ((s.mcp_server_name = R.serverName), (s.mcp_tool_name = R.mcpToolName));
  }
  let S = extractSkillName(e, n);
  if (S) s.skill_name = S;
  let w = extractSubagentType(e, n);
  if (w) s.subagent_type = w;
  return s;
}
//@ chunk-aepeg2w5.js:860389-860426 layout
var MAX_TOOL_INPUT_STRING_CHARS = 512,
  QY = 128,
  dP = 4096,
  Ed = 20,
  ZY = 2;
/**
 * 遥测用工具输入截断：字符串 512 字、嵌套深度/数组长度受限。
 */
//@ chunk-aepeg2w5.js:860426-860991 fingerprint = truncateToolInputValue (1)
function truncateToolInputValue(value, depth = 0) {
  if (typeof value === "string") {
    if (value.length > MAX_TOOL_INPUT_STRING_CHARS)
      return `${value.slice(0, QY)}\u2026[${value.length} chars]`;
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean" || value === null || value === void 0)
    return value;
  if (depth >= ZY) return "<nested>";
  if (Array.isArray(value)) {
    let mapped = value.slice(0, Ed).map((s) => truncateToolInputValue(s, depth + 1));
    if (value.length > Ed) mapped.push(`\u2026[${value.length} items]`);
    return mapped;
  }
  if (typeof value === "object") {
    let entries = Object.entries(value).filter(([h]) => !h.startsWith("_")),
      mapped = entries.slice(0, Ed).map(([h, y]) => [h, truncateToolInputValue(y, depth + 1)]);
    if (entries.length > Ed) mapped.push(["\u2026", `${entries.length} keys`]);
    return Object.fromEntries(mapped);
  }
  return String(value);
}
//@ chunk-aepeg2w5.js:860991-861102 layout = extractToolInputForTelemetry (1)
function extractToolInputForTelemetry_2(input) {
  if (!isToolDetailsLoggingEnabled()) return;
  let truncated = truncateToolInputValue(input),
    json = jsonStringify(truncated);
  if (json.length > dP) json = json.slice(0, dP) + "\u2026[truncated]";
  return json;
}
//@ chunk-aepeg2w5.js:861102-861112 layout
var e2 = 10;
//@ chunk-aepeg2w5.js:861112-861238 file-local
function getFileExtensionForAnalytics(filePath) {
  let ext = extname(filePath).toLowerCase();
  if (!ext || ext === ".") return;
  let extension = ext.slice(1);
  if (extension.length > e2) return lit("other");
  return fromSanitizer_SANITIZER_OUTPUT_ONLY(extension);
}
/**
 * 统计文件扩展名时识别的命令与分隔正则。
 */
//@ chunk-aepeg2w5.js:861238-861404 fingerprint = FILE_COMMANDS (1)
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
  ]),
  COMMAND_SEPARATOR_RE = /\s*(?:&&|\|\||[;|])\s*/,
  WHITESPACE_RE = /\s+/;
//@ chunk-aepeg2w5.js:861404-861772 layout = getFileExtensionsFromBashCommand (1)
function getFileExtensionsFromBashCommand_2(e) {
  if (!e.includes(".")) return;
  let result,
    seen = new Set();
  for (let subcmd of e.split(COMMAND_SEPARATOR_RE)) {
    if (!subcmd) continue;
    let tokens = subcmd.split(WHITESPACE_RE);
    if (tokens.length < 2) continue;
    let y = tokens[0],
      slashIdx = y.lastIndexOf("/"),
      baseCmd = slashIdx >= 0 ? y.slice(slashIdx + 1) : y;
    if (!FILE_COMMANDS.has(baseCmd)) continue;
    for (let R = 1; R < tokens.length; R++) {
      let x = tokens[R];
      if (x.charCodeAt(0) === 45) continue;
      let ext = getFileExtensionForAnalytics(x);
      if (ext && !seen.has(ext)) (seen.add(ext), (result = result ? result + "," + ext : ext));
    }
  }
  if (!result) return;
  return fromSanitizer_SANITIZER_OUTPUT_ONLY(result);
}
//@ chunk-aepeg2w5.js:861772-861843 layout
var o2 = /\.(csv|docx?|html|json|md|od[pst]|pdf|pptx?|rtf|txt|xlsx?)\b/g;
/**
 * 从 shell 命令中提取文件扩展名（排序去重）。
 */
//@ chunk-aepeg2w5.js:861843-862018 layout
function extensionsInCommand(e) {
  if (!e.includes(".")) return;
  let n = new Set();
  for (let s of e.toLowerCase().matchAll(o2)) n.add(s[1]);
  if (n.size === 0) return;
  let joined = [...n].sort().join(",");
  return fromSanitizer_SANITIZER_OUTPUT_ONLY(joined);
}
//@ chunk-aepeg2w5.js:862018-862054 layout
var MCP_COWORK_PRESENT_FILES = "mcp__cowork__present_files";
/**
 * 记 tengu_file_activity 事件。
 */
//@ chunk-aepeg2w5.js:862054-862253 layout
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
/**
 * 对交付的文件按扩展名去重后记录文件活动。
 */
//@ chunk-aepeg2w5.js:862253-862678 layout
function logDeliveredFiles(e, n, r, s) {
  let h = new Set();
  for (let y of e) {
    let S;
    if (typeof y === "string") S = y;
    else if (y && typeof y === "object" && "file_name" in y && typeof y.file_name === "string")
      S = y.file_name;
    else if (y && typeof y === "object" && "file_path" in y && typeof y.file_path === "string")
      S = y.file_path;
    else continue;
    let w = getFileExtensionForAnalytics(S);
    if (h.has(w)) continue;
    (h.add(w),
      logFileActivity({
        activity: "deliver",
        fileExtension: w,
        toolName: n,
        isNewFile: void 0,
        deliverChannel: r,
        messageID: s,
      }));
  }
}
/**
 * 按工具（编辑、写入、notebook、shell、artifact、发送文件等）记录文件活动遥测。
 */
//@ chunk-aepeg2w5.js:862678-863780 layout
function logToolFileActivity(e, n, r) {
  if (!n || typeof n !== "object") return;
  let s = n,
    h = ye(r);
  if (e === FILE_EDIT_TOOL_NAME && typeof s.file_path === "string")
    logFileActivity({
      activity: "edit",
      fileExtension: getFileExtensionForAnalytics(s.file_path),
      toolName: e,
      isNewFile: s.old_string === "",
      deliverChannel: void 0,
      messageID: h,
    });
  else if (e === FILE_WRITE_TOOL_NAME && typeof s.file_path === "string")
    logFileActivity({
      activity: "write",
      fileExtension: getFileExtensionForAnalytics(s.file_path),
      toolName: e,
      isNewFile: void 0,
      deliverChannel: void 0,
      messageID: h,
    });
  else if (e === NOTEBOOK_EDIT_TOOL_NAME && typeof s.notebook_path === "string")
    logFileActivity({
      activity: "notebook_edit",
      fileExtension: getFileExtensionForAnalytics(s.notebook_path),
      toolName: e,
      isNewFile: !1,
      deliverChannel: void 0,
      messageID: h,
    });
  else if (
    (e === BASH_TOOL_NAME || e === w8e || e === POWERSHELL_TOOL_NAME) &&
    typeof s.command === "string"
  ) {
    let y = extensionsInCommand(s.command);
    if (y)
      for (let S of y.split(","))
        logFileActivity({
          activity: "bash_mention",
          fileExtension: fromSanitizer_SANITIZER_OUTPUT_ONLY(S),
          toolName: e,
          isNewFile: void 0,
          deliverChannel: void 0,
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
/**
 * 版本字符串规范化（不合格式为 other，空为 none）。
 */
//@ chunk-aepeg2w5.js:864229-864370 layout
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
function X4(e) {
  if (e == null) return lit("none");
  if (KNOWN_PLATFORMS.has(e)) return fromSanitizer_SANITIZER_OUTPUT_ONLY(e);
  return lit("other");
}
//@ chunk-aepeg2w5.js:864792-864837 layout
var u2 = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})?$/;
//@ chunk-aepeg2w5.js:864837-864906 layout
function hBe(e) {
  if (u2.test(e)) return fromSanitizer_SANITIZER_OUTPUT_ONLY(e);
  return lit("nonconforming");
}
//@ chunk-aepeg2w5.js:864906-865361 fingerprint = getAgentIdentification (0.874)
function getAgentIdentification() {
  let store = bgr.getStore();
  if (store) {
    let result = {
      agentId: store.agentId,
      parentSessionId: store.parentSessionId,
      agentType: store.agentType,
    };
    if (store.parentAgentId) result.parentAgentId = store.parentAgentId;
    if (store.agentType === "teammate") result.teamName = store.teamName;
    return result;
  }
  let agentId = getAgentId(),
    parentSessionId = getParentSessionId_2(),
    teamName = getTeamName(),
    agentType = isTeammate() ? "teammate" : agentId ? "standalone" : void 0;
  if (agentId || agentType || parentSessionId || teamName)
    return {
      ...(agentId && { agentId: agentId }),
      ...(agentType && { agentType: agentType }),
      ...(parentSessionId && { parentSessionId: parentSessionId }),
      ...(teamName && { teamName: teamName }),
    };
  let stateParentSessionId = getParentSessionId();
  if (stateParentSessionId) return { parentSessionId: stateParentSessionId };
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
  return match ? match[0] : void 0;
}
/**
 * 构造环境上下文（进程内缓存）：platform/platformRaw/arch/nodeVersion/terminal/shell/包管理器/运行时/是否 CI/远程/GitHub Action、版本与构建时间、部署环境、WSL、Linux 发行版、VCS。
 */
//@ chunk-aepeg2w5.js:865926-868471 fingerprint = buildEnvContext (0.806)
async function buildEnvContext() {
  let e = isDiskless(),
    n = e ? void 0 : await detectEnvToolchain();
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
    isCi: isEnvTruthy(!1),
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
    ...(process.env.CLAUDE_CODE_TAGS && { tags: process.env.CLAUDE_CODE_TAGS }),
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
        : void 0,
    }),
    ...(n?.wslVersion && { wslVersion: n.wslVersion }),
    ...n?.linuxDistroInfo,
    ...(n && n.vcs.length > 0 && { vcs: n.vcs.join(",") }),
  };
}
/**
 * 探测运行环境工具链：包管理器、运行时、Linux 发行版信息、VCS 类型（envContext 用）。
 */
//@ chunk-aepeg2w5.js:868471-868708 layout
async function detectEnvToolchain() {
  let [e, n, r, s] = await Promise.all([env.getPackageManagers(), env.getRuntimes(), Iwr(), detectVcs()]);
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
  envContext = void 0;
  prevCpuUsage = null;
  prevWallTimeMs = null;
  memPeaks = { rss: 0, heapUsed: 0, external: 0 };
}
//@ chunk-aepeg2w5.js:868890-868915 layout
var eventMetadataStateByHost = new HostScoped(() => new EventMetadataState());
//@ chunk-aepeg2w5.js:868915-868966 layout
function getMemoryPeaks() {
  return { ...eventMetadataStateByHost.of(getRootSession().host).memPeaks };
}
/**
 * 进程指标：RSS、堆、CPU 使用差值、内存峰值等。
 */
//@ chunk-aepeg2w5.js:868966-869590 fingerprint = buildProcessMetrics (0.833)
function buildProcessMetrics(e) {
  let { memPeaks: memPeaks } = e;
  try {
    let mem = process.memoryUsage();
    if (mem.rss > memPeaks.rss) memPeaks.rss = mem.rss;
    if (mem.heapUsed > memPeaks.heapUsed) memPeaks.heapUsed = mem.heapUsed;
    if (mem.external > memPeaks.external) memPeaks.external = mem.external;
    let cpu = process.cpuUsage(),
      now = Date.now(),
      y,
      S,
      { prevCpuUsage: prevCpuUsage, prevWallTimeMs: prevWallTimeMs } = e;
    if (prevCpuUsage && prevWallTimeMs) {
      let x = now - prevWallTimeMs;
      if (x > 0) {
        let P = cpu.user - prevCpuUsage.user,
          F = cpu.system - prevCpuUsage.system;
        ((y = ((P + F) / (x * 1000)) * 100), (S = x));
      }
    }
    return (
      (e.prevCpuUsage = cpu),
      (e.prevWallTimeMs = now),
      {
        uptime: process.uptime(),
        rss: mem.rss,
        heapTotal: mem.heapTotal,
        heapUsed: mem.heapUsed,
        external: mem.external,
        arrayBuffers: mem.arrayBuffers,
        constrainedMemory: process.constrainedMemory(),
        cpuUsage: cpu,
        cpuPercent: y,
        cpuWindowMs: S,
      }
    );
  } catch {
    return;
  }
}
//@ chunk-aepeg2w5.js:869590-869597 layout
var currentEventModel;
//@ chunk-aepeg2w5.js:869597-869658 layout
function withEventModel(e, n) {
  let r = currentEventModel;
  currentEventModel = e;
  try {
    return n();
  } finally {
    currentEventModel = r;
  }
}
/**
 * 构造每个事件附带的元数据：model、sessionId、userType=external、betas、envContext、isClaudeAiAuth、entrypoint、sessionKind、agentSdkVersion、isInteractive、clientType、processMetrics、SWE-bench id、agent 标识、subscriptionType、rh（仓库哈希）、head_sha（消费者计划）、promptId 等。
 */
//@ chunk-aepeg2w5.js:869658-871072 fingerprint = getEventMetadata (0.64)
async function getEventMetadata(options = {}) {
  let n = options.model ? String(options.model) : (currentEventModel ?? getMainLoopModel()),
    r = typeof options.betas === "string" ? options.betas : hashToolNames(betaHeaderValues(getModelBetas(n))),
    processMetrics = getPromptId(),
    h = aro(),
    y = getCurrentAuthSurface(),
    S = !1,
    w = isClaudeAISubscriber(),
    R = getSubscriptionType(),
    x = getSessionId(),
    P = getRootSession(),
    F = sP(P.host),
    L = isDiskless(),
    G = !L && ((w && R !== null && isConsumerPlan(R)) || !1),
    of = eventMetadataStateByHost.of(P.host);
  of.envContext ??= buildEnvContext();
  let [ee, q, Q, , , re] = await Promise.all([
      of.envContext,
      L ? void 0 : getRepoHashForAnalytics(),
      L ? void 0 : getHeadShaForAnalytics(),
      hydrateMaskedIds(),
      L ? void 0 : Rx(),
      G ? rP(P, x) : void 0,
    ]),
    se = maskModelIdForTelemetry(n),
    Se = L ? void 0 : buildProcessMetrics(of),
    ae = envSessionKind(),
    ie = ae ? (getAttacherCaps() ? "1" : "0") : void 0,
    Z = getRendererModeForAnalytics(),
    CLAUDE_AGENT_SDK_VERSION = env.CLAUDE_AGENT_SDK_VERSION,
    fe = desktopEntrypointSetting();
  return {
    model: se,
    sessionId: F?.sessionId ?? x,
    userType: "external",
    ...(r.length > 0 && { betas: r }),
    envContext: F ? { ...ee, claudeCodeRemoteSessionId: F.remoteSessionId } : ee,
    isClaudeAiAuth: w,
    ...(process.env.CLAUDE_CODE_ENTRYPOINT && { entrypoint: getEntrypointKind() ?? "other" }),
    ...(ae && { sessionKind: ae }),
    ...(ie && { hasAttacher: ie }),
    ...(CLAUDE_AGENT_SDK_VERSION && {
      agentSdkVersion:
        CLAUDE_AGENT_SDK_VERSION === "unknown" ? "unknown" : sanitizeVersion(CLAUDE_AGENT_SDK_VERSION),
    }),
    ...(fe && { desktopAppVersion: sanitizeVersion(fe) }),
    isInteractive: String(getIsInteractive()),
    clientType: getClientType(),
    ...(Se && { processMetrics: Se }),
    sweBenchRunId: process.env.SWE_BENCH_RUN_ID || "",
    sweBenchInstanceId: process.env.SWE_BENCH_INSTANCE_ID || "",
    sweBenchTaskId: process.env.SWE_BENCH_TASK_ID || "",
    ...getAgentIdentification(),
    ...(R && { subscriptionType: R }),
    ...(q && { rh: q }),
    ...(Q && G && { head_sha: Q }),
    ...(re !== void 0 && {
      is_clean_tree_at_start: re.isCleanTree,
      changed_file_count_at_start: re.changedFileCount,
      untracked_file_count_at_start: re.untrackedFileCount,
    }),
    ...(Z && { rendererMode: Z }),
    ...(h && { remoteControlLane: h }),
    ...(y && { projectsSession: "1" }),
    ...{},
    ...(processMetrics && { promptId: processMetrics }),
  };
}
/**
 * 把内部事件元数据映射成 ClaudeCodeInternalEvent 字段：env（platform、arch、terminal、is_ci、version…）、core（session_id、model、user_type、betas、entrypoint、agent_id…）、process 指标 base64、其余放 additional_metadata。
 */
//@ chunk-aepeg2w5.js:871072-874435 fingerprint = to1PEventFormat (0.865)
function to1PEventFormat(metadata, userMetadata, additionalMetadata = {}) {
  let {
      envContext: envContext,
      isClaudeAiAuth: isClaudeAiAuth,
      processMetrics: processMetrics,
      rh: rh,
      head_sha: head_sha,
      is_clean_tree_at_start: is_clean_tree_at_start,
      changed_file_count_at_start: changed_file_count_at_start,
      untracked_file_count_at_start: untracked_file_count_at_start,
      coachMode: coachMode,
      observerMode: observerMode,
      sessionKind: sessionKind,
      hasAttacher: hasAttacher,
      rendererMode: rendererMode,
      remoteControlLane: remoteControlLane,
      projectsSession: projectsSession,
      replMode: replMode,
      subscriptionType: subscriptionType,
      parentAgentId: parentAgentId,
      promptId: promptId,
      desktopAppVersion: desktopAppVersion,
      ...Z
    } = metadata,
    ce = {
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
  if (envContext.remoteEnvironmentType) ce.remote_environment_type = envContext.remoteEnvironmentType;
  if (envContext.claudeCodeContainerId) ce.claude_code_container_id = envContext.claudeCodeContainerId;
  if (envContext.claudeCodeRemoteSessionId)
    ce.claude_code_remote_session_id = envContext.claudeCodeRemoteSessionId;
  if (envContext.tags)
    ce.tags = envContext.tags
      .split(",")
      .map((Me) => Me.trim())
      .filter(Boolean);
  if (envContext.githubEventName) ce.github_event_name = envContext.githubEventName;
  if (envContext.githubActionsRunnerEnvironment)
    ce.github_actions_runner_environment = envContext.githubActionsRunnerEnvironment;
  if (envContext.githubActionsRunnerOs) ce.github_actions_runner_os = envContext.githubActionsRunnerOs;
  if (envContext.githubActionRef) ce.github_action_ref = envContext.githubActionRef;
  if (envContext.wslVersion) ce.wsl_version = envContext.wslVersion;
  if (envContext.linuxDistroId) ce.linux_distro_id = envContext.linuxDistroId;
  if (envContext.linuxDistroVersion) ce.linux_distro_version = envContext.linuxDistroVersion;
  if (envContext.linuxKernel) ce.linux_kernel = envContext.linuxKernel;
  if (envContext.vcs) ce.vcs = envContext.vcs;
  if (envContext.versionBase) ce.version_base = envContext.versionBase;
  let core = {
    session_id: Z.sessionId,
    model: Z.model,
    user_type: Z.userType,
    is_interactive: Z.isInteractive === "true",
    client_type: Z.clientType,
  };
  if (Z.betas) core.betas = Z.betas;
  if (Z.entrypoint) core.entrypoint = Z.entrypoint;
  if (Z.agentSdkVersion) core.agent_sdk_version = Z.agentSdkVersion;
  if (Z.sweBenchRunId) core.swe_bench_run_id = Z.sweBenchRunId;
  if (Z.sweBenchInstanceId) core.swe_bench_instance_id = Z.sweBenchInstanceId;
  if (Z.sweBenchTaskId) core.swe_bench_task_id = Z.sweBenchTaskId;
  if (Z.agentId) core.agent_id = Z.agentId;
  if (Z.parentSessionId) core.parent_session_id = Z.parentSessionId;
  if (Z.agentType) core.agent_type = Z.agentType;
  if (Z.teamName) core.team_name = Z.teamName;
  if (userMetadata.githubActionsMetadata) {
    let ghMeta = userMetadata.githubActionsMetadata;
    ce.github_actions_metadata = {
      actor_id: ghMeta.actorId,
      repository_id: ghMeta.repositoryId,
      repository_owner_id: ghMeta.repositoryOwnerId,
    };
  }
  let auth;
  if (userMetadata.accountUuid || userMetadata.organizationUuid)
    auth = { account_uuid: userMetadata.accountUuid, organization_uuid: userMetadata.organizationUuid };
  return {
    env: ce,
    ...(processMetrics && { process: Buffer.from(jsonStringify(processMetrics)).toString("base64") }),
    ...(auth && { auth: auth }),
    core: core,
    additional: {
      ...(rh && { rh: rh }),
      ...(head_sha && { _PROTO_head_sha: head_sha }),
      ...(is_clean_tree_at_start !== void 0 && { _PROTO_is_clean_tree_at_start: is_clean_tree_at_start }),
      ...(changed_file_count_at_start !== void 0 && {
        _PROTO_changed_file_count_at_start: changed_file_count_at_start,
      }),
      ...(untracked_file_count_at_start !== void 0 && {
        _PROTO_untracked_file_count_at_start: untracked_file_count_at_start,
      }),
      ...(coachMode && { coach_mode: coachMode }),
      ...(observerMode && { observer_mode: observerMode }),
      ...(sessionKind && { session_kind: sessionKind }),
      ...(hasAttacher && { has_attacher: hasAttacher }),
      ...(rendererMode && { renderer_mode: rendererMode }),
      ...(remoteControlLane && { remote_control_lane: remoteControlLane }),
      ...(projectsSession && { projects_session: projectsSession }),
      ...{},
      ...(subscriptionType && { subscription_type: subscriptionType }),
      ...(parentAgentId && { parent_agent_id: parentAgentId }),
      ...(promptId && { cc_prompt_id: promptId }),
      ...(desktopAppVersion && { desktop_app_version: desktopAppVersion }),
      ...additionalMetadata,
    },
  };
}
//@ chunk-18hwfzwa.js:1743869-1743938 fingerprint = extractToolInputForTelemetry (1)
function extractToolInputForTelemetry(h, x) {
  return h.length <= x ? h : `${truncateToLength(h, x)} \u2026[truncated]`;
}
//@ chunk-6vnxsn99.js:43721-44057 fingerprint = getFileExtensionsFromBashCommand (1)
function getFileExtensionsFromBashCommand(command, simulatedSedEditFilePath) {
  let min = Math.min(command.length, simulatedSedEditFilePath.length),
    o = 0;
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
  return (
    (s = s === 0 || index === -1 ? 0 : command.length - index - 1),
    [
      command.slice(o, command.length - s),
      simulatedSedEditFilePath.slice(o, simulatedSedEditFilePath.length - s),
    ]
  );
}

export {
  builtinToolNameForMcp,
  hBe,
  getUnknownToolAnalyticsName,
  sanitizeToolNameForAnalytics,
  builtinToolServedByMcp,
  isToolDetailsLoggingEnabled,
  THIRD_PARTY,
  getServerUrl,
  copyCcrMarks,
  ccrConfigHosts,
  isCcrInjectedConfig,
  xgr,
  ias,
  OPt,
  agentTypeForTelemetry,
  sanitizeVersion,
  pTi,
  getEventMetadata,
  X4,
  filterObject,
  las,
  toolNameForTelemetry,
  restrictRemoteRepoCalls,
  filterRemoteRepoTools,
  isMcpServerLoggableInAnalytics,
  isRunnerDynamicServer,
  isOwnCcrMcpServer,
  nxn,
  Cgr,
  loggableMcpToolName,
  markCcrInjectedConfig,
  copyOwnServerMarks,
  getVersionBase,
  LOCAL_TASK_ID_PATTERN,
  extractToolInputForTelemetry,
  buildAttribution,
  getMemoryPeaks,
  to1PEventFormat,
  Igr,
  sessionSlug,
  keepsSessionId,
  Oro,
  getFileExtensionsFromBashCommand,
  getFileExtensionForAnalytics,
  gas,
  uTi,
  ANTHROPIC_SESSIONENDHOOKS,
  setMcpServeSession,
  V8t,
  ANTHROPIC_SESSION,
  hasUniqueQueryParams,
  applyMetricAttribution,
  extractMcpToolDetails,
  Xki,
  fTi,
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
  Jki,
  redactAttribution,
  attributionForLog,
  Zki,
  withEventModel,
  ownSessionIdPrefixes,
  buildCcrMcpProxyUrls,
  sanitizeStorageKindForAnalytics,
  isInjectedCcrServer,
  aas,
};
