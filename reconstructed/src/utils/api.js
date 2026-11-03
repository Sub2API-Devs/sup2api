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
import { isDeepStrictEqual } from "util";
import { createHash } from "crypto";
import { EXITPLANMODE_2 } from "../tools/ExitPlanModeTool/constants.js";
import { SessionRootSlot } from "../bootstrap/sessionSlices.js";
import { sleep } from "./sleep.js";
import { getRootSession, getIsNonInteractiveSession } from "../bootstrap/state.js";
import { isPlainObject as isPlainObject_5 } from "./isPlainObject.js";
import { xr } from "../../vendor/lodash-es/_inlinedHelpers.js";
import { count } from "./collections.js";
import { planFiles, persistFileSnapshotIfRemote, getPlanWithPath } from "./plans.js";
import { isUnparsedInputMarker } from "./json.js";
import { stripHostOwnedInputKeys } from "./permissions/permissionAnswer.js";
import { isAutoModeQuerySource } from "../services/api/requestHeaders.js";
import { SYSTEM_PROMPT_DYNAMIC_BOUNDARY } from "../entrypoints/sdk/coreSchemas.js";
import { getSessionFeatureValues } from "../bootstrap/sessionFeatureValues.js";
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
import {
  HOST_TOOL_INPUT_FIELD,
  canRunToolsOnThisMachine,
  hasHostField,
} from "../bridge/deviceRegistration.js";
import { isMultiEntryAliasTool, toolMatchesAnyName } from "../services/tools/permissionCheckGuard.js";
import { isRemoteToolForwardingEnabled } from "../services/remoteTools/servingGates.js";
import { AGENT, AGENT_NAME_FIELD_DESCRIPTION } from "../tools/AgentTool/constants.js";
import { shortContentHash } from "../services/api/toolDefinitionShape.js";
import { logFeatureOk, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { catalogEntriesByFirstPartyId } from "./model/modelCatalog.js";
import { logForDebugging } from "./debug.js";
import { jsonStringify } from "./slowOperations.js";
import { HostScoped } from "./hostScoped.js";
import { simpleModeEnv, getPromptModel, leanPromptFor, leanRewriteFor } from "./model/promptBundles.js";
import { firstLineOf } from "./stringUtils.js";
import { sanitizeToolNameForAnalytics } from "../services/analytics/metadata.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  getFeatureValue_SESSION_PINNED,
} from "../services/analytics/growthbook.js";
import { isRemoteNonInteractiveSession } from "./startupFlagWait.js";
import { isRemoteCowork } from "./entrypointKinds.js";
import { ARTIFACT_TOOL_NAME as ARTIFACT_TOOL_NAME_2 } from "../tools/ArtifactTool/constants.js";
import {
  isToolDescribeHookedForBuild,
  toolDescriptionCache as toolDescriptionCache_2,
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
import { isMessagingLimitedToOwnAgents } from "../tools/SendMessageTool/SendMessageTool.js";
import { LISTAGENTS } from "../tools/SendMessageTool/listAgents.js";
import { ASKUSERQUESTION } from "../tools/AskUserQuestionTool/prompt.js";
import { isPlanModeToolUnavailable, isRelativeEffortDisabled } from "../tools/AgentTool/agentEffort.js";
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
import { isArtifactFamilyTool, isArtifactRosterSettled } from "../services/artifacts/rosterWait.js";
import { WEBSEARCH } from "../tools/WebSearchTool/prompt.js";
import { isToolSearchDisabledByBetas } from "./toolSearchChrome.js";
import { createUserMessage } from "./messages.js";
import { USER_CONTEXT_PREFIX, USER_CONTEXT_SUFFIX } from "../services/api/promptCacheBreakParts.js";
import { isFirstPartyTelemetryBlocked } from "./hostEnvironment.js";
import { getOrBuildUserContext, getGitStatusPrefetch } from "../context.js";
import { getCwd } from "./cwd.js";
import { countFilesRounded } from "./ripgrep.js";
import { normalizePatternsToPath, getFileReadIgnorePatterns } from "./permissions/filesystem.js";
import { roughTokenCountEstimation } from "../services/tokenEstimation.js";
import { deferredToolCache } from "../services/api/deferredToolsState.js";
import { logEvent } from "../services/analytics/index.js";
import { coerceNumberString } from "../tools/ArtifactTool/publishEdits.js";
import { languageErrorNameOf, toError, withTelemetryMessage } from "./errors.js";
import { isRemoteOnlyCheck } from "./permissions/checkRegistry.js";
import { stripCdPrefix, isTetherEnvOptIn } from "./wireToolInputEcho.js";
import { getPlatform } from "./platform.js";
import { windowsPathToPosixPath } from "./path.js";
import { FileEditTool } from "../tools/FileEditTool/FileEditTool.js";
import {
  isMarkdownPath,
  stripTrailingWhitespace,
  normalizeFileEditInput,
} from "../tools/FileEditTool/utils.js";
import { FileWriteTool } from "../tools/FileWriteTool/FileWriteTool.js";
import { sanitizeMarkName } from "./startupMarks.js";
import { lit } from "../services/analytics/safeMetadata.js";
import {
  X_ANTHROPIC_BILLING_HEADER,
  REPORTING_OUTCOMES_SECTION,
} from "../services/api/promptCacheBreakDetection.js";
import { CLI_SYSPROMPT_PREFIX_SET } from "../constants/system.js";
import { splitAtStaticBreakpoint } from "./systemPromptBoundary.js";

//@ chunk-e6aww6q8.js:861006-861063 fingerprint = normalizeToolInputForAPI (0.524)
/**
 * 发回 API 前要从工具输入里去掉的字段：ExitPlanMode 的 plan/planFilePath。旧版名 normalizeToolInputForAPI 不准确。
 */
var API_STRIPPED_INPUT_FIELDS = new Map([[EXITPLANMODE_2, new Set(["plan", "planFilePath"])]]);
//@ chunk-e6aww6q8.js:1423789-1423895 placement
/**
 * 按会话根保存“首个请求”的等待门（promise、resolve 与是否已提交）。
 */
var SLEEP_GATE_TIMEOUT_MS = 1e4;
var firstRequestGateByRoot = new SessionRootSlot(() => {
  let resolve = () => {};
  return {
    promise: new Promise((resolve_2) => {
      resolve = resolve_2;
    }),
    resolve,
    committed: false,
  };
});
//@ chunk-e6aww6q8.js:1423895-1423936 placement
function waitForGate(e) {
  return firstRequestGateByRoot.of(e).promise;
}
//@ chunk-e6aww6q8.js:1423936-1424007 placement = withTimeout (0.805)
function withTimeout(e) {
  return Promise.race([
    waitForGate(e),
    sleep(SLEEP_GATE_TIMEOUT_MS, undefined, {
      unref: true,
    }),
  ]);
}
//@ chunk-e6aww6q8.js:1424007-1424066 placement
function commitGate(session) {
  let n = firstRequestGateByRoot.of(session);
  n.committed = true;
  n.resolve();
}
//@ chunk-e6aww6q8.js:1424066-1424237 placement
var firstRequestGate = new SessionRootSlot(() => {
  let resolve = (h) => {};
  let promise = new Promise((resolve_2) => {
    resolve = resolve_2;
  });
  let resolveRequestSent = () => {};
  let requestSent = new Promise((resolve) => {
    resolveRequestSent = resolve;
  });
  return {
    promise,
    resolve,
    started: false,
    requestSent,
    resolveRequestSent,
  };
});
//@ chunk-e6aww6q8.js:1424237-1424278 placement
/**
 * 等待首个请求开始（返回门上的 promise）。
 */
function waitForFirstRequest(e) {
  return firstRequestGate.of(e).promise;
}
//@ chunk-e6aww6q8.js:1424278-1424366 placement
/**
 * 标记首个请求已开始并放行工具列表。
 */
function startFirstRequestGate(session, tools) {
  let r = firstRequestGate.of(session);
  if (r.started) return;
  r.started = true;
  r.resolve({
    tools,
  });
}
//@ chunk-e6aww6q8.js:1424366-1424411 placement
/**
 * 请求是否已经发出。
 */
function hasRequestBeenSent(e) {
  return firstRequestGate.of(e).requestSent;
}
//@ chunk-e6aww6q8.js:1424411-1424458 placement
/**
 * 标记请求已发出。
 */
function markRequestSent(rootSession) {
  firstRequestGate.of(rootSession).resolveRequestSent();
}
//@ chunk-e6aww6q8.js:1424458-1424482 placement
/**
 * 标记根会话的请求已发出。
 */
function markRootRequestSent() {
  markRequestSent(getRootSession());
}
//@ chunk-e6aww6q8.js:1424482-1424505 placement
/**
 * 按查询来源返回附加提示（当前恒为 undefined）。
 */
function querySourceHints(querySource) {
  return;
}
//@ chunk-e6aww6q8.js:1500608-1500877 placement
/**
 * 比较工具 schema 时用到的键集合：纯说明类键（忽略）、子 schema 映射类键、需排序比较的数组类键。
 */
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
]);
var SCHEMA_MAP_KEYS = new Set([
  "properties",
  "patternProperties",
  "$defs",
  "definitions",
  "dependentSchemas",
]);
var SCHEMA_SET_KEYS = new Set(["enum", "const", "required", "dependentRequired"]);
//@ chunk-e6aww6q8.js:1500877-1501163 placement
/**
 * 递归规范化 JSON schema 以便比较：去掉描述/标题/示例等说明性键，对 enum/required 等字符串数组排序。
 */
function normalizeSchemaForCompare(e) {
  if (Array.isArray(e)) return e.map(normalizeSchemaForCompare);
  if (!isPlainObject_5(e)) return e;
  let n = {};
  for (let [key, value] of Object.entries(e)) {
    if (SCHEMA_TEXT_KEYS.has(key)) continue;
    if (SCHEMA_SET_KEYS.has(key))
      n[key] = Array.isArray(value) && value.every((h) => typeof h === "string") ? value.toSorted() : value;
    else if (SCHEMA_MAP_KEYS.has(key) && isPlainObject_5(value))
      n[key] = xr(value, normalizeSchemaForCompare);
    else n[key] = normalizeSchemaForCompare(value);
  }
  return n;
}
//@ chunk-e6aww6q8.js:1501163-1501252 placement
/**
 * 把 schema 的 properties 转成 Map。
 */
function schemaPropertiesMap(e) {
  let properties = isPlainObject_5(e) ? e.properties : undefined;
  return new Map(isPlainObject_5(properties) ? Object.entries(properties) : []);
}
//@ chunk-e6aww6q8.js:1501252-1501326 placement
/**
 * 取出 schema 的 enum 数组。
 */
function schemaEnumValues(e) {
  let n = isPlainObject_5(e) ? e.enum : undefined;
  return Array.isArray(n) ? n : undefined;
}
//@ chunk-e6aww6q8.js:1501326-1501518 placement
function countMissingSchemaParts(e, n) {
  let r = schemaPropertiesMap(n);
  let s = 0;
  for (let [h, y] of schemaPropertiesMap(e)) {
    if (!r.has(h)) {
      s += 1;
      continue;
    }
    let S = schemaEnumValues(y);
    let w = schemaEnumValues(r.get(h));
    if (S !== undefined && w !== undefined) {
      let L = new Set(w);
      s += count(S, (G) => !L.has(G));
    }
  }
  return s;
}
//@ chunk-e6aww6q8.js:1501518-1501687 placement
/**
 * 比较记录的工具 schema 与实时 schema：完全相同、只有说明文字不同、记录提供更多、实时新增、或其他差异。
 */
function compareToolSchemas(inputSchema, inputSchema_2) {
  if (isDeepStrictEqual(inputSchema, inputSchema_2)) return "equal";
  if (isDeepStrictEqual(normalizeSchemaForCompare(inputSchema), normalizeSchemaForCompare(inputSchema_2)))
    return "text_only";
  if (countMissingSchemaParts(inputSchema, inputSchema_2) > 0) return "record_offers_more";
  if (countMissingSchemaParts(inputSchema_2, inputSchema) > 0) return "live_adds";
  return "other";
}
//@ chunk-e6aww6q8.js:1501725-1501827 placement
/**
 * 把远程计划文件快照的保存串到快照链上依次执行。
 */
function chainPlanSnapshot(e) {
  let n = planFiles()
    .snapshotChain.then(() => persistFileSnapshotIfRemote(e))
    .catch(() => {});
  planFiles().snapshotChain = n;
  return n;
}
//@ chunk-e6aww6q8.js:1502377-1502484 placement
/**
 * ExitPlanMode 工具输入中补上计划内容与计划文件路径。
 */
function withPlanPath(name, n, agentId) {
  if (name !== EXITPLANMODE_2 || !isPlainObject_5(n) || isUnparsedInputMarker(n)) return n;
  let s = stripHostOwnedInputKeys(name, n);
  let planWithPath = getPlanWithPath(agentId);
  return planWithPath !== null
    ? {
        ...s,
        ...planWithPath,
      }
    : s;
}
//@ chunk-e6aww6q8.js:1503098-1503390 placement
/**
 * 对系统提示词片段做实验性"消融"：删除配置里列出的字符串（首次命中时记录）；自动模式查询与动态边界标记不处理；出错时记录并原样返回。
 */
function applyPromptAblation(e, querySource) {
  if (isAutoModeQuerySource(querySource) || e === SYSTEM_PROMPT_DYNAMIC_BOUNDARY) return e;
  let sessionFeatureValues = getSessionFeatureValues();
  try {
    let s = (sessionFeatureValues.promptAblation ??= loadPromptRemovalConfig());
    let h = e;
    for (let string of s.strings) {
      if (!h.includes(string)) continue;
      h = h.replaceAll(string, "");
      if (!s.matched.has(string)) {
        s.matched.add(string);
        logPromptStringsRemoval(s);
      }
    }
    return h;
  } catch (error) {
    sessionFeatureValues.promptAblation ??= {
      strings: [],
      matched: new Set(),
    };
    logError(error);
    return e;
  }
}
//@ chunk-e6aww6q8.js:1503390-1503451 placement
/**
 * 早期的 Claude 3 模型名列表。
 */
var LEGACY_CLAUDE3_MODELS = ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"];
//@ chunk-e6aww6q8.js:1503451-1503494 placement
/**
 * 判断模型是否不是早期的 Claude 3 系列。
 */
function isNotLegacyClaude3(e) {
  return !LEGACY_CLAUDE3_MODELS.includes(getCanonicalName(e));
}
//@ chunk-e6aww6q8.js:1503494-1503586 placement
/**
 * 是否给 WebSearch 工具开启 citations（需环境变量、首方后端且非实验 beta）。
 */
function shouldEnableWebSearchCitations(e) {
  return (
    env.CLAUDE_CODE_WEBSEARCH_CITATIONS &&
    isFirstPartyApiBackend() &&
    !areExperimentalBetasDisabled() &&
    (e === undefined || isNotLegacyClaude3(e))
  );
}
//@ chunk-e6aww6q8.js:1503586-1503822 callgraph-fingerprint = toolToAPISchema (0.215)
/**
 * 工具输入 schema：inputJSONSchema 或 zod 转换；非 swarm 时去掉 swarm 字段；支持远程执行且未转发时去掉远程执行字段（含条目数组内）。
 */
function toolToAPISchema(tool, { remoteToolForwarding }) {
  let s =
    "inputJSONSchema" in tool && tool.inputJSONSchema
      ? tool.inputJSONSchema
      : toolInputJsonSchema(tool.inputSchema);
  if (!isAgentSwarmsEnabled()) s = omitSwarmFields(tool.name, s);
  if (getToolRemoteExecution(tool).supported && !remoteToolForwarding) {
    s = omitSchemaProperties(s, [HOST_TOOL_INPUT_FIELD]);
    if (isMultiEntryAliasTool(tool))
      s = omitArrayItemProperties(s, tool.entryFieldName, [HOST_TOOL_INPUT_FIELD]);
  }
  return s;
}
//@ chunk-e6aww6q8.js:1503822-1503892 layout
/**
 * 有工具支持远程执行且远程工具服务可用。
 */
async function shouldForwardRemoteTools(e) {
  return e.some((n) => getToolRemoteExecution(n).supported) && (await isRemoteToolForwardingEnabled());
}
//@ chunk-e6aww6q8.js:1503892-1503981 fingerprint = SWARM_FIELDS_BY_TOOL (1)
/**
 * 关闭 swarm 时从 schema 去掉的字段：ExitPlanMode 的 launchSwarm/teammateCount，Agent 的 name/team_name/mode。
 */
var SWARM_FIELDS_BY_TOOL = new Map([
  [EXITPLANMODE_2, ["launchSwarm", "teammateCount"]],
  [AGENT, ["name", "team_name", "mode"]],
]);
//@ chunk-e6aww6q8.js:1503981-1504145 layout
/**
 * 从 schema.properties 删掉指定字段。
 */
function omitSchemaProperties(e, n) {
  if (n.length === 0) return e;
  let properties = e.properties;
  if (!properties || typeof properties !== "object") return e;
  let s = {
    ...properties,
  };
  for (let h of n) delete s[h];
  return {
    ...e,
    properties: s,
  };
}
//@ chunk-e6aww6q8.js:1504145-1504497 layout
/**
 * 从某个数组字段的 items.properties 删掉指定字段。
 */
function omitArrayItemProperties(e, entryFieldName, r) {
  let properties = e.properties;
  if (!properties || typeof properties !== "object" || !(entryFieldName in properties)) return e;
  let h = properties[entryFieldName];
  if (!h || typeof h !== "object" || !("items" in h)) return e;
  let items = h.items;
  if (!items || typeof items !== "object" || !("properties" in items)) return e;
  let S = omitSchemaProperties(
    {
      type: "object",
      properties: items.properties,
    },
    r,
  );
  return {
    ...e,
    properties: {
      ...properties,
      [entryFieldName]: {
        ...h,
        items: {
          ...items,
          properties: S.properties,
        },
      },
    },
  };
}
//@ chunk-e6aww6q8.js:1504497-1504544 layout
/**
 * 按工具名去掉 SWARM_FIELDS_BY_TOOL 中的字段。
 */
function omitSwarmFields(name, n) {
  return omitSchemaProperties(n, SWARM_FIELDS_BY_TOOL.get(name) ?? []);
}
//@ chunk-e6aww6q8.js:1504544-1504557 layout
/**
 * 注册的工具完整定义构建器（setToolDefinitionBuilder 设置一次）。
 */
var toolDefinitionBuilder = null;
//@ chunk-e6aww6q8.js:1504557-1504581 layout
/**
 * 只设置一次工具定义构建器。
 */
function setToolDefinitionBuilder(toolToApiDefinition) {
  toolDefinitionBuilder ??= toolToApiDefinition;
}
//@ chunk-e6aww6q8.js:1504581-1504801 layout = calculateDeferredToolDescriptionChars (0.871)
/**
 * 对工具的 inputJSONSchema 与 prompt 文本做 16 位哈希，用于检测工具描述是否变化。
 */
async function getToolListingHash(tools, getToolPermissionContext, agents) {
  return shortContentHash({
    inputSchema: tools.inputJSONSchema ?? null,
    description: await tools.prompt({
      getToolPermissionContext: agents.getToolPermissionContext,
      tools: getToolPermissionContext,
      agents: agents.agents,
      allowedAgentTypes: agents.allowedAgentTypes,
    }),
  });
}
//@ chunk-e6aww6q8.js:1504801-1505184 layout
/**
 * 用注册的构建器为一批工具生成 {name, listing, definition}。
 */
async function buildToolListingEntries(e, getToolPermissionContext, model, agents, querySource) {
  let y = toolDefinitionBuilder;
  if (y === null) return;
  return Promise.all(
    e.map(async (S) => {
      let toolListingHash = await getToolListingHash(S, getToolPermissionContext, agents);
      return {
        name: S.name,
        listing: toolListingHash,
        definition: await y(S, {
          getToolPermissionContext: agents.getToolPermissionContext,
          tools: getToolPermissionContext,
          agents: agents.agents,
          allowedAgentTypes: agents.allowedAgentTypes,
          model,
          enginePlacement: agents.enginePlacementOf(S),
          querySource,
          deferLoading: false,
          byValueListing: toolListingHash,
        }),
      };
    }),
  );
}
//@ chunk-e6aww6q8.js:1505184-1506110 file-local
/**
 * 每会话的工具 schema 序列化器：模型配置查找、schema 序列化缓存、记录回放比对、构建跳过统计、剥离日志。
 */
class ToolSchemaSerializer {
  canonicalToConfig = undefined;
  loggedStrip = false;
  schemaKeys = new WeakMap();
  comparedRecordedSchemas = new WeakSet();
  schemasSentFromRecord = new Map();
  entriesBuilt = new Set();
  buildSkippedBatch = undefined;
  noteBuildSkipped(e) {
    if (this.buildSkippedBatch === undefined) {
      let n = {
        skippedTools: 0,
        skippedMcpTools: 0,
      };
      this.buildSkippedBatch = n;
      queueMicrotask(() => {
        this.buildSkippedBatch = undefined;
        logFeatureOk("prompt_snapshot_tool_build_skipped", n);
      });
    }
    this.buildSkippedBatch.skippedTools += 1;
    if (e) this.buildSkippedBatch.skippedMcpTools += 1;
  }
  modelConfig(e) {
    this.canonicalToConfig ??= new Map(
      Object.values(catalogEntriesByFirstPartyId).map((n) => [getCanonicalName(n.firstParty), n]),
    );
    return this.canonicalToConfig.get(getCanonicalName(e));
  }
  logStripOnce(stripped) {
    if (this.loggedStrip) return;
    this.loggedStrip = true;
    logForDebugging(
      `[betas] Stripped from tool schemas: [${stripped.join(", ")}] (experimental betas disabled)`,
    );
  }
  schemaKey(e) {
    let n = this.schemaKeys.get(e);
    if (n === undefined) {
      n = jsonStringify(e);
      this.schemaKeys.set(e, n);
    }
    return n;
  }
  schemaText(e) {
    return this.schemaKeys.get(e) ?? jsonStringify(e);
  }
}
//@ chunk-e6aww6q8.js:1506110-1506137 layout
/**
 * 按 session.host 存放 ToolSchemaSerializer 的懒槽。
 */
var toolSchemaSerializerSlot = new HostScoped(() => new ToolSchemaSerializer());
//@ chunk-e6aww6q8.js:1506137-1506176 layout
/**
 * 取当前会话的 ToolSchemaSerializer。
 */
function getToolSchemaSerializer() {
  return toolSchemaSerializerSlot.of(getRootSession().host);
}
//@ chunk-e6aww6q8.js:1506176-1506317 layout
/**
 * 工具描述：CLAUDE_CODE_SIMPLE 时优先 searchHint 或首段，否则 tool.prompt()。
 */
async function getToolDescriptionText(e, n) {
  if (!simpleModeEnv()) return e.prompt(n);
  if (e.searchHint) return e.searchHint;
  let r = await e.prompt(n);
  return (
    firstLineOf(
      r,
      `

`,
    ).trim() || r
  );
}
//@ chunk-e6aww6q8.js:1506317-1506485 layout
/**
 * 记录的工具 schema 与当前不同的分类事件名。
 */
var SCHEMA_DIFF_REASONS = {
  text_only: "schema_differs_text_only",
  live_adds: "schema_differs_live_adds",
  record_offers_more: "schema_differs_record_offers_more",
  other: "schema_differs_other",
};
//@ chunk-e6aww6q8.js:1506485-1506943 layout
/**
 * 比较记录的工具定义与当前构建的 schema，记 prompt_snapshot_tool_replay 结果。
 */
function compareRecordedToolSchema(toolSchemaSerializer, n, recordedEntry, s, { mcpTool, artifactFamily }) {
  if (recordedEntry.input_schema === n.input_schema || toolSchemaSerializer.comparedRecordedSchemas.has(n))
    return;
  toolSchemaSerializer.comparedRecordedSchemas.add(n);
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
    let w = compareToolSchemas(recordedEntry.input_schema, n.input_schema);
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
//@ chunk-e6aww6q8.js:1506943-1507182 layout
/**
 * 是否给工具加 eager_input_streaming：CLAUDE_CODE_ENABLE_FINE_GRAINED_TOOL_STREAMING；第一方官方 API 且 tengu_fgts；Vertex/Bedrock 视模型配置。
 */
function isFineGrainedToolStreamingEnabled(e, n) {
  let r = env.CLAUDE_CODE_ENABLE_FINE_GRAINED_TOOL_STREAMING;
  return Boolean(
    r !== false &&
    ((e === "firstParty" &&
      isFirstPartyAnthropicBaseUrl() &&
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_fgts", false)) ||
      (e === "vertex" && !env.ANTHROPIC_VERTEX_BASE_URL && n?.vertex) ||
      (e === "bedrock" && isGenuineBedrockEndpoint() && n?.bedrock) ||
      r === true),
  );
}
//@ chunk-e6aww6q8.js:1507182-1508019 layout
/**
 * 有可用的提示词快照记录时直接复用记录里的工具描述与 schema（保持缓存前缀不变）。
 */
function tryReuseRecordedToolEntry(e, n, r) {
  let recordedEntry = n.recordedEntry;
  if (
    !isRemoteNonInteractiveSession() ||
    !isRemoteCowork() ||
    recordedEntry === undefined ||
    n.byValueListing !== undefined
  )
    return;
  if (toolMatchesAnyName(e, [ARTIFACT_TOOL_NAME_2])) return;
  if (!n.withoutToolDescribeHooks && (n.isRedescribed === true || isToolDescribeHookedForBuild(e.name)))
    return;
  if (
    (r.structuredOutputs && (e.strict === true || Boolean(e.strictInputJSONSchema))) ||
    recordedEntry.strict === true
  )
    return;
  let y = recordedEntry.description ?? n.recordedDescription;
  if (typeof y !== "string") return;
  let sentFromRecord = toolDescriptionCache_2.getSentFromRecord(r.cacheKey);
  if (sentFromRecord === undefined) {
    if (toolDescriptionCache_2.get(r.cacheKey) !== undefined) return;
    sentFromRecord = {
      eager_input_streaming: isFineGrainedToolStreamingEnabled(r.provider, r.eagerInputStreaming),
    };
    toolDescriptionCache_2.setSentFromRecord(r.cacheKey, sentFromRecord);
    if (!n.withoutToolDescribeHooks) recordDeferral(e.name, undefined);
    r.serializer.schemasSentFromRecord.set(e.name, recordedEntry.input_schema);
    r.serializer.noteBuildSkipped(e.isMcp === true);
  }
  return {
    name: e.name,
    description: y,
    input_schema: recordedEntry.input_schema,
    ...(sentFromRecord.eager_input_streaming && {
      eager_input_streaming: true,
    }),
  };
}
//@ chunk-e6aww6q8.js:1508019-1512110 layout
/**
 * 工具 → API tools[] 元素：按大量特性位组成缓存键，生成 {name, description, input_schema, strict?, eager_input_streaming?}，再加 defer_loading/cache_control/citations；实验 beta 禁用时只留基础字段。
 */
async function toolToApiDefinition(tool, n) {
  let apiProvider = getAPIProvider();
  let toolSchemaSerializer = getToolSchemaSerializer();
  let S = (un) => (isAutoModeQuerySource(n.querySource) ? withCatalogSuppressed(un) : un());
  let model = n.model;
  let L = model !== undefined ? S(() => toolSchemaSerializer.modelConfig(model)) : undefined;
  let G =
    L?.eagerInputStreaming ??
    (L === undefined && model !== undefined && (apiProvider === "bedrock" || apiProvider === "vertex")
      ? S(() => statedEagerInputStreaming(model))
      : undefined);
  let q = S(() => getPromptModel(model));
  let Z = S(() => leanPromptFor(q));
  let Se = model !== undefined && S(() => willSendStructuredOutputsBeta(model));
  let bashFirstTrimmed =
    tool === BashTool && !simpleModeEnv() ? S(() => shouldTrimBashDescription()) : undefined;
  let we = isAutoModeQuerySource(n.querySource) ? "K:" : "";
  let Ee = Z ? "L:" : "";
  let Ae = (apiProvider === "vertex" && G?.vertex) || (apiProvider === "bedrock" && G?.bedrock) ? "F:" : "";
  let Ie = findToolByName(n.tools, SKILL) ? "S:" : "";
  let Me = Se ? "X:" : "";
  let We = toolMatchesName(tool, SENDMESSAGE)
    ? isCrossSessionMessagingEnabled()
      ? "C1:"
      : isMessagingLimitedToOwnAgents()
        ? "CL:"
        : "C0:"
    : "";
  let ze = toolMatchesName(tool, LISTAGENTS) ? (hasSendMessageTool(n.tools) ? "A1:" : "A0:") : "";
  let lt = toolMatchesName(tool, ASKUSERQUESTION) && isPlanModeToolUnavailable(n.tools) ? "DP:" : "";
  let Je = toolMatchesName(tool, AGENT) ? (getSubscriptionType() === "pro" ? "P1:" : "P0:") : "";
  let nt = toolMatchesName(tool, AGENT) ? hasSendMessageTool(n.tools) : undefined;
  let pt = nt === undefined ? "" : nt ? "AC1:" : "AC0:";
  let Et =
    !simpleModeEnv() &&
    (toolMatchesName(tool, AGENT) ||
      toolMatchesName(tool, ASKUSERQUESTION) ||
      toolMatchesName(tool, FILE_READ_TOOL_NAME) ||
      toolMatchesName(tool, BASH_TOOL_NAME) ||
      toolMatchesName(tool, GREP_TOOL_NAME) ||
      toolMatchesName(tool, SKILL) ||
      toolMatchesName(tool, TOOL_SEARCH_TOOL_NAME) ||
      toolMatchesName(tool, WORKFLOW_TOOL_NAME))
      ? S(() => leanRewriteFor(q))
      : undefined;
  let yt = Et === true ? "R:" : "";
  let gt = toolMatchesName(tool, MONITOR) ? (isMonitorPersistentAllowed() ? "M1:" : "M0:") : "";
  let At = toolMatchesName(tool, AGENT) ? (isRelativeEffortDisabled() ? "E1:" : "E0:") : "";
  let whenToUse = toolMatchesName(tool, AGENT) ? querySourceHints(n.querySource)?.whenToUse : undefined;
  let Yt = whenToUse === undefined ? "" : whenToUse === "" ? "X0:" : "X1:";
  let qt = toolMatchesName(tool, SCHEDULE_WAKEUP_TOOL_NAME) ? (isClaudeAISubscriber() ? "W1:" : "W0:") : "";
  let Zt = "";
  let rn = toolMatchesName(tool, ARTIFACT_TOOL_NAME_2)
    ? require("./chunk-wk7qym19.js").artifactCorePromptCacheKeyBit(n.tools)
    : "";
  let pn = toolMatchesName(tool, WEBFETCH)
    ? n.tools.some((tool) => toolMatchesName(tool, ARTIFACT_TOOL_NAME_2))
      ? "WA1:"
      : require("./chunk-ph6mv7v4.js").artifactMcpToolsReplaceBuiltIn(n.tools)
        ? "WA2:"
        : "WA0:"
    : "";
  let no = toolMatchesName(tool, SEARCHPLUGINS)
    ? n.tools.some((tool) => toolMatchesName(tool, SUGGESTPLUGININSTALL))
      ? "PS1:"
      : "PS0:"
    : "";
  let hn = require("./chunk-psktkvhp.js").inboxSurfaceCacheKeyBit(tool, n.tools);
  let ho =
    tool.mcpInfo?.fileReference === true ? require("./chunk-bkeaw5fv.js").fileReferenceHintKeyBit(tool) : "";
  let yn = n.withoutToolDescribeHooks ? "H:" : "";
  let Kn = n.loadedThroughToolSearch === true && tool.isMcp === true ? "LT:" : "";
  let fo =
    (n.byValueListing !== undefined ? `V${n.byValueListing}:` : "") +
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
    hn +
    ho +
    ("inputJSONSchema" in tool && tool.inputJSONSchema
      ? `${tool.name}:${toolSchemaSerializer.schemaKey(tool.inputJSONSchema)}`
      : tool.name);
  let To = tryReuseRecordedToolEntry(tool, n, {
    cacheKey: fo,
    structuredOutputs: Se,
    provider: apiProvider,
    eagerInputStreaming: G,
    serializer: toolSchemaSerializer,
  });
  let bo = To ?? toolDescriptionCache_2.get(fo);
  if (!bo) {
    let un = toolDescriptionCache_2.stamp();
    let ao = toolToAPISchema(tool, {
      remoteToolForwarding: await shouldForwardRemoteTools([tool]),
    });
    if (nt === false && !("inputJSONSchema" in tool && tool.inputJSONSchema)) {
      let properties = ao.properties;
      if (
        typeof properties === "object" &&
        properties !== null &&
        "name" in properties &&
        typeof properties.name === "object" &&
        properties.name !== null
      )
        ao = {
          ...ao,
          properties: {
            ...properties,
            name: {
              ...properties.name,
              description: AGENT_NAME_FIELD_DESCRIPTION,
            },
          },
        };
    }
    let toolDescriptionText = await getToolDescriptionText(tool, {
      ...n,
      model: q,
      leanPrompt: Z,
      bashFirstTrimmed,
      leanRewrite: Et,
    });
    let yo = tool.isMcp ? toolDescriptionText : applyPromptAblation(toolDescriptionText, n.querySource);
    let Ho = n.enginePlacement === "deferred";
    let rr = n.withoutToolDescribeHooks
      ? {
          description: yo,
          isDeferred: Ho,
        }
      : await resolveToolDescription(tool, yo, Ho);
    if (!n.withoutToolDescribeHooks && n.byValueListing === undefined) {
      let isDeferred = rr.isDeferred !== Ho ? rr.isDeferred : undefined;
      recordDeferral(tool.name, isDeferred);
    }
    bo = {
      name: tool.name,
      description: rr.description,
      input_schema: ao,
    };
    if (Se) {
      if (tool.strict === true) {
        let Hr = normalizeOutputSchema(ao);
        if (Hr.ok) {
          bo.strict = true;
          bo.input_schema = Hr.schema;
        } else
          logForDebugging(
            `Tool ${tool.name} has strict: true but its schema is not strict-compatible (${Hr.reason}); sending non-strict`,
            {
              level: "warn",
            },
          );
      } else if (
        tool.strictInputJSONSchema &&
        getFeatureValue_CACHED_MAY_BE_STALE("tengu_structured_output_strict", false)
      ) {
        bo.strict = true;
        bo.input_schema = tool.strictInputJSONSchema;
      }
    }
    let sentFromRecord = toolDescriptionCache_2.getSentFromRecord(fo);
    if (
      sentFromRecord
        ? sentFromRecord.eager_input_streaming
        : isFineGrainedToolStreamingEnabled(apiProvider, G)
    )
      bo.eager_input_streaming = true;
    toolDescriptionCache_2.register(fo, bo, un);
    if (!tool.isMcp) toolSchemaSerializer.entriesBuilt.add(tool.name);
  }
  let recordedEntry = n.recordedEntry;
  let co = recordedEntry !== undefined && (recordedEntry.strict === true) === (bo.strict === true);
  if (recordedEntry !== undefined && To === undefined)
    compareRecordedToolSchema(toolSchemaSerializer, bo, recordedEntry, co, {
      mcpTool: tool.isMcp === true,
      artifactFamily: isArtifactFamilyTool(tool),
    });
  let So = n.isRedescribed === true && isRewrittenByHook(tool.name);
  let ko = {
    name: bo.name,
    description: So
      ? bo.description
      : (recordedEntry?.description ?? n.recordedDescription ?? bo.description),
    input_schema: co ? recordedEntry.input_schema : bo.input_schema,
    ...(bo.strict && {
      strict: true,
    }),
    ...(bo.eager_input_streaming && {
      eager_input_streaming: true,
    }),
  };
  if (n.deferLoading) ko.defer_loading = true;
  if (n.cacheControl) ko.cache_control = n.cacheControl;
  if (tool.name === WEBSEARCH && S(() => shouldEnableWebSearchCitations(model)))
    ko.citations = {
      enabled: true,
    };
  if (areExperimentalBetasDisabled()) {
    let un = !isToolSearchDisabledByBetas();
    let ao = new Set([
      "name",
      "description",
      "input_schema",
      "cache_control",
      ...(un ? ["defer_loading"] : []),
    ]);
    let filtered = Object.keys(ko).filter((key) => !ao.has(key));
    if (filtered.length > 0) {
      toolSchemaSerializer.logStripOnce(filtered);
      return {
        name: ko.name,
        description: ko.description,
        input_schema: ko.input_schema,
        ...(ko.cache_control && {
          cache_control: ko.cache_control,
        }),
        ...(un &&
          ko.defer_loading && {
            defer_loading: true,
          }),
      };
    }
  }
  return ko;
}
//@ chunk-e6aww6q8.js:1512110-1512212 file-local
/**
 * 把 systemContext（键: 值）拼接成一段追加到 system 提示词数组末尾。
 */
function appendSystemContextToPrompt(systemPrompt, context) {
  return [
    ...systemPrompt,
    Object.entries(context).map(([key, value]) => `${key}: ${value}`).join(`
`),
  ].filter(Boolean);
}
//@ chunk-e6aww6q8.js:1512212-1512400 file-local
/**
 * 把 userContext（# 键 值）包进 system-reminder 作为第一条 meta 用户消息（userContextReminder）。
 */
function prependUserContextReminder(messages, context) {
  if (Object.entries(context).length === 0) return messages;
  return [
    {
      ...createUserMessage({
        content:
          USER_CONTEXT_PREFIX +
          Object.entries(context).map(
            ([key, value]) => `# ${key}
${value}`,
          ).join(`
`) +
          USER_CONTEXT_SUFFIX,
        isMeta: true,
      }),
      userContextReminder: true,
    },
    ...messages,
  ];
}
//@ chunk-e6aww6q8.js:1512400-1514113 fingerprint = logContextMetrics (0.709)
/**
 * 统计并上报上下文规模：MCP 工具数/服务器数/schema token、CLAUDE.md 大小、git 状态等（tengu_context_size 一类事件）。
 */
async function logContextMetrics(rootSession, n, toolPermissionContext, getTools, h, y) {
  if (isFirstPartyTelemetryBlocked()) return;
  let S;
  if (!getIsNonInteractiveSession()) await withTimeout(rootSession);
  else if (env.CLAUDE_CODE_REMOTE) {
    S = await waitForFirstRequest(rootSession);
    await hasRequestBeenSent(rootSession);
    await sleep(0, undefined, {
      unref: true,
    });
  }
  let w = () => {
    if (Object.keys(n).length === 0)
      return Promise.resolve({
        tools: [],
      });
    try {
      let { prefetchAllMcpResources } = require("./chunk-asne9cp8.js").mcpClientModule();
      return prefetchAllMcpResources(n, h, y);
    } catch (error) {
      logError(error);
      return Promise.resolve({
        tools: [],
      });
    }
  };
  let [{ tools: mcpTools }, tools, userContext, systemContext] = await Promise.all([
    S
      ? {
          tools: S.tools.filter((tool) => tool.isMcp),
        }
      : w(),
    S ? S.tools : getTools(toolPermissionContext),
    getOrBuildUserContext(rootSession, h, y),
    getGitStatusPrefetch(rootSession),
  ]);
  let gitStatusSize = systemContext?.length ?? 0;
  let claudeMdSize = userContext.claudeMd?.length ?? 0;
  let totalContextSize = gitStatusSize + claudeMdSize;
  let projectFileCountRounded;
  if (!env.CLAUDE_CODE_REMOTE) {
    let currentDir = getCwd();
    projectFileCountRounded = await countFilesRounded(
      currentDir,
      AbortSignal.timeout(1000),
      normalizePatternsToPath(getFileReadIgnorePatterns(toolPermissionContext), currentDir),
    );
  }
  let mcpToolsCount = 0;
  let mcpServersCount = 0;
  let mcpToolsTokens = 0;
  let nonMcpToolsCount = 0;
  let nonMcpToolsTokens = 0;
  let nonMcpTools = tools.filter((tool) => !tool.isMcp);
  mcpToolsCount = mcpTools.length;
  nonMcpToolsCount = nonMcpTools.length;
  let serverNames = new Set();
  for (let tool of mcpTools) {
    let parts = tool.name.split("__");
    if (parts.length >= 3 && parts[1]) serverNames.add(parts[1]);
  }
  mcpServersCount = serverNames.size;
  let toolSchemaSerializer = getToolSchemaSerializer();
  for (let tool of mcpTools) {
    let qt =
      "inputJSONSchema" in tool && tool.inputJSONSchema
        ? tool.inputJSONSchema
        : toolInputJsonSchema(tool.inputSchema);
    mcpToolsTokens += roughTokenCountEstimation(toolSchemaSerializer.schemaText(qt));
  }
  let pt = nonMcpTools.some(isArtifactFamilyTool) && !(await isArtifactRosterSettled(30000));
  let { schemasSentFromRecord, entriesBuilt } = toolSchemaSerializer;
  let gt = deferredToolCache();
  let At = false;
  for (let tool of nonMcpTools) {
    if (pt && isArtifactFamilyTool(tool)) continue;
    let Yt =
      "inputJSONSchema" in tool && tool.inputJSONSchema
        ? tool.inputJSONSchema
        : (schemasSentFromRecord.get(tool.name) ?? gt.splicedInputSchema(tool.name));
    if (Yt === undefined && S !== undefined && !entriesBuilt.has(tool.name)) {
      At = true;
      continue;
    }
    nonMcpToolsTokens += roughTokenCountEstimation(
      toolSchemaSerializer.schemaText(Yt ?? toolInputJsonSchema(tool.inputSchema)),
    );
  }
  logEvent("tengu_context_size", {
    git_status_size: gitStatusSize,
    claude_md_size: claudeMdSize,
    has_user_email: Boolean(userContext.userEmail),
    total_context_size: totalContextSize,
    project_file_count_rounded: projectFileCountRounded,
    mcp_tools_count: mcpToolsCount,
    mcp_servers_count: mcpServersCount,
    mcp_tools_tokens: mcpToolsTokens,
    non_mcp_tools_count: nonMcpToolsCount,
    non_mcp_tools_tokens: nonMcpToolsTokens,
    ...(pt && {
      non_mcp_tools_tokens_excludes_artifact: true,
    }),
    ...(At && {
      non_mcp_tools_tokens_excludes_unsent: true,
    }),
  });
}
//@ chunk-e6aww6q8.js:1514113-1516097 fingerprint = normalizeToolInput (0.518)
/**
 * 工具输入规整：Read.offset 字符串转数字；ExitPlanMode 补计划文件路径；Bash 去掉 cwd 前缀、修正转义；其他工具按各自规则。
 */
function normalizeToolInput_2(e, n, agentId, storageV5) {
  switch (e.name) {
    case FILE_READ_TOOL_NAME: {
      try {
        if (n === null || typeof n !== "object") return n;
        let h = n;
        let plan = coerceNumberString(h.offset);
        if (typeof h.offset === "string" && typeof plan === "number")
          return {
            ...h,
            offset: plan,
          };
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
      let planFilePath = getPlanWithPath(agentId);
      chainPlanSnapshot(storageV5);
      return planFilePath !== null
        ? {
            ...n,
            ...planFilePath,
          }
        : n;
    }
    case BashTool.name: {
      let parsed = BashTool.inputSchema.parse(n);
      let { command, timeout, description } = parsed;
      let L = isRemoteOnlyCheck(e.name) ? null : getCwd();
      let normalizedCommand =
        L === null
          ? command
          : stripCdPrefix(command, getPlatform() === "windows" ? [L, windowsPathToPosixPath(L)] : [L])
              .command;
      normalizedCommand = normalizedCommand.replaceAll("\\\\;", "\\;");
      if (/^echo\s+["']?[^|&;><]*["']?$/i.test(normalizedCommand.trim()))
        logEvent("tengu_bash_tool_simple_echo", {});
      let run_in_background = "run_in_background" in parsed ? parsed.run_in_background : undefined;
      return {
        command: normalizedCommand,
        description,
        ...(timeout !== undefined && {
          timeout,
        }),
        ...(description !== undefined && {
          description,
        }),
        ...(run_in_background !== undefined && {
          run_in_background,
        }),
        ...("dangerouslyDisableSandbox" in parsed &&
          parsed.dangerouslyDisableSandbox !== undefined && {
            dangerouslyDisableSandbox: parsed.dangerouslyDisableSandbox,
          }),
        ...false,
        ...(canRunToolsOnThisMachine() &&
          HOST_TOOL_INPUT_FIELD in parsed &&
          parsed[HOST_TOOL_INPUT_FIELD] !== undefined && {
            [HOST_TOOL_INPUT_FIELD]: parsed[HOST_TOOL_INPUT_FIELD],
          }),
        ...("allowed_domains" in parsed &&
          parsed.allowed_domains !== undefined && {
            allowed_domains: parsed.allowed_domains,
          }),
      };
    }
    case FileEditTool.name: {
      let y = {
        ...n,
      };
      if ("old_str" in y) {
        if (!("old_string" in y)) y.old_string = y.old_str;
        delete y.old_str;
      }
      if ("new_str" in y) {
        if (!("new_string" in y)) y.new_string = y.new_str;
        delete y.new_str;
      }
      let parsedInput = FileEditTool.inputSchema.parse(y);
      let w = {
        file_path: parsedInput.file_path,
        edits: [
          {
            old_string: parsedInput.old_string,
            new_string: parsedInput.new_string,
            replace_all: parsedInput.replace_all,
          },
        ],
      };
      let { file_path: filePath, edits } =
        isRemoteOnlyCheck(e.name) || (canRunToolsOnThisMachine() && hasHostField(parsedInput))
          ? {
              ...w,
              edits: w.edits.map((edit) =>
                isMarkdownPath(w.file_path)
                  ? edit
                  : {
                      ...edit,
                      new_string: stripTrailingWhitespace(edit.new_string),
                    },
              ),
            }
          : normalizeFileEditInput(w);
      return {
        replace_all: edits[0].replace_all,
        file_path: filePath,
        old_string: edits[0].old_string,
        new_string: edits[0].new_string,
        ...(canRunToolsOnThisMachine() &&
          HOST_TOOL_INPUT_FIELD in parsedInput &&
          parsedInput[HOST_TOOL_INPUT_FIELD] !== undefined && {
            [HOST_TOOL_INPUT_FIELD]: parsedInput[HOST_TOOL_INPUT_FIELD],
          }),
      };
    }
    case FileWriteTool.name: {
      let h = FileWriteTool.inputSchema.safeParse(n);
      if (!h.success) return n;
      let isMarkdown = isMarkdownPath(h.data.file_path);
      return {
        file_path: h.data.file_path,
        content: isMarkdown ? h.data.content : stripTrailingWhitespace(h.data.content),
        ...(canRunToolsOnThisMachine() &&
          HOST_TOOL_INPUT_FIELD in h.data &&
          h.data[HOST_TOOL_INPUT_FIELD] !== undefined && {
            [HOST_TOOL_INPUT_FIELD]: h.data[HOST_TOOL_INPUT_FIELD],
          }),
      };
    }
    default:
      return n;
  }
}
//@ chunk-e6aww6q8.js:1516097-1516362 placement
/**
 * 规范化写入记录的工具输入：ExitPlanMode 附计划内容，多处编辑的 Edit 去掉单编辑字段，SendMessage 做专门转换。
 */
function normalizeToolInputForRecord(e, n, r = true) {
  switch (e) {
    case EXITPLANMODE_2: {
      if (r && n && typeof n === "object") return stripHostOwnedInputKeys(e, n);
      return n;
    }
    case FileEditTool.name: {
      if (r && n && typeof n === "object" && "edits" in n) {
        let { old_string: oldString, new_string: newString, replace_all: replaceAll, ...S } = n;
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
//@ chunk-e6aww6q8.js:1516370-1516544 placement
/**
 * 预先为配置了工具描述钩子的工具各运行一次描述钩子，失败只记日志。
 */
async function prefetchToolDescribeHooks(tools, n) {
  try {
    if (!isToolDescribeHooked()) return;
    await Promise.all(
      tools
        .filter((r) => isToolDescribeHookedForBuild(r.name))
        .map((r) =>
          describedOnce(r.name, () =>
            n(r).then(
              () => {
                return;
              },
              (error) => {
                logError(toError(error));
              },
            ),
          ),
        ),
    );
  } catch (error) {
    logError(toError(error));
  }
}
//@ chunk-e6aww6q8.js:1516544-1516687 placement
/**
 * 判断 stellar drift 功能是否开启：环境变量优先，特定环境强制开启，第一方 API 后端按会话固定开关。
 */
function isStellarDriftEnabled() {
  let CLAUDE_CODE_STELLAR_DRIFT = env.CLAUDE_CODE_STELLAR_DRIFT;
  if (CLAUDE_CODE_STELLAR_DRIFT !== undefined) return CLAUDE_CODE_STELLAR_DRIFT;
  if (isTetherEnvOptIn()) return true;
  if (!isFirstPartyApiBackend()) return false;
  return getFeatureValue_SESSION_PINNED("tengu_stellar_drift", false);
}
//@ chunk-w5ndchqs.js:3633-3859 fingerprint = logAPIPrefix (0.752)
/**
 * 记录 system 第一块（计费头）的长度与哈希（tengu_sysprompt_block）。
 */
function logAPIPrefix(systemPrompt) {
  try {
    let [firstSyspromptBlock] = splitSysPromptPrefix(systemPrompt, {
      skipTelemetry: true,
    });
    let firstSystemPrompt = firstSyspromptBlock?.text;
    logEvent("tengu_sysprompt_block", {
      length: firstSystemPrompt?.length ?? 0,
      hash: firstSystemPrompt
        ? sanitizeMarkName(createHash("sha256").update(firstSystemPrompt).digest("hex"))
        : lit(""),
    });
  } catch (error) {
    logError(withTelemetryMessage(toError(error), "system prompt block telemetry failed"));
  }
}
//@ chunk-w5ndchqs.js:3859-5496 fingerprint = splitSysPromptPrefix (0.969)
/**
 * system 提示词数组切块（buildSystemPromptBlocks 的基础）：计费头 x-anthropic-billing-header 一块（无缓存），身份行一块，"# Reporting outcomes" 段单独一块；有 __SYSTEM_PROMPT_DYNAMIC_BOUNDARY__ 且 scope 可用时边界前为静态块（scope global，可按 STATIC_BREAKPOINT 再切）、边界后为动态块；否则其余合成一块（org）。实测第三方 3 块、第一方 4 块。
 */
function splitSysPromptPrefix(systemPrompt, options) {
  let useGlobalCacheFeature = shouldUseGlobalCacheScope();
  let index = systemPrompt.findIndex((x) => x === SYSTEM_PROMPT_DYNAMIC_BOUNDARY);
  if (useGlobalCacheFeature && options?.skipGlobalCacheForSystemPrompt && index === -1) {
    if (!options?.skipTelemetry)
      logEvent("tengu_sysprompt_using_tool_based_cache", {
        promptBlockCount: systemPrompt.length,
      });
    let attributionHeader;
    let R;
    let U;
    let rest = [];
    for (let prompt of systemPrompt) {
      if (!prompt) continue;
      if (prompt === SYSTEM_PROMPT_DYNAMIC_BOUNDARY) continue;
      if (prompt.startsWith(X_ANTHROPIC_BILLING_HEADER)) attributionHeader = prompt;
      else if (CLI_SYSPROMPT_PREFIX_SET.has(prompt)) R = prompt;
      else if (prompt === REPORTING_OUTCOMES_SECTION) U = prompt;
      else rest.push(prompt);
    }
    let result = [];
    if (attributionHeader)
      result.push({
        text: attributionHeader,
        cacheScope: null,
      });
    if (R)
      result.push({
        text: R,
        cacheScope: "org",
      });
    if (U && attributionHeader && R)
      result.push({
        text: U,
        cacheScope: null,
      });
    let restJoined = rest.join(`

`);
    if (restJoined)
      result.push({
        text: restJoined,
        cacheScope: "org",
      });
    return result;
  }
  if (useGlobalCacheFeature) {
    if (index !== -1) {
      let attributionHeader;
      let R;
      let U;
      let staticBlocks = [];
      let dynamicBlocks = [];
      for (let i = 0; i < systemPrompt.length; i++) {
        let block = systemPrompt[i];
        if (!block || block === SYSTEM_PROMPT_DYNAMIC_BOUNDARY) continue;
        if (block.startsWith(X_ANTHROPIC_BILLING_HEADER)) attributionHeader = block;
        else if (CLI_SYSPROMPT_PREFIX_SET.has(block)) R = block;
        else if (block === REPORTING_OUTCOMES_SECTION) U = block;
        else if (i < index) staticBlocks.push(block);
        else dynamicBlocks.push(block);
      }
      let result = [];
      if (attributionHeader)
        result.push({
          text: attributionHeader,
          cacheScope: null,
        });
      if (R)
        result.push({
          text: R,
          cacheScope: null,
        });
      if (U && attributionHeader && R)
        result.push({
          text: U,
          cacheScope: null,
        });
      let joined = staticBlocks.join(`

`);
      let O = joined ? splitAtStaticBreakpoint(joined) : [];
      for (let text of O)
        result.push({
          text,
          cacheScope: "global",
        });
      let dynamicJoined = dynamicBlocks.join(`

`);
      if (dynamicJoined)
        result.push({
          text: dynamicJoined,
          cacheScope: O.length > 1 ? null : "org",
        });
      if (!options?.skipTelemetry)
        logEvent("tengu_sysprompt_boundary_found", {
          blockCount: result.length,
          staticBlockLength: joined.length,
          dynamicBlockLength: dynamicJoined.length,
        });
      return result;
    } else if (!options?.skipTelemetry)
      logEvent("tengu_sysprompt_missing_boundary_marker", {
        promptBlockCount: systemPrompt.length,
      });
  }
  let attributionHeader;
  let m;
  let h;
  let rest = [];
  for (let [x, R] of systemPrompt.entries()) {
    if (!R || R === SYSTEM_PROMPT_DYNAMIC_BOUNDARY) continue;
    if (R.startsWith(X_ANTHROPIC_BILLING_HEADER)) attributionHeader = R;
    else if (CLI_SYSPROMPT_PREFIX_SET.has(R)) m = R;
    else if (R === REPORTING_OUTCOMES_SECTION) h = R;
    else rest.push(x < index ? splitAtStaticBreakpoint(R).join("") : R);
  }
  let result = [];
  if (attributionHeader)
    result.push({
      text: attributionHeader,
      cacheScope: null,
    });
  if (m)
    result.push({
      text: m,
      cacheScope: "org",
    });
  if (h && attributionHeader && m)
    result.push({
      text: h,
      cacheScope: null,
    });
  let restJoined = rest.join(`

`);
  if (restJoined)
    result.push({
      text: restJoined,
      cacheScope: "org",
    });
  return result;
}
export {
  applyPromptAblation,
  normalizeToolInput_2,
  normalizeToolInputForRecord,
  querySourceHints,
  waitForGate,
  commitGate,
  hasRequestBeenSent,
  startFirstRequestGate,
  isStellarDriftEnabled,
  prefetchToolDescribeHooks,
  toolToApiDefinition,
  shouldEnableWebSearchCitations,
  isNotLegacyClaude3,
  markRootRequestSent,
  splitSysPromptPrefix,
  logAPIPrefix,
  logContextMetrics,
  withTimeout,
  appendSystemContextToPrompt,
  prependUserContextReminder,
  API_STRIPPED_INPUT_FIELDS,
  schemaPropertiesMap,
  schemaEnumValues,
  withPlanPath,
  getToolListingHash,
  buildToolListingEntries,
  chainPlanSnapshot,
};
