/**
 * utils/toolSearch.ts
 *
 * 工具搜索（延迟加载）判定：模式 tst/tst-auto/standard（ENABLE_TOOL_SEARCH）、模型/部署支持、自动阈值（上下文 10%）、不可延迟内建列表、deferred_tools_delta 附件生成与历史扫描、已发现工具提取；混入 Chrome 提示词片段与若干 fingerprint-shared 克隆
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/toolSearch.ts
 * pieces: chunk-4121qate.js (1), chunk-5jgfyd2q.js (5), chunk-e6aww6q8.js (22), chunk-mp7v59a0.js (17)
 * attribution: fingerprint 12, layout 19, placement 2, file-local 3, facade-exports 8, callgraph-fingerprint 1
 */
import { stringArray, count, uniq } from "./collections.js";
import { RETIRED_TOOL_NAMES } from "../tools/retiredTools.js";
import { parseRemovedToolCauses } from "../services/mcp/mcpToolRemovalReasons.js";
import { env } from "./env.js";
import {
  isToolSearchForceOverride,
  isToolSearchDisabledByBetas,
  isModelVersionAtLeast,
  addBrowserBatchToChromeSelect,
} from "./toolSearchChrome.js";
import { getAPIProvider, isFirstPartyAnthropicBaseUrl } from "./model/providers.js";
import { getContextWindow } from "./model/configs.js";
import { betaHeaderValues, getMergedBetas, getToolSearchBeta } from "./betas.js";
import { HostScoped } from "./hostScoped.js";
import {
  isDeferredTool,
  TOOL_SEARCH_TOOL_NAME,
  isDeferredToolInConversation,
  surfacedByValue,
  formatDeferredToolLine,
} from "../tools/ToolSearchTool/prompt.js";
import {
  getRootSession,
  getRefusedBetasForModel,
  getMcpConnectNonBlocking,
  getMainLoopModelOverride,
  getInitialMainLoopModel,
} from "../bootstrap/state.js";
import { countToolDefinitionTokens, TOOL_DEFINITION_TOKEN_OVERHEAD } from "./analyzeContext.js";
import { toolMatchesName } from "../Tool.js";
import { jsonStringify } from "./slowOperations.js";
import { toolInputJsonSchema } from "../plugins/functionHooks/types/builtinToolSchemas.js";
import { getCanonicalName } from "./model/canonicalModelName.js";
import { foundrySupportsCapability } from "../services/api/foundryCapabilities.js";
import { Lp } from "../bootstrap/stateSlices.js";
import { toProviderWireModelId } from "./model/model.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum, fromEnumArr } from "../services/analytics/safeMetadata.js";
import { telemetrySafeModelName } from "./model/telemetryModelName.js";
import { logForDebugging } from "./debug.js";
import {
  stripToolReferencesBeforeCompaction,
  normalizeToolReference,
  normalizeMcpServerName,
} from "../services/api/deferredToolsState.js";
import { TJ } from "../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { compareStringsGrouped } from "./stringUtils.js";
import { Ji } from "../../vendor/lodash-es/uniqBy.js";
import { identityMap } from "../remote/tools/protocolConstants.js";
import { countByAlias } from "../../vendor/lodash-es/countBy.js";
import { agentTypeForTelemetry } from "../services/analytics/metadata.js";
import { awaitArtifactRosterSafe } from "../services/artifacts/rosterWait.js";
import { parseIntLoose, isEnvTruthy, isEnvDefinedFalsy } from "./envUtils.js";
import { Bn } from "./model/modelIds.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  getFeatureValue_SESSION_PINNED,
} from "../services/analytics/growthbook.js";
import { getCachedClientData } from "./config.js";
import { isFoamySpringEnabled } from "../services/analytics/growthbookGates.js";
import { claimOnce } from "../services/api/verificationRequired.js";
import { wS } from "../../vendor/lodash-es/_inlinedHelpers.js";

/**
 * 扫描历史消息里的 deferred_tools_delta 附件，重建已宣告、按块露出、断开撤回、线上隐藏、定义撤回、已列出、上次 pending/needsAuth/failed 等集合，供 getDeferredToolsDelta 与 ToolSearch 使用。
 */
//@ chunk-e6aww6q8.js:1639966-1641577 fingerprint = getDeferredToolsDelta (0.383)
function scanDeferredToolsDeltaHistory(
  e,
  { loaded: loaded, byNameAnnouncements: byNameAnnouncements, toolAdditionOnly: toolAdditionOnly },
) {
  let announced = new Set(),
    y = new Set(),
    S = new Set(),
    w = new Set(),
    L = new Set(),
    G = new Set(),
    q = [],
    Z = [],
    Se = [],
    ke = 0,
    we = 0,
    attachmentTypesSeen = new Set();
  for (let msg of e) {
    if (msg.type !== "attachment") continue;
    if ((ke++, attachmentTypesSeen.add(msg.attachment.type), msg.attachment.type !== "deferred_tools_delta"))
      continue;
    we++;
    let deferredNames = new Set(stringArray(msg.attachment.readdedNames)),
      poolNames = new Set(stringArray(msg.attachment.loadedNames)),
      We =
        byNameAnnouncements !== void 0 && !byNameAnnouncements.has(msg.uuid)
          ? new Set(stringArray(msg.attachment.surfacedNames))
          : void 0,
      ze = Array.isArray(msg.attachment.addedLines) ? stringArray(msg.attachment.addedNames) : [];
    for (let lt of ze) {
      if (RETIRED_TOOL_NAMES.has(lt)) continue;
      if (
        (announced.add(lt),
        S.delete(lt),
        w.delete(lt),
        L.delete(lt),
        poolNames.has(lt) && !loaded.has(lt) && !We?.has(lt))
      )
        continue;
      if (!deferredNames.has(lt) || We?.has(lt)) G.add(lt);
    }
    for (let lt of stringArray(msg.attachment.removedNames)) (announced.delete(lt), S.add(lt), w.delete(lt));
    for (let lt of stringArray(msg.attachment.wireHiddenNames))
      (announced.delete(lt), S.delete(lt), w.add(lt));
    if (Array.isArray(msg.attachment.pendingMcpServers)) q = stringArray(msg.attachment.pendingMcpServers);
    if (Array.isArray(msg.attachment.needsAuthMcpServers))
      Z = stringArray(msg.attachment.needsAuthMcpServers);
    if (Array.isArray(msg.attachment.failedMcpServers)) Se = msg.attachment.failedMcpServers;
    for (let lt of parseRemovedToolCauses(msg.attachment.retractedTools)) L.add(lt.name);
    for (let lt of stringArray(msg.attachment.restoredNames)) L.delete(lt);
    if (toolAdditionOnly !== void 0 && !toolAdditionOnly.nameOnlyAnnouncements.has(msg.uuid))
      for (let lt of stringArray(msg.attachment.surfacedNames)) y.add(lt);
  }
  return {
    announced: announced,
    surfacedWithBlocks: y,
    retractedAsDisconnected: S,
    wireHiddenStanding: w,
    definitionRetracted: L,
    listed: G,
    lastPending: q,
    lastNeedsAuth: Z,
    lastFailed: Se,
    attachmentCount: ke,
    dtdCount: we,
    attachmentTypesSeen: attachmentTypesSeen,
  };
}
//@ chunk-e6aww6q8.js:2388424-2388503 placement
function rGt() {
  return (
    !env.ENABLE_TOOL_SEARCH &&
    !isToolSearchForceOverride() &&
    getAPIProvider() === "firstParty" &&
    !isFirstPartyAnthropicBaseUrl()
  );
}
//@ chunk-e6aww6q8.js:2388503-2388514 layout
var DEFAULT_AUTO_TOOL_SEARCH_PERCENTAGE = 10;
//@ chunk-e6aww6q8.js:2388514-2388653 fingerprint = getAutoToolSearchPercentage (1)
function getAutoToolSearchPercentage() {
  let value = process.env.ENABLE_TOOL_SEARCH;
  if (!value) return DEFAULT_AUTO_TOOL_SEARCH_PERCENTAGE;
  if (value === "auto") return DEFAULT_AUTO_TOOL_SEARCH_PERCENTAGE;
  let parsed = parseAutoPercentage(value);
  if (parsed !== null) return parsed;
  return DEFAULT_AUTO_TOOL_SEARCH_PERCENTAGE;
}
//@ chunk-e6aww6q8.js:2388653-2388665 layout
var CHARS_PER_TOKEN = 2.5;
//@ chunk-e6aww6q8.js:2388665-2388739 file-local
function getAutoToolSearchTokenThreshold(model) {
  let contextWindow = getContextWindow(model, betaHeaderValues(getMergedBetas(model))),
    percentage = getAutoToolSearchPercentage() / 100;
  return Math.floor(contextWindow * percentage);
}
//@ chunk-e6aww6q8.js:2388739-2388785 file-local
function getAutoToolSearchCharThreshold(model) {
  return Math.floor(getAutoToolSearchTokenThreshold(model) * CHARS_PER_TOKEN);
}
//@ chunk-e6aww6q8.js:2388785-2388882 layout
class DeferredTokenCountCache {
  counts = new Map();
  lookup(e) {
    return this.counts.get(e);
  }
  remember(e, n) {
    this.counts.set(e, n);
  }
}
//@ chunk-e6aww6q8.js:2388882-2388909 layout
var deferredTokenCountCacheByHost = new HostScoped(() => new DeferredTokenCountCache());
/**
 * 按延迟工具名列表（按 host 分开缓存）缓存延迟工具定义的 token 数。
 */
//@ chunk-e6aww6q8.js:2388909-2389102 layout
function getDeferredToolTokenCountCached(tools, getToolPermissionContext, agents, model, credentials) {
  let y = getNonDeferrableBuiltins(),
    filtered = tools.filter((Z) => isDeferredTool(Z, y)),
    joined = filtered.map((Z) => Z.name).join(","),
    of = deferredTokenCountCacheByHost.of(getRootSession().host),
    lookup = of.lookup(joined);
  if (lookup !== void 0) return lookup;
  let q = countDeferredToolTokens(filtered, getToolPermissionContext, agents, model, credentials);
  return (of.remember(joined, q), q);
}
//@ chunk-e6aww6q8.js:2389102-2389278 layout
async function countDeferredToolTokens(deferredTools, getToolPermissionContext, agents, model, credentials) {
  if (deferredTools.length === 0) return 0;
  try {
    let y = await countToolDefinitionTokens(
      deferredTools,
      getToolPermissionContext,
      { activeAgents: agents, allAgents: agents },
      model,
      credentials,
    );
    if (y === 0) return null;
    return Math.max(0, y - TOOL_DEFINITION_TOKEN_OVERHEAD);
  } catch {
    return null;
  }
}
/**
 * 工具列表里是否有 ToolSearch。
 */
//@ chunk-e6aww6q8.js:2389278-2389323 facade-exports
function isToolSearchToolAvailable(tools) {
  return tools.some((tool) => toolMatchesName(tool, TOOL_SEARCH_TOOL_NAME));
}
/**
 * 估算延迟工具定义的字符数：名字 + prompt 文本 + 输入 JSON schema 长度之和。
 */
//@ chunk-e6aww6q8.js:2389323-2389673 fingerprint = calculateDeferredToolDescriptionChars (1)
async function calculateDeferredToolDescriptionChars(tools, getToolPermissionContext, agents, model) {
  let h = getNonDeferrableBuiltins(),
    deferredTools = tools.filter((w) => isDeferredTool(w, h));
  if (deferredTools.length === 0) return 0;
  return (
    await Promise.all(
      deferredTools.map(async (tool) => {
        let description = await tool.prompt({
            getToolPermissionContext: getToolPermissionContext,
            tools: tools,
            agents: agents,
            model: model,
          }),
          inputSchema = tool.inputJSONSchema
            ? jsonStringify(tool.inputJSONSchema)
            : tool.inputSchema
              ? jsonStringify(toolInputJsonSchema(tool.inputSchema))
              : "";
        return tool.name.length + description.length + inputSchema.length;
      }),
    )
  ).reduce((total, size) => total + size, 0);
}
/**
 * 返回工具搜索不可用的原因码，可用时 undefined：model_unsupported、vertex_model_unsupported、foundry_deployment_unsupported、no_tools_in_request、not_registered、mcp_search_unavailable。
 */
//@ chunk-e6aww6q8.js:2389673-2389993 layout
function getToolSearchUnavailableReason(model, tools) {
  if (!modelSupportsToolReference(model)) return "model_unsupported";
  if (isVertexModelWithoutToolSearch(getCanonicalName(model))) return "vertex_model_unsupported";
  if (
    !foundrySupportsCapability(model, "tool_search_server") ||
    !foundrySupportsCapability(model, "tool_search")
  )
    return "foundry_deployment_unsupported";
  if (isToolSearchToolAvailable(tools)) return;
  if (tools.length === 0) return "no_tools_in_request";
  if (!isToolSearchEnabledOptimistic()) return "not_registered";
  return "mcp_search_unavailable";
}
/**
 * ToolSearch 工具被过滤掉（例如 disallowedTools）且端点未拒绝过：此时改用 tool_addition 方式（不靠 ToolSearch 也按需追加工具定义）。
 */
//@ chunk-e6aww6q8.js:2389993-2390067 facade-exports
function toolSearchToolFilteredOut(model, tools, requestState) {
  return (
    getToolSearchUnavailableReason(model, tools) === "mcp_search_unavailable" &&
    !toolSearchRejectedOn(requestState, model)
  );
}
/**
 * 工具搜索因模型/部署/工具池原因不可用。
 */
//@ chunk-e6aww6q8.js:2390067-2390110 facade-exports
function isToolSearchPrecluded(model, tools) {
  return getToolSearchUnavailableReason(model, tools) !== void 0;
}
/**
 * 从已声明工具名判断本对话的工具搜索锁：声明过 ToolSearch → true；声明过工具但没有 ToolSearch 且 rGt() → false（保持关闭）；否则未定。
 */
//@ chunk-e6aww6q8.js:2390110-2390181 facade-exports
function toolSearchDeclaredIn(declaredToolNames) {
  if (declaredToolNames?.has(TOOL_SEARCH_TOOL_NAME)) return !0;
  return declaredToolNames?.size && rGt() ? !1 : void 0;
}
/**
 * 端点在本进程里是否拒绝过工具搜索（Lp 记录的拒绝，或尚未决定声明工具时按 beta 记录判断）。
 */
//@ chunk-e6aww6q8.js:2390181-2390280 facade-exports
function toolSearchRejectedOn(requestState, model) {
  let r = getToolSearchBeta();
  return (
    Lp(requestState, r) ||
    (!requestState.declaredToolsDecided &&
      [...getRefusedBetasForModel(toProviderWireModelId(model))].includes(r))
  );
}
/**
 * isToolSearchEnabled（请求级）：先看不可用原因（模型/Vertex/Foundry 不支持、没有工具、未注册、ToolSearch 被禁用），再看本对话是否已"无 ToolSearch 运行过"（保持关闭直到压缩/清空）、端点是否拒绝过；然后按模式：tst 开、standard 关、tst-auto 比较延迟工具 token 数与上下文窗口百分比阈值。每次决策记 tengu_tool_search_mode_decision。
 */
//@ chunk-e6aww6q8.js:2390280-2392265 facade-exports = isToolSearchEnabled (0.724)
async function isToolSearchEnabled(
  model,
  tools,
  getToolPermissionContext,
  agents,
  source,
  credentials,
  recordedToolDescriptions,
  requestState,
) {
  let mcpToolCount = count(tools, (ke) => ke.isMcp);
  function logModeDecision(enabled, mode, reason, extraProps) {
    logEvent("tengu_tool_search_mode_decision", {
      enabled: enabled,
      mode: fromEnum(mode),
      reason: fromEnum(reason),
      checkedModel: telemetrySafeModelName(model),
      mcpToolCount: mcpToolCount,
      mcpNonBlocking: getMcpConnectNonBlocking(),
      userType: fromEnum("external"),
      ...extraProps,
    });
  }
  let q = getToolSearchUnavailableReason(model, tools);
  switch (q) {
    case "model_unsupported":
      return (
        logForDebugging(
          `Tool search disabled for model '${model}': model does not support tool_reference blocks. This feature is available on Claude Sonnet 4+, Opus 4+, Haiku 4.5+, and newer models.`,
        ),
        logModeDecision(!1, "standard", q),
        !1
      );
    case "vertex_model_unsupported":
      return (
        logForDebugging(
          `Tool search disabled for model '${model}' on Vertex: this model's Vertex serving stack rejects the tool-search beta header (pre-4.5 generation).`,
        ),
        logModeDecision(!1, "standard", q),
        !1
      );
    case "foundry_deployment_unsupported":
      return (
        logForDebugging(
          `Tool search disabled: Foundry deployment for '${model}' does not support tool search.`,
        ),
        logModeDecision(!1, "standard", q),
        !1
      );
    case "no_tools_in_request":
    case "not_registered":
      return (logModeDecision(!1, getToolSearchMode(), q), !1);
    case "mcp_search_unavailable":
      return (
        logForDebugging(
          "Tool search disabled: ToolSearchTool is not available (may have been disallowed via disallowedTools).",
        ),
        logModeDecision(!1, getToolSearchMode(), q),
        !1
      );
    case void 0:
      break;
  }
  let mode = getToolSearchMode(),
    Se = toolSearchDeclaredIn(recordedToolDescriptions);
  if (Se === !1)
    return (
      logForDebugging(
        "Tool search disabled: this conversation has run without ToolSearch, and stays so until it is compacted or cleared. ENABLE_TOOL_SEARCH=true overrides this.",
      ),
      logModeDecision(!1, mode, "held_off"),
      !1
    );
  if (requestState && toolSearchRejectedOn(requestState, model))
    return (
      logForDebugging(
        "Tool search is off for this conversation: the endpoint refused it earlier in this process.",
      ),
      logModeDecision(!1, mode, "refused"),
      !1
    );
  switch (mode) {
    case "tst":
      return (logModeDecision(!0, mode, "tst_enabled"), !0);
    case "tst-auto": {
      if (Se)
        return (
          logForDebugging("Auto tool search enabled: this conversation already declared ToolSearch"),
          logModeDecision(!0, mode, "auto_held"),
          !0
        );
      let {
        enabled: enabled,
        debugDescription: debugDescription,
        metrics: metrics,
      } = await checkAutoThreshold(tools, getToolPermissionContext, agents, model, credentials);
      if (enabled)
        return (
          logForDebugging(
            `Auto tool search enabled: ${debugDescription}` + (source ? ` [source: ${source}]` : ""),
          ),
          logModeDecision(!0, mode, "auto_above_threshold", metrics),
          !0
        );
      return (
        logForDebugging(
          `Auto tool search disabled: ${debugDescription}` + (source ? ` [source: ${source}]` : ""),
        ),
        logModeDecision(!1, mode, "auto_below_threshold", metrics),
        !1
      );
    }
    case "standard":
      return (logModeDecision(!1, mode, "standard_mode"), !1);
  }
}
/**
 * extractDiscoveredToolNames：从历史里收集已发现的延迟工具名：压缩边界携带的 preCompactDiscoveredTools、deferred_tools_delta 的 surfacedNames、tool_result 里的 tool_reference 块。
 */
//@ chunk-e6aww6q8.js:2392265-2393097 facade-exports = extractDiscoveredToolNames (0.715)
function extractDiscoveredToolNames(messages, options) {
  let discoveredTools = new Set(),
    carriedFromBoundary = 0;
  for (let msg of messages) {
    if (msg.type === "system" && msg.subtype === "compact_boundary") {
      let carried = msg.compactMetadata?.preCompactDiscoveredTools;
      if (carried) {
        for (let name of carried) discoveredTools.add(name);
        carriedFromBoundary += carried.length;
      }
      continue;
    }
    if (msg.type === "attachment") {
      if (options?.surfaced !== void 0 && msg.attachment.type === "deferred_tools_delta") {
        let surfaced = options.surfaced,
          w =
            "exceptAnnouncements" in surfaced
              ? surfaced.exceptAnnouncements.has(msg.uuid)
                ? () => !1
                : () => !0
              : (G) => surfaced.has(G),
          surfacedNames = msg.attachment.surfacedNames;
        for (let G of Array.isArray(surfacedNames) ? surfacedNames : [])
          if (typeof G === "string" && w(G)) discoveredTools.add(G);
      }
      continue;
    }
    if (msg.type !== "user") continue;
    let content = msg.message?.content;
    if (!Array.isArray(content)) continue;
    for (let block of content)
      if (isToolResultBlockWithContent(block)) {
        for (let item of block.content)
          if (isToolReferenceWithName(item)) discoveredTools.add(item.tool_name);
      }
  }
  if (discoveredTools.size > 0)
    logForDebugging(
      `Dynamic tool loading: found ${discoveredTools.size} discovered tools in message history` +
        (carriedFromBoundary > 0 ? ` (${carriedFromBoundary} carried from compact boundary)` : ""),
    );
  return discoveredTools;
}
/**
 * getDeferredToolsDelta：比较当前工具池的延迟工具与历史 deferred_tools_delta 附件，生成新附件（addedNames/addedLines、removedNames、wireHiddenNames、readdedNames、pending/needsAuth/failed MCP 服务器、retractedTools、restoredNames、surfacedNames、loadedNames），无变化返回 null；记 tengu_deferred_tools_pool_change。
 */
//@ chunk-e6aww6q8.js:2393097-2397299 facade-exports
function getDeferredToolsDelta(
  tools,
  messages,
  scanContext,
  pendingMcpServers,
  needsAuthMcpServers,
  failedMcpServers,
  revocations,
  heldInlineTools,
  toolAdditionOnly,
  nameOnlyAnnouncements,
  departures,
) {
  let Z = toolAdditionOnly !== void 0,
    Se = Z ? new Set() : stripToolReferencesBeforeCompaction(messages),
    ke = toolAdditionOnly?.nameOnlyAnnouncements ?? nameOnlyAnnouncements,
    {
      announced: announced,
      surfacedWithBlocks: surfacedWithBlocks,
      retractedAsDisconnected: retractedAsDisconnected,
      wireHiddenStanding: wireHiddenStanding,
      definitionRetracted: definitionRetracted,
      listed: listed,
      lastPending: lastPending,
      lastNeedsAuth: lastNeedsAuth,
      lastFailed: lastFailed,
      attachmentCount: attachmentCount,
      dtdCount: dtdCount,
      attachmentTypesSeen: attachmentTypesSeen,
    } = scanDeferredToolsDeltaHistory(messages, {
      loaded: Se,
      byNameAnnouncements: ke,
      toolAdditionOnly: toolAdditionOnly,
    }),
    yt = getNonDeferrableBuiltins(),
    filtered = tools.filter((Io) =>
      isDeferredToolInConversation(Io, heldInlineTools, tools, {
        toolSearchAbsent: Z,
        nonDeferrableBuiltins: yt,
      }),
    ),
    At = new Set(filtered.map((Io) => Io.name)),
    It = new Set(tools.map((Io) => Io.name)),
    filtered_2 = filtered.filter((Io) => !announced.has(Io.name)),
    filtered_3 = filtered.filter((Io) => !listed.has(Io.name)),
    mapped = filtered_2.filter((Io) => listed.has(Io.name)).map((Io) => Io.name),
    rn = new Set(filtered_3.map((Io) => Io.name)),
    pn = Z ? filtered.filter((Io) => !rn.has(Io.name) && !surfacedWithBlocks.has(Io.name)) : [],
    no = TJ(tools),
    hn = no === tools ? It : new Set(no.map((Io) => Io.name)),
    filtered_4 = [...definitionRetracted].filter((Io) => hn.has(Io) && !At.has(Io)),
    yn = [],
    Kn = [];
  for (let Io of announced) {
    if (At.has(Io)) continue;
    if (!It.has(Io)) yn.push(Io);
    else if (!hn.has(Io)) Kn.push(Io);
  }
  let Xn = new Set(Kn);
  for (let Io of retractedAsDisconnected)
    if (It.has(Io) && !hn.has(Io) && !announced.has(Io) && !Xn.has(Io)) (Kn.push(Io), Xn.add(Io));
  let fo = new Set(yn);
  for (let Io of wireHiddenStanding) if (!It.has(Io) && !fo.has(Io)) (yn.push(Io), fo.add(Io));
  let To = new Map();
  if (departures !== void 0) for (let Io of yn) To.set(Io, departures.causeKindOf(Io));
  let bo = departures?.holdWhileConnecting === !0,
    vn = bo ? yn.filter((Io) => To.get(Io) !== "reconnecting") : yn,
    co = new Set(
      bo
        ? [
            ...(departures?.serversDeclaredInline ?? []),
            ...filtered.flatMap((Io) => Io.mcpInfo?.serverName ?? []),
            ...yn
              .filter((Io) => To.get(Io) === "reconnecting")
              .flatMap((Io) => departures?.connectingServersOf(Io) ?? []),
          ]
        : [],
    ),
    So = new Set(lastFailed.filter(normalizeToolReference).map((Io) => Io.name)),
    ko = new Set([...lastPending, ...lastNeedsAuth]),
    un =
      pendingMcpServers
        ?.filter((Io) => !co.has(Io) || ko.has(Io) || So.has(normalizeMcpServerName(Io)))
        .sort() ?? [],
    ao = (pendingMcpServers?.length ?? 0) - un.length,
    $o =
      pendingMcpServers !== void 0 &&
      (un.length !== lastPending.length || un.some((Io, zo) => Io !== lastPending[zo])),
    yo =
      bo && pendingMcpServers !== void 0 ? lastPending.filter((Io) => !pendingMcpServers.includes(Io)) : [],
    Ho = new Set([...filtered_3, ...pn]),
    filtered_5 = filtered.filter(
      (Io) =>
        announced.has(Io.name) && !Ho.has(Io) && Io.mcpInfo !== void 0 && yo.includes(Io.mcpInfo.serverName),
    ),
    br = needsAuthMcpServers !== void 0 ? [...needsAuthMcpServers].sort() : [],
    Hr =
      needsAuthMcpServers !== void 0 &&
      (br.length !== lastNeedsAuth.length || br.some((Io, zo) => Io !== lastNeedsAuth[zo])),
    Fr =
      failedMcpServers !== void 0
        ? [...failedMcpServers].sort((Io, zo) => compareStringsGrouped(Io.name, zo.name))
        : [],
    cs =
      failedMcpServers !== void 0 &&
      (Fr.length !== lastFailed.length ||
        Fr.some(
          (Io, zo) =>
            Io.name !== lastFailed[zo]?.name ||
            Io.errorCode !== lastFailed[zo]?.errorCode ||
            Io.error !== lastFailed[zo]?.error ||
            Io.willRetry !== lastFailed[zo]?.willRetry,
        )),
    _r =
      revocations !== void 0
        ? Ji(
            revocations.revoked.filter((Io) => !definitionRetracted.has(Io.name)),
            (Io) => Io.name,
          ).sort((Io, zo) => Io.name.localeCompare(zo.name))
        : [],
    Cr =
      filtered_2.length === 0 &&
      vn.length === 0 &&
      Kn.length === 0 &&
      filtered_3.length === 0 &&
      !$o &&
      !Hr &&
      !cs &&
      _r.length === 0 &&
      filtered_4.length === 0 &&
      pn.length === 0;
  if (Cr && ao === 0) return null;
  let Vr = [...filtered_3, ...pn],
    Oo = uniq([...filtered_2, ...Vr, ...filtered_5].map((Io) => Io.name)),
    jr = Z
      ? Vr.map((Io) => Io.name)
      : filtered_2
          .filter((Io) =>
            surfacedByValue(Io, {
              heldInlineTools: heldInlineTools,
              nonDeferrableBuiltins: yt,
              listed: listed,
            }),
          )
          .map((Io) => Io.name);
  if (
    (logEvent("tengu_deferred_tools_pool_change", {
      addedCount: filtered_2.length,
      readdedCount: mapped.length,
      unlistedCount: filtered_3.length,
      resurfacedCount: pn.length,
      removedCount: vn.length,
      ...identityMap(countByAlias([...To.values()]), (Io, zo) => `departed_${zo}`),
      retractionHoldEnabled: bo,
      returnedAfterHoldCount: filtered_5.length,
      wireHiddenCount: Kn.length,
      pendingChanged: $o,
      pendingCount: un.length,
      pendingUnmentionedCount: ao,
      saidNothing: Cr,
      lastPendingCount: lastPending.length,
      needsAuthChanged: Hr,
      needsAuthCount: br.length,
      lastNeedsAuthCount: lastNeedsAuth.length,
      failedChanged: cs,
      failedCount: Fr.length,
      lastFailedCount: lastFailed.length,
      retractedCount: _r.length,
      restoredCount: filtered_4.length,
      ...identityMap(revocations?.causeCounts ?? {}, (Io, zo) => `keptDeparted_${zo}`),
      priorAnnouncedCount: announced.size,
      toolSearchAbsent: Z,
      messagesLength: messages.length,
      attachmentCount: attachmentCount,
      dtdCount: dtdCount,
      callSite: fromEnum(scanContext?.callSite ?? "unknown"),
      querySource: agentTypeForTelemetry(scanContext?.querySource ?? "unknown"),
      attachmentTypesSeen: fromEnumArr([...attachmentTypesSeen]),
    }),
    Cr)
  )
    return null;
  let filtered_6 = Vr.map((Io) => Io.name).filter((Io) => Se.has(Io));
  return {
    addedNames: Oo.sort(),
    addedLines: Vr.filter((Io) => !Se.has(Io.name))
      .map((Io) => (Z ? Io.name : formatDeferredToolLine(Io)))
      .sort(),
    removedNames: vn.sort(),
    wireHiddenNames: Kn.sort(),
    readdedNames: [...mapped, ...filtered_5.map((Io) => Io.name)].sort(),
    ...(pendingMcpServers !== void 0 && { pendingMcpServers: un }),
    ...(needsAuthMcpServers !== void 0 && { needsAuthMcpServers: br }),
    ...(failedMcpServers !== void 0 && { failedMcpServers: Fr }),
    ...(_r.length > 0 && { retractedTools: _r }),
    ...(filtered_4.length > 0 && { restoredNames: filtered_4.sort() }),
    ...(jr.length > 0 && { surfacedNames: jr.sort() }),
    ...(Z && { toolSearchAbsent: !0 }),
    ...(filtered_6.length > 0 && { loadedNames: filtered_6.sort() }),
  };
}
/**
 * checkAutoThreshold：tst-auto 模式下比较延迟工具的 token 数（按 API 计数缓存）与 getAutoToolSearchTokenThreshold；计数失败时退回字符数估算（chars/2.5）。
 */
//@ chunk-e6aww6q8.js:2397299-2397728 fingerprint = checkAutoThreshold (1)
async function checkAutoThreshold(tools, getToolPermissionContext, agents, model, credentials) {
  await awaitArtifactRosterSafe(tools);
  let y = await getDeferredToolTokenCountCached(tools, getToolPermissionContext, agents, model, credentials);
  if (y !== null) {
    let L = getAutoToolSearchTokenThreshold(model);
    return {
      enabled: y >= L,
      debugDescription: `${y} tokens (threshold: ${L}, ${getAutoToolSearchPercentage()}% of context)`,
      metrics: { deferredToolTokens: y, threshold: L },
    };
  }
  let deferredToolTokens = await calculateDeferredToolDescriptionChars(
      tools,
      getToolPermissionContext,
      agents,
      model,
    ),
    threshold = getAutoToolSearchCharThreshold(model);
  return {
    enabled: deferredToolTokens >= threshold,
    debugDescription: `${deferredToolTokens} chars (threshold: ${threshold}, ${getAutoToolSearchPercentage()}% of context) (char fallback)`,
    metrics: { deferredToolDescriptionChars: deferredToolTokens, charThreshold: threshold },
  };
}
//@ chunk-mp7v59a0.js:6956-7177 fingerprint = parseAutoPercentage (1)
function parseAutoPercentage(value) {
  if (!value.startsWith("auto:")) return null;
  let percentStr = value.slice(5),
    r = parseIntLoose(percentStr);
  if (isNaN(r))
    return (
      logForDebugging(`Invalid ENABLE_TOOL_SEARCH value "${value}": expected auto:N where N is a number.`),
      null
    );
  return Math.max(0, Math.min(100, r));
}
//@ chunk-mp7v59a0.js:7177-7247 fingerprint = isAutoToolSearchMode (1)
function isAutoToolSearchMode(value) {
  if (!value) return !1;
  return value === "auto" || value.startsWith("auto:");
}
/**
 * getToolSearchMode：实验 beta 关闭或 HIPAA（且非 force）→ standard；force → tst；ENABLE_TOOL_SEARCH 为 auto:0 → tst、auto:100 → standard、auto/auto:N → tst-auto、真值 → tst、假值 → standard；未设置默认 tst。
 */
//@ chunk-mp7v59a0.js:7247-7495 fingerprint = getToolSearchMode (0.928)
function getToolSearchMode() {
  if (isToolSearchDisabledByBetas()) return "standard";
  if (isToolSearchForceOverride()) return "tst";
  let value = process.env.ENABLE_TOOL_SEARCH,
    autoPercent = value ? parseAutoPercentage(value) : null;
  if (autoPercent === 0) return "tst";
  if (autoPercent === 100) return "standard";
  if (isAutoToolSearchMode(value)) return "tst-auto";
  if (isEnvTruthy(value)) return "tst";
  if (isEnvDefinedFalsy(value)) return "standard";
  return "tst";
}
//@ chunk-mp7v59a0.js:7495-7665 callgraph-fingerprint = DEFAULT_UNSUPPORTED_MODEL_PATTERNS (0.177)
var DEFAULT_UNSUPPORTED_MODEL_PATTERNS = [
    "claude-3-opus",
    "claude-3-sonnet",
    "claude-3-haiku",
    "claude-3-5-sonnet",
    "claude-3-5-haiku",
    "claude-3-7-sonnet",
  ],
  VERTEX_TOOL_SEARCH_MIN_VERSIONS = [
    ["opus", [4, 5]],
    ["sonnet", [4, 5]],
    ["haiku", [4, 5]],
  ];
/**
 * Vertex 上不支持工具搜索 beta 的模型：claude-3 系列，或 opus/sonnet/haiku 低于 4.5。
 */
//@ chunk-mp7v59a0.js:7665-7841 layout
function isVertexModelWithoutToolSearch(e) {
  if (getAPIProvider() !== "vertex") return !1;
  let replaced = Bn(e).replace(/[@-]\d{8}$/, "");
  if (/^claude-3(-|$)/.test(replaced)) return !0;
  return (
    /^claude-(opus|sonnet|haiku)-\d/.test(replaced) &&
    !isModelVersionAtLeast(replaced, VERTEX_TOOL_SEARCH_MIN_VERSIONS)
  );
}
//@ chunk-mp7v59a0.js:7841-7956 fingerprint = getUnsupportedToolReferencePatterns (1)
function getUnsupportedToolReferencePatterns() {
  try {
    let patterns = getFeatureValue_CACHED_MAY_BE_STALE("tengu_tool_search_unsupported_models", null);
    if (Array.isArray(patterns)) return patterns;
  } catch {}
  return DEFAULT_UNSUPPORTED_MODEL_PATTERNS;
}
//@ chunk-mp7v59a0.js:7956-7965 layout
var EMPTY_NON_DEFERRABLE = [];
//@ chunk-mp7v59a0.js:7965-8226 layout
function pickValueForMainLoopModel(e) {
  if (e === null || Array.isArray(e) || typeof e !== "object") return e;
  let o = e,
    r = getMainLoopModelOverride(),
    n = r !== void 0 ? r : getInitialMainLoopModel();
  if (typeof n === "string") {
    let lower = n.toLowerCase();
    for (let a of Object.keys(o))
      if (a !== "*" && a.length > 0 && lower.includes(a.toLowerCase())) return o[a];
  }
  return o["*"];
}
/**
 * 不可延迟的内建工具名：GrowthBook tengu_non_deferrable_builtins（可按模型名分键）与托管设置 non_deferrable_builtins 的并集。
 */
//@ chunk-mp7v59a0.js:8226-8535 layout
function getNonDeferrableBuiltins() {
  let e = new Set();
  try {
    let o = pickValueForMainLoopModel(
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_non_deferrable_builtins", null),
    );
    if (Array.isArray(o)) {
      for (let r of o) if (typeof r === "string") e.add(r);
    }
  } catch {}
  try {
    let o = getCachedClientData()?.non_deferrable_builtins;
    if (Array.isArray(o)) {
      for (let r of o) if (typeof r === "string") e.add(r);
    }
  } catch {}
  if (e.size === 0) return EMPTY_NON_DEFERRABLE;
  return [...e];
}
/**
 * GrowthBook tengu_shiny_stardust（默认 false）：为真时 ReportFindings、Workflow、ShareOnboardingGuide 也按延迟工具处理。
 */
//@ chunk-mp7v59a0.js:8535-8587 layout
function isDeferSpecialToolsEnabled() {
  return getFeatureValue_SESSION_PINNED("tengu_shiny_stardust", !1);
}
//@ chunk-mp7v59a0.js:8587-8616 layout
var TENGU_DRIFTING_HERON = "tengu_drifting_heron";
/**
 * GrowthBook tengu_drifting_heron（默认 true）；关闭时 PushNotification 在条件满足时不延迟。
 */
//@ chunk-mp7v59a0.js:8616-8652 layout
function isPushNotificationDeferrable() {
  return getFeatureValue_SESSION_PINNED(TENGU_DRIFTING_HERON, !0) !== !1;
}
//@ chunk-mp7v59a0.js:8652-8679 layout
var TENGU_FANCY_MILNER = "tengu_fancy_milner";
/**
 * pf() 且 GrowthBook tengu_fancy_milner（默认 true）：启用"按值定义"跟踪，ToolSearch 能识别已内联的工具并提示"直接调用"。
 */
//@ chunk-mp7v59a0.js:8679-8721 layout
function isToolDefinedByValueEnabled() {
  return isFoamySpringEnabled() && getFeatureValue_SESSION_PINNED(TENGU_FANCY_MILNER, !0) !== !1;
}
/**
 * 模型是否支持 tool_reference 块：名字不含 tengu_tool_search_unsupported_models（默认 claude-3 系列）中的任一模式。
 */
//@ chunk-mp7v59a0.js:8721-8829 file-local
function modelSupportsToolReference(model) {
  let normalizedModel = model.toLowerCase(),
    unsupportedPatterns = getUnsupportedToolReferencePatterns();
  for (let pattern of unsupportedPatterns) if (normalizedModel.includes(pattern.toLowerCase())) return !1;
  return !0;
}
/**
 * GrowthBook tengu_tranquil_starlight 开启时，把提示词里的 Chrome 核心工具 select 查询追加 browser_batch。
 */
//@ chunk-mp7v59a0.js:8829-8908 layout
function maybeAddBrowserBatchToChromeSelect(e) {
  let o = addBrowserBatchToChromeSelect(e);
  return o !== e && getFeatureValue_SESSION_PINNED("tengu_tranquil_starlight", !1) ? o : e;
}
/**
 * isToolSearchEnabledOptimistic：模式不是 standard 即为真（只记一次调试日志）。决定 getAllBaseTools 是否注册 ToolSearch。316 删掉了旧版"自定义 ANTHROPIC_BASE_URL 时关闭"的分支。
 */
//@ chunk-mp7v59a0.js:8908-9262 fingerprint = isToolSearchEnabledOptimistic (0.823)
function isToolSearchEnabledOptimistic() {
  let mode = getToolSearchMode();
  if (mode === "standard") {
    if (claimOnce().claim("tool_search_optimistic_decision"))
      logForDebugging(
        `[ToolSearch:optimistic] mode=${mode}, ENABLE_TOOL_SEARCH=${env.ENABLE_TOOL_SEARCH}, result=false`,
      );
    return !1;
  }
  if (claimOnce().claim("tool_search_optimistic_decision"))
    logForDebugging(
      `[ToolSearch:optimistic] mode=${mode}, ENABLE_TOOL_SEARCH=${env.ENABLE_TOOL_SEARCH}, result=true`,
    );
  return !0;
}
/**
 * 判断内容块是 tool_reference。
 */
//@ chunk-5jgfyd2q.js:191-283 fingerprint = isToolReferenceBlock (1)
function isToolReferenceBlock(obj) {
  return typeof obj === "object" && obj !== null && "type" in obj && obj.type === "tool_reference";
}
//@ chunk-5jgfyd2q.js:283-319 layout
function joinWithNewline(e, r) {
  return `${e}
${r}`;
}
/**
 * 判断内容块是带字符串 tool_name 的 tool_reference。
 */
//@ chunk-5jgfyd2q.js:319-397 fingerprint = isToolReferenceWithName (1)
function isToolReferenceWithName(obj) {
  return isToolReferenceBlock(obj) && "tool_name" in obj && typeof obj.tool_name === "string";
}
//@ chunk-5jgfyd2q.js:397-527 layout = isToolResultBlockWithContent (1)
function isToolResultBlockWithContent(obj) {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "type" in obj &&
    obj.type === "tool_result" &&
    "content" in obj &&
    Array.isArray(obj.content)
  );
}
/**
 * 收集历史里所有 tool_reference（tool_result 内）与 surfacedOnWire 的宣告名，返回 [{toolUseId, toolName}]。
 */
//@ chunk-5jgfyd2q.js:527-1081 placement
function collectToolReferences(e, r) {
  let s = [];
  for (let o of e) {
    if (
      r?.surfacedOnWire !== void 0 &&
      o.type === "attachment" &&
      o.attachment.type === "deferred_tools_delta"
    ) {
      let surfacedNames = o.attachment.surfacedNames;
      for (let t of Array.isArray(surfacedNames) ? surfacedNames : [])
        if (typeof t === "string" && r.surfacedOnWire.has(t)) s.push({ toolUseId: o.uuid, toolName: t });
      continue;
    }
    if (o.type !== "user") continue;
    let c = o.message?.content;
    if (!Array.isArray(c)) continue;
    for (let n of c) {
      if (!isToolResultBlockWithContent(n) || typeof n.tool_use_id !== "string") continue;
      for (let t of n.content)
        if (isToolReferenceWithName(t)) s.push({ toolUseId: n.tool_use_id, toolName: t.tool_name });
    }
  }
  return s;
}
//@ chunk-4121qate.js:282328-282438 fingerprint = isToolResultBlockWithContent (1)
function toSlimTranscriptMessage(obj) {
  let { message: message, agentId: agentId } = obj;
  return { message: wS(message, ["type", "content"]), ...(agentId !== void 0 && { agentId: agentId }) };
}

export {
  joinWithNewline,
  isToolReferenceBlock,
  isToolSearchEnabledOptimistic,
  isToolSearchToolAvailable,
  isToolSearchPrecluded,
  toolSearchRejectedOn,
  extractDiscoveredToolNames,
  getNonDeferrableBuiltins,
  isToolSearchEnabled,
  toolSearchToolFilteredOut,
  isToolDefinedByValueEnabled,
  collectToolReferences,
  isToolResultBlockWithContent,
  isToolReferenceWithName,
  isDeferSpecialToolsEnabled,
  isPushNotificationDeferrable,
  toSlimTranscriptMessage,
  modelSupportsToolReference,
  isVertexModelWithoutToolSearch,
  getToolSearchMode,
  toolSearchDeclaredIn,
  getDeferredToolsDelta,
  maybeAddBrowserBatchToChromeSelect,
  scanDeferredToolsDeltaHistory,
  rGt,
};
