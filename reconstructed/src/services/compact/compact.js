/**
 * services/compact/compact.ts
 *
 * 对话压缩主体：compactConversation（整段摘要）、partialCompactConversation（按选中消息前/后部分摘要）、摘要请求（fork 共享缓存 / 直连回退）、压缩后附件重注入（文件、计划、技能、后台任务、钩子）与边界消息。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/compact/compact.ts
 * pieces: chunk-ag5x7vhf.js (1), chunk-e6aww6q8.js (81)
 * attribution: fingerprint 19, placement 36, sole-consumer 1, layout 26
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../analytics/featureTelemetry.js";
import { logError } from "../../utils/log.js";
import {
  withTelemetryMessage,
  toError,
  hasExactErrorMessage,
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../../utils/errors.js";
import { isProactivityActive, currentProactivityLevel } from "../../Tool.js";
import { isProactivityMode } from "../../utils/proactivityMode.js";
import { isProactivitySettingsValid } from "../../utils/proactivity.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { PermissionContextLogState } from "../internalLogging.js";
import {
  getRootSession,
  markPostCompaction,
  setLastMainThreadContextTokens,
  armPendingContextCompacted,
  getInferenceProfileBackingModelCached,
  getThinkingTypeOverride,
  getLastMainRequestId,
  getStickyBetas,
  isDiskless,
  getInvokedSkillsForAgent,
  updateInvokedSkillContent,
  getOriginalCwdOrNull,
} from "../../bootstrap/state.js";
import { emitCompactingStatus } from "../../entrypoints/sdk/coreSchemas.js";
import { isVirtualConversationMessage } from "../../bootstrap/sessionSlices.js";
import {
  messagesSinceCompactBoundary,
  isCompactBoundaryMessage as isCompactBoundaryMessage_3,
  hasUpdateStatusToolOnly,
} from "../projects/threadRows.js";
import { isMainQuerySource, classifyQuerySource } from "../api/requestHeaders.js";
import { estimateTokensWithAnchor, getAutoCompactThresholdTokens } from "./autoCompact.js";
import { remoteFileStateToObject } from "../../utils/remoteFileState.js";
import { resetPickerState } from "../../memdir/findRelevantMemories.js";
import { notifyCompaction } from "../api/promptCacheBreakDetection.js";
import {
  reAppendSessionMetadataAfterCompaction,
  cleanMessagesForLogging,
  isTranscriptPersistenceDisabled,
  getAgentTranscriptPath,
  getTranscriptPath,
} from "../../utils/sessionStorage.js";
import { roughTokenCountEstimationForMessages, roughTokenCountEstimation } from "../tokenEstimation.js";
import {
  createCompactBoundaryMessage,
  withRenderedAttachment,
  isThinkingBlock,
  extractTextContent_2,
  createUserMessage,
  isToolResultMessage,
  isSyntheticMessage,
  getAssistantMessageText,
  withTurnPosition,
  computeThinkingStrippedScope,
  collectThinkingStripPlan,
  getAdvisorStrippedMessageIds,
  API_REQUEST_ABORTED_MESSAGE,
  getLastAssistantMessage,
  resolveReminderFold_2,
  normalizeMessagesForAPI,
} from "../../utils/messages.js";
import { stampPreCompactReadVersions } from "../../tools/ArtifactTool/artifactResumeCarry.js";
import { isMainQueryCompaction } from "./postCompactCleanup.js";
import { executePostCompactHooks, executePreCompactHooks } from "../../utils/hooks.js";
import {
  appendPreservedTailNote,
  compactPromptVariant,
  buildCompactArtifactNote,
  createCompactStreamProgress,
  summaryTextOf,
  findSummaryMessage,
} from "./reactiveCompact.js";
import {
  setCumulativeDroppedTokens,
  getTokenUsage,
  tokenCountFromLastAPIResponse,
  getLastApiUsage,
} from "../../utils/tokens.js";
import { tokenStatsToStatsigMetrics, analyzeContext } from "../../utils/contextAnalysis.js";
import { getEffortLevelIfSupported } from "../../utils/effort.js";
import {
  getEffortValue,
  getEffortLayerOverride,
  getToolPermissionContext,
  getMainLoopModel as getMainLoopModel_2,
  getThinkingConfig,
  getEffortSetAsideByHold,
} from "../../utils/permissions/toolPermissionContext.js";
import { notePendingConversationEdit } from "../../utils/shell/shellToolUtils.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum, fromEnumOpt, lit as lit_2 } from "../analytics/safeMetadata.js";
import { agentTypeForTelemetry } from "../analytics/metadata.js";
import { onLastMainRequestReplaced } from "../api/cacheKeepalive.js";
import { isDelegatedObservationContext } from "../../utils/agentContext.js";
import { processSessionStartHooks } from "../../utils/sessionStart.js";
import { isObjectBlock } from "../../utils/toolResultStorage.js";
import {
  getPromptTooLongGap,
  PROMPT_TOO_LONG_ERROR_MESSAGE,
  startsWithApiErrorPrefix,
  parsePromptTooLongTokenCounts,
} from "../api/errors.js";
import { logForDebugging, createAttachmentMessage_2 } from "../../utils/debug.js";
import { count } from "../../utils/collections.js";
import { getRuntimeMainLoopModel } from "../../utils/model/planModeModel.js";
import { stripAnyVersatileSuffix } from "../../utils/model/modelIds.js";
import { modelSupportsAdaptiveThinking } from "../../utils/thinking.js";
import { getCanonicalName } from "../../utils/model/canonicalModelName.js";
import { keptThinkingStripDecision, isSoftSparkEnabled } from "./compactSettings.js";
import {
  endToolExecutionSpan_2,
  noopEndToolExecutionSpan,
  setSpanError,
} from "../../utils/telemetry/sessionTracing.js";
import { getCompactPrompt, getPartialCompactPrompt, hasSummaryBlock, hasSummaryTagLine } from "./prompt.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { messagesContainUntrustedContent } from "../../utils/messages/untrustedArtifactContent.js";
import { getToolsUsedForSummary } from "../../utils/agentListing.js";
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import { logCompactionEvent } from "../../utils/telemetry/thirdPartyEventRecords.js";
import { enqueueTaskNotification as enqueueTaskNotification_2 } from "../../utils/task/taskNotifications.js";
import { swapShrinksContextWindow } from "../../utils/model/smallFastModel.js";
import { runForkedAgent } from "../../utils/forkedAgent.js";
import {
  toolSearchRejectedOn,
  isToolSearchEnabled,
  extractDiscoveredToolNames,
} from "../../utils/toolSearch.js";
import { forkStickyBetaLatches } from "../../bootstrap/stateSlices.js";
import { Ji } from "../../../vendor/lodash-es/uniqBy.js";
import { FileReadTool } from "../../tools/FileReadTool/FileReadTool.js";
import { ToolSearchTool } from "../../tools/ToolSearchTool/ToolSearchTool.js";
import { needsOverageConsentForModel } from "../api/overageConsent.js";
import {
  getUsageCreditsOnlyModelConsentDeclineFallback,
  isNoModelFallbackEnabled,
  buildAvailabilityFallbackChain,
  noModelFallbackTripwire,
} from "../../utils/model/modelFallback.js";
import { renderUsageCreditsOnlyModelName, renderModelName } from "../../utils/model/modelDisplay.js";
import { nextFallbackModel, isFallbackTo } from "../../query/modelSelection.js";
import { resolveRefusalFallback, modelUnavailableMessage } from "../api/modelFallback.js";
import { shouldEchoWireToolInputs } from "../../utils/wireToolInputEcho.js";
import { queryModelWithStreaming } from "../api/claude.js";
import { isStellarDriftEnabled } from "../../utils/api.js";
import { asSystemPrompt } from "../../utils/systemPromptType.js";
import { telemetrySafeModelName } from "../../utils/model/telemetryModelName.js";
import { getFallbackDialogSkipReason, normalizeRefusalCategory } from "../api/refusalFallback.js";
import { refusedEffortTelemetryFields } from "../../utils/permissions/permissionSetup.js";
import { FallbackTriggeredError } from "../api/withRetry.js";
import {
  stickyBetasForRequest,
  asDeclaredToolSet,
  hasScratchToolSet,
  logDeclaredToolsDroppedAtCompaction,
  logDeclaredToolsDroppedAtCompaction2,
} from "../api/declaredToolSet.js";
import {
  getRevokedDeferredToolNames,
  getDeferredToolsDeltaAttachments,
  buildDeferredToolsLatchContext,
  buildToolRevocationClassifier,
  getAgentListingDeltaAttachment,
  areAttachmentsDisabled,
  getSkillListingAttachmentsLazy,
  getMcpInstructionsDeltaAttachment,
  getMcpDroppedToolsAttachment,
  generateFileAttachment,
  buildPlanModeAttachment,
} from "../../utils/attachments.js";
import {
  buildPromptSnapshotAttachment,
  renderPointIfStale,
} from "../../utils/contextAttachments/promptSnapshot.js";
import { isSortedOtterOn } from "../mcp/mcpGates.js";
import { getSandboxInstructionsAttachments } from "../../utils/attachments/sandboxInstructions.js";
import {
  getPostCompactEnvironmentAttachments,
  modelAttachmentIfNew,
} from "../../utils/attachments/environmentChange.js";
import { getCwdOrNull } from "../../utils/cwd.js";
import { carryStyleAndLanguageAttachments } from "../../utils/contextAttachments/outputStyleLanguage.js";
import { isRemoteToolForwardingSwitchOn } from "../remoteTools/servingGates.js";
import { isolationRuntimeService } from "../../utils/worktreeIsolation.js";
import { expandPath, expandPathOrNull } from "../../utils/path.js";
import { isPersistedArtifactPath } from "../artifacts/persistedArtifacts.js";
import {
  peekPlanSlug,
  notePlanFileForgotten,
  getPlanFilePath,
  getPlanAsync,
  planExistsAsync,
} from "../../utils/plans.js";
import { findInvokedMcpSkill } from "../mcp/mcpSkills.js";
import { restoreSkillStateFromMessages } from "../../utils/conversationRecovery.js";
import { buildGoalSentinelAttachment, findActiveGoalCondition } from "../../commands/goal/goal.js";
import {
  carryLoopCronAcrossCompact,
  carryProjectsThreadAsk,
  willToolsLoseSessionState,
} from "./compactCarry.js";
import { hasSendMessageTool } from "../../tools/SendMessageTool/constants.js";
import { isIdleCompletedAgent } from "../../tasks/LocalAgentTask/keepalive.js";
import { truncateWithCount } from "../../utils/stringUtils.js";
import { stripIgnorables } from "../../utils/sanitization.js";
import { isFileUnchangedStub } from "../../tools/FileReadTool/prompt.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import { MEMORY_TYPE_VALUES } from "../../utils/memory/types.js";
import { getAutoMemPathOrNull } from "../../memdir/paths.js";
import { getMemoryPath } from "../../utils/config.js";
import { formatApiErrorType } from "../api/errorUtils.js";
import { recoveryTimeoutForContextTokens } from "../../utils/abortController.js";
import { env } from "../../utils/env.js";

//@ chunk-e6aww6q8.js:1630181-1630292 placement
var SKILL_TRUNCATION_NOTE = `

[... skill content truncated for compaction; use Read on the skill path if you need the full text]`;
//@ chunk-e6aww6q8.js:1630292-1630550 placement
/**
 * meta 用户消息的纯文本内容（全是文本块时拼接）。
 */
function metaMessageText(message) {
  if (message.type !== "user" || !message.isMeta) return null;
  let content = message.message?.content;
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return null;
  let filtered = content.filter((s) => s?.type === "text");
  if (filtered.length !== content.length) return null;
  return filtered.map((s) => s.text).join(`

`);
}
//@ chunk-e6aww6q8.js:1652913-1653514 placement
/**
 * 错误文本自证。压缩后给 deferred_tools_delta 附件补 loadedBeforeSummaryNames（压缩前已加载、本次又新增的工具名）；开关 tengu_radiant_lemur。
 */
function withToolsLoadedBeforeSummary(deferredToolsDeltaAttachments, discoveredToolNames) {
  try {
    return deferredToolsDeltaAttachments.map((r) => {
      if (r.type !== "deferred_tools_delta" || r.toolSearchAbsent === true) return r;
      let s = new Set([...(r.loadedNames ?? []), ...(r.surfacedNames ?? []), ...(r.replacedNames ?? [])]);
      let filtered = r.addedNames.filter(
        (addedName) => discoveredToolNames.has(addedName) && !s.has(addedName),
      );
      if (filtered.length === 0) return r;
      if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_radiant_lemur", false)) {
        logFeatureSad("compact_names_loaded_tools", "flag_off", {
          count: filtered.length,
        });
        return r;
      }
      logFeatureOk("compact_names_loaded_tools", {
        count: filtered.length,
      });
      return {
        ...r,
        loadedBeforeSummaryNames: filtered,
      };
    });
  } catch (error) {
    logError(
      withTelemetryMessage(
        toError(error),
        "withToolsLoadedBeforeSummary threw: the notice names no loaded tool",
      ),
    );
    logFeatureBad("compact_names_loaded_tools", "threw");
    return deferredToolsDeltaAttachments;
  }
}
//@ chunk-e6aww6q8.js:1653514-1653656 placement
/**
 * 压缩后若新消息里没有 proactivity 附件，保留历史中最后一个未撤回的 proactivity 附件。
 */
function getProactivityAttachmentToKeep(preCompactMessages, messagesToKeep) {
  {
    if (!isProactivityActive() || messagesToKeep.some(isProactivityAttachment)) return [];
    let attachment = preCompactMessages.findLast(isProactivityAttachment)?.attachment;
    return attachment !== undefined && attachment.status !== "withdrawn" ? [attachment] : [];
  }
  return [];
}
//@ chunk-e6aww6q8.js:1653656-1653817 placement
/**
 * 消息是 proactivity 附件，且已撤回或级别/工具有效。
 */
function isProactivityAttachment(e) {
  if (e.type !== "attachment" || e.attachment.type !== "proactivity") return false;
  let attachment = e.attachment;
  return (
    attachment.status === "withdrawn" ||
    (isProactivityMode(attachment.level) && isProactivitySettingsValid(attachment.tools))
  );
}
//@ chunk-e6aww6q8.js:2085167-2085194 sole-consumer
/**
 * 按宿主保存的权限上下文日志状态。
 */
var permissionContextLogState = new HostScoped(() => new PermissionContextLogState());
//@ chunk-e6aww6q8.js:2085194-2085233 placement
/**
 * 取当前宿主的权限上下文日志状态。
 */
function getPermissionContextLogState() {
  return permissionContextLogState.of(getRootSession().host);
}
//@ chunk-e6aww6q8.js:2085233-2085278 placement
/**
 * 取当前 OCI 容器 id（透传状态里的 ociContainerId）。
 */
function getOciContainerId() {
  return getPermissionContextLogState().ociContainerId();
}
//@ chunk-e6aww6q8.js:2085278-2085309 placement
/**
 * 异步空实现（保留调用点，目前不做任何事）。
 */
async function noopAsync_3(toolPermissionContext, n) {
  return;
}
//@ chunk-e6aww6q8.js:2085309-2085323 placement
/**
 * 压缩过程中状态提示的刷新间隔（30 秒）。
 */
var COMPACTING_STATUS_INTERVAL_MS = 30000;
//@ chunk-e6aww6q8.js:2085323-2085394 placement
/**
 * 启动压缩状态定时器，返回停止函数。
 */
function startCompactingStatusTicker(onCompactEvent) {
  let interval = setInterval(emitCompactingStatus, COMPACTING_STATUS_INTERVAL_MS, onCompactEvent);
  return () => clearInterval(interval);
}
//@ chunk-e6aww6q8.js:2085461-2085728 placement
/**
 * 按 API 回合（助手消息 id 变化）把消息分组。
 */
function groupByApiRound(e) {
  let n = [];
  let r = [];
  let s;
  for (let h of e) {
    if (isVirtualConversationMessage(h)) {
      r.push(h);
      continue;
    }
    if (h.type === "assistant" && h.message.id !== s && !h.resumedFromIncompleteThinking && r.length > 0) {
      n.push(r);
      r = [h];
    } else r.push(h);
    if (h.type === "assistant") s = h.message.id;
  }
  if (r.length > 0) n.push(r);
  return n;
}
//@ chunk-e6aww6q8.js:2085728-2085802 placement = countUnseenAssistantTurns (1)
function countNonProgressMessages(e) {
  let filtered = messagesSinceCompactBoundary(e).filter((r) => r.type !== "progress");
  return groupByApiRound(filtered);
}
//@ chunk-e6aww6q8.js:2085802-2085841 placement
/**
 * 非进度消息不足两条（没有可压缩的内容）。
 */
function hasTooFewMessagesToCompact(messagesForQuery) {
  return countNonProgressMessages(messagesForQuery).length < 2;
}
//@ chunk-e6aww6q8.js:2134246-2138079 placement = createCompactionResultFromSessionMemory (0.132)
/**
 * 反应式/预计算压缩成功后组装 CompactionResult：清 readFileState、边界消息、保留消息（可剥 thinking）、压缩后附件、PostCompact 钩子、计算 postTokens，记 tengu_reactive_compact_succeeded。旧版名 createCompactionResultFromSessionMemory 为错配。
 */
async function buildReactiveCompactionResult(e) {
  let {
    compactResult,
    preCompactMessages,
    startTime,
    cacheSafeParams,
    querySource,
    trigger,
    thresholdSource,
    thresholdWindow,
    precomputed,
    manualPrecomputeReuse,
    precomputeTelemetry,
    mainChainTailAtStart,
    cacheCold,
  } = e;
  let { toolUseContext } = cacheSafeParams;
  let compactionKind = e.compactionKind ?? resolveCompactionKind(trigger, thresholdSource);
  let isMainThreadQuery = isMainQuerySource(querySource);
  let preCompactTokens = e.preCompactTokens ?? estimateTokensWithAnchor(preCompactMessages);
  let preCompactReadFileState = remoteFileStateToObject(toolUseContext.readFileState);
  toolUseContext.readFileState.clear();
  resetPickerState(toolUseContext.memorySelector);
  notifyCompaction(toolUseContext.agentId);
  if (isMainThreadQuery) {
    await reAppendSessionMetadataAfterCompaction(toolUseContext.storageV5);
    markPostCompaction(
      roughTokenCountEstimationForMessages([...compactResult.summaryMessages, ...e.messagesToPreserve]),
    );
  }
  let uuid = preCompactMessages.at(-1)?.uuid;
  let boundaryMarker = createCompactBoundaryMessage(trigger, preCompactTokens, uuid);
  boundaryMarker.compactMetadata.durationMs = Math.round(performance.now() - startTime);
  if (precomputed) boundaryMarker.compactMetadata.precomputed = true;
  let discoveredToolNames = getDiscoveredToolNames(preCompactMessages, cacheSafeParams.toolUseContext);
  if (discoveredToolNames.size > 0)
    boundaryMarker.compactMetadata.preCompactDiscoveredTools = [...discoveredToolNames].sort();
  stampPreCompactReadVersions(boundaryMarker, toolUseContext.agentId, toolUseContext.getAppState());
  let messagesToKeep = e.messagesToPreserve.map(getTokenCountFromUsage_4);
  let keptThinking = decideKeptThinkingStrip(messagesToKeep, toolUseContext);
  let isMainThread = isMainQueryCompaction(querySource, toolUseContext.agentId);
  let postCompactAttachments = await buildPostCompactAttachments(
    preCompactReadFileState,
    toolUseContext,
    messagesToKeep,
    "reactive_compact",
    preCompactMessages,
    isMainThread,
    compactionKind === "reactive",
  ).catch((error) =>
    fallbackPostCompactAttachments(error, toolUseContext, preCompactMessages, messagesToKeep, isMainThread),
  );
  toolUseContext.onCompactEvent?.({
    type: "compact_progress",
    event: {
      type: "hooks_start",
      hookType: "post_compact",
    },
  });
  let postCompactHookResult = await executePostCompactHooks(
    toolUseContext.session,
    {
      trigger,
      compactSummary: compactResult.summaryText,
    },
    toolUseContext,
    toolUseContext.abortController.signal,
  );
  let annotatedBoundary = annotateBoundaryWithPreservedSegment(
    boundaryMarker,
    compactResult.summaryMessages.at(-1).uuid,
    messagesToKeep,
    preCompactMessages,
  );
  let summaryMessages =
    messagesToKeep.length > 0
      ? compactResult.summaryMessages.map(appendPreservedTailNote)
      : compactResult.summaryMessages;
  let It = {
    boundaryMarker: annotatedBoundary,
    summaryMessages,
    messagesToKeep,
    attachments: keptThinking.marker
      ? [keptThinking.marker, ...postCompactAttachments.attachments]
      : postCompactAttachments.attachments,
    hookResults: postCompactAttachments.hookResults,
    userDisplayMessage: postCompactHookResult.userDisplayMessage,
    preCompactTokenCount: preCompactTokens,
    ...(!precomputed && {
      compactionUsage: compactResult.totalUsage,
    }),
  };
  let postCompactTokenCount = roughTokenCountEstimationForMessages(buildPostCompactMessages(It));
  annotatedBoundary.compactMetadata.postTokens = postCompactTokenCount;
  setCumulativeDroppedTokens(annotatedBoundary, preCompactMessages);
  if (isMainThreadQuery) setLastMainThreadContextTokens(postCompactTokenCount);
  let qt = (() => {
    try {
      return tokenStatsToStatsigMetrics(analyzeContext(preCompactMessages));
    } catch (error) {
      logError(error);
      return {};
    }
  })();
  let totalUsage = compactResult.totalUsage;
  let rn =
    totalUsage.input_tokens + totalUsage.cache_creation_input_tokens + totalUsage.cache_read_input_tokens;
  let effortLevelIfSupported = getEffortLevelIfSupported(
    toolUseContext.options.mainLoopModel,
    getEffortValue(toolUseContext),
    getEffortLayerOverride(toolUseContext.permissionLayers),
  );
  if (
    compactResult.splitKind !== "round" &&
    (trigger === "auto" || compactResult.headTruncations > 0 || (compactResult.leaveOutPasses ?? 0) > 0)
  )
    logFeatureSad("compact_reactive", "compact_reactive_summarized_all");
  else logFeatureOk("compact_reactive");
  if (isMainThreadQuery) notePendingConversationEdit("compact");
  logEvent("tengu_reactive_compact_succeeded", {
    ...(effortLevelIfSupported && {
      effort_level: fromEnum(effortLevelIfSupported),
    }),
    querySource: querySource === undefined ? undefined : agentTypeForTelemetry(querySource),
    attempts: compactResult.attempt,
    groupsPreserved: compactResult.groupsPreserved,
    totalGroups: compactResult.totalGroups,
    splitKind: fromEnum(compactResult.splitKind),
    headTruncations: compactResult.headTruncations,
    leaveOutPasses: compactResult.leaveOutPasses,
    preservedUuidCount: annotatedBoundary.compactMetadata.preservedMessages?.uuids.length ?? 0,
    preservedMessageCount: messagesToKeep.length,
    keptThinkingBlockCount: keptThinking.thinkingBlockCount,
    keptThinkingStripped: keptThinking.marker !== undefined,
    keptThinkingStripDecidedBy: fromEnumOpt(keptThinking.decidedBy),
    forkAssistantMessageCount: compactResult.forkAssistantMessageCount,
    summaryPromptArm: fromEnumOpt(compactResult.promptArm),
    summaryScopeWarned: compactResult.scopeWarned,
    trigger: fromEnum(trigger),
    thresholdSource: fromEnumOpt(thresholdSource),
    autoCompactWindow: thresholdWindow?.window,
    autoCompactWindowOrigin: fromEnumOpt(thresholdWindow?.origin),
    preCompactTokens,
    postCompactTokens: postCompactTokenCount,
    restoredAttachmentCount:
      postCompactAttachments.attachments.length + postCompactAttachments.hookResults.length,
    durationMs: Math.round(performance.now() - startTime),
    userWaitMs: Math.round(performance.now() - startTime),
    precomputed,
    manualPrecomputeReuse: fromEnumOpt(manualPrecomputeReuse),
    precomputeBorrowed: precomputeTelemetry?.borrowed,
    precomputeStatusAtPTL: fromEnumOpt(precomputeTelemetry?.statusAtPTL),
    precomputeLeadMs: precomputeTelemetry ? Math.round(precomputeTelemetry.leadMs) : undefined,
    precomputeTotalMs: precomputeTelemetry ? Math.round(precomputeTelemetry.totalMs) : undefined,
    messagesSincePrecompute: precomputed
      ? messagesToKeep.length - compactResult.messagesToPreserve.length
      : undefined,
    messagesSinceTokens: precomputeTelemetry?.messagesSinceTokens,
    precomputeRehydrated: precomputeTelemetry?.rehydrated,
    armTrigger: fromEnumOpt(precomputeTelemetry?.armTrigger),
    precomputeHeadReordered: precomputeTelemetry?.headReordered,
    precomputeDisplayOnlyMessagesLeftOut: precomputeTelemetry?.displayOnlyLeftOutCount,
    precomputeEarlyTailMessages: precomputeTelemetry?.earlyTailCount,
    compactionInputTokens: totalUsage.input_tokens,
    compactionOutputTokens: totalUsage.output_tokens,
    compactionCacheReadTokens: totalUsage.cache_read_input_tokens,
    compactionCacheCreationTokens: totalUsage.cache_creation_input_tokens,
    compactionTotalTokens: rn + totalUsage.output_tokens,
    cacheHitRate: rn > 0 ? totalUsage.cache_read_input_tokens / rn : 0,
    cacheCold,
    ...qt,
  });
  if (isMainQueryCompaction(querySource, toolUseContext.agentId)) {
    armPendingContextCompacted(compactionKind, mainChainTailAtStart);
    onLastMainRequestReplaced(mainChainTailAtStart);
  }
  return {
    ok: true,
    result: It,
  };
}
//@ chunk-e6aww6q8.js:2138079-2139711 placement
/**
 * 压缩前后运行压缩相关钩子，钩子可替换压缩结果。
 */
async function runCompactHooks(e) {
  let { replacement, preCompactMessages, cacheSafeParams, querySource, trigger, startTime, coreBoundary } = e;
  let { toolUseContext } = cacheSafeParams;
  let G = coreBoundary !== undefined;
  let q = isMainQuerySource(querySource);
  let Z = estimateTokensWithAnchor(preCompactMessages);
  if (!G) {
    toolUseContext.readFileState.clear();
    resetPickerState(toolUseContext.memorySelector);
    notifyCompaction(toolUseContext.agentId);
    if (q) {
      await reAppendSessionMetadataAfterCompaction(toolUseContext.storageV5);
      markPostCompaction(roughTokenCountEstimationForMessages(replacement));
    }
  }
  let Se =
    coreBoundary !== undefined && isCompactBoundaryMessage_3(coreBoundary)
      ? {
          ...coreBoundary,
          compactMetadata: {
            ...coreBoundary.compactMetadata,
            preservedSegment: undefined,
            preservedMessages: undefined,
            preCompactArtifactReadVersions: undefined,
          },
        }
      : createCompactBoundaryMessage(trigger, Z, preCompactMessages.at(-1)?.uuid);
  Se.compactMetadata.durationMs = Math.round(performance.now() - startTime);
  if (e.precomputed) Se.compactMetadata.precomputed = true;
  let hookResults = [];
  let userDisplayMessage;
  if (!G) {
    toolUseContext.onCompactEvent?.({
      type: "compact_progress",
      event: {
        type: "hooks_start",
        hookType: "post_compact",
      },
    });
    userDisplayMessage = (
      await executePostCompactHooks(
        toolUseContext.session,
        {
          trigger,
          compactSummary: "",
        },
        toolUseContext,
        toolUseContext.abortController.signal,
      )
    ).userDisplayMessage;
    if (
      !isDelegatedObservationContext(toolUseContext.agentContext) &&
      !toolUseContext.options.settingsHooksOff
    ) {
      toolUseContext.onCompactEvent?.({
        type: "compact_progress",
        event: {
          type: "hooks_start",
          hookType: "session_start",
        },
      });
      hookResults = await processSessionStartHooks(toolUseContext.session, "compact", {
        model: toolUseContext.options.mainLoopModel,
        agentContext: toolUseContext.agentContext,
        storageV5: toolUseContext.storageV5,
        credentials: toolUseContext.credentials,
      });
    }
  }
  let Ee = {
    boundaryMarker: Se,
    summaryMessages: [],
    replacement,
    messagesToKeep: [],
    attachments: [],
    hookResults,
    userDisplayMessage,
    preCompactTokenCount: Z,
  };
  let Ae = roughTokenCountEstimationForMessages(buildPostCompactMessages(Ee));
  Se.compactMetadata.postTokens = Ae;
  setCumulativeDroppedTokens(Se, preCompactMessages);
  if (q) setLastMainThreadContextTokens(Ae);
  if (q) notePendingConversationEdit("compact");
  if (!G && e.compactionKind !== undefined && isMainQueryCompaction(querySource, toolUseContext.agentId))
    armPendingContextCompacted(e.compactionKind, e.mainChainTailAtStart);
  logEvent("tengu_compact_replaced_by_hook", {
    trigger: fromEnum(trigger),
    ranCore: G,
    precomputed: e.precomputed === true,
    preCompactTokens: Z,
    postCompactTokens: Ae,
    messageCount: replacement.length,
    ...(querySource !== undefined && {
      querySource: agentTypeForTelemetry(querySource),
    }),
  });
  return Ee;
}
//@ chunk-e6aww6q8.js:2139711-2139787 placement
/**
 * 推断压缩类型：手动、自动（有阈值来源）或响应式。
 */
function resolveCompactionKind(trigger, thresholdSource) {
  return trigger === "manual" ? "manual" : thresholdSource !== undefined ? "auto" : "reactive";
}
//@ chunk-e6aww6q8.js:2139787-2140059 placement
/**
 * 压缩附件生成失败时的兜底附件（计划模式、项目线程询问、目标、定时任务）。
 */
async function fallbackPostCompactAttachments(error, context, preCompactMessages, messagesToKeep, h) {
  logError(error);
  let y = await createPlanModeAttachmentIfNeeded(context).catch((error) => {
    logError(error);
    return null;
  });
  let projectsThreadAskAttachmentIfNeeded = createProjectsThreadAskAttachmentIfNeeded(
    preCompactMessages,
    messagesToKeep,
    context.options.tools,
    h,
  );
  let goalStatusAttachmentIfNeeded = createGoalStatusAttachmentIfNeeded(
    context,
    preCompactMessages,
    messagesToKeep,
    h,
  );
  let sessionCronCarryAttachmentIfNeeded = createSessionCronCarryAttachmentIfNeeded(
    preCompactMessages,
    messagesToKeep,
    h,
  );
  let announcementWalk = context.options.announcementWalk;
  let q = [
    ...(y ? [y] : []),
    ...(projectsThreadAskAttachmentIfNeeded ? [projectsThreadAskAttachmentIfNeeded] : []),
    ...(goalStatusAttachmentIfNeeded ? [goalStatusAttachmentIfNeeded] : []),
    ...(sessionCronCarryAttachmentIfNeeded ? [sessionCronCarryAttachmentIfNeeded] : []),
  ];
  return {
    attachments: announcementWalk ? q.map((Z) => announcementWalk(Z)) : q,
    hookResults: [],
  };
}
//@ chunk-e6aww6q8.js:2140059-2140258 placement = getTokenCountFromUsage (0.899)
function getTokenCountFromUsage_4(usage) {
  if (usage.type !== "assistant") return usage;
  return {
    ...usage,
    message: {
      ...usage.message,
      usage: {
        ...usage.message.usage,
        input_tokens: 0,
        output_tokens: 0,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
      },
    },
  };
}
//@ chunk-e6aww6q8.js:2140258-2140520 placement
/**
 * 找出压缩边界保留的消息及锚点。
 */
function resolvePreservedMessages(e, n, r) {
  let preservedMessages = n.compactMetadata.preservedMessages;
  if (!preservedMessages) return null;
  let mapped = (preservedMessages.allUuids ?? preservedMessages.uuids)
    .map((y) => e.find((S) => S.uuid === y) ?? r?.find((S) => S.uuid === y))
    .filter((y) => y !== undefined)
    .map(getTokenCountFromUsage_4);
  return mapped.length > 0
    ? {
        preserved: mapped,
        anchorUuid: preservedMessages.anchorUuid,
      }
    : null;
}
//@ chunk-e6aww6q8.js:2140520-2140841 placement
/**
 * 在消息列表中按锚点移动保留的消息。
 */
function applyPreservedMessages(e, n, r, initialMessages) {
  if (isCompactBoundaryMessage_3(n)) {
    let preservedMessages = resolvePreservedMessages(e, n, initialMessages);
    if (preservedMessages === null) return null;
    let y = new Set(preservedMessages.preserved.map((w) => w.uuid));
    let filtered = e.filter((w) => !y.has(w.uuid));
    e.length = 0;
    e.push(...filtered);
    if (preservedMessages.anchorUuid === n.uuid) {
      e.push(...preservedMessages.preserved);
      return null;
    }
    return preservedMessages;
  }
  if (r !== null && r.anchorUuid === n.uuid) {
    e.push(...r.preserved);
    return null;
  }
  return r;
}
//@ chunk-e6aww6q8.js:2140841-2141025 placement = buildPostCompactMessages (0.833)
function buildPostCompactMessages_2(e, n) {
  let mapped = e.messagesToKeep.map(getTokenCountFromUsage_4);
  let s = n === "up_to" ? [...e.summaryMessages, ...mapped] : [...mapped, ...e.summaryMessages];
  return [e.boundaryMarker, ...s, ...e.attachments, ...e.hookResults];
}
//@ chunk-e6aww6q8.js:2406920-2406984 placement
/**
 * 200：后台 shell 描述截断长度。
 */
var POST_COMPACT_MAX_FILES_TO_RESTORE = 5;
var POST_COMPACT_TOKEN_BUDGET = 50000;
var POST_COMPACT_MAX_TOKENS_PER_FILE = 5000;
var POST_COMPACT_MAX_TOKENS_PER_SKILL = 5000;
var POST_COMPACT_SKILLS_TOKEN_BUDGET = 25000;
var TASK_STATUS_COMMAND_MAX_CHARS = 500;
var TASK_STATUS_DESCRIPTION_MAX_CHARS = 200;
//@ chunk-e6aww6q8.js:2406984-2407546 placement
/**
 * 附件里的图片/文档换成 [image]/[document] 文本（queued_command 的 prompt、file 附件的 image/notebook/parts 内容）。
 */
function stripMediaFromAttachment(attachment) {
  if (
    attachment.type === "queued_command" &&
    Array.isArray(attachment.prompt) &&
    attachment.prompt.some((n) => isObjectBlock(n) && (n.type === "image" || n.type === "document"))
  )
    return {
      ...attachment,
      prompt: attachment.prompt.map((n) => {
        if (!isObjectBlock(n)) return n;
        if (n.type === "image")
          return {
            type: "text",
            text: "[image]",
          };
        if (n.type === "document")
          return {
            type: "text",
            text: "[document]",
          };
        return n;
      }),
    };
  if (
    attachment.type === "file" &&
    (attachment.content.type === "image" ||
      attachment.content.type === "notebook" ||
      attachment.content.type === "parts")
  )
    return {
      ...attachment,
      content: {
        type: "text",
        file: {
          filePath: attachment.filename,
          content: `[${attachment.content.type}]`,
          numLines: 1,
          startLine: 1,
          totalLines: 1,
        },
      },
    };
  return attachment;
}
//@ chunk-e6aww6q8.js:2407546-2408279 fingerprint = stripImagesFromMessages (0.888)
/**
 * 摘要请求前把消息里的 image/document 块（含 tool_result 内嵌）替换成 [image]/[document] 文本，附件同样处理。
 */
function stripImagesFromMessages(messages) {
  return messages.map((message) => {
    if (message.type === "attachment") {
      let y = stripMediaFromAttachment(message.attachment);
      return y === message.attachment ? message : withRenderedAttachment(message, y);
    }
    if (message.type !== "user") return message;
    let content = message.message.content;
    if (!Array.isArray(content)) return message;
    let hasMediaBlock = false;
    let newContent = content.flatMap((block) => {
      if (!isObjectBlock(block)) return [block];
      if (block.type === "image") {
        hasMediaBlock = true;
        return [
          {
            type: "text",
            text: "[image]",
          },
        ];
      }
      if (block.type === "document") {
        hasMediaBlock = true;
        return [
          {
            type: "text",
            text: "[document]",
          },
        ];
      }
      if (block.type === "tool_result" && Array.isArray(block.content)) {
        let toolHasMedia = false;
        let newToolContent = block.content.map((item) => {
          if (!isObjectBlock(item)) return item;
          if (item.type === "image") {
            toolHasMedia = true;
            return {
              type: "text",
              text: "[image]",
            };
          }
          if (item.type === "document") {
            toolHasMedia = true;
            return {
              type: "text",
              text: "[document]",
            };
          }
          return item;
        });
        if (toolHasMedia) {
          hasMediaBlock = true;
          return [
            {
              ...block,
              content: newToolContent,
            },
          ];
        }
      }
      return [block];
    });
    if (!hasMediaBlock) return message;
    return {
      ...message,
      message: {
        ...message.message,
        content: newContent,
      },
    };
  });
}
//@ chunk-e6aww6q8.js:2408279-2408569 layout
/**
 * stripNonEssential（冷压缩）时只保留 queued_command/poll_events/dir_sync_notice/fork_briefing/thinking_stripped/advisor_stripped 附件。
 */
function keepEssentialAttachmentsOnly(requestMessages) {
  return requestMessages.filter(
    (n) =>
      n.type !== "attachment" ||
      n.attachment.type === "queued_command" ||
      n.attachment.type === "poll_events" ||
      n.attachment.type === "dir_sync_notice" ||
      n.attachment.type === "fork_briefing" ||
      n.attachment.type === "thinking_stripped" ||
      n.attachment.type === "advisor_stripped",
  );
}
//@ chunk-e6aww6q8.js:2408569-2408581 layout
/**
 * 100。
 */
var COLD_COMPACT_TRUNCATE_CHARS = 100;
//@ chunk-e6aww6q8.js:2408581-2408748 layout
/**
 * 字符串超过 100 字符时截断并标注原长度（避开代理对）。
 */
function truncateForColdCompact(e) {
  if (e.length <= COLD_COMPACT_TRUNCATE_CHARS) return e;
  let n = COLD_COMPACT_TRUNCATE_CHARS;
  let code = e.charCodeAt(n - 1);
  if (code >= 55296 && code <= 56319) n--;
  return `${e.slice(0, n)}\u2026[truncated, original ${e.length} chars]`;
}
//@ chunk-e6aww6q8.js:2408748-2409016 layout
/**
 * 递归截断对象/数组里的所有字符串（未变时返回原对象）。旧版名 shouldExcludeFromPostCompactRestore 为错配。
 */
function truncateStringsDeep(e) {
  if (typeof e === "string") return truncateForColdCompact(e);
  if (Array.isArray(e)) {
    let mapped = e.map(truncateStringsDeep);
    return mapped.some((r, s) => r !== e[s]) ? mapped : e;
  }
  if (typeof e === "object" && e !== null) {
    let n = e;
    let r = false;
    let s = {};
    for (let [key, value] of Object.entries(n)) {
      let S = truncateStringsDeep(value);
      if (S !== value) r = true;
      s[key] = S;
    }
    return r ? s : e;
  }
  return e;
}
//@ chunk-e6aww6q8.js:2409016-2409053 layout
/**
 * 块是对象且为 thinking/redacted_thinking。
 */
function isThinkingContentBlock(e) {
  return isObjectBlock(e) && isThinkingBlock(e);
}
//@ chunk-e6aww6q8.js:2409053-2409880 layout
/**
 * 冷压缩：去掉 assistant 的 thinking 块、截断 tool_use 输入与 tool_result 文本到 100 字符，丢弃 wire 回显字段。
 */
function stripNonEssentialContent(messages) {
  return messages.map((message) => {
    if (message.type === "assistant") {
      let content = message.message.content;
      if (!Array.isArray(content)) return message;
      let any = content.some(isThinkingContentBlock);
      let content_2 = (any ? content.filter((L) => !isThinkingContentBlock(L)) : content).map((L) => {
        if (!isObjectBlock(L) || L.type !== "tool_use") return L;
        let G = truncateStringsDeep(L.input);
        if (G === L.input) return L;
        any = true;
        return {
          ...L,
          input: G,
        };
      });
      if (!any && message.wireToolInputs === undefined && message.wireIngestContext === undefined)
        return message;
      let { wireToolInputs, wireIngestContext, ...w } = message;
      return {
        ...w,
        message: {
          ...message.message,
          content: content_2,
        },
      };
    }
    if (message.type === "user") {
      let content = message.message.content;
      if (!Array.isArray(content)) return message;
      let s = false;
      let content_2 = content.map((y) => {
        if (!isObjectBlock(y) || y.type !== "tool_result") return y;
        let S =
          typeof y.content === "string"
            ? y.content
            : Array.isArray(y.content)
              ? extractTextContent_2(y.content.filter(isObjectBlock))
              : "";
        let w = truncateForColdCompact(S);
        if (y.content === w) return y;
        s = true;
        return {
          ...y,
          content: w,
        };
      });
      if (!s) return message;
      return {
        ...message,
        message: {
          ...message.message,
          content: content_2,
        },
      };
    }
    return message;
  });
}
//@ chunk-e6aww6q8.js:2409880-2409988 fingerprint = ERROR_MESSAGE_NOT_ENOUGH_MESSAGES (0.667)
/**
 * 截头后插在开头的 meta 用户消息文本。
 */
var ERROR_MESSAGE_NOT_ENOUGH_MESSAGES = "Not enough messages to compact.";
var MAX_PTL_RETRIES = 3;
var PTL_RETRY_MARKER = "[earlier conversation truncated for compaction retry]";
//@ chunk-e6aww6q8.js:2409988-2410031 layout
/**
 * 按错误里给出的超出量（getPromptTooLongGap）截掉开头的消息组。
 */
function truncateHeadForPromptTooLong(messages, summaryResponse, mediaStripped) {
  return truncateHeadForPTLRetry(messages, getPromptTooLongGap(summaryResponse), mediaStripped);
}
//@ chunk-e6aww6q8.js:2410031-2410438 fingerprint = truncateHeadForPTLRetry (1)
/**
 * 摘要请求 prompt too long 时丢弃最早的若干 API 轮次组：有超出量就丢到够为止，否则丢 20%；至少保留一组；开头变成 assistant 时补 PTL_RETRY_MARKER 用户消息。
 */
function truncateHeadForPTLRetry(messages, n, r) {
  let input =
    messages[0]?.type === "user" && messages[0].isMeta && messages[0].message.content === PTL_RETRY_MARKER
      ? messages.slice(1)
      : messages;
  let groups = groupByApiRound(input);
  if (groups.length < 2) return null;
  let dropCount;
  if (n !== undefined) {
    let acc = 0;
    dropCount = 0;
    for (let group of groups) {
      acc += roughTokenCountEstimationForMessages(r ? stripImagesFromMessages(group) : group);
      dropCount++;
      if (acc >= n) break;
    }
  } else dropCount = Math.max(1, Math.floor(groups.length * 0.2));
  dropCount = Math.min(dropCount, groups.length - 1);
  if (dropCount < 1) return null;
  let sliced = groups.slice(dropCount).flat();
  if (sliced[0]?.type === "assistant")
    return [
      createUserMessage({
        content: PTL_RETRY_MARKER,
        isMeta: true,
      }),
      ...sliced,
    ];
  return sliced;
}
//@ chunk-e6aww6q8.js:2410438-2410569 fingerprint = ERROR_MESSAGE_PROMPT_TOO_LONG (0.667)
/**
 * "Compaction blocked by PreCompact hook"。
 */
var ERROR_MESSAGE_PROMPT_TOO_LONG =
  "Conversation too long. Press esc twice to go up a few messages and try again.";
var COMPACTION_BLOCKED_BY_HOOK = "Compaction blocked by PreCompact hook";
//@ chunk-e6aww6q8.js:2410569-2410874 layout
/**
 * PreCompact 钩子返回 blockedBy 时记日志、（非自动时）通知，并抛 CompactionError。
 */
function throwIfPreCompactHookBlocked(preCompactHookResult, onNotification, r) {
  if (!preCompactHookResult.blockedBy) return;
  logForDebugging(`Compaction blocked by PreCompact hook: ${preCompactHookResult.blockedBy}`, {
    level: "warn",
  });
  if (!r?.suppressNotification)
    onNotification?.({
      key: "compaction-blocked-by-hook",
      text: "compaction blocked by PreCompact hook",
      priority: "immediate",
      color: "warning",
    });
  throw new CompactionError(`${COMPACTION_BLOCKED_BY_HOOK}: ${preCompactHookResult.blockedBy}`);
}
//@ chunk-e6aww6q8.js:2410874-2410971 fingerprint = ERROR_MESSAGE_INCOMPLETE_RESPONSE (1)
/**
 * 压缩被中断（网络问题）的提示文本。
 */
var ERROR_MESSAGE_INCOMPLETE_RESPONSE =
  "Compaction interrupted \xB7 This may be due to network issues \u2014 please try again.";
//@ chunk-e6aww6q8.js:2410971-2410995 layout
/**
 * 压缩专用错误类（无摘要、API 错误、钩子阻断）。
 */
class CompactionError extends Error {}
//@ chunk-e6aww6q8.js:2410995-2411131 fingerprint = buildPostCompactMessages (0.919)
/**
 * 按顺序拼出压缩后的消息：边界标记、摘要消息、替换段、保留消息、附件、钩子结果。
 */
function buildPostCompactMessages(result) {
  return [
    result.boundaryMarker,
    ...result.summaryMessages,
    ...(result.replacement ?? []),
    ...result.messagesToKeep,
    ...result.attachments,
    ...result.hookResults,
  ];
}
//@ chunk-e6aww6q8.js:2411131-2411731 layout
/**
 * 自动模式分类器因上下文过长无法审查而触发压缩时，生成 critical_system_reminder（说明哪些工具调用未执行）。
 */
function createClassifierOverflowReminder(e, n) {
  if (e === 0)
    return createAttachmentMessage_2({
      type: "critical_system_reminder",
      content: "The conversation was compacted because it had become too long for auto mode's classifier.",
    });
  let r = e === 1;
  let s = r ? `an earlier tool call (${n.join(", ")})` : `${e} earlier tool calls (${n.join(", ")})`;
  return createAttachmentMessage_2({
    type: "critical_system_reminder",
    content: `Auto mode could not review ${s} because the conversation was too long for its classifier, so ${r ? "that call" : "those calls"} did not run. The conversation has now been compacted. If still needed, issue ${r ? "it" : "them"} again and ${r ? "it" : "they"} will be reviewed normally.`,
  });
}
//@ chunk-e6aww6q8.js:2411731-2411848 layout = buildPostCompactMessages (0.801)
/**
 * 同 buildPostCompactMessages 但不含 messagesToKeep（queryLoop 产出压缩后行用）。
 */
function buildPostCompactMessagesWithoutKept(result) {
  return [
    result.boundaryMarker,
    ...result.summaryMessages,
    ...(result.replacement ?? []),
    ...result.attachments,
    ...result.hookResults,
  ];
}
//@ chunk-e6aww6q8.js:2411848-2411982 layout
/**
 * 按出现顺序去重 uuid（重复时保留最后一次出现的位置）。
 */
function uniqueUuidsKeepLast(e) {
  let n = new Set();
  let r = [];
  for (let idx = e.length - 1; idx >= 0; idx--) {
    let { uuid } = e[idx];
    if (!n.has(uuid)) {
      n.add(uuid);
      r.push(uuid);
    }
  }
  return r.reverse();
}
//@ chunk-e6aww6q8.js:2411982-2412250 fingerprint = annotateBoundaryWithPreservedSegment (0.786)
/**
 * 在边界消息 compactMetadata 上记录保留段（preservedSegment head/anchor/tail）与保留消息 uuid。
 */
function annotateBoundaryWithPreservedSegment(boundary, anchorUuid, r, s = r) {
  let h = uniqueUuidsKeepLast(r);
  let y = uniqueUuidsKeepLast(cleanMessagesForLogging([...r], s));
  if (h.length === 0) return boundary;
  return {
    ...boundary,
    compactMetadata: {
      ...boundary.compactMetadata,
      ...(y.length > 0 && {
        preservedSegment: {
          headUuid: y[0],
          anchorUuid,
          tailUuid: y.at(-1),
        },
      }),
      preservedMessages: {
        anchorUuid,
        uuids: y,
        allUuids: h,
      },
    },
  };
}
//@ chunk-e6aww6q8.js:2412250-2412873 layout
/**
 * 保留的尾部若含 thinking 块，按模型 thinking 模式决定是否全部剥离；剥离时返回 thinking_stripped 标记附件。
 */
function decideKeptThinkingStrip(messagesToKeep, n) {
  let thinkingBlockCount = 0;
  for (let w of messagesToKeep)
    if (w.type === "assistant") thinkingBlockCount += count(w.message.content, isThinkingBlock);
  if (thinkingBlockCount === 0)
    return {
      marker: undefined,
      thinkingBlockCount,
      decidedBy: undefined,
    };
  let runtimeModel = getRuntimeMainLoopModel({
    permissionMode: getToolPermissionContext(n).mode,
    mainLoopModel: getMainLoopModel_2(n),
  });
  let h = runtimeModel.includes("application-inference-profile")
    ? (getInferenceProfileBackingModelCached(stripAnyVersatileSuffix(runtimeModel)) ?? runtimeModel)
    : runtimeModel;
  let y = modelSupportsAdaptiveThinking({
    runtimeOverride: getThinkingTypeOverride(runtimeModel),
    resolvedModel: h,
    canonicalModel: getCanonicalName(h),
  });
  let stripDecision = keptThinkingStripDecision(y);
  logForDebugging(
    `compact: kept tail holds ${thinkingBlockCount} thinking block(s); strip=${stripDecision.strip ? "on" : "off"} (decided by ${stripDecision.source}; model=${runtimeModel}, thinking=${y})`,
    {
      level: "info",
    },
  );
  return {
    marker: stripDecision.strip
      ? createAttachmentMessage_2({
          type: "thinking_stripped",
          scope: "all",
        })
      : undefined,
    thinkingBlockCount,
    decidedBy: stripDecision.source,
  };
}
//@ chunk-e6aww6q8.js:2412873-2412948 layout
/**
 * 合并用户自定义压缩指令与 PreCompact 钩子新增指令（空行分隔）。
 */
function mergeHookInstructions(userInstructions, hookInstructions) {
  if (!hookInstructions) return userInstructions || undefined;
  if (!userInstructions) return hookInstructions;
  return `${userInstructions}

${hookInstructions}`;
}
//@ chunk-e6aww6q8.js:2412948-2413032 layout
/**
 * 非 API 错误、非虚拟的 assistant 消息。
 */
function isRealAssistantMessage(e) {
  return e.type === "assistant" && !e.isApiErrorMessage && e.isVirtual !== true;
}
//@ chunk-e6aww6q8.js:2413032-2413151 layout
/**
 * 最后一条真实 assistant 或 tool_result 用户消息之后的位置（摘要回复审计用）。
 */
function getIndexAfterLastAssistantOrToolResult(e) {
  return (
    1 +
    Math.max(
      e.findLastIndex(isRealAssistantMessage),
      e.findLastIndex((n) => n.type === "user" && n.isVirtual !== true && isToolResultMessage(n)),
    )
  );
}
//@ chunk-e6aww6q8.js:2413151-2413235 layout
/**
 * 真实的用户输入消息（非 meta、非虚拟、非合成、非 tool_result）。
 */
function isHumanPromptMessage(e) {
  return (
    e.type === "user" &&
    !e.isMeta &&
    e.isVirtual !== true &&
    !isSyntheticMessage(e) &&
    !isToolResultMessage(e)
  );
}
//@ chunk-e6aww6q8.js:2413235-2419147 fingerprint = compactConversation (0.673)
/**
 * 整段压缩：PreCompact 钩子 → 选摘要提示词变体（qee，tengu_curried_trinket）→ streamCompactSummary（prompt too long 时 truncateHeadForPTLRetry 最多 3 次）→ 校验摘要 → 清空 readFileState → buildPostCompactAttachments → 边界消息（compact_boundary，含 preTokens/postTokens）与摘要用户消息（isCompactSummary）→ tengu_compact 遥测 → PostCompact 钩子。返回 CompactionResult。
 */
async function compactConversation(messages, context, cacheSafeParams, suppressFollowUpQuestions, options) {
  let { customInstructions } = options ?? {};
  let {
    isAutoCompact = false,
    recompactionInfo,
    stripNonEssential = false,
    spinnerHintText,
    onNotification,
    onResponseLength,
  } = options ?? {};
  let outcomeMetricKey = isAutoCompact ? "compact_auto" : "compact_manual";
  let lastMainRequestId = getLastMainRequestId();
  let errorMessage;
  let preCompactTokenCount;
  let postCompactTokens;
  let startTime = performance.now();
  let compactionSpan = endToolExecutionSpan_2("claude_code.compaction", {
    spanType: "compaction",
    attrs: {
      trigger: isAutoCompact ? "auto" : "manual",
      message_count: messages.length,
    },
  });
  try {
    if (messages.length === 0) {
      logFeatureBad(outcomeMetricKey, "compact_not_enough_messages");
      throw Error(ERROR_MESSAGE_NOT_ENOUGH_MESSAGES);
    }
    preCompactTokenCount = estimateTokensWithAnchor(messages);
    let appState = context.getAppState();
    noopAsync_3(getToolPermissionContext(context), "summary");
    context.onCompactEvent?.({
      type: "compact_progress",
      event: {
        type: "hooks_start",
        hookType: "pre_compact",
      },
    });
    context.onCompactEvent?.({
      type: "sdk_status",
      status: "compacting",
    });
    let preCompactHookResult = await executePreCompactHooks(
      context.session,
      {
        trigger: isAutoCompact ? "auto" : "manual",
        customInstructions: customInstructions ?? null,
      },
      context,
      context.abortController.signal,
    );
    throwIfPreCompactHookBlocked(preCompactHookResult, onNotification, {
      suppressNotification: isAutoCompact,
    });
    customInstructions = mergeHookInstructions(
      customInstructions,
      preCompactHookResult.newCustomInstructions,
    );
    let userDisplayMessage = preCompactHookResult.userDisplayMessage;
    context.onCompactEvent?.({
      type: "stream_mode",
      mode: "requesting",
    });
    onResponseLength?.({
      type: "response_length",
      op: "reset",
    });
    context.onCompactEvent?.({
      type: "compact_progress",
      event: {
        type: "compact_start",
        hintText: spinnerHintText,
      },
    });
    let promptCacheSharingEnabled =
      !stripNonEssential && getFeatureValue_CACHED_MAY_BE_STALE("tengu_compact_cache_prefix", true);
    let summaryPromptArm = compactPromptVariant();
    let transcriptPath = compactTranscriptPath(context);
    let compactPromptText = getCompactPrompt(
      customInstructions,
      summaryPromptArm,
      transcriptPath !== undefined,
    );
    let summaryRequest = createUserMessage({
      content: compactPromptText,
    });
    let messagesToSummarize = messages;
    let summaryCacheSafeParams = cacheSafeParams;
    let summaryResponse;
    let summaryText;
    let ptlAttempts = 0;
    for (;;) {
      let streamResult = await streamCompactSummary({
        messages: messagesToSummarize,
        summaryRequest,
        appState,
        context,
        preCompactTokenCount,
        cacheSafeParams: summaryCacheSafeParams,
        stripNonEssential,
        onResponseLength,
        compactionRequestKind: isAutoCompact ? "auto" : "manual",
      });
      summaryResponse = streamResult.response;
      summaryText = getAssistantMessageText(summaryResponse);
      if (!summaryText?.startsWith(PROMPT_TOO_LONG_ERROR_MESSAGE)) break;
      ptlAttempts++;
      let truncatedMessages =
        ptlAttempts <= MAX_PTL_RETRIES && context.compactionApiAttemptsLeft?.count !== 0
          ? truncateHeadForPromptTooLong(messagesToSummarize, summaryResponse, streamResult.mediaStripped)
          : null;
      if (!truncatedMessages) {
        logEvent("tengu_compact_failed", {
          reason: lit_2("prompt_too_long"),
          preCompactTokenCount,
          promptCacheSharingEnabled,
          ptlAttempts,
        });
        logFeatureBad(outcomeMetricKey, "compact_prompt_too_long");
        throw Error(ERROR_MESSAGE_PROMPT_TOO_LONG);
      }
      logEvent("tengu_compact_ptl_retry", {
        attempt: ptlAttempts,
        droppedMessages: messagesToSummarize.length - truncatedMessages.length,
        remainingMessages: truncatedMessages.length,
      });
      messagesToSummarize = truncatedMessages;
      summaryCacheSafeParams = {
        ...summaryCacheSafeParams,
        forkContextMessages: truncatedMessages,
      };
    }
    if (!summaryText) {
      logForDebugging(
        `Compact failed: no summary text in response. Response: ${jsonStringify(summaryResponse)}`,
        {
          level: "error",
        },
      );
      logEvent("tengu_compact_failed", {
        reason: lit_2("no_summary"),
        preCompactTokenCount,
        promptCacheSharingEnabled,
      });
      logFeatureBad(outcomeMetricKey, "compact_no_summary");
      throw new CompactionError(
        "Failed to generate conversation summary - response did not contain valid text content",
      );
    } else if (summaryResponse.isApiErrorMessage || startsWithApiErrorPrefix(summaryText)) {
      logEvent("tengu_compact_failed", {
        reason: lit_2("api_error"),
        errorPrefix: compactFailureCode(summaryResponse),
        status: summaryResponse.apiErrorStatus,
        preCompactTokenCount,
        promptCacheSharingEnabled,
      });
      logFeatureBad(outcomeMetricKey, "compact_api_error");
      throw withTelemetryMessage(
        new CompactionError(summaryText),
        "compactConversation: api_error (summary text redacted)",
      );
    }
    logSummaryReply({
      path: "full",
      reply: summaryText,
      sent: messagesToSummarize,
      outputTokens: getTokenUsage(summaryResponse)?.output_tokens,
      stopReason: summaryResponse.message.stop_reason,
      attempt: undefined,
    });
    let preCompactReadFileState = remoteFileStateToObject(context.readFileState);
    context.readFileState.clear();
    resetPickerState(context.memorySelector);
    let { attachments, hookResults: hookMessages } = await buildPostCompactAttachments(
      preCompactReadFileState,
      context,
      [],
      "compact_full",
      messages,
      isMainQueryCompaction(recompactionInfo?.querySource, context.agentId),
    );
    let durationMs = Math.round(performance.now() - startTime);
    let boundaryMarker = createCompactBoundaryMessage(
      isAutoCompact ? "auto" : "manual",
      preCompactTokenCount ?? 0,
      messages.at(-1)?.uuid,
    );
    let discoveredToolNames = getDiscoveredToolNames(messages, context);
    if (discoveredToolNames.size > 0)
      boundaryMarker.compactMetadata.preCompactDiscoveredTools = [...discoveredToolNames].sort();
    stampPreCompactReadVersions(boundaryMarker, context.agentId, context.getAppState());
    let summaryMessages = [
      createUserMessage({
        ...buildCompactArtifactNote(summaryText, {
          suppressFollowUpQuestions,
          promptArm: summaryPromptArm,
          transcriptPath,
          ...false,
          headTruncated: ptlAttempts > 0,
          foreignArtifactContent: messagesContainUntrustedContent(messages),
          toolNamesUsed: getToolsUsedForSummary(messages, context.agentContext, context.agentId),
        }),
        isCompactSummary: true,
        isVisibleInTranscriptOnly: true,
      }),
    ].map((So) => withTurnPosition(So, messages));
    let postCompactTokenCount = tokenCountFromLastAPIResponse([summaryResponse]);
    let truePostCompactTokenCount = roughTokenCountEstimationForMessages([
      boundaryMarker,
      ...summaryMessages,
      ...attachments,
      ...hookMessages,
    ]);
    boundaryMarker.compactMetadata.postTokens = truePostCompactTokenCount;
    boundaryMarker.compactMetadata.durationMs = durationMs;
    setCumulativeDroppedTokens(boundaryMarker, messages);
    postCompactTokens = truePostCompactTokenCount;
    let compactionUsage = getTokenUsage(summaryResponse);
    let effortLevel = getEffortLevelIfSupported(
      context.options.mainLoopModel,
      getEffortValue(context),
      getEffortLayerOverride(context.permissionLayers),
    );
    logEvent("tengu_compact", {
      preCompactTokenCount,
      stripNonEssential,
      postCompactTokenCount,
      truePostCompactTokenCount,
      autoCompactThreshold: recompactionInfo?.autoCompactThreshold ?? -1,
      willRetriggerNextTurn:
        recompactionInfo !== undefined && truePostCompactTokenCount >= recompactionInfo.autoCompactThreshold,
      isAutoCompact,
      ptlAttempts,
      ...(effortLevel && {
        effort_level: fromEnum(effortLevel),
      }),
      querySource: agentTypeForTelemetry(
        recompactionInfo?.querySource ?? context.options.querySource ?? "unknown",
      ),
      queryChainId: sanitizeMarkName(context.queryTracking?.chainId) ?? lit_2(""),
      queryDepth: context.queryTracking?.depth ?? -1,
      isRecompactionInChain: recompactionInfo?.isRecompactionInChain ?? false,
      turnsSincePreviousCompact: recompactionInfo?.turnsSincePreviousCompact ?? -1,
      previousCompactTurnId:
        sanitizeMarkName(recompactionInfo?.previousCompactTurnId || undefined) ?? lit_2(""),
      compactionInputTokens: compactionUsage?.input_tokens,
      compactionOutputTokens: compactionUsage?.output_tokens,
      compactionCacheReadTokens: compactionUsage?.cache_read_input_tokens ?? 0,
      compactionCacheCreationTokens: compactionUsage?.cache_creation_input_tokens ?? 0,
      compactionTotalTokens: compactionUsage
        ? compactionUsage.input_tokens +
          (compactionUsage.cache_creation_input_tokens ?? 0) +
          (compactionUsage.cache_read_input_tokens ?? 0) +
          compactionUsage.output_tokens
        : 0,
      promptCacheSharingEnabled,
      summaryPromptArm: fromEnum(summaryPromptArm),
      ...(() => {
        try {
          return tokenStatsToStatsigMetrics(analyzeContext(messages));
        } catch (error) {
          logError(error);
          return {};
        }
      })(),
    });
    notifyCompaction(context.agentId);
    if (isMainQuerySource(recompactionInfo?.querySource)) {
      await reAppendSessionMetadataAfterCompaction(context.storageV5);
      markPostCompaction(postCompactTokens ?? 0);
    }
    context.onCompactEvent?.({
      type: "compact_progress",
      event: {
        type: "hooks_start",
        hookType: "post_compact",
      },
    });
    let postCompactHookResult = await executePostCompactHooks(
      context.session,
      {
        trigger: isAutoCompact ? "auto" : "manual",
        compactSummary: summaryText,
      },
      context,
      context.abortController.signal,
    );
    let userDisplayMessages = [userDisplayMessage, postCompactHookResult.userDisplayMessage].filter(Boolean)
      .join(`
`);
    if (ptlAttempts > 0) logFeatureSad(outcomeMetricKey, "compact_head_dropped");
    else logFeatureOk(outcomeMetricKey);
    if (classifyQuerySource(recompactionInfo?.querySource ?? context.options.querySource) === "main")
      notePendingConversationEdit("compact");
    if (isMainQueryCompaction(recompactionInfo?.querySource, context.agentId)) {
      armPendingContextCompacted(isAutoCompact ? "auto" : "manual", lastMainRequestId);
      onLastMainRequestReplaced(lastMainRequestId);
    }
    return {
      boundaryMarker,
      summaryMessages,
      messagesToKeep: [],
      attachments,
      hookResults: hookMessages,
      userDisplayMessage: userDisplayMessages || undefined,
      preCompactTokenCount,
      postCompactTokenCount,
      truePostCompactTokenCount,
      compactionUsage,
      ptlAttempts,
      promptCacheSharingEnabled,
    };
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "compaction failed";
    if (!isAutoCompact) addErrorNotificationIfNeeded(error, onNotification);
    throw error;
  } finally {
    context.onCompactEvent?.({
      type: "stream_mode",
      mode: "requesting",
    });
    onResponseLength?.({
      type: "response_length",
      op: "reset",
    });
    context.onCompactEvent?.({
      type: "compact_progress",
      event: {
        type: "compact_end",
      },
    });
    logCompactionEvent(
      {
        trigger: isAutoCompact ? "auto" : "manual",
        success: !errorMessage,
        durationMs: performance.now() - startTime,
        preTokens: preCompactTokenCount,
        postTokens: postCompactTokens,
        error: errorMessage,
      },
      context.agentContext,
    );
    if (compactionSpan) {
      noopEndToolExecutionSpan(compactionSpan, {
        ...(preCompactTokenCount !== undefined && {
          pre_compact_tokens: preCompactTokenCount,
        }),
        ...(postCompactTokens !== undefined && {
          post_compact_tokens: postCompactTokens,
        }),
        success: !errorMessage,
      });
      if (errorMessage) setSpanError(compactionSpan, errorMessage);
      compactionSpan.end();
    }
    context.onCompactEvent?.({
      type: "sdk_status",
      status: null,
      metadata: {
        compactResult: errorMessage ? "failed" : "success",
        ...(errorMessage && {
          compactError: errorMessage,
        }),
      },
    });
  }
}
//@ chunk-e6aww6q8.js:2419147-2424722 fingerprint = partialCompactConversation (0.726)
/**
 * 部分压缩（消息选择器）：direction=from 摘要选中点之后、保留之前；up_to 摘要之前、保留之后（保留部分可能剥离 thinking）。流程同 compactConversation，用 getPartialCompactPrompt，边界消息记录 userFeedback 与摘要条数，tengu_partial_compact 遥测。
 */
async function partialCompactConversation(messages, pivotIndex, context, cacheSafeParams, h) {
  let { userFeedback, direction = "from", onNotification, onResponseLength } = h ?? {};
  let lastMainRequestId = getLastMainRequestId();
  let errorMessage;
  let preTokens;
  let Se;
  let startTime = performance.now();
  try {
    let messagesToSummarize =
      direction === "up_to" ? messages.slice(0, pivotIndex) : messages.slice(pivotIndex);
    let messagesToKeep =
      direction === "up_to"
        ? messages
            .slice(pivotIndex)
            .filter(
              (m) =>
                m.type !== "progress" &&
                !isCompactBoundaryMessage_3(m) &&
                !(m.type === "user" && m.isCompactSummary),
            )
        : messages.slice(0, pivotIndex).filter((m) => m.type !== "progress");
    if (messagesToSummarize.length === 0)
      throw Error(
        direction === "up_to"
          ? "Nothing to summarize before the selected message."
          : "Nothing to summarize after the selected message.",
      );
    let appendedMarkerCount = 0;
    let Ie = false;
    let keptThinkingInfo =
      direction === "up_to" ? decideKeptThinkingStrip(messagesToKeep, context) : undefined;
    if (direction === "up_to") {
      if (keptThinkingInfo?.marker) {
        messagesToKeep.push(keptThinkingInfo.marker);
        appendedMarkerCount++;
        Ie = true;
      }
    } else {
      let vn = messagesToKeep.some((co) => co.type === "assistant")
        ? computeThinkingStrippedScope(messagesToKeep, messagesToSummarize)
        : undefined;
      if (vn) {
        messagesToKeep.push(createAttachmentMessage_2(vn));
        appendedMarkerCount++;
      }
      if (
        messagesToKeep.some((co) => co.type === "assistant") &&
        messagesToSummarize.some(
          (co) => co.type === "attachment" && co.attachment.type === "advisor_stripped",
        )
      ) {
        messagesToKeep.push(
          createAttachmentMessage_2({
            type: "advisor_stripped",
          }),
        );
        appendedMarkerCount++;
      }
    }
    let keptMessagesWithoutMarkers =
      appendedMarkerCount > 0 ? messagesToKeep.slice(0, -appendedMarkerCount) : messagesToKeep;
    let preCompactTokenCount = estimateTokensWithAnchor(messages);
    preTokens = preCompactTokenCount;
    context.onCompactEvent?.({
      type: "compact_progress",
      event: {
        type: "hooks_start",
        hookType: "pre_compact",
      },
    });
    context.onCompactEvent?.({
      type: "sdk_status",
      status: "compacting",
    });
    let preCompactHookResult = await executePreCompactHooks(
      context.session,
      {
        trigger: "manual",
        customInstructions: null,
      },
      context,
      context.abortController.signal,
    );
    throwIfPreCompactHookBlocked(preCompactHookResult, onNotification);
    let customInstructions = mergeHookInstructions(
      preCompactHookResult.newCustomInstructions,
      userFeedback ? `User context: ${userFeedback}` : undefined,
    );
    context.onCompactEvent?.({
      type: "stream_mode",
      mode: "requesting",
    });
    onResponseLength?.({
      type: "response_length",
      op: "reset",
    });
    context.onCompactEvent?.({
      type: "compact_progress",
      event: {
        type: "compact_start",
      },
    });
    let compactPrompt = getPartialCompactPrompt(customInstructions, direction);
    let summaryRequest = createUserMessage({
      content: compactPrompt,
    });
    let failureMetadata = {
      preCompactTokenCount,
      direction: fromEnum(direction),
      messagesSummarized: messagesToSummarize.length,
    };
    let summaryInputMessages = direction === "up_to" ? messagesToSummarize : messages;
    let summaryCacheSafeParams =
      direction === "up_to"
        ? {
            ...cacheSafeParams,
            forkContextMessages: messagesToSummarize,
          }
        : cacheSafeParams;
    let summaryResponse;
    let summaryText;
    let ptlAttempts = 0;
    for (;;) {
      let vn = await streamCompactSummary({
        messages: summaryInputMessages,
        summaryRequest,
        appState: context.getAppState(),
        context,
        preCompactTokenCount,
        cacheSafeParams: summaryCacheSafeParams,
        onResponseLength,
        thinkingStripPlan: collectThinkingStripPlan(messages),
        advisorStripPlan: getAdvisorStrippedMessageIds(messages),
        compactionRequestKind: "manual",
      });
      summaryResponse = vn.response;
      summaryText = getAssistantMessageText(summaryResponse);
      if (!summaryText?.startsWith(PROMPT_TOO_LONG_ERROR_MESSAGE)) break;
      ptlAttempts++;
      let truncatedMessages =
        ptlAttempts <= MAX_PTL_RETRIES
          ? truncateHeadForPromptTooLong(summaryInputMessages, summaryResponse, vn.mediaStripped)
          : null;
      if (!truncatedMessages) {
        logEvent("tengu_partial_compact_failed", {
          reason: lit_2("prompt_too_long"),
          ...failureMetadata,
          ptlAttempts,
        });
        logFeatureBad("compact_partial", "compact_partial_prompt_too_long");
        throw Error(ERROR_MESSAGE_PROMPT_TOO_LONG);
      }
      logEvent("tengu_compact_ptl_retry", {
        attempt: ptlAttempts,
        droppedMessages: summaryInputMessages.length - truncatedMessages.length,
        remainingMessages: truncatedMessages.length,
        path: lit_2("partial"),
      });
      summaryInputMessages = truncatedMessages;
      summaryCacheSafeParams = {
        ...summaryCacheSafeParams,
        forkContextMessages: truncatedMessages,
      };
    }
    if (!summaryText) {
      logEvent("tengu_partial_compact_failed", {
        reason: lit_2("no_summary"),
        ...failureMetadata,
      });
      logFeatureBad("compact_partial", "compact_partial_no_summary");
      throw new CompactionError(
        "Failed to generate conversation summary - response did not contain valid text content",
      );
    } else if (summaryResponse.isApiErrorMessage || startsWithApiErrorPrefix(summaryText)) {
      logEvent("tengu_partial_compact_failed", {
        reason: lit_2("api_error"),
        errorPrefix: compactFailureCode(summaryResponse),
        status: summaryResponse.apiErrorStatus,
        ...failureMetadata,
      });
      logFeatureBad("compact_partial", "compact_partial_api_error");
      throw withTelemetryMessage(
        new CompactionError(summaryText),
        "partialCompactConversation: api_error (summary text redacted)",
      );
    }
    logSummaryReply({
      path: "partial",
      reply: summaryText,
      sent: summaryInputMessages,
      outputTokens: getTokenUsage(summaryResponse)?.output_tokens,
      stopReason: summaryResponse.message.stop_reason,
      attempt: undefined,
    });
    let preCompactReadFileState = remoteFileStateToObject(context.readFileState);
    context.readFileState.clear();
    resetPickerState(context.memorySelector);
    let { attachments, hookResults } = await buildPostCompactAttachments(
      preCompactReadFileState,
      context,
      messagesToKeep,
      "compact_partial",
      messages,
      isMainQueryCompaction(undefined, context.agentId),
    );
    let postCompactTokenCount = tokenCountFromLastAPIResponse([summaryResponse]);
    let compactionUsage = getTokenUsage(summaryResponse);
    let effortLevelIfSupported = getEffortLevelIfSupported(
      context.options.mainLoopModel,
      getEffortValue(context),
      getEffortLayerOverride(context.permissionLayers),
    );
    logEvent("tengu_partial_compact", {
      preCompactTokenCount,
      postCompactTokenCount,
      messagesKept: keptMessagesWithoutMarkers.length,
      messagesSummarized: messagesToSummarize.length,
      ...(effortLevelIfSupported && {
        effort_level: fromEnum(effortLevelIfSupported),
      }),
      direction: fromEnum(direction),
      hasUserFeedback: !!userFeedback,
      keptThinkingBlockCount: keptThinkingInfo?.thinkingBlockCount ?? 0,
      keptThinkingStripped: direction === "up_to" && Ie,
      keptThinkingStripDecidedBy: fromEnumOpt(keptThinkingInfo?.decidedBy),
      trigger: lit_2("message_selector"),
      compactionInputTokens: compactionUsage?.input_tokens,
      compactionOutputTokens: compactionUsage?.output_tokens,
      compactionCacheReadTokens: compactionUsage?.cache_read_input_tokens ?? 0,
      compactionCacheCreationTokens: compactionUsage?.cache_creation_input_tokens ?? 0,
    });
    let lastPreCompactUuid =
      direction === "up_to"
        ? messages.slice(0, pivotIndex).findLast((m) => m.type !== "progress")?.uuid
        : keptMessagesWithoutMarkers.at(-1)?.uuid;
    let boundaryMarker = createCompactBoundaryMessage(
      "manual",
      preCompactTokenCount ?? 0,
      lastPreCompactUuid,
      userFeedback,
      messagesToSummarize.length,
    );
    let discoveredToolNames = getDiscoveredToolNames(messages, context);
    if (discoveredToolNames.size > 0)
      boundaryMarker.compactMetadata.preCompactDiscoveredTools = [...discoveredToolNames].sort();
    stampPreCompactReadVersions(boundaryMarker, context.agentId, context.getAppState());
    boundaryMarker.compactMetadata.durationMs = Math.round(performance.now() - startTime);
    let transcriptPath = compactTranscriptPath(context);
    let summaryMessages = [
      createUserMessage({
        ...buildCompactArtifactNote(summaryText, {
          suppressFollowUpQuestions: false,
          transcriptPath,
          ...false,
          foreignArtifactContent: messagesContainUntrustedContent(
            direction === "up_to" ? messagesToSummarize : messages,
          ),
          toolNamesUsed: getToolsUsedForSummary(messages, context.agentContext, context.agentId),
        }),
        isCompactSummary: true,
        ...(messagesToKeep.length > 0
          ? {
              summarizeMetadata: {
                messagesSummarized: messagesToSummarize.length,
                userContext: userFeedback,
                direction,
              },
            }
          : {
              isVisibleInTranscriptOnly: true,
            }),
      }),
    ].map((vn) => withTurnPosition(vn, direction === "up_to" ? messagesToSummarize : messages));
    notifyCompaction(context.agentId);
    await reAppendSessionMetadataAfterCompaction(context.storageV5);
    markPostCompaction(roughTokenCountEstimationForMessages([...summaryMessages, ...messagesToKeep]), {
      keepsCachedPrefix: direction === "from",
    });
    context.onCompactEvent?.({
      type: "compact_progress",
      event: {
        type: "hooks_start",
        hookType: "post_compact",
      },
    });
    let postCompactHookResult = await executePostCompactHooks(
      context.session,
      {
        trigger: "manual",
        compactSummary: summaryText,
      },
      context,
      context.abortController.signal,
    );
    Se = roughTokenCountEstimationForMessages([
      boundaryMarker,
      ...summaryMessages,
      ...messagesToKeep,
      ...attachments,
      ...hookResults,
    ]);
    boundaryMarker.compactMetadata.postTokens = Se;
    setLastMainThreadContextTokens(Se);
    setCumulativeDroppedTokens(boundaryMarker, messages);
    let anchorUuid =
      direction === "up_to" ? (summaryMessages.at(-1)?.uuid ?? boundaryMarker.uuid) : boundaryMarker.uuid;
    logFeatureOk("compact_partial");
    notePendingConversationEdit("compact");
    if (direction === "up_to") onLastMainRequestReplaced(lastMainRequestId);
    return {
      boundaryMarker: annotateBoundaryWithPreservedSegment(
        boundaryMarker,
        anchorUuid,
        keptMessagesWithoutMarkers,
        messages,
      ),
      summaryMessages,
      messagesToKeep,
      attachments,
      hookResults,
      userDisplayMessage: postCompactHookResult.userDisplayMessage,
      preCompactTokenCount,
      postCompactTokenCount,
      compactionUsage,
    };
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "partial compaction failed";
    addErrorNotificationIfNeeded(error, onNotification);
    throw error;
  } finally {
    context.onCompactEvent?.({
      type: "stream_mode",
      mode: "requesting",
    });
    onResponseLength?.({
      type: "response_length",
      op: "reset",
    });
    context.onCompactEvent?.({
      type: "compact_progress",
      event: {
        type: "compact_end",
      },
    });
    logCompactionEvent(
      {
        trigger: "manual",
        success: !errorMessage,
        durationMs: performance.now() - startTime,
        preTokens,
        postTokens: Se,
        error: errorMessage,
      },
      context.agentContext,
    );
    context.onCompactEvent?.({
      type: "sdk_status",
      status: null,
      metadata: {
        compactResult: errorMessage ? "failed" : "success",
        ...(errorMessage && {
          compactError: errorMessage,
        }),
      },
    });
  }
}
//@ chunk-e6aww6q8.js:2424722-2425057 fingerprint = addErrorNotificationIfNeeded (0.853)
/**
 * 手动压缩失败时（非中止/消息不足/钩子阻断）弹出 "Error compacting conversation" 通知。
 */
function addErrorNotificationIfNeeded(error, context) {
  if (
    hasExactErrorMessage(error, API_REQUEST_ABORTED_MESSAGE) ||
    hasExactErrorMessage(error, ERROR_MESSAGE_NOT_ENOUGH_MESSAGES) ||
    errorMessage(error).startsWith(COMPACTION_BLOCKED_BY_HOOK)
  )
    return;
  context?.({
    key: "error-compacting-conversation",
    text: "Error compacting conversation",
    priority: "immediate",
    color: "error",
  });
  enqueueTaskNotification_2({
    type: "system",
    subtype: "notification",
    key: "error-compacting-conversation",
    text: "Error compacting conversation",
    priority: "immediate",
    color: "error",
  });
}
//@ chunk-e6aww6q8.js:2425057-2425187 layout
/**
 * 遥测用：无 / api_error / 第一个内容块类型。
 */
function describeLastAssistantKind(lastAssistant) {
  if (!lastAssistant) return lit_2("none");
  if (lastAssistant.isApiErrorMessage) return lit_2("api_error");
  return fromEnum(lastAssistant.message.content[0]?.type ?? "empty");
}
//@ chunk-e6aww6q8.js:2425187-2425273 layout
/**
 * 从 fallback 模型列表里去掉与当前模型等同的项。
 */
function excludeSameModelFallbacks(e, fallbackModel) {
  return (
    Array.isArray(fallbackModel) ? fallbackModel : fallbackModel !== undefined ? [fallbackModel] : []
  ).filter((s) => !swapShrinksContextWindow(e, s));
}
//@ chunk-e6aww6q8.js:2425273-2425465 fingerprint = createCompactCanUseTool (1)
/**
 * 压缩用的 canUseTool：一律拒绝（"Tool use is not allowed during compaction"）。
 */
function createCompactCanUseTool() {
  return async () => ({
    behavior: "deny",
    message: "Tool use is not allowed during compaction",
    decisionReason: {
      type: "other",
      reason: "compaction agent should only produce text summary",
    },
  });
}
//@ chunk-e6aww6q8.js:2425465-2434278 fingerprint = streamCompactSummary (0.409)
/**
 * 发出摘要请求：默认（tengu_compact_cache_prefix 开）用 runForkedAgent 共享主会话缓存、单轮、拒绝工具；失败或无文本时回退到直连流式请求（去媒体、冷压缩去非必要内容、只带 Read/ToolSearch/MCP 工具定义、按模型/fallback 链与拒答回退重试）。返回 {response, mediaStripped}。
 */
async function streamCompactSummary({
  messages,
  summaryRequest,
  appState,
  context,
  preCompactTokenCount,
  cacheSafeParams,
  stripNonEssential = false,
  onResponseLength,
  thinkingStripPlan,
  advisorStripPlan,
  compactionRequestKind,
}) {
  let Z = !stripNonEssential && getFeatureValue_CACHED_MAY_BE_STALE("tengu_compact_cache_prefix", true);
  let compactingStatusTicker = startCompactingStatusTicker(context.onCompactEvent);
  let compactStreamProgress = createCompactStreamProgress(onResponseLength, context.onCompactEvent);
  try {
    if (Z)
      try {
        let forkResult = await runForkedAgent({
          promptMessages: [summaryRequest],
          cacheSafeParams,
          canUseTool: createCompactCanUseTool(),
          querySource: "compact",
          forkLabel: "compact",
          maxTurns: 1,
          compactionRequestKind,
          apiAttemptsLeft: context.compactionApiAttemptsLeft,
          thinkingStripPlan,
          advisorStripPlan,
          fallbackModel: excludeSameModelFallbacks(
            cacheSafeParams.model ?? context.options.mainLoopModel,
            context.options.fallbackModel,
          ),
          skipCacheWrite: true,
          skipTranscript: true,
          onStreamDelta: compactStreamProgress,
          overrides: {
            abortController: context.abortController,
            onRetryStatus: context.onRetryStatus,
          },
        });
        let lastAssistant = getLastAssistantMessage(forkResult.messages);
        let forkSummaryText = summaryTextOf(forkResult.messages);
        let forkAssistantMessageCount = count(
          forkResult.messages,
          (qt) => qt.type === "assistant" && !qt.isApiErrorMessage,
        );
        if (lastAssistant && forkSummaryText && !lastAssistant.isApiErrorMessage) {
          if (!forkSummaryText.startsWith(PROMPT_TOO_LONG_ERROR_MESSAGE))
            logEvent("tengu_compact_cache_sharing_success", {
              preCompactTokenCount,
              outputTokens: forkResult.totalUsage.output_tokens,
              cacheReadInputTokens: forkResult.totalUsage.cache_read_input_tokens,
              cacheCreationInputTokens: forkResult.totalUsage.cache_creation_input_tokens,
              cacheHitRate:
                forkResult.totalUsage.cache_read_input_tokens > 0
                  ? forkResult.totalUsage.cache_read_input_tokens /
                    (forkResult.totalUsage.cache_read_input_tokens +
                      forkResult.totalUsage.cache_creation_input_tokens +
                      forkResult.totalUsage.input_tokens)
                  : 0,
              forkAssistantMessageCount,
            });
          return {
            response: findSummaryMessage(forkResult.messages) ?? lastAssistant,
            mediaStripped: false,
          };
        }
        if (context.abortController.signal.aborted) throw Error(API_REQUEST_ABORTED_MESSAGE);
        if (lastAssistant && context.compactionApiAttemptsLeft?.count === 0)
          return {
            response: lastAssistant,
            mediaStripped: false,
          };
        logForDebugging(
          `Compact cache sharing: no text in response, falling back. Response: ${jsonStringify(lastAssistant)}`,
          {
            level: "warn",
          },
        );
        logEvent("tengu_compact_cache_sharing_fallback", {
          reason: lit_2("no_text_response"),
          preCompactTokenCount,
          lastAssistantKind: describeLastAssistantKind(lastAssistant),
          assistantTextLength: forkSummaryText?.length ?? 0,
          forkAssistantMessageCount,
          stopReason: fromEnumOpt(
            lastAssistant?.isApiErrorMessage && lastAssistant.message.stop_reason !== "refusal"
              ? undefined
              : (lastAssistant?.message.stop_reason ?? undefined),
          ),
          assistantErrorKind: fromEnumOpt(lastAssistant?.error ?? undefined),
        });
      } catch (error) {
        if (
          context.abortController.signal.aborted ||
          hasExactErrorMessage(error, API_REQUEST_ABORTED_MESSAGE)
        )
          throw Error(API_REQUEST_ABORTED_MESSAGE);
        logError(error);
        logEvent("tengu_compact_cache_sharing_fallback", {
          reason: lit_2("error"),
          preCompactTokenCount,
        });
      }
    let Ee =
      !stripNonEssential &&
      !(context.stickyBetas && toolSearchRejectedOn(context.stickyBetas, context.options.mainLoopModel)) &&
      (await isToolSearchEnabled(
        context.options.mainLoopModel,
        context.options.tools,
        async () => appState.toolPermissionContext,
        context.options.agentDefinitions.activeAgents,
        "compact",
        context.credentials,
        undefined,
        forkStickyBetaLatches(getStickyBetas()),
      ))
        ? Ji(
            [
              FileReadTool,
              ToolSearchTool,
              ...context.options.tools.filter((statusSetter) => statusSetter.isMcp),
            ],
            "name",
          )
        : [FileReadTool];
    let requestMessages = [...messagesSinceCompactBoundary(messages), summaryRequest];
    let assistantMsg = stripImagesFromMessages(
      stripNonEssential ? keepEssentialAttachmentsOnly(requestMessages) : requestMessages,
    );
    let Me = stripNonEssential ? stripNonEssentialContent(assistantMsg) : assistantMsg;
    let summaryModel = cacheSafeParams.model ?? context.options.mainLoopModel;
    let isMainAgent = context.agentId === undefined;
    if (needsOverageConsentForModel(summaryModel, context.requestDialog)) {
      let gt = getUsageCreditsOnlyModelConsentDeclineFallback();
      if (gt === null) {
        let At = isNoModelFallbackEnabled();
        if (isMainAgent)
          logFeatureBad(
            "model_fable_consent",
            At ? "compact_no_model_fallback_env" : "compact_no_allowed_fallback",
          );
        if (At)
          throw Error(
            "Compaction unavailable: CLAUDE_CODE_NO_MODEL_FALLBACK is set and model substitution is disabled \xB7 unset it to allow the swap",
          );
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Compaction unavailable: your model policy only allows ${renderUsageCreditsOnlyModelName(summaryModel)}, which requires usage credits \xB7 /model to set it up`,
          "Compaction unavailable: model policy only allows Fable, which requires usage credits",
        );
      }
      if (isMainAgent) logFeatureSad("model_fable_consent", "compact_substituted");
      summaryModel = gt;
    }
    let lt = excludeSameModelFallbacks(summaryModel, context.options.fallbackModel);
    let modelChain = buildAvailabilityFallbackChain(summaryModel, lt);
    let chainIndex = 0;
    let pt;
    let Et;
    let yt;
    while (true) {
      let gt = pt ?? modelChain[chainIndex];
      let At = nextFallbackModel(modelChain, chainIndex, gt);
      let It = false;
      let Yt;
      let qt = Et;
      Et = undefined;
      let Zt = yt;
      yt = undefined;
      let visibleModel = resolveRefusalFallback({
        currentModel: gt,
        compiledTablesOnly: false,
        alreadyUsed: pt !== undefined,
        declined: false,
        inCascadeEpisode: false,
        cascadeNext: undefined,
        suppressionAlreadyLogged: true,
        requestDialog: context.requestDialog,
        isMainThread: isMainAgent,
        consumerLacksDialogCapability: true,
        preferenceQuestionPending: false,
        serverDefaultFallbacksEnabled: () => false,
        selfTargetDefaultFallbacksEnabled: () => false,
        sticky: getStickyBetas(),
        threadedRequest: false,
      }).visibleModel;
      let pn = [];
      context.onCompactEvent?.({
        type: "stream_mode",
        mode: "requesting",
      });
      onResponseLength?.({
        type: "response_length",
        op: "reset",
      });
      try {
        let reminderFold = resolveReminderFold_2(requestMessages);
        let streamingGen = shouldEchoWireToolInputs(requestMessages);
        let streamIter = queryModelWithStreaming({
          messages: normalizeMessagesForAPI(Me, stripNonEssential ? [] : context.options.tools, undefined, {
            echoWireToolInputs: streamingGen,
            echoApiBlockOrder: isStellarDriftEnabled(),
            thinkingStripPlan,
            advisorStripPlan,
            reminderFold,
          }),
          systemPrompt: asSystemPrompt([
            "You are a helpful AI assistant tasked with summarizing conversations.",
          ]),
          thinkingConfig: getThinkingConfig(context),
          tools: stripNonEssential ? [] : Ee,
          signal: context.abortController.signal,
          options: {
            async getToolPermissionContext() {
              return context.getAppState().toolPermissionContext;
            },
            model: gt,
            withoutToolDescribeHooks: context.options.settingsHooksOff,
            reminderFold,
            echoWireToolInputs: streamingGen,
            fallbackModel: modelChain[chainIndex + 1],
            accessFallbackModel: At,
            refusalFallbackModel: visibleModel,
            refusalFallbackModelLane: "visible",
            fallbackCreditLaneArmed: visibleModel !== undefined,
            fallbackCreditCode: qt?.code,
            fallbackCreditMintModel: qt?.mintModel,
            fallbackCreditMintRequestId: qt?.mintRequestId,
            fallbackStampFromModel: Zt?.fromModel,
            fallbackStampCategory: Zt?.category,
            fallbackStampTrigger: Zt?.trigger,
            fallbackStampOriginalRequestId: Zt?.originalRequestId,
            toolChoice: undefined,
            isNonInteractiveSession: context.options.isNonInteractiveSession,
            hasAppendSystemPrompt: !!context.options.appendSystemPrompt,
            querySource: "compact",
            compactionRequestKind,
            apiAttemptsLeft: context.compactionApiAttemptsLeft,
            agents: context.options.agentDefinitions.activeAgents,
            mcpTools: [],
            agentContext: context.agentContext,
            credentials: context.credentials,
            storageV5: context.storageV5,
            stickyBetas: forkStickyBetaLatches(getStickyBetas()),
            proactivityLevel: currentProactivityLevel(context),
            effortValue: getEffortValue(context),
            effortSetAsideByHold: getEffortSetAsideByHold(context),
            turnEffort: getEffortLayerOverride(context.permissionLayers),
            refusalFallbackEffort: Zt?.effort ?? undefined,
            enablePromptCaching: false,
            promptTooLongIsHandled: true,
            onRetryStatus: context.onRetryStatus,
          },
        })[Symbol.asyncIterator]();
        let next = await streamIter.next();
        while (!next.done) {
          let event = next.value;
          if (event.type === "stream_event") {
            if (event.event.type === "content_block_start" && event.event.content_block.type === "text")
              It = true;
            compactStreamProgress?.(event);
          }
          if (event.type === "assistant") pn.push(event);
          if (event.type === "model_fallback_triggered") throw event.error;
          if (event.type === "fallback_request") {
            Yt = event;
            try {
              await streamIter.return(undefined);
            } catch (error) {
              logForDebugging(`Compact: refused summarizer stream threw on return: ${errorMessage(error)}`, {
                level: "warn",
              });
            }
            break;
          }
          next = await streamIter.next();
        }
        if (Yt !== undefined) {
          let fallbackModel = Yt.fallbackModel;
          if (needsOverageConsentForModel(fallbackModel, context.requestDialog)) {
            let To = getUsageCreditsOnlyModelConsentDeclineFallback();
            let bo = To !== null && swapShrinksContextWindow(modelChain[0], To);
            if (To === null || bo) {
              if (isMainAgent)
                logFeatureBad(
                  "model_fable_consent",
                  bo ? "compact_refusal_fallback_shrinks_window" : "compact_refusal_no_allowed_fallback",
                );
              if (bo)
                throw Error(
                  "Compaction unavailable: the only model allowed after this refusal has a smaller context window \xB7 retry, or /model to change models",
                );
              throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                `Compaction unavailable: your model policy only allows ${renderUsageCreditsOnlyModelName(fallbackModel)}, which requires usage credits \xB7 /model to set it up`,
                "Compaction unavailable: model policy only allows Fable, which requires usage credits",
              );
            }
            if (isMainAgent) logFeatureSad("model_fable_consent", "compact_substituted");
            fallbackModel = To;
          }
          pt = fallbackModel;
          Et =
            Yt.creditCode !== null
              ? {
                  code: Yt.creditCode,
                  mintModel: gt,
                  mintRequestId: Yt.requestId ?? undefined,
                }
              : undefined;
          yt = {
            fromModel: Yt.originalModel,
            category: Yt.apiRefusalCategory ?? undefined,
            trigger: Yt.trigger,
            originalRequestId: Yt.requestId ?? undefined,
            effort: Yt.refusedEffort.carry,
          };
          logEvent("tengu_refusal_fallback_triggered", {
            original_model: telemetrySafeModelName(gt),
            fallback_model: telemetrySafeModelName(pt),
            trigger: fromEnum(Yt.trigger),
            request_id: sanitizeMarkName(Yt.requestId),
            prompt_skipped_reason: fromEnum(
              getFallbackDialogSkipReason({
                requestDialog: context.requestDialog,
                isMainThread: isMainAgent,
                silentAttempt: false,
                consumerLacksDialogCapability: true,
              }) ?? "no_dialog_host",
            ),
            api_refusal_category: Yt.apiRefusalCategory
              ? fromEnum(normalizeRefusalCategory(Yt.apiRefusalCategory))
              : undefined,
            route_matched: Yt.routeMatched != null ? fromEnum(Yt.routeMatched) : undefined,
            has_api_refusal_explanation: Boolean(Yt.apiRefusalExplanation),
            credit_minted: Yt.creditCode !== null,
            ...refusedEffortTelemetryFields(Yt.refusedEffort),
            querySource: lit_2("compact"),
            queryChainId: sanitizeMarkName(context.queryTracking?.chainId) ?? lit_2(""),
            queryDepth: context.queryTracking?.depth ?? -1,
          });
          logForDebugging(
            "Compact: refusal fallback triggered, retrying summarization on the fallback model",
            {
              level: "warn",
            },
          );
          if (context.abortController.signal.aborted) throw Error(API_REQUEST_ABORTED_MESSAGE);
          continue;
        }
        let last = pn.at(-1);
        if (last) {
          if (pt !== undefined && !last.isApiErrorMessage) logFeatureOk("refusal_fallback");
          return {
            response: last.isApiErrorMessage ? last : (findSummaryMessage(pn) ?? last),
            mediaStripped: true,
          };
        }
        if (context.abortController.signal.aborted) throw Error(API_REQUEST_ABORTED_MESSAGE);
        logForDebugging(`Compact streaming failed. hasStartedStreaming=${It}`, {
          level: "error",
        });
        logEvent("tengu_compact_failed", {
          reason: lit_2("no_streaming_response"),
          preCompactTokenCount,
          hasStartedStreaming: It,
          promptCacheSharingEnabled: Z,
        });
        throw Error(ERROR_MESSAGE_INCOMPLETE_RESPONSE);
      } catch (error) {
        if (isFallbackTo(At, error)) modelChain.push(At);
        let hn = modelChain[chainIndex + 1];
        if (hn !== undefined && needsOverageConsentForModel(hn, context.requestDialog)) {
          let ho = getUsageCreditsOnlyModelConsentDeclineFallback() ?? undefined;
          hn = ho !== undefined && !swapShrinksContextWindow(modelChain[0], ho) ? ho : undefined;
          if (hn !== undefined) modelChain[chainIndex + 1] = hn;
        }
        if (error instanceof FallbackTriggeredError && hn !== undefined) {
          if (isNoModelFallbackEnabled()) noModelFallbackTripwire();
          logFeatureOk("model_fallback");
          logEvent("tengu_model_fallback_triggered", {
            original_model: telemetrySafeModelName(error.originalModel),
            fallback_model: telemetrySafeModelName(hn),
            chain_index: chainIndex + 1,
            query_source: lit_2("compact"),
            reason: fromEnum(error.reason),
            entrypoint: lit_2("cli"),
            queryChainId: sanitizeMarkName(context.queryTracking?.chainId) ?? lit_2(""),
            queryDepth: context.queryTracking?.depth ?? -1,
          });
          logForDebugging(
            `Compact: model fallback triggered (${error.reason}), retrying summarization on the fallback model`,
            {
              level: "warn",
            },
          );
          chainIndex++;
          pt = undefined;
          continue;
        }
        if (error instanceof FallbackTriggeredError && error.reason === "model_blocked")
          throw new CompactionError(modelUnavailableMessage(error, renderModelName(error.originalModel)));
        throw error;
      }
    }
  } finally {
    compactingStatusTicker();
  }
}
//@ chunk-e6aww6q8.js:2434278-2434363 layout
/**
 * 从消息中提取已发现（ToolSearch 加载过）的工具名，压缩边界上记录。
 */
function getDiscoveredToolNames(e, context) {
  return extractDiscoveredToolNames([...e], {
    surfaced: (context.stickyBetas ?? getStickyBetas()).surfacedOnWire,
  });
}
//@ chunk-e6aww6q8.js:2434363-2436079 layout
/**
 * 压缩后重新注入的附件：最近读过的文件、后台代理/shell 状态、peer handback 命令、计划文件、plan mode、已调用技能、延迟工具/代理列表/MCP 说明等增量公告、目标与 cron 携带，然后跑 SessionStart(compact) 钩子。返回 {attachments, hookResults}。
 */
async function buildPostCompactAttachments(
  preCompactReadFileState,
  context,
  messagesToKeep,
  callSite,
  preCompactMessages,
  isMainThread,
  S = false,
) {
  let isSubagentContext = isDelegatedObservationContext(context.agentContext);
  let postCompactFileAttachments = await createPostCompactFileAttachments(
    preCompactReadFileState,
    context,
    POST_COMPACT_MAX_FILES_TO_RESTORE,
    messagesToKeep,
  );
  let G = isSubagentContext ? [] : await createAsyncAgentAttachmentsIfNeeded(context);
  let q = isSubagentContext ? [] : createBackgroundShellAttachments(context);
  let peerHandbackCommands = collectPeerHandbackCommands(preCompactMessages, messagesToKeep);
  let agentId = context.agentId;
  let planAttachmentIfNeeded = await createPlanAttachmentIfNeeded(agentId, context.storageV5);
  let planModeAttachmentIfNeeded = await createPlanModeAttachmentIfNeeded(context);
  let skillAttachmentIfNeeded = createSkillAttachmentIfNeeded(agentId, messagesToKeep, preCompactMessages);
  let Ae = stickyBetasForRequest(context);
  let Ie = Ae === undefined ? undefined : asDeclaredToolSet(Ae);
  let Me = [];
  let We = [];
  let ze = undefined;
  let lt = undefined;
  try {
    Me = getRevokedDeferredToolNames(Ie, context);
    We = S ? hasScratchToolSet(Ae, context.options.tools) : [];
    let qt = [...Me, ...We];
    ze =
      qt.length === 0
        ? undefined
        : buildPromptSnapshotAttachment(messagesToKeep, new Set(qt), context.options);
    lt = ze === undefined ? undefined : renderPointIfStale(messagesToKeep);
  } catch (error) {
    logError(error);
    Me = [];
    We = [];
    ze = undefined;
    lt = undefined;
  }
  let Je = Me.length === 0 ? Ie : Ie?.without(new Set(Me));
  let nt = context.options.refreshTools !== undefined;
  let mapped = [
    ...withToolsLoadedBeforeSummary(
      await getDeferredToolsDeltaAttachments(
        context.options.tools,
        context.options.mainLoopModel,
        messagesToKeep,
        {
          callSite,
        },
        undefined,
        undefined,
        undefined,
        undefined,
        Je,
        buildDeferredToolsLatchContext(Ae, context),
        nt ? buildToolRevocationClassifier(context) : undefined,
        context.options,
      ),
      getDiscoveredToolNames(preCompactMessages, context),
    ),
    ...(await getAgentListingDeltaAttachment(context, messagesToKeep)),
    ...(areAttachmentsDisabled(context)
      ? []
      : await getSkillListingAttachmentsLazy(context, messagesToKeep).catch((error) => {
          logError(error);
          return [];
        })),
    ...getMcpInstructionsDeltaAttachment(
      context.options.mcpClients,
      context.options.tools,
      context.options.mainLoopModel,
      messagesToKeep,
      Je,
      nt && isSortedOtterOn(),
    ),
    ...getMcpDroppedToolsAttachment(context, messagesToKeep),
    ...getSandboxInstructionsAttachments(context.options.tools, messagesToKeep),
    ...getPostCompactEnvironmentAttachments(preCompactMessages, messagesToKeep, getCwdOrNull() !== null),
    ...modelAttachmentIfNew(preCompactMessages, messagesToKeep),
    ...carryStyleAndLanguageAttachments(preCompactMessages, messagesToKeep),
    ...getProactivityAttachmentToKeep(preCompactMessages, messagesToKeep),
    ...(isRemoteToolForwardingSwitchOn() && !isSubagentContext
      ? ((await isolationRuntimeService().remote?.noticeAttachment(
          context,
          messagesToKeep,
          "post_compact",
        )) ?? [])
      : []),
  ].map((qt) => createAttachmentMessage_2(qt));
  let hookResults = [];
  if (!isSubagentContext) {
    if (!context.options.settingsHooksOff) {
      context.onCompactEvent?.({
        type: "compact_progress",
        event: {
          type: "hooks_start",
          hookType: "session_start",
        },
      });
      hookResults = await processSessionStartHooks(context.session, "compact", {
        model: context.options.mainLoopModel,
        agentContext: context.agentContext,
        storageV5: context.storageV5,
        credentials: context.credentials,
      });
    }
  }
  let projectsThreadAskAttachmentIfNeeded = createProjectsThreadAskAttachmentIfNeeded(
    preCompactMessages,
    messagesToKeep,
    context.options.tools,
    isMainThread && callSite !== "compact_partial",
  );
  let goalStatusAttachmentIfNeeded = createGoalStatusAttachmentIfNeeded(
    context,
    preCompactMessages,
    messagesToKeep,
    isMainThread,
  );
  let sessionCronCarryAttachmentIfNeeded = createSessionCronCarryAttachmentIfNeeded(
    preCompactMessages,
    messagesToKeep,
    isMainThread,
  );
  if (Ae !== undefined) {
    logDeclaredToolsDroppedAtCompaction(Ae, Me);
    logDeclaredToolsDroppedAtCompaction2(Ae, We);
  }
  let announcementWalk = context.options.announcementWalk;
  let Yt = [
    ...postCompactFileAttachments,
    ...G,
    ...q,
    ...peerHandbackCommands,
    ...(planAttachmentIfNeeded ? [planAttachmentIfNeeded] : []),
    ...(planModeAttachmentIfNeeded ? [planModeAttachmentIfNeeded] : []),
    ...(skillAttachmentIfNeeded ? [skillAttachmentIfNeeded] : []),
    ...mapped,
    ...(projectsThreadAskAttachmentIfNeeded ? [projectsThreadAskAttachmentIfNeeded] : []),
    ...(goalStatusAttachmentIfNeeded ? [goalStatusAttachmentIfNeeded] : []),
    ...(sessionCronCarryAttachmentIfNeeded ? [sessionCronCarryAttachmentIfNeeded] : []),
    ...(ze ? [createAttachmentMessage_2(ze)] : []),
    ...(lt ? [createAttachmentMessage_2(lt)] : []),
  ];
  return {
    attachments: announcementWalk ? Yt.map((qt) => announcementWalk(qt)) : Yt,
    hookResults,
  };
}
//@ chunk-e6aww6q8.js:2436079-2436651 fingerprint = createPostCompactFileAttachments (0.969)
/**
 * 按时间倒序取最近读过的文件（排除保留段里已读的、计划/记忆等特殊文件），每个最多 5000 token 重新生成文件附件，总预算 50000。
 */
async function createPostCompactFileAttachments(
  readFileState,
  toolUseContext,
  maxFiles,
  preservedMessages = [],
) {
  let preservedReadPaths = collectReadToolFilePaths(preservedMessages);
  let y = shouldExcludeFromPostCompactRestore();
  let S = true;
  let recentFiles = Object.entries(readFileState)
    .map(([filename, state]) => ({
      filename,
      ...state,
    }))
    .filter(
      (file) =>
        !isPlanFile(file.filename, y, toolUseContext.agentId) &&
        !preservedReadPaths.has(expandPath(file.filename)) &&
        !isPersistedArtifactPath(expandPath(file.filename)),
    )
    .sort((Z, Se) => Se.timestamp - Z.timestamp)
    .slice(0, maxFiles);
  let results = (
    await Promise.all(
      recentFiles.map((file) =>
        generateFileAttachment(
          file.filename,
          {
            ...toolUseContext,
            fileReadingLimits: {
              maxTokens: POST_COMPACT_MAX_TOKENS_PER_FILE,
            },
          },
          "tengu_post_compact_file_restore_success",
          "tengu_post_compact_file_restore_error",
          "compact",
        ),
      ),
    )
  ).map((attachment) => (attachment ? createAttachmentMessage_2(attachment) : null));
  let usedTokens = 0;
  return results.filter((result) => {
    if (result === null) return false;
    let attachmentTokens = roughTokenCountEstimation(jsonStringify(result.attachment));
    if (usedTokens + attachmentTokens <= POST_COMPACT_TOKEN_BUDGET) {
      usedTokens += attachmentTokens;
      return true;
    }
    return false;
  });
}
//@ chunk-e6aww6q8.js:2436651-2436822 fingerprint = createPlanAttachmentIfNeeded (1)
/**
 * 有计划文件时生成 plan_file_reference 附件。
 */
async function createPlanAttachmentIfNeeded(agentId, storageV5) {
  if (peekPlanSlug() !== undefined) notePlanFileForgotten(getPlanFilePath(agentId));
  let planContent = await getPlanAsync(agentId, storageV5);
  if (!planContent) return null;
  return createAttachmentMessage_2({
    type: "plan_file_reference",
    planFilePath: isDiskless() ? "" : getPlanFilePath(agentId),
    planContent,
  });
}
//@ chunk-e6aww6q8.js:2436822-2438287 fingerprint = createSkillAttachmentIfNeeded (0.537)
/**
 * 已调用技能（含从对话中恢复的）按最近调用排序，单个截到 5000 token、总预算 25000，生成 invoked_skills 附件。
 */
function createSkillAttachmentIfNeeded(agentId, messagesToKeep = [], preCompactMessages = []) {
  let invokedSkills = getInvokedSkillsForAgent(agentId);
  let h = new Set();
  if (agentId === undefined && isSoftSparkEnabled())
    for (let G of messagesSinceCompactBoundary([...preCompactMessages])) {
      let q = Date.parse(G.timestamp) || 0;
      if (G.type === "attachment" && G.attachment.type === "invoked_skills") {
        let Ee = q;
        for (let skill of G.attachment.skills) {
          let Ie = `:${skill.name}`;
          if (!invokedSkills.has(Ie) && skill.name && skill.path) {
            h.add(Ie);
            invokedSkills.set(Ie, {
              skillName: skill.name,
              skillPath: skill.path,
              content: skill.content,
              invokedAt: Ee,
              agentId: null,
              ...(skill.mcpSkill !== undefined && {
                servedByMcp: true,
              }),
            });
          }
          Ee = Math.min(Ee, invokedSkills.get(Ie)?.invokedAt ?? Ee);
        }
      }
      if (G.type !== "user" || !G.invokedSkill) continue;
      let { name: Z, path } = G.invokedSkill;
      let ke = invokedSkills.get(`:${Z}`);
      let we = metaMessageText(G);
      if (
        typeof Z === "string" &&
        typeof path === "string" &&
        we &&
        we !== ke?.content &&
        (ke?.invokedAt ?? -1) < q
      ) {
        h.add(`:${Z}`);
        invokedSkills.set(`:${Z}`, {
          skillName: Z,
          skillPath: path,
          content: we,
          invokedAt: q,
          agentId: null,
          ...(G.mcpSkill != null && {
            servedByMcp: true,
          }),
        });
      }
    }
  if (invokedSkills.size === 0) return null;
  let usedTokens = 0;
  let S = [];
  let sorted = Array.from(invokedSkills.entries()).sort(([, G], [, q]) => q.invokedAt - G.invokedAt);
  for (let [G, q] of sorted) {
    if (!q.content) continue;
    let invokedMcpSkill = findInvokedMcpSkill(preCompactMessages, q.skillName, q.content);
    if (q.servedByMcp && invokedMcpSkill === undefined) continue;
    let Se = restoreSkillStateFromMessages(messagesToKeep, q.content);
    if (Se === "attachment") continue;
    let ke = Se === "body" || h.has(G);
    let content = truncateToTokens(q.content, POST_COMPACT_MAX_TOKENS_PER_SKILL);
    let Ee = roughTokenCountEstimation(content);
    if (usedTokens + Ee > POST_COMPACT_SKILLS_TOKEN_BUDGET) {
      if (!ke) updateInvokedSkillContent(G, "");
      continue;
    }
    usedTokens += Ee;
    if (!ke && content !== q.content) updateInvokedSkillContent(G, content);
    S.push({
      name: q.skillName,
      path: q.skillPath,
      content,
      ...(invokedMcpSkill !== undefined && {
        mcpSkill: invokedMcpSkill,
      }),
    });
  }
  if (S.length === 0) return null;
  let L = count(S, (skill) => h.has(`:${skill.name}`));
  if (L > 0)
    logFeatureOk("compact_skill_from_conversation", {
      count: L,
    });
  return createAttachmentMessage_2({
    type: "invoked_skills",
    skills: S,
  });
}
//@ chunk-e6aww6q8.js:2438287-2438628 fingerprint = createPlanModeAttachmentIfNeeded (0.836)
/**
 * 处于 plan 模式时生成完整 plan_mode 提醒附件。
 */
async function createPlanModeAttachmentIfNeeded(context) {
  if (getToolPermissionContext(context).mode !== "plan") return null;
  if (isDiskless())
    return createAttachmentMessage_2(buildPlanModeAttachment("full", context.agentId, context.options.tools));
  let planFilePath = getPlanFilePath(context.agentId);
  let planExists = await planExistsAsync(context.agentId, context.storageV5);
  let planModeInstructions = context.options?.planModeInstructions;
  return createAttachmentMessage_2({
    type: "plan_mode",
    reminderType: "full",
    isSubAgent: !!context.agentId,
    planFilePath,
    planExists,
    ...(planModeInstructions !== undefined && {
      customInstructions: planModeInstructions,
    }),
  });
}
//@ chunk-e6aww6q8.js:2438628-2438816 layout
/**
 * 有活动目标或保留段之外有目标条件时生成 goal_status 附件。
 */
function createGoalStatusAttachmentIfNeeded(e, n, r, s) {
  if (!s) return null;
  let activeGoal = e.getAppState().activeGoal;
  if (activeGoal !== undefined)
    return createAttachmentMessage_2(buildGoalSentinelAttachment(false, activeGoal.condition));
  let condition = findActiveGoalCondition(r);
  if (condition === null || findActiveGoalCondition(n) === condition) return null;
  return createAttachmentMessage_2(buildGoalSentinelAttachment(true, condition));
}
//@ chunk-e6aww6q8.js:2438816-2438927 layout
/**
 * 把会话 cron/loop 唤醒等定时任务以 session_cron_carry 附件带过压缩。
 */
function createSessionCronCarryAttachmentIfNeeded(e, n, r) {
  if (!r) return null;
  try {
    let s = carryLoopCronAcrossCompact(e, n);
    return s === null ? null : createAttachmentMessage_2(s);
  } catch (error) {
    logError(error);
    return null;
  }
}
//@ chunk-e6aww6q8.js:2438927-2439121 layout
/**
 * 自动模式 projects 线程中待回答请求的携带附件。
 */
function createProjectsThreadAskAttachmentIfNeeded(e, n, tools, s) {
  if (!s) return null;
  try {
    if (!hasUpdateStatusToolOnly(tools)) return null;
    let h = carryProjectsThreadAsk(e, n, tools);
    return h === null ? null : createAttachmentMessage_2(h);
  } catch (error) {
    logError(error);
    logFeatureBad("auto_mode_projects_thread_ask_carry", "carry_failed");
    return null;
  }
}
//@ chunk-e6aww6q8.js:2439121-2439640 fingerprint = createAsyncAgentAttachmentsIfNeeded (0.903)
/**
 * 未取回的后台代理任务生成 task_status 附件（进度摘要或错误）。
 */
async function createAsyncAgentAttachmentsIfNeeded(context) {
  let appState = context.getAppState();
  let asyncAgents = Object.values(appState.tasks).filter((task) => task.type === "local_agent");
  let s = willToolsLoseSessionState(context.options.tools);
  let canContinueAgent = hasSendMessageTool(context.options.tools);
  return asyncAgents.flatMap((agent) => {
    if (
      agent.retrieved ||
      agent.status === "pending" ||
      agent.agentId === context.agentId ||
      isIdleCompletedAgent(agent)
    )
      return [];
    return [
      createAttachmentMessage_2({
        type: "task_status",
        taskId: agent.agentId,
        taskType: "local_agent",
        description: agent.description,
        status: agent.status,
        deltaSummary: agent.status === "running" ? (agent.progress?.summary ?? null) : (agent.error ?? null),
        outputFilePath: agent.webFetchSavedFiles || !s ? undefined : agent.outputFile,
        canContinueAgent,
      }),
    ];
  });
}
//@ chunk-e6aww6q8.js:2439640-2440117 layout
/**
 * 当前代理仍在运行的后台 shell 生成 task_status 附件（命令与描述截断）。
 */
function createBackgroundShellAttachments(context) {
  let n = willToolsLoseSessionState(context.options.tools);
  return Object.values(context.taskRegistry.all()).flatMap((agent) => {
    if (
      agent.type !== "local_bash" ||
      agent.status !== "running" ||
      !agent.isBackgrounded ||
      agent.toolUseId === undefined ||
      agent.agentId !== context.agentId
    )
      return [];
    return [
      createAttachmentMessage_2({
        type: "task_status",
        taskId: agent.id,
        taskType: "local_bash",
        description: truncateWithCount(stripIgnorables(agent.description), TASK_STATUS_DESCRIPTION_MAX_CHARS),
        status: agent.status,
        deltaSummary: null,
        outputFilePath: n ? agent.outputFile : undefined,
        shell: {
          command: truncateWithCount(stripIgnorables(agent.command), TASK_STATUS_COMMAND_MAX_CHARS),
          kind: agent.kind ?? "bash",
          toolUseId: agent.toolUseId,
        },
      }),
    ];
  });
}
//@ chunk-e6aww6q8.js:2440117-2440475 layout
/**
 * 最后一条 assistant 之后、来自 peer 且 handback 的 queued_command 附件重新带上。
 */
function collectPeerHandbackCommands(preCompactMessages, messagesToKeep) {
  let lastIndex = preCompactMessages.findLastIndex(
    (h) => h.type === "assistant" && !h.isApiErrorMessage && !h.isVirtual,
  );
  let s = new Set(messagesToKeep.map((h) => h.uuid));
  return preCompactMessages.slice(lastIndex + 1).flatMap((h) =>
    h.type === "attachment" &&
    h.attachment.type === "queued_command" &&
    h.attachment.origin?.kind === "peer" &&
    h.attachment.origin.handback === true &&
    !s.has(h.uuid)
      ? [
          createAttachmentMessage_2({
            ...h.attachment,
            timestamp: undefined,
          }),
        ]
      : [],
  );
}
//@ chunk-e6aww6q8.js:2440475-2441038 fingerprint = collectReadToolFilePaths (1)
/**
 * 保留消息中 Read 工具读过的文件路径（排除结果已被清理为桩的）。
 */
function collectReadToolFilePaths(messages) {
  let stubIds = new Set();
  for (let message of messages) {
    if (message.type !== "user" || !Array.isArray(message.message.content)) continue;
    for (let block of message.message.content)
      if (
        block.type === "tool_result" &&
        typeof block.content === "string" &&
        isFileUnchangedStub(block.content)
      )
        stubIds.add(block.tool_use_id);
  }
  let paths = new Set();
  for (let message of messages) {
    if (message.type !== "assistant" || !Array.isArray(message.message.content)) continue;
    for (let block of message.message.content) {
      if (block.type !== "tool_use" || block.name !== FILE_READ_TOOL_NAME || stubIds.has(block.id)) continue;
      let input = block.input;
      if (input && typeof input === "object" && "file_path" in input && typeof input.file_path === "string") {
        let S = expandPathOrNull(input.file_path);
        if (S !== null) paths.add(S);
      }
    }
  }
  return paths;
}
//@ chunk-e6aww6q8.js:2441038-2441122 placement
function truncateToTokens(content, maxTokens) {
  if (roughTokenCountEstimation(content) <= maxTokens) return content;
  let charBudget = maxTokens * 4 - SKILL_TRUNCATION_NOTE.length;
  return content.slice(0, charBudget) + SKILL_TRUNCATION_NOTE;
}
//@ chunk-e6aww6q8.js:2441122-2441315 placement
/**
 * 压缩后可恢复的记忆文件类型。
 */
function restorableMemoryTypes() {
  let e = getOriginalCwdOrNull() !== null;
  return MEMORY_TYPE_VALUES.filter((n) => {
    switch (n) {
      case "User":
        return !isDiskless();
      case "Project":
      case "Local":
        return e;
      case "AutoMem":
        return !isDiskless() && (e || getAutoMemPathOrNull() !== null);
      case "Managed":
        return true;
    }
  });
}
//@ chunk-e6aww6q8.js:2441315-2441398 placement
function shouldExcludeFromPostCompactRestore() {
  try {
    return new Set(restorableMemoryTypes().map((type) => expandPath(getMemoryPath(type))));
  } catch {
    return new Set();
  }
}
//@ chunk-e6aww6q8.js:2441398-2441491 placement
/**
 * 判断文件是否就是当前计划的文件（压缩时不保留）。
 */
function isPlanFile(filename, n, agentId) {
  let s = expandPath(filename);
  try {
    let h = expandPath(getPlanFilePath(agentId));
    if (s === h) return true;
  } catch {}
  return n.has(s);
}
//@ chunk-e6aww6q8.js:2441491-2441623 placement
/**
 * 压缩失败的遥测码。
 */
function compactFailureCode(summaryResponse) {
  if (summaryResponse.apiError === "dlp_request_denied")
    return formatApiErrorType("dlp_request_denied", summaryResponse.apiErrorStatus);
  return fromEnum(summaryResponse.error ?? "unknown");
}
//@ chunk-e6aww6q8.js:2441623-2442226 placement
/**
 * 记录压缩摘要回复的形态（摘要块、未回答的请求尾部、输出 token、停止原因）。
 */
function logSummaryReply({ path, reply, sent, outputTokens, stopReason, attempt, keptReplySent = false }) {
  let sliced = sent.slice(getIndexAfterLastAssistantOrToolResult(sent));
  logEvent("tengu_compact_summary_reply", {
    path: fromEnum(path),
    summaryBlock: hasSummaryBlock(reply)
      ? lit_2("closed")
      : hasSummaryTagLine(reply)
        ? lit_2("open")
        : lit_2("none"),
    unansweredRequestTail: sliced.some(
      (L) =>
        (L.type === "attachment" &&
          L.attachment.type === "queued_command" &&
          L.attachment.commandMode === "prompt" &&
          L.attachment.isMeta !== true) ||
        (isHumanPromptMessage(L) && !(L.type === "user" && L.isCompactSummary)),
    )
      ? lit_2("prompt")
      : sliced.some((L) => L.type === "user" && L.isVirtual !== true)
        ? lit_2("other_message")
        : lit_2("none"),
    outputTokens,
    stopReason: fromEnumOpt(stopReason),
    attempt,
    ...(keptReplySent && {
      unansweredRequestTail: lit_2("kept_reply"),
    }),
  });
}
//@ chunk-e6aww6q8.js:2442226-2442339 placement
/**
 * 压缩时引用的 transcript 路径（无盘或关闭持久化时 undefined）。
 */
function compactTranscriptPath(e) {
  if (isDiskless() || isTranscriptPersistenceDisabled() || e.compactTranscriptUnavailable) return;
  return e.agentId !== undefined ? getAgentTranscriptPath(e.agentId) : getTranscriptPath();
}
//@ chunk-e6aww6q8.js:2442339-2442435 placement
/**
 * 按消息 token 数给出压缩恢复的超时。
 */
function recoveryTimeoutForMessages(e, rawMessage) {
  let r = estimateTokensWithAnchor(e) || 0;
  let s = (rawMessage !== undefined && parsePromptTooLongTokenCounts(rawMessage).actualTokens) || 0;
  return recoveryTimeoutForContextTokens(Math.max(r, s));
}
//@ chunk-e6aww6q8.js:2442435-2442507 placement
/**
 * 判断错误是否属于压缩相关失败（CompactionError、API 错误前缀、prompt too long、不完整响应）。
 */
function isCompactionFailure(error) {
  return (
    error instanceof CompactionError ||
    startsWithApiErrorPrefix(errorMessage(error)) ||
    hasExactErrorMessage(error, ERROR_MESSAGE_PROMPT_TOO_LONG) ||
    hasExactErrorMessage(error, ERROR_MESSAGE_INCOMPLETE_RESPONSE)
  );
}
//@ chunk-e6aww6q8.js:2442507-2442517 placement
/**
 * 连续压缩失败的上限（3 次）触发熔断。
 */
var MAX_CONSECUTIVE_COMPACT_FAILURES = 3;
//@ chunk-e6aww6q8.js:2442517-2442973 placement
/**
 * 记一次自动压缩失败，连续失败达到上限时触发熔断。
 */
function autocompactFailure(e, n, r, compactFailure) {
  let h = (e?.consecutiveFailures ?? 0) + 1;
  if (h >= MAX_CONSECUTIVE_COMPACT_FAILURES) {
    logForDebugging(
      `autocompact: circuit breaker tripped after ${h} consecutive failures${n ? " (reactive path)" : ""} \u2014 skipping future attempts this session`,
      {
        level: "warn",
      },
    );
    logEvent("tengu_auto_compact_circuit_breaker", {
      consecutiveFailures: h,
      ...(n && {
        routedThroughReactive: n,
      }),
      ...(r && {
        thresholdSource: fromEnum(r),
      }),
    });
  }
  return {
    kind: "failed",
    consecutiveFailures: h,
    routedThroughReactive: n,
    thresholdSource: r,
    compactFailure,
  };
}
//@ chunk-e6aww6q8.js:2442973-2443623 placement
/**
 * 实际输入超过阈值时分析前缀大小与文档/图片块数量。
 */
function analyzeOversizedPrefix(e, n, autoCompactWindow, s = 0) {
  let lastApiUsage = getLastApiUsage(e);
  if (!lastApiUsage) return null;
  let y =
    lastApiUsage.input_tokens +
    lastApiUsage.cache_read_input_tokens +
    lastApiUsage.cache_creation_input_tokens;
  let S = roughTokenCountEstimationForMessages(e, n.bytesPerToken);
  let max = Math.max(0, y - s - S);
  let autoCompactThresholdTokens = getAutoCompactThresholdTokens(n, autoCompactWindow);
  if (max <= autoCompactThresholdTokens) return null;
  let G = 0;
  let q = 0;
  let Z = (content) => {
    for (let ke of content) {
      let we = ke;
      if (we.type === "document" && we.source?.type !== "text" && we.source?.type !== "content") G++;
      else if (we.type === "image") q++;
      else if (we.type === "tool_result" && Array.isArray(we.content)) Z(we.content);
    }
  };
  for (let Se of e) {
    let content = Se.message?.content;
    if (Array.isArray(content)) Z(content);
  }
  return {
    prefixTokens: max,
    thresholdTokens: autoCompactThresholdTokens,
    totalInputTokens: y,
    messagesEstimate: S,
    snipTokensFreed: s,
    documentBlockCount: G,
    imageBlockCount: q,
  };
}
//@ chunk-e6aww6q8.js:2443623-2443672 placement
/**
 * 是否开启冷压缩（CLAUDE_CODE_COLD_COMPACT）。
 */
function isColdCompactEnabled() {
  return env.CLAUDE_CODE_COLD_COMPACT;
}
//@ chunk-ag5x7vhf.js:27597-27676 fingerprint = stripReinjectedAttachments (0.508)
/**
 * 附件类型为 skill_listing 或 agent_listing_delta（压缩后会重新注入的列表类附件）。旧版名 stripReinjectedAttachments 为错配（这里只是判断）。
 */
function isReinjectedListingAttachment(messages) {
  return messages.type === "skill_listing" || messages.type === "agent_listing_delta";
}
export {
  applyPreservedMessages,
  metaMessageText,
  partialCompactConversation,
  buildPostCompactMessages_2,
  ERROR_MESSAGE_NOT_ENOUGH_MESSAGES,
  buildPostCompactMessages,
  getTokenCountFromUsage_4,
  CompactionError,
  noopAsync_3,
  buildPostCompactMessagesWithoutKept,
  recoveryTimeoutForMessages,
  hasTooFewMessagesToCompact,
  countNonProgressMessages,
  compactConversation,
  COMPACTION_BLOCKED_BY_HOOK,
  MAX_CONSECUTIVE_COMPACT_FAILURES,
  analyzeOversizedPrefix,
  autocompactFailure,
  isColdCompactEnabled,
  isCompactionFailure,
  ERROR_MESSAGE_PROMPT_TOO_LONG,
  createClassifierOverflowReminder,
  SKILL_TRUNCATION_NOTE,
  isReinjectedListingAttachment,
  compactTranscriptPath,
  stripImagesFromMessages,
  createCompactCanUseTool,
  excludeSameModelFallbacks,
  logSummaryReply,
  isRealAssistantMessage,
  POST_COMPACT_MAX_FILES_TO_RESTORE,
  POST_COMPACT_MAX_TOKENS_PER_FILE,
  POST_COMPACT_SKILLS_TOKEN_BUDGET,
  getIndexAfterLastAssistantOrToolResult,
  isHumanPromptMessage,
  MAX_PTL_RETRIES,
  truncateHeadForPTLRetry,
  buildReactiveCompactionResult,
  mergeHookInstructions,
  runCompactHooks,
  resolveCompactionKind,
  startCompactingStatusTicker,
  groupByApiRound,
};
