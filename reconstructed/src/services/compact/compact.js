/**
 * services/compact/compact.ts
 *
 * 对话压缩主体：compactConversation（整段摘要）、partialCompactConversation（按选中消息前/后部分摘要）、摘要请求（fork 共享缓存 / 直连回退）、压缩后附件重注入（文件、计划、技能、后台任务、钩子）与边界消息。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/compact/compact.ts
 * pieces: chunk-ag5x7vhf.js (1), chunk-e6aww6q8.js (78)
 * attribution: fingerprint 19, placement 33, sole-consumer 1, layout 26
 */
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
import { jb } from "../../bootstrap/sessionSlices.js";
import { Us, isCompactBoundaryMessage as isCompactBoundaryMessage_3, Kfe } from "../projects/threadRows.js";
import { isMainQuerySource, classifyQuerySource } from "../api/requestHeaders.js";
import { Tp, getAutoCompactThresholdTokens } from "./autoCompact.js";
import { jir } from "../../utils/remoteFileState.js";
import { i6 } from "../../memdir/findRelevantMemories.js";
import { notifyCompaction } from "../api/promptCacheBreakDetection.js";
import {
  reAppendSessionMetadataAfterCompaction,
  cleanMessagesForLogging,
  isTranscriptPersistenceDisabled,
  getAgentTranscriptPath,
  getTranscriptPath,
} from "../../utils/sessionStorage.js";
import { Lg, roughTokenCountEstimation } from "../tokenEstimation.js";
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
import { hfe } from "./postCompactCleanup.js";
import { executePostCompactHooks, executePreCompactHooks } from "../../utils/hooks.js";
import {
  appendPreservedTailNote,
  compactPromptVariant,
  buildCompactArtifactNote,
  createCompactStreamProgress,
  NTe,
  findSummaryMessage,
} from "./reactiveCompact.js";
import {
  setCumulativeDroppedTokens,
  getTokenUsage,
  tokenCountFromLastAPIResponse,
  getLastApiUsage,
} from "../../utils/tokens.js";
import { tokenStatsToStatsigMetrics, analyzeContext } from "../../utils/contextAnalysis.js";
import { logError } from "../../utils/log.js";
import { getEffortLevelIfSupported } from "../../utils/effort.js";
import {
  getEffortValue,
  getEffortLayerOverride,
  getToolPermissionContext,
  getMainLoopModel as getMainLoopModel_2,
  getThinkingConfig,
  getEffortSetAsideByHold,
} from "../../utils/permissions/toolPermissionContext.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../analytics/featureTelemetry.js";
import { notePendingConversationEdit } from "../../utils/shell/shellToolUtils.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum, fromEnumOpt, lit as lit_2 } from "../analytics/safeMetadata.js";
import { agentTypeForTelemetry } from "../analytics/metadata.js";
import { M9 } from "../api/cacheKeepalive.js";
import { isDelegatedObservationContext } from "../../utils/agentContext.js";
import { processSessionStartHooks } from "../../utils/sessionStart.js";
import { bl } from "../../utils/toolResultStorage.js";
import {
  getPromptTooLongGap,
  PROMPT_TOO_LONG_ERROR_MESSAGE,
  startsWithApiErrorPrefix,
  parsePromptTooLongTokenCounts,
} from "../api/errors.js";
import { logForDebugging, createAttachmentMessage_2 } from "../../utils/debug.js";
import { count } from "../../utils/collections.js";
import { getRuntimeMainLoopModel } from "../../utils/model/planModeModel.js";
import { Bn } from "../../utils/model/modelIds.js";
import { modelSupportsAdaptiveThinking } from "../../utils/thinking.js";
import { getCanonicalName } from "../../utils/model/canonicalModelName.js";
import { keptThinkingStripDecision, isSoftSparkEnabled } from "./compactSettings.js";
import { endToolExecutionSpan_2, Cnr, setSpanError } from "../../utils/telemetry/sessionTracing.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { getCompactPrompt, getPartialCompactPrompt, hasSummaryBlock, hasSummaryTagLine } from "./prompt.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import {
  withTelemetryMessage,
  hasExactErrorMessage,
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../../utils/errors.js";
import { jFe } from "../../utils/messages/untrustedArtifactContent.js";
import { getToolsUsedForSummary } from "../../utils/agentListing.js";
import { ye } from "../../utils/startupMarks.js";
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
import { sWt } from "../api/overageConsent.js";
import {
  getUsageCreditsOnlyModelConsentDeclineFallback,
  isNoModelFallbackEnabled,
  buildAvailabilityFallbackChain,
  noModelFallbackTripwire,
} from "../../utils/model/modelFallback.js";
import { renderUsageCreditsOnlyModelName, renderModelName } from "../../utils/model/modelDisplay.js";
import { nextFallbackModel, pzr } from "../../query/modelSelection.js";
import { resolveRefusalFallback, modelUnavailableMessage } from "../api/modelFallback.js";
import { shouldEchoWireToolInputs } from "../../utils/wireToolInputEcho.js";
import { queryModelWithStreaming } from "../api/claude.js";
import { isStellarDriftEnabled } from "../../utils/api.js";
import { asSystemPrompt } from "../../utils/systemPromptType.js";
import { currentProactivityLevel } from "../../Tool.js";
import { telemetrySafeModelName } from "../../utils/model/telemetryModelName.js";
import { getFallbackDialogSkipReason, normalizeRefusalCategory } from "../api/refusalFallback.js";
import { refusedEffortTelemetryFields } from "../../utils/permissions/permissionSetup.js";
import { FallbackTriggeredError } from "../api/withRetry.js";
import {
  Cqe,
  DSe,
  aoi,
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
import { buildPromptSnapshotAttachment, Tbt } from "../../utils/contextAttachments/promptSnapshot.js";
import {
  withToolsLoadedBeforeSummary,
  getProactivityAttachmentToKeep,
} from "./_new/withToolsLoadedBeforeSummary.js";
import { isSortedOtterOn } from "../mcp/mcpGates.js";
import { getSandboxInstructionsAttachments } from "../../utils/attachments/sandboxInstructions.js";
import { getPostCompactEnvironmentAttachments, Iln } from "../../utils/attachments/environmentChange.js";
import { gl } from "../../utils/cwd.js";
import { carryStyleAndLanguageAttachments } from "../../utils/contextAttachments/outputStyleLanguage.js";
import { isRemoteToolForwardingSwitchOn } from "../remoteTools/servingGates.js";
import { XVe } from "../../utils/worktreeIsolation.js";
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
import { carryLoopCronAcrossCompact, carryProjectsThreadAsk, HM } from "./compactCarry.js";
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
/**
 * meta 用户消息的纯文本内容（全是文本块时拼接）。
 */
//@ chunk-e6aww6q8.js:1630292-1630550 placement
function metaMessageText(e) {
  if (e.type !== "user" || !e.isMeta) return null;
  let n = e.message?.content;
  if (typeof n === "string") return n;
  if (!Array.isArray(n)) return null;
  let filtered = n.filter((s) => s?.type === "text");
  if (filtered.length !== n.length) return null;
  return filtered.map((s) => s.text).join(`

`);
}
//@ chunk-e6aww6q8.js:2085167-2085194 sole-consumer
var bsr = new HostScoped(() => new PermissionContextLogState());
//@ chunk-e6aww6q8.js:2085194-2085233 placement
function Ssn() {
  return bsr.of(getRootSession().host);
}
//@ chunk-e6aww6q8.js:2085233-2085278 placement
function Csr() {
  return Ssn().ociContainerId();
}
//@ chunk-e6aww6q8.js:2085278-2085309 placement
async function Omn(e, n) {
  return;
}
//@ chunk-e6aww6q8.js:2085309-2085323 placement
var Asr = 30000;
//@ chunk-e6aww6q8.js:2085323-2085394 placement
function O2(e) {
  let n = setInterval(emitCompactingStatus, Asr, e);
  return () => clearInterval(n);
}
/**
 * 按 API 回合（助手消息 id 变化）把消息分组。
 */
//@ chunk-e6aww6q8.js:2085461-2085728 placement
function groupByApiRound(e) {
  let n = [],
    r = [],
    s;
  for (let h of e) {
    if (jb(h)) {
      r.push(h);
      continue;
    }
    if (h.type === "assistant" && h.message.id !== s && !h.resumedFromIncompleteThinking && r.length > 0)
      (n.push(r), (r = [h]));
    else r.push(h);
    if (h.type === "assistant") s = h.message.id;
  }
  if (r.length > 0) n.push(r);
  return n;
}
//@ chunk-e6aww6q8.js:2085728-2085802 placement = countUnseenAssistantTurns (1)
function countNonProgressMessages(e) {
  let filtered = Us(e).filter((r) => r.type !== "progress");
  return groupByApiRound(filtered);
}
//@ chunk-e6aww6q8.js:2085802-2085841 placement
function r8s(e) {
  return countNonProgressMessages(e).length < 2;
}
/**
 * 反应式/预计算压缩成功后组装 CompactionResult：清 readFileState、边界消息、保留消息（可剥 thinking）、压缩后附件、PostCompact 钩子、计算 postTokens，记 tengu_reactive_compact_succeeded。旧版名 createCompactionResultFromSessionMemory 为错配。
 */
//@ chunk-e6aww6q8.js:2134246-2138079 placement = createCompactionResultFromSessionMemory (0.132)
async function buildReactiveCompactionResult(e) {
  let {
      compactResult: compactResult,
      preCompactMessages: preCompactMessages,
      startTime: startTime,
      cacheSafeParams: cacheSafeParams,
      querySource: querySource,
      trigger: trigger,
      thresholdSource: thresholdSource,
      thresholdWindow: thresholdWindow,
      precomputed: precomputed,
      manualPrecomputeReuse: manualPrecomputeReuse,
      precomputeTelemetry: precomputeTelemetry,
      mainChainTailAtStart: mainChainTailAtStart,
      cacheCold: cacheCold,
    } = e,
    { toolUseContext: toolUseContext } = cacheSafeParams,
    compactionKind = e.compactionKind ?? f8e(trigger, thresholdSource),
    isMainThreadQuery = isMainQuerySource(querySource),
    preCompactTokens = e.preCompactTokens ?? Tp(preCompactMessages),
    preCompactReadFileState = jir(toolUseContext.readFileState);
  if (
    (toolUseContext.readFileState.clear(),
    i6(toolUseContext.memorySelector),
    notifyCompaction(toolUseContext.agentId),
    isMainThreadQuery)
  )
    (await reAppendSessionMetadataAfterCompaction(toolUseContext.storageV5),
      markPostCompaction(Lg([...compactResult.summaryMessages, ...e.messagesToPreserve])));
  let We = preCompactMessages.at(-1)?.uuid,
    boundaryMarker = createCompactBoundaryMessage(trigger, preCompactTokens, We);
  if (((boundaryMarker.compactMetadata.durationMs = Math.round(performance.now() - startTime)), precomputed))
    boundaryMarker.compactMetadata.precomputed = !0;
  let discoveredToolNames = getDiscoveredToolNames(preCompactMessages, cacheSafeParams.toolUseContext);
  if (discoveredToolNames.size > 0)
    boundaryMarker.compactMetadata.preCompactDiscoveredTools = [...discoveredToolNames].sort();
  stampPreCompactReadVersions(boundaryMarker, toolUseContext.agentId, toolUseContext.getAppState());
  let messagesToKeep = e.messagesToPreserve.map(getTokenCountFromUsage_4),
    keptThinking = decideKeptThinkingStrip(messagesToKeep, toolUseContext),
    pt = hfe(querySource, toolUseContext.agentId),
    postCompactAttachments = await buildPostCompactAttachments(
      preCompactReadFileState,
      toolUseContext,
      messagesToKeep,
      "reactive_compact",
      preCompactMessages,
      pt,
      compactionKind === "reactive",
    ).catch((no) =>
      fallbackPostCompactAttachments(no, toolUseContext, preCompactMessages, messagesToKeep, pt),
    );
  toolUseContext.onCompactEvent?.({
    type: "compact_progress",
    event: { type: "hooks_start", hookType: "post_compact" },
  });
  let postCompactHookResult = await executePostCompactHooks(
      toolUseContext.session,
      { trigger: trigger, compactSummary: compactResult.summaryText },
      toolUseContext,
      toolUseContext.abortController.signal,
    ),
    annotatedBoundary = annotateBoundaryWithPreservedSegment(
      boundaryMarker,
      compactResult.summaryMessages.at(-1).uuid,
      messagesToKeep,
      preCompactMessages,
    ),
    At =
      messagesToKeep.length > 0
        ? compactResult.summaryMessages.map(appendPreservedTailNote)
        : compactResult.summaryMessages,
    It = {
      boundaryMarker: annotatedBoundary,
      summaryMessages: At,
      messagesToKeep: messagesToKeep,
      attachments: keptThinking.marker
        ? [keptThinking.marker, ...postCompactAttachments.attachments]
        : postCompactAttachments.attachments,
      hookResults: postCompactAttachments.hookResults,
      userDisplayMessage: postCompactHookResult.userDisplayMessage,
      preCompactTokenCount: preCompactTokens,
      ...(!precomputed && { compactionUsage: compactResult.totalUsage }),
    },
    postCompactTokenCount = Lg(buildPostCompactMessages(It));
  if (
    ((annotatedBoundary.compactMetadata.postTokens = postCompactTokenCount),
    setCumulativeDroppedTokens(annotatedBoundary, preCompactMessages),
    isMainThreadQuery)
  )
    setLastMainThreadContextTokens(postCompactTokenCount);
  let qt = (() => {
      try {
        return tokenStatsToStatsigMetrics(analyzeContext(preCompactMessages));
      } catch (error) {
        return (logError(error), {});
      }
    })(),
    totalUsage = compactResult.totalUsage,
    rn =
      totalUsage.input_tokens + totalUsage.cache_creation_input_tokens + totalUsage.cache_read_input_tokens,
    pn = getEffortLevelIfSupported(
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
  if (
    (logEvent("tengu_reactive_compact_succeeded", {
      ...(pn && { effort_level: fromEnum(pn) }),
      querySource: querySource === void 0 ? void 0 : agentTypeForTelemetry(querySource),
      attempts: compactResult.attempt,
      groupsPreserved: compactResult.groupsPreserved,
      totalGroups: compactResult.totalGroups,
      splitKind: fromEnum(compactResult.splitKind),
      headTruncations: compactResult.headTruncations,
      leaveOutPasses: compactResult.leaveOutPasses,
      preservedUuidCount: annotatedBoundary.compactMetadata.preservedMessages?.uuids.length ?? 0,
      preservedMessageCount: messagesToKeep.length,
      keptThinkingBlockCount: keptThinking.thinkingBlockCount,
      keptThinkingStripped: keptThinking.marker !== void 0,
      keptThinkingStripDecidedBy: fromEnumOpt(keptThinking.decidedBy),
      forkAssistantMessageCount: compactResult.forkAssistantMessageCount,
      summaryPromptArm: fromEnumOpt(compactResult.promptArm),
      summaryScopeWarned: compactResult.scopeWarned,
      trigger: fromEnum(trigger),
      thresholdSource: fromEnumOpt(thresholdSource),
      autoCompactWindow: thresholdWindow?.window,
      autoCompactWindowOrigin: fromEnumOpt(thresholdWindow?.origin),
      preCompactTokens: preCompactTokens,
      postCompactTokens: postCompactTokenCount,
      restoredAttachmentCount:
        postCompactAttachments.attachments.length + postCompactAttachments.hookResults.length,
      durationMs: Math.round(performance.now() - startTime),
      userWaitMs: Math.round(performance.now() - startTime),
      precomputed: precomputed,
      manualPrecomputeReuse: fromEnumOpt(manualPrecomputeReuse),
      precomputeBorrowed: precomputeTelemetry?.borrowed,
      precomputeStatusAtPTL: fromEnumOpt(precomputeTelemetry?.statusAtPTL),
      precomputeLeadMs: precomputeTelemetry ? Math.round(precomputeTelemetry.leadMs) : void 0,
      precomputeTotalMs: precomputeTelemetry ? Math.round(precomputeTelemetry.totalMs) : void 0,
      messagesSincePrecompute: precomputed
        ? messagesToKeep.length - compactResult.messagesToPreserve.length
        : void 0,
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
      cacheCold: cacheCold,
      ...qt,
    }),
    hfe(querySource, toolUseContext.agentId))
  )
    (armPendingContextCompacted(compactionKind, mainChainTailAtStart), M9(mainChainTailAtStart));
  return { ok: !0, result: It };
}
/**
 * 压缩前后运行压缩相关钩子，钩子可替换压缩结果。
 */
//@ chunk-e6aww6q8.js:2138079-2139711 placement
async function runCompactHooks(e) {
  let {
      replacement: replacement,
      preCompactMessages: preCompactMessages,
      cacheSafeParams: cacheSafeParams,
      querySource: querySource,
      trigger: trigger,
      startTime: startTime,
      coreBoundary: coreBoundary,
    } = e,
    { toolUseContext: toolUseContext } = cacheSafeParams,
    G = coreBoundary !== void 0,
    q = isMainQuerySource(querySource),
    Z = Tp(preCompactMessages);
  if (!G) {
    if (
      (toolUseContext.readFileState.clear(),
      i6(toolUseContext.memorySelector),
      notifyCompaction(toolUseContext.agentId),
      q)
    )
      (await reAppendSessionMetadataAfterCompaction(toolUseContext.storageV5),
        markPostCompaction(Lg(replacement)));
  }
  let Se =
    coreBoundary !== void 0 && isCompactBoundaryMessage_3(coreBoundary)
      ? {
          ...coreBoundary,
          compactMetadata: {
            ...coreBoundary.compactMetadata,
            preservedSegment: void 0,
            preservedMessages: void 0,
            preCompactArtifactReadVersions: void 0,
          },
        }
      : createCompactBoundaryMessage(trigger, Z, preCompactMessages.at(-1)?.uuid);
  if (((Se.compactMetadata.durationMs = Math.round(performance.now() - startTime)), e.precomputed))
    Se.compactMetadata.precomputed = !0;
  let ke = [],
    we;
  if (!G) {
    if (
      (toolUseContext.onCompactEvent?.({
        type: "compact_progress",
        event: { type: "hooks_start", hookType: "post_compact" },
      }),
      (we = (
        await executePostCompactHooks(
          toolUseContext.session,
          { trigger: trigger, compactSummary: "" },
          toolUseContext,
          toolUseContext.abortController.signal,
        )
      ).userDisplayMessage),
      !isDelegatedObservationContext(toolUseContext.agentContext) && !toolUseContext.options.settingsHooksOff)
    )
      (toolUseContext.onCompactEvent?.({
        type: "compact_progress",
        event: { type: "hooks_start", hookType: "session_start" },
      }),
        (ke = await processSessionStartHooks(toolUseContext.session, "compact", {
          model: toolUseContext.options.mainLoopModel,
          agentContext: toolUseContext.agentContext,
          storageV5: toolUseContext.storageV5,
          credentials: toolUseContext.credentials,
        })));
  }
  let Ee = {
      boundaryMarker: Se,
      summaryMessages: [],
      replacement: replacement,
      messagesToKeep: [],
      attachments: [],
      hookResults: ke,
      userDisplayMessage: we,
      preCompactTokenCount: Z,
    },
    Ae = Lg(buildPostCompactMessages(Ee));
  if (((Se.compactMetadata.postTokens = Ae), setCumulativeDroppedTokens(Se, preCompactMessages), q))
    setLastMainThreadContextTokens(Ae);
  if (q) notePendingConversationEdit("compact");
  if (!G && e.compactionKind !== void 0 && hfe(querySource, toolUseContext.agentId))
    armPendingContextCompacted(e.compactionKind, e.mainChainTailAtStart);
  return (
    logEvent("tengu_compact_replaced_by_hook", {
      trigger: fromEnum(trigger),
      ranCore: G,
      precomputed: e.precomputed === !0,
      preCompactTokens: Z,
      postCompactTokens: Ae,
      messageCount: replacement.length,
      ...(querySource !== void 0 && { querySource: agentTypeForTelemetry(querySource) }),
    }),
    Ee
  );
}
//@ chunk-e6aww6q8.js:2139711-2139787 placement
function f8e(e, n) {
  return e === "manual" ? "manual" : n !== void 0 ? "auto" : "reactive";
}
/**
 * 压缩附件生成失败时的兜底附件（计划模式、项目线程询问、目标、定时任务）。
 */
//@ chunk-e6aww6q8.js:2139787-2140059 placement
async function fallbackPostCompactAttachments(e, n, r, s, h) {
  logError(e);
  let y = await createPlanModeAttachmentIfNeeded(n).catch((Z) => (logError(Z), null)),
    S = createProjectsThreadAskAttachmentIfNeeded(r, s, n.options.tools, h),
    w = createGoalStatusAttachmentIfNeeded(n, r, s, h),
    L = createSessionCronCarryAttachmentIfNeeded(r, s, h),
    announcementWalk = n.options.announcementWalk,
    q = [...(y ? [y] : []), ...(S ? [S] : []), ...(w ? [w] : []), ...(L ? [L] : [])];
  return { attachments: announcementWalk ? q.map((Z) => announcementWalk(Z)) : q, hookResults: [] };
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
/**
 * 找出压缩边界保留的消息及锚点。
 */
//@ chunk-e6aww6q8.js:2140258-2140520 placement
function resolvePreservedMessages(e, n, r) {
  let preservedMessages = n.compactMetadata.preservedMessages;
  if (!preservedMessages) return null;
  let mapped = (preservedMessages.allUuids ?? preservedMessages.uuids)
    .map((y) => e.find((S) => S.uuid === y) ?? r?.find((S) => S.uuid === y))
    .filter((y) => y !== void 0)
    .map(getTokenCountFromUsage_4);
  return mapped.length > 0 ? { preserved: mapped, anchorUuid: preservedMessages.anchorUuid } : null;
}
/**
 * 在消息列表中按锚点移动保留的消息。
 */
//@ chunk-e6aww6q8.js:2140520-2140841 placement
function applyPreservedMessages(e, n, r, s) {
  if (isCompactBoundaryMessage_3(n)) {
    let h = resolvePreservedMessages(e, n, s);
    if (h === null) return null;
    let y = new Set(h.preserved.map((w) => w.uuid)),
      filtered = e.filter((w) => !y.has(w.uuid));
    if (((e.length = 0), e.push(...filtered), h.anchorUuid === n.uuid)) return (e.push(...h.preserved), null);
    return h;
  }
  if (r !== null && r.anchorUuid === n.uuid) return (e.push(...r.preserved), null);
  return r;
}
//@ chunk-e6aww6q8.js:2140841-2141025 placement = buildPostCompactMessages (0.833)
function buildPostCompactMessages_2(e, n) {
  let mapped = e.messagesToKeep.map(getTokenCountFromUsage_4),
    s = n === "up_to" ? [...e.summaryMessages, ...mapped] : [...mapped, ...e.summaryMessages];
  return [e.boundaryMarker, ...s, ...e.attachments, ...e.hookResults];
}
/**
 * 200：后台 shell 描述截断长度。
 */
//@ chunk-e6aww6q8.js:2406920-2406984 placement
var POST_COMPACT_MAX_FILES_TO_RESTORE = 5,
  POST_COMPACT_TOKEN_BUDGET = 50000,
  POST_COMPACT_MAX_TOKENS_PER_FILE = 5000,
  POST_COMPACT_MAX_TOKENS_PER_SKILL = 5000,
  POST_COMPACT_SKILLS_TOKEN_BUDGET = 25000,
  TASK_STATUS_COMMAND_MAX_CHARS = 500,
  TASK_STATUS_DESCRIPTION_MAX_CHARS = 200;
/**
 * 附件里的图片/文档换成 [image]/[document] 文本（queued_command 的 prompt、file 附件的 image/notebook/parts 内容）。
 */
//@ chunk-e6aww6q8.js:2406984-2407546 placement
function stripMediaFromAttachment(e) {
  if (
    e.type === "queued_command" &&
    Array.isArray(e.prompt) &&
    e.prompt.some((n) => bl(n) && (n.type === "image" || n.type === "document"))
  )
    return {
      ...e,
      prompt: e.prompt.map((n) => {
        if (!bl(n)) return n;
        if (n.type === "image") return { type: "text", text: "[image]" };
        if (n.type === "document") return { type: "text", text: "[document]" };
        return n;
      }),
    };
  if (
    e.type === "file" &&
    (e.content.type === "image" || e.content.type === "notebook" || e.content.type === "parts")
  )
    return {
      ...e,
      content: {
        type: "text",
        file: {
          filePath: e.filename,
          content: `[${e.content.type}]`,
          numLines: 1,
          startLine: 1,
          totalLines: 1,
        },
      },
    };
  return e;
}
/**
 * 摘要请求前把消息里的 image/document 块（含 tool_result 内嵌）替换成 [image]/[document] 文本，附件同样处理。
 */
//@ chunk-e6aww6q8.js:2407546-2408279 fingerprint = stripImagesFromMessages (0.888)
function stripImagesFromMessages(messages) {
  return messages.map((message) => {
    if (message.type === "attachment") {
      let y = stripMediaFromAttachment(message.attachment);
      return y === message.attachment ? message : withRenderedAttachment(message, y);
    }
    if (message.type !== "user") return message;
    let content = message.message.content;
    if (!Array.isArray(content)) return message;
    let s = !1,
      newContent = content.flatMap((block) => {
        if (!bl(block)) return [block];
        if (block.type === "image") return ((s = !0), [{ type: "text", text: "[image]" }]);
        if (block.type === "document") return ((s = !0), [{ type: "text", text: "[document]" }]);
        if (block.type === "tool_result" && Array.isArray(block.content)) {
          let S = !1,
            newToolContent = block.content.map((item) => {
              if (!bl(item)) return item;
              if (item.type === "image") return ((S = !0), { type: "text", text: "[image]" });
              if (item.type === "document") return ((S = !0), { type: "text", text: "[document]" });
              return item;
            });
          if (S) return ((s = !0), [{ ...block, content: newToolContent }]);
        }
        return [block];
      });
    if (!s) return message;
    return { ...message, message: { ...message.message, content: newContent } };
  });
}
/**
 * stripNonEssential（冷压缩）时只保留 queued_command/poll_events/dir_sync_notice/fork_briefing/thinking_stripped/advisor_stripped 附件。
 */
//@ chunk-e6aww6q8.js:2408279-2408569 layout
function keepEssentialAttachmentsOnly(e) {
  return e.filter(
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
/**
 * 100。
 */
//@ chunk-e6aww6q8.js:2408569-2408581 layout
var COLD_COMPACT_TRUNCATE_CHARS = 100;
/**
 * 字符串超过 100 字符时截断并标注原长度（避开代理对）。
 */
//@ chunk-e6aww6q8.js:2408581-2408748 layout
function truncateForColdCompact(e) {
  if (e.length <= COLD_COMPACT_TRUNCATE_CHARS) return e;
  let n = COLD_COMPACT_TRUNCATE_CHARS,
    code = e.charCodeAt(n - 1);
  if (code >= 55296 && code <= 56319) n--;
  return `${e.slice(0, n)}\u2026[truncated, original ${e.length} chars]`;
}
/**
 * 递归截断对象/数组里的所有字符串（未变时返回原对象）。旧版名 shouldExcludeFromPostCompactRestore 为错配。
 */
//@ chunk-e6aww6q8.js:2408748-2409016 layout
function truncateStringsDeep(e) {
  if (typeof e === "string") return truncateForColdCompact(e);
  if (Array.isArray(e)) {
    let mapped = e.map(truncateStringsDeep);
    return mapped.some((r, s) => r !== e[s]) ? mapped : e;
  }
  if (typeof e === "object" && e !== null) {
    let n = e,
      r = !1,
      s = {};
    for (let [h, y] of Object.entries(n)) {
      let S = truncateStringsDeep(y);
      if (S !== y) r = !0;
      s[h] = S;
    }
    return r ? s : e;
  }
  return e;
}
/**
 * 块是对象且为 thinking/redacted_thinking。
 */
//@ chunk-e6aww6q8.js:2409016-2409053 layout
function isThinkingContentBlock(e) {
  return bl(e) && isThinkingBlock(e);
}
/**
 * 冷压缩：去掉 assistant 的 thinking 块、截断 tool_use 输入与 tool_result 文本到 100 字符，丢弃 wire 回显字段。
 */
//@ chunk-e6aww6q8.js:2409053-2409880 layout
function stripNonEssentialContent(e) {
  return e.map((n) => {
    if (n.type === "assistant") {
      let content = n.message.content;
      if (!Array.isArray(content)) return n;
      let any = content.some(isThinkingContentBlock),
        mapped = (any ? content.filter((L) => !isThinkingContentBlock(L)) : content).map((L) => {
          if (!bl(L) || L.type !== "tool_use") return L;
          let G = truncateStringsDeep(L.input);
          if (G === L.input) return L;
          return ((any = !0), { ...L, input: G });
        });
      if (!any && n.wireToolInputs === void 0 && n.wireIngestContext === void 0) return n;
      let { wireToolInputs: wireToolInputs, wireIngestContext: wireIngestContext, ...w } = n;
      return { ...w, message: { ...n.message, content: mapped } };
    }
    if (n.type === "user") {
      let content = n.message.content;
      if (!Array.isArray(content)) return n;
      let s = !1,
        mapped = content.map((y) => {
          if (!bl(y) || y.type !== "tool_result") return y;
          let S =
              typeof y.content === "string"
                ? y.content
                : Array.isArray(y.content)
                  ? extractTextContent_2(y.content.filter(bl))
                  : "",
            w = truncateForColdCompact(S);
          if (y.content === w) return y;
          return ((s = !0), { ...y, content: w });
        });
      if (!s) return n;
      return { ...n, message: { ...n.message, content: mapped } };
    }
    return n;
  });
}
/**
 * 截头后插在开头的 meta 用户消息文本。
 */
//@ chunk-e6aww6q8.js:2409880-2409988 fingerprint = ERROR_MESSAGE_NOT_ENOUGH_MESSAGES (0.667)
var ERROR_MESSAGE_NOT_ENOUGH_MESSAGES = "Not enough messages to compact.",
  MAX_PTL_RETRIES = 3,
  PTL_RETRY_MARKER = "[earlier conversation truncated for compaction retry]";
/**
 * 按错误里给出的超出量（getPromptTooLongGap）截掉开头的消息组。
 */
//@ chunk-e6aww6q8.js:2409988-2410031 layout
function truncateHeadForPromptTooLong(e, n, r) {
  return truncateHeadForPTLRetry(e, getPromptTooLongGap(n), r);
}
/**
 * 摘要请求 prompt too long 时丢弃最早的若干 API 轮次组：有超出量就丢到够为止，否则丢 20%；至少保留一组；开头变成 assistant 时补 PTL_RETRY_MARKER 用户消息。
 */
//@ chunk-e6aww6q8.js:2410031-2410438 fingerprint = truncateHeadForPTLRetry (1)
function truncateHeadForPTLRetry(e, n, r) {
  let input =
      e[0]?.type === "user" && e[0].isMeta && e[0].message.content === PTL_RETRY_MARKER ? e.slice(1) : e,
    groups = groupByApiRound(input);
  if (groups.length < 2) return null;
  let dropCount;
  if (n !== void 0) {
    let acc = 0;
    dropCount = 0;
    for (let L of groups) if (((acc += Lg(r ? stripImagesFromMessages(L) : L)), dropCount++, acc >= n)) break;
  } else dropCount = Math.max(1, Math.floor(groups.length * 0.2));
  if (((dropCount = Math.min(dropCount, groups.length - 1)), dropCount < 1)) return null;
  let sliced = groups.slice(dropCount).flat();
  if (sliced[0]?.type === "assistant")
    return [createUserMessage({ content: PTL_RETRY_MARKER, isMeta: !0 }), ...sliced];
  return sliced;
}
/**
 * "Compaction blocked by PreCompact hook"。
 */
//@ chunk-e6aww6q8.js:2410438-2410569 fingerprint = ERROR_MESSAGE_PROMPT_TOO_LONG (0.667)
var ERROR_MESSAGE_PROMPT_TOO_LONG =
    "Conversation too long. Press esc twice to go up a few messages and try again.",
  COMPACTION_BLOCKED_BY_HOOK = "Compaction blocked by PreCompact hook";
/**
 * PreCompact 钩子返回 blockedBy 时记日志、（非自动时）通知，并抛 CompactionError。
 */
//@ chunk-e6aww6q8.js:2410569-2410874 layout
function throwIfPreCompactHookBlocked(e, n, r) {
  if (!e.blockedBy) return;
  if (
    (logForDebugging(`Compaction blocked by PreCompact hook: ${e.blockedBy}`, { level: "warn" }),
    !r?.suppressNotification)
  )
    n?.({
      key: "compaction-blocked-by-hook",
      text: "compaction blocked by PreCompact hook",
      priority: "immediate",
      color: "warning",
    });
  throw new CompactionError(`${COMPACTION_BLOCKED_BY_HOOK}: ${e.blockedBy}`);
}
/**
 * 压缩被中断（网络问题）的提示文本。
 */
//@ chunk-e6aww6q8.js:2410874-2410971 fingerprint = ERROR_MESSAGE_INCOMPLETE_RESPONSE (1)
var ERROR_MESSAGE_INCOMPLETE_RESPONSE =
  "Compaction interrupted \xB7 This may be due to network issues \u2014 please try again.";
/**
 * 压缩专用错误类（无摘要、API 错误、钩子阻断）。
 */
//@ chunk-e6aww6q8.js:2410971-2410995 layout
class CompactionError extends Error {}
/**
 * 按顺序拼出压缩后的消息：边界标记、摘要消息、替换段、保留消息、附件、钩子结果。
 */
//@ chunk-e6aww6q8.js:2410995-2411131 fingerprint = buildPostCompactMessages (0.919)
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
/**
 * 自动模式分类器因上下文过长无法审查而触发压缩时，生成 critical_system_reminder（说明哪些工具调用未执行）。
 */
//@ chunk-e6aww6q8.js:2411131-2411731 layout
function createClassifierOverflowReminder(e, n) {
  if (e === 0)
    return createAttachmentMessage_2({
      type: "critical_system_reminder",
      content: "The conversation was compacted because it had become too long for auto mode's classifier.",
    });
  let r = e === 1,
    s = r ? `an earlier tool call (${n.join(", ")})` : `${e} earlier tool calls (${n.join(", ")})`;
  return createAttachmentMessage_2({
    type: "critical_system_reminder",
    content: `Auto mode could not review ${s} because the conversation was too long for its classifier, so ${r ? "that call" : "those calls"} did not run. The conversation has now been compacted. If still needed, issue ${r ? "it" : "them"} again and ${r ? "it" : "they"} will be reviewed normally.`,
  });
}
/**
 * 同 buildPostCompactMessages 但不含 messagesToKeep（queryLoop 产出压缩后行用）。
 */
//@ chunk-e6aww6q8.js:2411731-2411848 layout = buildPostCompactMessages (0.801)
function buildPostCompactMessagesWithoutKept(result) {
  return [
    result.boundaryMarker,
    ...result.summaryMessages,
    ...(result.replacement ?? []),
    ...result.attachments,
    ...result.hookResults,
  ];
}
/**
 * 按出现顺序去重 uuid（重复时保留最后一次出现的位置）。
 */
//@ chunk-e6aww6q8.js:2411848-2411982 layout
function uniqueUuidsKeepLast(e) {
  let n = new Set(),
    r = [];
  for (let s = e.length - 1; s >= 0; s--) {
    let { uuid: uuid } = e[s];
    if (!n.has(uuid)) (n.add(uuid), r.push(uuid));
  }
  return r.reverse();
}
/**
 * 在边界消息 compactMetadata 上记录保留段（preservedSegment head/anchor/tail）与保留消息 uuid。
 */
//@ chunk-e6aww6q8.js:2411982-2412250 fingerprint = annotateBoundaryWithPreservedSegment (0.786)
function annotateBoundaryWithPreservedSegment(e, n, r, s = r) {
  let h = uniqueUuidsKeepLast(r),
    y = uniqueUuidsKeepLast(cleanMessagesForLogging([...r], s));
  if (h.length === 0) return e;
  return {
    ...e,
    compactMetadata: {
      ...e.compactMetadata,
      ...(y.length > 0 && { preservedSegment: { headUuid: y[0], anchorUuid: n, tailUuid: y.at(-1) } }),
      preservedMessages: { anchorUuid: n, uuids: y, allUuids: h },
    },
  };
}
/**
 * 保留的尾部若含 thinking 块，按模型 thinking 模式决定是否全部剥离；剥离时返回 thinking_stripped 标记附件。
 */
//@ chunk-e6aww6q8.js:2412250-2412873 layout
function decideKeptThinkingStrip(e, n) {
  let thinkingBlockCount = 0;
  for (let w of e)
    if (w.type === "assistant") thinkingBlockCount += count(w.message.content, isThinkingBlock);
  if (thinkingBlockCount === 0)
    return { marker: void 0, thinkingBlockCount: thinkingBlockCount, decidedBy: void 0 };
  let runtimeModel = getRuntimeMainLoopModel({
      permissionMode: getToolPermissionContext(n).mode,
      mainLoopModel: getMainLoopModel_2(n),
    }),
    h = runtimeModel.includes("application-inference-profile")
      ? (getInferenceProfileBackingModelCached(Bn(runtimeModel)) ?? runtimeModel)
      : runtimeModel,
    y = modelSupportsAdaptiveThinking({
      runtimeOverride: getThinkingTypeOverride(runtimeModel),
      resolvedModel: h,
      canonicalModel: getCanonicalName(h),
    }),
    stripDecision = keptThinkingStripDecision(y);
  return (
    logForDebugging(
      `compact: kept tail holds ${thinkingBlockCount} thinking block(s); strip=${stripDecision.strip ? "on" : "off"} (decided by ${stripDecision.source}; model=${runtimeModel}, thinking=${y})`,
      { level: "info" },
    ),
    {
      marker: stripDecision.strip
        ? createAttachmentMessage_2({ type: "thinking_stripped", scope: "all" })
        : void 0,
      thinkingBlockCount: thinkingBlockCount,
      decidedBy: stripDecision.source,
    }
  );
}
/**
 * 合并用户自定义压缩指令与 PreCompact 钩子新增指令（空行分隔）。
 */
//@ chunk-e6aww6q8.js:2412873-2412948 layout
function mergeHookInstructions(e, n) {
  if (!n) return e || void 0;
  if (!e) return n;
  return `${e}

${n}`;
}
/**
 * 非 API 错误、非虚拟的 assistant 消息。
 */
//@ chunk-e6aww6q8.js:2412948-2413032 layout
function isRealAssistantMessage(e) {
  return e.type === "assistant" && !e.isApiErrorMessage && e.isVirtual !== !0;
}
/**
 * 最后一条真实 assistant 或 tool_result 用户消息之后的位置（摘要回复审计用）。
 */
//@ chunk-e6aww6q8.js:2413032-2413151 layout
function getIndexAfterLastAssistantOrToolResult(e) {
  return (
    1 +
    Math.max(
      e.findLastIndex(isRealAssistantMessage),
      e.findLastIndex((n) => n.type === "user" && n.isVirtual !== !0 && isToolResultMessage(n)),
    )
  );
}
/**
 * 真实的用户输入消息（非 meta、非虚拟、非合成、非 tool_result）。
 */
//@ chunk-e6aww6q8.js:2413151-2413235 layout
function isHumanPromptMessage(e) {
  return (
    e.type === "user" && !e.isMeta && e.isVirtual !== !0 && !isSyntheticMessage(e) && !isToolResultMessage(e)
  );
}
/**
 * 整段压缩：PreCompact 钩子 → 选摘要提示词变体（qee，tengu_curried_trinket）→ streamCompactSummary（prompt too long 时 truncateHeadForPTLRetry 最多 3 次）→ 校验摘要 → 清空 readFileState → buildPostCompactAttachments → 边界消息（compact_boundary，含 preTokens/postTokens）与摘要用户消息（isCompactSummary）→ tengu_compact 遥测 → PostCompact 钩子。返回 CompactionResult。
 */
//@ chunk-e6aww6q8.js:2413235-2419147 fingerprint = compactConversation (0.673)
async function compactConversation(messages, context, cacheSafeParams, suppressFollowUpQuestions, options) {
  let { customInstructions: customInstructions } = options ?? {},
    {
      isAutoCompact: isAutoCompact = !1,
      recompactionInfo: recompactionInfo,
      stripNonEssential: stripNonEssential = !1,
      spinnerHintText: spinnerHintText,
      onNotification: onNotification,
      onResponseLength: onResponseLength,
    } = options ?? {},
    outcomeMetricKey = isAutoCompact ? "compact_auto" : "compact_manual",
    lastMainRequestId = getLastMainRequestId(),
    errorMessage,
    preCompactTokenCount,
    postCompactTokens,
    startTime = performance.now(),
    compactionSpan = endToolExecutionSpan_2("claude_code.compaction", {
      spanType: "compaction",
      attrs: { trigger: isAutoCompact ? "auto" : "manual", message_count: messages.length },
    });
  try {
    if (messages.length === 0)
      throw (
        logFeatureBad(outcomeMetricKey, "compact_not_enough_messages"),
        Error(ERROR_MESSAGE_NOT_ENOUGH_MESSAGES)
      );
    preCompactTokenCount = Tp(messages);
    let appState = context.getAppState();
    (Omn(getToolPermissionContext(context), "summary"),
      context.onCompactEvent?.({
        type: "compact_progress",
        event: { type: "hooks_start", hookType: "pre_compact" },
      }),
      context.onCompactEvent?.({ type: "sdk_status", status: "compacting" }));
    let preCompactHookResult = await executePreCompactHooks(
      context.session,
      { trigger: isAutoCompact ? "auto" : "manual", customInstructions: customInstructions ?? null },
      context,
      context.abortController.signal,
    );
    (throwIfPreCompactHookBlocked(preCompactHookResult, onNotification, {
      suppressNotification: isAutoCompact,
    }),
      (customInstructions = mergeHookInstructions(
        customInstructions,
        preCompactHookResult.newCustomInstructions,
      )));
    let userDisplayMessage = preCompactHookResult.userDisplayMessage;
    (context.onCompactEvent?.({ type: "stream_mode", mode: "requesting" }),
      onResponseLength?.({ type: "response_length", op: "reset" }),
      context.onCompactEvent?.({
        type: "compact_progress",
        event: { type: "compact_start", hintText: spinnerHintText },
      }));
    let promptCacheSharingEnabled =
        !stripNonEssential && getFeatureValue_CACHED_MAY_BE_STALE("tengu_compact_cache_prefix", !0),
      summaryPromptArm = compactPromptVariant(),
      transcriptPath = compactTranscriptPath(context),
      compactPromptText = getCompactPrompt(customInstructions, summaryPromptArm, transcriptPath !== void 0),
      summaryRequest = createUserMessage({ content: compactPromptText }),
      messagesToSummarize = messages,
      summaryCacheSafeParams = cacheSafeParams,
      summaryResponse,
      summaryText,
      ptlAttempts = 0;
    for (;;) {
      let streamResult = await streamCompactSummary({
        messages: messagesToSummarize,
        summaryRequest: summaryRequest,
        appState: appState,
        context: context,
        preCompactTokenCount: preCompactTokenCount,
        cacheSafeParams: summaryCacheSafeParams,
        stripNonEssential: stripNonEssential,
        onResponseLength: onResponseLength,
        compactionRequestKind: isAutoCompact ? "auto" : "manual",
      });
      if (
        ((summaryResponse = streamResult.response),
        (summaryText = getAssistantMessageText(summaryResponse)),
        !summaryText?.startsWith(PROMPT_TOO_LONG_ERROR_MESSAGE))
      )
        break;
      ptlAttempts++;
      let truncatedMessages =
        ptlAttempts <= MAX_PTL_RETRIES && context.compactionApiAttemptsLeft?.count !== 0
          ? truncateHeadForPromptTooLong(messagesToSummarize, summaryResponse, streamResult.mediaStripped)
          : null;
      if (!truncatedMessages)
        throw (
          logEvent("tengu_compact_failed", {
            reason: lit_2("prompt_too_long"),
            preCompactTokenCount: preCompactTokenCount,
            promptCacheSharingEnabled: promptCacheSharingEnabled,
            ptlAttempts: ptlAttempts,
          }),
          logFeatureBad(outcomeMetricKey, "compact_prompt_too_long"),
          Error(ERROR_MESSAGE_PROMPT_TOO_LONG)
        );
      (logEvent("tengu_compact_ptl_retry", {
        attempt: ptlAttempts,
        droppedMessages: messagesToSummarize.length - truncatedMessages.length,
        remainingMessages: truncatedMessages.length,
      }),
        (messagesToSummarize = truncatedMessages),
        (summaryCacheSafeParams = { ...summaryCacheSafeParams, forkContextMessages: truncatedMessages }));
    }
    if (!summaryText)
      throw (
        logForDebugging(
          `Compact failed: no summary text in response. Response: ${jsonStringify(summaryResponse)}`,
          { level: "error" },
        ),
        logEvent("tengu_compact_failed", {
          reason: lit_2("no_summary"),
          preCompactTokenCount: preCompactTokenCount,
          promptCacheSharingEnabled: promptCacheSharingEnabled,
        }),
        logFeatureBad(outcomeMetricKey, "compact_no_summary"),
        new CompactionError(
          "Failed to generate conversation summary - response did not contain valid text content",
        )
      );
    else if (summaryResponse.isApiErrorMessage || startsWithApiErrorPrefix(summaryText))
      throw (
        logEvent("tengu_compact_failed", {
          reason: lit_2("api_error"),
          errorPrefix: compactFailureCode(summaryResponse),
          status: summaryResponse.apiErrorStatus,
          preCompactTokenCount: preCompactTokenCount,
          promptCacheSharingEnabled: promptCacheSharingEnabled,
        }),
        logFeatureBad(outcomeMetricKey, "compact_api_error"),
        withTelemetryMessage(
          new CompactionError(summaryText),
          "compactConversation: api_error (summary text redacted)",
        )
      );
    logSummaryReply({
      path: "full",
      reply: summaryText,
      sent: messagesToSummarize,
      outputTokens: getTokenUsage(summaryResponse)?.output_tokens,
      stopReason: summaryResponse.message.stop_reason,
      attempt: void 0,
    });
    let preCompactReadFileState = jir(context.readFileState);
    (context.readFileState.clear(), i6(context.memorySelector));
    let { attachments: attachments, hookResults: hookResults } = await buildPostCompactAttachments(
        preCompactReadFileState,
        context,
        [],
        "compact_full",
        messages,
        hfe(recompactionInfo?.querySource, context.agentId),
      ),
      rounded = Math.round(performance.now() - startTime),
      boundaryMarker = createCompactBoundaryMessage(
        isAutoCompact ? "auto" : "manual",
        preCompactTokenCount ?? 0,
        messages.at(-1)?.uuid,
      ),
      discoveredToolNames = getDiscoveredToolNames(messages, context);
    if (discoveredToolNames.size > 0)
      boundaryMarker.compactMetadata.preCompactDiscoveredTools = [...discoveredToolNames].sort();
    stampPreCompactReadVersions(boundaryMarker, context.agentId, context.getAppState());
    let summaryMessages = [
        createUserMessage({
          ...buildCompactArtifactNote(summaryText, {
            suppressFollowUpQuestions: suppressFollowUpQuestions,
            promptArm: summaryPromptArm,
            transcriptPath: transcriptPath,
            ...!1,
            headTruncated: ptlAttempts > 0,
            foreignArtifactContent: jFe(messages),
            toolNamesUsed: getToolsUsedForSummary(messages, context.agentContext, context.agentId),
          }),
          isCompactSummary: !0,
          isVisibleInTranscriptOnly: !0,
        }),
      ].map((So) => withTurnPosition(So, messages)),
      postCompactTokenCount = tokenCountFromLastAPIResponse([summaryResponse]),
      truePostCompactTokenCount = Lg([boundaryMarker, ...summaryMessages, ...attachments, ...hookResults]);
    ((boundaryMarker.compactMetadata.postTokens = truePostCompactTokenCount),
      (boundaryMarker.compactMetadata.durationMs = rounded),
      setCumulativeDroppedTokens(boundaryMarker, messages),
      (postCompactTokens = truePostCompactTokenCount));
    let compactionUsage = getTokenUsage(summaryResponse),
      effortLevel = getEffortLevelIfSupported(
        context.options.mainLoopModel,
        getEffortValue(context),
        getEffortLayerOverride(context.permissionLayers),
      );
    if (
      (logEvent("tengu_compact", {
        preCompactTokenCount: preCompactTokenCount,
        stripNonEssential: stripNonEssential,
        postCompactTokenCount: postCompactTokenCount,
        truePostCompactTokenCount: truePostCompactTokenCount,
        autoCompactThreshold: recompactionInfo?.autoCompactThreshold ?? -1,
        willRetriggerNextTurn:
          recompactionInfo !== void 0 && truePostCompactTokenCount >= recompactionInfo.autoCompactThreshold,
        isAutoCompact: isAutoCompact,
        ptlAttempts: ptlAttempts,
        ...(effortLevel && { effort_level: fromEnum(effortLevel) }),
        querySource: agentTypeForTelemetry(
          recompactionInfo?.querySource ?? context.options.querySource ?? "unknown",
        ),
        queryChainId: ye(context.queryTracking?.chainId) ?? lit_2(""),
        queryDepth: context.queryTracking?.depth ?? -1,
        isRecompactionInChain: recompactionInfo?.isRecompactionInChain ?? !1,
        turnsSincePreviousCompact: recompactionInfo?.turnsSincePreviousCompact ?? -1,
        previousCompactTurnId: ye(recompactionInfo?.previousCompactTurnId || void 0) ?? lit_2(""),
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
        promptCacheSharingEnabled: promptCacheSharingEnabled,
        summaryPromptArm: fromEnum(summaryPromptArm),
        ...(() => {
          try {
            return tokenStatsToStatsigMetrics(analyzeContext(messages));
          } catch (error) {
            return (logError(error), {});
          }
        })(),
      }),
      notifyCompaction(context.agentId),
      isMainQuerySource(recompactionInfo?.querySource))
    )
      (await reAppendSessionMetadataAfterCompaction(context.storageV5),
        markPostCompaction(postCompactTokens ?? 0));
    context.onCompactEvent?.({
      type: "compact_progress",
      event: { type: "hooks_start", hookType: "post_compact" },
    });
    let postCompactHookResult = await executePostCompactHooks(
        context.session,
        { trigger: isAutoCompact ? "auto" : "manual", compactSummary: summaryText },
        context,
        context.abortController.signal,
      ),
      userDisplayMessages = [userDisplayMessage, postCompactHookResult.userDisplayMessage].filter(Boolean)
        .join(`
`);
    if (ptlAttempts > 0) logFeatureSad(outcomeMetricKey, "compact_head_dropped");
    else logFeatureOk(outcomeMetricKey);
    if (classifyQuerySource(recompactionInfo?.querySource ?? context.options.querySource) === "main")
      notePendingConversationEdit("compact");
    if (hfe(recompactionInfo?.querySource, context.agentId))
      (armPendingContextCompacted(isAutoCompact ? "auto" : "manual", lastMainRequestId),
        M9(lastMainRequestId));
    return {
      boundaryMarker: boundaryMarker,
      summaryMessages: summaryMessages,
      messagesToKeep: [],
      attachments: attachments,
      hookResults: hookResults,
      userDisplayMessage: userDisplayMessages || void 0,
      preCompactTokenCount: preCompactTokenCount,
      postCompactTokenCount: postCompactTokenCount,
      truePostCompactTokenCount: truePostCompactTokenCount,
      compactionUsage: compactionUsage,
      ptlAttempts: ptlAttempts,
      promptCacheSharingEnabled: promptCacheSharingEnabled,
    };
  } catch (error) {
    if (((errorMessage = error instanceof Error ? error.message : "compaction failed"), !isAutoCompact))
      addErrorNotificationIfNeeded(error, onNotification);
    throw error;
  } finally {
    if (
      (context.onCompactEvent?.({ type: "stream_mode", mode: "requesting" }),
      onResponseLength?.({ type: "response_length", op: "reset" }),
      context.onCompactEvent?.({ type: "compact_progress", event: { type: "compact_end" } }),
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
      ),
      compactionSpan)
    ) {
      if (
        (Cnr(compactionSpan, {
          ...(preCompactTokenCount !== void 0 && { pre_compact_tokens: preCompactTokenCount }),
          ...(postCompactTokens !== void 0 && { post_compact_tokens: postCompactTokens }),
          success: !errorMessage,
        }),
        errorMessage)
      )
        setSpanError(compactionSpan, errorMessage);
      compactionSpan.end();
    }
    context.onCompactEvent?.({
      type: "sdk_status",
      status: null,
      metadata: {
        compactResult: errorMessage ? "failed" : "success",
        ...(errorMessage && { compactError: errorMessage }),
      },
    });
  }
}
/**
 * 部分压缩（消息选择器）：direction=from 摘要选中点之后、保留之前；up_to 摘要之前、保留之后（保留部分可能剥离 thinking）。流程同 compactConversation，用 getPartialCompactPrompt，边界消息记录 userFeedback 与摘要条数，tengu_partial_compact 遥测。
 */
//@ chunk-e6aww6q8.js:2419147-2424722 fingerprint = partialCompactConversation (0.726)
async function partialCompactConversation(messages, pivotIndex, context, cacheSafeParams, h) {
  let {
      userFeedback: userFeedback,
      direction: direction = "from",
      onNotification: onNotification,
      onResponseLength: onResponseLength,
    } = h ?? {},
    lastMainRequestId = getLastMainRequestId(),
    errorMessage,
    Z,
    Se,
    startTime = performance.now();
  try {
    let messagesToSummarize =
        direction === "up_to" ? messages.slice(0, pivotIndex) : messages.slice(pivotIndex),
      messagesToKeep =
        direction === "up_to"
          ? messages
              .slice(pivotIndex)
              .filter(
                (vn) =>
                  vn.type !== "progress" &&
                  !isCompactBoundaryMessage_3(vn) &&
                  !(vn.type === "user" && vn.isCompactSummary),
              )
          : messages.slice(0, pivotIndex).filter((vn) => vn.type !== "progress");
    if (messagesToSummarize.length === 0)
      throw Error(
        direction === "up_to"
          ? "Nothing to summarize before the selected message."
          : "Nothing to summarize after the selected message.",
      );
    let appendedMarkerCount = 0,
      Ie = !1,
      keptThinkingInfo = direction === "up_to" ? decideKeptThinkingStrip(messagesToKeep, context) : void 0;
    if (direction === "up_to") {
      if (keptThinkingInfo?.marker)
        (messagesToKeep.push(keptThinkingInfo.marker), appendedMarkerCount++, (Ie = !0));
    } else {
      let vn = messagesToKeep.some((co) => co.type === "assistant")
        ? computeThinkingStrippedScope(messagesToKeep, messagesToSummarize)
        : void 0;
      if (vn) (messagesToKeep.push(createAttachmentMessage_2(vn)), appendedMarkerCount++);
      if (
        messagesToKeep.some((co) => co.type === "assistant") &&
        messagesToSummarize.some(
          (co) => co.type === "attachment" && co.attachment.type === "advisor_stripped",
        )
      )
        (messagesToKeep.push(createAttachmentMessage_2({ type: "advisor_stripped" })), appendedMarkerCount++);
    }
    let keptMessagesWithoutMarkers =
        appendedMarkerCount > 0 ? messagesToKeep.slice(0, -appendedMarkerCount) : messagesToKeep,
      preCompactTokenCount = Tp(messages);
    ((Z = preCompactTokenCount),
      context.onCompactEvent?.({
        type: "compact_progress",
        event: { type: "hooks_start", hookType: "pre_compact" },
      }),
      context.onCompactEvent?.({ type: "sdk_status", status: "compacting" }));
    let preCompactHookResult = await executePreCompactHooks(
      context.session,
      { trigger: "manual", customInstructions: null },
      context,
      context.abortController.signal,
    );
    throwIfPreCompactHookBlocked(preCompactHookResult, onNotification);
    let customInstructions = mergeHookInstructions(
      preCompactHookResult.newCustomInstructions,
      userFeedback ? `User context: ${userFeedback}` : void 0,
    );
    (context.onCompactEvent?.({ type: "stream_mode", mode: "requesting" }),
      onResponseLength?.({ type: "response_length", op: "reset" }),
      context.onCompactEvent?.({ type: "compact_progress", event: { type: "compact_start" } }));
    let compactPrompt = getPartialCompactPrompt(customInstructions, direction),
      summaryRequest = createUserMessage({ content: compactPrompt }),
      failureMetadata = {
        preCompactTokenCount: preCompactTokenCount,
        direction: fromEnum(direction),
        messagesSummarized: messagesToSummarize.length,
      },
      summaryInputMessages = direction === "up_to" ? messagesToSummarize : messages,
      summaryCacheSafeParams =
        direction === "up_to"
          ? { ...cacheSafeParams, forkContextMessages: messagesToSummarize }
          : cacheSafeParams,
      summaryResponse,
      summaryText,
      ptlAttempts = 0;
    for (;;) {
      let vn = await streamCompactSummary({
        messages: summaryInputMessages,
        summaryRequest: summaryRequest,
        appState: context.getAppState(),
        context: context,
        preCompactTokenCount: preCompactTokenCount,
        cacheSafeParams: summaryCacheSafeParams,
        onResponseLength: onResponseLength,
        thinkingStripPlan: collectThinkingStripPlan(messages),
        advisorStripPlan: getAdvisorStrippedMessageIds(messages),
        compactionRequestKind: "manual",
      });
      if (
        ((summaryResponse = vn.response),
        (summaryText = getAssistantMessageText(summaryResponse)),
        !summaryText?.startsWith(PROMPT_TOO_LONG_ERROR_MESSAGE))
      )
        break;
      ptlAttempts++;
      let truncatedMessages =
        ptlAttempts <= MAX_PTL_RETRIES
          ? truncateHeadForPromptTooLong(summaryInputMessages, summaryResponse, vn.mediaStripped)
          : null;
      if (!truncatedMessages)
        throw (
          logEvent("tengu_partial_compact_failed", {
            reason: lit_2("prompt_too_long"),
            ...failureMetadata,
            ptlAttempts: ptlAttempts,
          }),
          logFeatureBad("compact_partial", "compact_partial_prompt_too_long"),
          Error(ERROR_MESSAGE_PROMPT_TOO_LONG)
        );
      (logEvent("tengu_compact_ptl_retry", {
        attempt: ptlAttempts,
        droppedMessages: summaryInputMessages.length - truncatedMessages.length,
        remainingMessages: truncatedMessages.length,
        path: lit_2("partial"),
      }),
        (summaryInputMessages = truncatedMessages),
        (summaryCacheSafeParams = { ...summaryCacheSafeParams, forkContextMessages: truncatedMessages }));
    }
    if (!summaryText)
      throw (
        logEvent("tengu_partial_compact_failed", { reason: lit_2("no_summary"), ...failureMetadata }),
        logFeatureBad("compact_partial", "compact_partial_no_summary"),
        new CompactionError(
          "Failed to generate conversation summary - response did not contain valid text content",
        )
      );
    else if (summaryResponse.isApiErrorMessage || startsWithApiErrorPrefix(summaryText))
      throw (
        logEvent("tengu_partial_compact_failed", {
          reason: lit_2("api_error"),
          errorPrefix: compactFailureCode(summaryResponse),
          status: summaryResponse.apiErrorStatus,
          ...failureMetadata,
        }),
        logFeatureBad("compact_partial", "compact_partial_api_error"),
        withTelemetryMessage(
          new CompactionError(summaryText),
          "partialCompactConversation: api_error (summary text redacted)",
        )
      );
    logSummaryReply({
      path: "partial",
      reply: summaryText,
      sent: summaryInputMessages,
      outputTokens: getTokenUsage(summaryResponse)?.output_tokens,
      stopReason: summaryResponse.message.stop_reason,
      attempt: void 0,
    });
    let preCompactReadFileState = jir(context.readFileState);
    (context.readFileState.clear(), i6(context.memorySelector));
    let { attachments: attachments, hookResults: hookResults } = await buildPostCompactAttachments(
        preCompactReadFileState,
        context,
        messagesToKeep,
        "compact_partial",
        messages,
        hfe(void 0, context.agentId),
      ),
      postCompactTokenCount = tokenCountFromLastAPIResponse([summaryResponse]),
      compactionUsage = getTokenUsage(summaryResponse),
      hn = getEffortLevelIfSupported(
        context.options.mainLoopModel,
        getEffortValue(context),
        getEffortLayerOverride(context.permissionLayers),
      );
    logEvent("tengu_partial_compact", {
      preCompactTokenCount: preCompactTokenCount,
      postCompactTokenCount: postCompactTokenCount,
      messagesKept: keptMessagesWithoutMarkers.length,
      messagesSummarized: messagesToSummarize.length,
      ...(hn && { effort_level: fromEnum(hn) }),
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
    let ho =
        direction === "up_to"
          ? messages.slice(0, pivotIndex).findLast((vn) => vn.type !== "progress")?.uuid
          : keptMessagesWithoutMarkers.at(-1)?.uuid,
      boundaryMarker = createCompactBoundaryMessage(
        "manual",
        preCompactTokenCount ?? 0,
        ho,
        userFeedback,
        messagesToSummarize.length,
      ),
      discoveredToolNames = getDiscoveredToolNames(messages, context);
    if (discoveredToolNames.size > 0)
      boundaryMarker.compactMetadata.preCompactDiscoveredTools = [...discoveredToolNames].sort();
    (stampPreCompactReadVersions(boundaryMarker, context.agentId, context.getAppState()),
      (boundaryMarker.compactMetadata.durationMs = Math.round(performance.now() - startTime)));
    let transcriptPath = compactTranscriptPath(context),
      summaryMessages = [
        createUserMessage({
          ...buildCompactArtifactNote(summaryText, {
            suppressFollowUpQuestions: !1,
            transcriptPath: transcriptPath,
            ...!1,
            foreignArtifactContent: jFe(direction === "up_to" ? messagesToSummarize : messages),
            toolNamesUsed: getToolsUsedForSummary(messages, context.agentContext, context.agentId),
          }),
          isCompactSummary: !0,
          ...(messagesToKeep.length > 0
            ? {
                summarizeMetadata: {
                  messagesSummarized: messagesToSummarize.length,
                  userContext: userFeedback,
                  direction: direction,
                },
              }
            : { isVisibleInTranscriptOnly: !0 }),
        }),
      ].map((vn) => withTurnPosition(vn, direction === "up_to" ? messagesToSummarize : messages));
    (notifyCompaction(context.agentId),
      await reAppendSessionMetadataAfterCompaction(context.storageV5),
      markPostCompaction(Lg([...summaryMessages, ...messagesToKeep]), {
        keepsCachedPrefix: direction === "from",
      }),
      context.onCompactEvent?.({
        type: "compact_progress",
        event: { type: "hooks_start", hookType: "post_compact" },
      }));
    let To = await executePostCompactHooks(
      context.session,
      { trigger: "manual", compactSummary: summaryText },
      context,
      context.abortController.signal,
    );
    ((Se = Lg([boundaryMarker, ...summaryMessages, ...messagesToKeep, ...attachments, ...hookResults])),
      (boundaryMarker.compactMetadata.postTokens = Se),
      setLastMainThreadContextTokens(Se),
      setCumulativeDroppedTokens(boundaryMarker, messages));
    let bo =
      direction === "up_to" ? (summaryMessages.at(-1)?.uuid ?? boundaryMarker.uuid) : boundaryMarker.uuid;
    if ((logFeatureOk("compact_partial"), notePendingConversationEdit("compact"), direction === "up_to"))
      M9(lastMainRequestId);
    return {
      boundaryMarker: annotateBoundaryWithPreservedSegment(
        boundaryMarker,
        bo,
        keptMessagesWithoutMarkers,
        messages,
      ),
      summaryMessages: summaryMessages,
      messagesToKeep: messagesToKeep,
      attachments: attachments,
      hookResults: hookResults,
      userDisplayMessage: To.userDisplayMessage,
      preCompactTokenCount: preCompactTokenCount,
      postCompactTokenCount: postCompactTokenCount,
      compactionUsage: compactionUsage,
    };
  } catch (error) {
    throw (
      (errorMessage = error instanceof Error ? error.message : "partial compaction failed"),
      addErrorNotificationIfNeeded(error, onNotification),
      error
    );
  } finally {
    (context.onCompactEvent?.({ type: "stream_mode", mode: "requesting" }),
      onResponseLength?.({ type: "response_length", op: "reset" }),
      context.onCompactEvent?.({ type: "compact_progress", event: { type: "compact_end" } }),
      logCompactionEvent(
        {
          trigger: "manual",
          success: !errorMessage,
          durationMs: performance.now() - startTime,
          preTokens: Z,
          postTokens: Se,
          error: errorMessage,
        },
        context.agentContext,
      ),
      context.onCompactEvent?.({
        type: "sdk_status",
        status: null,
        metadata: {
          compactResult: errorMessage ? "failed" : "success",
          ...(errorMessage && { compactError: errorMessage }),
        },
      }));
  }
}
/**
 * 手动压缩失败时（非中止/消息不足/钩子阻断）弹出 "Error compacting conversation" 通知。
 */
//@ chunk-e6aww6q8.js:2424722-2425057 fingerprint = addErrorNotificationIfNeeded (0.853)
function addErrorNotificationIfNeeded(error, context) {
  if (
    hasExactErrorMessage(error, API_REQUEST_ABORTED_MESSAGE) ||
    hasExactErrorMessage(error, ERROR_MESSAGE_NOT_ENOUGH_MESSAGES) ||
    errorMessage(error).startsWith(COMPACTION_BLOCKED_BY_HOOK)
  )
    return;
  (context?.({
    key: "error-compacting-conversation",
    text: "Error compacting conversation",
    priority: "immediate",
    color: "error",
  }),
    enqueueTaskNotification_2({
      type: "system",
      subtype: "notification",
      key: "error-compacting-conversation",
      text: "Error compacting conversation",
      priority: "immediate",
      color: "error",
    }));
}
/**
 * 遥测用：无 / api_error / 第一个内容块类型。
 */
//@ chunk-e6aww6q8.js:2425057-2425187 layout
function describeLastAssistantKind(e) {
  if (!e) return lit_2("none");
  if (e.isApiErrorMessage) return lit_2("api_error");
  return fromEnum(e.message.content[0]?.type ?? "empty");
}
/**
 * 从 fallback 模型列表里去掉与当前模型等同的项。
 */
//@ chunk-e6aww6q8.js:2425187-2425273 layout
function excludeSameModelFallbacks(e, n) {
  return (Array.isArray(n) ? n : n !== void 0 ? [n] : []).filter((s) => !swapShrinksContextWindow(e, s));
}
/**
 * 压缩用的 canUseTool：一律拒绝（"Tool use is not allowed during compaction"）。
 */
//@ chunk-e6aww6q8.js:2425273-2425465 fingerprint = createCompactCanUseTool (1)
function createCompactCanUseTool() {
  return async () => ({
    behavior: "deny",
    message: "Tool use is not allowed during compaction",
    decisionReason: { type: "other", reason: "compaction agent should only produce text summary" },
  });
}
/**
 * 发出摘要请求：默认（tengu_compact_cache_prefix 开）用 runForkedAgent 共享主会话缓存、单轮、拒绝工具；失败或无文本时回退到直连流式请求（去媒体、冷压缩去非必要内容、只带 Read/ToolSearch/MCP 工具定义、按模型/fallback 链与拒答回退重试）。返回 {response, mediaStripped}。
 */
//@ chunk-e6aww6q8.js:2425465-2434278 fingerprint = streamCompactSummary (0.409)
async function streamCompactSummary({
  messages: messages,
  summaryRequest: summaryRequest,
  appState: appState,
  context: context,
  preCompactTokenCount: preCompactTokenCount,
  cacheSafeParams: cacheSafeParams,
  stripNonEssential: stripNonEssential = !1,
  onResponseLength: onResponseLength,
  thinkingStripPlan: thinkingStripPlan,
  advisorStripPlan: advisorStripPlan,
  compactionRequestKind: compactionRequestKind,
}) {
  let Z = !stripNonEssential && getFeatureValue_CACHED_MAY_BE_STALE("tengu_compact_cache_prefix", !0),
    Se = O2(context.onCompactEvent),
    ke = createCompactStreamProgress(onResponseLength, context.onCompactEvent);
  try {
    if (Z)
      try {
        let forkResult = await runForkedAgent({
            promptMessages: [summaryRequest],
            cacheSafeParams: cacheSafeParams,
            canUseTool: createCompactCanUseTool(),
            querySource: "compact",
            forkLabel: "compact",
            maxTurns: 1,
            compactionRequestKind: compactionRequestKind,
            apiAttemptsLeft: context.compactionApiAttemptsLeft,
            thinkingStripPlan: thinkingStripPlan,
            advisorStripPlan: advisorStripPlan,
            fallbackModel: excludeSameModelFallbacks(
              cacheSafeParams.model ?? context.options.mainLoopModel,
              context.options.fallbackModel,
            ),
            skipCacheWrite: !0,
            skipTranscript: !0,
            onStreamDelta: ke,
            overrides: { abortController: context.abortController, onRetryStatus: context.onRetryStatus },
          }),
          lastAssistant = getLastAssistantMessage(forkResult.messages),
          forkSummaryText = NTe(forkResult.messages),
          Yt = count(forkResult.messages, (qt) => qt.type === "assistant" && !qt.isApiErrorMessage);
        if (lastAssistant && forkSummaryText && !lastAssistant.isApiErrorMessage) {
          if (!forkSummaryText.startsWith(PROMPT_TOO_LONG_ERROR_MESSAGE))
            logEvent("tengu_compact_cache_sharing_success", {
              preCompactTokenCount: preCompactTokenCount,
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
              forkAssistantMessageCount: Yt,
            });
          return { response: findSummaryMessage(forkResult.messages) ?? lastAssistant, mediaStripped: !1 };
        }
        if (context.abortController.signal.aborted) throw Error(API_REQUEST_ABORTED_MESSAGE);
        if (lastAssistant && context.compactionApiAttemptsLeft?.count === 0)
          return { response: lastAssistant, mediaStripped: !1 };
        (logForDebugging(
          `Compact cache sharing: no text in response, falling back. Response: ${jsonStringify(lastAssistant)}`,
          { level: "warn" },
        ),
          logEvent("tengu_compact_cache_sharing_fallback", {
            reason: lit_2("no_text_response"),
            preCompactTokenCount: preCompactTokenCount,
            lastAssistantKind: describeLastAssistantKind(lastAssistant),
            assistantTextLength: forkSummaryText?.length ?? 0,
            forkAssistantMessageCount: Yt,
            stopReason: fromEnumOpt(
              lastAssistant?.isApiErrorMessage && lastAssistant.message.stop_reason !== "refusal"
                ? void 0
                : (lastAssistant?.message.stop_reason ?? void 0),
            ),
            assistantErrorKind: fromEnumOpt(lastAssistant?.error ?? void 0),
          }));
      } catch (error) {
        if (
          context.abortController.signal.aborted ||
          hasExactErrorMessage(error, API_REQUEST_ABORTED_MESSAGE)
        )
          throw Error(API_REQUEST_ABORTED_MESSAGE);
        (logError(error),
          logEvent("tengu_compact_cache_sharing_fallback", {
            reason: lit_2("error"),
            preCompactTokenCount: preCompactTokenCount,
          }));
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
          void 0,
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
          : [FileReadTool],
      requestMessages = [...Us(messages), summaryRequest],
      assistantMsg = stripImagesFromMessages(
        stripNonEssential ? keepEssentialAttachmentsOnly(requestMessages) : requestMessages,
      ),
      Me = stripNonEssential ? stripNonEssentialContent(assistantMsg) : assistantMsg,
      summaryModel = cacheSafeParams.model ?? context.options.mainLoopModel,
      isMainAgent = context.agentId === void 0;
    if (sWt(summaryModel, context.requestDialog)) {
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
    let lt = excludeSameModelFallbacks(summaryModel, context.options.fallbackModel),
      modelChain = buildAvailabilityFallbackChain(summaryModel, lt),
      chainIndex = 0,
      pt,
      Et,
      yt;
    while (!0) {
      let gt = pt ?? modelChain[chainIndex],
        At = nextFallbackModel(modelChain, chainIndex, gt),
        It = !1,
        Yt,
        qt = Et;
      Et = void 0;
      let Zt = yt;
      yt = void 0;
      let visibleModel = resolveRefusalFallback({
          currentModel: gt,
          compiledTablesOnly: !1,
          alreadyUsed: pt !== void 0,
          declined: !1,
          inCascadeEpisode: !1,
          cascadeNext: void 0,
          suppressionAlreadyLogged: !0,
          requestDialog: context.requestDialog,
          isMainThread: isMainAgent,
          consumerLacksDialogCapability: !0,
          preferenceQuestionPending: !1,
          serverDefaultFallbacksEnabled: () => !1,
          selfTargetDefaultFallbacksEnabled: () => !1,
          sticky: getStickyBetas(),
          threadedRequest: !1,
        }).visibleModel,
        pn = [];
      (context.onCompactEvent?.({ type: "stream_mode", mode: "requesting" }),
        onResponseLength?.({ type: "response_length", op: "reset" }));
      try {
        let no = resolveReminderFold_2(requestMessages),
          streamingGen = shouldEchoWireToolInputs(requestMessages),
          streamIter = queryModelWithStreaming({
            messages: normalizeMessagesForAPI(Me, stripNonEssential ? [] : context.options.tools, void 0, {
              echoWireToolInputs: streamingGen,
              echoApiBlockOrder: isStellarDriftEnabled(),
              thinkingStripPlan: thinkingStripPlan,
              advisorStripPlan: advisorStripPlan,
              reminderFold: no,
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
              reminderFold: no,
              echoWireToolInputs: streamingGen,
              fallbackModel: modelChain[chainIndex + 1],
              accessFallbackModel: At,
              refusalFallbackModel: visibleModel,
              refusalFallbackModelLane: "visible",
              fallbackCreditLaneArmed: visibleModel !== void 0,
              fallbackCreditCode: qt?.code,
              fallbackCreditMintModel: qt?.mintModel,
              fallbackCreditMintRequestId: qt?.mintRequestId,
              fallbackStampFromModel: Zt?.fromModel,
              fallbackStampCategory: Zt?.category,
              fallbackStampTrigger: Zt?.trigger,
              fallbackStampOriginalRequestId: Zt?.originalRequestId,
              toolChoice: void 0,
              isNonInteractiveSession: context.options.isNonInteractiveSession,
              hasAppendSystemPrompt: !!context.options.appendSystemPrompt,
              querySource: "compact",
              compactionRequestKind: compactionRequestKind,
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
              refusalFallbackEffort: Zt?.effort ?? void 0,
              enablePromptCaching: !1,
              promptTooLongIsHandled: !0,
              onRetryStatus: context.onRetryStatus,
            },
          })[Symbol.asyncIterator](),
          next = await streamIter.next();
        while (!next.done) {
          let event = next.value;
          if (event.type === "stream_event") {
            if (event.event.type === "content_block_start" && event.event.content_block.type === "text")
              It = !0;
            ke?.(event);
          }
          if (event.type === "assistant") pn.push(event);
          if (event.type === "model_fallback_triggered") throw event.error;
          if (event.type === "fallback_request") {
            Yt = event;
            try {
              await streamIter.return(void 0);
            } catch (error) {
              logForDebugging(`Compact: refused summarizer stream threw on return: ${errorMessage(error)}`, {
                level: "warn",
              });
            }
            break;
          }
          next = await streamIter.next();
        }
        if (Yt !== void 0) {
          let fallbackModel = Yt.fallbackModel;
          if (sWt(fallbackModel, context.requestDialog)) {
            let To = getUsageCreditsOnlyModelConsentDeclineFallback(),
              bo = To !== null && swapShrinksContextWindow(modelChain[0], To);
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
          if (
            ((pt = fallbackModel),
            (Et =
              Yt.creditCode !== null
                ? { code: Yt.creditCode, mintModel: gt, mintRequestId: Yt.requestId ?? void 0 }
                : void 0),
            (yt = {
              fromModel: Yt.originalModel,
              category: Yt.apiRefusalCategory ?? void 0,
              trigger: Yt.trigger,
              originalRequestId: Yt.requestId ?? void 0,
              effort: Yt.refusedEffort.carry,
            }),
            logEvent("tengu_refusal_fallback_triggered", {
              original_model: telemetrySafeModelName(gt),
              fallback_model: telemetrySafeModelName(pt),
              trigger: fromEnum(Yt.trigger),
              request_id: ye(Yt.requestId),
              prompt_skipped_reason: fromEnum(
                getFallbackDialogSkipReason({
                  requestDialog: context.requestDialog,
                  isMainThread: isMainAgent,
                  silentAttempt: !1,
                  consumerLacksDialogCapability: !0,
                }) ?? "no_dialog_host",
              ),
              api_refusal_category: Yt.apiRefusalCategory
                ? fromEnum(normalizeRefusalCategory(Yt.apiRefusalCategory))
                : void 0,
              route_matched: Yt.routeMatched != null ? fromEnum(Yt.routeMatched) : void 0,
              has_api_refusal_explanation: Boolean(Yt.apiRefusalExplanation),
              credit_minted: Yt.creditCode !== null,
              ...refusedEffortTelemetryFields(Yt.refusedEffort),
              querySource: lit_2("compact"),
              queryChainId: ye(context.queryTracking?.chainId) ?? lit_2(""),
              queryDepth: context.queryTracking?.depth ?? -1,
            }),
            logForDebugging(
              "Compact: refusal fallback triggered, retrying summarization on the fallback model",
              { level: "warn" },
            ),
            context.abortController.signal.aborted)
          )
            throw Error(API_REQUEST_ABORTED_MESSAGE);
          continue;
        }
        let at = pn.at(-1);
        if (at) {
          if (pt !== void 0 && !at.isApiErrorMessage) logFeatureOk("refusal_fallback");
          return { response: at.isApiErrorMessage ? at : (findSummaryMessage(pn) ?? at), mediaStripped: !0 };
        }
        if (context.abortController.signal.aborted) throw Error(API_REQUEST_ABORTED_MESSAGE);
        throw (
          logForDebugging(`Compact streaming failed. hasStartedStreaming=${It}`, { level: "error" }),
          logEvent("tengu_compact_failed", {
            reason: lit_2("no_streaming_response"),
            preCompactTokenCount: preCompactTokenCount,
            hasStartedStreaming: It,
            promptCacheSharingEnabled: Z,
          }),
          Error(ERROR_MESSAGE_INCOMPLETE_RESPONSE)
        );
      } catch (error) {
        if (pzr(At, error)) modelChain.push(At);
        let hn = modelChain[chainIndex + 1];
        if (hn !== void 0 && sWt(hn, context.requestDialog)) {
          let ho = getUsageCreditsOnlyModelConsentDeclineFallback() ?? void 0;
          if (
            ((hn = ho !== void 0 && !swapShrinksContextWindow(modelChain[0], ho) ? ho : void 0),
            hn !== void 0)
          )
            modelChain[chainIndex + 1] = hn;
        }
        if (error instanceof FallbackTriggeredError && hn !== void 0) {
          if (isNoModelFallbackEnabled()) noModelFallbackTripwire();
          (logFeatureOk("model_fallback"),
            logEvent("tengu_model_fallback_triggered", {
              original_model: telemetrySafeModelName(error.originalModel),
              fallback_model: telemetrySafeModelName(hn),
              chain_index: chainIndex + 1,
              query_source: lit_2("compact"),
              reason: fromEnum(error.reason),
              entrypoint: lit_2("cli"),
              queryChainId: ye(context.queryTracking?.chainId) ?? lit_2(""),
              queryDepth: context.queryTracking?.depth ?? -1,
            }),
            logForDebugging(
              `Compact: model fallback triggered (${error.reason}), retrying summarization on the fallback model`,
              { level: "warn" },
            ),
            chainIndex++,
            (pt = void 0));
          continue;
        }
        if (error instanceof FallbackTriggeredError && error.reason === "model_blocked")
          throw new CompactionError(modelUnavailableMessage(error, renderModelName(error.originalModel)));
        throw error;
      }
    }
  } finally {
    Se();
  }
}
/**
 * 从消息中提取已发现（ToolSearch 加载过）的工具名，压缩边界上记录。
 */
//@ chunk-e6aww6q8.js:2434278-2434363 layout
function getDiscoveredToolNames(e, n) {
  return extractDiscoveredToolNames([...e], { surfaced: (n.stickyBetas ?? getStickyBetas()).surfacedOnWire });
}
/**
 * 压缩后重新注入的附件：最近读过的文件、后台代理/shell 状态、peer handback 命令、计划文件、plan mode、已调用技能、延迟工具/代理列表/MCP 说明等增量公告、目标与 cron 携带，然后跑 SessionStart(compact) 钩子。返回 {attachments, hookResults}。
 */
//@ chunk-e6aww6q8.js:2434363-2436079 layout
async function buildPostCompactAttachments(
  e,
  context,
  messagesToKeep,
  callSite,
  preCompactMessages,
  isMainThread,
  S = !1,
) {
  let isSubagentContext = isDelegatedObservationContext(context.agentContext),
    L = await createPostCompactFileAttachments(e, context, POST_COMPACT_MAX_FILES_TO_RESTORE, messagesToKeep),
    G = isSubagentContext ? [] : await createAsyncAgentAttachmentsIfNeeded(context),
    q = isSubagentContext ? [] : createBackgroundShellAttachments(context),
    Z = collectPeerHandbackCommands(preCompactMessages, messagesToKeep),
    agentId = context.agentId,
    ke = await createPlanAttachmentIfNeeded(agentId, context.storageV5),
    we = await createPlanModeAttachmentIfNeeded(context),
    Ee = createSkillAttachmentIfNeeded(agentId, messagesToKeep, preCompactMessages),
    Ae = Cqe(context),
    Ie = Ae === void 0 ? void 0 : DSe(Ae),
    Me = [],
    We = [],
    ze = void 0,
    lt = void 0;
  try {
    ((Me = getRevokedDeferredToolNames(Ie, context)), (We = S ? aoi(Ae, context.options.tools) : []));
    let qt = [...Me, ...We];
    ((ze =
      qt.length === 0 ? void 0 : buildPromptSnapshotAttachment(messagesToKeep, new Set(qt), context.options)),
      (lt = ze === void 0 ? void 0 : Tbt(messagesToKeep)));
  } catch (error) {
    (logError(error), (Me = []), (We = []), (ze = void 0), (lt = void 0));
  }
  let Je = Me.length === 0 ? Ie : Ie?.without(new Set(Me)),
    nt = context.options.refreshTools !== void 0,
    mapped = [
      ...withToolsLoadedBeforeSummary(
        await getDeferredToolsDeltaAttachments(
          context.options.tools,
          context.options.mainLoopModel,
          messagesToKeep,
          { callSite: callSite },
          void 0,
          void 0,
          void 0,
          void 0,
          Je,
          buildDeferredToolsLatchContext(Ae, context),
          nt ? buildToolRevocationClassifier(context) : void 0,
          context.options,
        ),
        getDiscoveredToolNames(preCompactMessages, context),
      ),
      ...(await getAgentListingDeltaAttachment(context, messagesToKeep)),
      ...(areAttachmentsDisabled(context)
        ? []
        : await getSkillListingAttachmentsLazy(context, messagesToKeep).catch((qt) => (logError(qt), []))),
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
      ...getPostCompactEnvironmentAttachments(preCompactMessages, messagesToKeep, gl() !== null),
      ...Iln(preCompactMessages, messagesToKeep),
      ...carryStyleAndLanguageAttachments(preCompactMessages, messagesToKeep),
      ...getProactivityAttachmentToKeep(preCompactMessages, messagesToKeep),
      ...(isRemoteToolForwardingSwitchOn() && !isSubagentContext
        ? ((await XVe().remote?.noticeAttachment(context, messagesToKeep, "post_compact")) ?? [])
        : []),
    ].map((qt) => createAttachmentMessage_2(qt)),
    Et = [];
  if (!isSubagentContext) {
    if (!context.options.settingsHooksOff)
      (context.onCompactEvent?.({
        type: "compact_progress",
        event: { type: "hooks_start", hookType: "session_start" },
      }),
        (Et = await processSessionStartHooks(context.session, "compact", {
          model: context.options.mainLoopModel,
          agentContext: context.agentContext,
          storageV5: context.storageV5,
          credentials: context.credentials,
        })));
  }
  let yt = createProjectsThreadAskAttachmentIfNeeded(
      preCompactMessages,
      messagesToKeep,
      context.options.tools,
      isMainThread && callSite !== "compact_partial",
    ),
    gt = createGoalStatusAttachmentIfNeeded(context, preCompactMessages, messagesToKeep, isMainThread),
    At = createSessionCronCarryAttachmentIfNeeded(preCompactMessages, messagesToKeep, isMainThread);
  if (Ae !== void 0)
    (logDeclaredToolsDroppedAtCompaction(Ae, Me), logDeclaredToolsDroppedAtCompaction2(Ae, We));
  let announcementWalk = context.options.announcementWalk,
    Yt = [
      ...L,
      ...G,
      ...q,
      ...Z,
      ...(ke ? [ke] : []),
      ...(we ? [we] : []),
      ...(Ee ? [Ee] : []),
      ...mapped,
      ...(yt ? [yt] : []),
      ...(gt ? [gt] : []),
      ...(At ? [At] : []),
      ...(ze ? [createAttachmentMessage_2(ze)] : []),
      ...(lt ? [createAttachmentMessage_2(lt)] : []),
    ];
  return { attachments: announcementWalk ? Yt.map((qt) => announcementWalk(qt)) : Yt, hookResults: Et };
}
/**
 * 按时间倒序取最近读过的文件（排除保留段里已读的、计划/记忆等特殊文件），每个最多 5000 token 重新生成文件附件，总预算 50000。
 */
//@ chunk-e6aww6q8.js:2436079-2436651 fingerprint = createPostCompactFileAttachments (0.969)
async function createPostCompactFileAttachments(
  readFileState,
  toolUseContext,
  maxFiles,
  preservedMessages = [],
) {
  let preservedReadPaths = collectReadToolFilePaths(preservedMessages),
    y = shouldExcludeFromPostCompactRestore(),
    S = !0,
    recentFiles = Object.entries(readFileState)
      .map(([Z, Se]) => ({ filename: Z, ...Se }))
      .filter(
        (file) =>
          !Jfr(file.filename, y, toolUseContext.agentId) &&
          !preservedReadPaths.has(expandPath(file.filename)) &&
          !isPersistedArtifactPath(expandPath(file.filename)),
      )
      .sort((Z, Se) => Se.timestamp - Z.timestamp)
      .slice(0, maxFiles),
    mapped = (
      await Promise.all(
        recentFiles.map((Z) =>
          generateFileAttachment(
            Z.filename,
            { ...toolUseContext, fileReadingLimits: { maxTokens: POST_COMPACT_MAX_TOKENS_PER_FILE } },
            "tengu_post_compact_file_restore_success",
            "tengu_post_compact_file_restore_error",
            "compact",
          ),
        ),
      )
    ).map((file) => (file ? createAttachmentMessage_2(file) : null)),
    usedTokens = 0;
  return mapped.filter((result) => {
    if (result === null) return !1;
    let attachmentTokens = roughTokenCountEstimation(jsonStringify(result.attachment));
    if (usedTokens + attachmentTokens <= POST_COMPACT_TOKEN_BUDGET)
      return ((usedTokens += attachmentTokens), !0);
    return !1;
  });
}
/**
 * 有计划文件时生成 plan_file_reference 附件。
 */
//@ chunk-e6aww6q8.js:2436651-2436822 fingerprint = createPlanAttachmentIfNeeded (1)
async function createPlanAttachmentIfNeeded(e, n) {
  if (peekPlanSlug() !== void 0) notePlanFileForgotten(getPlanFilePath(e));
  let r = await getPlanAsync(e, n);
  if (!r) return null;
  return createAttachmentMessage_2({
    type: "plan_file_reference",
    planFilePath: isDiskless() ? "" : getPlanFilePath(e),
    planContent: r,
  });
}
/**
 * 已调用技能（含从对话中恢复的）按最近调用排序，单个截到 5000 token、总预算 25000，生成 invoked_skills 附件。
 */
//@ chunk-e6aww6q8.js:2436822-2438287 fingerprint = createSkillAttachmentIfNeeded (0.537)
function createSkillAttachmentIfNeeded(e, n = [], r = []) {
  let invokedSkills = getInvokedSkillsForAgent(e),
    h = new Set();
  if (e === void 0 && isSoftSparkEnabled())
    for (let G of Us([...r])) {
      let q = Date.parse(G.timestamp) || 0;
      if (G.type === "attachment" && G.attachment.type === "invoked_skills") {
        let Ee = q;
        for (let skill of G.attachment.skills) {
          let Ie = `:${skill.name}`;
          if (!invokedSkills.has(Ie) && skill.name && skill.path)
            (h.add(Ie),
              invokedSkills.set(Ie, {
                skillName: skill.name,
                skillPath: skill.path,
                content: skill.content,
                invokedAt: Ee,
                agentId: null,
                ...(skill.mcpSkill !== void 0 && { servedByMcp: !0 }),
              }));
          Ee = Math.min(Ee, invokedSkills.get(Ie)?.invokedAt ?? Ee);
        }
      }
      if (G.type !== "user" || !G.invokedSkill) continue;
      let { name: Z, path: path } = G.invokedSkill,
        ke = invokedSkills.get(`:${Z}`),
        we = metaMessageText(G);
      if (
        typeof Z === "string" &&
        typeof path === "string" &&
        we &&
        we !== ke?.content &&
        (ke?.invokedAt ?? -1) < q
      )
        (h.add(`:${Z}`),
          invokedSkills.set(`:${Z}`, {
            skillName: Z,
            skillPath: path,
            content: we,
            invokedAt: q,
            agentId: null,
            ...(G.mcpSkill != null && { servedByMcp: !0 }),
          }));
    }
  if (invokedSkills.size === 0) return null;
  let usedTokens = 0,
    S = [],
    sorted = Array.from(invokedSkills.entries()).sort(([, G], [, q]) => q.invokedAt - G.invokedAt);
  for (let [G, q] of sorted) {
    if (!q.content) continue;
    let Z = findInvokedMcpSkill(r, q.skillName, q.content);
    if (q.servedByMcp && Z === void 0) continue;
    let Se = restoreSkillStateFromMessages(n, q.content);
    if (Se === "attachment") continue;
    let ke = Se === "body" || h.has(G),
      we = truncateToTokens(q.content, POST_COMPACT_MAX_TOKENS_PER_SKILL),
      Ee = roughTokenCountEstimation(we);
    if (usedTokens + Ee > POST_COMPACT_SKILLS_TOKEN_BUDGET) {
      if (!ke) updateInvokedSkillContent(G, "");
      continue;
    }
    if (((usedTokens += Ee), !ke && we !== q.content)) updateInvokedSkillContent(G, we);
    S.push({ name: q.skillName, path: q.skillPath, content: we, ...(Z !== void 0 && { mcpSkill: Z }) });
  }
  if (S.length === 0) return null;
  let L = count(S, (skill) => h.has(`:${skill.name}`));
  if (L > 0) logFeatureOk("compact_skill_from_conversation", { count: L });
  return createAttachmentMessage_2({ type: "invoked_skills", skills: S });
}
/**
 * 处于 plan 模式时生成完整 plan_mode 提醒附件。
 */
//@ chunk-e6aww6q8.js:2438287-2438628 fingerprint = createPlanModeAttachmentIfNeeded (0.836)
async function createPlanModeAttachmentIfNeeded(context) {
  if (getToolPermissionContext(context).mode !== "plan") return null;
  if (isDiskless())
    return createAttachmentMessage_2(buildPlanModeAttachment("full", context.agentId, context.options.tools));
  let planFilePath = getPlanFilePath(context.agentId),
    r = await planExistsAsync(context.agentId, context.storageV5),
    s = context.options?.planModeInstructions;
  return createAttachmentMessage_2({
    type: "plan_mode",
    reminderType: "full",
    isSubAgent: !!context.agentId,
    planFilePath: planFilePath,
    planExists: r,
    ...(s !== void 0 && { customInstructions: s }),
  });
}
/**
 * 有活动目标或保留段之外有目标条件时生成 goal_status 附件。
 */
//@ chunk-e6aww6q8.js:2438628-2438816 layout
function createGoalStatusAttachmentIfNeeded(e, n, r, s) {
  if (!s) return null;
  let activeGoal = e.getAppState().activeGoal;
  if (activeGoal !== void 0)
    return createAttachmentMessage_2(buildGoalSentinelAttachment(!1, activeGoal.condition));
  let y = findActiveGoalCondition(r);
  if (y === null || findActiveGoalCondition(n) === y) return null;
  return createAttachmentMessage_2(buildGoalSentinelAttachment(!0, y));
}
/**
 * 把会话 cron/loop 唤醒等定时任务以 session_cron_carry 附件带过压缩。
 */
//@ chunk-e6aww6q8.js:2438816-2438927 layout
function createSessionCronCarryAttachmentIfNeeded(e, n, r) {
  if (!r) return null;
  try {
    let s = carryLoopCronAcrossCompact(e, n);
    return s === null ? null : createAttachmentMessage_2(s);
  } catch (error) {
    return (logError(error), null);
  }
}
/**
 * 自动模式 projects 线程中待回答请求的携带附件。
 */
//@ chunk-e6aww6q8.js:2438927-2439121 layout
function createProjectsThreadAskAttachmentIfNeeded(e, n, r, s) {
  if (!s) return null;
  try {
    if (!Kfe(r)) return null;
    let h = carryProjectsThreadAsk(e, n, r);
    return h === null ? null : createAttachmentMessage_2(h);
  } catch (error) {
    return (logError(error), logFeatureBad("auto_mode_projects_thread_ask_carry", "carry_failed"), null);
  }
}
/**
 * 未取回的后台代理任务生成 task_status 附件（进度摘要或错误）。
 */
//@ chunk-e6aww6q8.js:2439121-2439640 fingerprint = createAsyncAgentAttachmentsIfNeeded (0.903)
async function createAsyncAgentAttachmentsIfNeeded(context) {
  let appState = context.getAppState(),
    asyncAgents = Object.values(appState.tasks).filter((task) => task.type === "local_agent"),
    s = HM(context.options.tools),
    h = hasSendMessageTool(context.options.tools);
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
        outputFilePath: agent.webFetchSavedFiles || !s ? void 0 : agent.outputFile,
        canContinueAgent: h,
      }),
    ];
  });
}
/**
 * 当前代理仍在运行的后台 shell 生成 task_status 附件（命令与描述截断）。
 */
//@ chunk-e6aww6q8.js:2439640-2440117 layout
function createBackgroundShellAttachments(e) {
  let n = HM(e.options.tools);
  return Object.values(e.taskRegistry.all()).flatMap((r) => {
    if (
      r.type !== "local_bash" ||
      r.status !== "running" ||
      !r.isBackgrounded ||
      r.toolUseId === void 0 ||
      r.agentId !== e.agentId
    )
      return [];
    return [
      createAttachmentMessage_2({
        type: "task_status",
        taskId: r.id,
        taskType: "local_bash",
        description: truncateWithCount(stripIgnorables(r.description), TASK_STATUS_DESCRIPTION_MAX_CHARS),
        status: r.status,
        deltaSummary: null,
        outputFilePath: n ? r.outputFile : void 0,
        shell: {
          command: truncateWithCount(stripIgnorables(r.command), TASK_STATUS_COMMAND_MAX_CHARS),
          kind: r.kind ?? "bash",
          toolUseId: r.toolUseId,
        },
      }),
    ];
  });
}
/**
 * 最后一条 assistant 之后、来自 peer 且 handback 的 queued_command 附件重新带上。
 */
//@ chunk-e6aww6q8.js:2440117-2440475 layout
function collectPeerHandbackCommands(e, n) {
  let lastIndex = e.findLastIndex((h) => h.type === "assistant" && !h.isApiErrorMessage && !h.isVirtual),
    s = new Set(n.map((h) => h.uuid));
  return e
    .slice(lastIndex + 1)
    .flatMap((h) =>
      h.type === "attachment" &&
      h.attachment.type === "queued_command" &&
      h.attachment.origin?.kind === "peer" &&
      h.attachment.origin.handback === !0 &&
      !s.has(h.uuid)
        ? [createAttachmentMessage_2({ ...h.attachment, timestamp: void 0 })]
        : [],
    );
}
/**
 * 保留消息中 Read 工具读过的文件路径（排除结果已被清理为桩的）。
 */
//@ chunk-e6aww6q8.js:2440475-2441038 fingerprint = collectReadToolFilePaths (1)
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
/**
 * 压缩后可恢复的记忆文件类型。
 */
//@ chunk-e6aww6q8.js:2441122-2441315 placement
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
        return !0;
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
function Jfr(e, n, r) {
  let s = expandPath(e);
  try {
    let h = expandPath(getPlanFilePath(r));
    if (s === h) return !0;
  } catch {}
  return n.has(s);
}
/**
 * 压缩失败的遥测码。
 */
//@ chunk-e6aww6q8.js:2441491-2441623 placement
function compactFailureCode(e) {
  if (e.apiError === "dlp_request_denied") return formatApiErrorType("dlp_request_denied", e.apiErrorStatus);
  return fromEnum(e.error ?? "unknown");
}
/**
 * 记录压缩摘要回复的形态（摘要块、未回答的请求尾部、输出 token、停止原因）。
 */
//@ chunk-e6aww6q8.js:2441623-2442226 placement
function logSummaryReply({
  path: path,
  reply: reply,
  sent: sent,
  outputTokens: outputTokens,
  stopReason: stopReason,
  attempt: attempt,
  keptReplySent: keptReplySent = !1,
}) {
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
          L.attachment.isMeta !== !0) ||
        (isHumanPromptMessage(L) && !(L.type === "user" && L.isCompactSummary)),
    )
      ? lit_2("prompt")
      : sliced.some((L) => L.type === "user" && L.isVirtual !== !0)
        ? lit_2("other_message")
        : lit_2("none"),
    outputTokens: outputTokens,
    stopReason: fromEnumOpt(stopReason),
    attempt: attempt,
    ...(keptReplySent && { unansweredRequestTail: lit_2("kept_reply") }),
  });
}
/**
 * 压缩时引用的 transcript 路径（无盘或关闭持久化时 undefined）。
 */
//@ chunk-e6aww6q8.js:2442226-2442339 placement
function compactTranscriptPath(e) {
  if (isDiskless() || isTranscriptPersistenceDisabled() || e.compactTranscriptUnavailable) return;
  return e.agentId !== void 0 ? getAgentTranscriptPath(e.agentId) : getTranscriptPath();
}
//@ chunk-e6aww6q8.js:2442339-2442435 placement
function gzr(e, n) {
  let r = Tp(e) || 0,
    s = (n !== void 0 && parsePromptTooLongTokenCounts(n).actualTokens) || 0;
  return recoveryTimeoutForContextTokens(Math.max(r, s));
}
//@ chunk-e6aww6q8.js:2442435-2442507 placement
function Lln(e) {
  return (
    e instanceof CompactionError ||
    startsWithApiErrorPrefix(errorMessage(e)) ||
    hasExactErrorMessage(e, ERROR_MESSAGE_PROMPT_TOO_LONG) ||
    hasExactErrorMessage(e, ERROR_MESSAGE_INCOMPLETE_RESPONSE)
  );
}
//@ chunk-e6aww6q8.js:2442507-2442517 placement
var hzr = 3;
/**
 * 记一次自动压缩失败，连续失败达到上限时触发熔断。
 */
//@ chunk-e6aww6q8.js:2442517-2442973 placement
function autocompactFailure(e, n, r, s) {
  let h = (e?.consecutiveFailures ?? 0) + 1;
  if (h >= hzr)
    (logForDebugging(
      `autocompact: circuit breaker tripped after ${h} consecutive failures${n ? " (reactive path)" : ""} \u2014 skipping future attempts this session`,
      { level: "warn" },
    ),
      logEvent("tengu_auto_compact_circuit_breaker", {
        consecutiveFailures: h,
        ...(n && { routedThroughReactive: n }),
        ...(r && { thresholdSource: fromEnum(r) }),
      }));
  return {
    kind: "failed",
    consecutiveFailures: h,
    routedThroughReactive: n,
    thresholdSource: r,
    compactFailure: s,
  };
}
/**
 * 实际输入超过阈值时分析前缀大小与文档/图片块数量。
 */
//@ chunk-e6aww6q8.js:2442973-2443623 placement
function analyzeOversizedPrefix(e, n, r, s = 0) {
  let h = getLastApiUsage(e);
  if (!h) return null;
  let y = h.input_tokens + h.cache_read_input_tokens + h.cache_creation_input_tokens,
    S = Lg(e, n.bytesPerToken),
    max = Math.max(0, y - s - S),
    L = getAutoCompactThresholdTokens(n, r);
  if (max <= L) return null;
  let G = 0,
    q = 0,
    Z = (Se) => {
      for (let ke of Se) {
        let we = ke;
        if (we.type === "document" && we.source?.type !== "text" && we.source?.type !== "content") G++;
        else if (we.type === "image") q++;
        else if (we.type === "tool_result" && Array.isArray(we.content)) Z(we.content);
      }
    };
  for (let Se of e) {
    let ke = Se.message?.content;
    if (Array.isArray(ke)) Z(ke);
  }
  return {
    prefixTokens: max,
    thresholdTokens: L,
    totalInputTokens: y,
    messagesEstimate: S,
    snipTokensFreed: s,
    documentBlockCount: G,
    imageBlockCount: q,
  };
}
//@ chunk-e6aww6q8.js:2443623-2443672 placement
function tpr() {
  return env.CLAUDE_CODE_COLD_COMPACT;
}
/**
 * 附件类型为 skill_listing 或 agent_listing_delta（压缩后会重新注入的列表类附件）。旧版名 stripReinjectedAttachments 为错配（这里只是判断）。
 */
//@ chunk-ag5x7vhf.js:27597-27676 fingerprint = stripReinjectedAttachments (0.508)
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
  Omn,
  buildPostCompactMessagesWithoutKept,
  gzr,
  r8s,
  countNonProgressMessages,
  compactConversation,
  COMPACTION_BLOCKED_BY_HOOK,
  hzr,
  analyzeOversizedPrefix,
  autocompactFailure,
  tpr,
  Lln,
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
  f8e,
  O2,
  groupByApiRound,
};
