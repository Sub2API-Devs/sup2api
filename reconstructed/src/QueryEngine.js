/**
 * QueryEngine.ts
 *
 * headless/SDK 引擎入口：ask() 由 runHeadlessStreaming 调用，从会话配置（工具、MCP、系统提示词选项、代理等，支持惰性函数）构建本次查询的 ToolUseContext；引擎主体（submitMessage 循环）在未归属的 chunk-tyg7f3ek.js#nI。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/QueryEngine.ts
 * pieces: chunk-18hwfzwa.js (1), chunk-tyg7f3ek.js (61)
 * attribution: fingerprint 2, placement 55, sole-consumer 1, layout 2, affinity 2
 */
import { randomUUID } from "crypto";
import { NO_CONTENT_MESSAGE, DELETED_IMAGE_NOTICE, SYNTHETIC_MODEL } from "./constants/messages.js";
import { storedFormSymbol } from "./utils/messageKinds.js";
import { resolveMessageAlias } from "./utils/pollEvents/fold.js";
import {
  withRenderedAttachment,
  isInterruptionOnlyMessage,
  isUserPromptOfKind,
  isUserStampPrompt,
  isReorderedRow,
  isToolResultMessage,
  isTurnCompanion,
  attachmentToMessages,
  createSystemMessage,
  isEmptyUserMessage,
  checkSessionStartPlacement,
  countNamedToolUses,
  stripAgentToolResultForStorage,
  isPingStreamEvent,
  stripToolResultsForStorage,
  createModelFallbackSystemMessage,
} from "./utils/messages.js";
import {
  chromeSetupModule,
  checkContextInstructionsSize,
  gatewayCodeTabRulesNotice,
} from "./cli/print/agentResume.js";
import { noopLedger } from "./services/api/promptPrefixLedger.js";
import {
  getStickyBetas,
  getSessionId,
  swapMcpServerTools,
  getTotalCostUSD,
  getModelUsage,
  getSafetyStops,
  noteSystemPromptSectionInvalidation,
  setAutoModeUnavailableStopNotice,
  isSessionPersistenceDisabled,
  getSystemPromptSectionEpoch,
  setLocalCommandExitCode,
  getAutoModeUnavailableStopNotice,
  getTotalAPIDuration,
  isDiskless,
} from "./bootstrap/state.js";
import { notifyCacheDeletion } from "./services/api/promptCacheBreakDetection.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "./services/analytics/featureTelemetry.js";
import { logError, getInMemoryErrors } from "./utils/log.js";
import { getTaskListId, snapshotTaskList } from "./utils/tasks.js";
import {
  hasRemoteWorkerEventLog,
  registerTranscriptExitDrain,
  readAtTranscriptEntry,
  inTranscriptCallOrder,
  recordTranscript,
  transcriptCursorEnd,
  collectReplIds,
  isLoggableMessage,
  isChainParticipant,
  hasSessionMirror,
  removeTranscriptMessage,
  buildFileHistorySnapshotChain,
  flushSessionStorage,
} from "./utils/sessionStorage.js";
import { MAX_TASK_NUMBER } from "./cli/print/turnStartChecks.js";
import { jsonStringify } from "./utils/slowOperations.js";
import { logEvent } from "./services/analytics/index.js";
import { fromEnum, fromEnumOpt } from "./services/analytics/safeMetadata.js";
import { HostScoped } from "./utils/hostScoped.js";
import {
  isAbortError,
  AbortError,
  withTelemetryMessage,
  toError,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  errorMessage,
} from "./utils/errors.js";
import { raceWithAbortSignal, withDeadline } from "./utils/sleep.js";
import { logForDebugging } from "./utils/debug.js";
import { isHumanOrUnset } from "./utils/messageProvenance.js";
import { lastTextBlockText } from "./utils/historyFile.js";
import { getMcpPrefix, buildMcpToolName, mcpInfoFromString } from "./services/mcp/mcpStringUtils.js";
import { mRe, addUsage_2, $jo } from "../vendor/@anthropic-ai/sdk/lib/internal/tracing/response.mjs";
import { EMPTY_USAGE } from "./services/api/emptyUsage.js";
import {
  toolNameForInit,
  isPolicyVerdictAbsentOrHipaa,
  buildSystemInitMessage,
  buildRemoteSystemInitFields,
  buildSystemInitFields,
  INTERRUPT_MARKER_KEYS,
  LIFECYCLE_WAKEUP_SOURCE_V1,
  TASK_LIST_RESTORE_V1,
  TASK_LIST_RESTORED_V1,
  MCP_READ_RESOURCE_V1,
  MCP_TOOL_UI_META_V1,
  persistsWithoutRedaction,
  MCP_CALL_RESULT_NOT_FOR_MODEL_V1,
  READ_FILE_AS_WRITTEN_V1,
  emptyMarkerList,
  shouldOfferLinuxSandboxHint,
  START_SHELL_TASK_V1,
  recordInitTiming,
} from "./utils/messages/systemInit.js";
import { isRecordableDenial } from "./types/permissions.js";
import {
  isExternalOrigin,
  stampMissingOrigin,
  markSkipAttachments,
  markTextNotTyped,
  markTranscriptOnly,
  attachTaskDelivery,
} from "./utils/messages/nonUserMessages.js";
import { selectableUserMessagesFilter } from "./utils/messages/mappers.js";
import { bashCommandTagKindOf, localCommandTagKindOf } from "./utils/messages/localCommandTags.js";
import { cleanShellOutputForViewers } from "./utils/shell/headlessBash.js";
import { mergedMessageUuids } from "./cli/print/queuedMessageUtils.js";
import { trimTrailingAfterTurn, isTurnAnswered } from "./cli/print/transcriptChain.js";
import { lookMcpTaskEndings } from "./tasks/McpTask/mcpTaskEndings.js";
import { count, uniq } from "./utils/collections.js";
import { getTokenCountFromUsage_4 } from "./services/compact/compact.js";
import { isCompactBoundaryMessage, messagesSinceCompactBoundary } from "./services/projects/threadRows.js";
import {
  isStopInterruptionRow,
  isInterruptMarkerRow,
  isQueueTranscriptOnlyUserMessage,
} from "./utils/transcript/deserialize.js";
import { isVsCodeTopSession } from "./utils/sessionShape.js";
import {
  waitForMcpToolServer,
  aliasOrSelf,
  findLongestPrefixClients,
  getMcpServerBaseUrlFromToolName,
  clearCutResults,
} from "./services/tools/toolExecution.js";
import { currentMcpClients } from "./services/compact/idleToolResultClearing.js";
import { listMcpTools } from "./services/mcp/mcpWireUtils.js";
import { describeConnectError } from "./services/mcp/auth.js";
import { officeBridgeListingState, REMOTE_DEVICES } from "./services/mcp/firstPartyServerIds.js";
import { refreshMcpServerTools } from "./services/mcp/client.js";
import { findToolByName, toolMatchesName } from "./Tool.js";
import {
  NON_EXECUTION_KINDS,
  buildResultMessage,
  normalizeCustomSubtype,
  isAbortedTerminalReason,
} from "./entrypoints/sdk/coreSchemas.js";
import { findTool, deferredToolsKeptCached } from "./services/api/deferredToolsState.js";
import { isPermissionCardHoldEnabled } from "./cli/print/wakeRouter.js";
import {
  hasToolResultAfter,
  lastUserAfterAssistant,
  handleOrphanedPermission,
  handleHandedOffTurn,
  isHandoffTurnSettled,
  resumeDeferredToolUse,
  orderedRowSource,
  appendRowsWithHooks,
  appendHookableFastPath,
  getSalvageableResultText,
  getRecentErrorLog,
} from "./utils/queryHelpers.js";
import {
  getFastModeState,
  getFastModeUnavailableReasonCode,
  getFastRejectedReason,
  rearmCreditsExhaustedNotice,
} from "./utils/fastMode.js";
import { checkTurnIdsConsistent, dropCcrTurnId } from "./services/mcp/ccrTurnId.js";
import { clearTurnTraceContexts, currentPromptHandle } from "./utils/telemetry/sessionTracing.js";
import { logForDiagnosticsNoPII } from "./utils/diagLogs.js";
import { createTaskListCatchUp, TASK_LIST_HANDOFF_STATE } from "./cli/print/taskListRestore.js";
import {
  measurePhase,
  endProfile,
  beginProfile,
  startProfilePhase,
  endProfilePhase,
  consumeProfile,
  currentTurnIndex,
} from "./utils/queryProfiler.js";
import { clearContextKey, getCwdOrNull, setCwdForCallChain, getContextKey } from "./utils/cwd.js";
import { headlessProfilerCheckpoint } from "./utils/headlessProfiler.js";
import { getSlashCommandToolSkills } from "./commands.js";
import { loadAllPluginsCacheOnly } from "./utils/plugins/pluginLoader.js";
import { recordPhase, consumeApiRequestSentFromSpawn } from "./utils/startupTiming.js";
import { isExemptDefaultResolvingPick } from "./utils/model/defaultModel.js";
import { isModelAllowed } from "./utils/model/modelAllowlist.js";
import { parseUserSpecifiedModel } from "./utils/model/modelDisplay.js";
import { getMainLoopModel } from "./utils/model/model.js";
import { getRuntimeMainLoopModel } from "./utils/model/planModeModel.js";
import {
  isBetaHeaderAllowed,
  shouldUseGlobalCacheScope,
  isSkillModelOverrideAllowedInMode,
} from "./utils/betas.js";
import { fetchSystemPromptParts } from "./utils/queryContext.js";
import { TOOL_CATALOG } from "./tools.js";
import {
  isScratchpadEnabled,
  getScratchpadDir,
  declaredAbsoluteAdditionalDirectories,
} from "./utils/permissions/filesystem.js";
import { hasAutoMemPathOverride, getAutoMemPathState } from "./memdir/paths.js";
import { loadMemoryPrompt } from "./memdir/memdir.js";
import { getPromptModel } from "./utils/model/promptBundles.js";
import { withCliSections } from "./constants/promptSections.js";
import { baseSystemPromptOf } from "./utils/systemPromptBoundary.js";
import { renderAppendPromptHead } from "./cli/startup/appendPromptHead.js";
import { asSystemPrompt } from "./utils/systemPromptType.js";
import { getPlatform } from "./utils/platform.js";
import { getCachedPowerShellPath } from "./utils/shell/powershellDetection.js";
import { isTransportBacked, transportStateByHost, orderForTransport } from "./cli/transportState.js";
import { isArtifacts404Failure } from "./services/mcp/redactMcpErrors.js";
import { mcpServerSource } from "./services/mcp/fileReference/fileReferencePolicy.js";
import { proactivityStateStub } from "./cli/print/proactivityControl.js";
import { mergeClients as mergeClients_2, dropSyncedClashes } from "./utils/commandPredicates.js";
import { pluginsSyncErrors } from "./utils/claudeAiSync/skillsSync.js";
import { isMarketplacePluginError, pluginNameOfError } from "./tools/SkillTool/pluginLoadFailureNote.js";
import { pluginErrorText } from "./types/plugin.js";
import { getSkippedDynamicServers } from "./services/mcp/mcpConfigProvenance.js";
import { hasMarketplaceAlias } from "./utils/plugins/pluginIdentifier.js";
import { pluginWarningText } from "./utils/plugins/pluginComponentConflicts.js";
import {
  canonicalNameOrUndefined,
  ultrathinkEffectiveSafely,
  computeDeclaredToolSet,
  promptIdForRequest,
} from "./services/api/claude.js";
import { viewTeammateOutput } from "./components/teams/TeamsDialog.js";
import {
  queuedNotificationCapabilities,
  createNotificationDrain,
} from "./services/queuedNotifications/queuedNotifications.js";
import { sessionNoticesCapability, SESSION_NOTICES } from "./cli/print/sessionNotices.js";
import { sdkMcpCapabilities, uiSurfaceCapabilities, uiHookedCapabilities } from "./cli/sdkMcpManifests.js";
import { isReadFileAsWrittenServed } from "./cli/print/authAndPolicyRefresh.js";
import { reduceFileHistoryState, fileHistoryMakeSnapshot, fileHistoryEnabled } from "./utils/fileHistory.js";
import { Jce, createColorAssigner } from "./services/artifacts/artifactReadConsent.js";
import { mainAgentContext } from "./utils/agentContext.js";
import { query } from "./query.js";
import { resolveThemeSetting } from "./utils/systemTheme.js";
import { resolveSetting } from "./utils/settings/userIntentSettings.js";
import { createAppStateAccessors, createPermissionContextSetters } from "./state/appStateSetters.js";
import { createTaskFramework } from "./utils/task/framework.js";
import { fieldAccessor } from "./state/sliceHelpers.js";
import { restoreAttributionStateFromSnapshots } from "./utils/commitAttribution.js";
import { applySessionSettingsPatch } from "./state/applySessionSettingsPatch.js";
import { notifyToolsKept } from "./services/compact/keptTools.js";
import {
  setCwd,
  setCwdV5,
  MissingWorkingDirectoryError,
  missingWorkingDirectoryPins,
} from "./utils/Shell.js";
import {
  informationalSystemMessage,
  preservedAttachmentRows,
  replayMessagesToSdk,
  systemMessagesToSdk,
  toSdkMessages,
} from "./cli/print/sdkMessageStream.js";
import {
  DeclaredToolSet,
  asDeclaredToolSet,
  resolveDeclaredToolSet,
} from "./services/api/declaredToolSet.js";
import {
  isToolSearchEnabledOptimistic,
  isToolSearchPrecluded,
  toolSearchRejectedOn,
  extractDiscoveredToolNames,
  getNonDeferrableBuiltins,
} from "./utils/toolSearch.js";
import { isFoamySpringEnabled as isFoamySpringEnabled_2 } from "./services/mcp/mcpToolAvailability.js";
import { isDeferredTool, isDeferredToolInConversation } from "./tools/ToolSearchTool/prompt.js";
import { clearClassifierContext } from "./utils/conversationRecovery.js";
import { env } from "./utils/env.js";
import { androidEvidenceByHost } from "./tools/BashTool/androidCommands.js";
import { createIsolationLatch } from "./services/tools/webToolIsolation.js";
import { InstanceRegistry } from "./utils/instanceRegistry.js";
import { createSessionHooksRegistry } from "./services/plugins/accountSync/syncedPluginHooks.js";
import { emptyPickerState } from "./memdir/findRelevantMemories.js";
import { createAbortController, userAbortReason } from "./utils/abortController.js";
import { Stream } from "./utils/stream.js";
import { createQueryEngine } from "./engine/queryEngine.js";
import {
  createTurnStreamBridge,
  abortTurnSignal,
  applyMessageListEdit,
  applyMessageListAppend,
  startTurnTiming,
  buildTurnStartEvent,
  runMessageDisplayHook,
  collectReadNotificationsToolUseIds,
} from "./cli/print/turnStreaming.js";
import { opsDelivered, applyPendingInvalidations } from "./plugins/functionHooks/hooksModuleLoader.js";
import { logModsFirstTurn } from "./plugins/functionHooks/modLoadTelemetry.js";
import {
  snapshotUuids,
  shouldSnapshotSystemPrompt,
  snapshotContainsPrompt,
  tagBlockChange,
  latestPromptSnapshot,
} from "./utils/contextAttachments/promptSnapshot.js";
import { lazyToolAttachment, wasPutBackSafe, settleTakenSafe } from "./query/promptSnapshot.js";
import {
  applyTurnDisallowedTools,
  filterTurnDisallowedTools,
  isToolDisallowedThisTurn,
} from "./cli/printUsageSummary.js";
import { useMessageActions } from "./components/messageActions.js";
import { markOwnClientPrompt } from "./tools/BashTool/bashEditDiff/gitEnv.js";
import { noteTurnClientPlatform } from "./tools/ChromeSetupOfferTool/ChromeSetupOfferTool.js";
import { isStorageV5Enabled } from "./utils/hoverRest.js";
import { startFirstRequestGate } from "./utils/api.js";
import { kickTurnEndCheckMemCtx } from "./services/accountMemory/memoryContext.js";
import { buildRunningTurnRecord, createRunningTurnTracker } from "./cli/print/runningTurnRecord.js";
import { awaitMcpSettle } from "./query/toolDrain.js";
import { getUserContextMemoryFiles } from "./context.js";
import { STRUCTUREDOUTPUT } from "./tools/SyntheticOutputTool/SyntheticOutputTool.js";
import {
  initWithUserMessageUuids,
  withoutSessionId,
  markMaxTurnsExit,
  appendUnique,
  withUserMessageUuids,
} from "./cli/print/triggerPayloads.js";
import { profileCheckpoint } from "./utils/startupProfiler.js";
import { ensureTurnId, markVerifiedHumanTurn } from "./utils/messages/apiNormalization.js";
import { createPromptEntryTracker } from "./utils/processUserInput/promptEntryWaiters.js";
import { processUserInput } from "./utils/processUserInput/processUserInput.js";
import { confirmWithUser } from "./utils/permissions/confirmWithUser.js";
import { withdrawBridgeAttachments } from "./utils/attachments/bridgeAttachments.js";
import { setHearthRelayMetadata } from "./services/projectsRelay/relayConfig.js";
import { isFoamySpringEnabled } from "./services/analytics/growthbookGates.js";
import { isSunnyGardenSenderAddress, prefetchSenderAddressFor } from "./services/api/requestHeaders.js";
import { isBareMode } from "./utils/envUtils.js";
import { applyPollEventToolPermissions } from "./utils/pollEvents.js";
import { toStreamEventMessage, createPartialStreamRetraction } from "./cli/print/userPromptFiles.js";
import { logPlainDeltaFailure, isTextOrJsonDeltaEvent } from "./query/goalCheckIn.js";
import { getSourceUuid } from "./cli/queuedCommands.js";
import { parseUsageIterations } from "./utils/modelCost.js";
import {
  createRefusalFallbackMessage,
  convertCompactBoundaryMessage,
  createConsentFallbackMessage,
  createRefusalNoFallbackMessage,
} from "./remote/sdkMessageAdapter.js";
import { isRefusalFallbackEnabled } from "./services/api/refusalFallback.js";
import { minimalUnavailableNotice } from "./utils/permissions/serverClassifier/results.js";
import {
  STRUCTURED_OUTPUT_RETRACTED_MESSAGE,
  MAX_STRUCTURED_OUTPUT_RETRIES,
  formatStructuredOutputFailure,
  hasSuccessfulToolCallSince,
} from "./cli/structuredOutputRetry.js";
import { telemetrySafeModelName } from "./utils/model/telemetryModelName.js";
import { isMarkerTextDelta, BRIEF_TOOL_NAME_SET } from "./cli/print/resumeMcpTasks.js";
import { hasReachedBudget } from "./cost-tracker.js";
import { raiseTurnComplete } from "./query/turnHooks.js";
import { sanitizeMarkName } from "./utils/startupMarks.js";
import { resolveEffortLevel } from "./utils/effort.js";
import { createRemoteFileState, READ_FILE_STATE_CACHE_SIZE } from "./utils/remoteFileState.js";

//@ chunk-tyg7f3ek.js:416207-418123 placement
function reconcileSavedFilesForTurn(initialMessages, withdrawnFileUuids) {
  try {
    let r = new Set(withdrawnFileUuids.map((R) => R.toLowerCase()));
    let s = new Set(
      initialMessages.flatMap((R) =>
        R.type === "user" && Array.isArray(R.savedFiles)
          ? R.savedFiles.flatMap((savedFile) =>
              typeof savedFile?.file_uuid === "string" &&
              typeof savedFile.path === "string" &&
              r.has(savedFile.file_uuid.toLowerCase())
                ? [savedFile.path]
                : [],
            )
          : [],
      ),
    );
    let h = 0;
    let y = [];
    for (let [R, w] of initialMessages.entries())
      if (w.type === "user") {
        let P = maskDisallowedNames(w.imageFileUuids, r);
        if (P === undefined || !Array.isArray(w.message?.content)) continue;
        let L = filterImageBlocksByMask(w.message.content, P);
        let q = w.message.content.length - L.length;
        h += q;
        y.push([
          R,
          {
            ...w,
            message: {
              ...w.message,
              content:
                L.length > 0
                  ? L
                  : [
                      {
                        type: "text",
                        text: NO_CONTENT_MESSAGE,
                      },
                    ],
            },
            withdrawnImages: (w.withdrawnImages ?? 0) + q,
            imageFileUuids: filterArrayByMask(w.imageFileUuids, P),
            imagePasteIds: filterArrayByMask(w.imagePasteIds, P),
            [storedFormSymbol]: resolveMessageAlias(w),
          },
        ]);
      } else if (w.type !== "attachment") continue;
      else if (w.attachment?.type === "inlined_image_paths") {
        let { attachment } = w;
        let L = maskDisallowedNames(attachment.fileUuids, r);
        if (L === undefined) continue;
        y.push([
          R,
          {
            ...withRenderedAttachment(w, {
              ...attachment,
              paths: filterArrayByMask(attachment.paths, L) ?? [],
              fileUuids: filterArrayByMask(attachment.fileUuids, L),
            }),
            [storedFormSymbol]: resolveMessageAlias(w),
          },
        ]);
      } else if (w.attachment?.type === "file") {
        if (w.attachment.content?.type !== "image" || !s.has(w.attachment.filename)) continue;
        h++;
        y.push([
          R,
          {
            ...withRenderedAttachment(w, {
              type: "critical_system_reminder",
              content: DELETED_IMAGE_NOTICE,
            }),
            [storedFormSymbol]: resolveMessageAlias(w),
          },
        ]);
      } else if (w.attachment?.type === "queued_command") {
        let { attachment } = w;
        let L = maskDisallowedNames(attachment.imageFileUuids, r);
        if (L === undefined || !Array.isArray(attachment.prompt)) continue;
        let q = filterImageBlocksByMask(attachment.prompt, L);
        let x = attachment.prompt.length - q.length;
        h += x;
        y.push([
          R,
          {
            ...withRenderedAttachment(w, {
              ...attachment,
              prompt: q.length > 0 ? q : NO_CONTENT_MESSAGE,
              withdrawnImages: (attachment.withdrawnImages ?? 0) + x,
              imageFileUuids: filterArrayByMask(attachment.imageFileUuids, L),
              inlinedImagePaths: filterArrayByMask(attachment.inlinedImagePaths, L),
            }),
            [storedFormSymbol]: resolveMessageAlias(w),
          },
        ]);
      }
    for (let [R, w] of y) initialMessages[R] = w;
    let teleportCacheState = chromeSetupModule?.getTeleportCacheState();
    if (
      teleportCacheState?.status === "active" &&
      y.some(([, { uuid: R }]) => teleportCacheState.preAnchorLineUuids.includes(R))
    )
      chromeSetupModule?.revertTeleportCache("context_reduced", "main");
    if (y.length > 0) {
      noopLedger(getStickyBetas(), "pictures_withdrawn");
      notifyCacheDeletion("sdk");
    }
    logFeatureOk("bridge_attachment_withdraw", {
      listed_count: r.size,
      cut_picture_count: h,
    });
  } catch (error) {
    logError(error);
    logFeatureBad("bridge_attachment_withdraw", "cut_failed");
  }
}
//@ chunk-tyg7f3ek.js:418123-418262 placement
function maskDisallowedNames(e, n) {
  if (!Array.isArray(e)) return;
  let mapped = e.map((s) => typeof s !== "string" || !n.has(s.toLowerCase()));
  return mapped.includes(false) ? mapped : undefined;
}
//@ chunk-tyg7f3ek.js:418262-418336 placement
/**
 * 数组按布尔掩码过滤（掩码缺省为保留）
 */
function filterArrayByMask(e, n) {
  return Array.isArray(e) ? e.filter((r, s) => n[s] ?? true) : undefined;
}
//@ chunk-tyg7f3ek.js:418336-418415 placement = _temp (1)
/**
 * 只按 image 块的顺序套用掩码过滤
 */
function filterImageBlocksByMask(e, n) {
  let r = 0;
  return e.filter((s) => s?.type !== "image" || (n[r++] ?? true));
}
//@ chunk-tyg7f3ek.js:418415-418429 placement
/**
 * 262144：延迟结果的序列化上限
 */
var MAX_DEFERRED_RESULT_BYTES = 262144;
//@ chunk-tyg7f3ek.js:418429-419533 placement
async function mirrorTaskListSnapshot(e, session, store) {
  try {
    let taskListId = getTaskListId();
    if (!hasRemoteWorkerEventLog() || taskListId !== session.id) return;
    let h = await snapshotTaskList(taskListId, store);
    if (h === null || h.tasks === null) h = (await snapshotTaskList(taskListId, store)) ?? h;
    if (h === null) {
      logFeatureBad("task_list_carry", "list_unreadable");
      return;
    }
    let { tasks, highestId } = h;
    if (highestId === 0) return;
    if (highestId > MAX_TASK_NUMBER) {
      logFeatureBad("task_list_carry", "highest_id_over_limit");
      return;
    }
    if (tasks === null) {
      e.compactMetadata.preCompactTaskList = {
        highestId,
      };
      logFeatureSad("task_list_carry", "task_unreadable", {
        highest_id: highestId,
      });
      return;
    }
    let filtered = tasks.filter((task) => !task.metadata?._internal);
    let w = {
      task_count: filtered.length,
      highest_id: highestId,
    };
    let P = taskListSnapshotPayload({
      shown: filtered,
      highestId,
      descriptions: true,
      metadata: true,
    });
    if (fitsResultBudget(P)) {
      e.compactMetadata.preCompactTaskList = P;
      logFeatureOk("task_list_carry", w);
      return;
    }
    let L = taskListSnapshotPayload({
      shown: filtered,
      highestId,
      descriptions: true,
      metadata: false,
    });
    if (fitsResultBudget(L)) {
      e.compactMetadata.preCompactTaskList = L;
      logFeatureSad("task_list_carry", "metadata_left_out", w);
      return;
    }
    let q = taskListSnapshotPayload({
      shown: filtered,
      highestId,
      descriptions: false,
      metadata: false,
    });
    if (fitsResultBudget(q)) {
      e.compactMetadata.preCompactTaskList = q;
      logFeatureSad("task_list_carry", "descriptions_left_out", w);
      return;
    }
    e.compactMetadata.preCompactTaskList = {
      highestId,
    };
    logFeatureSad("task_list_carry", "tasks_left_out", w);
  } catch (error) {
    logFeatureBad("task_list_carry", "carry_failed");
    logError(error);
  }
}
//@ chunk-tyg7f3ek.js:419533-419959 placement
function taskListSnapshotPayload({ shown, highestId, descriptions, metadata }) {
  return {
    tasks: shown.map((h) => ({
      id: h.id,
      subject: h.subject,
      ...(descriptions &&
        h.description !== "" && {
          description: h.description,
        }),
      ...(h.activeForm !== undefined && {
        activeForm: h.activeForm,
      }),
      status: h.status,
      ...(h.owner !== undefined && {
        owner: h.owner,
      }),
      ...(h.blocks.length > 0 && {
        blocks: h.blocks,
      }),
      ...(h.blockedBy.length > 0 && {
        blockedBy: h.blockedBy,
      }),
      ...(metadata &&
        h.metadata !== undefined && {
          metadata: h.metadata,
        }),
    })),
    highestId,
  };
}
//@ chunk-tyg7f3ek.js:419959-420016 placement
/**
 * 判断一个值序列化后的字节数是否在上限内（用于延迟结果）。
 */
function fitsResultBudget(e) {
  return Buffer.byteLength(jsonStringify(e), "utf8") <= MAX_DEFERRED_RESULT_BYTES;
}
//@ chunk-tyg7f3ek.js:420016-420648 placement
function createRetractionFilter() {
  let e;
  let n = new Set();
  let r = 0;
  function s(S) {
    let retractedMessageUuids = S.retractedMessageUuids;
    if (retractedMessageUuids === undefined || n.size === 0) return S;
    return {
      ...S,
      retractedMessageUuids: retractedMessageUuids.filter(
        (retractedMessageUuid) => !n.has(retractedMessageUuid),
      ),
    };
  }
  function h(S, emittedVia) {
    let w = {
      banner: s(S),
      suppressedCount: r,
      emittedVia,
    };
    r = 0;
    return w;
  }
  function y(emittedVia) {
    if (e === undefined) return [];
    let R = h(e, emittedVia);
    e = undefined;
    return [R];
  }
  return {
    accept(S) {
      let R = [];
      if (e !== undefined)
        if (S.retractedMessageUuids?.includes(e.uuid)) {
          n.add(e.uuid);
          r += 1;
          e = undefined;
        } else R.push(...y("episode_boundary"));
      if (S.provisional) e = S;
      else R.push(h(S, r > 0 ? "supersedes" : "immediate"));
      return R;
    },
    dropHeld(S) {
      if (e?.uuid === S) {
        n.add(e.uuid);
        r += 1;
        e = undefined;
      }
    },
    settle(S) {
      return y(S);
    },
  };
}
//@ chunk-tyg7f3ek.js:420648-421367 placement
function collapseRefusalFallbackNotices(e, sessionId) {
  return e.map(({ banner, suppressedCount, emittedVia }) => {
    if (suppressedCount > 0)
      logEvent("tengu_refusal_fallback_notice_collapsed", {
        suppressed_count: suppressedCount,
        emitted_via: fromEnum(emittedVia),
      });
    return {
      type: "system",
      subtype: "model_refusal_fallback",
      trigger: banner.trigger,
      direction: banner.direction,
      ...(banner.scope !== undefined && {
        scope: banner.scope,
      }),
      original_model: banner.originalModel,
      fallback_model: banner.fallbackModel,
      request_id: banner.requestId,
      api_refusal_category: banner.apiRefusalCategory ?? null,
      api_refusal_explanation: banner.apiRefusalExplanation ?? null,
      ...(banner.sawCyberRefusal && {
        saw_cyber_refusal: true,
      }),
      ...(banner.retractedMessageUuids !== undefined && {
        retracted_message_uuids: banner.retractedMessageUuids,
      }),
      refused_user_message_uuid: banner.refusedUserMessageUuid ?? null,
      content: banner.content,
      session_id: sessionId,
      uuid: banner.uuid,
    };
  });
}
//@ chunk-tyg7f3ek.js:421367-421402 placement
/**
 * 等待内置插件就绪的时限（15 秒）与已就绪宿主集合。
 */
var BUILTIN_PLUGIN_READY_TIMEOUT_MS = 15000;
var builtinPluginReadyHosts = new HostScoped(() => new Set());
//@ chunk-tyg7f3ek.js:421402-422100 placement
function runBuiltinTurnObservers(e, n, r, s) {
  if (r.aborted) return;
  let h = [];
  for (let y of builtinPluginReadyHosts.of(e))
    try {
      let S = y(n, r);
      if (S !== undefined)
        h.push(
          S.catch((error) => {
            if (r.aborted && isAbortError(error)) return;
            logError(
              Error(
                "A built-in plugin failed while getting ready for this prompt; the prompt runs without waiting for it",
                {
                  cause: error,
                },
              ),
            );
          }),
        );
    } catch (error) {
      logError(
        Error(
          "A built-in plugin threw while getting ready for this prompt; the prompt runs without waiting for it",
          {
            cause: error,
          },
        ),
      );
    }
  if (h.length === 0) return;
  return raceWithAbortSignal(
    withDeadline(Promise.all(h), BUILTIN_PLUGIN_READY_TIMEOUT_MS, s),
    r,
    () => new AbortError(),
  ).then(
    (y) => {
      if (y === undefined)
        logForDebugging(
          `Built-in plugins still getting ready after ${BUILTIN_PLUGIN_READY_TIMEOUT_MS} ms; the prompt runs now`,
        );
    },
    (error) => {
      if (!isAbortError(error))
        logError(
          Error("Waiting for built-in plugins before the prompt failed; the prompt runs now", {
            cause: error,
          }),
        );
    },
  );
}
//@ chunk-tyg7f3ek.js:422100-422429 placement
function isTypedPersonPrompt(host, n, r, signal) {
  try {
    let y =
      r?.inputMode !== "bash" &&
      r?.textNotTyped !== true &&
      (r?.skipSlashCommands !== true || r?.bridgeOrigin === true || r?.modelScheduledOrigin === true) &&
      isHumanOrUnset(r?.origin)
        ? lastTextBlockText(n)
        : null;
    return y === null ? undefined : runBuiltinTurnObservers(host, y, signal);
  } catch (error) {
    logError(
      Error("Waiting for built-in plugins before the prompt failed; the prompt runs now", {
        cause: error,
      }),
    );
    return;
  }
}
//@ chunk-tyg7f3ek.js:422429-422737 placement
function markDroppedPrompts(e, turnId, r) {
  try {
    let s = new Set(r);
    if (turnId !== undefined) s.add(turnId);
    let last = e.findLast(isInterruptionOnlyMessage);
    if (s.size > 0 && last?.type === "user") last.droppedPromptUuids = [...s];
  } catch (error) {
    logError(
      Error(
        `could not write a stopped prompt's uuids on its interruption marker: a rewind or a fork to that prompt will answer "target not found"`,
        {
          cause: error,
        },
      ),
    );
  }
}
//@ chunk-tyg7f3ek.js:422737-422882 placement
function filterMcpToolsBySelectedServers(e, n, r) {
  if (n.length > 0) return e;
  let mapped = r.map((h) => getMcpPrefix(h.name));
  return e.filter((h) => mapped.includes(`${h}__`) || !mapped.some((y) => h.startsWith(y)));
}
//@ chunk-tyg7f3ek.js:422882-423099 placement
function assistantUsageDelta(e, n, r) {
  try {
    let { id, model, usage } = e.message;
    if (e.isApiErrorMessage || model === SYNTHETIC_MODEL || id === n || id === r) return;
    return mRe(EMPTY_USAGE, usage);
  } catch (error) {
    logError(
      withTelemetryMessage(toError(error), "usage of an unstreamed answer not added to the turn total"),
    );
    return;
  }
}
//@ chunk-tyg7f3ek.js:423099-423374 placement
function createPermissionDenialTracker(canUseTool) {
  let n = [];
  function r(s, h, toolInput) {
    if (n.some((S) => S.tool_use_id === h)) return;
    n.push({
      tool_name: toolNameForInit(s.name),
      tool_use_id: h,
      tool_input: toolInput,
    });
  }
  return {
    permissionDenials: n,
    recordDenial: r,
    canUseTool: async (s, toolInput, y, S, R, w) => {
      let P = await canUseTool(s, toolInput, y, S, R, w);
      if (isRecordableDenial(P, w)) r(s, R, toolInput);
      return P;
    },
  };
}
//@ chunk-tyg7f3ek.js:423374-423535 placement
function userRowsToReplay(e, n) {
  return e.filter(
    (r) =>
      (r.type === "user" &&
        !r.toolUseResult &&
        ((!r.isMeta && isOwnPromptRow(r, n)) || isExternalOrigin(r.origin))) ||
      (r.type === "system" && r.subtype === "compact_boundary"),
  );
}
//@ chunk-tyg7f3ek.js:423535-423637 placement
function isOwnPromptRow(e, n) {
  return e.type === "user" && n?.localStdinOrigin === true && isSameUuidMessage(e, n)
    ? isUserPromptOfKind(e, "own-prompt")
    : isUserStampPrompt(e);
}
//@ chunk-tyg7f3ek.js:423637-423859 placement
function* replayUserRows(e, n) {
  for (let r of e) {
    if (r.type !== "user") continue;
    yield n?.inputMode === "bash"
      ? {
          type: "user",
          message: r.message,
          session_id: getSessionId(),
          parent_tool_use_id: null,
          uuid: r.uuid,
          timestamp: r.timestamp,
          isSynthetic: selectableUserMessagesFilter(r),
        }
      : toSdkUserMessage(r, n);
  }
}
//@ chunk-tyg7f3ek.js:423859-423977 placement
function* userRowsForSdk(e, n) {
  let r = n?.shouldQuery === false;
  for (let s of e)
    if (s.type === "user") {
      if (!r && !isSameUuidMessage(s, n)) continue;
      yield toSdkUserMessage(s, n);
    }
}
//@ chunk-tyg7f3ek.js:423977-424032 placement
/**
 * 两条消息 uuid 相同
 */
function isSameUuidMessage(e, n) {
  return n?.uuid != null && e.uuid === n.uuid;
}
//@ chunk-tyg7f3ek.js:424032-424301 placement
function toSdkUserMessage(e, n) {
  let fileAttachments = isSameUuidMessage(e, n) ? n?.fileAttachments : undefined;
  return {
    type: "user",
    message: e.message,
    session_id: getSessionId(),
    parent_tool_use_id: null,
    uuid: e.uuid,
    timestamp: e.timestamp,
    isReplay: true,
    isSynthetic: selectableUserMessagesFilter(e),
    ...(fileAttachments &&
      fileAttachments.length > 0 && {
        file_attachments: fileAttachments,
      }),
    ...(e.origin && {
      origin: e.origin,
    }),
  };
}
//@ chunk-tyg7f3ek.js:424301-424555 placement = _temp7 (0.809)
function userRowsWithoutInput(opt) {
  let n = [];
  for (let r of opt) {
    if (r.type !== "user" || r.isMeta || bashCommandTagKindOf(r) === "input") continue;
    let content = r.message.content;
    n.push({
      ...r,
      message: {
        ...r.message,
        content:
          typeof content === "string"
            ? cleanShellOutput(content)
            : content.map((h) =>
                h.type === "text"
                  ? {
                      ...h,
                      text: cleanShellOutput(h.text),
                    }
                  : h,
              ),
      },
    });
  }
  return n;
}
//@ chunk-tyg7f3ek.js:424555-424629 placement
/**
 * 清理 shell 输出用于显示（保留颜色）
 */
function cleanShellOutput(e) {
  try {
    return cleanShellOutputForViewers(e, {
      keepColors: true,
    });
  } catch (error) {
    logError(error);
    return "";
  }
}
//@ chunk-tyg7f3ek.js:424629-424760 placement
function answeredMergedUuids(initialMessages, userMessageUuids, alsoLeftToThisReRun = []) {
  try {
    return userMessageUuids?.flatMap((s) =>
      mergedMessageUuids(trimTrailingAfterTurn(initialMessages, s), s).filter(
        (h) => h === s || alsoLeftToThisReRun.includes(h) || isTurnAnswered(initialMessages, h),
      ),
    );
  } catch (error) {
    logError(error);
    return userMessageUuids;
  }
}
//@ chunk-tyg7f3ek.js:424760-425012 placement
function stampMergedSends(e, turnId, mergedSendUuids, clientPlatform, contextKey) {
  if (!mergedSendUuids?.length && clientPlatform === undefined && contextKey === undefined) return;
  try {
    let found = e.find((S) => S.uuid === turnId);
    if (found?.type !== "user") return;
    if (mergedSendUuids?.length) found.mergedSendUuids = [...mergedSendUuids];
    if (clientPlatform !== undefined) found.clientPlatform = clientPlatform;
    if (contextKey !== undefined) found.turnAttributionKey = contextKey;
  } catch (error) {
    logError(error);
  }
}
//@ chunk-tyg7f3ek.js:425012-430132 placement
/**
 * 把本轮新增消息写入转录（处理折叠副本、压缩边界、墓碑删除与 parentUuid 链）。
 */
function persistTurnRows({
  conversation,
  messages,
  persistSession,
  storageV5,
  holdsLoadersRows = false,
  foldCopies,
  neverParentUuid,
}) {
  let R = 0;
  let w;
  let P = messages.length;
  let L = null;
  let sinceUuid = new Set();
  let x = 0;
  let weakSet = new WeakSet();
  let Z = [];
  let re;
  let Ae;
  let Ue;
  function ce() {
    return Ee("all");
  }
  function nt() {
    if (Z.length === 0 && Ae === undefined) {
      let ut = Ue;
      Ue = undefined;
      ie(() => ut?.());
    }
  }
  function ie(ut) {
    try {
      return ut();
    } catch (error) {
      logError(error);
      return;
    }
  }
  function Se(row, Yt) {
    ie(() => {
      if (foldCopies.foldCopyFate(Yt) === "wait") {
        Z.push({
          row,
          sourceUuid: Yt,
        });
        if (persistSession) Ue ??= registerTranscriptExitDrain(ce);
      }
    });
  }
  function me(ut) {
    if (Z.length === 0) return false;
    let Yt = Z;
    Z = [];
    clearTimeout(re);
    re = undefined;
    let nn = ie(() => foldCopies.requeueWindowLeftMs());
    for (let kn of Yt)
      if (
        ie(() => {
          if (ut === "compaction") return true;
          let Mr = foldCopies.foldCopyFate(kn.sourceUuid);
          if (Mr === "wait" && ut === "decidable") Z.push(kn);
          else if (Mr === "drop") pn(kn.row.uuid);
          else foldCopies.foldCopyWritten(kn.sourceUuid);
          return true;
        }) === undefined
      )
        ie(() => foldCopies.foldCopyWritten(kn.sourceUuid));
    if (Z.length > 0 && nn !== undefined) {
      re = setTimeout(Ee, nn + 10);
      re.unref();
    }
    return Z.length < Yt.length;
  }
  function Me(ut) {
    let Yt = Ae === undefined ? We(ut) : Ae.then(() => We(ut));
    let nn = Yt.then(
      () => {},
      () => {},
    ).finally(() => {
      if (Ae === nn) {
        Ae = undefined;
        nt();
      }
    });
    Ae = nn;
    return Yt;
  }
  function Ee(ut = "decidable") {
    ie(() => {
      if (me(ut) && persistSession) Me(false).catch(logError);
    });
    nt();
    return Ae ?? Promise.resolve();
  }
  async function He(ut, Yt, nn) {
    let atTranscriptEntry = readAtTranscriptEntry(ut, nn);
    return await inTranscriptCallOrder(() =>
      recordTranscript(ut, undefined, Yt, nn, storageV5, atTranscriptEntry),
    );
  }
  function Xe(ut = false) {
    return Ae === undefined && Z.length === 0 ? We(ut) : Me(ut);
  }
  function We(ut) {
    me(ut ? "all" : "decidable");
    let Yt = R;
    let nn = transcriptCursorEnd(messages, Math.max(Yt, P), !ut);
    for (let { row } of Z) {
      let index = messages.lastIndexOf(row);
      if (index !== -1) {
        nn = Math.min(nn, index);
        break;
      }
    }
    let kn = $r(Yt, Dr(Yt, nn));
    if (!ut) nn = kn;
    if (Yt >= nn) {
      lookMcpTaskEndings(messages, nn)?.(true);
      return Promise.resolve(null);
    }
    let En = Yt === 0 && nn === messages.length ? messages : messages.slice(Yt, nn);
    let Mr = neverParentUuid === undefined ? En : En.filter((Fr) => Fr.uuid !== neverParentUuid);
    R = nn;
    let Pn = w;
    w = Lt(Mr) ?? w;
    let oo = lookMcpTaskEndings(messages, nn);
    let No = He(Mr, Pn, St);
    return oo === undefined
      ? No
      : No.then(
          (Fr) => {
            oo(true);
            return Fr;
          },
          (error) => {
            oo(false);
            throw error;
          },
        );
  }
  function St() {
    collectReplIds(messages.slice(x), sinceUuid);
    x = messages.length;
    return sinceUuid;
  }
  function wt() {
    sinceUuid = new Set();
    x = 0;
  }
  function Lt(ut) {
    return ut.findLast(
      (Yt) =>
        isLoggableMessage(Yt) &&
        isChainParticipant(Yt) &&
        !isReorderedRow(Yt.uuid) &&
        Yt.uuid !== neverParentUuid,
    )?.uuid;
  }
  function pn(uuid) {
    let lastIndex = messages.findLastIndex((message) => message.uuid === uuid);
    if (lastIndex !== -1) {
      let kn = messages[lastIndex];
      messages.splice(lastIndex, 1);
      wt();
      if (R > lastIndex) {
        R--;
        if (w === uuid && !hasSessionMirror()) w = Lt(messages.slice(0, lastIndex)) ?? w;
        if (persistSession) {
          logEvent("tengu_tombstone_persisted_removal", {
            message_type: fromEnum(kn.type),
          });
          let sessionId = getSessionId();
          inTranscriptCallOrder(async () => {
            removeTranscriptMessage(uuid, storageV5, sessionId).catch(logError);
          });
        }
      }
      if (P > lastIndex) P--;
    }
    let lastIndex_2 = conversation.findLastIndex((kn) => kn.uuid === uuid);
    if (lastIndex_2 !== -1) conversation.splice(lastIndex_2, 1);
  }
  function _n(ut) {
    let Yt = ut;
    try {
      let preservedMessages = ut.compactMetadata.preservedMessages;
      if (!preservedMessages) return ut;
      let kn = new Map(conversation.map((Fr) => [Fr.uuid, Fr]));
      let filtered = preservedMessages.uuids.filter((uuid) => kn.has(uuid));
      if (filtered.length === preservedMessages.uuids.length) return ut;
      let { preservedSegment, ...Pn } = ut.compactMetadata;
      Yt = {
        ...ut,
        compactMetadata: {
          ...Pn,
          ...(preservedSegment &&
            filtered.length > 0 && {
              preservedSegment: {
                ...preservedSegment,
                headUuid: filtered[0],
                tailUuid: filtered.at(-1),
              },
            }),
          preservedMessages: {
            ...preservedMessages,
            uuids: filtered,
          },
        },
      };
      let oo = new Set();
      let No = new Set();
      for (let Fr of filtered) {
        let Xo = kn.get(Fr);
        if (Xo?.type !== "assistant" && Xo?.type !== "user") continue;
        let content = Xo.message?.content;
        for (let _i of Array.isArray(content) ? content : [])
          if (_i?.type === "tool_use") oo.add(_i.id);
          else if (_i?.type === "tool_result") No.add(_i.tool_use_id);
      }
      logEvent("tengu_compact_preserved_not_in_conversation", {
        listed: preservedMessages.uuids.length,
        dropped: preservedMessages.uuids.length - filtered.length,
        tailDropped: !kn.has(preservedMessages.uuids.at(-1)),
        unpairedToolBlocksRemaining:
          count([...oo], (Fr) => !No.has(Fr)) + count([...No], (Fr) => !oo.has(Fr)),
      });
    } catch (error) {
      logError(error);
    }
    return Yt;
  }
  async function Mn(ut) {
    me("compaction");
    await Ae;
    let Yt =
      ut.compactMetadata.preservedMessages?.uuids.at(-1) ?? ut.compactMetadata.preservedSegment?.tailUuid;
    if (!Yt) return;
    let lastIndex = conversation.findLastIndex((kn) => kn.uuid === Yt);
    if (lastIndex === -1) return;
    await He(conversation.slice(0, lastIndex + 1), undefined, undefined);
    R = 0;
    w = undefined;
  }
  function jn(ut) {
    let preservedMessages = ut.compactMetadata.preservedMessages;
    let mapped = (preservedMessages?.allUuids ?? preservedMessages?.uuids ?? [])
      .map((Mr) => conversation.find((Pn) => Pn.uuid === Mr))
      .filter((Mr) => Mr !== undefined)
      .map(getTokenCountFromUsage_4);
    L =
      preservedMessages && mapped.length > 0
        ? {
            preserved: mapped,
            anchorUuid: preservedMessages.anchorUuid,
          }
        : null;
    let kn = conversation.length - 1;
    if (kn > 0) conversation.splice(0, kn);
    Jn(ut.uuid);
    let En = messages.length - 1;
    if (En > 0) {
      messages.splice(0, En);
      wt();
      R = messages.length;
      P = messages.length;
    }
  }
  function Jn(uuid) {
    if (L !== null && L.anchorUuid === uuid) {
      conversation.push(...L.preserved);
      L = null;
    }
  }
  function ze() {
    if (L === null) return;
    logEvent("tengu_compact_preserved_unanchored", {
      preservedCount: L.preserved.length,
    });
    conversation.push(...L.preserved);
    L = null;
  }
  function Dr(ut, Yt) {
    let nn = -1;
    for (let kn = ut; kn < Yt; kn++) {
      let En = messages[kn];
      if (weakSet.has(En)) {
        if (nn === -1) nn = kn;
      } else if (isCompactBoundaryMessage(En)) nn = -1;
      else if (En.type === "assistant" || En.type === "user")
        if (nn === -1 || !isToolResultMessage(En)) nn = -1;
        else {
          messages.splice(kn, 1);
          messages.splice(nn, 0, En);
          wt();
          nn++;
        }
    }
    return nn === -1 ? Yt : nn;
  }
  function $r(ut, Yt) {
    if (!holdsLoadersRows) return Yt;
    let nn = Yt;
    let kn = false;
    let En = false;
    for (let j = Yt - 1; j >= ut; j--) {
      let Pn = messages[j];
      let oo = isStopInterruptionRow(Pn);
      if (
        (Pn.type === "assistant" && (Pn.isApiErrorMessage !== true || j < P)) ||
        isCompactBoundaryMessage(Pn) ||
        (Pn.type === "user" &&
          (Pn.isMeta !== true || (Pn.promptSource !== undefined && !isInterruptMarkerRow(Pn))) &&
          !oo &&
          !weakSet.has(Pn) &&
          !isTurnCompanion(Pn) &&
          !isQueueTranscriptOnlyUserMessage(Pn) &&
          (Pn.promptSource !== undefined || localCommandTagKindOf(Pn) === undefined))
      )
        break;
      kn ||= oo;
      En ||= isInterruptMarkerRow(Pn);
      nn = j;
    }
    return kn || En ? nn : Yt;
  }
  function $n(ut) {
    for (let Yt of ut) weakSet.add(Yt);
    messages.push(...ut);
  }
  return {
    record: Xe,
    appendHostRows: $n,
    isHostRow: (ut) => weakSet.has(ut),
    evict: pn,
    holdFoldCopy: Se,
    settleFoldCopies: Ee,
    dropPreservedRowsNotInConversation: _n,
    flushBeforeCompactBoundary: Mn,
    applyCompactBoundary: jn,
    settlePreservedTail: Jn,
    flushUnanchoredPreservedTail: ze,
  };
}
//@ chunk-tyg7f3ek.js:430132-430390 placement
function takeShownAsStoredMark(e, n) {
  try {
    delete e.shownAsStoredIn;
    return e.isVirtual === true || e.handedOff === true ? undefined : n?.();
  } catch (error) {
    logError(
      Error(
        "could not ask the host for the mark of a reply that is shown as stored: a later worker will not send this reply again",
        {
          cause: error,
        },
      ),
    );
    return;
  }
}
//@ chunk-tyg7f3ek.js:430390-430560 placement
function markShownAsStored(e, shownAsStoredIn, hookOutputApplied) {
  try {
    if (!hookOutputApplied) e.shownAsStoredIn = shownAsStoredIn;
  } catch (error) {
    logError(
      Error("could not mark a reply as shown as stored: a later worker will not send this reply again", {
        cause: error,
      }),
    );
  }
}
//@ chunk-tyg7f3ek.js:430560-430575 placement
/**
 * 0.03125：计时遥测采样率
 */
var TIMING_SAMPLE_RATE = 0.03125;
//@ chunk-tyg7f3ek.js:430575-430877 placement
function sampleQueueLatency(e) {
  try {
    if (
      !isVsCodeTopSession() ||
      Math.random() >= TIMING_SAMPLE_RATE ||
      e.enqueuedWallMs === undefined ||
      e.previousTurnEndedWallMs === undefined ||
      e.enqueuedWallMs < e.previousTurnEndedWallMs
    )
      return;
    logEvent("tengu_sdk_time_to_init", {
      waited_ms: Math.max(0, e.startWallMs - e.enqueuedWallMs),
      duration_ms: e.startToInitMs,
      sample_rate: TIMING_SAMPLE_RATE,
    });
  } catch (error) {
    logError(error);
  }
}
//@ chunk-tyg7f3ek.js:430877-430897 placement
/**
 * 7000
 */
var DEFAULT_POLL_INTERVAL_MS = 7000;
var DEFAULT_LOOKAHEAD_MS = 3000;
//@ chunk-tyg7f3ek.js:430897-431139 placement
async function runWithDeadline(e, lookMs, signal) {
  let s = Error("aborted");
  try {
    let h = await withDeadline(
      raceWithAbortSignal(Promise.resolve().then(e), signal, () => s).then((value) => ({
        value,
      })),
      lookMs,
    );
    return h
      ? {
          how: "done",
          value: h.value,
        }
      : {
          how: "late",
        };
  } catch (error) {
    return error === s
      ? {
          how: "aborted",
        }
      : {
          how: "failed",
          error,
        };
  }
}
//@ chunk-tyg7f3ek.js:431139-433255 placement
/**
 * 等待设备桥（device bridge）上的指定工具出现：轮询 tools/list，可在池中替换为新的工具定义。
 */
async function waitForDeviceBridgeTool(e, n, r, s, h = {}) {
  let connectedGraceMs = h.pollMs ?? DEFAULT_POLL_INTERVAL_MS;
  let lookMs = h.lookMs ?? DEFAULT_LOOKAHEAD_MS;
  let { signal } = r.abortController;
  let now = Date.now();
  let P = await waitForMcpToolServer(e, n, r, {
    connectedGraceMs,
  });
  function L(x, G = {}) {
    let Z = Date.now() - now;
    logForDebugging(`waitForDeviceBridgeTool: the wait for "${e}" ended as ${x} after ${Z}ms`);
    return {
      ...P,
      ...G,
      waitedMs: Z,
      aborted: signal.aborted,
      bridgeEnd: x,
    };
  }
  let q = () =>
    L("aborted", {
      tool: undefined,
      tools: n,
    });
  if (P.aborted || signal.aborted) return q();
  if (P.tool) return L("in_pool");
  if (P.serverState !== "connected") return L(P.serverState === "unknown" ? "threw" : "not_connected");
  try {
    let x = aliasOrSelf(e, r.options.toolAliases);
    let G = () => findLongestPrefixClients(x, currentMcpClients(r));
    let Z = (Xe) =>
      L(Xe, {
        serverState: getMcpServerBaseUrlFromToolName(G()),
      });
    let found = G().find((Xe) => Xe.type === "connected");
    if (!found) return Z("not_connected");
    let Ae = await runWithDeadline(
      () =>
        listMcpTools(found, {
          signal,
          timeout: lookMs,
        }),
      lookMs,
      signal,
    );
    if (Ae.how === "aborted" || signal.aborted) return q();
    if (Ae.how === "late") return Z("look_timed_out");
    if (Ae.how === "failed") {
      logForDebugging(
        `waitForDeviceBridgeTool: tools/list on the device bridge failed: ${describeConnectError(Ae.error, found.config)}`,
        {
          level: "warn",
        },
      );
      return Z("look_failed");
    }
    let tools = Ae.value.tools;
    let ce =
      Array.isArray(tools) &&
      tools.some(
        (tool) =>
          typeof tool === "object" &&
          tool !== null &&
          "name" in tool &&
          typeof tool.name === "string" &&
          buildMcpToolName(found.name, tool.name) === x,
      );
    let nt = officeBridgeListingState(Ae.value);
    let ie = nt === "stub" ? "stub" : nt === "live" ? "live_without_tool" : "unmarked_without_tool";
    if (!ce && (nt === "stub" || !Ae.value.nextCursor)) return Z(ie);
    let Se;
    let me = await runWithDeadline(
      () =>
        refreshMcpServerTools(
          found,
          (Xe, We) => {
            Se = swapMcpServerTools(Xe, We, found.config);
          },
          s,
        ),
      lookMs,
      signal,
    );
    if (me.how === "aborted" || signal.aborted) return q();
    let Me = r.options.refreshTools?.() ?? n;
    let toolByName = findToolByName(Me, e, r.options.toolAliases);
    if (toolByName)
      return L("after_look", {
        tool: toolByName,
        tools: Me,
      });
    logForDebugging(
      `waitForDeviceBridgeTool: refreshing the device bridge's tools did not bring "${e}" (${me.how === "failed" ? describeConnectError(me.error, found.config) : me.how === "done" ? `${me.value.status}, ${Se === undefined ? "nothing swapped" : Se ? "swapped in" : "the swap was refused"}` : "not in time"})`,
      {
        level: "warn",
      },
    );
    let newTools = me.how === "done" && me.value.status === "refreshed" ? me.value.newTools : undefined;
    if (ce || (newTools && findToolByName(newTools, e, r.options.toolAliases))) return Z("listed_not_pooled");
    if (newTools) return Z(ie);
    return Z(me.how === "late" ? "look_timed_out" : "look_failed");
  } catch (error) {
    logError(error);
    return L("threw", {
      tool: undefined,
      tools: n,
      serverState: "unknown",
    });
  }
}
//@ chunk-tyg7f3ek.js:433255-434504 placement
function resolveDeferredToolUse({
  behavior,
  outcome,
  toolUseID,
  assistantMessage,
  messages,
  turnStartTools,
  toolAliases,
}) {
  let R = (G) =>
    toolUseID !== undefined && G.type === "user" && Array.isArray(G.message?.content)
      ? G.message.content.find((Z) => Z?.type === "tool_result" && Z.tool_use_id === toolUseID)
      : undefined;
  let last = messages.findLast((message) => R(message) !== undefined);
  let P = last && R(last);
  let found = NON_EXECUTION_KINDS.find((G) => last?.type === "user" && G === last.toolDenialKind);
  let q =
    toolUseID !== undefined && Array.isArray(assistantMessage?.message?.content)
      ? assistantMessage.message.content.find((G) => G?.type === "tool_use" && G.id === toolUseID)
      : undefined;
  let x = q && findTool(outcome.toolWait?.tools ?? turnStartTools, q.name, toolAliases);
  return {
    answer_behavior_kind: behavior === "allow" || behavior === "deny" ? behavior : "other",
    answer_outcome_kind: outcome.reExecuted ? "applied" : outcome.reason,
    call_result_kind:
      P?.type !== "tool_result"
        ? "none"
        : (found ?? (!P.is_error ? "ok" : outcome.callStarted ? "error" : "error-not-started-here")),
    call_concurrency_kind:
      q === undefined
        ? "no_call"
        : x === undefined
          ? "tool_not_loaded"
          : (() => {
                try {
                  let G = x.inputSchema.safeParse(q.input);
                  return G.success && x.isConcurrencySafe(G.data);
                } catch {
                  return false;
                }
              })()
            ? "safe"
            : "unsafe",
    call_is_for_device_bridge:
      typeof q?.name === "string" && mcpInfoFromString(q.name)?.serverName === REMOTE_DEVICES,
    waited_for_tool_ms: outcome.toolWait?.waitedMs ?? 0,
    device_bridge_wait_end_kind: outcome.toolWait?.bridgeEnd ?? "did_not_wait_for_computer",
    note_stored: outcome.noteStored === true,
    card_step_again_kind: (outcome.reExecuted ? outcome.cardStep : undefined) ?? "not_run",
  };
}
//@ chunk-tyg7f3ek.js:434504-434844 placement
function countAttachmentRowsAtTail(mutableMessages) {
  try {
    return count(
      mutableMessages.slice(
        mutableMessages.findLastIndex(
          (n) =>
            n.type === "assistant" ||
            (n.type === "user" &&
              Array.isArray(n.message.content) &&
              n.message.content[0]?.type === "tool_result"),
        ) + 1,
      ),
      (n) => n.type === "attachment" && attachmentToMessages(n).messages.length > 0,
    );
  } catch (error) {
    logError(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `attachmentRowsAtTail threw; reporting 0: ${errorMessage(error)}`,
        "attachmentRowsAtTail threw",
      ),
    );
    return 0;
  }
}
//@ chunk-tyg7f3ek.js:434844-435009 placement
function turnContinuationKind({ orphanedPermission, handedOffTurn, deferredToolUse }) {
  if (orphanedPermission) return "orphaned_permission";
  if (handedOffTurn) return "turn_handoff";
  return deferredToolUse ? "deferred_tool_use" : "none";
}
//@ chunk-tyg7f3ek.js:435009-440425 placement
/**
 * headless 轮次主体：处理 orphaned permission / turn handoff / 延迟工具调用，刷新转录、放置文件，然后运行查询并产出 SDK 消息。
 */
async function* runHeadlessTurn({
  orphanedPermission,
  handedOffTurn,
  beginTranscriptFlush,
  awaitStagedFiles,
  placeFilesByName,
  placeCarriedWrites,
  handoffRelay,
  deferredToolUse,
  hasPrompt,
  tools,
  mutableMessages,
  processUserInputContext,
  canUseTool,
  answers,
  persistSession,
  earlyResult,
  onHandedOffCallsRan,
  onOrphanedAnswerSettled,
}) {
  let ce = mutableMessages.length;
  let nt = () =>
    deferredToolUse !== undefined &&
    (orphanedPermission?.denyIsRefusal === true || isPermissionCardHoldEnabled()) &&
    hasToolResultAfter(mutableMessages, ce, deferredToolUse.toolUseID);
  let ie = () =>
    buildResultMessage({
      startedAt: earlyResult.startedAt,
      common: {
        is_error: false,
        duration_api_ms: 0,
        num_turns: 0,
        stop_reason: null,
        session_id: getSessionId(),
        total_cost_usd: getTotalCostUSD(),
        usage: earlyResult.usage,
        modelUsage: getModelUsage(),
        permission_denials: earlyResult.permissionDenials,
        fast_mode_state: getFastModeState(earlyResult.mainLoopModel, earlyResult.fastMode),
        fast_mode_disabled_reason:
          getFastModeUnavailableReasonCode() ??
          getFastRejectedReason(earlyResult.mainLoopModel, earlyResult.fastMode) ??
          undefined,
        origin: earlyResult.origin,
        subagent_stats: buildFileHistorySnapshotChain(processUserInputContext.session),
        safety_stops: getSafetyStops(),
      },
      variant: {
        subtype: "success",
        result: "",
        ...earlyResult.sendEcho,
        ...earlyResult.resumeReasonStamp,
      },
    });
  let Se = () =>
    buildResultMessage({
      startedAt: earlyResult.startedAt,
      common: {
        is_error: true,
        duration_api_ms: 0,
        num_turns: 0,
        stop_reason: null,
        session_id: getSessionId(),
        total_cost_usd: getTotalCostUSD(),
        usage: earlyResult.usage,
        modelUsage: getModelUsage(),
        permission_denials: earlyResult.permissionDenials,
        terminal_reason: "aborted_tools",
        fast_mode_state: getFastModeState(earlyResult.mainLoopModel, earlyResult.fastMode),
        fast_mode_disabled_reason:
          getFastModeUnavailableReasonCode() ??
          getFastRejectedReason(earlyResult.mainLoopModel, earlyResult.fastMode) ??
          undefined,
        origin: earlyResult.origin,
        subagent_stats: buildFileHistorySnapshotChain(processUserInputContext.session),
        safety_stops: getSafetyStops(),
      },
      variant: {
        subtype: "error_during_execution",
        errors: ["turn_handoff: the turn was stopped before any of its calls ran"],
        ...(earlyResult.sendEcho ?? {
          user_message_uuid: undefined,
        }),
        ...earlyResult.resumeReasonStamp,
      },
    });
  if (orphanedPermission) {
    checkTurnIdsConsistent([orphanedPermission]);
    clearTurnTraceContexts();
    let Ee = lastUserAfterAssistant(mutableMessages);
    let He = yield* handleOrphanedPermission(
      orphanedPermission,
      tools,
      canUseTool,
      mutableMessages,
      processUserInputContext,
      waitForDeviceBridgeTool,
      answers,
    );
    if (!He.reExecuted) dropCcrTurnId();
    try {
      let deferredToolUse = resolveDeferredToolUse({
        behavior: orphanedPermission.permissionResult?.behavior,
        outcome: He,
        toolUseID: orphanedPermission.permissionResult?.toolUseID,
        assistantMessage: orphanedPermission.assistantMessage,
        messages: mutableMessages,
        turnStartTools: tools,
        toolAliases: processUserInputContext.options.toolAliases,
      });
      logForDiagnosticsNoPII("info", "cli_orphan_answer_settled", deferredToolUse);
      onOrphanedAnswerSettled?.(deferredToolUse);
    } catch (error) {
      logError(error);
    }
    let Xe = {
      waited_ms: He.toolWait?.waitedMs ?? 0,
      server_state: fromEnumOpt(He.toolWait?.serverState),
      server_state_at_start: fromEnumOpt(He.toolWait?.initialServerState),
      device_bridge_wait_end: fromEnumOpt(He.toolWait?.bridgeEnd),
      resumes_interrupted_turn: orphanedPermission.resumesInterruptedTurn === true,
    };
    let behavior = orphanedPermission.permissionResult?.behavior;
    let missingTool = He.reExecuted ? undefined : He.missingTool;
    let wt = {
      answer_behavior: fromEnum(behavior === "allow" || behavior === "deny" ? behavior : "other"),
      tool_departure_cause: fromEnumOpt(missingTool?.departureCause),
      server_transport: fromEnumOpt(missingTool?.serverTransport),
      server_is_device_bridge: missingTool?.serverIsDeviceBridge,
      server_tools_list_failed: missingTool?.serverToolsListFailed,
      server_tools_in_pool: fromEnumOpt(missingTool?.serverToolsInPool),
    };
    if (He.reExecuted)
      logEvent("tengu_orphaned_permission_applied", {
        found_on_reread: He.toolWait !== undefined,
        ...Xe,
      });
    if (!He.reExecuted && He.reason === "closed_unrun")
      logEvent("tengu_orphaned_permission_closed_unrun", {
        ...Xe,
        ...wt,
      });
    if (!He.reExecuted && He.reason !== "closed_unrun" && !hasPrompt && (!deferredToolUse || nt())) {
      if (He.reason === "aborted") return false;
      let Lt = {
        reason: fromEnum(He.reason),
        ...Xe,
        ...wt,
      };
      if (orphanedPermission.resumesInterruptedTurn && !orphanedPermission.siblings?.length && Ee) {
        logForDebugging(
          "Orphaned permission could not be applied; it stood in for the interrupted turn it was parked on, so the turn proceeds to the model on the interrupted prompt",
        );
        logEvent("tengu_orphaned_permission_unapplied_turn_resumed", Lt);
        return false;
      }
      logForDebugging(
        "Orphaned permission could not be applied, or left a served call unsettled, and the turn has no prompt: ending the turn without a model call",
      );
      logEvent("tengu_orphaned_permission_unapplied_turn_end", Lt);
      yield ie();
      return true;
    }
  }
  if (handedOffTurn) {
    dropCcrTurnId();
    clearTurnTraceContexts();
    let taskListCatchUp = createTaskListCatchUp(
      processUserInputContext.session,
      handedOffTurn.messages,
      mutableMessages,
      processUserInputContext.storageV5,
    );
    let attachmentRowsAhead = countAttachmentRowsAtTail(mutableMessages);
    let Xe;
    try {
      Xe = yield* handleHandedOffTurn(
        handedOffTurn,
        tools,
        mutableMessages,
        processUserInputContext,
        canUseTool,
        beginTranscriptFlush,
        handoffRelay,
        async (We) => {
          try {
            await taskListCatchUp.beforeRun();
          } finally {
            if (awaitStagedFiles)
              await measurePhase("resume_other", "resume_staged_files_wait", () => awaitStagedFiles(We));
            await placeFilesByName?.(handedOffTurn, We);
          }
        },
        placeCarriedWrites,
      );
    } finally {
      if (handoffRelay && handedOffTurn.relayMarker !== undefined && handedOffTurn.kind !== "stopped")
        try {
          handoffRelay.noteHandoffMarkerFate(
            handedOffTurn.kind,
            Xe === undefined ? "unfinished" : Xe.ran ? "ran" : Xe.reason,
          );
        } catch (error) {
          logError(error);
        }
    }
    await taskListCatchUp.catchUp(isHandoffTurnSettled(Xe));
    if (Xe.ran) onHandedOffCallsRan(Xe.contextLayers);
    logEvent("tengu_turn_handoff_run", {
      ran: Xe.ran,
      reason: fromEnumOpt(Xe.ran ? undefined : Xe.reason),
      kind: fromEnum(handedOffTurn.kind),
      tool_uses: handedOffTurn.toolUseIDs.length,
      carried_messages: handedOffTurn.messages.length,
      has_memory_context: handedOffTurn.memoryLine !== undefined,
      has_relay_marker: handedOffTurn.relayMarker !== undefined,
      attachment_rows_ahead: attachmentRowsAhead,
    });
    if (
      !Xe.ran &&
      (handedOffTurn.kind === "stopped" ||
        Xe.reason === "stopped_closed" ||
        Xe.reason === "stopped_unconfirmed")
    ) {
      yield Se();
      return true;
    }
    if (!Xe.ran && Xe.reason === "history_appended") {
      yield ie();
      return true;
    }
    if (!Xe.ran && !hasPrompt && !deferredToolUse) {
      yield ie();
      return true;
    }
  }
  if (!deferredToolUse) return false;
  dropCcrTurnId();
  clearContextKey();
  clearTurnTraceContexts();
  let me = (Ee, He) =>
    buildResultMessage({
      startedAt: earlyResult.startedAt,
      common: {
        is_error: He,
        duration_api_ms: 0,
        num_turns: mutableMessages.length,
        stop_reason: He ? "tool_deferred_unavailable" : "tool_deferred",
        session_id: getSessionId(),
        total_cost_usd: getTotalCostUSD(),
        usage: earlyResult.usage,
        modelUsage: getModelUsage(),
        permission_denials: earlyResult.permissionDenials,
        ...(He && {
          terminal_reason: "tool_deferred_unavailable",
        }),
        fast_mode_state: getFastModeState(earlyResult.mainLoopModel, earlyResult.fastMode),
        fast_mode_disabled_reason:
          getFastModeUnavailableReasonCode() ??
          getFastRejectedReason(earlyResult.mainLoopModel, earlyResult.fastMode) ??
          undefined,
        origin: earlyResult.origin,
        subagent_stats: buildFileHistorySnapshotChain(processUserInputContext.session),
        safety_stops: getSafetyStops(),
      },
      variant: {
        subtype: "success",
        result: "",
        ...((He || !hasPrompt) && earlyResult.sendEcho),
        ...((He || !hasPrompt) && earlyResult.resumeReasonStamp),
        deferred_tool_use: {
          id: Ee.toolUseID,
          name: Ee.toolName,
          input: Ee.toolInput,
        },
      },
    });
  if (nt()) {
    logForDebugging(
      `Deferred tool resume: ${deferredToolUse.toolUseID} already has this turn's result; not run again`,
    );
    return false;
  }
  if (!findTool(tools, deferredToolUse.toolName, processUserInputContext.options.toolAliases)) {
    logForDebugging(
      `Deferred tool resume: tool '${deferredToolUse.toolName}' is no longer available (MCP server disconnected or tool removed)`,
      {
        level: "warn",
      },
    );
    yield me(deferredToolUse, true);
    return true;
  }
  let Me = yield* resumeDeferredToolUse(
    deferredToolUse,
    canUseTool,
    mutableMessages,
    processUserInputContext,
  );
  if (!Me) return false;
  if (persistSession)
    await recordTranscript(
      mutableMessages,
      undefined,
      undefined,
      undefined,
      processUserInputContext.storageV5,
    );
  yield me(Me, false);
  return true;
}
//@ chunk-tyg7f3ek.js:440425-440628 placement
async function loadSkillsAndPlugins(storage) {
  headlessProfilerCheckpoint("before_skills_plugins");
  let startTime = performance.now();
  let results = await Promise.all([
    getSlashCommandToolSkills(getCwdOrNull(), storage),
    loadAllPluginsCacheOnly(storage),
  ]);
  recordPhase("qe_plugin_skills_load_ms", performance.now() - startTime, startTime);
  headlessProfilerCheckpoint("after_skills_plugins");
  return results;
}
//@ chunk-tyg7f3ek.js:440628-440808 placement
function logShouldQueryResolved({ shouldQuery, fromUserInput, fromOptions }) {
  headlessProfilerCheckpoint("system_message_yielded");
  logForDiagnosticsNoPII("info", "cli_ask_should_query_resolved", {
    should_query: shouldQuery,
    from_user_input: fromUserInput,
    from_options: fromOptions,
  });
}
//@ chunk-tyg7f3ek.js:440808-440872 placement
var getCoordinatorUserContext_2 = require("./chunk-yxywkh50.js").getCoordinatorUserContext;
//@ chunk-tyg7f3ek.js:440872-441122 placement
function resolveTurnModelAndThinking({ userSpecifiedModel, permissionMode, thinkingConfig }) {
  let mainLoopModel =
    userSpecifiedModel &&
    (isExemptDefaultResolvingPick(userSpecifiedModel) || isModelAllowed(userSpecifiedModel))
      ? parseUserSpecifiedModel(userSpecifiedModel)
      : getMainLoopModel();
  let runtimeModel = getRuntimeMainLoopModel({
    permissionMode,
    mainLoopModel,
  });
  return {
    mainLoopModel,
    runtimeModel,
    thinkingConfig: thinkingConfig
      ? thinkingConfig
      : isBetaHeaderAllowed() !== false
        ? {
            type: "adaptive",
          }
        : {
            type: "disabled",
          },
  };
}
//@ chunk-tyg7f3ek.js:441122-441978 placement
/**
 * headless 轮次的系统提示组装：自定义/追加提示、追加头、动态段与 cache breaker。
 */
async function buildHeadlessSystemPrompt({
  session,
  tools,
  runtimeModel,
  customSystemPrompt,
  appendSystemPrompt,
  appendSystemPromptHead,
  excludeDynamicSections,
  cacheBreakerPhrase,
  mcpClients,
  storageV5,
  credentials,
}) {
  headlessProfilerCheckpoint("before_getSystemPrompt");
  let startTime = performance.now();
  let { defaultSystemPrompt, userContext, systemContext } = await fetchSystemPromptParts({
    session,
    tools,
    mainLoopModel: runtimeModel,
    customSystemPrompt,
    excludeDynamicSections,
    cacheBreakerPhrase,
    storageV5,
    credentials,
  });
  recordPhase("qe_system_prompt_ms", performance.now() - startTime, startTime);
  headlessProfilerCheckpoint("after_getSystemPrompt");
  let userContext_2 = {
    ...userContext,
    ...getCoordinatorUserContext_2(
      mcpClients,
      TOOL_CATALOG.getAllBaseTools,
      isScratchpadEnabled() ? (getScratchpadDir() ?? undefined) : undefined,
      tools,
    ),
  };
  let memoryMechanicsPrompt =
    customSystemPrompt !== undefined && hasAutoMemPathOverride()
      ? await loadMemoryPrompt(getPromptModel(runtimeModel))
      : null;
  let Ue = withCliSections(baseSystemPromptOf(customSystemPrompt, defaultSystemPrompt), {
    tools,
    memoryMechanicsPrompt,
    appendSystemPrompt: undefined,
  });
  let ce = appendSystemPromptHead
    ? renderAppendPromptHead(Ue, appendSystemPrompt, appendSystemPromptHead, shouldUseGlobalCacheScope())
    : undefined;
  let nt = ce ? ce.append : appendSystemPrompt;
  return {
    systemPrompt: asSystemPrompt([...(ce ? ce.base : Ue), ...(nt ? [nt] : [])]),
    userContext: userContext_2,
    systemContext,
  };
}
//@ chunk-tyg7f3ek.js:441978-442046 placement
/**
 * 声明为绝对路径的额外目录
 */
function additionalDirectoriesForInit(source) {
  try {
    return isPolicyVerdictAbsentOrHipaa() ? undefined : declaredAbsoluteAdditionalDirectories(source);
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-tyg7f3ek.js:442046-443633 placement
/**
 * 组装 SDK system/init 消息：工具、MCP 服务器、模型、权限模式、命令、agents、skills、插件、快速模式等。
 */
async function buildSdkInitMessage({
  session,
  tools,
  mcpClients,
  model,
  readSessionEffort,
  permissionMode,
  commands,
  agents,
  skills,
  plugins,
  fastMode,
  proactivityState,
  capabilities,
  messagesInView,
}) {
  await getAutoMemPathState().warmCanonicalWcRoot();
  if (getPlatform() === "windows") await getCachedPowerShellPath();
  let startTime = performance.now();
  let re = isTransportBacked(session);
  let Ae = () => ({
    redactsWhatItPersists: re,
    isRemoteTransport: transportStateByHost.of(session).active?.isRemoteTransport() === true,
    sessionWriters: transportStateByHost.of(session).active?.sessionWriters(),
  });
  let systemInitMessage = buildSystemInitMessage({
    ...(re ? buildRemoteSystemInitFields() : buildSystemInitFields()),
    tools,
    mcpClients: mcpClients
      .filter((mcpClient) => !isArtifacts404Failure(mcpClient))
      .map((mcpClient) => ({
        name: mcpClient.name,
        type: mcpClient.type,
        source: mcpServerSource(mcpClient.name, mcpClient.config),
      })),
    model,
    permissionMode,
    proactivity: proactivityStateStub(proactivityState),
    ...{},
    commands: mergeClients_2(commands),
    agents,
    skills,
    plugins: re ? [] : plugins.enabled,
    additionalDirectories: re
      ? undefined
      : additionalDirectoriesForInit(proactivityState.toolPermissionContext),
    pluginErrors: re
      ? []
      : [...plugins.errors, ...pluginsSyncErrors(session)].filter(isMarketplacePluginError).map((ce) => {
          let nt = pluginNameOfError(ce);
          return {
            plugin: ce.source,
            type: ce.type,
            message: pluginErrorText(ce),
            ...(nt !== undefined && {
              path: nt,
            }),
          };
        }),
    mcpServerErrors: re ? [] : getSkippedDynamicServers(),
    pluginWarnings: re
      ? []
      : plugins.warnings
          .filter((warning) => hasMarketplaceAlias(warning.source))
          .map((warning) => ({
            plugin: warning.source,
            type: warning.type,
            message: pluginWarningText(warning),
          })),
    fastModeState: getFastModeState(model, fastMode),
    fastModeDisabledReason:
      getFastModeUnavailableReasonCode() ?? getFastRejectedReason(model, fastMode) ?? undefined,
    perTurnEffortActive: canonicalNameOrUndefined(model),
    ultrathinkAvailable: ultrathinkEffectiveSafely(model, readSessionEffort),
    viewMode: viewTeammateOutput(),
    capabilities: capabilities ?? [
      ...INTERRUPT_MARKER_KEYS,
      ...(transportStateByHost.of(session).active?.commandLifecycleForwarderInstalled === true
        ? [LIFECYCLE_WAKEUP_SOURCE_V1]
        : []),
      ...(transportStateByHost.of(session).active?.isRemoteTransport() === true
        ? [TASK_LIST_RESTORE_V1]
        : []),
      ...(TASK_LIST_HANDOFF_STATE.peek(session)?.honoured === true ? [TASK_LIST_RESTORED_V1] : []),
      ...queuedNotificationCapabilities(tools, session, messagesInView),
      ...(sessionNoticesCapability(session, permissionMode) ? [SESSION_NOTICES] : []),
      ...sdkMcpCapabilities(transportStateByHost.of(session).active),
      ...(re ? [] : [MCP_READ_RESOURCE_V1]),
      ...(re ? [] : [MCP_TOOL_UI_META_V1]),
      ...uiSurfaceCapabilities(Ae),
      ...uiHookedCapabilities(Ae),
      ...(persistsWithoutRedaction(Ae()) ? [MCP_CALL_RESULT_NOT_FOR_MODEL_V1] : []),
      ...(isReadFileAsWrittenServed(session) ? [READ_FILE_AS_WRITTEN_V1] : []),
      ...emptyMarkerList(),
      ...(shouldOfferLinuxSandboxHint(tools) ? [START_SHELL_TASK_V1] : []),
      ...[],
    ],
  });
  recordInitTiming(systemInitMessage, startTime);
  return systemInitMessage;
}
//@ chunk-tyg7f3ek.js:443633-446804 placement
/**
 * 构造 headless 模式的 ToolUseContext（文件历史、AppState 读写、SDK 状态回调等）。
 */
function createHeadlessToolUseContext(e, n) {
  let { getAppState, setAppState, setSDKStatus, tools } = e;
  let S = () => getAppState().fileHistory;
  let R = (w) => {
    setAppState((P) => {
      let L = reduceFileHistoryState(P.fileHistory, w, e.storageV5);
      if (L === P.fileHistory) return P;
      return {
        ...P,
        fileHistory: L,
      };
    });
  };
  return {
    renderedSystemPrompt: e.renderedSystemPrompt,
    messages: n.messages,
    messageQueue: e.messageQueue,
    session: e.session,
    turnStartIndex: 0,
    primitiveToolGrant: e.primitiveToolGrant,
    ...(n.phase === "query" && {
      permissionLayers: n.permissionLayers,
    }),
    setMessages: n.phase === "input" ? n.setMessages : () => {},
    applyMessageOp: n.phase === "input" ? n.applyMessageOp : () => {},
    onChangeAPIKey: () => {},
    onPermissionDenial: e.onPermissionDenial,
    requestDialog: e.requestDialog,
    permissionRelays: Jce,
    sessionState: e.sessionState,
    agentContext: mainAgentContext(),
    options: {
      commands: e.commands,
      debug: false,
      tools,
      toolCatalog: e.toolCatalog ?? TOOL_CATALOG,
      refreshTools: e.refreshTools,
      refreshMcpClients: e.refreshMcpClients,
      verbose: e.verbose,
      mainLoopModel: n.mainLoopModel,
      fallbackModel: e.fallbackModel,
      thinkingConfig: e.thinkingConfig,
      mcpClients: e.mcpClients,
      mcpResources: {},
      ideInstallationStatus: null,
      isNonInteractiveSession: true,
      runQuery: query,
      customSystemPrompt: e.customSystemPrompt,
      ...(e.customSystemPrompt !== undefined && {
        omitGitStatus: true,
      }),
      appendSystemPrompt: e.appendSystemPrompt,
      planModeInstructions: e.planModeInstructions,
      systemPromptSnapshot: e.systemPromptSnapshot,
      appendSubagentSystemPrompt: e.appendSubagentSystemPrompt,
      toolAliases: e.toolAliases,
      excludeDynamicSections: e.excludeDynamicSections,
      agentDefinitions: {
        activeAgents: e.agents,
        allAgents: [],
        allowedAgentTypes: e.allowedAgentTypes,
      },
      theme: resolveThemeSetting(resolveSetting("theme", "dark").value),
      maxBudgetUsd: e.maxBudgetUsd,
      messageClientPlatform: e.messageClientPlatform,
      messageInboundOrigin: e.messageInboundOrigin,
      forwardSubagentText: e.forwardSubagentText,
      ...(n.phase === "query" && {
        activeSkill: n.activeSkill,
      }),
      requiresStructuredOutput: e.requiresStructuredOutput,
      autoCompactWindow: n.appState.autoCompactWindow,
      fastMode: n.appState.fastMode,
      cacheBreakerPhrase: n.appState.cacheBreakerPhrase,
      activeGoal: n.appState.activeGoal,
      ultraplanSessionUrl: n.appState.ultraplanSessionUrl,
    },
    getAppState,
    setAppState,
    ...createAppStateAccessors(getAppState, setAppState),
    queuedNotificationsRegistry: createNotificationDrain(getAppState, setAppState, e.session),
    taskRegistry: createTaskFramework(getAppState, setAppState),
    sessionHooksRegistry: e.sessionHooks,
    teammateColors: createColorAssigner(fieldAccessor(getAppState, setAppState, "teammateColors")),
    rootToolSurface: {
      tools,
      mainLoopModel: n.mainLoopModel,
    },
    abortController: n.abortController,
    readFileState: e.readFileState,
    nestedMemoryAttachmentTriggers: [],
    pendingNestedMemoryTriggers: e.pendingNestedMemoryTriggers,
    sessionEnvVars: e.sessionEnvVars,
    toolState: e.toolState,
    toolDecisions: new Map(),
    dynamicSkillDirTriggers: [],
    memorySelector: e.memorySelector,
    isolationLatch: e.isolationLatch,
    storageV5: e.storageV5,
    credentials: e.credentials,
    getFileHistoryState: S,
    applyFileHistoryOp: R,
    ...(n.phase === "input" && {
      makeFileHistorySnapshot: async (w) => {
        if (!n.persistSession) return;
        await fileHistoryMakeSnapshot(S, R, w, {
          preCheckpoint: true,
        });
      },
    }),
    applyAttributionOp: (w) => {
      setAppState((P) => {
        let L = restoreAttributionStateFromSnapshots(P.attribution, w);
        if (L === P.attribution) return P;
        return {
          ...P,
          attribution: L,
        };
      });
    },
    onCompactEvent: (w) => {
      if (w.type === "sdk_status") setSDKStatus?.(w.status, w.metadata);
    },
    onQueryEvent: (w) => {
      if (w.type === "apply_flag_settings") applySessionSettingsPatch(w.settings, setAppState);
      else if (w.type === "conversation_reset") {
        e.sessionState?.notifyConversationReset();
        notifyToolsKept(e.sessionState);
      }
    },
  };
}
//@ chunk-tyg7f3ek.js:446804-446865 placement
function setCwdOrPin(e, session) {
  try {
    setCwd(e, session);
    return;
  } catch (error) {
    return pinMissingWorkingDirectory(error, session);
  }
}
//@ chunk-tyg7f3ek.js:446865-446943 placement
async function setCwdV5OrPin(e, session, storageV5) {
  try {
    await setCwdV5(e, session, storageV5);
    return;
  } catch (error) {
    return pinMissingWorkingDirectory(error, session);
  }
}
//@ chunk-tyg7f3ek.js:446943-447452 placement
function pinMissingWorkingDirectory(error, n) {
  if (!(error instanceof MissingWorkingDirectoryError)) throw error;
  n.setCwd(error.path);
  setCwdForCallChain(error.path);
  logForDebugging(
    `[headless] working directory ${error.path} no longer exists; the turn starts pinned to it`,
    {
      level: "warn",
    },
  );
  let r = missingWorkingDirectoryPins.of(n);
  if (r.pinned) return;
  r.pinned = true;
  try {
    logEvent("tengu_shell_set_cwd", {
      success: false,
      missing_at_turn: true,
    });
  } catch {}
  let s = isTransportBacked(n) ? "" : ` ${error.path}`;
  return informationalSystemMessage(
    createSystemMessage(
      `The session's working directory${s} no longer exists; shell commands cannot start there and relative file paths that use it will fail until it is restored.`,
      "warning",
    ),
  );
}
//@ chunk-tyg7f3ek.js:447452-447567 placement
function declaredToolSetFor(e, n, r) {
  return new DeclaredToolSet(
    e.filter((s) => n(s) && isToolDeclaredForTurn(s, e, r)),
    {
      only: new Map(),
      order: [],
      names: e.map((s) => s.name),
    },
  );
}
//@ chunk-tyg7f3ek.js:447567-447963 placement
function resolveToolSearchForTurn(e, tools, r) {
  r.requestsHaveToolSearch ??=
    isToolSearchEnabledOptimistic() &&
    !isToolSearchPrecluded(r.model(), tools) &&
    !toolSearchRejectedOn(getStickyBetas(), r.model());
  if (!r.requestsHaveToolSearch) return "harmful";
  if (isToolDeclaredForTurn(e, tools, r))
    return r.isNewConversation && isFoamySpringEnabled_2() ? "free" : "harmful";
  r.loaded ??= extractDiscoveredToolNames(r.messages, {
    surfaced: {
      exceptAnnouncements: new Set(),
    },
  });
  if (!isDeferredTool(e, r.nonDeferrableBuiltins) || r.loaded.has(e.name))
    return deferredToolsKeptCached() ? "costly" : "harmful";
  return r.held === undefined ? "costly" : "free";
}
//@ chunk-tyg7f3ek.js:447963-448257 placement
function isToolDeclaredForTurn(e, tools, r) {
  let s = (r.nonDeferrableBuiltins ??= getNonDeferrableBuiltins());
  if (r.held === undefined && r.aboutToHold === undefined)
    r.aboutToHold =
      computeDeclaredToolSet(
        getStickyBetas(),
        tools,
        (h) => isDeferredTool(h, s),
        r.model(),
        r.isNewConversation && !messagesSinceCompactBoundary(r.messages).some((h) => h.type === "assistant"),
      ) ?? null;
  return !isDeferredToolInConversation(e, r.held ?? r.aboutToHold ?? undefined, tools, {
    nonDeferrableBuiltins: s,
  });
}
//@ chunk-tyg7f3ek.js:448257-448270 placement
var DEVICE_BRIDGE_TOOL_WAIT_MS = 60000;
//@ chunk-tyg7f3ek.js:448342-448521 sole-consumer
function readTurnSignals(turnStartClock, frameTiming, r, s) {
  if (
    turnStartClock === undefined ||
    frameTiming?.turnStartMark === undefined ||
    frameTiming.receivedWallMs === undefined
  )
    return;
  try {
    return turnStartClock.readSince(frameTiming.turnStartMark, r, s - frameTiming.enqueuedWallMs);
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-tyg7f3ek.js:448521-483526 placement
function QueryEngine(e) {
  clearClassifierContext();
  let { getAppState, setAppState } = e;
  let initialMessages = e.initialMessages ?? [];
  let h =
    e.conversation ??
    orderedRowSource({
      keep: (It) => {
        initialMessages.push(...It);
      },
      rows: () => initialMessages,
      list: initialMessages,
      isHookable: true,
    });
  let y = Boolean(env.CLAUDE_CODE_SESSION_START_ANNOUNCEMENTS_BEFORE_PROMPT);
  let S = androidEvidenceByHost.of(e.session.host);
  S.absorb(initialMessages);
  let readFileCache = e.readFileCache;
  let sessionEnvVars = e.sessionEnvVars ?? new Map();
  let isolationLatch = e.isolationLatch ?? createIsolationLatch();
  let L = e.toolState ?? new InstanceRegistry();
  let q = e.sessionHooks ?? createSessionHooksRegistry();
  let any = initialMessages.some(
    (initialMessage) =>
      initialMessage.type === "assistant" || (initialMessage.type === "user" && !initialMessage.isMeta),
  );
  let G = false;
  let memorySelector = e.memorySelector ?? emptyPickerState();
  let userSpecifiedModel = e.userSpecifiedModel;
  let Ae;
  let abortController = createAbortController();
  function ce() {
    let signal = e.abortController?.signal;
    if (signal?.aborted) abortController.abort(signal.reason);
  }
  function nt() {
    abortController.abort(e.abortController?.signal.reason);
  }
  e.abortController?.signal.addEventListener("abort", nt, {
    once: true,
  });
  ce();
  function ie(It = "remote-cancel") {
    abortController.abort(userAbortReason(It));
    abortController = createAbortController();
    ce();
  }
  let Se = null;
  let me;
  function Me() {
    let It = me;
    me = undefined;
    return It;
  }
  let Ee = new Stream();
  let queryEngine = createQueryEngine({
    run: query,
    queryParams: async () => {
      if (Se === null) throw Error("headless session: turn picked up without prepared params");
      let It = Se;
      Se = null;
      return It;
    },
    hostOwnsPermissionMode: true,
    sdkResultVerdict: true,
    fastModeState: () => (Ae === undefined ? undefined : getFastModeState(Ae.model, Ae.enabled)),
    fastModeDisabledReason: () =>
      getFastModeUnavailableReasonCode() ?? (Ae && getFastRejectedReason(Ae.model, Ae.enabled)) ?? undefined,
    onCommandLifecycle: e.onCommandLifecycle,
    onTurnThrow: (It) => {
      me = It;
    },
  });
  queryEngine.streamInput(Ee).catch(logError);
  let Xe = [];
  let We = [];
  let turnStreamBridge = createTurnStreamBridge((It) => {
    Xe.push(...It);
  });
  let wt = new Set();
  let turnEventsSettleMs = e.turnEventsSettleMs ?? DEVICE_BRIDGE_TOOL_WAIT_MS;
  let pn = false;
  function _n(It, logModsFirstTurn, on) {
    try {
      return logModsFirstTurn();
    } catch (error) {
      logForDebugging(`headless session: ${It} failed, the turn goes on without it: ` + errorMessage(error), {
        level: "error",
      });
      return on;
    }
  }
  async function Mn() {
    let abortController = new AbortController();
    try {
      let Ie = await withDeadline(
        Promise.race([
          turnStreamBridge
            .settled()
            .then(() => opsDelivered())
            .then(() => "settled"),
          abortTurnSignal(e.messageQueue, abortController.signal).then(() => "yielded"),
        ]),
        turnEventsSettleMs,
      );
      pn = Ie === "yielded";
      if (Ie === undefined) {
        turnStreamBridge.sever();
        _n("the mods' first-turn row at the cut", logModsFirstTurn, undefined);
        logForDebugging(
          `headless session: turn events still running after ${turnEventsSettleMs}ms; the turn ends without them and their late notes are dropped`,
          {
            level: "warn",
          },
        );
      } else if (Ie === "yielded")
        logForDebugging(
          "headless session: a turn event hook queued input; the turn ends so it can run, and the events settle with the turn that runs it",
        );
    } catch (error) {
      pn = false;
      logForDebugging(`headless session: settling the turn events failed: ${errorMessage(error)}`, {
        level: "warn",
      });
    } finally {
      abortController.abort();
    }
    return Xe.splice(0);
  }
  async function jn(It, Ie, on, Zn) {
    We = await Mn();
    if (We.length === 0) return;
    try {
      We = [...(await appendRowsWithHooks(h, We))];
      Ie.push(...We);
      if (on) {
        await It.record(true);
        if (Zn) await flushSessionStorage();
      }
    } catch (error) {
      logForDebugging("headless session: recording the turn's notes failed: " + errorMessage(error), {
        level: "error",
      });
    }
  }
  let Jn = new Set(snapshotUuids(initialMessages));
  function ze(It, Ie, systemPromptSnapshot) {
    let Zn = false;
    try {
      Zn = It !== undefined && It !== "" && e.takeSystemPromptDelivered?.() === true;
      let Nn =
        Zn &&
        shouldSnapshotSystemPrompt({
          systemPromptSnapshot,
        }) &&
        !snapshotContainsPrompt(messagesSinceCompactBoundary(initialMessages), It);
      let Cr = messagesSinceCompactBoundary(initialMessages);
      let last = snapshotUuids(Cr).at(-1);
      let io =
        e.liveAppendSections !== undefined &&
        (Ie || (last !== undefined && Jn.has(last))) &&
        shouldSnapshotSystemPrompt({
          systemPromptSnapshot,
        })
          ? tagBlockChange(Cr, Ie, e.liveAppendSections)
          : undefined;
      if (Nn || io !== undefined) {
        let Hr = appendRowsWithHooks(h, [lazyToolAttachment()]);
        if (Hr instanceof Promise) Hr.catch(logError);
        noteSystemPromptSectionInvalidation(Nn ? "sdk_system_prompt" : "host_append_section");
      }
      if (io !== undefined) e.onLiveAppendSectionChange?.(io);
      if (Zn) {
        Zn = false;
        logFeatureOk("prompt_snapshot_host_supersede", {
          prompt_rerendered: Nn,
        });
      }
      if (Nn) e.onHostPromptSupersedesRecord?.();
    } catch (error) {
      logError(error);
      if (Zn) logFeatureBad("prompt_snapshot_host_supersede", "threw");
    }
  }
  let Dr = false;
  let $r = false;
  let $n;
  let ut;
  let Yt;
  let nn;
  function kn(rows) {
    if (nn !== undefined) {
      nn.push({
        rows,
        isAnswered: true,
      });
      return;
    }
    h.keep(rows);
    Yt?.appendHostRows(rows);
  }
  function En(It) {
    let Ie = appendRowsWithHooks(h, It, {
      keep: kn,
    });
    if (Ie instanceof Promise) Ie.catch(logError);
  }
  function Mr() {
    let It = nn;
    nn = undefined;
    for (let { rows, isAnswered } of It ?? [])
      if (isAnswered) kn(rows);
      else En(rows);
  }
  let Pn;
  function oo(It) {
    let Ie = Pn;
    if (Ie === undefined || Ie.length === 0) return;
    try {
      if (It) {
        let last = initialMessages.findLast(
          (initialMessage) => initialMessage.type === "assistant" || initialMessage.type === "user",
        );
        if (!(
          last?.type === "assistant" &&
          !last.isApiErrorMessage &&
          last.message.content.every((Nn) => Nn.type !== "tool_use") &&
          last.message.content.some(
            (Nn) => Nn.type === "text" && Nn.text.trim() !== "" && Nn.text.trim() !== NO_CONTENT_MESSAGE,
          )
        ))
          return;
      }
      Pn = [];
      En(Ie);
    } catch (error) {
      logError(error);
    }
  }
  async function* No(It, Ie) {
    if (Dr) throw Error("headless session: a turn is already in flight");
    Dr = true;
    if (abortController.signal.aborted) {
      abortController = createAbortController();
      ce();
    }
    let on = abortController;
    let Zn = $n;
    let signal = Ie?.abortController?.signal;
    function Cr() {
      on.abort(signal?.reason);
    }
    if (signal?.aborted) Cr();
    else
      signal?.addEventListener("abort", Cr, {
        once: true,
      });
    try {
      try {
        setAutoModeUnavailableStopNotice(undefined);
      } catch (error) {
        logError(error);
      }
      We = [];
      if (!pn) Xe.length = 0;
      if (Ie?.withdrawnFileUuids?.length) reconcileSavedFilesForTurn(initialMessages, Ie.withdrawnFileUuids);
      yield* _i(It, Ie, on);
      for (let mr of We)
        if (mr.type === "system" && mr.subtype === "informational") yield informationalSystemMessage(mr);
    } finally {
      signal?.removeEventListener("abort", Cr);
      Mr();
      Yt = undefined;
      oo(false);
      Pn = undefined;
      Dr = false;
      endProfile();
      if ($n === Zn) $n = Date.now();
    }
  }
  let Fr = [];
  function Xo(names, Ie = []) {
    let { setToolPermissionContext } = createPermissionContextSetters(setAppState);
    let Zn;
    let Nn;
    let turnDisallowed;
    getStickyBetas().turnDeniedTools = undefined;
    try {
      Zn = asDeclaredToolSet(getStickyBetas());
      Nn = names.length === 0 || Zn !== undefined ? undefined : latestPromptSnapshot(initialMessages);
      turnDisallowed = getAppState().toolPermissionContext.alwaysDenyRules.command ?? [];
      if (names.length > 0 && Zn === undefined) {
        applyTurnDisallowedTools(setToolPermissionContext, []);
        if (Nn === undefined)
          turnDisallowed = getAppState().toolPermissionContext.alwaysDenyRules.command ?? [];
      }
      if (Nn !== undefined) {
        fi(Nn);
        Zn = asDeclaredToolSet(getStickyBetas());
      }
      let mr;
      let io = {
        held: Zn,
        messages: initialMessages,
        isNewConversation: Zn === undefined && Nn === undefined && !getStickyBetas().declaredToolsDecided,
        model: () =>
          resolveTurnModelAndThinking({
            userSpecifiedModel,
            permissionMode: getAppState().toolPermissionContext.mode,
            thinkingConfig: resolveLazy(e.thinkingConfig),
          }).mainLoopModel,
      };
      let Hr = filterTurnDisallowedTools(
        names,
        turnDisallowed,
        () => (mr ??= e.refreshTools?.() ?? resolveLazy(e.tools)),
        (es) => Zn?.has(es) ?? Nn?.toolDescriptions.has(es) ?? false,
        (es, Ys) => resolveToolSearchForTurn(es, Ys, io),
      );
      if (Zn === undefined && Hr.length > 0) {
        mr ??= e.refreshTools?.() ?? resolveLazy(e.tools);
        getStickyBetas().turnDeniedTools = declaredToolSetFor(
          mr,
          (es) =>
            isToolDisallowedThisTurn(
              {
                turnDisallowedTools: Hr,
              },
              es,
            ),
          io,
        );
      }
      applyTurnDisallowedTools(setToolPermissionContext, uniq([...Ie, ...Hr]));
    } catch (error) {
      logError(error);
      try {
        let io = turnDisallowed ?? getAppState().toolPermissionContext.alwaysDenyRules.command ?? [];
        applyTurnDisallowedTools(
          setToolPermissionContext,
          uniq([
            ...Ie,
            ...names.filter(
              (Hr) => io.includes(Hr) || (Zn?.has(Hr) ?? Nn?.toolDescriptions.has(Hr) ?? false),
            ),
          ]),
        );
        logFeatureSad("headless_turn_deny", "judging_threw");
      } catch (error) {
        logError(error);
      }
    }
  }
  function fi(It) {
    try {
      let stickyBetas = getStickyBetas();
      if (
        stickyBetas.declaredToolsDecided ||
        e.refreshTools === undefined ||
        !shouldSnapshotSystemPrompt({
          systemPromptSnapshot: resolveLazy(e.systemPromptSnapshot),
        })
      )
        return;
      let declaredToolSet = resolveDeclaredToolSet(
        stickyBetas,
        () => ({
          names: It.toolDescriptions.keys(),
          servers: It.toolServers,
          entries: It.toolEntries,
        }),
        e.refreshTools(),
        {
          latch: false,
          permissionContext: getAppState().toolPermissionContext,
        },
      );
      if (
        declaredToolSet !== undefined &&
        [...It.toolDescriptions.keys()].every((key) => declaredToolSet.has(key))
      )
        stickyBetas.declaredTools ??= declaredToolSet;
    } catch (error) {
      logError(error);
    }
  }
  async function* _i(It, Ie, on) {
    let Zn = isTypedPersonPrompt(e.session.host, It, Ie, on.signal);
    if (Zn !== undefined) await Zn;
    let turnStartClock = Ie?.turnStartClock;
    useMessageActions(turnStartClock, "tool_reread");
    try {
      markOwnClientPrompt(L, Ie?.clientPlatform);
      noteTurnClientPlatform(e.session, Ie?.clientPlatform);
    } catch (error) {
      logError(error);
    }
    Fr = Ie?.clientDisallowedTools ?? Fr;
    if (Ie?.shouldQuery !== false && Ie?.skipSkillPermissionReset !== true)
      Xo(Ie?.keepsDisallowedTools === true ? Fr : (Ie?.disallowedTools ?? []));
    let Cr = EMPTY_USAGE;
    let tools = e.refreshTools?.() ?? resolveLazy(e.tools);
    let commands = resolveLazy(e.commands);
    let Hr = e.refreshMcpClients?.() ?? resolveLazy(e.mcpClients);
    let agents = resolveLazy(e.agents);
    let allowedAgentTypes = resolveLazy(e.allowedAgentTypes);
    let primitiveToolGrant = resolveLazy(e.primitiveToolGrant);
    let ga = resolveLazy(e.jsonSchema);
    let Ni = resolveLazy(e.customSystemPrompt);
    let Rd = resolveLazy(e.appendSystemPrompt);
    let planModeInstructions = resolveLazy(e.planModeInstructions);
    let systemPromptSnapshot = resolveLazy(e.systemPromptSnapshot);
    ze(Ni, Rd, systemPromptSnapshot);
    let appendSubagentSystemPrompt = resolveLazy(e.appendSubagentSystemPrompt);
    let toolAliases = resolveLazy(e.toolAliases);
    let excludeDynamicSections = resolveLazy(e.excludeDynamicSections);
    let forwardSubagentText = resolveLazy(e.forwardSubagentText) ?? false;
    let { storageV5 } = e;
    let _a;
    useMessageActions(turnStartClock, "cwd");
    if (e.cwd !== null) {
      let Ve = resolveLazy(e.cwd);
      if (isStorageV5Enabled() && storageV5 !== undefined) _a = await setCwdV5OrPin(Ve, e.session, storageV5);
      else _a = setCwdOrPin(Ve, e.session);
    }
    if (_a !== undefined) yield _a;
    rearmCreditsExhaustedNotice();
    let to = !isSessionPersistenceDisabled();
    let startTime = performance.now();
    let now = Date.now();
    beginProfile();
    let turnSignals = readTurnSignals(turnStartClock, Ie?.frameTiming, startTime, now);
    useMessageActions(turnStartClock, "earlier_turn", startTime);
    if (Ie?.shouldQuery !== false) {
      startFirstRequestGate(e.session, tools);
      try {
        kickTurnEndCheckMemCtx(e.session, {
          credentials: e.credentials,
          storageV5,
        });
      } catch (error) {
        logForDebugging(
          `memory snapshot kick failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    let uuid = Ie?.uuid && (Ie.uuidIsClientEventUuid || !Ie.isMeta) ? Ie.uuid : undefined;
    let runningTurnRecord = buildRunningTurnRecord(
      uuid,
      Ie?.resumeReason === undefined
        ? Ie?.userMessageUuids
        : answeredMergedUuids(initialMessages, Ie.userMessageUuids, Ie.alsoLeftToThisReRun),
      {
        primaryIsMeta: Ie?.isMeta === true,
        resultsAlsoList: Ie?.handedOffTurnUserMessageUuids,
        standIn: Ie?.userMessageUuids?.at(-1),
        wasPutBack: (Ve) => wasPutBackSafe(e.messageQueue, Ve),
      },
    );
    let ts =
      Ie?.resumeReason !== undefined
        ? {
            resume_reason: Ie.resumeReason,
          }
        : undefined;
    let Ka = {};
    let { permissionDenials, recordDenial, canUseTool } = createPermissionDenialTracker(e.canUseTool);
    let appState = getAppState();
    let { mainLoopModel, runtimeModel, thinkingConfig } = resolveTurnModelAndThinking({
      userSpecifiedModel,
      permissionMode: appState.toolPermissionContext.mode,
      thinkingConfig: resolveLazy(e.thinkingConfig),
    });
    startProfilePhase("model_config_wait");
    let modelFacts =
      Ie?.shouldQuery === false
        ? undefined
        : await awaitMcpSettle(runtimeModel, {
            storageV5: e.storageV5,
            credentials: e.credentials,
            abortController: on,
          });
    endProfilePhase("model_config_wait");
    if (e.storageV5 !== undefined) loadAllPluginsCacheOnly(e.storageV5, e.credentials).catch(() => {});
    let Jr = {
      session: e.session,
      tools,
      runtimeModel,
      customSystemPrompt: Ni,
      appendSystemPrompt: Rd,
      appendSystemPromptHead: e.appendSystemPromptHead,
      excludeDynamicSections,
      cacheBreakerPhrase: appState.cacheBreakerPhrase,
      mcpClients: Hr,
      storageV5: e.storageV5,
      credentials: e.credentials,
    };
    applyPendingInvalidations();
    let promptRenderEpoch = getSystemPromptSectionEpoch();
    startProfilePhase("system_prompt");
    let { systemPrompt, userContext, systemContext } = await buildHeadlessSystemPrompt(Jr);
    endProfilePhase("system_prompt");
    let ka = any ? undefined : getUserContextMemoryFiles(e.session);
    let Oo = {
      session: e.session,
      messageQueue: e.messageQueue,
      commands,
      tools,
      refreshTools: e.refreshTools,
      toolCatalog: e.toolCatalog,
      refreshMcpClients: e.refreshMcpClients,
      verbose: e.verbose ?? false,
      fallbackModel: e.fallbackModel,
      thinkingConfig,
      mcpClients: Hr,
      customSystemPrompt: Ni,
      appendSystemPrompt: Rd,
      planModeInstructions,
      systemPromptSnapshot,
      appendSubagentSystemPrompt,
      toolAliases,
      excludeDynamicSections,
      agents,
      allowedAgentTypes,
      primitiveToolGrant,
      maxBudgetUsd: e.maxBudgetUsd,
      messageClientPlatform: Ie?.clientPlatform,
      messageInboundOrigin: Ie?.inboundOrigin,
      forwardSubagentText,
      requiresStructuredOutput: ga !== undefined && tools.some((Ve) => toolMatchesName(Ve, STRUCTUREDOUTPUT)),
      renderedSystemPrompt: systemPrompt,
      onPermissionDenial: recordDenial,
      requestDialog: e.requestDialog,
      sessionState: e.sessionState,
      getAppState,
      setAppState,
      setSDKStatus: e.setSDKStatus,
      readFileState: readFileCache,
      pendingNestedMemoryTriggers: e.pendingNestedMemoryTriggers,
      sessionEnvVars,
      memorySelector,
      isolationLatch,
      toolState: L,
      sessionHooks: q,
      storageV5: e.storageV5,
      credentials: e.credentials,
    };
    let headlessToolUseContext = createHeadlessToolUseContext(Oo, {
      phase: "input",
      messages: initialMessages,
      mainLoopModel,
      appState,
      abortController: on,
      setMessages: (Ve) => {
        let ho = Ve(initialMessages);
        if (ho !== initialMessages) {
          if (ho.length === 0) {
            h.cut();
            ut = undefined;
          }
          initialMessages.length = 0;
          initialMessages.push(...ho);
        }
      },
      applyMessageOp: (Ve) => {
        let ho = (rd) => {
          let Ti = applyMessageListEdit(initialMessages, rd);
          if (Ti !== initialMessages) {
            initialMessages.length = 0;
            initialMessages.push(...Ti);
          }
        };
        let $o = applyMessageListAppend(Ve, ho);
        let Is =
          $o === undefined
            ? h.behindAppends(() => ho(Ve))
            : appendRowsWithHooks(h, $o.rows, {
                keep: $o.keep,
              });
        if (Is instanceof Promise) Is.catch(logError);
      },
      persistSession: to,
    });
    let Id = Ie?.orphanedPermission?.initFirst === true || Ie?.handedOffTurn !== undefined;
    if (Id) {
      startProfilePhase("init_message");
      let Ve = await Qa(Oo, mainLoopModel, appState.fastMode);
      endProfilePhase("init_message");
      startProfilePhase("init_frame_send");
      $r = true;
      yield initWithUserMessageUuids(Ve, runningTurnRecord);
      endProfilePhase("init_frame_send");
    }
    let Ps = !(Array.isArray(It) && It.length === 0);
    let zi = false;
    let permissionLayers = headlessToolUseContext.permissionLayers;
    if (!$r)
      try {
        e.onTurnBeganBeforeInit?.();
      } catch (error) {
        logError(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `onTurnBeganBeforeInit threw; the turn goes on: ${errorMessage(error)}`,
            "onTurnBeganBeforeInit threw",
          ),
        );
      }
    startProfilePhase("resume_other");
    let Hs = Ie?.inPlaceOfFirstRequest !== undefined;
    let Si = Hs ? undefined : Ie;
    let Ms = yield* runHeadlessTurn({
      orphanedPermission: Si?.orphanedPermission,
      handedOffTurn: Si?.handedOffTurn,
      beginTranscriptFlush: e.beginTranscriptFlush,
      awaitStagedFiles: e.awaitStagedFiles,
      placeFilesByName: e.placeFilesByName,
      placeCarriedWrites: e.placeCarriedWrites,
      handoffRelay: e.handoffRelay,
      deferredToolUse: Si?.deferredToolUse,
      hasPrompt: Ps,
      tools,
      mutableMessages: initialMessages,
      processUserInputContext: headlessToolUseContext,
      canUseTool,
      answers: e.answers,
      persistSession: to,
      earlyResult: {
        startedAt: startTime,
        usage: Cr,
        permissionDenials,
        mainLoopModel,
        fastMode: appState.fastMode,
        origin: Ie?.origin,
        sendEcho: runningTurnRecord.fields(),
        resumeReasonStamp: ts,
      },
      onHandedOffCallsRan: (Ve) => {
        zi = true;
        permissionLayers = Ve;
      },
      onOrphanedAnswerSettled: e.onOrphanedAnswerSettled,
    });
    endProfilePhase("resume_other");
    if (Ms) return;
    let Od = profileCheckpoint("before_processUserInput", {
      once: true,
    });
    let Dd =
      Ie?.hearthRelayMessageIds !== undefined ||
      Ie?.hearthRelayRows !== undefined ||
      Ie?.hearthRelayThreadTs !== undefined;
    let turnId = ensureTurnId(Ie?.uuid, Ie?.verifiedSlackHumanTurn || Dd);
    using promptEntryTracker = createPromptEntryTracker();
    startProfilePhase("process_user_input");
    let {
      messages,
      shouldQuery,
      allowedTools,
      model,
      effort,
      resultText,
      localCommand,
      commandExitCode,
      interrupted,
    } = await processUserInput({
      input: It,
      mode: Ie?.inputMode ?? "prompt",
      clientBashCommand: Ie?.inputMode === "bash",
      clientBashCommandCwd: Ie?.inputMode === "bash" ? Ie.clientBashCommandCwd : undefined,
      interactionPrompt: currentPromptHandle(),
      context: {
        ...headlessToolUseContext,
        messages: initialMessages,
        askPerson: (Ve) =>
          confirmWithUser({
            ...Ve,
            canUseTool,
            toolUseContext: headlessToolUseContext,
          }),
      },
      messages: initialMessages,
      uuid: turnId,
      isMeta: Ie?.isMeta,
      shouldQuery: Ie?.shouldQuery,
      queryHeldForNextTurn: Ie?.queryHeldForNextTurn,
      querySource: "sdk",
      origin: Ie?.origin,
      skipSlashCommands: Hs || Ie?.skipSlashCommands,
      skipAttachments: Hs
        ? "all"
        : Ie?.skipAttachments
          ? Ie.shouldQuery === false
            ? "all"
            : "mentions"
          : undefined,
      skipSubmissionHooks: Hs || Ie?.skipSubmissionHooks,
      aheadOfSessionStart: Ie?.orphanedPermission !== undefined,
      bridgeOrigin: Si?.bridgeOrigin,
      localStdinOrigin: Ie?.localStdinOrigin,
      sessionChannelPersonTyped: Ie?.sessionChannelPersonTyped,
      ownWordUuids: Ie?.ownWordUuids,
      hostInitiator: Ie?.hostInitiator,
      inboundOrigin: Ie?.inboundOrigin,
      toolsUsed: Ie?.toolsUsed,
      modelScheduledOrigin: Si?.modelScheduledOrigin,
      wakeupSource: Ie?.wakeupSource,
      artifactCommentTurn: Ie?.artifactCommentTurn,
      pollEventDelivery: Ie?.pollEventDelivery,
      pollEventProvenance: Ie?.pollEventProvenance,
      pollEventDeclared: Ie?.pollEventDeclared,
      skipSkillPermissionReset: Ie?.skipSkillPermissionReset === true || zi,
      verifiedSlackHumanTurn: Ie?.verifiedSlackHumanTurn,
      textNotTyped: Ie?.textNotTyped,
      ownFilePaths: Ie?.ownFilePaths,
      noPersonArrived: Ie?.noPersonArrived,
      inlinedImagePaths: Ie?.inlinedImagePaths,
      stampThreadState: Ie?.stampThreadState,
      entries: promptEntryTracker,
    });
    endProfilePhase("process_user_input");
    startProfilePhase("conversation_append");
    if (Od) profileCheckpoint("after_processUserInput");
    let opt =
      (Ie?.orphanedPermission !== undefined || Ie?.handedOffTurn !== undefined) && !Ps
        ? messages.filter((message) => !isEmptyUserMessage(message))
        : Hs
          ? messages.filter(
              (message) =>
                Ie?.refusedPromptIsStoredAlready === true &&
                message.type === "user" &&
                message.isMeta !== true,
            )
          : messages;
    let Do = Ie?.inPlaceOfFirstRequest !== "nothing" && (Hs || (shouldQuery && Ie?.shouldQuery !== false));
    if (Ie?.origin?.kind !== "plugin") setLocalCommandExitCode(Do ? undefined : commandExitCode);
    if (Ie?.origin) stampMissingOrigin(opt, Ie.origin);
    if (Ie?.skipAttachments === true) markSkipAttachments(opt);
    if (Ie?.textNotTyped === true) markTextNotTyped(opt);
    if (Ie?.shouldQuery === false && Ie.queryHeldForNextTurn !== true) markTranscriptOnly(opt);
    if (interrupted)
      markDroppedPrompts(opt, turnId, Ie?.resumeReason === undefined ? Ie?.userMessageUuids : undefined);
    if (Ie?.taskDelivery) attachTaskDelivery(opt, Ie.taskDelivery, turnId);
    stampMergedSends(opt, turnId, Ie?.mergedSendUuids, Ie?.clientPlatform, getContextKey());
    withdrawBridgeAttachments(opt, turnId, It, Ie?.imageFileUuids, Ie?.savedFiles);
    if (Ie?.verifiedSlackHumanTurn && turnId)
      markVerifiedHumanTurn(opt, turnId, {
        projectsUserTurn: Ie.projectsUserTurn === true,
        emailSenderTurn: Ie.emailSenderTurn,
      });
    if (Dd && turnId)
      setHearthRelayMetadata(opt, turnId, {
        messageIds: Ie?.hearthRelayMessageIds,
        rows: Ie?.hearthRelayRows,
        threadTs: Ie?.hearthRelayThreadTs,
      });
    if (y)
      y =
        !checkSessionStartPlacement({
          conversation: initialMessages,
          turnMessages: opt,
          model: runtimeModel,
          startsModelTurn: Do,
        }) && !Do;
    if (Do)
      try {
        e.beforeTurnInput?.();
      } catch (error) {
        logError(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `beforeTurnInput threw; the turn goes on without the host's rows: ${errorMessage(error)}`,
            "beforeTurnInput threw",
          ),
        );
      }
    let found = opt.find(isCompactBoundaryMessage);
    if (found !== undefined) await mirrorTaskListSnapshot(found, e.session, e.storageV5);
    if (appendHookableFastPath()) await h.settled();
    let ni = {
      before: initialMessages.at(-1)?.uuid,
      next: undefined,
    };
    let lt = await appendRowsWithHooks(h, opt);
    if (lt !== opt) opt.splice(0, opt.length, ...lt);
    let errorRowBehindRefusedPrompt = Hs ? Ie?.errorRowBehindRefusedPrompt : undefined;
    if (
      errorRowBehindRefusedPrompt !== undefined &&
      initialMessages.findLastIndex(
        (initialMessage) => initialMessage.uuid === errorRowBehindRefusedPrompt.uuid,
      ) === -1
    )
      h.keep([errorRowBehindRefusedPrompt]);
    if (errorRowBehindRefusedPrompt !== undefined) ut = Ie?.uuid;
    promptEntryTracker.handedOff();
    let ar = [...initialMessages];
    if (isFoamySpringEnabled()) Pn = [];
    let pr = persistTurnRows({
      conversation: initialMessages,
      messages: ar,
      persistSession: to,
      storageV5: e.storageV5,
      holdsLoadersRows: e.loadShowsCutOffCalls === true,
      foldCopies: e.messageQueue,
      neverParentUuid: ut,
    });
    Yt = to ? pr : undefined;
    if (Do && !Hs && !interrupted && Ie?.origin?.kind === "human" && isSunnyGardenSenderAddress())
      await prefetchSenderAddressFor(promptIdForRequest(ar, mainAgentContext()));
    let qo = Boolean(env.CLAUDE_CODE_EAGER_FLUSH) || Boolean(env.CLAUDE_CODE_IS_COWORK);
    if (to && opt.length > 0) {
      let Ve = pr.record();
      if (isBareMode());
      else {
        endProfilePhase("conversation_append");
        startProfilePhase("transcript_persist");
        await Ve;
        if (qo) await flushSessionStorage();
        endProfilePhase("transcript_persist");
        startProfilePhase("conversation_append");
      }
    }
    let oi =
      Ie?.inputMode === "bash"
        ? userRowsWithoutInput(opt)
        : e.replayUserMessages
          ? userRowsToReplay(opt, Ie)
          : [];
    let includePartialMessages = e.includePartialMessages ?? false;
    let Ct = includePartialMessages && (e.replayAcksAtRequestDispatch ?? false);
    endProfilePhase("conversation_append");
    startProfilePhase("tool_pool_refresh");
    applyPollEventToolPermissions(createPermissionContextSetters(setAppState), allowedTools, Ie);
    let cs = model != null && (isExemptDefaultResolvingPick(model) || isModelAllowed(model));
    if (model && !cs)
      logForDebugging(
        `Skill/command model "${model}" is not in the availableModels allowlist; keeping the session model`,
        {
          level: "warn",
        },
      );
    let model_2 =
      cs &&
      isSkillModelOverrideAllowedInMode({
        skillModel: model,
        mode: getAppState().toolPermissionContext.mode,
        fastMode: getAppState().fastMode ?? false,
      })
        ? model
        : mainLoopModel;
    Ae = {
      model: model_2,
      enabled: appState.fastMode,
    };
    let Zi = tools;
    let mcpClients = Hr;
    let si;
    try {
      let Ve = e.refreshTools?.() ?? tools;
      if (e.refreshTools !== undefined) si = Ve === tools;
      Zi = Ve.length === tools.length && Ve.every((ho, $o) => ho.name === tools[$o]?.name) ? tools : Ve;
      mcpClients = e.refreshMcpClients?.() ?? Hr;
    } catch (error) {
      logError(error);
    }
    endProfilePhase("tool_pool_refresh");
    if (Zi !== tools)
      try {
        let systemPromptSectionEpoch = getSystemPromptSectionEpoch();
        startProfilePhase("system_prompt_rebuild");
        try {
          ({ systemPrompt, userContext, systemContext } = await buildHeadlessSystemPrompt({
            ...Jr,
            tools: Zi,
          }));
        } finally {
          endProfilePhase("system_prompt_rebuild");
        }
        promptRenderEpoch = systemPromptSectionEpoch;
      } catch (error) {
        if (!isAbortError(error)) logError(error);
      }
    let xd = {
      ...Oo,
      tools: Zi,
      mcpClients,
      renderedSystemPrompt: systemPrompt,
    };
    let headlessToolUseContext_2 = createHeadlessToolUseContext(xd, {
      phase: "query",
      messages: ar,
      mainLoopModel: model_2,
      appState: getAppState(),
      abortController: on,
      permissionLayers:
        effort !== undefined
          ? [
              ...(permissionLayers ?? []),
              {
                kind: "effort",
                effort,
              },
            ]
          : permissionLayers,
      activeSkill: headlessToolUseContext.options.activeSkill,
    });
    if (!Id) {
      startProfilePhase("init_message");
      let Ve = await Qa(xd, model_2, appState.fastMode);
      endProfilePhase("init_message");
      startProfilePhase("init_frame_send");
      $r = true;
      let startToInitMs = elapsedMs(startTime, performance.now());
      yield initWithUserMessageUuids(Ve, runningTurnRecord);
      if (Do)
        sampleQueueLatency({
          enqueuedWallMs: Ie?.frameTiming?.enqueuedWallMs,
          previousTurnEndedWallMs: $n,
          startWallMs: now,
          startToInitMs,
        });
    } else startProfilePhase("init_frame_send");
    logShouldQueryResolved({
      shouldQuery: Do,
      fromUserInput: shouldQuery,
      fromOptions: Ie?.shouldQuery,
    });
    yield* preservedAttachmentRows(opt, getSessionId());
    if (!any) {
      any = true;
      let Ve = await checkContextInstructionsSize(ka, getSessionId(), model_2);
      if (Ve !== null) yield Ve;
    }
    if (!G) {
      G = true;
      let Ve = gatewayCodeTabRulesNotice(e.session);
      if (Ve !== null) yield Ve;
    }
    if (!Do) {
      endProfilePhase("init_frame_send");
      if (Ie?.inputMode !== "bash") yield* replayMessagesToSdk(opt);
      if (to) {
        await pr.record(e.loadShowsCutOffCalls === true && Ie?.resumeReason !== undefined && !interrupted);
        if (qo) await flushSessionStorage();
      }
      yield* Ie?.inputMode === "bash" ? replayUserRows(oi, Ie) : userRowsForSdk(oi, Ie);
      if (interrupted)
        try {
          Ie?.onPromptCheckInterrupted?.();
        } catch (error) {
          if (isAbortError(error)) logForDebugging(`onPromptCheckInterrupted aborted: ${error}`);
          else logError(error);
        }
      yield buildResultMessage({
        startedAt: startTime,
        common: {
          is_error: interrupted === true,
          duration_api_ms: 0,
          num_turns: 0,
          stop_reason: null,
          session_id: getSessionId(),
          total_cost_usd: getTotalCostUSD(),
          usage: Cr,
          modelUsage: getModelUsage(),
          permission_denials: permissionDenials,
          terminal_reason: interrupted ? "aborted_streaming" : undefined,
          fast_mode_state: getFastModeState(model_2, getAppState().fastMode),
          fast_mode_disabled_reason:
            getFastModeUnavailableReasonCode() ??
            getFastRejectedReason(model_2, getAppState().fastMode) ??
            undefined,
          origin: Ie?.origin,
          subagent_stats: buildFileHistorySnapshotChain(e.session),
          safety_stops: getSafetyStops(),
        },
        variant: interrupted
          ? {
              subtype: "error_during_execution",
              errors: ["prompt_check: the turn was stopped before its prompt was checked"],
              ...runningTurnRecord.errorVariantFields(),
              ...ts,
            }
          : {
              subtype: "success",
              result: resultText ?? "",
              ...runningTurnRecord.fields(),
              ...ts,
              ...(localCommand !== undefined && {
                local_command: normalizeCustomSubtype(localCommand),
              }),
            },
      });
      if (pn) await jn(pr, ar, to, qo);
      return;
    }
    yield* systemMessagesToSdk(opt);
    if (fileHistoryEnabled() && to)
      opt
        .filter((Ve) => isOwnPromptRow(Ve, Ie))
        .forEach((Ve) => {
          fileHistoryMakeSnapshot(
            headlessToolUseContext_2.getFileHistoryState,
            headlessToolUseContext_2.applyFileHistoryOp,
            Ve.uuid,
          );
        });
    let turnTiming = startTurnTiming({
      toolUseContext: headlessToolUseContext_2,
      sessionState: e.sessionState,
    });
    let Ja = false;
    let El = false;
    let hr = 0;
    let emitPlainDelta = includePartialMessages ? Ie?.emitPlainDelta : undefined;
    let takePlainDelta =
      emitPlainDelta === undefined
        ? undefined
        : (Ve) => {
            if (
              emitPlainDelta === undefined ||
              !Ja ||
              (!El && Ve.event.type === "content_block_delta" && Ve.event.delta.type === "text_delta")
            )
              return false;
            try {
              let ho = emitPlainDelta(
                toStreamEventMessage(Ve, {
                  uuid: randomUUID(),
                  session_id: getSessionId(),
                }),
              );
              if (ho) hr++;
              return ho;
            } catch (error) {
              emitPlainDelta = undefined;
              logPlainDeltaFailure("host_threw", error);
              return false;
            }
          };
    Se = {
      messages: ar,
      systemPrompt,
      promptRenderEpoch,
      modelFacts,
      userContext,
      systemContext,
      canUseTool: e.canUseTool,
      toolUseContext: headlessToolUseContext_2,
      fallbackModel: e.fallbackModel,
      querySource: "sdk",
      maxTurns: e.maxTurns,
      taskBudget: e.taskBudget,
      takePlainDelta,
      stopHookActive: Ie?.stopHookActive,
      joinedDisallowedTools: (Ve) => {
        let ho = Ve.length > 0 ? [] : (e.refreshMcpClients?.() ?? resolveLazy(e.mcpClients));
        Xo(
          Ve,
          filterMcpToolsBySelectedServers(
            getAppState().toolPermissionContext.turnDisallowedTools ?? [],
            Ve,
            ho,
          ),
        );
        Fr = uniq([...filterMcpToolsBySelectedServers(Fr, Ve, ho), ...Ve]);
      },
      inPlaceOfFirstRequest: Ie?.inPlaceOfFirstRequest === "nothing" ? undefined : Ie?.inPlaceOfFirstRequest,
    };
    Me();
    let last = getInMemoryErrors().at(-1);
    for (let Ve of wt) Ve.next = ni;
    wt.clear();
    wt.add(ni);
    let ba = _n(
      "turn.start",
      () =>
        buildTurnStartEvent({
          turnEvents: turnStreamBridge,
          newMessages: opt,
          input: typeof It === "string" ? It : undefined,
          signal: on.signal,
          abort: () => on.abort(userAbortReason("turn-abort")),
        }),
      undefined,
    );
    endProfilePhase("init_frame_send");
    startProfilePhase("engine_pickup");
    Ee.enqueue({
      type: "user",
      message: {
        role: "user",
        content: It,
      },
      parent_tool_use_id: null,
      origin: Ie?.origin,
    });
    let turnId_2 = randomUUID();
    let Gs = new Map();
    let ig = () => e.refreshTools?.() ?? Zi;
    let replayOwnTaskNotifications = false;
    try {
      replayOwnTaskNotifications = resolveLazy(e.replayOwnTaskNotifications) ?? false;
    } catch (error) {
      logError(error);
    }
    let Im = {
      replayUserMessages: e.replayUserMessages ?? false,
      replayOwnTaskNotifications,
      includePartialMessages,
      ...false,
    };
    let retractionFilter = createRetractionFilter();
    let Ao = (Ve) => collapseRefusalFallbackNotices(retractionFilter.settle(Ve), getSessionId());
    let partialStreamRetraction = createPartialStreamRetraction(includePartialMessages);
    let Il = ga ? countNamedToolUses(initialMessages, STRUCTUREDOUTPUT) : 0;
    let last_2 = initialMessages.at(-1);
    let vi = [];
    let Za = 0;
    let Bd = new Set();
    let Es = EMPTY_USAGE;
    let uc;
    let ed;
    let Nd = null;
    let Wd = 0;
    let qd = 0;
    let td = 0;
    let nd;
    let Ta;
    let jd = 0;
    let uu = 0;
    let mu = 0;
    let mc = 1;
    let fu = oi.length === 0;
    function* pu() {
      if (!fu) {
        fu = true;
        yield* replayUserRows(oi, Ie);
      }
    }
    let _u = false;
    let Cn = false;
    let runningTurnTracker = createRunningTurnTracker(
      () => runningTurnRecord.fields()?.user_message_uuids ?? [],
    );
    if (Ie?.inputMode === "bash") yield* pu();
    try {
      while (true) {
        let { value: msg, done: ho } = await queryEngine.next();
        Ja = false;
        if (ho) throw Error("headless session: the engine loop ended before the turn result");
        let $o = msg;
        let Is = true;
        let rd =
          (msg.type === "assistant" && !("parent_tool_use_id" in msg)) ||
          msg.type === "user" ||
          (msg.type === "system" && msg.subtype === "compact_boundary");
        let Ti = [];
        let Su = false;
        switch (msg.type) {
          case "assistant": {
            if ("parent_tool_use_id" in msg) break;
            let Mt = withoutSessionId(msg);
            settleTakenSafe(e.messageQueue);
            let shownAsStoredIn = takeShownAsStoredMark(Mt, to ? e.markOfRepliesShownAsStored : undefined);
            runningTurnTracker.onAssistantRow(Mt);
            turnTiming.onAssistantMessage(Mt);
            if (!Wd) Wd = performance.now();
            if (Mt.message.stop_reason != null) Nd = Mt.message.stop_reason;
            if (Mt.isApiErrorMessage) Ti.push(...Ao("stream_error"));
            let rr = assistantUsageDelta(Mt, uc, ed);
            if (rr) {
              ed = Mt.message.id;
              Cr = addUsage_2(Cr, rr);
            }
            Su = Mt.message.stop_reason != null && Mt.message.stop_reason !== "refusal";
            ar.push(Mt);
            if (to && shownAsStoredIn === undefined) pr.record();
            h.keep([Mt]);
            if (shownAsStoredIn === undefined) {
              yield* pu();
              S.absorb([Mt]);
            }
            let Uo;
            try {
              let Bo = await runMessageDisplayHook(
                e.session,
                Mt,
                turnId_2,
                q,
                on.signal,
                e.storageV5,
                e.credentials,
              );
              Uo = Bo.message;
              if (shownAsStoredIn !== undefined) markShownAsStored(Mt, shownAsStoredIn, Bo.hookOutputApplied);
            } finally {
              if (shownAsStoredIn !== undefined) pr.record();
            }
            if (shownAsStoredIn !== undefined) {
              yield* pu();
              S.absorb([Mt]);
            }
            if (Uo !== Mt) Gs.set(Mt, Uo);
            $o = {
              ...Uo,
              session_id: msg.session_id,
              uuid: msg.uuid,
            };
            break;
          }
          case "user": {
            let Mt = withoutSessionId(msg);
            if (isInterruptionOnlyMessage(Mt)) Ti.push(...Ao("interrupted"));
            nn = [];
            try {
              ar.push(Mt);
              if (to) await pr.record();
              h.keep([Mt]);
              S.absorb([Mt]);
              pr.settlePreservedTail(Mt.uuid);
            } finally {
              Mr();
            }
            mc++;
            break;
          }
          case "progress":
          case "attachment": {
            let Mt = markMaxTurnsExit(withoutSessionId(msg));
            let Ur = stripAgentToolResultForStorage(Mt);
            h.keep([Ur]);
            S.absorb([Mt]);
            let sourceUuid = getSourceUuid(Mt);
            if (sourceUuid !== undefined) pr.holdFoldCopy(Ur, sourceUuid);
            if (to) {
              ar.push(Ur);
              pr.record();
            }
            if (Mt.type === "attachment") runningTurnRecord.noteAttachment(Mt.attachment);
            if (Mt.type === "attachment" && Mt.attachment.type === "structured_output")
              if (Mt.attachment.toolUseID !== undefined ? Bd.has(Mt.attachment.toolUseID) : Bd.size > 0) {
                pr.evict(Mt.uuid);
                logEvent("tengu_structured_output_late_retraction_drop", {});
              } else
                vi.push({
                  toolUseID: Mt.attachment.toolUseID,
                  attachmentUuid: Mt.uuid,
                });
            break;
          }
          case "tombstone": {
            runningTurnTracker.onRetraction(msg.message.uuid);
            yield* partialStreamRetraction.onTombstone(msg);
            pr.evict(msg.message.uuid);
            retractionFilter.dropHeld(msg.message.uuid);
            let content = msg.message.type === "assistant" ? msg.message.message.content : undefined;
            let Ur = Array.isArray(content)
              ? content.flatMap((rr) =>
                  rr.type === "tool_use" && rr.name === STRUCTUREDOUTPUT ? [rr.id] : [],
                )
              : [];
            if (Ur.length > 0) {
              Za++;
              Ur.forEach((Bo) => Bd.add(Bo));
              let rr = (Bo) => Bo.toolUseID === undefined || Ur.includes(Bo.toolUseID);
              let filtered = vi.filter(rr);
              filtered.forEach((Bo) => pr.evict(Bo.attachmentUuid));
              vi = vi.filter((Bo) => !rr(Bo));
              logEvent("tengu_structured_output_retracted", {
                retracted_results: filtered.length,
                surviving_results: vi.length,
                tombstoned_calls: Za,
              });
            }
            break;
          }
          case "stream_event":
            if (!("parent_tool_use_id" in msg && msg.parent_tool_use_id) && !isPingStreamEvent(msg.event)) {
              settleTakenSafe(e.messageQueue);
              pr.settleFoldCopies();
            }
            turnTiming.onStreamEvent(msg);
            Ti.push(...partialStreamRetraction.onStreamEvent(msg.event, Es));
            if (!td && (msg.event.type === "content_block_start" || msg.event.type === "content_block_delta"))
              td = performance.now();
            if (msg.event.type === "message_start") {
              if (!qd) qd = performance.now();
              Es = mRe(EMPTY_USAGE, msg.event.message.usage);
              if (!jd && "requestSentAtMs" in msg && msg.requestSentAtMs) jd = msg.requestSentAtMs;
              if (!uu && "requestSentWallMs" in msg && msg.requestSentWallMs) {
                uu = msg.requestSentWallMs;
                mu = Es.input_tokens + Es.cache_read_input_tokens + Es.cache_creation_input_tokens;
              }
              uc = msg.event.message.id;
            } else if (msg.event.type === "message_delta") {
              if (msg.event.delta.stop_reason != null) {
                Nd = msg.event.delta.stop_reason;
                if (msg.event.delta.stop_reason !== "refusal") Ti.push(...Ao("served"));
              }
              Es = parseUsageIterations(msg.event.usage)?.servedFallbackModel
                ? $jo(Es, msg.event.usage)
                : mRe(Es, msg.event.usage);
              if (to) pr.record();
            } else if (msg.event.type === "message_stop") Cr = addUsage_2(Cr, Es);
            break;
          case "system":
            if (msg.subtype === "status" && msg.status === "compacting") pr.settleFoldCopies("compaction");
            else if (msg.subtype === "status") pr.settleFoldCopies();
            if (msg.subtype === "status" && msg.status === "requesting") runningTurnTracker.onRoundStart();
            if (msg.subtype === "model_refusal_fallback") {
              Is = false;
              let refusalFallbackMessage = createRefusalFallbackMessage(msg);
              ja(refusalFallbackMessage, ar, to);
              yield* partialStreamRetraction.onRefusalFallbackBanner(refusalFallbackMessage.direction, Es);
              if (isRefusalFallbackEnabled())
                yield* collapseRefusalFallbackNotices(
                  retractionFilter.accept(refusalFallbackMessage),
                  getSessionId(),
                );
            } else {
              Hi(msg, ar, pr, to);
              if (msg.subtype === "model_refusal_no_fallback") yield* Ao("exhausted");
              else if (msg.subtype === "model_fallback") yield* Ao("availability_switch");
              else if (msg.subtype === "informational")
                try {
                  Is = !isTransportBacked(e.session);
                } catch {
                  Is = false;
                }
            }
            if (msg.subtype === "compact_boundary") {
              let Mt = pr.dropPreservedRowsNotInConversation(convertCompactBoundaryMessage(msg));
              let Ur = Ie?.resumeReason !== undefined;
              runningTurnTracker.onBoundary(Mt, {
                openerUuid: Ur && Ie.isMeta ? Ie.resumedTurnOpenerUuid : (Ie?.resumedTurnOpenerUuid ?? uuid),
                conversation: initialMessages,
                continuedTurnsRows: Ur ? initialMessages : undefined,
              });
              nn = [];
              try {
                await mirrorTaskListSnapshot(Mt, e.session, e.storageV5);
                if (to) await pr.flushBeforeCompactBoundary(Mt);
                ar.push(Mt);
                if (to) await pr.record(true);
                h.keep([Mt]);
                pr.applyCompactBoundary(Mt);
              } finally {
                Mr();
              }
            }
            break;
          case "post_turn_summary":
            setAppState((Mt) =>
              Mt.postTurnSummary === msg.value
                ? Mt
                : {
                    ...Mt,
                    postTurnSummary: msg.value,
                  },
            );
            break;
          case "active_goal":
            setAppState((Mt) =>
              Mt.activeGoal === msg.value
                ? Mt
                : {
                    ...Mt,
                    activeGoal: msg.value,
                  },
            );
            break;
          case "command_lifecycle":
            if (msg.state === "started") {
              let Mt = runningTurnRecord.noteCommandStarted(msg.command_uuid);
              try {
                Ie?.onCommandTakenIn?.(msg.command_uuid, Mt);
              } catch (error) {
                logError(error);
              }
              pr.settleFoldCopies();
            }
            break;
          case "result": {
            _u = true;
            Cn = true;
            turnTiming.end(msg.terminal_reason);
            Bi(pr, tools);
            let Mt = Me();
            if (Mt !== undefined) {
              yield* partialStreamRetraction.closeAtTurnEnd(Es);
              throw Mt.error;
            }
            msg.permission_denials.unshift(...permissionDenials);
            yield* partialStreamRetraction.closeAtTurnEnd(Es);
            yield* Ao("turn_end");
            let autoModeUnavailableStopNotice = getAutoModeUnavailableStopNotice();
            if (autoModeUnavailableStopNotice !== undefined) {
              let ea = autoModeUnavailableStopNotice;
              try {
                if (isTransportBacked(e.session))
                  ea = minimalUnavailableNotice(autoModeUnavailableStopNotice);
              } catch {
                ea = minimalUnavailableNotice(autoModeUnavailableStopNotice);
              }
              yield informationalSystemMessage(createSystemMessage(ea, "warning"));
            }
            if (to) {
              await pr.record(true);
              if (qo) await flushSessionStorage();
            }
            let rr = msg.subtype === "success" && !msg.is_error && msg.deferred_tool_use === undefined;
            if (ga !== undefined && rr && vi.length === 0 && Za > 0) {
              logEvent("tengu_structured_output_retraction_exhausted", {
                tombstoned_calls: Za,
                num_turns: msg.num_turns,
              });
              yield buildResultMessage({
                startedAt: startTime,
                common: {
                  is_error: true,
                  duration_api_ms: msg.duration_api_ms,
                  num_turns: msg.num_turns,
                  stop_reason: Nd,
                  session_id: getSessionId(),
                  total_cost_usd: msg.total_cost_usd,
                  usage: Cr,
                  modelUsage: msg.modelUsage,
                  permission_denials: msg.permission_denials,
                  terminal_reason: isAbortedTerminalReason(msg.terminal_reason)
                    ? msg.terminal_reason
                    : "structured_output_retry_exhausted",
                  fast_mode_state: msg.fast_mode_state,
                  fast_mode_disabled_reason: msg.fast_mode_disabled_reason,
                  origin: Ie?.origin,
                  subagent_stats: buildFileHistorySnapshotChain(e.session),
                  safety_stops: getSafetyStops(),
                },
                variant: {
                  subtype: "error_max_structured_output_retries",
                  errors: [STRUCTURED_OUTPUT_RETRACTED_MESSAGE],
                  ...runningTurnRecord.errorVariantFields(),
                  ...ts,
                },
              });
              return;
            }
            if (rr && Wd)
              logEvent("tengu_sdk_ttft", {
                ttft_ms: elapsedMs(startTime, Wd),
                model: telemetrySafeModelName(model_2),
                ...(si !== undefined && {
                  tool_pool_reused: si,
                }),
              });
            let Uo = rr ? consumeApiRequestSentFromSpawn() : undefined;
            let Bo = rr && jd ? elapsedMs(startTime, jd) : undefined;
            let _r = Bo !== undefined ? consumeProfile(Bo, jd) : undefined;
            let Ol =
              msg.subtype === "success" && msg.is_error && msg.deferred_tool_use === undefined
                ? currentTurnIndex()
                : undefined;
            let last_2 = ar.findLast(
              (ea) => (ea.type === "assistant" || ea.type === "user") && !pr.isHostRow(ea),
            );
            let Pa =
              last_2?.type === "assistant" && !(last_2.isApiErrorMessage && !msg.is_error)
                ? getSalvageableResultText(last_2, Gs.get(last_2))
                : undefined;
            let Qd = runningTurnRecord.resultFields();
            let Kd = postTimingFields(rr, startTime, nd);
            let Vd = postTimingFields(rr, startTime, Ta);
            $o = {
              ...msg,
              usage: Cr,
              duration_ms: elapsedMs(startTime, performance.now()),
              ...(msg.subtype === "error_during_execution" && {
                errors: orderForTransport(
                  e.session,
                  msg.errors[0] ?? "",
                  appendUnique(msg.errors.slice(1), getRecentErrorLog(last)),
                  "first",
                ),
              }),
              ...(msg.subtype !== "success" && runningTurnRecord.errorVariantFields()),
              ...(msg.subtype !== "success" && ts),
              ...(msg.subtype === "success" && {
                ...(Pa !== undefined && {
                  result: Pa,
                }),
                ttft_ms: rr && Wd ? elapsedMs(startTime, Wd) : undefined,
                ttft_stream_ms: rr && qd ? elapsedMs(startTime, qd) : undefined,
                time_to_request_ms: Bo,
                ...(_r && {
                  time_to_request_phases_ms: _r.phases,
                  turn_start_resume_kind: turnContinuationKind({
                    orphanedPermission: Ie?.orphanedPermission,
                    handedOffTurn: Ie?.handedOffTurn,
                    deferredToolUse: Ie?.deferredToolUse,
                  }),
                  ...(Ie?.handedOffTurn?.intakePhasesMs !== undefined && {
                    handoff_intake_phases_ms: Ie.handedOffTurn.intakePhasesMs,
                  }),
                }),
                ...(Ol !== undefined && {
                  process_turn_index: Ol,
                }),
                ...(_r?.window && {
                  process_turn_index: _r.window.processTurnIndex,
                  time_to_request_loop_lag_ms: _r.window.loopLagMs,
                }),
                ...(_r?.window?.resources && {
                  time_to_request_cpu_ms: _r.window.resources.cpuMs,
                  time_to_request_major_faults: _r.window.resources.majorFaults,
                }),
                ...(_r?.memory && {
                  process_rss_mib_turn_start: _r.memory.atBegin.rssMib,
                  process_anon_mib_turn_start: _r.memory.atBegin.anonMib,
                  process_rss_mib_result: _r.memory.atConsume.rssMib,
                  process_anon_mib_result: _r.memory.atConsume.anonMib,
                  process_peak_rss_mib: _r.memory.atConsume.peakRssMib,
                }),
                ...(_r?.betweenTurns && {
                  process_cpu_ms_between_turns: _r.betweenTurns.cpuMs,
                  process_wall_ms_between_turns: _r.betweenTurns.wallMs,
                }),
                ...(_r?.turn && {
                  process_cpu_ms_turn: _r.turn.cpuMs,
                  process_wall_ms_turn: _r.turn.wallMs,
                }),
                ...(_r?.shellCpu && {
                  shell_cpu_ms_turn: _r.shellCpu.turnMs,
                  ...(_r.shellCpu.sinceLastResult && {
                    shell_cpu_ms_since_last_result: _r.shellCpu.sinceLastResult.cpuMs,
                    shell_wall_ms_since_last_result: _r.shellCpu.sinceLastResult.wallMs,
                  }),
                }),
                ...(_r?.streaming && {
                  process_cpu_ms_streaming: _r.streaming.cpuMs,
                  process_wall_ms_streaming: _r.streaming.wallMs,
                  main_stream_count: _r.streaming.streams,
                  main_stream_event_count: _r.streaming.events,
                  ...(_r.streaming.chunks !== undefined && {
                    main_stream_chunk_count: _r.streaming.chunks,
                  }),
                }),
                ...(_r?.inputAttachments && {
                  input_attachments_detail: _r.inputAttachments,
                }),
                ...(_r?.storeConfirm && {
                  resume_store_confirm_detail: _r.storeConfirm,
                }),
                first_content_frame_ms: rr && td ? elapsedMs(startTime, td) : undefined,
                first_stream_post_ms: Kd.postMs,
                first_stream_post_ack_ms:
                  rr && nd?.ackedAtMs ? elapsedMs(startTime, nd.ackedAtMs) : undefined,
                first_stream_post_queue_wait_ms: Kd.queueWaitMs,
                first_stream_post_queued_behind: Kd.queuedBehind,
                first_text_post_ms: Vd.postMs,
                first_text_post_queue_wait_ms: Vd.queueWaitMs,
                first_text_post_queued_behind: Vd.queuedBehind,
                text_post_count: Vd.textPosts,
                text_post_gap_over_500ms_count: Vd.textPostGapsOver500Ms,
                text_post_flush_timer_max_late_ms: Vd.flushTimerMaxLateMs,
                ...Qd,
                ...ts,
                ...(rr &&
                  uu &&
                  Qd !== undefined &&
                  Qd.user_message_uuid === uuid && {
                    request_sent_wall_ms: uu,
                    ...(mu > 0 && {
                      first_request_input_tokens: mu,
                    }),
                    ...(Ie?.frameTiming?.serverReceivedWallMs !== undefined && {
                      user_message_server_received_wall_ms: Ie.frameTiming.serverReceivedWallMs,
                    }),
                    ...(nd?.postedWallMs !== undefined && {
                      first_stream_post_wall_ms: nd.postedWallMs,
                    }),
                    ...(Ta?.postedWallMs !== undefined && {
                      first_text_post_wall_ms: Ta.postedWallMs,
                    }),
                    ...(Ie?.frameTiming?.receivedWallMs !== undefined && {
                      frame_received_wall_ms: Ie.frameTiming.receivedWallMs,
                      frame_enqueued_wall_ms: Ie.frameTiming.enqueuedWallMs,
                      turn_started_wall_ms: now,
                      ...(Ie.frameTiming.intakePhasesMs !== undefined && {
                        frame_intake_phases_ms: Ie.frameTiming.intakePhasesMs,
                      }),
                      ...(turnSignals !== undefined && {
                        turn_start_phases_ms: turnSignals.phases,
                        ...(turnSignals.controlRequestsMs > 0 && {
                          turn_start_control_requests_ms: turnSignals.controlRequestsMs,
                        }),
                      }),
                    }),
                  }),
                ...(Uo && {
                  time_to_request_from_spawn_ms: Uo.ms,
                  warm_spare_claimed: Uo.warmSpareClaimed,
                  flag_fetch_kick: Uo.flagFetchKick,
                  time_origin_ms: Uo.timeOriginMs,
                }),
              }),
            };
            break;
          }
          default:
            break;
        }
        if (
          rd ||
          (includePartialMessages && msg.type === "stream_event" && !isPingStreamEvent(msg.event)) ||
          (Ct && msg.type === "system" && msg.subtype === "status" && msg.status === "requesting")
        ) {
          if (!fu) yield* pu();
        }
        if (Ti.length > 0) yield* Ti;
        let sessionId = getSessionId();
        if (Is)
          for (let Mt of toSdkMessages(
            $o.session_id === sessionId
              ? $o
              : {
                  ...$o,
                  session_id: sessionId,
                },
            ig,
            Im,
          )) {
            if (Mt.type === "assistant" && msg.type === "assistant" && !("parent_tool_use_id" in msg))
              partialStreamRetraction.onAssistantMessage(msg);
            if (Mt.type === "stream_event" && Mt.parent_tool_use_id == null && isMarkerTextDelta(Mt.event)) {
              turnTiming.markFirstTextPainted("stream_event");
              El = true;
              if (Ta === undefined && e.trackFirstTextFrameUpload !== undefined)
                Ta = e.trackFirstTextFrameUpload(Mt.uuid);
            } else if (
              Mt.type === "assistant" &&
              Mt.parent_tool_use_id == null &&
              collectReadNotificationsToolUseIds(Mt, BRIEF_TOOL_NAME_SET)
            )
              turnTiming.markFirstTextPainted("message", Mt.message.id);
            if (
              nd === undefined &&
              e.trackFirstFrameUpload !== undefined &&
              Mt.type === "stream_event" &&
              Mt.parent_tool_use_id == null &&
              !isPingStreamEvent(Mt.event)
            )
              nd = e.trackFirstFrameUpload(Mt.uuid);
            let Ur =
              Mt.type === "assistant" && Mt.parent_tool_use_id == null
                ? "assistant"
                : Mt.type === "stream_event" && Mt.parent_tool_use_id == null && !isPingStreamEvent(Mt.event)
                  ? "stream_event"
                  : undefined;
            let rr = Ur === undefined ? undefined : runningTurnRecord.fields();
            if (Ur !== undefined && rr !== undefined && rr.user_message_uuid !== Ka[Ur]) {
              Ka[Ur] = rr.user_message_uuid;
              yield {
                ...Mt,
                ...rr,
                ...ts,
              };
            } else if (Mt.type === "system" && Mt.subtype === "thinking_tokens") {
              let Uo = runningTurnRecord.fields();
              yield Uo === undefined
                ? Mt
                : {
                    ...Mt,
                    user_message_uuid: Uo.user_message_uuid,
                  };
            } else if (Mt.type === "system" && Mt.subtype === "status" && Mt.status === "requesting")
              yield withUserMessageUuids(Mt, runningTurnRecord);
            else {
              Ja = Ur === "stream_event" && isTextOrJsonDeltaEvent(msg);
              yield Mt;
            }
          }
        if (Su) yield* Ao("served");
        if (_u) return;
        if (msg.type === "user" && ga !== undefined && !hasReachedBudget(e.maxBudgetUsd)) {
          let MAX_STRUCTURED_OUTPUT_RETRIES_2 =
            env.MAX_STRUCTURED_OUTPUT_RETRIES ?? MAX_STRUCTURED_OUTPUT_RETRIES;
          if (
            countNamedToolUses(initialMessages, STRUCTUREDOUTPUT) + Za - Il >=
              MAX_STRUCTURED_OUTPUT_RETRIES_2 &&
            vi.length === 0
          ) {
            Cn = true;
            await Gr(on, permissionDenials);
            _u = true;
            Bi(pr, tools);
            if (to) {
              await pr.record(true);
              if (qo) await flushSessionStorage();
            }
            turnTiming.end("structured_output_retry_exhausted");
            yield* partialStreamRetraction.closeAtTurnEnd(Es);
            yield* Ao("turn_end");
            yield buildResultMessage({
              startedAt: startTime,
              common: {
                is_error: true,
                duration_api_ms: getTotalAPIDuration(),
                num_turns: mc,
                stop_reason: Nd,
                session_id: getSessionId(),
                total_cost_usd: getTotalCostUSD(),
                usage: Cr,
                modelUsage: getModelUsage(),
                permission_denials: permissionDenials,
                terminal_reason: "structured_output_retry_exhausted",
                fast_mode_state: getFastModeState(model_2, appState.fastMode),
                fast_mode_disabled_reason:
                  getFastModeUnavailableReasonCode() ??
                  getFastRejectedReason(model_2, appState.fastMode) ??
                  undefined,
                origin: Ie?.origin,
                subagent_stats: buildFileHistorySnapshotChain(e.session),
                safety_stops: getSafetyStops(),
              },
              variant: {
                subtype: "error_max_structured_output_retries",
                errors: [
                  formatStructuredOutputFailure(
                    MAX_STRUCTURED_OUTPUT_RETRIES_2,
                    Za,
                    hasSuccessfulToolCallSince(initialMessages, last_2),
                  ),
                ],
                ...runningTurnRecord.errorVariantFields(),
                ...ts,
              },
            });
            return;
          }
        }
      }
    } finally {
      $n = Date.now();
      emitPlainDelta = undefined;
      if (hr > 0)
        logForDebugging(
          `[headless] ${hr} streamed deltas went straight to output this turn (CLAUDE_CODE_PLAIN_DELTA_FAST_PATH)`,
          {
            level: "info",
          },
        );
      turnTiming.end(undefined, on.signal.aborted);
      turnTiming.dispose();
      if (!_u) await Gr(on);
      if (!Cn) Bi(pr, tools);
      await pr.settleFoldCopies("all");
      wt.delete(ni);
      if (ba !== undefined)
        _n(
          "turn.complete",
          () =>
            raiseTurnComplete({
              turnEvents: turnStreamBridge,
              turnId: ba,
              transcript: {
                getSnapshot: () => initialMessages,
              },
              span: ni,
              durationMs: elapsedMs(startTime, performance.now()),
              isAborted: on.signal.aborted,
            }),
          undefined,
        );
      await jn(pr, ar, to, qo);
    }
  }
  async function Gr(It, permissionDenials) {
    if (It === abortController) ie();
    try {
      while (true) {
        let { value: on, done: Zn } = await queryEngine.next();
        if (Zn) return;
        if (on.type === "result") {
          permissionDenials?.push(...on.permission_denials);
          return;
        }
      }
    } catch (error) {
      logForDebugging(
        `headless session: draining an abandoned turn failed: ${error instanceof Error ? error.message : String(error)}`,
        {
          level: "warn",
        },
      );
    }
  }
  function Bi(It, Ie) {
    It.flushUnanchoredPreservedTail();
    try {
      clearCutResults();
    } catch (error) {
      logError(error);
    }
    try {
      let on = stripToolResultsForStorage(initialMessages, Ie, 0, true);
      if (on !== initialMessages) for (let j = 0; j < on.length; j++) initialMessages[j] = on[j];
    } catch (error) {
      logError(error);
    }
    oo(true);
  }
  function Hi(It, Ie, on, Zn) {
    if ("timestamp" in It && "level" in It) {
      let Cr = withoutSessionId(It);
      h.keep([Cr]);
      if (Zn) {
        Ie.push(Cr);
        on.record();
      }
      return;
    }
    let Nn;
    switch (It.subtype) {
      case "model_fallback":
        Nn = createModelFallbackSystemMessage(It);
        break;
      case "model_consent_fallback":
        Nn = createConsentFallbackMessage(It);
        break;
      case "model_refusal_no_fallback":
        Nn = createRefusalNoFallbackMessage(It);
        break;
      default:
        return;
    }
    h.keep([Nn]);
    if (Zn) Ie.push(Nn);
  }
  function ja(refusalFallbackMessage, Ie, on) {
    h.keep([refusalFallbackMessage]);
    if (on) {
      Ie.push(refusalFallbackMessage);
      logEvent("tengu_refusal_fallback_entry_recorded", {
        request_id: sanitizeMarkName(refusalFallbackMessage.requestId),
      });
    }
  }
  async function Qa(It, model, fastMode) {
    let [Zn, Nn] = await loadSkillsAndPlugins(It.storageV5);
    let appState = getAppState();
    let mr;
    try {
      mr = dropSyncedClashes(Zn, appState.mcp.commands);
    } catch (error) {
      logError(error);
      mr = Zn.filter((es) => es.loadedFrom !== "syncedSkills");
    }
    let io;
    try {
      io = resolveLazy(e.capabilities);
    } catch (error) {
      logError(error);
      io = [];
    }
    return await buildSdkInitMessage({
      session: It.session,
      tools: It.tools,
      mcpClients: It.mcpClients,
      model,
      readSessionEffort: () => resolveEffortLevel(appState),
      permissionMode: appState.toolPermissionContext.mode,
      commands: It.commands,
      agents: It.agents,
      skills: mr,
      plugins: Nn,
      fastMode,
      proactivityState: appState,
      capabilities: io,
      messagesInView: () => messagesSinceCompactBoundary(initialMessages),
    });
  }
  return {
    submitMessage: No,
    interrupt: ie,
    setModel: (It) => {
      userSpecifiedModel = It;
    },
    getMessages: () => initialMessages,
    keepArrivedRows: kn,
    appendMessages: (It) => {
      if (Pn !== undefined) Pn.push(...It);
      else if (nn !== undefined)
        nn.push({
          rows: It,
          isAnswered: false,
        });
      else En(It);
    },
    appendsSettled: () => h.settled(),
    getReadFileState: () => readFileCache,
    dispose: () => {
      clearClassifierContext();
      e.abortController?.signal.removeEventListener("abort", nt);
      abortController.abort(userAbortReason("remote-cancel"));
      Ee.done();
      queryEngine.return(undefined).catch(logError);
      initialMessages = [];
      readFileCache = createRemoteFileState(READ_FILE_STATE_CACHE_SIZE);
      sessionEnvVars = new Map();
      L = new InstanceRegistry();
      q = createSessionHooksRegistry();
      memorySelector = emptyPickerState();
    },
  };
}
//@ chunk-tyg7f3ek.js:483526-483578 layout
/**
 * 非负取整的时间差
 */
function elapsedMs(e, n) {
  return Math.max(0, Math.round(n - e));
}
//@ chunk-tyg7f3ek.js:483578-483926 layout
/**
 * 发送时间相关遥测字段。
 */
function postTimingFields(e, n, r) {
  try {
    let postedAtMs = r?.postedAtMs;
    let enqueuedAtMs = r?.enqueuedAtMs;
    if (!e || !postedAtMs) return {};
    let textRhythm = r?.textRhythm;
    return {
      postMs: elapsedMs(n, postedAtMs),
      ...(enqueuedAtMs !== undefined &&
        enqueuedAtMs !== 0 && {
          queueWaitMs: elapsedMs(enqueuedAtMs, postedAtMs),
          queuedBehind: r?.queuedBehind,
        }),
      ...(textRhythm !== undefined &&
        textRhythm.posts > 0 &&
        !isDiskless() && {
          textPosts: textRhythm.posts,
          textPostGapsOver500Ms: textRhythm.gapsOver500Ms,
          flushTimerMaxLateMs: textRhythm.timerMaxLateMs,
        }),
    };
  } catch (error) {
    logError(error);
    return {};
  }
}
//@ chunk-tyg7f3ek.js:483926-485753 fingerprint = ask (0.405)
/**
 * ask()：解析惰性配置（工具/MCP/命令/JSON schema 等可为函数），按 userSpecifiedModel 与权限模式决定主循环模型与 thinking，构建 headless 的 ToolUseContext（isNonInteractiveSession、runQuery=query 等）。
 */
function ask(sessionConfig, { abortController, userSpecifiedModel }) {
  let { getAppState, setAppState } = sessionConfig;
  let tools = sessionConfig.refreshTools?.() ?? resolveLazy(sessionConfig.tools);
  let mcpClients = sessionConfig.refreshMcpClients?.() ?? resolveLazy(sessionConfig.mcpClients);
  let jsonSchema = resolveLazy(sessionConfig.jsonSchema);
  let appState = getAppState();
  let { mainLoopModel, thinkingConfig } = resolveTurnModelAndThinking({
    userSpecifiedModel,
    permissionMode: appState.toolPermissionContext.mode,
    thinkingConfig: resolveLazy(sessionConfig.thinkingConfig),
  });
  return createHeadlessToolUseContext(
    {
      session: sessionConfig.session,
      messageQueue: sessionConfig.messageQueue,
      commands: resolveLazy(sessionConfig.commands),
      tools,
      refreshTools: sessionConfig.refreshTools,
      toolCatalog: sessionConfig.toolCatalog,
      refreshMcpClients: sessionConfig.refreshMcpClients,
      verbose: sessionConfig.verbose ?? false,
      fallbackModel: sessionConfig.fallbackModel,
      thinkingConfig,
      mcpClients,
      customSystemPrompt: resolveLazy(sessionConfig.customSystemPrompt),
      appendSystemPrompt: resolveLazy(sessionConfig.appendSystemPrompt),
      planModeInstructions: resolveLazy(sessionConfig.planModeInstructions),
      systemPromptSnapshot: resolveLazy(sessionConfig.systemPromptSnapshot),
      appendSubagentSystemPrompt: resolveLazy(sessionConfig.appendSubagentSystemPrompt),
      toolAliases: resolveLazy(sessionConfig.toolAliases),
      excludeDynamicSections: resolveLazy(sessionConfig.excludeDynamicSections),
      agents: resolveLazy(sessionConfig.agents),
      allowedAgentTypes: resolveLazy(sessionConfig.allowedAgentTypes),
      primitiveToolGrant: resolveLazy(sessionConfig.primitiveToolGrant),
      maxBudgetUsd: sessionConfig.maxBudgetUsd,
      messageClientPlatform: undefined,
      messageInboundOrigin: undefined,
      forwardSubagentText: resolveLazy(sessionConfig.forwardSubagentText) ?? false,
      requiresStructuredOutput:
        jsonSchema !== undefined && tools.some((tool) => toolMatchesName(tool, STRUCTUREDOUTPUT)),
      onPermissionDenial: () => {},
      requestDialog: sessionConfig.requestDialog,
      sessionState: sessionConfig.sessionState,
      getAppState,
      setAppState,
      setSDKStatus: sessionConfig.setSDKStatus,
      readFileState: sessionConfig.readFileCache,
      pendingNestedMemoryTriggers: sessionConfig.pendingNestedMemoryTriggers,
      sessionEnvVars: sessionConfig.sessionEnvVars ?? new Map(),
      toolState: sessionConfig.toolState ?? new InstanceRegistry(),
      memorySelector: sessionConfig.memorySelector ?? emptyPickerState(),
      isolationLatch: sessionConfig.isolationLatch ?? createIsolationLatch(),
      sessionHooks: sessionConfig.sessionHooks ?? createSessionHooksRegistry(),
      storageV5: sessionConfig.storageV5,
      credentials: sessionConfig.credentials,
    },
    {
      phase: "query",
      messages: [...(sessionConfig.initialMessages ?? [])],
      mainLoopModel,
      appState,
      abortController,
      permissionLayers: undefined,
      activeSkill: undefined,
    },
  );
}
//@ chunk-tyg7f3ek.js:485753-485787 affinity
/**
 * 值是函数则调用取值，否则原样（配置项可惰性提供）。
 */
function resolveLazy(e) {
  return isFunction(e) ? e() : e;
}
//@ chunk-tyg7f3ek.js:485787-485831 affinity
/**
 * typeof 为 function。
 */
function isFunction(e) {
  return typeof e === "function";
}
//@ chunk-18hwfzwa.js:1510660-1510734 fingerprint = getCoordinatorUserContext (0.572)
/**
 * coordinator 用户上下文缓存（初始 null）。
 */
var getCoordinatorUserContext = require("./chunk-yxywkh50.js").getCoordinatorUserContext;
var coordinatorContextCache = null;
export { ask, QueryEngine, coordinatorContextCache, getCoordinatorUserContext };
