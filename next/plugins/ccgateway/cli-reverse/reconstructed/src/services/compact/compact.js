/**
 * services/compact/compact.ts
 *
 * 对话压缩主体：compactConversation（整段摘要）、partialCompactConversation（按选中消息前/后部分摘要）、摘要请求（fork 共享缓存 / 直连回退）、压缩后附件重注入（文件、计划、技能、后台任务、钩子）与边界消息。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/compact/compact.ts
 * pieces: chunk-5xgkngpb.js (82), chunk-bvz8t570.js (1), chunk-hnxhr3bs.js (1)
 * attribution: placement 36, sole-consumer 1, fingerprint 19, layout 28
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { lastUnchangedInstructionsIndex } from "../../utils/contextAttachments/instructions.js";
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
import { shortHash } from "../../utils/shortHash.js";
import { onLastMainRequestReplaced } from "../api/cacheKeepalive.js";
import { isDelegatedObservationContext } from "../../utils/agentContext.js";
import { processSessionStartHooks } from "../../utils/sessionStart.js";
import { isObjectBlock } from "../../utils/toolResultStorage.js";
import { hasPdfReads } from "../../utils/attachments/pdf.js";
import {
  getPromptTooLongGap,
  PROMPT_TOO_LONG_ERROR_MESSAGE,
  startsWithApiErrorPrefix,
  parsePromptTooLongTokenCounts,
} from "../api/errors.js";
import { logForDebugging, createAttachmentMessage_2 } from "../../utils/debug.js";
import { countWhere } from "../../utils/collections.js";
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
import { getCompactPrompt, hasSummaryBlock, hasSummaryTagLine, getPartialCompactPrompt } from "./prompt.js";
import {
  streamPrefixesPresent,
  hasAuthoredByOthersArtifact,
  anyMessageHasMarker,
  REMOTE_CONTROL_DEVICE_REPORT_ELEMENT,
} from "../../utils/messages/untrustedArtifactContent.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { codeModeAccepted } from "../../utils/codeMode/accepted.js";
import { isCodeModeEnabled } from "../../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { replBindingsKept } from "../../utils/codeMode.js";
import { getToolsUsedForSummary } from "../../utils/agentListing.js";
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import { logCompactionEvent } from "../../utils/telemetry/thirdPartyEventRecords.js";
import { enqueueTaskNotification } from "../../utils/task/taskNotifications.js";
import { swapShrinksContextWindow } from "../../utils/model/smallFastModel.js";
import { runForkedAgent } from "../../utils/forkedAgent.js";
import {
  toolSearchRejectedOn,
  isToolSearchEnabled,
  extractDiscoveredToolNames,
} from "../../utils/toolSearch.js";
import { forkStickyBetaLatches } from "../../bootstrap/stateSlices.js";
import { uniqByExport } from "../../../vendor/lodash-es/uniqBy.js";
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
  areAttachmentsDisabled_2,
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
import { READ } from "../../tools/FileReadTool/constants.js";
import { MEMORY_TYPE_VALUES } from "../../utils/memory/types.js";
import { getAutoMemPathOrNull } from "../../memdir/paths.js";
import { getMemoryPath } from "../../utils/config.js";
import { formatApiErrorType } from "../api/errorUtils.js";
import { recoveryTimeoutForContextTokens } from "../../utils/abortController.js";
import { env } from "../../utils/env.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-bvz8t570.js:10445-10577 fingerprint (2.1.88 match: ERROR_MESSAGE_USER_ABORT, 0.508)
var API_REQUEST_ABORTED_MESSAGE = "API Error: Request was aborted.";
var USER_SENT_MESSAGE_PREFIX = `The user sent a new message while you were working:
`;
var HOOK_STOPPED_MESSAGE = "Operation stopped by hook";
//@ chunk-5xgkngpb.js:1697887-1697998 placement
var SKILL_TRUNCATION_NOTE = `

[... skill content truncated for compaction; use Read on the skill path if you need the full text]`;
//@ chunk-5xgkngpb.js:1697998-1698256 placement
/**
 * meta 用户消息的纯文本内容（全是文本块时拼接）。
 */
function metaMessageText(message) {
  if (message.type !== "user" || !message.isMeta) return null;
  let content = message.message?.content;
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return null;
  let filtered = content.filter((block) => block?.type === "text");
  if (filtered.length !== content.length) return null;
  return filtered.map((block) => block.text).join(`

`);
}
//@ chunk-5xgkngpb.js:1727228-1727829 placement
/**
 * 错误文本自证。压缩后给 deferred_tools_delta 附件补 loadedBeforeSummaryNames（压缩前已加载、本次又新增的工具名）；开关 tengu_radiant_lemur。
 */
function withToolsLoadedBeforeSummary(deferredToolsDeltaAttachments, discoveredToolNames) {
  try {
    return deferredToolsDeltaAttachments.map((attachment) => {
      if (attachment.type !== "deferred_tools_delta" || attachment.toolSearchAbsent === true)
        return attachment;
      let known = new Set([
        ...(attachment.loadedNames ?? []),
        ...(attachment.surfacedNames ?? []),
        ...(attachment.replacedNames ?? []),
      ]);
      let filtered = attachment.addedNames.filter(
        (addedName) => discoveredToolNames.has(addedName) && !known.has(addedName),
      );
      if (filtered.length === 0) return attachment;
      if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_radiant_lemur", false)) {
        logFeatureSad("compact_names_loaded_tools", "flag_off", {
          count: filtered.length,
        });
        return attachment;
      }
      logFeatureOk("compact_names_loaded_tools", {
        count: filtered.length,
      });
      return {
        ...attachment,
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
//@ chunk-5xgkngpb.js:1727829-1727971 placement
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
//@ chunk-5xgkngpb.js:1727971-1728132 placement
/**
 * 消息是 proactivity 附件，且已撤回或级别/工具有效。
 */
function isProactivityAttachment(message) {
  if (message.type !== "attachment" || message.attachment.type !== "proactivity") return false;
  let attachment = message.attachment;
  return (
    attachment.status === "withdrawn" ||
    (isProactivityMode(attachment.level) && isProactivitySettingsValid(attachment.tools))
  );
}
//@ chunk-5xgkngpb.js:2141766-2141793 sole-consumer
/**
 * 按宿主保存的权限上下文日志状态。
 */
var permissionContextLogState; // deferred: uses PermissionContextLogState (../internalLogging.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:2141766", () => {
  permissionContextLogState = new HostScoped(() => new PermissionContextLogState());
});
//@ chunk-5xgkngpb.js:2141793-2141832 placement
/**
 * 取当前宿主的权限上下文日志状态。
 */
function getPermissionContextLogState() {
  return permissionContextLogState.of(getRootSession().host);
}
//@ chunk-5xgkngpb.js:2141832-2141877 placement
/**
 * 取当前 OCI 容器 id（透传状态里的 ociContainerId）。
 */
function getOciContainerId() {
  return getPermissionContextLogState().ociContainerId();
}
//@ chunk-5xgkngpb.js:2141877-2141908 placement
/**
 * 异步空实现（保留调用点，目前不做任何事）。
 */
async function noopAsync_3(toolPermissionContext, context) {
  return;
}
//@ chunk-5xgkngpb.js:2141908-2141922 placement
/**
 * 压缩过程中状态提示的刷新间隔（30 秒）。
 */
var COMPACTING_STATUS_INTERVAL_MS = 30000;
//@ chunk-5xgkngpb.js:2141922-2141993 placement
/**
 * 启动压缩状态定时器，返回停止函数。
 */
function startCompactingStatusTicker(onCompactEvent) {
  let interval = setInterval(emitCompactingStatus, COMPACTING_STATUS_INTERVAL_MS, onCompactEvent);
  return () => clearInterval(interval);
}
//@ chunk-5xgkngpb.js:2142060-2142328 placement
/**
 * 按 API 回合（助手消息 id 变化）把消息分组。
 */
function groupByApiRound(messages) {
  let rounds = [];
  let currentRound = [];
  let lastAssistantId;
  for (let message of messages) {
    if (isVirtualConversationMessage(message)) {
      currentRound.push(message);
      continue;
    }
    if (
      message.type === "assistant" &&
      message.message.id !== lastAssistantId &&
      !message.resumedFromIncompleteThinking &&
      currentRound.length > 0
    ) {
      rounds.push(currentRound);
      currentRound = [message];
    } else currentRound.push(message);
    if (message.type === "assistant") lastAssistantId = message.message.id;
  }
  if (currentRound.length > 0) rounds.push(currentRound);
  return rounds;
}
//@ chunk-5xgkngpb.js:2142328-2142403 placement (2.1.88 match: countUnseenAssistantTurns, 1)
function countNonProgressMessages(messages) {
  let messages_2 = messagesSinceCompactBoundary(messages).filter((message) => message.type !== "progress");
  return groupByApiRound(messages_2);
}
//@ chunk-5xgkngpb.js:2142403-2142442 placement
/**
 * 非进度消息不足两条（没有可压缩的内容）。
 */
function hasTooFewMessagesToCompact(messages) {
  return countNonProgressMessages(messages).length < 2;
}
//@ chunk-5xgkngpb.js:2187266-2191286 placement (2.1.88 match: createCompactionResultFromSessionMemory, 0.13)
/**
 * 反应式/预计算压缩成功后组装 CompactionResult：清 readFileState、边界消息、保留消息（可剥 thinking）、压缩后附件、PostCompact 钩子、计算 postTokens，记 tengu_reactive_compact_succeeded。旧版名 createCompactionResultFromSessionMemory 为错配。
 */
async function buildReactiveCompactionResult(input) {
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
  } = input;
  let { toolUseContext } = cacheSafeParams;
  let compactionKind = input.compactionKind ?? resolveCompactionKind(trigger, thresholdSource);
  let isMainThreadQuery = isMainQuerySource(querySource);
  let preCompactTokens = input.preCompactTokens ?? estimateTokensWithAnchor(preCompactMessages);
  let kind = lastUnchangedInstructionsIndex(input.messagesToPreserve);
  let messagesToKeep = input.messagesToPreserve
    .filter(
      (preserved, position) =>
        preserved.type !== "attachment" ||
        preserved.attachment.type !== "instructions" ||
        (kind !== -1 && position >= kind),
    )
    .map(getTokenCountFromUsage_6);
  let preCompactDiscovered = remoteFileStateToObject(toolUseContext.readFileState);
  toolUseContext.readFileState.clear();
  resetPickerState(toolUseContext.memorySelector);
  notifyCompaction(toolUseContext.agentId);
  if (isMainThreadQuery) {
    await reAppendSessionMetadataAfterCompaction(toolUseContext.storageV5);
    markPostCompaction(
      roughTokenCountEstimationForMessages([...compactResult.summaryMessages, ...messagesToKeep]),
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
  let keptThinking = decideKeptThinkingStrip(messagesToKeep, toolUseContext);
  let isMainQuery = isMainQueryCompaction(querySource, toolUseContext.agentId);
  let postCompactAttachments = await buildPostCompactAttachments(
    preCompactDiscovered,
    toolUseContext,
    messagesToKeep,
    "reactive_compact",
    preCompactMessages,
    isMainQuery,
    compactionKind === "reactive",
  ).catch((error) =>
    fallbackPostCompactAttachments(error, toolUseContext, preCompactMessages, messagesToKeep, isMainQuery),
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
  let compactionOutput = {
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
  let postCompactTokenCount = roughTokenCountEstimationForMessages(
    buildPostCompactMessages(compactionOutput),
  );
  annotatedBoundary.compactMetadata.postTokens = postCompactTokenCount;
  setCumulativeDroppedTokens(annotatedBoundary, preCompactMessages);
  if (isMainThreadQuery) setLastMainThreadContextTokens(postCompactTokenCount);
  let contextMetrics = (() => {
    try {
      return tokenStatsToStatsigMetrics(analyzeContext(preCompactMessages));
    } catch (error) {
      logError(error);
      return {};
    }
  })();
  let totalUsage = compactResult.totalUsage;
  let totalInputTokens =
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
    summaryPromptTextHash:
      compactResult.servedInstructions === undefined
        ? undefined
        : shortHash(compactResult.servedInstructions),
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
      ? input.messagesToPreserve.length - compactResult.messagesToPreserve.length
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
    compactionTotalTokens: totalInputTokens + totalUsage.output_tokens,
    cacheHitRate: totalInputTokens > 0 ? totalUsage.cache_read_input_tokens / totalInputTokens : 0,
    cacheCold,
    ...contextMetrics,
  });
  if (isMainQueryCompaction(querySource, toolUseContext.agentId)) {
    armPendingContextCompacted(compactionKind, mainChainTailAtStart);
    onLastMainRequestReplaced(mainChainTailAtStart);
  }
  return {
    ok: true,
    result: compactionOutput,
  };
}
//@ chunk-5xgkngpb.js:2191286-2192921 placement
/**
 * 压缩前后运行压缩相关钩子，钩子可替换压缩结果。
 */
async function runCompactHooks(input) {
  let { replacement, preCompactMessages, cacheSafeParams, querySource, trigger, startTime, coreBoundary } =
    input;
  let { toolUseContext } = cacheSafeParams;
  let ranCore = coreBoundary !== undefined;
  let isMainThreadQuery = isMainQuerySource(querySource);
  let preCompactTokens = estimateTokensWithAnchor(preCompactMessages);
  if (!ranCore) {
    toolUseContext.readFileState.clear();
    resetPickerState(toolUseContext.memorySelector);
    notifyCompaction(toolUseContext.agentId);
    if (isMainThreadQuery) {
      await reAppendSessionMetadataAfterCompaction(toolUseContext.storageV5);
      markPostCompaction(roughTokenCountEstimationForMessages(replacement));
    }
  }
  let boundaryMarker =
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
      : createCompactBoundaryMessage(trigger, preCompactTokens, preCompactMessages.at(-1)?.uuid);
  boundaryMarker.compactMetadata.durationMs = Math.round(performance.now() - startTime);
  if (input.precomputed) boundaryMarker.compactMetadata.precomputed = true;
  let hookResults = [];
  let userDisplayMessage;
  if (!ranCore) {
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
  let result = {
    boundaryMarker,
    summaryMessages: [],
    replacement,
    messagesToKeep: [],
    attachments: [],
    hookResults,
    userDisplayMessage,
    preCompactTokenCount: preCompactTokens,
  };
  let postCompactTokens = roughTokenCountEstimationForMessages(buildPostCompactMessages(result));
  boundaryMarker.compactMetadata.postTokens = postCompactTokens;
  setCumulativeDroppedTokens(boundaryMarker, preCompactMessages);
  if (isMainThreadQuery) setLastMainThreadContextTokens(postCompactTokens);
  if (isMainThreadQuery) notePendingConversationEdit("compact");
  if (
    !ranCore &&
    input.compactionKind !== undefined &&
    isMainQueryCompaction(querySource, toolUseContext.agentId)
  )
    armPendingContextCompacted(input.compactionKind, input.mainChainTailAtStart);
  logEvent("tengu_compact_replaced_by_hook", {
    trigger: fromEnum(trigger),
    ranCore,
    precomputed: input.precomputed === true,
    preCompactTokens,
    postCompactTokens,
    messageCount: replacement.length,
    ...(querySource !== undefined && {
      querySource: agentTypeForTelemetry(querySource),
    }),
  });
  return result;
}
//@ chunk-5xgkngpb.js:2192921-2192997 placement
/**
 * 推断压缩类型：手动、自动（有阈值来源）或响应式。
 */
function resolveCompactionKind(trigger, thresholdSource) {
  return trigger === "manual" ? "manual" : thresholdSource !== undefined ? "auto" : "reactive";
}
//@ chunk-5xgkngpb.js:2192997-2193441 placement
/**
 * 压缩附件生成失败时的兜底附件（计划模式、项目线程询问、目标、定时任务）。
 */
async function fallbackPostCompactAttachments(
  error,
  context,
  preCompactMessages,
  messagesToKeep,
  precompute,
) {
  logError(error);
  let previous = await createPlanModeAttachmentIfNeeded(context).catch((error) => {
    logError(error);
    return null;
  });
  let projectsThreadAskAttachmentIfNeeded = createProjectsThreadAskAttachmentIfNeeded(
    preCompactMessages,
    messagesToKeep,
    context.options.tools,
    precompute,
  );
  let goalStatusAttachmentIfNeeded = createGoalStatusAttachmentIfNeeded(
    context,
    preCompactMessages,
    messagesToKeep,
    precompute,
  );
  let sessionCronCarryAttachmentIfNeeded = createSessionCronCarryAttachmentIfNeeded(
    preCompactMessages,
    messagesToKeep,
    precompute,
  );
  let fallbackEntry = null;
  try {
    fallbackEntry = invokedSkillsAttachment([], preCompactMessages, messagesToKeep);
  } catch {
    logError(
      Error(
        "The fallback of a compaction wrote no entry of a loaded MCP skill, because the scan of its messages threw",
      ),
    );
  }
  let announcementWalk = context.options.announcementWalk;
  let attachments = [
    ...(previous ? [previous] : []),
    ...(projectsThreadAskAttachmentIfNeeded ? [projectsThreadAskAttachmentIfNeeded] : []),
    ...(goalStatusAttachmentIfNeeded ? [goalStatusAttachmentIfNeeded] : []),
    ...(sessionCronCarryAttachmentIfNeeded ? [sessionCronCarryAttachmentIfNeeded] : []),
    ...(fallbackEntry ? [fallbackEntry] : []),
  ];
  return {
    attachments: announcementWalk
      ? attachments.map((attachment) => announcementWalk(attachment))
      : attachments,
    hookResults: [],
  };
}
//@ chunk-5xgkngpb.js:2193441-2193640 placement (2.1.88 match: getTokenCountFromUsage, 0.899)
function getTokenCountFromUsage_6(usage) {
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
//@ chunk-5xgkngpb.js:2193640-2193902 placement
/**
 * 找出压缩边界保留的消息及锚点。
 */
function resolvePreservedMessages(messages, boundary, initialMessages) {
  let preservedMessages = boundary.compactMetadata.preservedMessages;
  if (!preservedMessages) return null;
  let mapped = (preservedMessages.allUuids ?? preservedMessages.uuids)
    .map(
      (uuid) =>
        messages.find((message) => message.uuid === uuid) ??
        initialMessages?.find((message) => message.uuid === uuid),
    )
    .filter((message) => message !== undefined)
    .map(getTokenCountFromUsage_6);
  return mapped.length > 0
    ? {
        preserved: mapped,
        anchorUuid: preservedMessages.anchorUuid,
      }
    : null;
}
//@ chunk-5xgkngpb.js:2193902-2194223 placement
/**
 * 在消息列表中按锚点移动保留的消息。
 */
function applyPreservedMessages(messages, message, pending, initialMessages) {
  if (isCompactBoundaryMessage_3(message)) {
    let preservedMessages = resolvePreservedMessages(messages, message, initialMessages);
    if (preservedMessages === null) return null;
    let preservedUuids = new Set(preservedMessages.preserved.map((message) => message.uuid));
    let filtered = messages.filter((message) => !preservedUuids.has(message.uuid));
    messages.length = 0;
    messages.push(...filtered);
    if (preservedMessages.anchorUuid === message.uuid) {
      messages.push(...preservedMessages.preserved);
      return null;
    }
    return preservedMessages;
  }
  if (pending !== null && pending.anchorUuid === message.uuid) {
    messages.push(...pending.preserved);
    return null;
  }
  return pending;
}
//@ chunk-5xgkngpb.js:2194223-2194407 placement (2.1.88 match: buildPostCompactMessages, 0.833)
function buildPostCompactMessages_2(plan, placement) {
  let mapped = plan.messagesToKeep.map(getTokenCountFromUsage_6);
  let ordered =
    placement === "up_to" ? [...plan.summaryMessages, ...mapped] : [...mapped, ...plan.summaryMessages];
  return [plan.boundaryMarker, ...ordered, ...plan.attachments, ...plan.hookResults];
}
//@ chunk-5xgkngpb.js:2462581-2462645 placement
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
//@ chunk-5xgkngpb.js:2462645-2463269 placement
/**
 * 附件里的图片/文档换成 [image]/[document] 文本（queued_command 的 prompt、file 附件的 image/notebook/parts 内容）。
 */
function stripMediaFromAttachment(attachment) {
  if (
    attachment.type === "queued_command" &&
    Array.isArray(attachment.prompt) &&
    attachment.prompt.some(
      (block) => isObjectBlock(block) && (block.type === "image" || block.type === "document"),
    )
  )
    return {
      ...attachment,
      prompt: attachment.prompt.map((block) => {
        if (!isObjectBlock(block)) return block;
        if (block.type === "image")
          return {
            type: "text",
            text: "[image]",
          };
        if (block.type === "document")
          return {
            type: "text",
            text: "[document]",
          };
        return block;
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
  if (attachment.type === "message_pdf_reads" && hasPdfReads(attachment))
    return {
      ...attachment,
      reads: [],
    };
  return attachment;
}
//@ chunk-5xgkngpb.js:2463269-2464002 fingerprint (2.1.88 match: stripImagesFromMessages, 0.889)
/**
 * 摘要请求前把消息里的 image/document 块（含 tool_result 内嵌）替换成 [image]/[document] 文本，附件同样处理。
 */
function stripImagesFromMessages(messages) {
  return messages.map((message) => {
    if (message.type === "attachment") {
      let stripped = stripMediaFromAttachment(message.attachment);
      return stripped === message.attachment ? message : withRenderedAttachment(message, stripped);
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
//@ chunk-5xgkngpb.js:2464002-2464292 layout
/**
 * stripNonEssential（冷压缩）时只保留 queued_command/poll_events/dir_sync_notice/fork_briefing/thinking_stripped/advisor_stripped 附件。
 */
function keepEssentialAttachmentsOnly(requestMessages) {
  return requestMessages.filter(
    (message) =>
      message.type !== "attachment" ||
      message.attachment.type === "queued_command" ||
      message.attachment.type === "poll_events" ||
      message.attachment.type === "dir_sync_notice" ||
      message.attachment.type === "fork_briefing" ||
      message.attachment.type === "thinking_stripped" ||
      message.attachment.type === "advisor_stripped",
  );
}
//@ chunk-5xgkngpb.js:2464292-2464304 layout
/**
 * 100。
 */
var COLD_COMPACT_TRUNCATE_CHARS = 100;
//@ chunk-5xgkngpb.js:2464304-2464471 layout
/**
 * 字符串超过 100 字符时截断并标注原长度（避开代理对）。
 */
function truncateForColdCompact(text) {
  if (text.length <= COLD_COMPACT_TRUNCATE_CHARS) return text;
  let cutIndex = COLD_COMPACT_TRUNCATE_CHARS;
  let code = text.charCodeAt(cutIndex - 1);
  if (code >= 55296 && code <= 56319) cutIndex--;
  return `${text.slice(0, cutIndex)}\u2026[truncated, original ${text.length} chars]`;
}
//@ chunk-5xgkngpb.js:2464471-2464739 layout
/**
 * 递归截断对象/数组里的所有字符串（未变时返回原对象）。旧版名 shouldExcludeFromPostCompactRestore 为错配。
 */
function truncateStringsDeep(value) {
  if (typeof value === "string") return truncateForColdCompact(value);
  if (Array.isArray(value)) {
    let mapped = value.map(truncateStringsDeep);
    return mapped.some((entry, index) => entry !== value[index]) ? mapped : value;
  }
  if (typeof value === "object" && value !== null) {
    let record = value;
    let changed = false;
    let copy = {};
    for (let [key, value] of Object.entries(record)) {
      let nextValue = truncateStringsDeep(value);
      if (nextValue !== value) changed = true;
      copy[key] = nextValue;
    }
    return changed ? copy : value;
  }
  return value;
}
//@ chunk-5xgkngpb.js:2464739-2464776 layout
/**
 * 块是对象且为 thinking/redacted_thinking。
 */
function isThinkingContentBlock(block) {
  return isObjectBlock(block) && isThinkingBlock(block);
}
//@ chunk-5xgkngpb.js:2464776-2465603 layout
/**
 * 冷压缩：去掉 assistant 的 thinking 块、截断 tool_use 输入与 tool_result 文本到 100 字符，丢弃 wire 回显字段。
 */
function stripNonEssentialContent(messages) {
  return messages.map((message) => {
    if (message.type === "assistant") {
      let content = message.message.content;
      if (!Array.isArray(content)) return message;
      let any = content.some(isThinkingContentBlock);
      let content_2 = (any ? content.filter((block) => !isThinkingContentBlock(block)) : content).map(
        (block) => {
          if (!isObjectBlock(block) || block.type !== "tool_use") return block;
          let truncatedInput = truncateStringsDeep(block.input);
          if (truncatedInput === block.input) return block;
          any = true;
          return {
            ...block,
            input: truncatedInput,
          };
        },
      );
      if (!any && message.wireToolInputs === undefined && message.wireIngestContext === undefined)
        return message;
      let { wireToolInputs, wireIngestContext, ...rest } = message;
      return {
        ...rest,
        message: {
          ...message.message,
          content: content_2,
        },
      };
    }
    if (message.type === "user") {
      let content = message.message.content;
      if (!Array.isArray(content)) return message;
      let changed = false;
      let content_2 = content.map((block) => {
        if (!isObjectBlock(block) || block.type !== "tool_result") return block;
        let text =
          typeof block.content === "string"
            ? block.content
            : Array.isArray(block.content)
              ? extractTextContent_2(block.content.filter(isObjectBlock))
              : "";
        let truncated = truncateForColdCompact(text);
        if (block.content === truncated) return block;
        changed = true;
        return {
          ...block,
          content: truncated,
        };
      });
      if (!changed) return message;
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
//@ chunk-5xgkngpb.js:2465603-2465711 fingerprint (2.1.88 match: ERROR_MESSAGE_NOT_ENOUGH_MESSAGES, 0.667)
/**
 * 截头后插在开头的 meta 用户消息文本。
 */
var ERROR_MESSAGE_NOT_ENOUGH_MESSAGES = "Not enough messages to compact.";
var MAX_PTL_RETRIES = 3;
var PTL_RETRY_MARKER = "[earlier conversation truncated for compaction retry]";
//@ chunk-5xgkngpb.js:2465711-2465754 layout
/**
 * 按错误里给出的超出量（getPromptTooLongGap）截掉开头的消息组。
 */
function truncateHeadForPromptTooLong(messages, summaryResponse, bytesPerToken) {
  return truncateHeadForPTLRetry(messages, getPromptTooLongGap(summaryResponse), bytesPerToken);
}
//@ chunk-5xgkngpb.js:2465754-2466162 fingerprint (2.1.88 match: truncateHeadForPTLRetry, 1)
/**
 * 摘要请求 prompt too long 时丢弃最早的若干 API 轮次组：有超出量就丢到够为止，否则丢 20%；至少保留一组；开头变成 assistant 时补 PTL_RETRY_MARKER 用户消息。
 */
function truncateHeadForPTLRetry(messages, budget, bytesPerToken) {
  let input =
    messages[0]?.type === "user" && messages[0].isMeta && messages[0].message.content === PTL_RETRY_MARKER
      ? messages.slice(1)
      : messages;
  let groups = groupByApiRound(input);
  if (groups.length < 2) return null;
  let dropCount;
  if (budget !== undefined) {
    let acc = 0;
    dropCount = 0;
    for (let group of groups) {
      acc += roughTokenCountEstimationForMessages(bytesPerToken ? stripImagesFromMessages(group) : group);
      dropCount++;
      if (acc >= budget) break;
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
//@ chunk-5xgkngpb.js:2466162-2466382 fingerprint (2.1.88 match: ERROR_MESSAGE_PROMPT_TOO_LONG, 0.5)
/**
 * "Compaction blocked by PreCompact hook"。
 */
var ERROR_MESSAGE_PROMPT_TOO_LONG =
  "Conversation too long. Press esc twice to go up a few messages and try again.";
var COMPACTION_BLOCKED_BY_HOOK = "Compaction blocked by PreCompact hook";
var COMPACT_SUMMARY_FAILED =
  "Failed to generate conversation summary - the model's reply has no <summary> block";
//@ chunk-5xgkngpb.js:2466382-2466687 layout
/**
 * PreCompact 钩子返回 blockedBy 时记日志、（非自动时）通知，并抛 CompactionError。
 */
function throwIfPreCompactHookBlocked(preCompactHookResult, onNotification, hookName) {
  if (!preCompactHookResult.blockedBy) return;
  logForDebugging(`Compaction blocked by PreCompact hook: ${preCompactHookResult.blockedBy}`, {
    level: "warn",
  });
  if (!hookName?.suppressNotification)
    onNotification?.({
      key: "compaction-blocked-by-hook",
      text: "compaction blocked by PreCompact hook",
      priority: "immediate",
      color: "warning",
    });
  throw new CompactionError(`${COMPACTION_BLOCKED_BY_HOOK}: ${preCompactHookResult.blockedBy}`);
}
//@ chunk-5xgkngpb.js:2466687-2466784 fingerprint (2.1.88 match: ERROR_MESSAGE_INCOMPLETE_RESPONSE, 1)
/**
 * 压缩被中断（网络问题）的提示文本。
 */
var ERROR_MESSAGE_INCOMPLETE_RESPONSE =
  "Compaction interrupted \xB7 This may be due to network issues \u2014 please try again.";
//@ chunk-5xgkngpb.js:2466784-2466808 layout
/**
 * 压缩专用错误类（无摘要、API 错误、钩子阻断）。
 */
class CompactionError extends Error {}
//@ chunk-5xgkngpb.js:2466808-2466944 fingerprint (2.1.88 match: buildPostCompactMessages, 0.919)
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
//@ chunk-5xgkngpb.js:2466944-2467544 layout
/**
 * 自动模式分类器因上下文过长无法审查而触发压缩时，生成 critical_system_reminder（说明哪些工具调用未执行）。
 */
function createClassifierOverflowReminder(callCount, names) {
  if (callCount === 0)
    return createAttachmentMessage_2({
      type: "critical_system_reminder",
      content: "The conversation was compacted because it had become too long for auto mode's classifier.",
    });
  let single = callCount === 1;
  let description = single
    ? `an earlier tool call (${names.join(", ")})`
    : `${callCount} earlier tool calls (${names.join(", ")})`;
  return createAttachmentMessage_2({
    type: "critical_system_reminder",
    content: `Auto mode could not review ${description} because the conversation was too long for its classifier, so ${single ? "that call" : "those calls"} did not run. The conversation has now been compacted. If still needed, issue ${single ? "it" : "them"} again and ${single ? "it" : "they"} will be reviewed normally.`,
  });
}
//@ chunk-5xgkngpb.js:2467544-2467661 layout (2.1.88 match: buildPostCompactMessages, 0.801)
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
//@ chunk-5xgkngpb.js:2467661-2467795 layout
/**
 * 按出现顺序去重 uuid（重复时保留最后一次出现的位置）。
 */
function uniqueUuidsKeepLast(messages) {
  let seen = new Set();
  let uuids = [];
  for (let idx = messages.length - 1; idx >= 0; idx--) {
    let { uuid } = messages[idx];
    if (!seen.has(uuid)) {
      seen.add(uuid);
      uuids.push(uuid);
    }
  }
  return uuids.reverse();
}
//@ chunk-5xgkngpb.js:2467795-2468063 fingerprint (2.1.88 match: annotateBoundaryWithPreservedSegment, 0.785)
/**
 * 在边界消息 compactMetadata 上记录保留段（preservedSegment head/anchor/tail）与保留消息 uuid。
 */
function annotateBoundaryWithPreservedSegment(boundary, anchorUuid, messages, fallbackMessages = messages) {
  let uuids = uniqueUuidsKeepLast(messages);
  let loggedUuids = uniqueUuidsKeepLast(cleanMessagesForLogging([...messages], fallbackMessages));
  if (uuids.length === 0) return boundary;
  return {
    ...boundary,
    compactMetadata: {
      ...boundary.compactMetadata,
      ...(loggedUuids.length > 0 && {
        preservedSegment: {
          headUuid: loggedUuids[0],
          anchorUuid,
          tailUuid: loggedUuids.at(-1),
        },
      }),
      preservedMessages: {
        anchorUuid,
        uuids: loggedUuids,
        allUuids: uuids,
      },
    },
  };
}
//@ chunk-5xgkngpb.js:2468063-2468686 layout
/**
 * 保留的尾部若含 thinking 块，按模型 thinking 模式决定是否全部剥离；剥离时返回 thinking_stripped 标记附件。
 */
function decideKeptThinkingStrip(messagesToKeep, context) {
  let thinkingBlockCount = 0;
  for (let message of messagesToKeep)
    if (message.type === "assistant")
      thinkingBlockCount += countWhere(message.message.content, isThinkingBlock);
  if (thinkingBlockCount === 0)
    return {
      marker: undefined,
      thinkingBlockCount,
      decidedBy: undefined,
    };
  let runtimeModel = getRuntimeMainLoopModel({
    permissionMode: getToolPermissionContext(context).mode,
    mainLoopModel: getMainLoopModel_2(context),
  });
  let backingModel = runtimeModel.includes("application-inference-profile")
    ? (getInferenceProfileBackingModelCached(stripAnyVersatileSuffix(runtimeModel)) ?? runtimeModel)
    : runtimeModel;
  let supportsAdaptive = modelSupportsAdaptiveThinking({
    runtimeOverride: getThinkingTypeOverride(runtimeModel),
    resolvedModel: backingModel,
    canonicalModel: getCanonicalName(backingModel),
  });
  let stripDecision = keptThinkingStripDecision(supportsAdaptive);
  logForDebugging(
    `compact: kept tail holds ${thinkingBlockCount} thinking block(s); strip=${stripDecision.strip ? "on" : "off"} (decided by ${stripDecision.source}; model=${runtimeModel}, thinking=${supportsAdaptive})`,
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
//@ chunk-5xgkngpb.js:2468686-2468761 layout
/**
 * 合并用户自定义压缩指令与 PreCompact 钩子新增指令（空行分隔）。
 */
function mergeHookInstructions(userInstructions, hookInstructions) {
  if (!hookInstructions) return userInstructions || undefined;
  if (!userInstructions) return hookInstructions;
  return `${userInstructions}

${hookInstructions}`;
}
//@ chunk-5xgkngpb.js:2468761-2468845 layout
/**
 * 非 API 错误、非虚拟的 assistant 消息。
 */
function isRealAssistantMessage(message) {
  return message.type === "assistant" && !message.isApiErrorMessage && message.isVirtual !== true;
}
//@ chunk-5xgkngpb.js:2468845-2468964 layout
/**
 * 最后一条真实 assistant 或 tool_result 用户消息之后的位置（摘要回复审计用）。
 */
function getIndexAfterLastAssistantOrToolResult(messages) {
  return (
    1 +
    Math.max(
      messages.findLastIndex(isRealAssistantMessage),
      messages.findLastIndex(
        (message) => message.type === "user" && message.isVirtual !== true && isToolResultMessage(message),
      ),
    )
  );
}
//@ chunk-5xgkngpb.js:2468964-2469048 layout
/**
 * 真实的用户输入消息（非 meta、非虚拟、非合成、非 tool_result）。
 */
function isHumanPromptMessage(message) {
  return (
    message.type === "user" &&
    !message.isMeta &&
    message.isVirtual !== true &&
    !isSyntheticMessage(message) &&
    !isToolResultMessage(message)
  );
}
//@ chunk-5xgkngpb.js:2469048-2475343 fingerprint (2.1.88 match: compactConversation, 0.658)
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
    let compactPrompt = compactTranscriptPath(context);
    let compactPrompt_2 = getCompactPrompt(customInstructions, summaryPromptArm);
    let cachePrefixEnabled =
      compactPrompt_2 +
      streamPrefixesPresent(messages)
        .map(
          (instructions) => `

${instructions}`,
        )
        .join("");
    let summaryRequest = createUserMessage({
      content: stripNonEssential ? cachePrefixEnabled : compactPrompt_2,
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
      summaryRequest = createUserMessage({
        content: cachePrefixEnabled,
      });
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
    if (
      context.compactionApiAttemptsLeft !== undefined &&
      !hasSummaryBlock(summaryText) &&
      !hasSummaryTagLine(summaryText)
    ) {
      logEvent("tengu_compact_failed", {
        reason: lit_2("no_summary_block"),
        preCompactTokenCount,
        promptCacheSharingEnabled,
      });
      logFeatureBad(outcomeMetricKey, "compact_no_summary_block");
      throw new CompactionError(COMPACT_SUMMARY_FAILED);
    }
    let preCompactReadFileState = remoteFileStateToObject(context.readFileState);
    context.readFileState.clear();
    resetPickerState(context.memorySelector);
    let { attachments, hookResults } = await buildPostCompactAttachments(
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
          transcriptPath: compactPrompt,
          ...(codeModeAccepted() &&
            isCodeModeEnabled() && {
              replBindingsKept: replBindingsKept(context.toolState, context.agentId),
            }),
          headTruncated: ptlAttempts > 0,
          foreignArtifactContent: hasAuthoredByOthersArtifact(messages),
          remoteControlDeviceReport: anyMessageHasMarker(messages, REMOTE_CONTROL_DEVICE_REPORT_ELEMENT),
          toolNamesUsed: getToolsUsedForSummary(messages, context.agentContext, context.agentId),
        }),
        isCompactSummary: true,
        isVisibleInTranscriptOnly: true,
      }),
    ].map((fp) => withTurnPosition(fp, messages));
    let postCompactTokenCount = tokenCountFromLastAPIResponse([summaryResponse]);
    let truePostCompactTokenCount = roughTokenCountEstimationForMessages([
      boundaryMarker,
      ...summaryMessages,
      ...attachments,
      ...hookResults,
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
      summaryPromptTextHash: summaryPromptArm === undefined ? undefined : shortHash(summaryPromptArm),
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
      hookResults,
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
//@ chunk-5xgkngpb.js:2475343-2481154 fingerprint (2.1.88 match: partialCompactConversation, 0.716)
/**
 * 部分压缩（消息选择器）：direction=from 摘要选中点之后、保留之前；up_to 摘要之前、保留之后（保留部分可能剥离 thinking）。流程同 compactConversation，用 getPartialCompactPrompt，边界消息记录 userFeedback 与摘要条数，tengu_partial_compact 遥测。
 */
async function partialCompactConversation(messages, pivotIndex, context, cacheSafeParams, options) {
  let { userFeedback, direction = "from", onNotification, onResponseLength } = options ?? {};
  let lastMainRequestId = getLastMainRequestId();
  let compactionErrorMessage;
  let preTokens;
  let postTokens;
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
    let keptMarker = false;
    let keptThinkingInfo =
      direction === "up_to" ? decideKeptThinkingStrip(messagesToKeep, context) : undefined;
    if (direction === "up_to") {
      if (keptThinkingInfo?.marker) {
        messagesToKeep.push(keptThinkingInfo.marker);
        appendedMarkerCount++;
        keptMarker = true;
      }
    } else {
      let thinkingScope = messagesToKeep.some((message) => message.type === "assistant")
        ? computeThinkingStrippedScope(messagesToKeep, messagesToSummarize)
        : undefined;
      if (thinkingScope) {
        messagesToKeep.push(createAttachmentMessage_2(thinkingScope));
        appendedMarkerCount++;
      }
      if (
        messagesToKeep.some((message) => message.type === "assistant") &&
        messagesToSummarize.some(
          (message) => message.type === "attachment" && message.attachment.type === "advisor_stripped",
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
    let content =
      compactPrompt +
      streamPrefixesPresent(summaryInputMessages)
        .map(
          (preserved) => `

${preserved}`,
        )
        .join("");
    let retryCacheSafeParams =
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
      let summary = await streamCompactSummary({
        messages: summaryInputMessages,
        summaryRequest,
        appState: context.getAppState(),
        context,
        preCompactTokenCount,
        cacheSafeParams: retryCacheSafeParams,
        onResponseLength,
        thinkingStripPlan: collectThinkingStripPlan(messages),
        advisorStripPlan: getAdvisorStrippedMessageIds(messages),
        compactionRequestKind: "manual",
      });
      summaryResponse = summary.response;
      summaryText = getAssistantMessageText(summaryResponse);
      if (!summaryText?.startsWith(PROMPT_TOO_LONG_ERROR_MESSAGE)) break;
      ptlAttempts++;
      let truncatedMessages =
        ptlAttempts <= MAX_PTL_RETRIES
          ? truncateHeadForPromptTooLong(summaryInputMessages, summaryResponse, summary.mediaStripped)
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
      summaryRequest = createUserMessage({
        content,
      });
      retryCacheSafeParams = {
        ...retryCacheSafeParams,
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
      keptThinkingStripped: direction === "up_to" && keptMarker,
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
    let metadata =
      direction === "up_to"
        ? [
            ...messagesToSummarize,
            ...messages
              .slice(pivotIndex)
              .filter((message) => message.type === "user" && message.isCompactSummary),
          ]
        : messages;
    let summaryMessages = [
      createUserMessage({
        ...buildCompactArtifactNote(summaryText, {
          suppressFollowUpQuestions: false,
          transcriptPath,
          ...(codeModeAccepted() &&
            isCodeModeEnabled() && {
              replBindingsKept: replBindingsKept(context.toolState, context.agentId),
            }),
          foreignArtifactContent: hasAuthoredByOthersArtifact(metadata),
          remoteControlDeviceReport: anyMessageHasMarker(metadata, REMOTE_CONTROL_DEVICE_REPORT_ELEMENT),
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
    ].map((summaryMessage) =>
      withTurnPosition(summaryMessage, direction === "up_to" ? messagesToSummarize : messages),
    );
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
    postTokens = roughTokenCountEstimationForMessages([
      boundaryMarker,
      ...summaryMessages,
      ...messagesToKeep,
      ...attachments,
      ...hookResults,
    ]);
    boundaryMarker.compactMetadata.postTokens = postTokens;
    setLastMainThreadContextTokens(postTokens);
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
    compactionErrorMessage = error instanceof Error ? error.message : "partial compaction failed";
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
        success: !compactionErrorMessage,
        durationMs: performance.now() - startTime,
        preTokens,
        postTokens,
        error: compactionErrorMessage,
      },
      context.agentContext,
    );
    context.onCompactEvent?.({
      type: "sdk_status",
      status: null,
      metadata: {
        compactResult: compactionErrorMessage ? "failed" : "success",
        ...(compactionErrorMessage && {
          compactError: compactionErrorMessage,
        }),
      },
    });
  }
}
//@ chunk-5xgkngpb.js:2481154-2481489 fingerprint (2.1.88 match: addErrorNotificationIfNeeded, 0.853)
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
  enqueueTaskNotification({
    type: "system",
    subtype: "notification",
    key: "error-compacting-conversation",
    text: "Error compacting conversation",
    priority: "immediate",
    color: "error",
  });
}
//@ chunk-5xgkngpb.js:2481489-2481619 layout
/**
 * 遥测用：无 / api_error / 第一个内容块类型。
 */
function describeLastAssistantKind(lastAssistant) {
  if (!lastAssistant) return lit_2("none");
  if (lastAssistant.isApiErrorMessage) return lit_2("api_error");
  return fromEnum(lastAssistant.message.content[0]?.type ?? "empty");
}
//@ chunk-5xgkngpb.js:2481619-2481705 layout
/**
 * 从 fallback 模型列表里去掉与当前模型等同的项。
 */
function excludeSameModelFallbacks(modelInfo, fallbackModel) {
  return (
    Array.isArray(fallbackModel) ? fallbackModel : fallbackModel !== undefined ? [fallbackModel] : []
  ).filter((candidate) => !swapShrinksContextWindow(modelInfo, candidate));
}
//@ chunk-5xgkngpb.js:2481705-2481897 fingerprint (2.1.88 match: createCompactCanUseTool, 1)
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
//@ chunk-5xgkngpb.js:2481897-2490752 fingerprint (2.1.88 match: streamCompactSummary, 0.404)
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
  let cacheSharingEnabled =
    !stripNonEssential && getFeatureValue_CACHED_MAY_BE_STALE("tengu_compact_cache_prefix", true);
  let compactingStatusTicker = startCompactingStatusTicker(context.onCompactEvent);
  let compactStreamProgress = createCompactStreamProgress(onResponseLength, context.onCompactEvent);
  try {
    if (cacheSharingEnabled)
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
        let forkAssistantMessageCount = countWhere(
          forkResult.messages,
          (message) => message.type === "assistant" && !message.isApiErrorMessage,
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
    let summaryTools =
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
        ? uniqByExport(
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
    let requestMessages_2 = stripNonEssential ? stripNonEssentialContent(assistantMsg) : assistantMsg;
    let summaryModel = cacheSafeParams.model ?? context.options.mainLoopModel;
    let isMainAgent = context.agentId === undefined;
    if (needsOverageConsentForModel(summaryModel, context.requestDialog)) {
      let consentFallback = getUsageCreditsOnlyModelConsentDeclineFallback();
      if (consentFallback === null) {
        let noFallback = isNoModelFallbackEnabled();
        if (isMainAgent)
          logFeatureBad(
            "model_fable_consent",
            noFallback ? "compact_no_model_fallback_env" : "compact_no_allowed_fallback",
          );
        if (noFallback)
          throw Error(
            "Compaction unavailable: CLAUDE_CODE_NO_MODEL_FALLBACK is set and model substitution is disabled \xB7 unset it to allow the swap",
          );
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Compaction unavailable: your model policy only allows ${renderUsageCreditsOnlyModelName(summaryModel)}, which requires usage credits \xB7 /model to set it up`,
          "Compaction unavailable: model policy only allows Fable, which requires usage credits",
        );
      }
      if (isMainAgent) logFeatureSad("model_fable_consent", "compact_substituted");
      summaryModel = consentFallback;
    }
    let fallbackModelList = excludeSameModelFallbacks(summaryModel, context.options.fallbackModel);
    let modelChain = buildAvailabilityFallbackChain(summaryModel, fallbackModelList);
    let chainIndex = 0;
    let swappedModel;
    let creditInfo;
    let fallbackStamp;
    while (true) {
      let currentModel = swappedModel ?? modelChain[chainIndex];
      let accessFallback = nextFallbackModel(modelChain, chainIndex, currentModel);
      let startedStreaming = false;
      let fallbackRequest;
      let pendingCredit = creditInfo;
      creditInfo = undefined;
      let pendingStamp = fallbackStamp;
      fallbackStamp = undefined;
      let visibleModel = resolveRefusalFallback({
        currentModel,
        compiledTablesOnly: false,
        alreadyUsed: swappedModel !== undefined,
        declined: false,
        inCascadeEpisode: false,
        cascadeNext: undefined,
        suppressionAlreadyLogged: true,
        requestDialog: context.requestDialog,
        isMainThread: isMainAgent,
        isAgentThread: false,
        consumerLacksDialogCapability: true,
        preferenceQuestionPending: false,
        serverDefaultFallbacksEnabled: () => false,
        selfTargetDefaultFallbacksEnabled: () => false,
        sticky: getStickyBetas(),
        threadedRequest: false,
      }).visibleModel;
      let assistantMessages = [];
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
          messages: normalizeMessagesForAPI(
            requestMessages_2,
            stripNonEssential ? [] : context.options.tools,
            undefined,
            {
              echoWireToolInputs: streamingGen,
              echoApiBlockOrder: isStellarDriftEnabled(),
              thinkingStripPlan,
              advisorStripPlan,
              reminderFold,
              projectDocsAsRound: true,
            },
          ),
          systemPrompt: asSystemPrompt([
            "You are a helpful AI assistant tasked with summarizing conversations.",
          ]),
          thinkingConfig: getThinkingConfig(context),
          tools: stripNonEssential ? [] : summaryTools,
          signal: context.abortController.signal,
          options: {
            async getToolPermissionContext() {
              return context.getAppState().toolPermissionContext;
            },
            model: currentModel,
            withoutToolDescribeHooks: context.options.settingsHooksOff,
            reminderFold,
            echoWireToolInputs: streamingGen,
            fallbackModel: modelChain[chainIndex + 1],
            accessFallbackModel: accessFallback,
            refusalFallbackModel: visibleModel,
            refusalFallbackModelLane: "visible",
            fallbackCreditLaneArmed: visibleModel !== undefined,
            fallbackCreditCode: pendingCredit?.code,
            fallbackCreditMintModel: pendingCredit?.mintModel,
            fallbackCreditMintRequestId: pendingCredit?.mintRequestId,
            fallbackStampFromModel: pendingStamp?.fromModel,
            fallbackStampCategory: pendingStamp?.category,
            fallbackStampTrigger: pendingStamp?.trigger,
            fallbackStampOriginalRequestId: pendingStamp?.originalRequestId,
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
            refusalFallbackEffort: pendingStamp?.effort ?? undefined,
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
              startedStreaming = true;
            compactStreamProgress?.(event);
          }
          if (event.type === "assistant") assistantMessages.push(event);
          if (event.type === "model_fallback_triggered") throw event.error;
          if (event.type === "fallback_request") {
            fallbackRequest = event;
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
        if (fallbackRequest !== undefined) {
          let fallbackModel = fallbackRequest.fallbackModel;
          if (needsOverageConsentForModel(fallbackModel, context.requestDialog)) {
            let refusalFallback = getUsageCreditsOnlyModelConsentDeclineFallback();
            let shrinksWindow =
              refusalFallback !== null && swapShrinksContextWindow(modelChain[0], refusalFallback);
            if (refusalFallback === null || shrinksWindow) {
              if (isMainAgent)
                logFeatureBad(
                  "model_fable_consent",
                  shrinksWindow
                    ? "compact_refusal_fallback_shrinks_window"
                    : "compact_refusal_no_allowed_fallback",
                );
              if (shrinksWindow)
                throw Error(
                  "Compaction unavailable: the only model allowed after this refusal has a smaller context window \xB7 retry, or /model to change models",
                );
              throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                `Compaction unavailable: your model policy only allows ${renderUsageCreditsOnlyModelName(fallbackModel)}, which requires usage credits \xB7 /model to set it up`,
                "Compaction unavailable: model policy only allows Fable, which requires usage credits",
              );
            }
            if (isMainAgent) logFeatureSad("model_fable_consent", "compact_substituted");
            fallbackModel = refusalFallback;
          }
          swappedModel = fallbackModel;
          creditInfo =
            fallbackRequest.creditCode !== null
              ? {
                  code: fallbackRequest.creditCode,
                  mintModel: currentModel,
                  mintRequestId: fallbackRequest.requestId ?? undefined,
                }
              : undefined;
          fallbackStamp = {
            fromModel: fallbackRequest.originalModel,
            category: fallbackRequest.apiRefusalCategory ?? undefined,
            trigger: fallbackRequest.trigger,
            originalRequestId: fallbackRequest.requestId ?? undefined,
            effort: fallbackRequest.refusedEffort.carry,
          };
          logEvent("tengu_refusal_fallback_triggered", {
            original_model: telemetrySafeModelName(currentModel),
            fallback_model: telemetrySafeModelName(swappedModel),
            trigger: fromEnum(fallbackRequest.trigger),
            request_id: sanitizeMarkName(fallbackRequest.requestId),
            prompt_skipped_reason: fromEnum(
              getFallbackDialogSkipReason({
                requestDialog: context.requestDialog,
                isMainThread: isMainAgent,
                silentAttempt: false,
                consumerLacksDialogCapability: true,
              }) ?? "no_dialog_host",
            ),
            api_refusal_category: fallbackRequest.apiRefusalCategory
              ? fromEnum(normalizeRefusalCategory(fallbackRequest.apiRefusalCategory))
              : undefined,
            route_matched:
              fallbackRequest.routeMatched != null ? fromEnum(fallbackRequest.routeMatched) : undefined,
            has_api_refusal_explanation: Boolean(fallbackRequest.apiRefusalExplanation),
            credit_minted: fallbackRequest.creditCode !== null,
            ...refusedEffortTelemetryFields(fallbackRequest.refusedEffort),
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
        let last = assistantMessages.at(-1);
        if (last) {
          if (swappedModel !== undefined && !last.isApiErrorMessage) logFeatureOk("refusal_fallback");
          return {
            response: last.isApiErrorMessage ? last : (findSummaryMessage(assistantMessages) ?? last),
            mediaStripped: true,
          };
        }
        if (context.abortController.signal.aborted) throw Error(API_REQUEST_ABORTED_MESSAGE);
        logForDebugging(`Compact streaming failed. hasStartedStreaming=${startedStreaming}`, {
          level: "error",
        });
        logEvent("tengu_compact_failed", {
          reason: lit_2("no_streaming_response"),
          preCompactTokenCount,
          hasStartedStreaming: startedStreaming,
          promptCacheSharingEnabled: cacheSharingEnabled,
        });
        throw Error(ERROR_MESSAGE_INCOMPLETE_RESPONSE);
      } catch (error) {
        if (isFallbackTo(accessFallback, error)) modelChain.push(accessFallback);
        let nextModel = modelChain[chainIndex + 1];
        if (nextModel !== undefined && needsOverageConsentForModel(nextModel, context.requestDialog)) {
          let consentFallback = getUsageCreditsOnlyModelConsentDeclineFallback() ?? undefined;
          nextModel =
            consentFallback !== undefined && !swapShrinksContextWindow(modelChain[0], consentFallback)
              ? consentFallback
              : undefined;
          if (nextModel !== undefined) modelChain[chainIndex + 1] = nextModel;
        }
        if (error instanceof FallbackTriggeredError && nextModel !== undefined) {
          if (isNoModelFallbackEnabled()) noModelFallbackTripwire();
          logFeatureOk("model_fallback");
          logEvent("tengu_model_fallback_triggered", {
            original_model: telemetrySafeModelName(error.originalModel),
            fallback_model: telemetrySafeModelName(nextModel),
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
          swappedModel = undefined;
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
//@ chunk-5xgkngpb.js:2490752-2490836 layout
/**
 * 从消息中提取已发现（ToolSearch 加载过）的工具名，压缩边界上记录。
 */
function getDiscoveredToolNames(messages, context) {
  return extractDiscoveredToolNames([...messages], {
    surfaced: (context.stickyBetas ?? getStickyBetas()).surfacedOnWire,
  });
}
//@ chunk-5xgkngpb.js:2490836-2492554 layout
/**
 * 压缩后重新注入的附件：最近读过的文件、后台代理/shell 状态、peer handback 命令、计划文件、plan mode、已调用技能、延迟工具/代理列表/MCP 说明等增量公告、目标与 cron 携带，然后跑 SessionStart(compact) 钩子。返回 {attachments, hookResults}。
 */
async function buildPostCompactAttachments(
  readFileState,
  context,
  messagesToKeep,
  callSite,
  preCompactMessages,
  isMainThread,
  includeScratchTools = false,
) {
  let isSubagentContext = isDelegatedObservationContext(context.agentContext);
  let postCompactFileAttachments = await createPostCompactFileAttachments(
    readFileState,
    context,
    POST_COMPACT_MAX_FILES_TO_RESTORE,
    messagesToKeep,
  );
  let asyncAgentAttachments = isSubagentContext ? [] : await createAsyncAgentAttachmentsIfNeeded(context);
  let shellAttachments = isSubagentContext ? [] : createBackgroundShellAttachments(context);
  let peerHandbackCommands = collectPeerHandbackCommands(preCompactMessages, messagesToKeep);
  let agentId = context.agentId;
  let planAttachmentIfNeeded = await createPlanAttachmentIfNeeded(agentId, context.storageV5);
  let planModeAttachmentIfNeeded = await createPlanModeAttachmentIfNeeded(context);
  let skillAttachmentIfNeeded = createSkillAttachmentIfNeeded(agentId, messagesToKeep, preCompactMessages);
  let stickyBetas = stickyBetasForRequest(context);
  let declaredTools = stickyBetas === undefined ? undefined : asDeclaredToolSet(stickyBetas);
  let revokedTools = [];
  let scratchTools = [];
  let promptSnapshot = undefined;
  let stalePoint = undefined;
  try {
    revokedTools = getRevokedDeferredToolNames(declaredTools, context);
    scratchTools = includeScratchTools ? hasScratchToolSet(stickyBetas, context.options.tools) : [];
    let droppedToolNames = [...revokedTools, ...scratchTools];
    promptSnapshot =
      droppedToolNames.length === 0
        ? undefined
        : buildPromptSnapshotAttachment(messagesToKeep, new Set(droppedToolNames), context.options);
    stalePoint = promptSnapshot === undefined ? undefined : renderPointIfStale(messagesToKeep);
  } catch (error) {
    logError(error);
    revokedTools = [];
    scratchTools = [];
    promptSnapshot = undefined;
    stalePoint = undefined;
  }
  let toolsAfterRevocation =
    revokedTools.length === 0 ? declaredTools : declaredTools?.without(new Set(revokedTools));
  let refreshesTools = context.options.refreshTools !== undefined;
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
        toolsAfterRevocation,
        buildDeferredToolsLatchContext(stickyBetas, context),
        refreshesTools ? buildToolRevocationClassifier(context) : undefined,
        context.options,
      ),
      getDiscoveredToolNames(preCompactMessages, context),
    ),
    ...(await getAgentListingDeltaAttachment(context, messagesToKeep)),
    ...(areAttachmentsDisabled_2(context)
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
      toolsAfterRevocation,
      refreshesTools && isSortedOtterOn(),
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
  ].map((attachment) => createAttachmentMessage_2(attachment));
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
  if (stickyBetas !== undefined) {
    logDeclaredToolsDroppedAtCompaction(stickyBetas, revokedTools);
    logDeclaredToolsDroppedAtCompaction2(stickyBetas, scratchTools);
  }
  let announcementWalk = context.options.announcementWalk;
  let attachments = [
    ...postCompactFileAttachments,
    ...asyncAgentAttachments,
    ...shellAttachments,
    ...peerHandbackCommands,
    ...(planAttachmentIfNeeded ? [planAttachmentIfNeeded] : []),
    ...(planModeAttachmentIfNeeded ? [planModeAttachmentIfNeeded] : []),
    ...(skillAttachmentIfNeeded ? [skillAttachmentIfNeeded] : []),
    ...mapped,
    ...(projectsThreadAskAttachmentIfNeeded ? [projectsThreadAskAttachmentIfNeeded] : []),
    ...(goalStatusAttachmentIfNeeded ? [goalStatusAttachmentIfNeeded] : []),
    ...(sessionCronCarryAttachmentIfNeeded ? [sessionCronCarryAttachmentIfNeeded] : []),
    ...(promptSnapshot ? [createAttachmentMessage_2(promptSnapshot)] : []),
    ...(stalePoint ? [createAttachmentMessage_2(stalePoint)] : []),
  ];
  return {
    attachments: announcementWalk
      ? attachments.map((attachment) => announcementWalk(attachment))
      : attachments,
    hookResults,
  };
}
//@ chunk-5xgkngpb.js:2492554-2493142 fingerprint (2.1.88 match: createPostCompactFileAttachments, 0.969)
/**
 * 按时间倒序取最近读过的文件（排除保留段里已读的、计划/记忆等特殊文件），每个最多 5000 token 重新生成文件附件，总预算 50000。
 */
async function createPostCompactFileAttachments(
  readFileState,
  toolUseContext,
  maxFiles,
  preservedMessages = [],
) {
  let preservedReadPaths = collectReadToolFilePaths_2(preservedMessages);
  let excludePlanFile = shouldExcludeFromPostCompactRestore();
  let restored = true;
  let recentFiles = Object.entries(readFileState)
    .map(([filename, state]) => ({
      filename,
      ...state,
    }))
    .filter(
      (file) =>
        !isPlanFile(file.filename, excludePlanFile, toolUseContext.agentId) &&
        !preservedReadPaths.has(expandPath(file.filename)) &&
        !isPersistedArtifactPath(expandPath(file.filename)),
    )
    .sort((left, right) => right.timestamp - left.timestamp)
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
//@ chunk-5xgkngpb.js:2493142-2493313 fingerprint (2.1.88 match: createPlanAttachmentIfNeeded, 1)
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
//@ chunk-5xgkngpb.js:2493313-2494708 fingerprint (2.1.88 match: createSkillAttachmentIfNeeded, 0.551)
/**
 * 已调用技能（含从对话中恢复的）按最近调用排序，单个截到 5000 token、总预算 25000，生成 invoked_skills 附件。
 */
function createSkillAttachmentIfNeeded(agentId, messagesToKeep = [], preCompactMessages = []) {
  let invokedSkills = getInvokedSkillsForAgent(agentId);
  let fromConversation = new Set();
  if (agentId === undefined && isSoftSparkEnabled())
    for (let message of messagesSinceCompactBoundary([...preCompactMessages])) {
      let messageMs = Date.parse(message.timestamp) || 0;
      if (message.type === "attachment" && message.attachment.type === "invoked_skills") {
        let invokedAtMs = messageMs;
        for (let skill of message.attachment.skills) {
          let skillKey = `:${skill.name}`;
          if (!invokedSkills.has(skillKey) && skill.name && skill.path) {
            fromConversation.add(skillKey);
            invokedSkills.set(skillKey, {
              skillName: skill.name,
              skillPath: skill.path,
              content: skill.content,
              invokedAt: invokedAtMs,
              agentId: null,
              ...(skill.mcpSkill !== undefined && {
                servedByMcp: true,
              }),
            });
          }
          invokedAtMs = Math.min(invokedAtMs, invokedSkills.get(skillKey)?.invokedAt ?? invokedAtMs);
        }
      }
      if (message.type !== "user" || !message.invokedSkill) continue;
      let { name: skillName, path } = message.invokedSkill;
      let existing = invokedSkills.get(`:${skillName}`);
      let text = metaMessageText(message);
      if (
        typeof skillName === "string" &&
        typeof path === "string" &&
        text &&
        text !== existing?.content &&
        (existing?.invokedAt ?? -1) < messageMs
      ) {
        fromConversation.add(`:${skillName}`);
        invokedSkills.set(`:${skillName}`, {
          skillName,
          skillPath: path,
          content: text,
          invokedAt: messageMs,
          agentId: null,
          ...(message.mcpSkill != null && {
            servedByMcp: true,
          }),
        });
      }
    }
  let usedTokens = 0;
  let skills = [];
  let sorted = Array.from(invokedSkills.entries()).sort(
    ([, left], [, right]) => right.invokedAt - left.invokedAt,
  );
  for (let [skillKey, skill] of sorted) {
    if (!skill.content) continue;
    let invokedMcpSkill = findInvokedMcpSkill(preCompactMessages, skill.skillName, skill.content);
    if (skill.servedByMcp && invokedMcpSkill === undefined) continue;
    let restoreState = restoreSkillStateFromMessages(messagesToKeep, skill.content);
    if (restoreState === "attachment") continue;
    let keepFullContent = restoreState === "body" || fromConversation.has(skillKey);
    let content = truncateToTokens(skill.content, POST_COMPACT_MAX_TOKENS_PER_SKILL);
    let tokens = roughTokenCountEstimation(content);
    if (usedTokens + tokens > POST_COMPACT_SKILLS_TOKEN_BUDGET) {
      if (!keepFullContent) updateInvokedSkillContent(skillKey, "");
      continue;
    }
    usedTokens += tokens;
    if (!keepFullContent && content !== skill.content) updateInvokedSkillContent(skillKey, content);
    skills.push({
      name: skill.skillName,
      path: skill.skillPath,
      content,
      ...(invokedMcpSkill !== undefined && {
        mcpSkill: invokedMcpSkill,
      }),
    });
  }
  let fromConversationCount = countWhere(skills, (skill) => fromConversation.has(`:${skill.name}`));
  if (fromConversationCount > 0)
    logFeatureOk("compact_skill_from_conversation", {
      count: fromConversationCount,
    });
  return invokedSkillsAttachment(skills, preCompactMessages, messagesToKeep);
}
//@ chunk-5xgkngpb.js:2494708-2494858 layout
function invokedSkillsAttachment(skills, mcpEntries, options) {
  let mcpSkillEntries = [];
  if (skills.length === 0 && mcpSkillEntries.length === 0) return null;
  return createAttachmentMessage_2({
    type: "invoked_skills",
    skills,
    ...(mcpSkillEntries.length > 0 && {
      mcpSkillEntries,
    }),
  });
}
//@ chunk-5xgkngpb.js:2494858-2495205 fingerprint (2.1.88 match: createPlanModeAttachmentIfNeeded, 0.836)
/**
 * 处于 plan 模式时生成完整 plan_mode 提醒附件。
 */
async function createPlanModeAttachmentIfNeeded(context) {
  if (getToolPermissionContext(context).mode !== "plan") return null;
  if (isDiskless())
    return createAttachmentMessage_2(
      buildPlanModeAttachment(
        "full",
        context.agentId,
        context.options.tools,
        getToolPermissionContext(context),
      ),
    );
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
//@ chunk-5xgkngpb.js:2495205-2495393 layout
/**
 * 有活动目标或保留段之外有目标条件时生成 goal_status 附件。
 */
function createGoalStatusAttachmentIfNeeded(context, messagesToKeep, tools, carried) {
  if (!carried) return null;
  let activeGoal = context.getAppState().activeGoal;
  if (activeGoal !== undefined)
    return createAttachmentMessage_2(buildGoalSentinelAttachment(false, activeGoal.condition));
  let condition = findActiveGoalCondition(tools);
  if (condition === null || findActiveGoalCondition(messagesToKeep) === condition) return null;
  return createAttachmentMessage_2(buildGoalSentinelAttachment(true, condition));
}
//@ chunk-5xgkngpb.js:2495393-2495504 layout
/**
 * 把会话 cron/loop 唤醒等定时任务以 session_cron_carry 附件带过压缩。
 */
function createSessionCronCarryAttachmentIfNeeded(preCompactMessages, messagesToKeep, carry) {
  if (!carry) return null;
  try {
    let carried = carryLoopCronAcrossCompact(preCompactMessages, messagesToKeep);
    return carried === null ? null : createAttachmentMessage_2(carried);
  } catch (error) {
    logError(error);
    return null;
  }
}
//@ chunk-5xgkngpb.js:2495504-2495698 layout
/**
 * 自动模式 projects 线程中待回答请求的携带附件。
 */
function createProjectsThreadAskAttachmentIfNeeded(preCompactMessages, messagesToKeep, context, carry) {
  if (!carry) return null;
  try {
    if (!hasUpdateStatusToolOnly(context)) return null;
    let carried = carryProjectsThreadAsk(preCompactMessages, messagesToKeep, context);
    return carried === null ? null : createAttachmentMessage_2(carried);
  } catch (error) {
    logError(error);
    logFeatureBad("auto_mode_projects_thread_ask_carry", "carry_failed");
    return null;
  }
}
//@ chunk-5xgkngpb.js:2495698-2496217 fingerprint (2.1.88 match: createAsyncAgentAttachmentsIfNeeded, 0.903)
/**
 * 未取回的后台代理任务生成 task_status 附件（进度摘要或错误）。
 */
async function createAsyncAgentAttachmentsIfNeeded(context) {
  let appState = context.getAppState();
  let asyncAgents = Object.values(appState.tasks).filter((task) => task.type === "local_agent");
  let losesState = willToolsLoseSessionState(context.options.tools);
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
        outputFilePath: agent.webFetchSavedFiles || !losesState ? undefined : agent.outputFile,
        canContinueAgent,
      }),
    ];
  });
}
//@ chunk-5xgkngpb.js:2496217-2496694 layout
/**
 * 当前代理仍在运行的后台 shell 生成 task_status 附件（命令与描述截断）。
 */
function createBackgroundShellAttachments(context) {
  let losesState = willToolsLoseSessionState(context.options.tools);
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
        outputFilePath: losesState ? agent.outputFile : undefined,
        shell: {
          command: truncateWithCount(stripIgnorables(agent.command), TASK_STATUS_COMMAND_MAX_CHARS),
          kind: agent.kind ?? "bash",
          toolUseId: agent.toolUseId,
        },
      }),
    ];
  });
}
//@ chunk-5xgkngpb.js:2496694-2497052 layout
/**
 * 最后一条 assistant 之后、来自 peer 且 handback 的 queued_command 附件重新带上。
 */
function collectPeerHandbackCommands(preCompactMessages, messagesToKeep) {
  let lastIndex = preCompactMessages.findLastIndex(
    (message) => message.type === "assistant" && !message.isApiErrorMessage && !message.isVirtual,
  );
  let keptUuids = new Set(messagesToKeep.map((message) => message.uuid));
  return preCompactMessages.slice(lastIndex + 1).flatMap((message) =>
    message.type === "attachment" &&
    message.attachment.type === "queued_command" &&
    message.attachment.origin?.kind === "peer" &&
    message.attachment.origin.handback === true &&
    !keptUuids.has(message.uuid)
      ? [
          createAttachmentMessage_2({
            ...message.attachment,
            timestamp: undefined,
          }),
        ]
      : [],
  );
}
//@ chunk-5xgkngpb.js:2497052-2497615 layout (2.1.88 match: collectReadToolFilePaths, 1)
/**
 * 保留消息中 Read 工具读过的文件路径（排除结果已被清理为桩的）。
 */
function collectReadToolFilePaths_2(messages) {
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
      if (block.type !== "tool_use" || block.name !== READ || stubIds.has(block.id)) continue;
      let input = block.input;
      if (input && typeof input === "object" && "file_path" in input && typeof input.file_path === "string") {
        let expandedPath = expandPathOrNull(input.file_path);
        if (expandedPath !== null) paths.add(expandedPath);
      }
    }
  }
  return paths;
}
//@ chunk-5xgkngpb.js:2497615-2497699 placement
function truncateToTokens(content, maxTokens) {
  if (roughTokenCountEstimation(content) <= maxTokens) return content;
  let charBudget = maxTokens * 4 - SKILL_TRUNCATION_NOTE.length;
  return content.slice(0, charBudget) + SKILL_TRUNCATION_NOTE;
}
//@ chunk-5xgkngpb.js:2497699-2497892 placement
/**
 * 压缩后可恢复的记忆文件类型。
 */
function restorableMemoryTypes() {
  let hasCwd = getOriginalCwdOrNull() !== null;
  return MEMORY_TYPE_VALUES.filter((type) => {
    switch (type) {
      case "User":
        return !isDiskless();
      case "Project":
      case "Local":
        return hasCwd;
      case "AutoMem":
        return !isDiskless() && (hasCwd || getAutoMemPathOrNull() !== null);
      case "Managed":
        return true;
    }
  });
}
//@ chunk-5xgkngpb.js:2497892-2497976 placement
function shouldExcludeFromPostCompactRestore() {
  try {
    return new Set(restorableMemoryTypes().map((type) => expandPath(getMemoryPath(type))));
  } catch {
    return new Set();
  }
}
//@ chunk-5xgkngpb.js:2497976-2498069 placement
/**
 * 判断文件是否就是当前计划的文件（压缩时不保留）。
 */
function isPlanFile(filename, excludePlanFile, agentId) {
  let expanded = expandPath(filename);
  try {
    let planPath = expandPath(getPlanFilePath(agentId));
    if (expanded === planPath) return true;
  } catch {}
  return excludePlanFile.has(expanded);
}
//@ chunk-5xgkngpb.js:2498069-2498201 placement
/**
 * 压缩失败的遥测码。
 */
function compactFailureCode(summaryResponse) {
  if (summaryResponse.apiError === "dlp_request_denied")
    return formatApiErrorType("dlp_request_denied", summaryResponse.apiErrorStatus);
  return fromEnum(summaryResponse.error ?? "unknown");
}
//@ chunk-5xgkngpb.js:2498201-2498803 placement
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
      (message) =>
        (message.type === "attachment" &&
          message.attachment.type === "queued_command" &&
          message.attachment.commandMode === "prompt" &&
          message.attachment.isMeta !== true) ||
        (isHumanPromptMessage(message) && !(message.type === "user" && message.isCompactSummary)),
    )
      ? lit_2("prompt")
      : sliced.some((message) => message.type === "user" && message.isVirtual !== true)
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
//@ chunk-5xgkngpb.js:2498803-2498916 placement
/**
 * 压缩时引用的 transcript 路径（无盘或关闭持久化时 undefined）。
 */
function compactTranscriptPath(context) {
  if (isDiskless() || isTranscriptPersistenceDisabled() || context.compactTranscriptUnavailable) return;
  return context.agentId !== undefined ? getAgentTranscriptPath(context.agentId) : getTranscriptPath();
}
//@ chunk-5xgkngpb.js:2498916-2499012 placement
/**
 * 按消息 token 数给出压缩恢复的超时。
 */
function recoveryTimeoutForMessages(messages, rawMessage) {
  let estimated = estimateTokensWithAnchor(messages) || 0;
  let actual = (rawMessage !== undefined && parsePromptTooLongTokenCounts(rawMessage).actualTokens) || 0;
  return recoveryTimeoutForContextTokens(Math.max(estimated, actual));
}
//@ chunk-5xgkngpb.js:2499012-2499084 placement
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
//@ chunk-5xgkngpb.js:2499084-2499094 placement
/**
 * 连续压缩失败的上限（3 次）触发熔断。
 */
var MAX_CONSECUTIVE_COMPACT_FAILURES = 3;
//@ chunk-5xgkngpb.js:2499094-2499550 placement
/**
 * 记一次自动压缩失败，连续失败达到上限时触发熔断。
 */
function autocompactFailure(state, reactive, reason, compactFailure) {
  let failures = (state?.consecutiveFailures ?? 0) + 1;
  if (failures >= MAX_CONSECUTIVE_COMPACT_FAILURES) {
    logForDebugging(
      `autocompact: circuit breaker tripped after ${failures} consecutive failures${reactive ? " (reactive path)" : ""} \u2014 skipping future attempts this session`,
      {
        level: "warn",
      },
    );
    logEvent("tengu_auto_compact_circuit_breaker", {
      consecutiveFailures: failures,
      ...(reactive && {
        routedThroughReactive: reactive,
      }),
      ...(reason && {
        thresholdSource: fromEnum(reason),
      }),
    });
  }
  return {
    kind: "failed",
    consecutiveFailures: failures,
    routedThroughReactive: reactive,
    thresholdSource: reason,
    compactFailure,
  };
}
//@ chunk-5xgkngpb.js:2499550-2500203 placement
/**
 * 实际输入超过阈值时分析前缀大小与文档/图片块数量。
 */
function analyzeOversizedPrefix(messages, modelInfo, autoCompactWindow, snipTokensFreed = 0) {
  let lastApiUsage = getLastApiUsage(messages);
  if (!lastApiUsage) return null;
  let totalInputTokens =
    lastApiUsage.input_tokens +
    lastApiUsage.cache_read_input_tokens +
    lastApiUsage.cache_creation_input_tokens;
  let messagesEstimate = roughTokenCountEstimationForMessages(messages, modelInfo.bytesPerToken);
  let max = Math.max(0, totalInputTokens - snipTokensFreed - messagesEstimate);
  let autoCompactThresholdTokens = getAutoCompactThresholdTokens(modelInfo, autoCompactWindow);
  if (max <= autoCompactThresholdTokens) return null;
  let documentBlockCount = 0;
  let imageBlockCount = 0;
  let countBlocks = (content) => {
    for (let block of content) {
      let entry = block;
      if (entry.type === "document" && entry.source?.type !== "text" && entry.source?.type !== "content")
        documentBlockCount++;
      else if (entry.type === "image") imageBlockCount++;
      else if (entry.type === "tool_result" && Array.isArray(entry.content)) countBlocks(entry.content);
    }
  };
  for (let message of messages) {
    let content = message.message?.content;
    if (Array.isArray(content)) countBlocks(content);
  }
  return {
    prefixTokens: max,
    thresholdTokens: autoCompactThresholdTokens,
    totalInputTokens,
    messagesEstimate,
    snipTokensFreed,
    documentBlockCount,
    imageBlockCount,
  };
}
//@ chunk-5xgkngpb.js:2500203-2500252 placement
/**
 * 是否开启冷压缩（CLAUDE_CODE_COLD_COMPACT）。
 */
function isColdCompactEnabled() {
  return env.CLAUDE_CODE_COLD_COMPACT;
}
//@ chunk-hnxhr3bs.js:26630-26709 fingerprint (2.1.88 match: stripReinjectedAttachments, 0.51)
/**
 * 附件类型为 skill_listing 或 agent_listing_delta（压缩后会重新注入的列表类附件）。旧版名 stripReinjectedAttachments 为错配（这里只是判断）。
 */
function isReinjectedListingAttachment(messages) {
  return messages.type === "skill_listing" || messages.type === "agent_listing_delta";
}
export {
  getTokenCountFromUsage_6,
  metaMessageText,
  compactConversation,
  buildPostCompactMessages,
  COMPACTION_BLOCKED_BY_HOOK,
  API_REQUEST_ABORTED_MESSAGE,
  applyPreservedMessages,
  USER_SENT_MESSAGE_PREFIX,
  ERROR_MESSAGE_NOT_ENOUGH_MESSAGES,
  CompactionError,
  mergeHookInstructions,
  buildReactiveCompactionResult,
  runCompactHooks,
  MAX_CONSECUTIVE_COMPACT_FAILURES,
  analyzeOversizedPrefix,
  recoveryTimeoutForMessages,
  autocompactFailure,
  isColdCompactEnabled,
  isCompactionFailure,
  ERROR_MESSAGE_PROMPT_TOO_LONG,
  createClassifierOverflowReminder,
  compactTranscriptPath,
  stripImagesFromMessages,
  createCompactCanUseTool,
  excludeSameModelFallbacks,
  logSummaryReply,
  COMPACT_SUMMARY_FAILED,
  isRealAssistantMessage,
  POST_COMPACT_MAX_FILES_TO_RESTORE,
  POST_COMPACT_MAX_TOKENS_PER_FILE,
  POST_COMPACT_SKILLS_TOKEN_BUDGET,
  getIndexAfterLastAssistantOrToolResult,
  isHumanPromptMessage,
  MAX_PTL_RETRIES,
  truncateHeadForPTLRetry,
  countNonProgressMessages,
  noopAsync_3,
  resolveCompactionKind,
  startCompactingStatusTicker,
  SKILL_TRUNCATION_NOTE,
  groupByApiRound,
  partialCompactConversation,
  buildPostCompactMessages_2,
  HOOK_STOPPED_MESSAGE,
  isReinjectedListingAttachment,
  buildPostCompactMessagesWithoutKept,
  hasTooFewMessagesToCompact,
};
