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
import { createHash } from "crypto";
import { isDeepStrictEqual } from "util";
import { logEvent } from "../services/analytics/index.js";
import { sanitizeMarkName } from "./startupMarks.js";
import { lit } from "../services/analytics/safeMetadata.js";
import { logError } from "./log.js";
import { withTelemetryMessage, toError, languageErrorNameOf } from "./errors.js";
import {
  shouldUseGlobalCacheScope,
  areExperimentalBetasDisabled,
  willSendStructuredOutputsBeta,
} from "./betas.js";
import { SYSTEM_PROMPT_DYNAMIC_BOUNDARY } from "../entrypoints/sdk/coreSchemas.js";
import {
  X_ANTHROPIC_BILLING_HEADER,
  REPORTING_OUTCOMES_SECTION,
} from "../services/api/promptCacheBreakDetection.js";
import { CLI_SYSPROMPT_PREFIX_SET } from "../constants/system.js";
import { splitAtStaticBreakpoint } from "./systemPromptBoundary.js";
import { EXITPLANMODE_2 } from "../tools/ExitPlanModeTool/constants.js";
import { SessionRootSlot } from "../bootstrap/sessionSlices.js";
import { sleep } from "./sleep.js";
import { getRootSession, getIsNonInteractiveSession } from "../bootstrap/state.js";
import { isPlainObject as isPlainObject_5 } from "./isPlainObject.js";
import { import_mapValues } from "../../vendor/lodash-es/_inlinedHelpers.js";
import { count } from "./collections.js";
import { planFiles, persistFileSnapshotIfRemote, getPlanWithPath } from "./plans.js";
import { isUnparsedInputMarker } from "./json.js";
import { stripHostOwnedInputKeys } from "./permissions/permissionAnswer.js";
import { isAutoModeQuerySource } from "../services/api/requestHeaders.js";
import { getSessionFeatureValues } from "../bootstrap/sessionFeatureValues.js";
import { loadPromptRemovalConfig, logPromptStringsRemoval } from "./promptAblation.js";
import { getCanonicalName } from "./model/canonicalModelName.js";
import { env } from "./env.js";
import {
  isFirstPartyApiBackend,
  isFirstPartyAnthropicBaseUrl,
  isGenuineBedrockEndpoint,
  getAPIProvider,
} from "./model/providers.js";
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
import { coerceNumberString } from "../tools/ArtifactTool/publishEdits.js";
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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-w5ndchqs.js:3633-3859 fingerprint (2.1.88 match: logAPIPrefix, 0.752)
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
//@ chunk-w5ndchqs.js:3859-5496 fingerprint (2.1.88 match: splitSysPromptPrefix, 0.969)
/**
 * system 提示词数组切块（buildSystemPromptBlocks 的基础）：计费头 x-anthropic-billing-header 一块（无缓存），身份行一块，"# Reporting outcomes" 段单独一块；有 __SYSTEM_PROMPT_DYNAMIC_BOUNDARY__ 且 scope 可用时边界前为静态块（scope global，可按 STATIC_BREAKPOINT 再切）、边界后为动态块；否则其余合成一块（org）。实测第三方 3 块、第一方 4 块。
 */
function splitSysPromptPrefix(systemPrompt, options) {
  let useGlobalCacheFeature = shouldUseGlobalCacheScope();
  let index = systemPrompt.findIndex((block) => block === SYSTEM_PROMPT_DYNAMIC_BOUNDARY);
  if (useGlobalCacheFeature && options?.skipGlobalCacheForSystemPrompt && index === -1) {
    if (!options?.skipTelemetry)
      logEvent("tengu_sysprompt_using_tool_based_cache", {
        promptBlockCount: systemPrompt.length,
      });
    let attributionHeader;
    let cliPrefix;
    let outcomesSection;
    let rest = [];
    for (let prompt of systemPrompt) {
      if (!prompt) continue;
      if (prompt === SYSTEM_PROMPT_DYNAMIC_BOUNDARY) continue;
      if (prompt.startsWith(X_ANTHROPIC_BILLING_HEADER)) attributionHeader = prompt;
      else if (CLI_SYSPROMPT_PREFIX_SET.has(prompt)) cliPrefix = prompt;
      else if (prompt === REPORTING_OUTCOMES_SECTION) outcomesSection = prompt;
      else rest.push(prompt);
    }
    let result = [];
    if (attributionHeader)
      result.push({
        text: attributionHeader,
        cacheScope: null,
      });
    if (cliPrefix)
      result.push({
        text: cliPrefix,
        cacheScope: "org",
      });
    if (outcomesSection && attributionHeader && cliPrefix)
      result.push({
        text: outcomesSection,
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
      let cliPrefix;
      let outcomesSection;
      let staticBlocks = [];
      let dynamicBlocks = [];
      for (let i = 0; i < systemPrompt.length; i++) {
        let block = systemPrompt[i];
        if (!block || block === SYSTEM_PROMPT_DYNAMIC_BOUNDARY) continue;
        if (block.startsWith(X_ANTHROPIC_BILLING_HEADER)) attributionHeader = block;
        else if (CLI_SYSPROMPT_PREFIX_SET.has(block)) cliPrefix = block;
        else if (block === REPORTING_OUTCOMES_SECTION) outcomesSection = block;
        else if (i < index) staticBlocks.push(block);
        else dynamicBlocks.push(block);
      }
      let result = [];
      if (attributionHeader)
        result.push({
          text: attributionHeader,
          cacheScope: null,
        });
      if (cliPrefix)
        result.push({
          text: cliPrefix,
          cacheScope: null,
        });
      if (outcomesSection && attributionHeader && cliPrefix)
        result.push({
          text: outcomesSection,
          cacheScope: null,
        });
      let prompt = staticBlocks.join(`

`);
      let staticChunks = prompt ? splitAtStaticBreakpoint(prompt) : [];
      for (let text of staticChunks)
        result.push({
          text,
          cacheScope: "global",
        });
      let dynamicJoined = dynamicBlocks.join(`

`);
      if (dynamicJoined)
        result.push({
          text: dynamicJoined,
          cacheScope: staticChunks.length > 1 ? null : "org",
        });
      if (!options?.skipTelemetry)
        logEvent("tengu_sysprompt_boundary_found", {
          blockCount: result.length,
          staticBlockLength: prompt.length,
          dynamicBlockLength: dynamicJoined.length,
        });
      return result;
    } else if (!options?.skipTelemetry)
      logEvent("tengu_sysprompt_missing_boundary_marker", {
        promptBlockCount: systemPrompt.length,
      });
  }
  let attributionHeader;
  let cliPrefix;
  let outcomesSection;
  let rest = [];
  for (let [blockIndex, block] of systemPrompt.entries()) {
    if (!block || block === SYSTEM_PROMPT_DYNAMIC_BOUNDARY) continue;
    if (block.startsWith(X_ANTHROPIC_BILLING_HEADER)) attributionHeader = block;
    else if (CLI_SYSPROMPT_PREFIX_SET.has(block)) cliPrefix = block;
    else if (block === REPORTING_OUTCOMES_SECTION) outcomesSection = block;
    else rest.push(blockIndex < index ? splitAtStaticBreakpoint(block).join("") : block);
  }
  let result = [];
  if (attributionHeader)
    result.push({
      text: attributionHeader,
      cacheScope: null,
    });
  if (cliPrefix)
    result.push({
      text: cliPrefix,
      cacheScope: "org",
    });
  if (outcomesSection && attributionHeader && cliPrefix)
    result.push({
      text: outcomesSection,
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
//@ chunk-e6aww6q8.js:861006-861063 fingerprint (2.1.88 match: normalizeToolInputForAPI, 0.524)
/**
 * 发回 API 前要从工具输入里去掉的字段：ExitPlanMode 的 plan/planFilePath。旧版名 normalizeToolInputForAPI 不准确。
 */
var API_STRIPPED_INPUT_FIELDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:861006", () => {
  API_STRIPPED_INPUT_FIELDS = new Map([[EXITPLANMODE_2, new Set(["plan", "planFilePath"])]]);
});
//@ chunk-e6aww6q8.js:1423789-1423895 placement
/**
 * 按会话根保存“首个请求”的等待门（promise、resolve 与是否已提交）。
 */
var SLEEP_GATE_TIMEOUT_MS; // deferred: uses SessionRootSlot (../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
var firstRequestGateByRoot;
deferInit("chunk-e6aww6q8.js:1423789", () => {
  SLEEP_GATE_TIMEOUT_MS = 1e4;
  firstRequestGateByRoot = new SessionRootSlot(() => {
    let resolve = () => {};
    return {
      promise: new Promise((resolve_2) => {
        resolve = resolve_2;
      }),
      resolve,
      committed: false,
    };
  });
});
//@ chunk-e6aww6q8.js:1423895-1423936 placement
function waitForGate(sessionRoot) {
  return firstRequestGateByRoot.of(sessionRoot).promise;
}
//@ chunk-e6aww6q8.js:1423936-1424007 placement (2.1.88 match: withTimeout, 0.805)
function withTimeout(sessionRoot) {
  return Promise.race([
    waitForGate(sessionRoot),
    sleep(SLEEP_GATE_TIMEOUT_MS, undefined, {
      unref: true,
    }),
  ]);
}
//@ chunk-e6aww6q8.js:1424007-1424066 placement
function commitGate(session) {
  let gate = firstRequestGateByRoot.of(session);
  gate.committed = true;
  gate.resolve();
}
//@ chunk-e6aww6q8.js:1424066-1424237 placement
var firstRequestGate; // deferred: uses SessionRootSlot (../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:1424066", () => {
  firstRequestGate = new SessionRootSlot(() => {
    let resolve = (resolveGate) => {};
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
});
//@ chunk-e6aww6q8.js:1424237-1424278 placement
/**
 * 等待首个请求开始（返回门上的 promise）。
 */
function waitForFirstRequest(sessionRoot) {
  return firstRequestGate.of(sessionRoot).promise;
}
//@ chunk-e6aww6q8.js:1424278-1424366 placement
/**
 * 标记首个请求已开始并放行工具列表。
 */
function startFirstRequestGate(session, tools) {
  let gate = firstRequestGate.of(session);
  if (gate.started) return;
  gate.started = true;
  gate.resolve({
    tools,
  });
}
//@ chunk-e6aww6q8.js:1424366-1424411 placement
/**
 * 请求是否已经发出。
 */
function hasRequestBeenSent(sessionRoot) {
  return firstRequestGate.of(sessionRoot).requestSent;
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
var SCHEMA_TEXT_KEYS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SCHEMA_MAP_KEYS;
var SCHEMA_SET_KEYS;
deferInit("chunk-e6aww6q8.js:1500608", () => {
  SCHEMA_TEXT_KEYS = new Set([
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
  SCHEMA_MAP_KEYS = new Set(["properties", "patternProperties", "$defs", "definitions", "dependentSchemas"]);
  SCHEMA_SET_KEYS = new Set(["enum", "const", "required", "dependentRequired"]);
});
//@ chunk-e6aww6q8.js:1500877-1501163 placement
/**
 * 递归规范化 JSON schema 以便比较：去掉描述/标题/示例等说明性键，对 enum/required 等字符串数组排序。
 */
function normalizeSchemaForCompare(value) {
  if (Array.isArray(value)) return value.map(normalizeSchemaForCompare);
  if (!isPlainObject_5(value)) return value;
  let normalized = {};
  for (let [key, value_2] of Object.entries(value)) {
    if (SCHEMA_TEXT_KEYS.has(key)) continue;
    if (SCHEMA_SET_KEYS.has(key))
      normalized[key] =
        Array.isArray(value_2) && value_2.every((item) => typeof item === "string")
          ? value_2.toSorted()
          : value_2;
    else if (SCHEMA_MAP_KEYS.has(key) && isPlainObject_5(value_2))
      normalized[key] = import_mapValues(value_2, normalizeSchemaForCompare);
    else normalized[key] = normalizeSchemaForCompare(value_2);
  }
  return normalized;
}
//@ chunk-e6aww6q8.js:1501163-1501252 placement
/**
 * 把 schema 的 properties 转成 Map。
 */
function schemaPropertiesMap(schema) {
  let properties = isPlainObject_5(schema) ? schema.properties : undefined;
  return new Map(isPlainObject_5(properties) ? Object.entries(properties) : []);
}
//@ chunk-e6aww6q8.js:1501252-1501326 placement
/**
 * 取出 schema 的 enum 数组。
 */
function schemaEnumValues(schema) {
  let enumValues = isPlainObject_5(schema) ? schema.enum : undefined;
  return Array.isArray(enumValues) ? enumValues : undefined;
}
//@ chunk-e6aww6q8.js:1501326-1501518 placement
function countMissingSchemaParts(currentSchema, previousSchema) {
  let previousProperties = schemaPropertiesMap(previousSchema);
  let missingCount = 0;
  for (let [propertyName, propertySchema] of schemaPropertiesMap(currentSchema)) {
    if (!previousProperties.has(propertyName)) {
      missingCount += 1;
      continue;
    }
    let enumValues = schemaEnumValues(propertySchema);
    let previousEnumValues = schemaEnumValues(previousProperties.get(propertyName));
    if (enumValues !== undefined && previousEnumValues !== undefined) {
      let previousValues = new Set(previousEnumValues);
      missingCount += count(enumValues, (value) => !previousValues.has(value));
    }
  }
  return missingCount;
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
function chainPlanSnapshot(message) {
  let chained = planFiles()
    .snapshotChain.then(() => persistFileSnapshotIfRemote(message))
    .catch(() => {});
  planFiles().snapshotChain = chained;
  return chained;
}
//@ chunk-e6aww6q8.js:1502377-1502484 placement
/**
 * ExitPlanMode 工具输入中补上计划内容与计划文件路径。
 */
function withPlanPath(name, input, agentId) {
  if (name !== EXITPLANMODE_2 || !isPlainObject_5(input) || isUnparsedInputMarker(input)) return input;
  let strippedInput = stripHostOwnedInputKeys(name, input);
  let planWithPath = getPlanWithPath(agentId);
  return planWithPath !== null
    ? {
        ...strippedInput,
        ...planWithPath,
      }
    : strippedInput;
}
//@ chunk-e6aww6q8.js:1503098-1503390 placement
/**
 * 对系统提示词片段做实验性"消融"：删除配置里列出的字符串（首次命中时记录）；自动模式查询与动态边界标记不处理；出错时记录并原样返回。
 */
function applyPromptAblation(text, querySource) {
  if (isAutoModeQuerySource(querySource) || text === SYSTEM_PROMPT_DYNAMIC_BOUNDARY) return text;
  let sessionFeatureValues = getSessionFeatureValues();
  try {
    let ablationConfig = (sessionFeatureValues.promptAblation ??= loadPromptRemovalConfig());
    let result = text;
    for (let string of ablationConfig.strings) {
      if (!result.includes(string)) continue;
      result = result.replaceAll(string, "");
      if (!ablationConfig.matched.has(string)) {
        ablationConfig.matched.add(string);
        logPromptStringsRemoval(ablationConfig);
      }
    }
    return result;
  } catch (error) {
    sessionFeatureValues.promptAblation ??= {
      strings: [],
      matched: new Set(),
    };
    logError(error);
    return text;
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
function isNotLegacyClaude3(model) {
  return !LEGACY_CLAUDE3_MODELS.includes(getCanonicalName(model));
}
//@ chunk-e6aww6q8.js:1503494-1503586 placement
/**
 * 是否给 WebSearch 工具开启 citations（需环境变量、首方后端且非实验 beta）。
 */
function shouldEnableWebSearchCitations(model) {
  return (
    env.CLAUDE_CODE_WEBSEARCH_CITATIONS &&
    isFirstPartyApiBackend() &&
    !areExperimentalBetasDisabled() &&
    (model === undefined || isNotLegacyClaude3(model))
  );
}
//@ chunk-e6aww6q8.js:1503586-1503822 callgraph-fingerprint (2.1.88 match: toolToAPISchema, 0.215)
/**
 * 工具输入 schema：inputJSONSchema 或 zod 转换；非 swarm 时去掉 swarm 字段；支持远程执行且未转发时去掉远程执行字段（含条目数组内）。
 */
function toolToAPISchema(tool, { remoteToolForwarding }) {
  let schema =
    "inputJSONSchema" in tool && tool.inputJSONSchema
      ? tool.inputJSONSchema
      : toolInputJsonSchema(tool.inputSchema);
  if (!isAgentSwarmsEnabled()) schema = omitSwarmFields(tool.name, schema);
  if (getToolRemoteExecution(tool).supported && !remoteToolForwarding) {
    schema = omitSchemaProperties(schema, [HOST_TOOL_INPUT_FIELD]);
    if (isMultiEntryAliasTool(tool))
      schema = omitArrayItemProperties(schema, tool.entryFieldName, [HOST_TOOL_INPUT_FIELD]);
  }
  return schema;
}
//@ chunk-e6aww6q8.js:1503822-1503892 layout
/**
 * 有工具支持远程执行且远程工具服务可用。
 */
async function shouldForwardRemoteTools(tools) {
  return (
    tools.some((tool) => getToolRemoteExecution(tool).supported) && (await isRemoteToolForwardingEnabled())
  );
}
//@ chunk-e6aww6q8.js:1503892-1503981 fingerprint (2.1.88 match: SWARM_FIELDS_BY_TOOL, 1)
/**
 * 关闭 swarm 时从 schema 去掉的字段：ExitPlanMode 的 launchSwarm/teammateCount，Agent 的 name/team_name/mode。
 */
var SWARM_FIELDS_BY_TOOL; // deferred: uses AGENT (../tools/AgentTool/constants.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:1503892", () => {
  SWARM_FIELDS_BY_TOOL = new Map([
    [EXITPLANMODE_2, ["launchSwarm", "teammateCount"]],
    [AGENT, ["name", "team_name", "mode"]],
  ]);
});
//@ chunk-e6aww6q8.js:1503981-1504145 layout
/**
 * 从 schema.properties 删掉指定字段。
 */
function omitSchemaProperties(schema, propertyNames) {
  if (propertyNames.length === 0) return schema;
  let properties = schema.properties;
  if (!properties || typeof properties !== "object") return schema;
  let remainingProperties = {
    ...properties,
  };
  for (let propertyName of propertyNames) delete remainingProperties[propertyName];
  return {
    ...schema,
    properties: remainingProperties,
  };
}
//@ chunk-e6aww6q8.js:1504145-1504497 layout
/**
 * 从某个数组字段的 items.properties 删掉指定字段。
 */
function omitArrayItemProperties(schema, entryFieldName, propertyNames) {
  let properties = schema.properties;
  if (!properties || typeof properties !== "object" || !(entryFieldName in properties)) return schema;
  let entrySchema = properties[entryFieldName];
  if (!entrySchema || typeof entrySchema !== "object" || !("items" in entrySchema)) return schema;
  let items = entrySchema.items;
  if (!items || typeof items !== "object" || !("properties" in items)) return schema;
  let itemSchema = omitSchemaProperties(
    {
      type: "object",
      properties: items.properties,
    },
    propertyNames,
  );
  return {
    ...schema,
    properties: {
      ...properties,
      [entryFieldName]: {
        ...entrySchema,
        items: {
          ...items,
          properties: itemSchema.properties,
        },
      },
    },
  };
}
//@ chunk-e6aww6q8.js:1504497-1504544 layout
/**
 * 按工具名去掉 SWARM_FIELDS_BY_TOOL 中的字段。
 */
function omitSwarmFields(name, schema) {
  return omitSchemaProperties(schema, SWARM_FIELDS_BY_TOOL.get(name) ?? []);
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
//@ chunk-e6aww6q8.js:1504581-1504801 layout (2.1.88 match: calculateDeferredToolDescriptionChars, 0.871)
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
async function buildToolListingEntries(tools, getToolPermissionContext, model, agents, querySource) {
  let buildDefinition = toolDefinitionBuilder;
  if (buildDefinition === null) return;
  return Promise.all(
    tools.map(async (tool) => {
      let toolListingHash = await getToolListingHash(tool, getToolPermissionContext, agents);
      return {
        name: tool.name,
        listing: toolListingHash,
        definition: await buildDefinition(tool, {
          getToolPermissionContext: agents.getToolPermissionContext,
          tools: getToolPermissionContext,
          agents: agents.agents,
          allowedAgentTypes: agents.allowedAgentTypes,
          model,
          enginePlacement: agents.enginePlacementOf(tool),
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
  noteBuildSkipped(isMcp) {
    if (this.buildSkippedBatch === undefined) {
      let batch = {
        skippedTools: 0,
        skippedMcpTools: 0,
      };
      this.buildSkippedBatch = batch;
      queueMicrotask(() => {
        this.buildSkippedBatch = undefined;
        logFeatureOk("prompt_snapshot_tool_build_skipped", batch);
      });
    }
    this.buildSkippedBatch.skippedTools += 1;
    if (isMcp) this.buildSkippedBatch.skippedMcpTools += 1;
  }
  modelConfig(model) {
    this.canonicalToConfig ??= new Map(
      Object.values(catalogEntriesByFirstPartyId).map((catalogEntry) => [
        getCanonicalName(catalogEntry.firstParty),
        catalogEntry,
      ]),
    );
    return this.canonicalToConfig.get(getCanonicalName(model));
  }
  logStripOnce(stripped) {
    if (this.loggedStrip) return;
    this.loggedStrip = true;
    logForDebugging(
      `[betas] Stripped from tool schemas: [${stripped.join(", ")}] (experimental betas disabled)`,
    );
  }
  schemaKey(schema) {
    let text = this.schemaKeys.get(schema);
    if (text === undefined) {
      text = jsonStringify(schema);
      this.schemaKeys.set(schema, text);
    }
    return text;
  }
  schemaText(schema) {
    return this.schemaKeys.get(schema) ?? jsonStringify(schema);
  }
}
//@ chunk-e6aww6q8.js:1506110-1506137 layout
/**
 * 按 session.host 存放 ToolSchemaSerializer 的懒槽。
 */
var toolSchemaSerializerSlot; // deferred: uses ToolSchemaSerializer of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:1506110", () => {
  toolSchemaSerializerSlot = new HostScoped(() => new ToolSchemaSerializer());
});
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
async function getToolDescriptionText(tool, context) {
  if (!simpleModeEnv()) return tool.prompt(context);
  if (tool.searchHint) return tool.searchHint;
  let descriptionText = await tool.prompt(context);
  return (
    firstLineOf(
      descriptionText,
      `

`,
    ).trim() || descriptionText
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
function compareRecordedToolSchema(
  toolSchemaSerializer,
  toolEntry,
  recordedEntry,
  strictMatches,
  { mcpTool, artifactFamily },
) {
  if (
    recordedEntry.input_schema === toolEntry.input_schema ||
    toolSchemaSerializer.comparedRecordedSchemas.has(toolEntry)
  )
    return;
  toolSchemaSerializer.comparedRecordedSchemas.add(toolEntry);
  let telemetryFields = {
    toolName: sanitizeToolNameForAnalytics(toolEntry.name),
    isMcp: mcpTool,
    isArtifactFamily: artifactFamily,
  };
  if (!strictMatches) {
    logFeatureSad("prompt_snapshot_tool_replay", "strict_mismatch", telemetryFields);
    return;
  }
  try {
    let diffReason = compareToolSchemas(recordedEntry.input_schema, toolEntry.input_schema);
    if (diffReason === "equal") logFeatureOk("prompt_snapshot_tool_replay", telemetryFields);
    else
      logFeatureSad(
        "prompt_snapshot_tool_replay",
        artifactFamily ? SCHEMA_DIFF_REASONS[diffReason] : "schema_differs",
        telemetryFields,
      );
  } catch (error) {
    logError(error);
  }
}
//@ chunk-e6aww6q8.js:1506943-1507182 layout
/**
 * 是否给工具加 eager_input_streaming：CLAUDE_CODE_ENABLE_FINE_GRAINED_TOOL_STREAMING；第一方官方 API 且 tengu_fgts；Vertex/Bedrock 视模型配置。
 */
function isFineGrainedToolStreamingEnabled(provider, eagerInputStreaming) {
  let envOverride = env.CLAUDE_CODE_ENABLE_FINE_GRAINED_TOOL_STREAMING;
  return Boolean(
    envOverride !== false &&
    ((provider === "firstParty" &&
      isFirstPartyAnthropicBaseUrl() &&
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_fgts", false)) ||
      (provider === "vertex" && !env.ANTHROPIC_VERTEX_BASE_URL && eagerInputStreaming?.vertex) ||
      (provider === "bedrock" && isGenuineBedrockEndpoint() && eagerInputStreaming?.bedrock) ||
      envOverride === true),
  );
}
//@ chunk-e6aww6q8.js:1507182-1508019 layout
/**
 * 有可用的提示词快照记录时直接复用记录里的工具描述与 schema（保持缓存前缀不变）。
 */
function tryReuseRecordedToolEntry(tool, options, buildContext) {
  let recordedEntry = options.recordedEntry;
  if (
    !isRemoteNonInteractiveSession() ||
    !isRemoteCowork() ||
    recordedEntry === undefined ||
    options.byValueListing !== undefined
  )
    return;
  if (toolMatchesAnyName(tool, [ARTIFACT_TOOL_NAME_2])) return;
  if (
    !options.withoutToolDescribeHooks &&
    (options.isRedescribed === true || isToolDescribeHookedForBuild(tool.name))
  )
    return;
  if (
    (buildContext.structuredOutputs && (tool.strict === true || Boolean(tool.strictInputJSONSchema))) ||
    recordedEntry.strict === true
  )
    return;
  let description = recordedEntry.description ?? options.recordedDescription;
  if (typeof description !== "string") return;
  let sentFromRecord = toolDescriptionCache_2.getSentFromRecord(buildContext.cacheKey);
  if (sentFromRecord === undefined) {
    if (toolDescriptionCache_2.get(buildContext.cacheKey) !== undefined) return;
    sentFromRecord = {
      eager_input_streaming: isFineGrainedToolStreamingEnabled(
        buildContext.provider,
        buildContext.eagerInputStreaming,
      ),
    };
    toolDescriptionCache_2.setSentFromRecord(buildContext.cacheKey, sentFromRecord);
    if (!options.withoutToolDescribeHooks) recordDeferral(tool.name, undefined);
    buildContext.serializer.schemasSentFromRecord.set(tool.name, recordedEntry.input_schema);
    buildContext.serializer.noteBuildSkipped(tool.isMcp === true);
  }
  return {
    name: tool.name,
    description,
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
async function toolToApiDefinition(tool, options) {
  let provider = getAPIProvider();
  let toolSchemaSerializer = getToolSchemaSerializer();
  let runForQuerySource = (fn) =>
    isAutoModeQuerySource(options.querySource) ? withCatalogSuppressed(fn) : fn();
  let model = options.model;
  let modelEntry =
    model !== undefined ? runForQuerySource(() => toolSchemaSerializer.modelConfig(model)) : undefined;
  let eagerInputStreaming =
    modelEntry?.eagerInputStreaming ??
    (modelEntry === undefined && model !== undefined && (provider === "bedrock" || provider === "vertex")
      ? runForQuerySource(() => statedEagerInputStreaming(model))
      : undefined);
  let promptModel = runForQuerySource(() => getPromptModel(model));
  let isLeanPrompt = runForQuerySource(() => leanPromptFor(promptModel));
  let structuredOutputs =
    model !== undefined && runForQuerySource(() => willSendStructuredOutputsBeta(model));
  let bashFirstTrimmed =
    tool === BashTool && !simpleModeEnv() ? runForQuerySource(() => shouldTrimBashDescription()) : undefined;
  let autoModeKeyBit = isAutoModeQuerySource(options.querySource) ? "K:" : "";
  let leanPromptKeyBit = isLeanPrompt ? "L:" : "";
  let eagerKeyBit =
    (provider === "vertex" && eagerInputStreaming?.vertex) ||
    (provider === "bedrock" && eagerInputStreaming?.bedrock)
      ? "F:"
      : "";
  let skillKeyBit = findToolByName(options.tools, SKILL) ? "S:" : "";
  let structuredOutputsKeyBit = structuredOutputs ? "X:" : "";
  let messagingKeyBit = toolMatchesName(tool, SENDMESSAGE)
    ? isCrossSessionMessagingEnabled()
      ? "C1:"
      : isMessagingLimitedToOwnAgents()
        ? "CL:"
        : "C0:"
    : "";
  let listAgentsKeyBit = toolMatchesName(tool, LISTAGENTS)
    ? hasSendMessageTool(options.tools)
      ? "A1:"
      : "A0:"
    : "";
  let planModeKeyBit =
    toolMatchesName(tool, ASKUSERQUESTION) && isPlanModeToolUnavailable(options.tools) ? "DP:" : "";
  let subscriptionKeyBit = toolMatchesName(tool, AGENT)
    ? getSubscriptionType() === "pro"
      ? "P1:"
      : "P0:"
    : "";
  let hasSendMessageForAgent = toolMatchesName(tool, AGENT) ? hasSendMessageTool(options.tools) : undefined;
  let agentSendKeyBit = hasSendMessageForAgent === undefined ? "" : hasSendMessageForAgent ? "AC1:" : "AC0:";
  let leanRewrite =
    !simpleModeEnv() &&
    (toolMatchesName(tool, AGENT) ||
      toolMatchesName(tool, ASKUSERQUESTION) ||
      toolMatchesName(tool, FILE_READ_TOOL_NAME) ||
      toolMatchesName(tool, BASH_TOOL_NAME) ||
      toolMatchesName(tool, GREP_TOOL_NAME) ||
      toolMatchesName(tool, SKILL) ||
      toolMatchesName(tool, TOOL_SEARCH_TOOL_NAME) ||
      toolMatchesName(tool, WORKFLOW_TOOL_NAME))
      ? runForQuerySource(() => leanRewriteFor(promptModel))
      : undefined;
  let leanRewriteKeyBit = leanRewrite === true ? "R:" : "";
  let monitorKeyBit = toolMatchesName(tool, MONITOR) ? (isMonitorPersistentAllowed() ? "M1:" : "M0:") : "";
  let effortKeyBit = toolMatchesName(tool, AGENT) ? (isRelativeEffortDisabled() ? "E1:" : "E0:") : "";
  let whenToUse = toolMatchesName(tool, AGENT) ? querySourceHints(options.querySource)?.whenToUse : undefined;
  let whenToUseKeyBit = whenToUse === undefined ? "" : whenToUse === "" ? "X0:" : "X1:";
  let wakeupKeyBit = toolMatchesName(tool, SCHEDULE_WAKEUP_TOOL_NAME)
    ? isClaudeAISubscriber()
      ? "W1:"
      : "W0:"
    : "";
  let unusedKeyBit = "";
  let artifactKeyBit = toolMatchesName(tool, ARTIFACT_TOOL_NAME_2)
    ? require("../tools/ArtifactTool/corePrompt.js").artifactCorePromptCacheKeyBit(options.tools)
    : "";
  let webFetchKeyBit = toolMatchesName(tool, WEBFETCH)
    ? options.tools.some((tool) => toolMatchesName(tool, ARTIFACT_TOOL_NAME_2))
      ? "WA1:"
      : require("../services/artifacts/artifactsMcpTools.js").artifactMcpToolsReplaceBuiltIn(options.tools)
        ? "WA2:"
        : "WA0:"
    : "";
  let pluginsKeyBit = toolMatchesName(tool, SEARCHPLUGINS)
    ? options.tools.some((tool) => toolMatchesName(tool, SUGGESTPLUGININSTALL))
      ? "PS1:"
      : "PS0:"
    : "";
  let inboxKeyBit =
    require("../tools/FetchInboxMessageTool/FetchInboxMessageTool.lazy.js").inboxSurfaceCacheKeyBit(
      tool,
      options.tools,
    );
  let fileReferenceKeyBit =
    tool.mcpInfo?.fileReference === true
      ? require("../services/mcp/fileReference/wrapFileReferenceTool.js").fileReferenceHintKeyBit(tool)
      : "";
  let describeHooksKeyBit = options.withoutToolDescribeHooks ? "H:" : "";
  let toolSearchKeyBit = options.loadedThroughToolSearch === true && tool.isMcp === true ? "LT:" : "";
  let cacheKey =
    (options.byValueListing !== undefined ? `V${options.byValueListing}:` : "") +
    describeHooksKeyBit +
    toolSearchKeyBit +
    autoModeKeyBit +
    leanPromptKeyBit +
    eagerKeyBit +
    skillKeyBit +
    structuredOutputsKeyBit +
    messagingKeyBit +
    listAgentsKeyBit +
    planModeKeyBit +
    subscriptionKeyBit +
    agentSendKeyBit +
    leanRewriteKeyBit +
    monitorKeyBit +
    effortKeyBit +
    whenToUseKeyBit +
    wakeupKeyBit +
    artifactKeyBit +
    webFetchKeyBit +
    pluginsKeyBit +
    inboxKeyBit +
    fileReferenceKeyBit +
    ("inputJSONSchema" in tool && tool.inputJSONSchema
      ? `${tool.name}:${toolSchemaSerializer.schemaKey(tool.inputJSONSchema)}`
      : tool.name);
  let recordedToolEntry = tryReuseRecordedToolEntry(tool, options, {
    cacheKey,
    structuredOutputs,
    provider,
    eagerInputStreaming,
    serializer: toolSchemaSerializer,
  });
  let apiTool = recordedToolEntry ?? toolDescriptionCache_2.get(cacheKey);
  if (!apiTool) {
    let stamp = toolDescriptionCache_2.stamp();
    let inputSchema = toolToAPISchema(tool, {
      remoteToolForwarding: await shouldForwardRemoteTools([tool]),
    });
    if (hasSendMessageForAgent === false && !("inputJSONSchema" in tool && tool.inputJSONSchema)) {
      let properties = inputSchema.properties;
      if (
        typeof properties === "object" &&
        properties !== null &&
        "name" in properties &&
        typeof properties.name === "object" &&
        properties.name !== null
      )
        inputSchema = {
          ...inputSchema,
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
      ...options,
      model: promptModel,
      leanPrompt: isLeanPrompt,
      bashFirstTrimmed,
      leanRewrite,
    });
    let descriptionText = tool.isMcp
      ? toolDescriptionText
      : applyPromptAblation(toolDescriptionText, options.querySource);
    let engineDeferred = options.enginePlacement === "deferred";
    let resolvedDescription = options.withoutToolDescribeHooks
      ? {
          description: descriptionText,
          isDeferred: engineDeferred,
        }
      : await resolveToolDescription(tool, descriptionText, engineDeferred);
    if (!options.withoutToolDescribeHooks && options.byValueListing === undefined) {
      let isDeferred =
        resolvedDescription.isDeferred !== engineDeferred ? resolvedDescription.isDeferred : undefined;
      recordDeferral(tool.name, isDeferred);
    }
    apiTool = {
      name: tool.name,
      description: resolvedDescription.description,
      input_schema: inputSchema,
    };
    if (structuredOutputs) {
      if (tool.strict === true) {
        let normalized = normalizeOutputSchema(inputSchema);
        if (normalized.ok) {
          apiTool.strict = true;
          apiTool.input_schema = normalized.schema;
        } else
          logForDebugging(
            `Tool ${tool.name} has strict: true but its schema is not strict-compatible (${normalized.reason}); sending non-strict`,
            {
              level: "warn",
            },
          );
      } else if (
        tool.strictInputJSONSchema &&
        getFeatureValue_CACHED_MAY_BE_STALE("tengu_structured_output_strict", false)
      ) {
        apiTool.strict = true;
        apiTool.input_schema = tool.strictInputJSONSchema;
      }
    }
    let sentFromRecord = toolDescriptionCache_2.getSentFromRecord(cacheKey);
    if (
      sentFromRecord
        ? sentFromRecord.eager_input_streaming
        : isFineGrainedToolStreamingEnabled(provider, eagerInputStreaming)
    )
      apiTool.eager_input_streaming = true;
    toolDescriptionCache_2.register(cacheKey, apiTool, stamp);
    if (!tool.isMcp) toolSchemaSerializer.entriesBuilt.add(tool.name);
  }
  let recordedEntry = options.recordedEntry;
  let strictMatches =
    recordedEntry !== undefined && (recordedEntry.strict === true) === (apiTool.strict === true);
  if (recordedEntry !== undefined && recordedToolEntry === undefined)
    compareRecordedToolSchema(toolSchemaSerializer, apiTool, recordedEntry, strictMatches, {
      mcpTool: tool.isMcp === true,
      artifactFamily: isArtifactFamilyTool(tool),
    });
  let isRewrittenByHook_2 = options.isRedescribed === true && isRewrittenByHook(tool.name);
  let definition = {
    name: apiTool.name,
    description: isRewrittenByHook_2
      ? apiTool.description
      : (recordedEntry?.description ?? options.recordedDescription ?? apiTool.description),
    input_schema: strictMatches ? recordedEntry.input_schema : apiTool.input_schema,
    ...(apiTool.strict && {
      strict: true,
    }),
    ...(apiTool.eager_input_streaming && {
      eager_input_streaming: true,
    }),
  };
  if (options.deferLoading) definition.defer_loading = true;
  if (options.cacheControl) definition.cache_control = options.cacheControl;
  if (tool.name === WEBSEARCH && runForQuerySource(() => shouldEnableWebSearchCitations(model)))
    definition.citations = {
      enabled: true,
    };
  if (areExperimentalBetasDisabled()) {
    let allowDeferLoading = !isToolSearchDisabledByBetas();
    let keptKeys = new Set([
      "name",
      "description",
      "input_schema",
      "cache_control",
      ...(allowDeferLoading ? ["defer_loading"] : []),
    ]);
    let filtered = Object.keys(definition).filter((key) => !keptKeys.has(key));
    if (filtered.length > 0) {
      toolSchemaSerializer.logStripOnce(filtered);
      return {
        name: definition.name,
        description: definition.description,
        input_schema: definition.input_schema,
        ...(definition.cache_control && {
          cache_control: definition.cache_control,
        }),
        ...(allowDeferLoading &&
          definition.defer_loading && {
            defer_loading: true,
          }),
      };
    }
  }
  return definition;
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
//@ chunk-e6aww6q8.js:1512400-1514113 fingerprint (2.1.88 match: logContextMetrics, 0.709)
/**
 * 统计并上报上下文规模：MCP 工具数/服务器数/schema token、CLAUDE.md 大小、git 状态等（tengu_context_size 一类事件）。
 */
async function logContextMetrics(
  sessionRoot,
  mcpClients,
  toolPermissionContext,
  getTools,
  toolPermissionContext_2,
  agentDefinitions,
) {
  if (isFirstPartyTelemetryBlocked()) return;
  let firstRequestState;
  if (!getIsNonInteractiveSession()) await withTimeout(sessionRoot);
  else if (env.CLAUDE_CODE_REMOTE) {
    firstRequestState = await waitForFirstRequest(sessionRoot);
    await hasRequestBeenSent(sessionRoot);
    await sleep(0, undefined, {
      unref: true,
    });
  }
  let prefetchMcpTools = () => {
    if (Object.keys(mcpClients).length === 0)
      return Promise.resolve({
        tools: [],
      });
    try {
      let { prefetchAllMcpResources } =
        require("../services/mcp/emitTripwireEvent.lazy.js").mcpClientModule();
      return prefetchAllMcpResources(mcpClients, toolPermissionContext_2, agentDefinitions);
    } catch (error) {
      logError(error);
      return Promise.resolve({
        tools: [],
      });
    }
  };
  let [{ tools: mcpTools }, tools, userContext, systemContext] = await Promise.all([
    firstRequestState
      ? {
          tools: firstRequestState.tools.filter((tool) => tool.isMcp),
        }
      : prefetchMcpTools(),
    firstRequestState ? firstRequestState.tools : getTools(toolPermissionContext),
    getOrBuildUserContext(sessionRoot, toolPermissionContext_2, agentDefinitions),
    getGitStatusPrefetch(sessionRoot),
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
    let schema =
      "inputJSONSchema" in tool && tool.inputJSONSchema
        ? tool.inputJSONSchema
        : toolInputJsonSchema(tool.inputSchema);
    mcpToolsTokens += roughTokenCountEstimation(toolSchemaSerializer.schemaText(schema));
  }
  let awaitingArtifactRoster =
    nonMcpTools.some(isArtifactFamilyTool) && !(await isArtifactRosterSettled(30000));
  let { schemasSentFromRecord, entriesBuilt } = toolSchemaSerializer;
  let deferredToolState = deferredToolCache();
  let excludedUnsentTools = false;
  for (let tool of nonMcpTools) {
    if (awaitingArtifactRoster && isArtifactFamilyTool(tool)) continue;
    let schema =
      "inputJSONSchema" in tool && tool.inputJSONSchema
        ? tool.inputJSONSchema
        : (schemasSentFromRecord.get(tool.name) ?? deferredToolState.splicedInputSchema(tool.name));
    if (schema === undefined && firstRequestState !== undefined && !entriesBuilt.has(tool.name)) {
      excludedUnsentTools = true;
      continue;
    }
    nonMcpToolsTokens += roughTokenCountEstimation(
      toolSchemaSerializer.schemaText(schema ?? toolInputJsonSchema(tool.inputSchema)),
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
    ...(awaitingArtifactRoster && {
      non_mcp_tools_tokens_excludes_artifact: true,
    }),
    ...(excludedUnsentTools && {
      non_mcp_tools_tokens_excludes_unsent: true,
    }),
  });
}
//@ chunk-e6aww6q8.js:1514113-1516097 fingerprint (2.1.88 match: normalizeToolInput, 0.518)
/**
 * 工具输入规整：Read.offset 字符串转数字；ExitPlanMode 补计划文件路径；Bash 去掉 cwd 前缀、修正转义；其他工具按各自规则。
 */
function normalizeToolInput_2(tool, input, agentId, storageV5) {
  switch (tool.name) {
    case FILE_READ_TOOL_NAME: {
      try {
        if (input === null || typeof input !== "object") return input;
        let record = input;
        let plan = coerceNumberString(record.offset);
        if (typeof record.offset === "string" && typeof plan === "number")
          return {
            ...record,
            offset: plan,
          };
      } catch (error) {
        logError(
          Error(
            `normalizeToolInput Read.offset coercion failed: ${languageErrorNameOf(error)} was thrown; its text is not logged`,
          ),
        );
      }
      return input;
    }
    case EXITPLANMODE_2: {
      let planFilePath = getPlanWithPath(agentId);
      chainPlanSnapshot(storageV5);
      return planFilePath !== null
        ? {
            ...input,
            ...planFilePath,
          }
        : input;
    }
    case BashTool.name: {
      let parsed = BashTool.inputSchema.parse(input);
      let { command, timeout, description } = parsed;
      let cwd = isRemoteOnlyCheck(tool.name) ? null : getCwd();
      let normalizedCommand =
        cwd === null
          ? command
          : stripCdPrefix(command, getPlatform() === "windows" ? [cwd, windowsPathToPosixPath(cwd)] : [cwd])
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
      let normalized = {
        ...input,
      };
      if ("old_str" in normalized) {
        if (!("old_string" in normalized)) normalized.old_string = normalized.old_str;
        delete normalized.old_str;
      }
      if ("new_str" in normalized) {
        if (!("new_string" in normalized)) normalized.new_string = normalized.new_str;
        delete normalized.new_str;
      }
      let parsedInput = FileEditTool.inputSchema.parse(normalized);
      let editInput = {
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
        isRemoteOnlyCheck(tool.name) || (canRunToolsOnThisMachine() && hasHostField(parsedInput))
          ? {
              ...editInput,
              edits: editInput.edits.map((edit) =>
                isMarkdownPath(editInput.file_path)
                  ? edit
                  : {
                      ...edit,
                      new_string: stripTrailingWhitespace(edit.new_string),
                    },
              ),
            }
          : normalizeFileEditInput(editInput);
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
      let parseResult = FileWriteTool.inputSchema.safeParse(input);
      if (!parseResult.success) return input;
      let isMarkdown = isMarkdownPath(parseResult.data.file_path);
      return {
        file_path: parseResult.data.file_path,
        content: isMarkdown ? parseResult.data.content : stripTrailingWhitespace(parseResult.data.content),
        ...(canRunToolsOnThisMachine() &&
          HOST_TOOL_INPUT_FIELD in parseResult.data &&
          parseResult.data[HOST_TOOL_INPUT_FIELD] !== undefined && {
            [HOST_TOOL_INPUT_FIELD]: parseResult.data[HOST_TOOL_INPUT_FIELD],
          }),
      };
    }
    default:
      return input;
  }
}
//@ chunk-e6aww6q8.js:1516097-1516362 placement
/**
 * 规范化写入记录的工具输入：ExitPlanMode 附计划内容，多处编辑的 Edit 去掉单编辑字段，SendMessage 做专门转换。
 */
function normalizeToolInputForRecord(toolName, input, stripHostKeys = true) {
  switch (toolName) {
    case EXITPLANMODE_2: {
      if (stripHostKeys && input && typeof input === "object")
        return stripHostOwnedInputKeys(toolName, input);
      return input;
    }
    case FileEditTool.name: {
      if (stripHostKeys && input && typeof input === "object" && "edits" in input) {
        let { old_string: oldString, new_string: newString, replace_all: replaceAll, ...rest } = input;
        return rest;
      }
      return input;
    }
    case SENDMESSAGE:
      return stripObservableFields(input) ?? input;
    default:
      return input;
  }
}
//@ chunk-e6aww6q8.js:1516362-1516370 placement
// deferred: uses setToolDefinitionBuilder of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:1516362", () => {
  setToolDefinitionBuilder(toolToApiDefinition);
});
//@ chunk-e6aww6q8.js:1516370-1516544 placement
/**
 * 预先为配置了工具描述钩子的工具各运行一次描述钩子，失败只记日志。
 */
async function prefetchToolDescribeHooks(tools, buildDefinition) {
  try {
    if (!isToolDescribeHooked()) return;
    await Promise.all(
      tools
        .filter((tool) => isToolDescribeHookedForBuild(tool.name))
        .map((tool) =>
          describedOnce(tool.name, () =>
            buildDefinition(tool).then(
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
export {
  applyPromptAblation,
  normalizeToolInput_2,
  normalizeToolInputForRecord,
  querySourceHints,
  waitForGate,
  commitGate,
  hasRequestBeenSent,
  startFirstRequestGate,
  logAPIPrefix,
  isStellarDriftEnabled,
  prefetchToolDescribeHooks,
  toolToApiDefinition,
  shouldEnableWebSearchCitations,
  isNotLegacyClaude3,
  markRootRequestSent,
  splitSysPromptPrefix,
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
