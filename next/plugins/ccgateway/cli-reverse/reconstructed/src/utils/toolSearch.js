/**
 * utils/toolSearch.ts
 *
 * 工具搜索（延迟加载）判定：模式 tst/tst-auto/standard（ENABLE_TOOL_SEARCH）、模型/部署支持、自动阈值（上下文 10%）、不可延迟内建列表、deferred_tools_delta 附件生成与历史扫描、已发现工具提取；混入 Chrome 提示词片段与若干 fingerprint-shared 克隆
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/toolSearch.ts
 * pieces: chunk-5xgkngpb.js (22), chunk-png42f8p.js (18), chunk-tacvwrx2.js (5)
 * attribution: fingerprint 10, placement 2, layout 21, file-local 3, facade-exports 8, callgraph-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { parseIntLoose, isEnvTruthy, isEnvDefinedFalsy } from "./envUtils.js";
import { logForDebugging } from "./debug.js";
import {
  isToolSearchDisabledByBetas,
  isToolSearchForceOverride,
  isModelVersionAtLeast,
  addBrowserBatchToChromeSelect,
} from "./toolSearchChrome.js";
import { getAPIProvider, isFirstPartyAnthropicBaseUrl } from "./model/providers.js";
import { stripAnyVersatileSuffix } from "./model/modelIds.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  getFeatureValue_SESSION_PINNED,
} from "../services/analytics/growthbook.js";
import {
  getMainLoopModelOverride,
  getInitialMainLoopModel,
  getRootSession,
  getRefusedBetasForModel,
  getMcpConnectNonBlocking,
} from "../bootstrap/state.js";
import { getCachedClientData } from "./config.js";
import { isFoamySpringEnabled } from "../services/analytics/growthbookGates.js";
import { includesAnyIgnoreCase } from "./toolErrors.js";
import { claimOnce } from "../services/api/verificationRequired.js";
import { env } from "./env.js";
import { regExp_11, parseRemovedToolCauses } from "../services/mcp/mcpToolRemovalReasons.js";
import { stringArray as stringArray_2, countWhere } from "./collections.js";
import { RETIRED_TOOL_NAMES } from "../tools/retiredTools.js";
import { getContextWindow } from "./model/configs.js";
import { betaHeaderValues, getMergedBetas, getToolSearchBeta } from "./betas.js";
import { HostScoped } from "./hostScoped.js";
import {
  isDeferredTool as isDeferredTool_2,
  TOOL_SEARCH_TOOL_NAME,
  isDeferredToolInConversation,
  surfacedByValue,
  formatDeferredToolLine,
} from "../tools/ToolSearchTool/prompt.js";
import { countToolDefinitionTokens, TOOL_DEFINITION_TOKEN_OVERHEAD } from "./analyzeContext.js";
import { matchesToolName } from "../Tool.js";
import { jsonStringify } from "./slowOperations.js";
import { toolInputJsonSchema } from "../plugins/functionHooks/types/builtinToolSchemas.js";
import { getCanonicalName } from "./model/canonicalModelName.js";
import { foundrySupportsCapability } from "../services/api/foundryCapabilities.js";
import { isBetaRejected as isBetaRejected_2 } from "../bootstrap/stateSlices.js";
import { toProviderWireModelId } from "./model/model.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum, fromEnumArr } from "../services/analytics/safeMetadata.js";
import { telemetrySafeModelName } from "./model/telemetryModelName.js";
import {
  stripToolReferencesBeforeCompaction,
  normalizeToolReference,
  normalizeMcpServerName,
} from "../services/api/deferredToolsState.js";
import { hideCodeModeOnlyTools } from "../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { compareStringsGrouped } from "./stringUtils.js";
import { uniqByExport } from "../../vendor/lodash-es/uniqBy.js";
import { normalizeCaseForComparison_2 } from "./permissions/filesystem.js";
import { identityMap } from "../remote/tools/protocolConstants.js";
import { countByAlias } from "../../vendor/lodash-es/countBy.js";
import { agentTypeForTelemetry } from "../services/analytics/metadata.js";
import { awaitArtifactRosterSafe } from "../services/artifacts/rosterWait.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-tacvwrx2.js:191-283 fingerprint (2.1.88 match: isToolReferenceBlock, 1)
/**
 * 判断内容块是 tool_reference。
 */
function isToolReferenceBlock(obj) {
  return typeof obj === "object" && obj !== null && "type" in obj && obj.type === "tool_reference";
}
//@ chunk-tacvwrx2.js:283-319 layout
function joinWithNewline(a, b) {
  return `${a}
${b}`;
}
//@ chunk-tacvwrx2.js:319-397 layout (2.1.88 match: isToolReferenceWithName, 1)
/**
 * 判断内容块是带字符串 tool_name 的 tool_reference。
 */
function isToolReferenceWithName(obj) {
  return isToolReferenceBlock(obj) && "tool_name" in obj && typeof obj.tool_name === "string";
}
//@ chunk-tacvwrx2.js:397-527 layout (2.1.88 match: isToolResultBlockWithContent, 1)
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
//@ chunk-tacvwrx2.js:527-1081 placement
/**
 * 收集历史里所有 tool_reference（tool_result 内）与 surfacedOnWire 的宣告名，返回 [{toolUseId, toolName}]。
 */
function collectToolReferences(tools, opts) {
  let refs = [];
  for (let tool of tools) {
    if (
      opts?.surfacedOnWire !== undefined &&
      tool.type === "attachment" &&
      tool.attachment.type === "deferred_tools_delta"
    ) {
      let surfacedNames = tool.attachment.surfacedNames;
      for (let surfacedName of Array.isArray(surfacedNames) ? surfacedNames : [])
        if (typeof surfacedName === "string" && opts.surfacedOnWire.has(surfacedName))
          refs.push({
            toolUseId: tool.uuid,
            toolName: surfacedName,
          });
      continue;
    }
    if (tool.type !== "user") continue;
    let content = tool.message?.content;
    if (!Array.isArray(content)) continue;
    for (let block of content) {
      if (!isToolResultBlockWithContent(block) || typeof block.tool_use_id !== "string") continue;
      for (let innerBlock of block.content)
        if (isToolReferenceWithName(innerBlock))
          refs.push({
            toolUseId: block.tool_use_id,
            toolName: innerBlock.tool_name,
          });
    }
  }
  return refs;
}
//@ chunk-png42f8p.js:6960-7181 fingerprint (2.1.88 match: parseAutoPercentage, 1)
function parseAutoPercentage(value) {
  if (!value.startsWith("auto:")) return null;
  let percentStr = value.slice(5);
  let percent = parseIntLoose(percentStr);
  if (isNaN(percent)) {
    logForDebugging(`Invalid ENABLE_TOOL_SEARCH value "${value}": expected auto:N where N is a number.`);
    return null;
  }
  return Math.max(0, Math.min(100, percent));
}
//@ chunk-png42f8p.js:7181-7251 fingerprint (2.1.88 match: isAutoToolSearchMode, 1)
function isAutoToolSearchMode(value) {
  if (!value) return false;
  return value === "auto" || value.startsWith("auto:");
}
//@ chunk-png42f8p.js:7251-7499 fingerprint (2.1.88 match: getToolSearchMode, 0.928)
/**
 * getToolSearchMode：实验 beta 关闭或 HIPAA（且非 force）→ standard；force → tst；ENABLE_TOOL_SEARCH 为 auto:0 → tst、auto:100 → standard、auto/auto:N → tst-auto、真值 → tst、假值 → standard；未设置默认 tst。
 */
function getToolSearchMode() {
  if (isToolSearchDisabledByBetas()) return "standard";
  if (isToolSearchForceOverride()) return "tst";
  let value = process.env.ENABLE_TOOL_SEARCH;
  let autoPercent = value ? parseAutoPercentage(value) : null;
  if (autoPercent === 0) return "tst";
  if (autoPercent === 100) return "standard";
  if (isAutoToolSearchMode(value)) return "tst-auto";
  if (isEnvTruthy(value)) return "tst";
  if (isEnvDefinedFalsy(value)) return "standard";
  return "tst";
}
//@ chunk-png42f8p.js:7499-7669 callgraph-fingerprint (2.1.88 match: DEFAULT_UNSUPPORTED_MODEL_PATTERNS, 0.177)
var DEFAULT_UNSUPPORTED_MODEL_PATTERNS = [
  "claude-3-opus",
  "claude-3-sonnet",
  "claude-3-haiku",
  "claude-3-5-sonnet",
  "claude-3-5-haiku",
  "claude-3-7-sonnet",
];
var VERTEX_TOOL_SEARCH_MIN_VERSIONS = [
  ["opus", [4, 5]],
  ["sonnet", [4, 5]],
  ["haiku", [4, 5]],
];
//@ chunk-png42f8p.js:7669-7845 layout
/**
 * Vertex 上不支持工具搜索 beta 的模型：claude-3 系列，或 opus/sonnet/haiku 低于 4.5。
 */
function isVertexModelWithoutToolSearch(canonicalName) {
  if (getAPIProvider() !== "vertex") return false;
  let model = stripAnyVersatileSuffix(canonicalName).replace(/[@-]\d{8}$/, "");
  if (/^claude-3(-|$)/.test(model)) return true;
  return (
    /^claude-(opus|sonnet|haiku)-\d/.test(model) &&
    !isModelVersionAtLeast(model, VERTEX_TOOL_SEARCH_MIN_VERSIONS)
  );
}
//@ chunk-png42f8p.js:7845-7960 fingerprint (2.1.88 match: getUnsupportedToolReferencePatterns, 1)
function getUnsupportedToolReferencePatterns() {
  try {
    let patterns = getFeatureValue_CACHED_MAY_BE_STALE("tengu_tool_search_unsupported_models", null);
    if (Array.isArray(patterns)) return patterns;
  } catch {}
  return DEFAULT_UNSUPPORTED_MODEL_PATTERNS;
}
//@ chunk-png42f8p.js:7960-7969 layout
var EMPTY_NON_DEFERRABLE = [];
//@ chunk-png42f8p.js:7969-8230 layout
function pickValueForMainLoopModel(featureValue_CACHED_MAY_BE_STALE) {
  if (
    featureValue_CACHED_MAY_BE_STALE === null ||
    Array.isArray(featureValue_CACHED_MAY_BE_STALE) ||
    typeof featureValue_CACHED_MAY_BE_STALE !== "object"
  )
    return featureValue_CACHED_MAY_BE_STALE;
  let names = featureValue_CACHED_MAY_BE_STALE;
  let mainLoopModelOverride = getMainLoopModelOverride();
  let mainLoopModel = mainLoopModelOverride !== undefined ? mainLoopModelOverride : getInitialMainLoopModel();
  if (typeof mainLoopModel === "string") {
    let lower = mainLoopModel.toLowerCase();
    for (let key of Object.keys(names))
      if (key !== "*" && key.length > 0 && lower.includes(key.toLowerCase())) return names[key];
  }
  return names["*"];
}
//@ chunk-png42f8p.js:8230-8539 layout
/**
 * 不可延迟的内建工具名：GrowthBook tengu_non_deferrable_builtins（可按模型名分键）与托管设置 non_deferrable_builtins 的并集。
 */
function getNonDeferrableBuiltins() {
  let names = new Set();
  try {
    let toolNames = pickValueForMainLoopModel(
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_non_deferrable_builtins", null),
    );
    if (Array.isArray(toolNames)) {
      for (let toolName of toolNames) if (typeof toolName === "string") names.add(toolName);
    }
  } catch {}
  try {
    let nonDeferrableBuiltins = getCachedClientData()?.non_deferrable_builtins;
    if (Array.isArray(nonDeferrableBuiltins)) {
      for (let nonDeferrableBuiltin of nonDeferrableBuiltins)
        if (typeof nonDeferrableBuiltin === "string") names.add(nonDeferrableBuiltin);
    }
  } catch {}
  if (names.size === 0) return EMPTY_NON_DEFERRABLE;
  return [...names];
}
//@ chunk-png42f8p.js:8539-8591 layout
/**
 * GrowthBook tengu_shiny_stardust（默认 false）：为真时 ReportFindings、Workflow、ShareOnboardingGuide 也按延迟工具处理。
 */
function isDeferSpecialToolsEnabled() {
  return getFeatureValue_SESSION_PINNED("tengu_shiny_stardust", false);
}
//@ chunk-png42f8p.js:8591-8620 layout
var TENGU_DRIFTING_HERON = "tengu_drifting_heron";
//@ chunk-png42f8p.js:8620-8656 layout
/**
 * GrowthBook tengu_drifting_heron（默认 true）；关闭时 PushNotification 在条件满足时不延迟。
 */
function isPushNotificationDeferrable() {
  return getFeatureValue_SESSION_PINNED(TENGU_DRIFTING_HERON, true) !== false;
}
//@ chunk-png42f8p.js:8656-8683 layout
var TENGU_FANCY_MILNER = "tengu_fancy_milner";
//@ chunk-png42f8p.js:8683-8725 layout
/**
 * pf() 且 GrowthBook tengu_fancy_milner（默认 true）：启用"按值定义"跟踪，ToolSearch 能识别已内联的工具并提示"直接调用"。
 */
function isToolDefinedByValueEnabled() {
  return isFoamySpringEnabled() && getFeatureValue_SESSION_PINNED(TENGU_FANCY_MILNER, true) !== false;
}
//@ chunk-png42f8p.js:8725-8833 file-local
/**
 * 模型是否支持 tool_reference 块：名字不含 tengu_tool_search_unsupported_models（默认 claude-3 系列）中的任一模式。
 */
function modelSupportsToolReference(model) {
  let normalizedModel = model.toLowerCase();
  let unsupportedPatterns = getUnsupportedToolReferencePatterns();
  for (let pattern of unsupportedPatterns) if (normalizedModel.includes(pattern.toLowerCase())) return false;
  return true;
}
//@ chunk-png42f8p.js:8833-8959 layout
function supportsToolReferenceOrPelican(model) {
  if (modelSupportsToolReference(model)) return true;
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE("tengu_swift_pelican", null);
  return (
    getAPIProvider() === "firstParty" &&
    Array.isArray(featureValue_CACHED_MAY_BE_STALE) &&
    includesAnyIgnoreCase(model, featureValue_CACHED_MAY_BE_STALE)
  );
}
//@ chunk-png42f8p.js:8959-9038 layout
/**
 * GrowthBook tengu_tranquil_starlight 开启时，把提示词里的 Chrome 核心工具 select 查询追加 browser_batch。
 */
function maybeAddBrowserBatchToChromeSelect(chromeSystemPrompt) {
  let prompt = addBrowserBatchToChromeSelect(chromeSystemPrompt);
  return prompt !== chromeSystemPrompt && getFeatureValue_SESSION_PINNED("tengu_tranquil_starlight", false)
    ? prompt
    : chromeSystemPrompt;
}
//@ chunk-png42f8p.js:9038-9392 fingerprint (2.1.88 match: isToolSearchEnabledOptimistic, 0.823)
/**
 * isToolSearchEnabledOptimistic：模式不是 standard 即为真（只记一次调试日志）。决定 getAllBaseTools 是否注册 ToolSearch。316 删掉了旧版"自定义 ANTHROPIC_BASE_URL 时关闭"的分支。
 */
function isToolSearchEnabledOptimistic() {
  let mode = getToolSearchMode();
  if (mode === "standard") {
    if (claimOnce().claim("tool_search_optimistic_decision"))
      logForDebugging(
        `[ToolSearch:optimistic] mode=${mode}, ENABLE_TOOL_SEARCH=${env.ENABLE_TOOL_SEARCH}, result=false`,
      );
    return false;
  }
  if (claimOnce().claim("tool_search_optimistic_decision"))
    logForDebugging(
      `[ToolSearch:optimistic] mode=${mode}, ENABLE_TOOL_SEARCH=${env.ENABLE_TOOL_SEARCH}, result=true`,
    );
  return true;
}
//@ chunk-5xgkngpb.js:1708706-1710898 fingerprint (2.1.88 match: getDeferredToolsDelta, 0.362)
/**
 * 扫描历史消息里的 deferred_tools_delta 附件，重建已宣告、按块露出、断开撤回、线上隐藏、定义撤回、已列出、上次 pending/needsAuth/failed 等集合，供 getDeferredToolsDelta 与 ToolSearch 使用。
 */
function scanDeferredToolsDeltaHistory(messages, { loaded, byNameAnnouncements, toolAdditionOnly }) {
  let announced = new Set();
  let surfacedWithBlocks = new Set();
  let retractedAsDisconnected = new Set();
  let wireHiddenStanding = new Set();
  let definitionRetracted = new Set();
  let failedWhileListed = new Set();
  let nameByToolUse = new Map();
  let listed = new Set();
  let lastPending = [];
  let lastNeedsAuth = [];
  let lastFailed = [];
  let attachmentCount = 0;
  let deltaCount = 0;
  let attachmentTypesSeen = new Set();
  for (let msg of messages) {
    if (msg.type === "assistant" && Array.isArray(msg.message?.content)) {
      for (let block of msg.message.content)
        if (block.type === "tool_use") nameByToolUse.set(block.id, block.name);
    }
    if (msg.type === "user" && Array.isArray(msg.message?.content))
      for (let block of msg.message.content) {
        if (block.type !== "tool_result" || block.is_error !== true) continue;
        let contentBlock = Array.isArray(block.content) ? block.content[0] : block.content;
        let text =
          typeof contentBlock === "string"
            ? contentBlock
            : contentBlock?.type === "text"
              ? contentBlock.text
              : "";
        let failedName = regExp_11.exec(text)?.[1];
        if (failedName !== undefined && nameByToolUse.get(block.tool_use_id) === failedName)
          failedWhileListed.add(failedName);
      }
    if (msg.type !== "attachment") continue;
    attachmentCount++;
    attachmentTypesSeen.add(msg.attachment.type);
    if (msg.attachment.type !== "deferred_tools_delta") continue;
    deltaCount++;
    let deferredNames = new Set(stringArray_2(msg.attachment.readdedNames));
    let poolNames = new Set(stringArray_2(msg.attachment.loadedNames));
    let surfacedByBlocks =
      byNameAnnouncements !== undefined && !byNameAnnouncements.has(msg.uuid)
        ? new Set(stringArray_2(msg.attachment.surfacedNames))
        : undefined;
    let addedNames = Array.isArray(msg.attachment.addedLines) ? stringArray_2(msg.attachment.addedNames) : [];
    for (let toolName of addedNames) {
      if (RETIRED_TOOL_NAMES.has(toolName)) continue;
      announced.add(toolName);
      retractedAsDisconnected.delete(toolName);
      wireHiddenStanding.delete(toolName);
      definitionRetracted.delete(toolName);
      if (poolNames.has(toolName) && !loaded.has(toolName) && !surfacedByBlocks?.has(toolName)) continue;
      if (!deferredNames.has(toolName) || surfacedByBlocks?.has(toolName)) listed.add(toolName);
    }
    for (let toolName of stringArray_2(msg.attachment.removedNames)) {
      announced.delete(toolName);
      retractedAsDisconnected.add(toolName);
      wireHiddenStanding.delete(toolName);
    }
    for (let toolName of stringArray_2(msg.attachment.wireHiddenNames)) {
      announced.delete(toolName);
      retractedAsDisconnected.delete(toolName);
      wireHiddenStanding.add(toolName);
    }
    if (Array.isArray(msg.attachment.pendingMcpServers))
      lastPending = stringArray_2(msg.attachment.pendingMcpServers);
    if (Array.isArray(msg.attachment.needsAuthMcpServers))
      lastNeedsAuth = stringArray_2(msg.attachment.needsAuthMcpServers);
    if (Array.isArray(msg.attachment.failedMcpServers)) lastFailed = msg.attachment.failedMcpServers;
    for (let retracted of parseRemovedToolCauses(msg.attachment.retractedTools))
      definitionRetracted.add(retracted.name);
    for (let toolName of stringArray_2(msg.attachment.restoredNames)) definitionRetracted.delete(toolName);
    for (let toolName of stringArray_2(msg.attachment.runsAgainNames)) failedWhileListed.delete(toolName);
    if (toolAdditionOnly !== undefined && !toolAdditionOnly.nameOnlyAnnouncements.has(msg.uuid))
      for (let toolName of stringArray_2(msg.attachment.surfacedNames)) surfacedWithBlocks.add(toolName);
  }
  return {
    announced,
    surfacedWithBlocks,
    retractedAsDisconnected,
    wireHiddenStanding,
    definitionRetracted,
    failedWhileListed,
    listed,
    lastPending,
    lastNeedsAuth,
    lastFailed,
    attachmentCount,
    dtdCount: deltaCount,
    attachmentTypesSeen,
  };
}
//@ chunk-5xgkngpb.js:2443824-2443903 placement
/**
 * 自定义 base URL 且未显式开启时，工具搜索默认锁定为关。
 */
function isToolSearchLockedOffByDefault() {
  return (
    !env.ENABLE_TOOL_SEARCH &&
    !isToolSearchForceOverride() &&
    getAPIProvider() === "firstParty" &&
    !isFirstPartyAnthropicBaseUrl()
  );
}
//@ chunk-5xgkngpb.js:2443903-2443914 layout
var DEFAULT_AUTO_TOOL_SEARCH_PERCENTAGE = 10;
//@ chunk-5xgkngpb.js:2443914-2444053 fingerprint (2.1.88 match: getAutoToolSearchPercentage, 1)
function getAutoToolSearchPercentage() {
  let value = process.env.ENABLE_TOOL_SEARCH;
  if (!value) return DEFAULT_AUTO_TOOL_SEARCH_PERCENTAGE;
  if (value === "auto") return DEFAULT_AUTO_TOOL_SEARCH_PERCENTAGE;
  let parsed = parseAutoPercentage(value);
  if (parsed !== null) return parsed;
  return DEFAULT_AUTO_TOOL_SEARCH_PERCENTAGE;
}
//@ chunk-5xgkngpb.js:2444053-2444065 layout
var CHARS_PER_TOKEN = 2.5;
//@ chunk-5xgkngpb.js:2444065-2444139 file-local
function getAutoToolSearchTokenThreshold(model) {
  let contextWindow = getContextWindow(model, betaHeaderValues(getMergedBetas(model)));
  let percentage = getAutoToolSearchPercentage() / 100;
  return Math.floor(contextWindow * percentage);
}
//@ chunk-5xgkngpb.js:2444139-2444185 file-local
function getAutoToolSearchCharThreshold(model) {
  return Math.floor(getAutoToolSearchTokenThreshold(model) * CHARS_PER_TOKEN);
}
//@ chunk-5xgkngpb.js:2444185-2444282 layout
class DeferredTokenCountCache {
  counts = new Map();
  lookup(a) {
    return this.counts.get(a);
  }
  remember(b, c) {
    this.counts.set(b, c);
  }
}
//@ chunk-5xgkngpb.js:2444282-2444309 layout
var deferredTokenCountCacheByHost; // deferred: uses DeferredTokenCountCache of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:2444282", () => {
  deferredTokenCountCacheByHost = new HostScoped(() => new DeferredTokenCountCache());
});
//@ chunk-5xgkngpb.js:2444309-2444506 layout
/**
 * 按延迟工具名列表（按 host 分开缓存）缓存延迟工具定义的 token 数。
 */
function getDeferredToolTokenCountCached(tools, getToolPermissionContext, agents, model, credentials) {
  let nonDeferrableBuiltins = getNonDeferrableBuiltins();
  let deferredTools = tools.filter((tool) => isDeferredTool_2(tool, nonDeferrableBuiltins));
  let joined = deferredTools.map((a) => a.name).join(",");
  let b = deferredTokenCountCacheByHost.of(getRootSession().host);
  let c = b.lookup(joined);
  if (c !== undefined) return c;
  let d = countDeferredToolTokens(deferredTools, getToolPermissionContext, agents, model, credentials);
  b.remember(joined, d);
  return d;
}
//@ chunk-5xgkngpb.js:2444506-2444682 layout
async function countDeferredToolTokens(deferredTools, getToolPermissionContext, agents, model, credentials) {
  if (deferredTools.length === 0) return 0;
  try {
    let total = await countToolDefinitionTokens(
      deferredTools,
      getToolPermissionContext,
      {
        activeAgents: agents,
        allAgents: agents,
      },
      model,
      credentials,
    );
    if (total === 0) return null;
    return Math.max(0, total - TOOL_DEFINITION_TOKEN_OVERHEAD);
  } catch {
    return null;
  }
}
//@ chunk-5xgkngpb.js:2444682-2444727 facade-exports
/**
 * 工具列表里是否有 ToolSearch。
 */
function isToolSearchToolAvailable(tools) {
  return tools.some((tool) => matchesToolName(tool, TOOL_SEARCH_TOOL_NAME));
}
//@ chunk-5xgkngpb.js:2444727-2445077 fingerprint (2.1.88 match: calculateDeferredToolDescriptionChars, 1)
/**
 * 估算延迟工具定义的字符数：名字 + prompt 文本 + 输入 JSON schema 长度之和。
 */
async function calculateDeferredToolDescriptionChars(tools, getToolPermissionContext, agents, model) {
  let nonDeferrableBuiltins = getNonDeferrableBuiltins();
  let deferredTools = tools.filter((t) => isDeferredTool_2(t, nonDeferrableBuiltins));
  if (deferredTools.length === 0) return 0;
  return (
    await Promise.all(
      deferredTools.map(async (tool) => {
        let description = await tool.prompt({
          getToolPermissionContext,
          tools,
          agents,
          model,
        });
        let inputSchema = tool.inputJSONSchema
          ? jsonStringify(tool.inputJSONSchema)
          : tool.inputSchema
            ? jsonStringify(toolInputJsonSchema(tool.inputSchema))
            : "";
        return tool.name.length + description.length + inputSchema.length;
      }),
    )
  ).reduce((total, size) => total + size, 0);
}
//@ chunk-5xgkngpb.js:2445077-2445397 layout
/**
 * 返回工具搜索不可用的原因码，可用时 undefined：model_unsupported、vertex_model_unsupported、foundry_deployment_unsupported、no_tools_in_request、not_registered、mcp_search_unavailable。
 */
function getToolSearchUnavailableReason(model, tools) {
  if (!supportsToolReferenceOrPelican(model)) return "model_unsupported";
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
//@ chunk-5xgkngpb.js:2445397-2445471 facade-exports
/**
 * ToolSearch 工具被过滤掉（例如 disallowedTools）且端点未拒绝过：此时改用 tool_addition 方式（不靠 ToolSearch 也按需追加工具定义）。
 */
function toolSearchToolFilteredOut(model, tools, requestState) {
  return (
    getToolSearchUnavailableReason(model, tools) === "mcp_search_unavailable" &&
    !toolSearchRejectedOn(requestState, model)
  );
}
//@ chunk-5xgkngpb.js:2445471-2445514 facade-exports
/**
 * 工具搜索因模型/部署/工具池原因不可用。
 */
function isToolSearchPrecluded(model, tools) {
  return getToolSearchUnavailableReason(model, tools) !== undefined;
}
//@ chunk-5xgkngpb.js:2445514-2445585 facade-exports
/**
 * 从已声明工具名判断本对话的工具搜索锁：声明过 ToolSearch → true；声明过工具但没有 ToolSearch 且 rGt() → false（保持关闭）；否则未定。
 */
function toolSearchDeclaredIn(declaredToolNames) {
  if (declaredToolNames?.has(TOOL_SEARCH_TOOL_NAME)) return true;
  return declaredToolNames?.size && isToolSearchLockedOffByDefault() ? false : undefined;
}
//@ chunk-5xgkngpb.js:2445585-2445684 facade-exports
/**
 * 端点在本进程里是否拒绝过工具搜索（Lp 记录的拒绝，或尚未决定声明工具时按 beta 记录判断）。
 */
function toolSearchRejectedOn(requestState, model) {
  let toolSearchBeta = getToolSearchBeta();
  return (
    isBetaRejected_2(requestState, toolSearchBeta) ||
    (!requestState.declaredToolsDecided &&
      [...getRefusedBetasForModel(toProviderWireModelId(model))].includes(toolSearchBeta))
  );
}
//@ chunk-5xgkngpb.js:2445684-2447678 facade-exports (2.1.88 match: isToolSearchEnabled, 0.724)
/**
 * isToolSearchEnabled（请求级）：先看不可用原因（模型/Vertex/Foundry 不支持、没有工具、未注册、ToolSearch 被禁用），再看本对话是否已"无 ToolSearch 运行过"（保持关闭直到压缩/清空）、端点是否拒绝过；然后按模式：tst 开、standard 关、tst-auto 比较延迟工具 token 数与上下文窗口百分比阈值。每次决策记 tengu_tool_search_mode_decision。
 */
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
  let mcpToolCount = countWhere(tools, (t) => t.isMcp);
  function logModeDecision(enabled, mode, reason, extraProps) {
    logEvent("tengu_tool_search_mode_decision", {
      enabled,
      mode: fromEnum(mode),
      reason: fromEnum(reason),
      checkedModel: telemetrySafeModelName(model),
      mcpToolCount,
      mcpNonBlocking: getMcpConnectNonBlocking(),
      userType: fromEnum("external"),
      ...extraProps,
    });
  }
  let toolSearchUnavailableReason = getToolSearchUnavailableReason(model, tools);
  switch (toolSearchUnavailableReason) {
    case "model_unsupported":
      logForDebugging(
        `Tool search disabled for model '${model}': model does not support tool_reference blocks. This feature is available on Claude Sonnet 4+, Opus 4+, Haiku 4.5+, and newer models.`,
      );
      logModeDecision(false, "standard", toolSearchUnavailableReason);
      return false;
    case "vertex_model_unsupported":
      logForDebugging(
        `Tool search disabled for model '${model}' on Vertex: this model's Vertex serving stack rejects the tool-search beta header (pre-4.5 generation).`,
      );
      logModeDecision(false, "standard", toolSearchUnavailableReason);
      return false;
    case "foundry_deployment_unsupported":
      logForDebugging(
        `Tool search disabled: Foundry deployment for '${model}' does not support tool search.`,
      );
      logModeDecision(false, "standard", toolSearchUnavailableReason);
      return false;
    case "no_tools_in_request":
    case "not_registered":
      logModeDecision(false, getToolSearchMode(), toolSearchUnavailableReason);
      return false;
    case "mcp_search_unavailable":
      logForDebugging(
        "Tool search disabled: ToolSearchTool is not available (may have been disallowed via disallowedTools).",
      );
      logModeDecision(false, getToolSearchMode(), toolSearchUnavailableReason);
      return false;
    case undefined:
      break;
  }
  let mode = getToolSearchMode();
  let e = toolSearchDeclaredIn(recordedToolDescriptions);
  if (e === false) {
    logForDebugging(
      "Tool search disabled: this conversation has run without ToolSearch, and stays so until it is compacted or cleared. ENABLE_TOOL_SEARCH=true overrides this.",
    );
    logModeDecision(false, mode, "held_off");
    return false;
  }
  if (requestState && toolSearchRejectedOn(requestState, model)) {
    logForDebugging(
      "Tool search is off for this conversation: the endpoint refused it earlier in this process.",
    );
    logModeDecision(false, mode, "refused");
    return false;
  }
  switch (mode) {
    case "tst":
      logModeDecision(true, mode, "tst_enabled");
      return true;
    case "tst-auto": {
      if (e) {
        logForDebugging("Auto tool search enabled: this conversation already declared ToolSearch");
        logModeDecision(true, mode, "auto_held");
        return true;
      }
      let { enabled, debugDescription, metrics } = await checkAutoThreshold(
        tools,
        getToolPermissionContext,
        agents,
        model,
        credentials,
      );
      if (enabled) {
        logForDebugging(
          `Auto tool search enabled: ${debugDescription}` + (source ? ` [source: ${source}]` : ""),
        );
        logModeDecision(true, mode, "auto_above_threshold", metrics);
        return true;
      }
      logForDebugging(
        `Auto tool search disabled: ${debugDescription}` + (source ? ` [source: ${source}]` : ""),
      );
      logModeDecision(false, mode, "auto_below_threshold", metrics);
      return false;
    }
    case "standard":
      logModeDecision(false, mode, "standard_mode");
      return false;
  }
}
//@ chunk-5xgkngpb.js:2447678-2448509 facade-exports (2.1.88 match: extractDiscoveredToolNames, 0.715)
/**
 * extractDiscoveredToolNames：从历史里收集已发现的延迟工具名：压缩边界携带的 preCompactDiscoveredTools、deferred_tools_delta 的 surfacedNames、tool_result 里的 tool_reference 块。
 */
function extractDiscoveredToolNames(messages, options) {
  let discoveredTools = new Set();
  let carriedFromBoundary = 0;
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
      if (options?.surfaced !== undefined && msg.attachment.type === "deferred_tools_delta") {
        let surfaced = options.surfaced;
        let a =
          "exceptAnnouncements" in surfaced
            ? surfaced.exceptAnnouncements.has(msg.uuid)
              ? () => false
              : () => true
            : (b) => surfaced.has(b);
        let surfacedNames = msg.attachment.surfacedNames;
        for (let c of Array.isArray(surfacedNames) ? surfacedNames : [])
          if (typeof c === "string" && a(c)) discoveredTools.add(c);
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
//@ chunk-5xgkngpb.js:2448509-2452872 facade-exports
/**
 * getDeferredToolsDelta：比较当前工具池的延迟工具与历史 deferred_tools_delta 附件，生成新附件（addedNames/addedLines、removedNames、wireHiddenNames、readdedNames、pending/needsAuth/failed MCP 服务器、retractedTools、restoredNames、surfacedNames、loadedNames），无变化返回 null；记 tengu_deferred_tools_pool_change。
 */
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
  let toolSearchAbsent = toolAdditionOnly !== undefined;
  let loadedRefs = toolSearchAbsent ? new Set() : stripToolReferencesBeforeCompaction(messages);
  let byNameAnnouncements = toolAdditionOnly?.nameOnlyAnnouncements ?? nameOnlyAnnouncements;
  let {
    announced,
    surfacedWithBlocks,
    retractedAsDisconnected,
    wireHiddenStanding,
    definitionRetracted,
    failedWhileListed,
    listed,
    lastPending,
    lastNeedsAuth,
    lastFailed,
    attachmentCount,
    dtdCount,
    attachmentTypesSeen,
  } = scanDeferredToolsDeltaHistory(messages, {
    loaded: loadedRefs,
    byNameAnnouncements,
    toolAdditionOnly,
  });
  let nonDeferrableBuiltins = getNonDeferrableBuiltins();
  let filtered = tools.filter((tool) =>
    isDeferredToolInConversation(tool, heldInlineTools, tools, {
      toolSearchAbsent,
      nonDeferrableBuiltins,
    }),
  );
  let toolNames = new Set(filtered.map((tool) => tool.name));
  let allToolNames = new Set(tools.map((tool) => tool.name));
  let filtered_2 = filtered.filter((tool) => !announced.has(tool.name));
  let filtered_3 = filtered.filter((tool) => !listed.has(tool.name));
  let mapped = filtered_2.filter((tool) => listed.has(tool.name)).map((tool) => tool.name);
  let unlistedNameSet = new Set(filtered_3.map((tool) => tool.name));
  let resurfacedTools = toolSearchAbsent
    ? filtered.filter((tool) => !unlistedNameSet.has(tool.name) && !surfacedWithBlocks.has(tool.name))
    : [];
  let unwrapAttempt = hideCodeModeOnlyTools(tools);
  let currentToolNames =
    unwrapAttempt === tools ? allToolNames : new Set(unwrapAttempt.map((tool) => tool.name));
  let filtered_4 = [...definitionRetracted].filter(
    (toolName) => currentToolNames.has(toolName) && !toolNames.has(toolName),
  );
  let filtered_5 = [...failedWhileListed].filter(
    (toolName) => currentToolNames.has(toolName) && !toolNames.has(toolName),
  );
  let goneNames = [];
  let wireHiddenNames = [];
  for (let toolName of announced) {
    if (toolNames.has(toolName)) continue;
    if (!allToolNames.has(toolName)) goneNames.push(toolName);
    else if (!currentToolNames.has(toolName)) wireHiddenNames.push(toolName);
  }
  let wireHiddenSeen = new Set(wireHiddenNames);
  for (let retractedName of retractedAsDisconnected)
    if (
      allToolNames.has(retractedName) &&
      !currentToolNames.has(retractedName) &&
      !announced.has(retractedName) &&
      !wireHiddenSeen.has(retractedName)
    ) {
      wireHiddenNames.push(retractedName);
      wireHiddenSeen.add(retractedName);
    }
  let goneSeen = new Set(goneNames);
  for (let hiddenName of wireHiddenStanding)
    if (!allToolNames.has(hiddenName) && !goneSeen.has(hiddenName)) {
      goneNames.push(hiddenName);
      goneSeen.add(hiddenName);
    }
  let departureCauses = new Map();
  if (departures !== undefined)
    for (let toolName of goneNames) departureCauses.set(toolName, departures.causeKindOf(toolName));
  let holdWhileConnecting = departures?.holdWhileConnecting === true;
  let removedNames = holdWhileConnecting
    ? goneNames.filter((goneName) => departureCauses.get(goneName) !== "reconnecting")
    : goneNames;
  let connectingServers = new Set(
    holdWhileConnecting
      ? [
          ...(departures?.serversDeclaredInline ?? []),
          ...filtered.flatMap((tool) => tool.mcpInfo?.serverName ?? []),
          ...goneNames
            .filter((goneName) => departureCauses.get(goneName) === "reconnecting")
            .flatMap((goneName) => departures?.connectingServersOf(goneName) ?? []),
        ]
      : [],
  );
  let lastFailedNames = new Set(lastFailed.filter(normalizeToolReference).map((server) => server.name));
  let lenientServerNames = new Set([...lastPending, ...lastNeedsAuth]);
  let pendingNames =
    pendingMcpServers
      ?.filter(
        (pendingMcpServer) =>
          !connectingServers.has(pendingMcpServer) ||
          lenientServerNames.has(pendingMcpServer) ||
          lastFailedNames.has(normalizeMcpServerName(pendingMcpServer)),
      )
      .sort() ?? [];
  let pendingUnmentionedCount = (pendingMcpServers?.length ?? 0) - pendingNames.length;
  let pendingChanged =
    pendingMcpServers !== undefined &&
    (pendingNames.length !== lastPending.length ||
      pendingNames.some((server, index) => server !== lastPending[index]));
  let leftPendingNames =
    holdWhileConnecting && pendingMcpServers !== undefined
      ? lastPending.filter((server) => !pendingMcpServers.includes(server))
      : [];
  let listlessSet = new Set([...filtered_3, ...resurfacedTools]);
  let filtered_6 = filtered.filter(
    (tool) =>
      announced.has(tool.name) &&
      !listlessSet.has(tool) &&
      tool.mcpInfo !== undefined &&
      leftPendingNames.includes(tool.mcpInfo.serverName),
  );
  let needsAuthNames = needsAuthMcpServers !== undefined ? [...needsAuthMcpServers].sort() : [];
  let needsAuthChanged =
    needsAuthMcpServers !== undefined &&
    (needsAuthNames.length !== lastNeedsAuth.length ||
      needsAuthNames.some((server, index) => server !== lastNeedsAuth[index]));
  let failedServers =
    failedMcpServers !== undefined
      ? [...failedMcpServers].sort((left, right) => compareStringsGrouped(left.name, right.name))
      : [];
  let failedChanged =
    failedMcpServers !== undefined &&
    (failedServers.length !== lastFailed.length ||
      failedServers.some(
        (server, index) =>
          server.name !== lastFailed[index]?.name ||
          server.errorCode !== lastFailed[index]?.errorCode ||
          server.error !== lastFailed[index]?.error ||
          server.willRetry !== lastFailed[index]?.willRetry,
      ));
  let retractedTools =
    revocations !== undefined
      ? uniqByExport(
          revocations.revoked.filter((revocation) => !definitionRetracted.has(revocation.name)),
          (revocation) => revocation.name,
        ).sort((left, right) => left.name.localeCompare(right.name))
      : [];
  let saidNothing =
    filtered_2.length === 0 &&
    removedNames.length === 0 &&
    wireHiddenNames.length === 0 &&
    filtered_3.length === 0 &&
    !pendingChanged &&
    !needsAuthChanged &&
    !failedChanged &&
    retractedTools.length === 0 &&
    filtered_4.length === 0 &&
    filtered_5.length === 0 &&
    resurfacedTools.length === 0;
  if (saidNothing && pendingUnmentionedCount === 0) return null;
  let addableTools = [...filtered_3, ...resurfacedTools];
  let addedNames = normalizeCaseForComparison_2(
    [...filtered_2, ...addableTools, ...filtered_6].map((tool) => tool.name),
  );
  let surfacedNames = toolSearchAbsent
    ? addableTools.map((tool) => tool.name)
    : filtered_2
        .filter((tool) =>
          surfacedByValue(tool, {
            heldInlineTools,
            nonDeferrableBuiltins,
            listed,
          }),
        )
        .map((tool) => tool.name);
  logEvent("tengu_deferred_tools_pool_change", {
    addedCount: filtered_2.length,
    readdedCount: mapped.length,
    unlistedCount: filtered_3.length,
    resurfacedCount: resurfacedTools.length,
    removedCount: removedNames.length,
    ...identityMap(countByAlias([...departureCauses.values()]), (count, cause) => `departed_${cause}`),
    retractionHoldEnabled: holdWhileConnecting,
    returnedAfterHoldCount: filtered_6.length,
    wireHiddenCount: wireHiddenNames.length,
    pendingChanged,
    pendingCount: pendingNames.length,
    pendingUnmentionedCount,
    saidNothing,
    lastPendingCount: lastPending.length,
    needsAuthChanged,
    needsAuthCount: needsAuthNames.length,
    lastNeedsAuthCount: lastNeedsAuth.length,
    failedChanged,
    failedCount: failedServers.length,
    lastFailedCount: lastFailed.length,
    retractedCount: retractedTools.length,
    restoredCount: filtered_4.length,
    runsAgainCount: filtered_5.length,
    ...identityMap(revocations?.causeCounts ?? {}, (count, cause) => `keptDeparted_${cause}`),
    priorAnnouncedCount: announced.size,
    toolSearchAbsent,
    messagesLength: messages.length,
    attachmentCount,
    dtdCount,
    callSite: fromEnum(scanContext?.callSite ?? "unknown"),
    querySource: agentTypeForTelemetry(scanContext?.querySource ?? "unknown"),
    attachmentTypesSeen: fromEnumArr([...attachmentTypesSeen]),
  });
  if (saidNothing) return null;
  let filtered_7 = addableTools.map((tool) => tool.name).filter((name) => loadedRefs.has(name));
  return {
    addedNames: addedNames.sort(),
    addedLines: addableTools
      .filter((tool) => !loadedRefs.has(tool.name))
      .map((tool) => (toolSearchAbsent ? tool.name : formatDeferredToolLine(tool)))
      .sort(),
    removedNames: removedNames.sort(),
    wireHiddenNames: wireHiddenNames.sort(),
    readdedNames: [...mapped, ...filtered_6.map((tool) => tool.name)].sort(),
    ...(pendingMcpServers !== undefined && {
      pendingMcpServers: pendingNames,
    }),
    ...(needsAuthMcpServers !== undefined && {
      needsAuthMcpServers: needsAuthNames,
    }),
    ...(failedMcpServers !== undefined && {
      failedMcpServers: failedServers,
    }),
    ...(retractedTools.length > 0 && {
      retractedTools,
    }),
    ...(filtered_4.length > 0 && {
      restoredNames: filtered_4.sort(),
    }),
    ...(filtered_5.length > 0 && {
      runsAgainNames: filtered_5.sort(),
    }),
    ...(surfacedNames.length > 0 && {
      surfacedNames: surfacedNames.sort(),
    }),
    ...(toolSearchAbsent && {
      toolSearchAbsent: true,
    }),
    ...(filtered_7.length > 0 && {
      loadedNames: filtered_7.sort(),
    }),
  };
}
//@ chunk-5xgkngpb.js:2452872-2453301 fingerprint (2.1.88 match: checkAutoThreshold, 1)
/**
 * checkAutoThreshold：tst-auto 模式下比较延迟工具的 token 数（按 API 计数缓存）与 getAutoToolSearchTokenThreshold；计数失败时退回字符数估算（chars/2.5）。
 */
async function checkAutoThreshold(tools, getToolPermissionContext, agents, model, credentials) {
  await awaitArtifactRosterSafe(tools);
  let deferredToolTokens = await getDeferredToolTokenCountCached(
    tools,
    getToolPermissionContext,
    agents,
    model,
    credentials,
  );
  if (deferredToolTokens !== null) {
    let threshold = getAutoToolSearchTokenThreshold(model);
    return {
      enabled: deferredToolTokens >= threshold,
      debugDescription: `${deferredToolTokens} tokens (threshold: ${threshold}, ${getAutoToolSearchPercentage()}% of context)`,
      metrics: {
        deferredToolTokens,
        threshold,
      },
    };
  }
  let deferredToolDescriptionChars = await calculateDeferredToolDescriptionChars(
    tools,
    getToolPermissionContext,
    agents,
    model,
  );
  let charThreshold = getAutoToolSearchCharThreshold(model);
  return {
    enabled: deferredToolDescriptionChars >= charThreshold,
    debugDescription: `${deferredToolDescriptionChars} chars (threshold: ${charThreshold}, ${getAutoToolSearchPercentage()}% of context) (char fallback)`,
    metrics: {
      deferredToolDescriptionChars,
      charThreshold,
    },
  };
}
export {
  isToolSearchEnabled,
  toolSearchToolFilteredOut,
  isToolDefinedByValueEnabled,
  getNonDeferrableBuiltins,
  extractDiscoveredToolNames,
  collectToolReferences,
  isToolResultBlockWithContent,
  isToolReferenceWithName,
  joinWithNewline,
  isToolSearchToolAvailable,
  isToolReferenceBlock,
  isToolSearchEnabledOptimistic,
  supportsToolReferenceOrPelican,
  isVertexModelWithoutToolSearch,
  isToolSearchPrecluded,
  toolSearchRejectedOn,
  isToolSearchLockedOffByDefault,
  getToolSearchMode,
  toolSearchDeclaredIn,
  getDeferredToolsDelta,
  maybeAddBrowserBatchToChromeSelect,
  isDeferSpecialToolsEnabled,
  isPushNotificationDeferrable,
  modelSupportsToolReference,
  scanDeferredToolsDeltaHistory,
};
