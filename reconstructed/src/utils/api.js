/**
 * utils/api.ts
 *
 * 工具定义转 API schema（toolToAPISchema、缓存键、strict/eager_input_streaming/defer_loading/cache_control、实验 beta 禁用时剥离字段）、system 提示词分块（splitSysPromptPrefix：计费头、身份行、静态/动态边界与 cache scope）、工具输入规整与上下文指标日志。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/api.ts
 * pieces: chunk-e6aww6q8.js (51), chunk-w5ndchqs.js (2)
 * attribution: fingerprint 6, placement 27, callgraph-fingerprint 1, layout 16, file-local 3
 */
import {
  isDeepStrictEqual,
  isDeepStrictEqual as isDeepStrictEqual_2,
  isDeepStrictEqual as isDeepStrictEqual_3,
  isDeepStrictEqual as isDeepStrictEqual_4,
  isDeepStrictEqual as isDeepStrictEqual_5,
  isDeepStrictEqual as isDeepStrictEqual_6,
  isDeepStrictEqual as isDeepStrictEqual_7,
  isDeepStrictEqual as isDeepStrictEqual_8,
  isDeepStrictEqual as isDeepStrictEqual_9,
  isDeepStrictEqual as isDeepStrictEqual_10,
  isDeepStrictEqual as isDeepStrictEqual_11,
  isDeepStrictEqual as isDeepStrictEqual_12,
  isDeepStrictEqual as isDeepStrictEqual_13,
  isDeepStrictEqual as isDeepStrictEqual_14,
  isDeepStrictEqual as isDeepStrictEqual_15,
  isDeepStrictEqual as isDeepStrictEqual_16,
  isDeepStrictEqual as isDeepStrictEqual_17,
  isDeepStrictEqual as isDeepStrictEqual_18,
  isDeepStrictEqual as isDeepStrictEqual_19,
} from "util";
import { createHash } from "crypto";
import { EXITPLANMODE_2 } from "../tools/ExitPlanModeTool/constants.js";
import { SessionRootSlot } from "../bootstrap/sessionSlices.js";
import { sleep } from "./sleep.js";
import { getRootSession, getIsNonInteractiveSession } from "../bootstrap/state.js";
import { isPlainObject as isPlainObject_4 } from "./isPlainObject.js";
import { xr } from "../../vendor/lodash-es/_inlinedHelpers.js";
import { count } from "./collections.js";
import { planFiles, persistFileSnapshotIfRemote, getPlanWithPath } from "./plans.js";
import { isUnparsedInputMarker } from "./json.js";
import { stripHostOwnedInputKeys } from "./permissions/permissionAnswer.js";
import { isAutoModeQuerySource } from "../services/api/requestHeaders.js";
import { SYSTEM_PROMPT_DYNAMIC_BOUNDARY } from "../entrypoints/sdk/coreSchemas.js";
import { Ao } from "../bootstrap/sessionFeatureValues.js";
import { loadPromptRemovalConfig, logPromptStringsRemoval } from "./promptAblation.js";
import { logError } from "./log.js";
import { getCanonicalName } from "./model/canonicalModelName.js";
import { env } from "./env.js";
import {
  isFirstPartyApiBackend,
  isFirstPartyAnthropicBaseUrl,
  isGenuineBedrockEndpoint,
  getAPIProvider,
} from "./model/providers.js";
import {
  areExperimentalBetasDisabled,
  willSendStructuredOutputsBeta,
  shouldUseGlobalCacheScope,
} from "./betas.js";
import { toolInputJsonSchema } from "../plugins/functionHooks/types/builtinToolSchemas.js";
import { isAgentSwarmsEnabled } from "./agentSwarmsEnabled.js";
import { getToolRemoteExecution, findToolByName, toolMatchesName } from "../Tool.js";
import { $r, yO, Cf } from "../bridge/deviceRegistration.js";
import { isMultiEntryAliasTool, toolMatchesAnyName } from "../services/tools/permissionCheckGuard.js";
import { isRemoteToolForwardingEnabled } from "../services/remoteTools/servingGates.js";
import { AGENT, FZo } from "../tools/AgentTool/constants.js";
import { Hri } from "../services/api/toolDefinitionShape.js";
import { logFeatureOk, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { No } from "./model/modelCatalog.js";
import { logForDebugging } from "./debug.js";
import { jsonStringify } from "./slowOperations.js";
import { HostScoped } from "./hostScoped.js";
import { GFe, getPromptModel, g3, mme } from "./model/promptBundles.js";
import { firstLineOf } from "./stringUtils.js";
import { sanitizeToolNameForAnalytics } from "../services/analytics/metadata.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  getFeatureValue_SESSION_PINNED,
} from "../services/analytics/growthbook.js";
import { uie } from "./startupFlagWait.js";
import { isRemoteCowork } from "./entrypointKinds.js";
import { ARTIFACT_TOOL_NAME as ARTIFACT_TOOL_NAME_2 } from "../tools/ArtifactTool/constants.js";
import {
  isToolDescribeHookedForBuild,
  toolDescriptionCache,
  recordDeferral,
  resolveToolDescription,
  isRewrittenByHook,
  isToolDescribeHooked,
  describedOnce,
} from "../services/api/toolDescriptionCache.js";
import { withCatalogSuppressed } from "./model/modelCatalog/servedCatalog.js";
import { statedEagerInputStreaming } from "./model/modelDisplay.js";
import { BashTool } from "../tools/BashTool/BashTool.js";
import { shouldTrimBashDescription } from "../tools/BashTool/prompt.js";
import { SKILL } from "../tools/SkillTool/skillToolNames.js";
import {
  SENDMESSAGE,
  hasSendMessageTool,
  stripObservableFields,
} from "../tools/SendMessageTool/constants.js";
import { isCrossSessionMessagingEnabled } from "./crossSessionMessagingGate.js";
import { e6 } from "../tools/SendMessageTool/SendMessageTool.js";
import { LISTAGENTS } from "../tools/SendMessageTool/listAgents.js";
import { ASKUSERQUESTION } from "../tools/AskUserQuestionTool/prompt.js";
import { _1r, isRelativeEffortDisabled } from "../tools/AgentTool/agentEffort.js";
import { getSubscriptionType, isClaudeAISubscriber } from "./auth.js";
import { FILE_READ_TOOL_NAME } from "../tools/FileReadTool/constants.js";
import { BASH_TOOL_NAME } from "../tools/BashTool/toolName.js";
import { GREP_TOOL_NAME } from "../tools/GrepTool/prompt.js";
import { TOOL_SEARCH_TOOL_NAME } from "../tools/ToolSearchTool/prompt.js";
import { WORKFLOW_TOOL_NAME } from "../tools/WorkflowTool/constants.js";
import { MONITOR } from "../tools/MonitorTool/constants.js";
import { isMonitorPersistentAllowed } from "../tools/MonitorTool/prompt.js";
import { SCHEDULE_WAKEUP_TOOL_NAME } from "../tools/ScheduleWakeupTool/prompt.js";
import { WEBFETCH } from "../tools/WebFetchTool/prompt.js";
import { SEARCHPLUGINS, SUGGESTPLUGININSTALL } from "../tools/pluginDiscoveryToolNames.js";
import { normalizeOutputSchema } from "../tools/SyntheticOutputTool/schemaCheck.js";
import { mSe, isArtifactRosterSettled } from "../services/artifacts/rosterWait.js";
import { WEBSEARCH } from "../tools/WebSearchTool/prompt.js";
import { isToolSearchDisabledByBetas } from "./toolSearchChrome.js";
import { createUserMessage } from "./messages.js";
import { USER_CONTEXT_PREFIX, Hpi } from "../services/api/promptCacheBreakParts.js";
import { isFirstPartyTelemetryBlocked } from "./hostEnvironment.js";
import { getOrBuildUserContext, J3t } from "../context.js";
import { getCwd } from "./cwd.js";
import { countFilesRounded } from "./ripgrep.js";
import { normalizePatternsToPath, getFileReadIgnorePatterns } from "./permissions/filesystem.js";
import { roughTokenCountEstimation } from "../services/tokenEstimation.js";
import { jW } from "../services/api/deferredToolsState.js";
import { logEvent } from "../services/analytics/index.js";
import { coerceNumberString } from "../tools/ArtifactTool/publishEdits.js";
import { languageErrorNameOf, toError, withTelemetryMessage } from "./errors.js";
import { isRemoteOnlyCheck } from "./permissions/checkRegistry.js";
import { stripCdPrefix, isTetherEnvOptIn } from "./wireToolInputEcho.js";
import { getPlatform } from "./platform.js";
import { windowsPathToPosixPath } from "./path.js";
import { FileEditTool } from "../tools/FileEditTool/FileEditTool.js";
import { WEt, stripTrailingWhitespace, normalizeFileEditInput } from "../tools/FileEditTool/utils.js";
import { FileWriteTool } from "../tools/FileWriteTool/FileWriteTool.js";
import { ye } from "./startupMarks.js";
import { lit } from "../services/analytics/safeMetadata.js";
import {
  X_ANTHROPIC_BILLING_HEADER,
  REPORTING_OUTCOMES_SECTION,
} from "../services/api/promptCacheBreakDetection.js";
import { CLI_SYSPROMPT_PREFIX_SET } from "../constants/system.js";
import { splitAtStaticBreakpoint } from "./systemPromptBoundary.js";

/**
 * 发回 API 前要从工具输入里去掉的字段：ExitPlanMode 的 plan/planFilePath。旧版名 normalizeToolInputForAPI 不准确。
 */
//@ chunk-e6aww6q8.js:861006-861063 fingerprint = normalizeToolInputForAPI (0.524)
var API_STRIPPED_INPUT_FIELDS = new Map([[EXITPLANMODE_2, new Set(["plan", "planFilePath"])]]);
//@ chunk-e6aww6q8.js:1423789-1423895 placement
var SLEEP_GATE_TIMEOUT_MS = 1e4,
  e9t = new SessionRootSlot(() => {
    let e = () => {};
    return {
      promise: new Promise((r) => {
        e = r;
      }),
      resolve: e,
      committed: !1,
    };
  });
//@ chunk-e6aww6q8.js:1423895-1423936 placement
function waitForGate(e) {
  return e9t.of(e).promise;
}
//@ chunk-e6aww6q8.js:1423936-1424007 placement = withTimeout (0.805)
function withTimeout(e) {
  return Promise.race([waitForGate(e), sleep(SLEEP_GATE_TIMEOUT_MS, void 0, { unref: !0 })]);
}
//@ chunk-e6aww6q8.js:1424007-1424066 placement
function commitGate(e) {
  let of = e9t.of(e);
  ((of.committed = !0), of.resolve());
}
//@ chunk-e6aww6q8.js:1424066-1424237 placement
var firstRequestGate = new SessionRootSlot(() => {
  let e = (h) => {},
    promise = new Promise((h) => {
      e = h;
    }),
    r = () => {},
    promise_2 = new Promise((h) => {
      r = h;
    });
  return { promise: promise, resolve: e, started: !1, requestSent: promise_2, resolveRequestSent: r };
});
//@ chunk-e6aww6q8.js:1424237-1424278 placement
function t9t(e) {
  return firstRequestGate.of(e).promise;
}
//@ chunk-e6aww6q8.js:1424278-1424366 placement
function cYs(e, n) {
  let of = firstRequestGate.of(e);
  if (of.started) return;
  ((of.started = !0), of.resolve({ tools: n }));
}
//@ chunk-e6aww6q8.js:1424366-1424411 placement
function R1r(e) {
  return firstRequestGate.of(e).requestSent;
}
//@ chunk-e6aww6q8.js:1424411-1424458 placement
function GKo(e) {
  firstRequestGate.of(e).resolveRequestSent();
}
//@ chunk-e6aww6q8.js:1424458-1424482 placement
function n9t() {
  GKo(getRootSession());
}
//@ chunk-e6aww6q8.js:1424482-1424505 placement
function x1r(e) {
  return;
}
/**
 * 比较工具 schema 时用到的键集合：纯说明类键（忽略）、子 schema 映射类键、需排序比较的数组类键。
 */
//@ chunk-e6aww6q8.js:1500608-1500877 placement
var SCHEMA_TEXT_KEYS = new Set([
    "description",
    "title",
    "examples",
    "$comment",
    "$schema",
    "default",
    "deprecated",
    "readOnly",
    "writeOnly",
  ]),
  SCHEMA_MAP_KEYS = new Set(["properties", "patternProperties", "$defs", "definitions", "dependentSchemas"]),
  SCHEMA_SET_KEYS = new Set(["enum", "const", "required", "dependentRequired"]);
/**
 * 递归规范化 JSON schema 以便比较：去掉描述/标题/示例等说明性键，对 enum/required 等字符串数组排序。
 */
//@ chunk-e6aww6q8.js:1500877-1501163 placement
function normalizeSchemaForCompare(e) {
  if (Array.isArray(e)) return e.map(normalizeSchemaForCompare);
  if (!isPlainObject_4(e)) return e;
  let n = {};
  for (let [r, s] of Object.entries(e)) {
    if (SCHEMA_TEXT_KEYS.has(r)) continue;
    if (SCHEMA_SET_KEYS.has(r))
      n[r] = Array.isArray(s) && s.every((h) => typeof h === "string") ? s.toSorted() : s;
    else if (SCHEMA_MAP_KEYS.has(r) && isPlainObject_4(s)) n[r] = xr(s, normalizeSchemaForCompare);
    else n[r] = normalizeSchemaForCompare(s);
  }
  return n;
}
//@ chunk-e6aww6q8.js:1501163-1501252 placement
function QSe(e) {
  let n = isPlainObject_4(e) ? e.properties : void 0;
  return new Map(isPlainObject_4(n) ? Object.entries(n) : []);
}
//@ chunk-e6aww6q8.js:1501252-1501326 placement
function JSe(e) {
  let n = isPlainObject_4(e) ? e.enum : void 0;
  return Array.isArray(n) ? n : void 0;
}
//@ chunk-e6aww6q8.js:1501326-1501518 placement
function countMissingSchemaParts(e, n) {
  let r = QSe(n),
    s = 0;
  for (let [h, y] of QSe(e)) {
    if (!r.has(h)) {
      s += 1;
      continue;
    }
    let S = JSe(y),
      w = JSe(r.get(h));
    if (S !== void 0 && w !== void 0) {
      let L = new Set(w);
      s += count(S, (G) => !L.has(G));
    }
  }
  return s;
}
/**
 * 比较记录的工具 schema 与实时 schema：完全相同、只有说明文字不同、记录提供更多、实时新增、或其他差异。
 */
//@ chunk-e6aww6q8.js:1501518-1501687 placement
function compareToolSchemas(e, n) {
  if (isDeepStrictEqual_8(e, n)) return "equal";
  if (isDeepStrictEqual_8(normalizeSchemaForCompare(e), normalizeSchemaForCompare(n))) return "text_only";
  if (countMissingSchemaParts(e, n) > 0) return "record_offers_more";
  if (countMissingSchemaParts(n, e) > 0) return "live_adds";
  return "other";
}
/**
 * 把远程计划文件快照的保存串到快照链上依次执行。
 */
//@ chunk-e6aww6q8.js:1501725-1501827 placement
function chainPlanSnapshot(e) {
  let n = planFiles()
    .snapshotChain.then(() => persistFileSnapshotIfRemote(e))
    .catch(() => {});
  return ((planFiles().snapshotChain = n), n);
}
/**
 * ExitPlanMode 工具输入中补上计划内容与计划文件路径。
 */
//@ chunk-e6aww6q8.js:1502377-1502484 placement
function withPlanPath(e, n, r) {
  if (e !== EXITPLANMODE_2 || !isPlainObject_4(n) || isUnparsedInputMarker(n)) return n;
  let s = stripHostOwnedInputKeys(e, n),
    h = getPlanWithPath(r);
  return h !== null ? { ...s, ...h } : s;
}
/**
 * 对系统提示词片段做实验性"消融"：删除配置里列出的字符串（首次命中时记录）；自动模式查询与动态边界标记不处理；出错时记录并原样返回。
 */
//@ chunk-e6aww6q8.js:1503098-1503390 placement
function applyPromptAblation(e, n) {
  if (isAutoModeQuerySource(n) || e === SYSTEM_PROMPT_DYNAMIC_BOUNDARY) return e;
  let r = Ao();
  try {
    let s = (r.promptAblation ??= loadPromptRemovalConfig()),
      h = e;
    for (let string of s.strings) {
      if (!h.includes(string)) continue;
      if (((h = h.replaceAll(string, "")), !s.matched.has(string)))
        (s.matched.add(string), logPromptStringsRemoval(s));
    }
    return h;
  } catch (error) {
    return ((r.promptAblation ??= { strings: [], matched: new Set() }), logError(error), e);
  }
}
//@ chunk-e6aww6q8.js:1503390-1503451 placement
var CYo = ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"];
//@ chunk-e6aww6q8.js:1503451-1503494 placement
function k4e(e) {
  return !CYo.includes(getCanonicalName(e));
}
//@ chunk-e6aww6q8.js:1503494-1503586 placement
function ZSe(e) {
  return (
    env.CLAUDE_CODE_WEBSEARCH_CITATIONS &&
    isFirstPartyApiBackend() &&
    !areExperimentalBetasDisabled() &&
    (e === void 0 || k4e(e))
  );
}
/**
 * 工具输入 schema：inputJSONSchema 或 zod 转换；非 swarm 时去掉 swarm 字段；支持远程执行且未转发时去掉远程执行字段（含条目数组内）。
 */
//@ chunk-e6aww6q8.js:1503586-1503822 callgraph-fingerprint = toolToAPISchema (0.215)
function toolToAPISchema(tool, { remoteToolForwarding: remoteToolForwarding }) {
  let s =
    "inputJSONSchema" in tool && tool.inputJSONSchema
      ? tool.inputJSONSchema
      : toolInputJsonSchema(tool.inputSchema);
  if (!isAgentSwarmsEnabled()) s = omitSwarmFields(tool.name, s);
  if (getToolRemoteExecution(tool).supported && !remoteToolForwarding) {
    if (((s = omitSchemaProperties(s, [$r])), isMultiEntryAliasTool(tool)))
      s = omitArrayItemProperties(s, tool.entryFieldName, [$r]);
  }
  return s;
}
/**
 * 有工具支持远程执行且远程工具服务可用。
 */
//@ chunk-e6aww6q8.js:1503822-1503892 layout
async function shouldForwardRemoteTools(e) {
  return e.some((n) => getToolRemoteExecution(n).supported) && (await isRemoteToolForwardingEnabled());
}
/**
 * 关闭 swarm 时从 schema 去掉的字段：ExitPlanMode 的 launchSwarm/teammateCount，Agent 的 name/team_name/mode。
 */
//@ chunk-e6aww6q8.js:1503892-1503981 fingerprint = SWARM_FIELDS_BY_TOOL (1)
var SWARM_FIELDS_BY_TOOL = new Map([
  [EXITPLANMODE_2, ["launchSwarm", "teammateCount"]],
  [AGENT, ["name", "team_name", "mode"]],
]);
/**
 * 从 schema.properties 删掉指定字段。
 */
//@ chunk-e6aww6q8.js:1503981-1504145 layout
function omitSchemaProperties(e, n) {
  if (n.length === 0) return e;
  let properties = e.properties;
  if (!properties || typeof properties !== "object") return e;
  let s = { ...properties };
  for (let h of n) delete s[h];
  return { ...e, properties: s };
}
/**
 * 从某个数组字段的 items.properties 删掉指定字段。
 */
//@ chunk-e6aww6q8.js:1504145-1504497 layout
function omitArrayItemProperties(e, n, r) {
  let properties = e.properties;
  if (!properties || typeof properties !== "object" || !(n in properties)) return e;
  let h = properties[n];
  if (!h || typeof h !== "object" || !("items" in h)) return e;
  let items = h.items;
  if (!items || typeof items !== "object" || !("properties" in items)) return e;
  let S = omitSchemaProperties({ type: "object", properties: items.properties }, r);
  return {
    ...e,
    properties: { ...properties, [n]: { ...h, items: { ...items, properties: S.properties } } },
  };
}
/**
 * 按工具名去掉 SWARM_FIELDS_BY_TOOL 中的字段。
 */
//@ chunk-e6aww6q8.js:1504497-1504544 layout
function omitSwarmFields(e, n) {
  return omitSchemaProperties(n, SWARM_FIELDS_BY_TOOL.get(e) ?? []);
}
/**
 * 注册的工具完整定义构建器（setToolDefinitionBuilder 设置一次）。
 */
//@ chunk-e6aww6q8.js:1504544-1504557 layout
var toolDefinitionBuilder = null;
/**
 * 只设置一次工具定义构建器。
 */
//@ chunk-e6aww6q8.js:1504557-1504581 layout
function setToolDefinitionBuilder(e) {
  toolDefinitionBuilder ??= e;
}
/**
 * 对工具的 inputJSONSchema 与 prompt 文本做 16 位哈希，用于检测工具描述是否变化。
 */
//@ chunk-e6aww6q8.js:1504581-1504801 layout = calculateDeferredToolDescriptionChars (0.871)
async function getToolListingHash(tools, getToolPermissionContext, agents) {
  return Hri({
    inputSchema: tools.inputJSONSchema ?? null,
    description: await tools.prompt({
      getToolPermissionContext: agents.getToolPermissionContext,
      tools: getToolPermissionContext,
      agents: agents.agents,
      allowedAgentTypes: agents.allowedAgentTypes,
    }),
  });
}
/**
 * 用注册的构建器为一批工具生成 {name, listing, definition}。
 */
//@ chunk-e6aww6q8.js:1504801-1505184 layout
async function buildToolListingEntries(e, n, r, s, h) {
  let y = toolDefinitionBuilder;
  if (y === null) return;
  return Promise.all(
    e.map(async (S) => {
      let w = await getToolListingHash(S, n, s);
      return {
        name: S.name,
        listing: w,
        definition: await y(S, {
          getToolPermissionContext: s.getToolPermissionContext,
          tools: n,
          agents: s.agents,
          allowedAgentTypes: s.allowedAgentTypes,
          model: r,
          enginePlacement: s.enginePlacementOf(S),
          querySource: h,
          deferLoading: !1,
          byValueListing: w,
        }),
      };
    }),
  );
}
/**
 * 每会话的工具 schema 序列化器：模型配置查找、schema 序列化缓存、记录回放比对、构建跳过统计、剥离日志。
 */
//@ chunk-e6aww6q8.js:1505184-1506110 file-local
class ToolSchemaSerializer {
  canonicalToConfig = void 0;
  loggedStrip = !1;
  schemaKeys = new WeakMap();
  comparedRecordedSchemas = new WeakSet();
  schemasSentFromRecord = new Map();
  entriesBuilt = new Set();
  buildSkippedBatch = void 0;
  noteBuildSkipped(e) {
    if (this.buildSkippedBatch === void 0) {
      let n = { skippedTools: 0, skippedMcpTools: 0 };
      ((this.buildSkippedBatch = n),
        queueMicrotask(() => {
          ((this.buildSkippedBatch = void 0), logFeatureOk("prompt_snapshot_tool_build_skipped", n));
        }));
    }
    if (((this.buildSkippedBatch.skippedTools += 1), e)) this.buildSkippedBatch.skippedMcpTools += 1;
  }
  modelConfig(e) {
    return (
      (this.canonicalToConfig ??= new Map(Object.values(No).map((n) => [getCanonicalName(n.firstParty), n]))),
      this.canonicalToConfig.get(getCanonicalName(e))
    );
  }
  logStripOnce(e) {
    if (this.loggedStrip) return;
    ((this.loggedStrip = !0),
      logForDebugging(`[betas] Stripped from tool schemas: [${e.join(", ")}] (experimental betas disabled)`));
  }
  schemaKey(e) {
    let n = this.schemaKeys.get(e);
    if (n === void 0) ((n = jsonStringify(e)), this.schemaKeys.set(e, n));
    return n;
  }
  schemaText(e) {
    return this.schemaKeys.get(e) ?? jsonStringify(e);
  }
}
/**
 * 按 session.host 存放 ToolSchemaSerializer 的懒槽。
 */
//@ chunk-e6aww6q8.js:1506110-1506137 layout
var toolSchemaSerializerSlot = new HostScoped(() => new ToolSchemaSerializer());
/**
 * 取当前会话的 ToolSchemaSerializer。
 */
//@ chunk-e6aww6q8.js:1506137-1506176 layout
function getToolSchemaSerializer() {
  return toolSchemaSerializerSlot.of(getRootSession().host);
}
/**
 * 工具描述：CLAUDE_CODE_SIMPLE 时优先 searchHint 或首段，否则 tool.prompt()。
 */
//@ chunk-e6aww6q8.js:1506176-1506317 layout
async function getToolDescriptionText(e, n) {
  if (!GFe()) return e.prompt(n);
  if (e.searchHint) return e.searchHint;
  let prompt = await e.prompt(n);
  return (
    firstLineOf(
      prompt,
      `

`,
    ).trim() || prompt
  );
}
/**
 * 记录的工具 schema 与当前不同的分类事件名。
 */
//@ chunk-e6aww6q8.js:1506317-1506485 layout
var SCHEMA_DIFF_REASONS = {
  text_only: "schema_differs_text_only",
  live_adds: "schema_differs_live_adds",
  record_offers_more: "schema_differs_record_offers_more",
  other: "schema_differs_other",
};
/**
 * 比较记录的工具定义与当前构建的 schema，记 prompt_snapshot_tool_replay 结果。
 */
//@ chunk-e6aww6q8.js:1506485-1506943 layout
function compareRecordedToolSchema(e, n, r, s, { mcpTool: mcpTool, artifactFamily: artifactFamily }) {
  if (r.input_schema === n.input_schema || e.comparedRecordedSchemas.has(n)) return;
  e.comparedRecordedSchemas.add(n);
  let S = {
    toolName: sanitizeToolNameForAnalytics(n.name),
    isMcp: mcpTool,
    isArtifactFamily: artifactFamily,
  };
  if (!s) {
    logFeatureSad("prompt_snapshot_tool_replay", "strict_mismatch", S);
    return;
  }
  try {
    let w = compareToolSchemas(r.input_schema, n.input_schema);
    if (w === "equal") logFeatureOk("prompt_snapshot_tool_replay", S);
    else
      logFeatureSad(
        "prompt_snapshot_tool_replay",
        artifactFamily ? SCHEMA_DIFF_REASONS[w] : "schema_differs",
        S,
      );
  } catch (error) {
    logError(error);
  }
}
/**
 * 是否给工具加 eager_input_streaming：CLAUDE_CODE_ENABLE_FINE_GRAINED_TOOL_STREAMING；第一方官方 API 且 tengu_fgts；Vertex/Bedrock 视模型配置。
 */
//@ chunk-e6aww6q8.js:1506943-1507182 layout
function isFineGrainedToolStreamingEnabled(e, n) {
  let r = env.CLAUDE_CODE_ENABLE_FINE_GRAINED_TOOL_STREAMING;
  return Boolean(
    r !== !1 &&
    ((e === "firstParty" &&
      isFirstPartyAnthropicBaseUrl() &&
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_fgts", !1)) ||
      (e === "vertex" && !env.ANTHROPIC_VERTEX_BASE_URL && n?.vertex) ||
      (e === "bedrock" && isGenuineBedrockEndpoint() && n?.bedrock) ||
      r === !0),
  );
}
/**
 * 有可用的提示词快照记录时直接复用记录里的工具描述与 schema（保持缓存前缀不变）。
 */
//@ chunk-e6aww6q8.js:1507182-1508019 layout
function tryReuseRecordedToolEntry(e, n, r) {
  let recordedEntry = n.recordedEntry;
  if (!uie() || !isRemoteCowork() || recordedEntry === void 0 || n.byValueListing !== void 0) return;
  if (toolMatchesAnyName(e, [ARTIFACT_TOOL_NAME_2])) return;
  if (!n.withoutToolDescribeHooks && (n.isRedescribed === !0 || isToolDescribeHookedForBuild(e.name))) return;
  if (
    (r.structuredOutputs && (e.strict === !0 || Boolean(e.strictInputJSONSchema))) ||
    recordedEntry.strict === !0
  )
    return;
  let y = recordedEntry.description ?? n.recordedDescription;
  if (typeof y !== "string") return;
  let sentFromRecord = toolDescriptionCache.getSentFromRecord(r.cacheKey);
  if (sentFromRecord === void 0) {
    if (toolDescriptionCache.get(r.cacheKey) !== void 0) return;
    if (
      ((sentFromRecord = {
        eager_input_streaming: isFineGrainedToolStreamingEnabled(r.provider, r.eagerInputStreaming),
      }),
      toolDescriptionCache.setSentFromRecord(r.cacheKey, sentFromRecord),
      !n.withoutToolDescribeHooks)
    )
      recordDeferral(e.name, void 0);
    (r.serializer.schemasSentFromRecord.set(e.name, recordedEntry.input_schema),
      r.serializer.noteBuildSkipped(e.isMcp === !0));
  }
  return {
    name: e.name,
    description: y,
    input_schema: recordedEntry.input_schema,
    ...(sentFromRecord.eager_input_streaming && { eager_input_streaming: !0 }),
  };
}
/**
 * 工具 → API tools[] 元素：按大量特性位组成缓存键，生成 {name, description, input_schema, strict?, eager_input_streaming?}，再加 defer_loading/cache_control/citations；实验 beta 禁用时只留基础字段。
 */
//@ chunk-e6aww6q8.js:1508019-1512110 layout
async function toolToApiDefinition(e, n) {
  let h = getAPIProvider(),
    y = getToolSchemaSerializer(),
    S = (un) => (isAutoModeQuerySource(n.querySource) ? withCatalogSuppressed(un) : un()),
    model = n.model,
    L = model !== void 0 ? S(() => y.modelConfig(model)) : void 0,
    G =
      L?.eagerInputStreaming ??
      (L === void 0 && model !== void 0 && (h === "bedrock" || h === "vertex")
        ? S(() => statedEagerInputStreaming(model))
        : void 0),
    q = S(() => getPromptModel(model)),
    Z = S(() => g3(q)),
    Se = model !== void 0 && S(() => willSendStructuredOutputsBeta(model)),
    ke = e === BashTool && !GFe() ? S(() => shouldTrimBashDescription()) : void 0,
    we = isAutoModeQuerySource(n.querySource) ? "K:" : "",
    Ee = Z ? "L:" : "",
    Ae = (h === "vertex" && G?.vertex) || (h === "bedrock" && G?.bedrock) ? "F:" : "",
    Ie = findToolByName(n.tools, SKILL) ? "S:" : "",
    Me = Se ? "X:" : "",
    We = toolMatchesName(e, SENDMESSAGE)
      ? isCrossSessionMessagingEnabled()
        ? "C1:"
        : e6()
          ? "CL:"
          : "C0:"
      : "",
    ze = toolMatchesName(e, LISTAGENTS) ? (hasSendMessageTool(n.tools) ? "A1:" : "A0:") : "",
    lt = toolMatchesName(e, ASKUSERQUESTION) && _1r(n.tools) ? "DP:" : "",
    Je = toolMatchesName(e, AGENT) ? (getSubscriptionType() === "pro" ? "P1:" : "P0:") : "",
    nt = toolMatchesName(e, AGENT) ? hasSendMessageTool(n.tools) : void 0,
    pt = nt === void 0 ? "" : nt ? "AC1:" : "AC0:",
    Et =
      !GFe() &&
      (toolMatchesName(e, AGENT) ||
        toolMatchesName(e, ASKUSERQUESTION) ||
        toolMatchesName(e, FILE_READ_TOOL_NAME) ||
        toolMatchesName(e, BASH_TOOL_NAME) ||
        toolMatchesName(e, GREP_TOOL_NAME) ||
        toolMatchesName(e, SKILL) ||
        toolMatchesName(e, TOOL_SEARCH_TOOL_NAME) ||
        toolMatchesName(e, WORKFLOW_TOOL_NAME))
        ? S(() => mme(q))
        : void 0,
    yt = Et === !0 ? "R:" : "",
    gt = toolMatchesName(e, MONITOR) ? (isMonitorPersistentAllowed() ? "M1:" : "M0:") : "",
    At = toolMatchesName(e, AGENT) ? (isRelativeEffortDisabled() ? "E1:" : "E0:") : "",
    It = toolMatchesName(e, AGENT) ? x1r(n.querySource)?.whenToUse : void 0,
    Yt = It === void 0 ? "" : It === "" ? "X0:" : "X1:",
    qt = toolMatchesName(e, SCHEDULE_WAKEUP_TOOL_NAME) ? (isClaudeAISubscriber() ? "W1:" : "W0:") : "",
    Zt = "",
    rn = toolMatchesName(e, ARTIFACT_TOOL_NAME_2)
      ? require("./chunk-wk7qym19.js").artifactCorePromptCacheKeyBit(n.tools)
      : "",
    pn = toolMatchesName(e, WEBFETCH)
      ? n.tools.some((tool) => toolMatchesName(tool, ARTIFACT_TOOL_NAME_2))
        ? "WA1:"
        : require("./chunk-ph6mv7v4.js").artifactMcpToolsReplaceBuiltIn(n.tools)
          ? "WA2:"
          : "WA0:"
      : "",
    no = toolMatchesName(e, SEARCHPLUGINS)
      ? n.tools.some((tool) => toolMatchesName(tool, SUGGESTPLUGININSTALL))
        ? "PS1:"
        : "PS0:"
      : "",
    inboxSurfaceCacheKeyBit = require("./chunk-psktkvhp.js").inboxSurfaceCacheKeyBit(e, n.tools),
    ho = e.mcpInfo?.fileReference === !0 ? require("./chunk-bkeaw5fv.js").fileReferenceHintKeyBit(e) : "",
    yn = n.withoutToolDescribeHooks ? "H:" : "",
    Kn = n.loadedThroughToolSearch === !0 && e.isMcp === !0 ? "LT:" : "",
    fo =
      (n.byValueListing !== void 0 ? `V${n.byValueListing}:` : "") +
      yn +
      Kn +
      we +
      Ee +
      Ae +
      Ie +
      Me +
      We +
      ze +
      lt +
      Je +
      pt +
      yt +
      gt +
      At +
      Yt +
      qt +
      rn +
      pn +
      no +
      inboxSurfaceCacheKeyBit +
      ho +
      ("inputJSONSchema" in e && e.inputJSONSchema ? `${e.name}:${y.schemaKey(e.inputJSONSchema)}` : e.name),
    To = tryReuseRecordedToolEntry(e, n, {
      cacheKey: fo,
      structuredOutputs: Se,
      provider: h,
      eagerInputStreaming: G,
      serializer: y,
    }),
    bo = To ?? toolDescriptionCache.get(fo);
  if (!bo) {
    let stamp = toolDescriptionCache.stamp(),
      ao = toolToAPISchema(e, { remoteToolForwarding: await shouldForwardRemoteTools([e]) });
    if (nt === !1 && !("inputJSONSchema" in e && e.inputJSONSchema)) {
      let properties = ao.properties;
      if (
        typeof properties === "object" &&
        properties !== null &&
        "name" in properties &&
        typeof properties.name === "object" &&
        properties.name !== null
      )
        ao = { ...ao, properties: { ...properties, name: { ...properties.name, description: FZo } } };
    }
    let $o = await getToolDescriptionText(e, {
        ...n,
        model: q,
        leanPrompt: Z,
        bashFirstTrimmed: ke,
        leanRewrite: Et,
      }),
      yo = e.isMcp ? $o : applyPromptAblation($o, n.querySource),
      Ho = n.enginePlacement === "deferred",
      rr = n.withoutToolDescribeHooks
        ? { description: yo, isDeferred: Ho }
        : await resolveToolDescription(e, yo, Ho);
    if (!n.withoutToolDescribeHooks && n.byValueListing === void 0) {
      let Fr = rr.isDeferred !== Ho ? rr.isDeferred : void 0;
      recordDeferral(e.name, Fr);
    }
    if (((bo = { name: e.name, description: rr.description, input_schema: ao }), Se)) {
      if (e.strict === !0) {
        let Hr = normalizeOutputSchema(ao);
        if (Hr.ok) ((bo.strict = !0), (bo.input_schema = Hr.schema));
        else
          logForDebugging(
            `Tool ${e.name} has strict: true but its schema is not strict-compatible (${Hr.reason}); sending non-strict`,
            { level: "warn" },
          );
      } else if (
        e.strictInputJSONSchema &&
        getFeatureValue_CACHED_MAY_BE_STALE("tengu_structured_output_strict", !1)
      )
        ((bo.strict = !0), (bo.input_schema = e.strictInputJSONSchema));
    }
    let sentFromRecord = toolDescriptionCache.getSentFromRecord(fo);
    if (sentFromRecord ? sentFromRecord.eager_input_streaming : isFineGrainedToolStreamingEnabled(h, G))
      bo.eager_input_streaming = !0;
    if ((toolDescriptionCache.register(fo, bo, stamp), !e.isMcp)) y.entriesBuilt.add(e.name);
  }
  let recordedEntry = n.recordedEntry,
    co = recordedEntry !== void 0 && (recordedEntry.strict === !0) === (bo.strict === !0);
  if (recordedEntry !== void 0 && To === void 0)
    compareRecordedToolSchema(y, bo, recordedEntry, co, { mcpTool: e.isMcp === !0, artifactFamily: mSe(e) });
  let So = n.isRedescribed === !0 && isRewrittenByHook(e.name),
    ko = {
      name: bo.name,
      description: So
        ? bo.description
        : (recordedEntry?.description ?? n.recordedDescription ?? bo.description),
      input_schema: co ? recordedEntry.input_schema : bo.input_schema,
      ...(bo.strict && { strict: !0 }),
      ...(bo.eager_input_streaming && { eager_input_streaming: !0 }),
    };
  if (n.deferLoading) ko.defer_loading = !0;
  if (n.cacheControl) ko.cache_control = n.cacheControl;
  if (e.name === WEBSEARCH && S(() => ZSe(model))) ko.citations = { enabled: !0 };
  if (areExperimentalBetasDisabled()) {
    let un = !isToolSearchDisabledByBetas(),
      ao = new Set([
        "name",
        "description",
        "input_schema",
        "cache_control",
        ...(un ? ["defer_loading"] : []),
      ]),
      filtered = Object.keys(ko).filter((yo) => !ao.has(yo));
    if (filtered.length > 0)
      return (
        y.logStripOnce(filtered),
        {
          name: ko.name,
          description: ko.description,
          input_schema: ko.input_schema,
          ...(ko.cache_control && { cache_control: ko.cache_control }),
          ...(un && ko.defer_loading && { defer_loading: !0 }),
        }
      );
  }
  return ko;
}
/**
 * 把 systemContext（键: 值）拼接成一段追加到 system 提示词数组末尾。
 */
//@ chunk-e6aww6q8.js:1512110-1512212 file-local
function appendSystemContextToPrompt(systemPrompt, context) {
  return [
    ...systemPrompt,
    Object.entries(context).map(([r, s]) => `${r}: ${s}`).join(`
`),
  ].filter(Boolean);
}
/**
 * 把 userContext（# 键 值）包进 system-reminder 作为第一条 meta 用户消息（userContextReminder）。
 */
//@ chunk-e6aww6q8.js:1512212-1512400 file-local
function prependUserContextReminder(messages, context) {
  if (Object.entries(context).length === 0) return messages;
  return [
    {
      ...createUserMessage({
        content:
          USER_CONTEXT_PREFIX +
          Object.entries(context).map(
            ([r, s]) => `# ${r}
${s}`,
          ).join(`
`) +
          Hpi,
        isMeta: !0,
      }),
      userContextReminder: !0,
    },
    ...messages,
  ];
}
/**
 * 统计并上报上下文规模：MCP 工具数/服务器数/schema token、CLAUDE.md 大小、git 状态等（tengu_context_size 一类事件）。
 */
//@ chunk-e6aww6q8.js:1512400-1514113 fingerprint = logContextMetrics (0.709)
async function logContextMetrics(e, n, r, s, h, y) {
  if (isFirstPartyTelemetryBlocked()) return;
  let S;
  if (!getIsNonInteractiveSession()) await withTimeout(e);
  else if (env.CLAUDE_CODE_REMOTE) ((S = await t9t(e)), await R1r(e), await sleep(0, void 0, { unref: !0 }));
  let w = () => {
      if (Object.keys(n).length === 0) return Promise.resolve({ tools: [] });
      try {
        let { prefetchAllMcpResources: prefetchAllMcpResources } =
          require("./chunk-asne9cp8.js").mcpClientModule();
        return prefetchAllMcpResources(n, h, y);
      } catch (error) {
        return (logError(error), Promise.resolve({ tools: [] }));
      }
    },
    [{ tools: L }, G, q, Z] = await Promise.all([
      S ? { tools: S.tools.filter((tool) => tool.isMcp) } : w(),
      S ? S.tools : s(r),
      getOrBuildUserContext(e, h, y),
      J3t(e),
    ]),
    Se = Z?.length ?? 0,
    ke = q.claudeMd?.length ?? 0,
    totalContextSize = Se + ke,
    Ee;
  if (!env.CLAUDE_CODE_REMOTE) {
    let currentDir = getCwd();
    Ee = await countFilesRounded(
      currentDir,
      AbortSignal.timeout(1000),
      normalizePatternsToPath(getFileReadIgnorePatterns(r), currentDir),
    );
  }
  let Ae = 0,
    Ie = 0,
    Me = 0,
    We = 0,
    ze = 0,
    nonMcpTools = G.filter((tool) => !tool.isMcp);
  ((Ae = L.length), (We = nonMcpTools.length));
  let serverNames = new Set();
  for (let tool of L) {
    let parts = tool.name.split("__");
    if (parts.length >= 3 && parts[1]) serverNames.add(parts[1]);
  }
  Ie = serverNames.size;
  let nt = getToolSchemaSerializer();
  for (let tool of L) {
    let qt =
      "inputJSONSchema" in tool && tool.inputJSONSchema
        ? tool.inputJSONSchema
        : toolInputJsonSchema(tool.inputSchema);
    Me += roughTokenCountEstimation(nt.schemaText(qt));
  }
  let pt = nonMcpTools.some(mSe) && !(await isArtifactRosterSettled(30000)),
    { schemasSentFromRecord: schemasSentFromRecord, entriesBuilt: entriesBuilt } = nt,
    gt = jW(),
    At = !1;
  for (let tool of nonMcpTools) {
    if (pt && mSe(tool)) continue;
    let Yt =
      "inputJSONSchema" in tool && tool.inputJSONSchema
        ? tool.inputJSONSchema
        : (schemasSentFromRecord.get(tool.name) ?? gt.splicedInputSchema(tool.name));
    if (Yt === void 0 && S !== void 0 && !entriesBuilt.has(tool.name)) {
      At = !0;
      continue;
    }
    ze += roughTokenCountEstimation(nt.schemaText(Yt ?? toolInputJsonSchema(tool.inputSchema)));
  }
  logEvent("tengu_context_size", {
    git_status_size: Se,
    claude_md_size: ke,
    has_user_email: Boolean(q.userEmail),
    total_context_size: totalContextSize,
    project_file_count_rounded: Ee,
    mcp_tools_count: Ae,
    mcp_servers_count: Ie,
    mcp_tools_tokens: Me,
    non_mcp_tools_count: We,
    non_mcp_tools_tokens: ze,
    ...(pt && { non_mcp_tools_tokens_excludes_artifact: !0 }),
    ...(At && { non_mcp_tools_tokens_excludes_unsent: !0 }),
  });
}
/**
 * 工具输入规整：Read.offset 字符串转数字；ExitPlanMode 补计划文件路径；Bash 去掉 cwd 前缀、修正转义；其他工具按各自规则。
 */
//@ chunk-e6aww6q8.js:1514113-1516097 fingerprint = normalizeToolInput (0.518)
function normalizeToolInput_2(e, n, r, s) {
  switch (e.name) {
    case FILE_READ_TOOL_NAME: {
      try {
        if (n === null || typeof n !== "object") return n;
        let h = n,
          plan = coerceNumberString(h.offset);
        if (typeof h.offset === "string" && typeof plan === "number") return { ...h, offset: plan };
      } catch (error) {
        logError(
          Error(
            `normalizeToolInput Read.offset coercion failed: ${languageErrorNameOf(error)} was thrown; its text is not logged`,
          ),
        );
      }
      return n;
    }
    case EXITPLANMODE_2: {
      let planFilePath = getPlanWithPath(r);
      return (chainPlanSnapshot(s), planFilePath !== null ? { ...n, ...planFilePath } : n);
    }
    case BashTool.name: {
      let parsed = BashTool.inputSchema.parse(n),
        { command: command, timeout: timeout, description: description } = parsed,
        L = isRemoteOnlyCheck(e.name) ? null : getCwd(),
        G =
          L === null
            ? command
            : stripCdPrefix(command, getPlatform() === "windows" ? [L, windowsPathToPosixPath(L)] : [L])
                .command;
      if (((G = G.replaceAll("\\\\;", "\\;")), /^echo\s+["']?[^|&;><]*["']?$/i.test(G.trim())))
        logEvent("tengu_bash_tool_simple_echo", {});
      let q = "run_in_background" in parsed ? parsed.run_in_background : void 0;
      return {
        command: G,
        description: description,
        ...(timeout !== void 0 && { timeout: timeout }),
        ...(description !== void 0 && { description: description }),
        ...(q !== void 0 && { run_in_background: q }),
        ...("dangerouslyDisableSandbox" in parsed &&
          parsed.dangerouslyDisableSandbox !== void 0 && {
            dangerouslyDisableSandbox: parsed.dangerouslyDisableSandbox,
          }),
        ...!1,
        ...(yO() && $r in parsed && parsed[$r] !== void 0 && { [$r]: parsed[$r] }),
        ...("allowed_domains" in parsed &&
          parsed.allowed_domains !== void 0 && { allowed_domains: parsed.allowed_domains }),
      };
    }
    case FileEditTool.name: {
      let y = { ...n };
      if ("old_str" in y) {
        if (!("old_string" in y)) y.old_string = y.old_str;
        delete y.old_str;
      }
      if ("new_str" in y) {
        if (!("new_string" in y)) y.new_string = y.new_str;
        delete y.new_str;
      }
      let parsedInput = FileEditTool.inputSchema.parse(y),
        w = {
          file_path: parsedInput.file_path,
          edits: [
            {
              old_string: parsedInput.old_string,
              new_string: parsedInput.new_string,
              replace_all: parsedInput.replace_all,
            },
          ],
        },
        { file_path: file_path, edits: edits } =
          isRemoteOnlyCheck(e.name) || (yO() && Cf(parsedInput))
            ? {
                ...w,
                edits: w.edits.map((edit) =>
                  WEt(w.file_path) ? edit : { ...edit, new_string: stripTrailingWhitespace(edit.new_string) },
                ),
              }
            : normalizeFileEditInput(w);
      return {
        replace_all: edits[0].replace_all,
        file_path: file_path,
        old_string: edits[0].old_string,
        new_string: edits[0].new_string,
        ...(yO() && $r in parsedInput && parsedInput[$r] !== void 0 && { [$r]: parsedInput[$r] }),
      };
    }
    case FileWriteTool.name: {
      let safeParse = FileWriteTool.inputSchema.safeParse(n);
      if (!safeParse.success) return n;
      let y = WEt(safeParse.data.file_path);
      return {
        file_path: safeParse.data.file_path,
        content: y ? safeParse.data.content : stripTrailingWhitespace(safeParse.data.content),
        ...(yO() && $r in safeParse.data && safeParse.data[$r] !== void 0 && { [$r]: safeParse.data[$r] }),
      };
    }
    default:
      return n;
  }
}
/**
 * 规范化写入记录的工具输入：ExitPlanMode 附计划内容，多处编辑的 Edit 去掉单编辑字段，SendMessage 做专门转换。
 */
//@ chunk-e6aww6q8.js:1516097-1516362 placement
function normalizeToolInputForRecord(e, n, r = !0) {
  switch (e) {
    case EXITPLANMODE_2: {
      if (r && n && typeof n === "object") return stripHostOwnedInputKeys(e, n);
      return n;
    }
    case FileEditTool.name: {
      if (r && n && typeof n === "object" && "edits" in n) {
        let { old_string: old_string, new_string: new_string, replace_all: replace_all, ...S } = n;
        return S;
      }
      return n;
    }
    case SENDMESSAGE:
      return stripObservableFields(n) ?? n;
    default:
      return n;
  }
}
//@ chunk-e6aww6q8.js:1516362-1516370 placement
setToolDefinitionBuilder(toolToApiDefinition);
/**
 * 预先为配置了工具描述钩子的工具各运行一次描述钩子，失败只记日志。
 */
//@ chunk-e6aww6q8.js:1516370-1516544 placement
async function prefetchToolDescribeHooks(e, n) {
  try {
    if (!isToolDescribeHooked()) return;
    await Promise.all(
      e
        .filter((r) => isToolDescribeHookedForBuild(r.name))
        .map((r) =>
          describedOnce(r.name, () =>
            n(r).then(
              () => {
                return;
              },
              (s) => {
                logError(toError(s));
              },
            ),
          ),
        ),
    );
  } catch (error) {
    logError(toError(error));
  }
}
/**
 * 判断 stellar drift 功能是否开启：环境变量优先，特定环境强制开启，第一方 API 后端按会话固定开关。
 */
//@ chunk-e6aww6q8.js:1516544-1516687 placement
function isStellarDriftEnabled() {
  let CLAUDE_CODE_STELLAR_DRIFT = env.CLAUDE_CODE_STELLAR_DRIFT;
  if (CLAUDE_CODE_STELLAR_DRIFT !== void 0) return CLAUDE_CODE_STELLAR_DRIFT;
  if (isTetherEnvOptIn()) return !0;
  if (!isFirstPartyApiBackend()) return !1;
  return getFeatureValue_SESSION_PINNED("tengu_stellar_drift", !1);
}
/**
 * 记录 system 第一块（计费头）的长度与哈希（tengu_sysprompt_block）。
 */
//@ chunk-w5ndchqs.js:3633-3859 fingerprint = logAPIPrefix (0.752)
function logAPIPrefix(systemPrompt) {
  try {
    let [n] = splitSysPromptPrefix(systemPrompt, { skipTelemetry: !0 }),
      firstSystemPrompt = n?.text;
    logEvent("tengu_sysprompt_block", {
      length: firstSystemPrompt?.length ?? 0,
      hash: firstSystemPrompt ? ye(createHash("sha256").update(firstSystemPrompt).digest("hex")) : lit(""),
    });
  } catch (error) {
    logError(withTelemetryMessage(toError(error), "system prompt block telemetry failed"));
  }
}
/**
 * system 提示词数组切块（buildSystemPromptBlocks 的基础）：计费头 x-anthropic-billing-header 一块（无缓存），身份行一块，"# Reporting outcomes" 段单独一块；有 __SYSTEM_PROMPT_DYNAMIC_BOUNDARY__ 且 scope 可用时边界前为静态块（scope global，可按 STATIC_BREAKPOINT 再切）、边界后为动态块；否则其余合成一块（org）。实测第三方 3 块、第一方 4 块。
 */
//@ chunk-w5ndchqs.js:3859-5496 fingerprint = splitSysPromptPrefix (0.969)
function splitSysPromptPrefix(systemPrompt, options) {
  let useGlobalCacheFeature = shouldUseGlobalCacheScope(),
    index = systemPrompt.findIndex((x) => x === SYSTEM_PROMPT_DYNAMIC_BOUNDARY);
  if (useGlobalCacheFeature && options?.skipGlobalCacheForSystemPrompt && index === -1) {
    if (!options?.skipTelemetry)
      logEvent("tengu_sysprompt_using_tool_based_cache", { promptBlockCount: systemPrompt.length });
    let x,
      R,
      U,
      S = [];
    for (let prompt of systemPrompt) {
      if (!prompt) continue;
      if (prompt === SYSTEM_PROMPT_DYNAMIC_BOUNDARY) continue;
      if (prompt.startsWith(X_ANTHROPIC_BILLING_HEADER)) x = prompt;
      else if (CLI_SYSPROMPT_PREFIX_SET.has(prompt)) R = prompt;
      else if (prompt === REPORTING_OUTCOMES_SECTION) U = prompt;
      else S.push(prompt);
    }
    let E = [];
    if (x) E.push({ text: x, cacheScope: null });
    if (R) E.push({ text: R, cacheScope: "org" });
    if (U && x && R) E.push({ text: U, cacheScope: null });
    let joined = S.join(`

`);
    if (joined) E.push({ text: joined, cacheScope: "org" });
    return E;
  }
  if (useGlobalCacheFeature) {
    if (index !== -1) {
      let x,
        R,
        U,
        S = [],
        E = [];
      for (let z = 0; z < systemPrompt.length; z++) {
        let block = systemPrompt[z];
        if (!block || block === SYSTEM_PROMPT_DYNAMIC_BOUNDARY) continue;
        if (block.startsWith(X_ANTHROPIC_BILLING_HEADER)) x = block;
        else if (CLI_SYSPROMPT_PREFIX_SET.has(block)) R = block;
        else if (block === REPORTING_OUTCOMES_SECTION) U = block;
        else if (z < index) S.push(block);
        else E.push(block);
      }
      let C = [];
      if (x) C.push({ text: x, cacheScope: null });
      if (R) C.push({ text: R, cacheScope: null });
      if (U && x && R) C.push({ text: U, cacheScope: null });
      let joined = S.join(`

`),
        O = joined ? splitAtStaticBreakpoint(joined) : [];
      for (let z of O) C.push({ text: z, cacheScope: "global" });
      let joined_2 = E.join(`

`);
      if (joined_2) C.push({ text: joined_2, cacheScope: O.length > 1 ? null : "org" });
      if (!options?.skipTelemetry)
        logEvent("tengu_sysprompt_boundary_found", {
          blockCount: C.length,
          staticBlockLength: joined.length,
          dynamicBlockLength: joined_2.length,
        });
      return C;
    } else if (!options?.skipTelemetry)
      logEvent("tengu_sysprompt_missing_boundary_marker", { promptBlockCount: systemPrompt.length });
  }
  let d,
    m,
    h,
    y = [];
  for (let [x, R] of systemPrompt.entries()) {
    if (!R || R === SYSTEM_PROMPT_DYNAMIC_BOUNDARY) continue;
    if (R.startsWith(X_ANTHROPIC_BILLING_HEADER)) d = R;
    else if (CLI_SYSPROMPT_PREFIX_SET.has(R)) m = R;
    else if (R === REPORTING_OUTCOMES_SECTION) h = R;
    else y.push(x < index ? splitAtStaticBreakpoint(R).join("") : R);
  }
  let w = [];
  if (d) w.push({ text: d, cacheScope: null });
  if (m) w.push({ text: m, cacheScope: "org" });
  if (h && d && m) w.push({ text: h, cacheScope: null });
  let joined = y.join(`

`);
  if (joined) w.push({ text: joined, cacheScope: "org" });
  return w;
}

export {
  applyPromptAblation,
  normalizeToolInput_2,
  normalizeToolInputForRecord,
  x1r,
  waitForGate,
  commitGate,
  R1r,
  cYs,
  isStellarDriftEnabled,
  prefetchToolDescribeHooks,
  toolToApiDefinition,
  ZSe,
  k4e,
  n9t,
  splitSysPromptPrefix,
  logAPIPrefix,
  logContextMetrics,
  withTimeout,
  appendSystemContextToPrompt,
  prependUserContextReminder,
  API_STRIPPED_INPUT_FIELDS,
  QSe,
  JSe,
  withPlanPath,
  getToolListingHash,
  buildToolListingEntries,
  chainPlanSnapshot,
};
