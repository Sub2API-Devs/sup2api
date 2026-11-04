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
import {
  mergeUsageFromDelta,
  addUsage_2,
  addResponseUsageAttributes,
} from "../vendor/@anthropic-ai/sdk/lib/internal/tracing/response.mjs";
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
import { NO_BRIDGE_CONSENT } from "./screens/repl/bridgeChannelSlot.js";
import { mainAgentContext } from "./utils/agentContext.js";
import { query } from "./query.js";
import { resolveThemeSetting } from "./utils/systemTheme.js";
import { resolveSetting } from "./utils/settings/userIntentSettings.js";
import { createAppStateAccessors, createPermissionContextSetters } from "./state/appStateSetters.js";
import { createTaskFramework } from "./utils/task/framework.js";
import { createColorAssigner } from "./tools/AgentTool/agentColorManager.js";
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
import { deferInit } from "../runtime/deferred-init.js";

//@ chunk-tyg7f3ek.js:416207-418123 placement
function reconcileSavedFilesForTurn(initialMessages, withdrawnFileUuids) {
  try {
    let withdrawnNames = new Set(withdrawnFileUuids.map((name) => name.toLowerCase()));
    let withdrawnPaths = new Set(
      initialMessages.flatMap((message) =>
        message.type === "user" && Array.isArray(message.savedFiles)
          ? message.savedFiles.flatMap((savedFile) =>
              typeof savedFile?.file_uuid === "string" &&
              typeof savedFile.path === "string" &&
              withdrawnNames.has(savedFile.file_uuid.toLowerCase())
                ? [savedFile.path]
                : [],
            )
          : [],
      ),
    );
    let withdrawnCount = 0;
    let replacements = [];
    for (let [index, message] of initialMessages.entries())
      if (message.type === "user") {
        let keepMask = maskDisallowedNames(message.imageFileUuids, withdrawnNames);
        if (keepMask === undefined || !Array.isArray(message.message?.content)) continue;
        let keptBlocks = filterImageBlocksByMask(message.message.content, keepMask);
        let removedCount = message.message.content.length - keptBlocks.length;
        withdrawnCount += removedCount;
        replacements.push([
          index,
          {
            ...message,
            message: {
              ...message.message,
              content:
                keptBlocks.length > 0
                  ? keptBlocks
                  : [
                      {
                        type: "text",
                        text: NO_CONTENT_MESSAGE,
                      },
                    ],
            },
            withdrawnImages: (message.withdrawnImages ?? 0) + removedCount,
            imageFileUuids: filterArrayByMask(message.imageFileUuids, keepMask),
            imagePasteIds: filterArrayByMask(message.imagePasteIds, keepMask),
            [storedFormSymbol]: resolveMessageAlias(message),
          },
        ]);
      } else if (message.type !== "attachment") continue;
      else if (message.attachment?.type === "inlined_image_paths") {
        let { attachment } = message;
        let keepMask = maskDisallowedNames(attachment.fileUuids, withdrawnNames);
        if (keepMask === undefined) continue;
        replacements.push([
          index,
          {
            ...withRenderedAttachment(message, {
              ...attachment,
              paths: filterArrayByMask(attachment.paths, keepMask) ?? [],
              fileUuids: filterArrayByMask(attachment.fileUuids, keepMask),
            }),
            [storedFormSymbol]: resolveMessageAlias(message),
          },
        ]);
      } else if (message.attachment?.type === "file") {
        if (message.attachment.content?.type !== "image" || !withdrawnPaths.has(message.attachment.filename))
          continue;
        withdrawnCount++;
        replacements.push([
          index,
          {
            ...withRenderedAttachment(message, {
              type: "critical_system_reminder",
              content: DELETED_IMAGE_NOTICE,
            }),
            [storedFormSymbol]: resolveMessageAlias(message),
          },
        ]);
      } else if (message.attachment?.type === "queued_command") {
        let { attachment } = message;
        let keepMask = maskDisallowedNames(attachment.imageFileUuids, withdrawnNames);
        if (keepMask === undefined || !Array.isArray(attachment.prompt)) continue;
        let keptBlocks = filterImageBlocksByMask(attachment.prompt, keepMask);
        let removedCount = attachment.prompt.length - keptBlocks.length;
        withdrawnCount += removedCount;
        replacements.push([
          index,
          {
            ...withRenderedAttachment(message, {
              ...attachment,
              prompt: keptBlocks.length > 0 ? keptBlocks : NO_CONTENT_MESSAGE,
              withdrawnImages: (attachment.withdrawnImages ?? 0) + removedCount,
              imageFileUuids: filterArrayByMask(attachment.imageFileUuids, keepMask),
              inlinedImagePaths: filterArrayByMask(attachment.inlinedImagePaths, keepMask),
            }),
            [storedFormSymbol]: resolveMessageAlias(message),
          },
        ]);
      }
    for (let [index, message] of replacements) initialMessages[index] = message;
    let teleportCacheState = chromeSetupModule?.getTeleportCacheState();
    if (
      teleportCacheState?.status === "active" &&
      replacements.some(([, { uuid }]) => teleportCacheState.preAnchorLineUuids.includes(uuid))
    )
      chromeSetupModule?.revertTeleportCache("context_reduced", "main");
    if (replacements.length > 0) {
      noopLedger(getStickyBetas(), "pictures_withdrawn");
      notifyCacheDeletion("sdk");
    }
    logFeatureOk("bridge_attachment_withdraw", {
      listed_count: withdrawnNames.size,
      cut_picture_count: withdrawnCount,
    });
  } catch (error) {
    logError(error);
    logFeatureBad("bridge_attachment_withdraw", "cut_failed");
  }
}
//@ chunk-tyg7f3ek.js:418123-418262 placement
function maskDisallowedNames(names, withdrawn) {
  if (!Array.isArray(names)) return;
  let mapped = names.map((name) => typeof name !== "string" || !withdrawn.has(name.toLowerCase()));
  return mapped.includes(false) ? mapped : undefined;
}
//@ chunk-tyg7f3ek.js:418262-418336 placement
/**
 * 数组按布尔掩码过滤（掩码缺省为保留）
 */
function filterArrayByMask(values, mask) {
  return Array.isArray(values) ? values.filter((value, index) => mask[index] ?? true) : undefined;
}
//@ chunk-tyg7f3ek.js:418336-418415 placement = _temp (1)
/**
 * 只按 image 块的顺序套用掩码过滤
 */
function filterImageBlocksByMask(blocks, mask) {
  let imageIndex = 0;
  return blocks.filter((block) => block?.type !== "image" || (mask[imageIndex++] ?? true));
}
//@ chunk-tyg7f3ek.js:418415-418429 placement
/**
 * 262144：延迟结果的序列化上限
 */
var MAX_DEFERRED_RESULT_BYTES = 262144;
//@ chunk-tyg7f3ek.js:418429-419533 placement
async function mirrorTaskListSnapshot(compactResult, session, store) {
  try {
    let taskListId = getTaskListId();
    if (!hasRemoteWorkerEventLog() || taskListId !== session.id) return;
    let snapshot = await snapshotTaskList(taskListId, store);
    if (snapshot === null || snapshot.tasks === null)
      snapshot = (await snapshotTaskList(taskListId, store)) ?? snapshot;
    if (snapshot === null) {
      logFeatureBad("task_list_carry", "list_unreadable");
      return;
    }
    let { tasks, highestId } = snapshot;
    if (highestId === 0) return;
    if (highestId > MAX_TASK_NUMBER) {
      logFeatureBad("task_list_carry", "highest_id_over_limit");
      return;
    }
    if (tasks === null) {
      compactResult.compactMetadata.preCompactTaskList = {
        highestId,
      };
      logFeatureSad("task_list_carry", "task_unreadable", {
        highest_id: highestId,
      });
      return;
    }
    let filtered = tasks.filter((task) => !task.metadata?._internal);
    let logFields = {
      task_count: filtered.length,
      highest_id: highestId,
    };
    let fullPayload = taskListSnapshotPayload({
      shown: filtered,
      highestId,
      descriptions: true,
      metadata: true,
    });
    if (fitsResultBudget(fullPayload)) {
      compactResult.compactMetadata.preCompactTaskList = fullPayload;
      logFeatureOk("task_list_carry", logFields);
      return;
    }
    let noMetadataPayload = taskListSnapshotPayload({
      shown: filtered,
      highestId,
      descriptions: true,
      metadata: false,
    });
    if (fitsResultBudget(noMetadataPayload)) {
      compactResult.compactMetadata.preCompactTaskList = noMetadataPayload;
      logFeatureSad("task_list_carry", "metadata_left_out", logFields);
      return;
    }
    let minimalPayload = taskListSnapshotPayload({
      shown: filtered,
      highestId,
      descriptions: false,
      metadata: false,
    });
    if (fitsResultBudget(minimalPayload)) {
      compactResult.compactMetadata.preCompactTaskList = minimalPayload;
      logFeatureSad("task_list_carry", "descriptions_left_out", logFields);
      return;
    }
    compactResult.compactMetadata.preCompactTaskList = {
      highestId,
    };
    logFeatureSad("task_list_carry", "tasks_left_out", logFields);
  } catch (error) {
    logFeatureBad("task_list_carry", "carry_failed");
    logError(error);
  }
}
//@ chunk-tyg7f3ek.js:419533-419959 placement
function taskListSnapshotPayload({ shown, highestId, descriptions, metadata }) {
  return {
    tasks: shown.map((task) => ({
      id: task.id,
      subject: task.subject,
      ...(descriptions &&
        task.description !== "" && {
          description: task.description,
        }),
      ...(task.activeForm !== undefined && {
        activeForm: task.activeForm,
      }),
      status: task.status,
      ...(task.owner !== undefined && {
        owner: task.owner,
      }),
      ...(task.blocks.length > 0 && {
        blocks: task.blocks,
      }),
      ...(task.blockedBy.length > 0 && {
        blockedBy: task.blockedBy,
      }),
      ...(metadata &&
        task.metadata !== undefined && {
          metadata: task.metadata,
        }),
    })),
    highestId,
  };
}
//@ chunk-tyg7f3ek.js:419959-420016 placement
/**
 * 判断一个值序列化后的字节数是否在上限内（用于延迟结果）。
 */
function fitsResultBudget(payload) {
  return Buffer.byteLength(jsonStringify(payload), "utf8") <= MAX_DEFERRED_RESULT_BYTES;
}
//@ chunk-tyg7f3ek.js:420016-420648 placement
function createRetractionFilter() {
  let heldBanner;
  let retractedUuids = new Set();
  let suppressedCount = 0;
  function stripRetracted(banner) {
    let retractedMessageUuids = banner.retractedMessageUuids;
    if (retractedMessageUuids === undefined || retractedUuids.size === 0) return banner;
    return {
      ...banner,
      retractedMessageUuids: retractedMessageUuids.filter(
        (retractedMessageUuid) => !retractedUuids.has(retractedMessageUuid),
      ),
    };
  }
  function takeEntry(banner, emittedVia) {
    let entry = {
      banner: stripRetracted(banner),
      suppressedCount,
      emittedVia,
    };
    suppressedCount = 0;
    return entry;
  }
  function takeHeld(emittedVia) {
    if (heldBanner === undefined) return [];
    let entry = takeEntry(heldBanner, emittedVia);
    heldBanner = undefined;
    return [entry];
  }
  return {
    accept(banner) {
      let entries = [];
      if (heldBanner !== undefined)
        if (banner.retractedMessageUuids?.includes(heldBanner.uuid)) {
          retractedUuids.add(heldBanner.uuid);
          suppressedCount += 1;
          heldBanner = undefined;
        } else entries.push(...takeHeld("episode_boundary"));
      if (banner.provisional) heldBanner = banner;
      else entries.push(takeEntry(banner, suppressedCount > 0 ? "supersedes" : "immediate"));
      return entries;
    },
    dropHeld(uuid) {
      if (heldBanner?.uuid === uuid) {
        retractedUuids.add(heldBanner.uuid);
        suppressedCount += 1;
        heldBanner = undefined;
      }
    },
    settle(emittedVia) {
      return takeHeld(emittedVia);
    },
  };
}
//@ chunk-tyg7f3ek.js:420648-421367 placement
function collapseRefusalFallbackNotices(entries, sessionId) {
  return entries.map(({ banner, suppressedCount, emittedVia }) => {
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
var BUILTIN_PLUGIN_READY_TIMEOUT_MS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var builtinPluginReadyHosts;
deferInit("chunk-tyg7f3ek.js:421367", () => {
  BUILTIN_PLUGIN_READY_TIMEOUT_MS = 15000;
  builtinPluginReadyHosts = new HostScoped(() => new Set());
});
//@ chunk-tyg7f3ek.js:421402-422100 placement
function runBuiltinTurnObservers(host, promptText, signal, timeoutMs) {
  if (signal.aborted) return;
  let pendingWaits = [];
  for (let readyHook of builtinPluginReadyHosts.of(host))
    try {
      let wait = readyHook(promptText, signal);
      if (wait !== undefined)
        pendingWaits.push(
          wait.catch((error) => {
            if (signal.aborted && isAbortError(error)) return;
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
  if (pendingWaits.length === 0) return;
  return raceWithAbortSignal(
    withDeadline(Promise.all(pendingWaits), BUILTIN_PLUGIN_READY_TIMEOUT_MS, timeoutMs),
    signal,
    () => new AbortError(),
  ).then(
    (settled) => {
      if (settled === undefined)
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
function isTypedPersonPrompt(host, messages, options, signal) {
  try {
    let typedText =
      options?.inputMode !== "bash" &&
      options?.textNotTyped !== true &&
      (options?.skipSlashCommands !== true ||
        options?.bridgeOrigin === true ||
        options?.modelScheduledOrigin === true) &&
      isHumanOrUnset(options?.origin)
        ? lastTextBlockText(messages)
        : null;
    return typedText === null ? undefined : runBuiltinTurnObservers(host, typedText, signal);
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
function markDroppedPrompts(messages, turnId, droppedUuids) {
  try {
    let allDropped = new Set(droppedUuids);
    if (turnId !== undefined) allDropped.add(turnId);
    let last = messages.findLast(isInterruptionOnlyMessage);
    if (allDropped.size > 0 && last?.type === "user") last.droppedPromptUuids = [...allDropped];
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
function filterMcpToolsBySelectedServers(tools, selectedServerNames, selectedServers) {
  if (selectedServerNames.length > 0) return tools;
  let mapped = selectedServers.map((server) => getMcpPrefix(server.name));
  return tools.filter(
    (toolName) => mapped.includes(`${toolName}__`) || !mapped.some((prefix) => toolName.startsWith(prefix)),
  );
}
//@ chunk-tyg7f3ek.js:422882-423099 placement
function assistantUsageDelta(message, lastId, previousId) {
  try {
    let { id, model, usage } = message.message;
    if (message.isApiErrorMessage || model === SYNTHETIC_MODEL || id === lastId || id === previousId) return;
    return mergeUsageFromDelta(EMPTY_USAGE, usage);
  } catch (error) {
    logError(
      withTelemetryMessage(toError(error), "usage of an unstreamed answer not added to the turn total"),
    );
    return;
  }
}
//@ chunk-tyg7f3ek.js:423099-423374 placement
function createPermissionDenialTracker(canUseTool) {
  let denials = [];
  function recordDenial(tool, toolUseId, toolInput) {
    if (denials.some((denial) => denial.tool_use_id === toolUseId)) return;
    denials.push({
      tool_name: toolNameForInit(tool.name),
      tool_use_id: toolUseId,
      tool_input: toolInput,
    });
  }
  return {
    permissionDenials: denials,
    recordDenial,
    canUseTool: async (tool, toolInput, toolUseContext, assistantMessage, toolUseId, requestContext) => {
      let result = await canUseTool(
        tool,
        toolInput,
        toolUseContext,
        assistantMessage,
        toolUseId,
        requestContext,
      );
      if (isRecordableDenial(result, requestContext)) recordDenial(tool, toolUseId, toolInput);
      return result;
    },
  };
}
//@ chunk-tyg7f3ek.js:423374-423535 placement
function userRowsToReplay(messages, options) {
  return messages.filter(
    (message) =>
      (message.type === "user" &&
        !message.toolUseResult &&
        ((!message.isMeta && isOwnPromptRow(message, options)) || isExternalOrigin(message.origin))) ||
      (message.type === "system" && message.subtype === "compact_boundary"),
  );
}
//@ chunk-tyg7f3ek.js:423535-423637 placement
function isOwnPromptRow(message, options) {
  return message.type === "user" && options?.localStdinOrigin === true && isSameUuidMessage(message, options)
    ? isUserPromptOfKind(message, "own-prompt")
    : isUserStampPrompt(message);
}
//@ chunk-tyg7f3ek.js:423637-423859 placement
function* replayUserRows(messages, options) {
  for (let message of messages) {
    if (message.type !== "user") continue;
    yield options?.inputMode === "bash"
      ? {
          type: "user",
          message: message.message,
          session_id: getSessionId(),
          parent_tool_use_id: null,
          uuid: message.uuid,
          timestamp: message.timestamp,
          isSynthetic: selectableUserMessagesFilter(message),
        }
      : toSdkUserMessage(message, options);
  }
}
//@ chunk-tyg7f3ek.js:423859-423977 placement
function* userRowsForSdk(messages, options) {
  let replayAll = options?.shouldQuery === false;
  for (let message of messages)
    if (message.type === "user") {
      if (!replayAll && !isSameUuidMessage(message, options)) continue;
      yield toSdkUserMessage(message, options);
    }
}
//@ chunk-tyg7f3ek.js:423977-424032 placement
/**
 * 两条消息 uuid 相同
 */
function isSameUuidMessage(message, options) {
  return options?.uuid != null && message.uuid === options.uuid;
}
//@ chunk-tyg7f3ek.js:424032-424301 placement
function toSdkUserMessage(message, options) {
  let fileAttachments = isSameUuidMessage(message, options) ? options?.fileAttachments : undefined;
  return {
    type: "user",
    message: message.message,
    session_id: getSessionId(),
    parent_tool_use_id: null,
    uuid: message.uuid,
    timestamp: message.timestamp,
    isReplay: true,
    isSynthetic: selectableUserMessagesFilter(message),
    ...(fileAttachments &&
      fileAttachments.length > 0 && {
        file_attachments: fileAttachments,
      }),
    ...(message.origin && {
      origin: message.origin,
    }),
  };
}
//@ chunk-tyg7f3ek.js:424301-424555 placement = _temp7 (0.809)
function userRowsWithoutInput(opt) {
  let rows = [];
  for (let message of opt) {
    if (message.type !== "user" || message.isMeta || bashCommandTagKindOf(message) === "input") continue;
    let content = message.message.content;
    rows.push({
      ...message,
      message: {
        ...message.message,
        content:
          typeof content === "string"
            ? cleanShellOutput(content)
            : content.map((block) =>
                block.type === "text"
                  ? {
                      ...block,
                      text: cleanShellOutput(block.text),
                    }
                  : block,
              ),
      },
    });
  }
  return rows;
}
//@ chunk-tyg7f3ek.js:424555-424629 placement
/**
 * 清理 shell 输出用于显示（保留颜色）
 */
function cleanShellOutput(text) {
  try {
    return cleanShellOutputForViewers(text, {
      keepColors: true,
    });
  } catch (error) {
    logError(error);
    return "";
  }
}
//@ chunk-tyg7f3ek.js:424629-424760 placement
function answeredMergedUuids(entries, userMessageUuids, alsoLeftToThisReRun = []) {
  try {
    return userMessageUuids?.flatMap((uuid) =>
      mergedMessageUuids(trimTrailingAfterTurn(entries, uuid), uuid).filter(
        (candidate) =>
          candidate === uuid || alsoLeftToThisReRun.includes(candidate) || isTurnAnswered(entries, candidate),
      ),
    );
  } catch (error) {
    logError(error);
    return userMessageUuids;
  }
}
//@ chunk-tyg7f3ek.js:424760-425012 placement
function stampMergedSends(messages, turnId, mergedSendUuids, clientPlatform, contextKey) {
  if (!mergedSendUuids?.length && clientPlatform === undefined && contextKey === undefined) return;
  try {
    let found = messages.find((message) => message.uuid === turnId);
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
  let cursor = 0;
  let parentUuid;
  let initialLength = messages.length;
  let preservedTail = null;
  let sinceUuid = new Set();
  let scannedLength = 0;
  let weakSet = new WeakSet();
  let heldCopies = [];
  let foldTimer;
  let pendingWrite;
  let exitDrain;
  function drainAll() {
    return settleFoldCopies("all");
  }
  function releaseDrain() {
    if (heldCopies.length === 0 && pendingWrite === undefined) {
      let drain = exitDrain;
      exitDrain = undefined;
      safely(() => drain?.());
    }
  }
  function safely(fn) {
    try {
      return fn();
    } catch (error) {
      logError(error);
      return;
    }
  }
  function holdFoldCopy(row, sourceUuid) {
    safely(() => {
      if (foldCopies.foldCopyFate(sourceUuid) === "wait") {
        heldCopies.push({
          row,
          sourceUuid,
        });
        if (persistSession) exitDrain ??= registerTranscriptExitDrain(drainAll);
      }
    });
  }
  function settleHeld(mode) {
    if (heldCopies.length === 0) return false;
    let batch = heldCopies;
    heldCopies = [];
    clearTimeout(foldTimer);
    foldTimer = undefined;
    let windowMs = safely(() => foldCopies.requeueWindowLeftMs());
    for (let held of batch)
      if (
        safely(() => {
          if (mode === "compaction") return true;
          let fate = foldCopies.foldCopyFate(held.sourceUuid);
          if (fate === "wait" && mode === "decidable") heldCopies.push(held);
          else if (fate === "drop") evict(held.row.uuid);
          else foldCopies.foldCopyWritten(held.sourceUuid);
          return true;
        }) === undefined
      )
        safely(() => foldCopies.foldCopyWritten(held.sourceUuid));
    if (heldCopies.length > 0 && windowMs !== undefined) {
      foldTimer = setTimeout(settleFoldCopies, windowMs + 10);
      foldTimer.unref();
    }
    return heldCopies.length < batch.length;
  }
  function queueWrite(includeAll) {
    let write =
      pendingWrite === undefined ? flushNow(includeAll) : pendingWrite.then(() => flushNow(includeAll));
    let tail = write
      .then(
        () => {},
        () => {},
      )
      .finally(() => {
        if (pendingWrite === tail) {
          pendingWrite = undefined;
          releaseDrain();
        }
      });
    pendingWrite = tail;
    return write;
  }
  function settleFoldCopies(mode = "decidable") {
    safely(() => {
      if (settleHeld(mode) && persistSession) queueWrite(false).catch(logError);
    });
    releaseDrain();
    return pendingWrite ?? Promise.resolve();
  }
  async function writeRows(rows, parentUuid, cursorProvider) {
    let atTranscriptEntry = readAtTranscriptEntry(rows, cursorProvider);
    return await inTranscriptCallOrder(() =>
      recordTranscript(rows, undefined, parentUuid, cursorProvider, storageV5, atTranscriptEntry),
    );
  }
  function record(includeAll = false) {
    return pendingWrite === undefined && heldCopies.length === 0
      ? flushNow(includeAll)
      : queueWrite(includeAll);
  }
  function flushNow(includeAll) {
    settleHeld(includeAll ? "all" : "decidable");
    let from = cursor;
    let to = transcriptCursorEnd(messages, Math.max(from, initialLength), !includeAll);
    for (let { row } of heldCopies) {
      let index = messages.lastIndexOf(row);
      if (index !== -1) {
        to = Math.min(to, index);
        break;
      }
    }
    let heldLimit = keepLoaderRows(from, keepToolPairsTogether(from, to));
    if (!includeAll) to = heldLimit;
    if (from >= to) {
      lookMcpTaskEndings(messages, to)?.(true);
      return Promise.resolve(null);
    }
    let slice = from === 0 && to === messages.length ? messages : messages.slice(from, to);
    let filtered =
      neverParentUuid === undefined ? slice : slice.filter((row) => row.uuid !== neverParentUuid);
    cursor = to;
    let previousParent = parentUuid;
    parentUuid = lastChainUuid(filtered) ?? parentUuid;
    let finishTaskEndings = lookMcpTaskEndings(messages, to);
    let writePromise = writeRows(filtered, previousParent, cursorProvider);
    return finishTaskEndings === undefined
      ? writePromise
      : writePromise.then(
          (result) => {
            finishTaskEndings(true);
            return result;
          },
          (error) => {
            finishTaskEndings(false);
            throw error;
          },
        );
  }
  function cursorProvider() {
    collectReplIds(messages.slice(scannedLength), sinceUuid);
    scannedLength = messages.length;
    return sinceUuid;
  }
  function resetScan() {
    sinceUuid = new Set();
    scannedLength = 0;
  }
  function lastChainUuid(rows) {
    return rows.findLast(
      (row) =>
        isLoggableMessage(row) &&
        isChainParticipant(row) &&
        !isReorderedRow(row.uuid) &&
        row.uuid !== neverParentUuid,
    )?.uuid;
  }
  function evict(uuid) {
    let lastIndex = messages.findLastIndex((message) => message.uuid === uuid);
    if (lastIndex !== -1) {
      let removed = messages[lastIndex];
      messages.splice(lastIndex, 1);
      resetScan();
      if (cursor > lastIndex) {
        cursor--;
        if (parentUuid === uuid && !hasSessionMirror())
          parentUuid = lastChainUuid(messages.slice(0, lastIndex)) ?? parentUuid;
        if (persistSession) {
          logEvent("tengu_tombstone_persisted_removal", {
            message_type: fromEnum(removed.type),
          });
          let sessionId = getSessionId();
          inTranscriptCallOrder(async () => {
            removeTranscriptMessage(uuid, storageV5, sessionId).catch(logError);
          });
        }
      }
      if (initialLength > lastIndex) initialLength--;
    }
    let lastIndex_2 = conversation.findLastIndex((row) => row.uuid === uuid);
    if (lastIndex_2 !== -1) conversation.splice(lastIndex_2, 1);
  }
  function dropPreservedRowsNotInConversation(boundary) {
    let next = boundary;
    try {
      let preservedMessages = boundary.compactMetadata.preservedMessages;
      if (!preservedMessages) return boundary;
      let byUuid = new Map(conversation.map((row) => [row.uuid, row]));
      let filtered = preservedMessages.uuids.filter((uuid) => byUuid.has(uuid));
      if (filtered.length === preservedMessages.uuids.length) return boundary;
      let { preservedSegment, ...rest } = boundary.compactMetadata;
      next = {
        ...boundary,
        compactMetadata: {
          ...rest,
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
      let toolUseIds = new Set();
      let toolResultIds = new Set();
      for (let uuid of filtered) {
        let row = byUuid.get(uuid);
        if (row?.type !== "assistant" && row?.type !== "user") continue;
        let content = row.message?.content;
        for (let block of Array.isArray(content) ? content : [])
          if (block?.type === "tool_use") toolUseIds.add(block.id);
          else if (block?.type === "tool_result") toolResultIds.add(block.tool_use_id);
      }
      logEvent("tengu_compact_preserved_not_in_conversation", {
        listed: preservedMessages.uuids.length,
        dropped: preservedMessages.uuids.length - filtered.length,
        tailDropped: !byUuid.has(preservedMessages.uuids.at(-1)),
        unpairedToolBlocksRemaining:
          count([...toolUseIds], (id) => !toolResultIds.has(id)) +
          count([...toolResultIds], (id) => !toolUseIds.has(id)),
      });
    } catch (error) {
      logError(error);
    }
    return next;
  }
  async function flushBeforeCompactBoundary(boundary) {
    settleHeld("compaction");
    await pendingWrite;
    let tailUuid =
      boundary.compactMetadata.preservedMessages?.uuids.at(-1) ??
      boundary.compactMetadata.preservedSegment?.tailUuid;
    if (!tailUuid) return;
    let lastIndex = conversation.findLastIndex((row) => row.uuid === tailUuid);
    if (lastIndex === -1) return;
    await writeRows(conversation.slice(0, lastIndex + 1), undefined, undefined);
    cursor = 0;
    parentUuid = undefined;
  }
  function applyCompactBoundary(boundary) {
    let preservedMessages = boundary.compactMetadata.preservedMessages;
    let mapped = (preservedMessages?.allUuids ?? preservedMessages?.uuids ?? [])
      .map((uuid) => conversation.find((row) => row.uuid === uuid))
      .filter((row) => row !== undefined)
      .map(getTokenCountFromUsage_4);
    preservedTail =
      preservedMessages && mapped.length > 0
        ? {
            preserved: mapped,
            anchorUuid: preservedMessages.anchorUuid,
          }
        : null;
    let conversationLast = conversation.length - 1;
    if (conversationLast > 0) conversation.splice(0, conversationLast);
    settlePreservedTail(boundary.uuid);
    let messagesLast = messages.length - 1;
    if (messagesLast > 0) {
      messages.splice(0, messagesLast);
      resetScan();
      cursor = messages.length;
      initialLength = messages.length;
    }
  }
  function settlePreservedTail(uuid) {
    if (preservedTail !== null && preservedTail.anchorUuid === uuid) {
      conversation.push(...preservedTail.preserved);
      preservedTail = null;
    }
  }
  function flushUnanchoredTail() {
    if (preservedTail === null) return;
    logEvent("tengu_compact_preserved_unanchored", {
      preservedCount: preservedTail.preserved.length,
    });
    conversation.push(...preservedTail.preserved);
    preservedTail = null;
  }
  function keepToolPairsTogether(from, to) {
    let pendingResultAt = -1;
    for (let index = from; index < to; index++) {
      let row = messages[index];
      if (weakSet.has(row)) {
        if (pendingResultAt === -1) pendingResultAt = index;
      } else if (isCompactBoundaryMessage(row)) pendingResultAt = -1;
      else if (row.type === "assistant" || row.type === "user")
        if (pendingResultAt === -1 || !isToolResultMessage(row)) pendingResultAt = -1;
        else {
          messages.splice(index, 1);
          messages.splice(pendingResultAt, 0, row);
          resetScan();
          pendingResultAt++;
        }
    }
    return pendingResultAt === -1 ? to : pendingResultAt;
  }
  function keepLoaderRows(from, to) {
    if (!holdsLoadersRows) return to;
    let limit = to;
    let sawInterruption = false;
    let sawMarker = false;
    for (let j = to - 1; j >= from; j--) {
      let row = messages[j];
      let isStopRow = isStopInterruptionRow(row);
      if (
        (row.type === "assistant" && (row.isApiErrorMessage !== true || j < initialLength)) ||
        isCompactBoundaryMessage(row) ||
        (row.type === "user" &&
          (row.isMeta !== true || (row.promptSource !== undefined && !isInterruptMarkerRow(row))) &&
          !isStopRow &&
          !weakSet.has(row) &&
          !isTurnCompanion(row) &&
          !isQueueTranscriptOnlyUserMessage(row) &&
          (row.promptSource !== undefined || localCommandTagKindOf(row) === undefined))
      )
        break;
      sawInterruption ||= isStopRow;
      sawMarker ||= isInterruptMarkerRow(row);
      limit = j;
    }
    return sawInterruption || sawMarker ? limit : to;
  }
  function appendHostRows(rows) {
    for (let row of rows) weakSet.add(row);
    messages.push(...rows);
  }
  return {
    record,
    appendHostRows,
    isHostRow: (row) => weakSet.has(row),
    evict,
    holdFoldCopy,
    settleFoldCopies,
    dropPreservedRowsNotInConversation,
    flushBeforeCompactBoundary,
    applyCompactBoundary,
    settlePreservedTail,
    flushUnanchoredPreservedTail: flushUnanchoredTail,
  };
}
//@ chunk-tyg7f3ek.js:430132-430390 placement
function takeShownAsStoredMark(message, askMark) {
  try {
    delete message.shownAsStoredIn;
    return message.isVirtual === true || message.handedOff === true ? undefined : askMark?.();
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
function markShownAsStored(message, shownAsStoredIn, hookOutputApplied) {
  try {
    if (!hookOutputApplied) message.shownAsStoredIn = shownAsStoredIn;
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
function sampleQueueLatency(timing) {
  try {
    if (
      !isVsCodeTopSession() ||
      Math.random() >= TIMING_SAMPLE_RATE ||
      timing.enqueuedWallMs === undefined ||
      timing.previousTurnEndedWallMs === undefined ||
      timing.enqueuedWallMs < timing.previousTurnEndedWallMs
    )
      return;
    logEvent("tengu_sdk_time_to_init", {
      waited_ms: Math.max(0, timing.startWallMs - timing.enqueuedWallMs),
      duration_ms: timing.startToInitMs,
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
async function runWithDeadline(run, lookMs, signal) {
  let abortMarker = Error("aborted");
  try {
    let outcome = await withDeadline(
      raceWithAbortSignal(Promise.resolve().then(run), signal, () => abortMarker).then((value) => ({
        value,
      })),
      lookMs,
    );
    return outcome
      ? {
          how: "done",
          value: outcome.value,
        }
      : {
          how: "late",
        };
  } catch (error) {
    return error === abortMarker
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
async function waitForDeviceBridgeTool(toolName, tools, toolUseContext, owner, settings = {}) {
  let connectedGraceMs = settings.pollMs ?? DEFAULT_POLL_INTERVAL_MS;
  let lookMs = settings.lookMs ?? DEFAULT_LOOKAHEAD_MS;
  let { signal } = toolUseContext.abortController;
  let now = Date.now();
  let serverWait = await waitForMcpToolServer(toolName, tools, toolUseContext, {
    connectedGraceMs,
  });
  function report(outcome, extra = {}) {
    let waitedMs = Date.now() - now;
    logForDebugging(
      `waitForDeviceBridgeTool: the wait for "${toolName}" ended as ${outcome} after ${waitedMs}ms`,
    );
    return {
      ...serverWait,
      ...extra,
      waitedMs,
      aborted: signal.aborted,
      bridgeEnd: outcome,
    };
  }
  let abortedResult = () =>
    report("aborted", {
      tool: undefined,
      tools,
    });
  if (serverWait.aborted || signal.aborted) return abortedResult();
  if (serverWait.tool) return report("in_pool");
  if (serverWait.serverState !== "connected")
    return report(serverWait.serverState === "unknown" ? "threw" : "not_connected");
  try {
    let resolvedName = aliasOrSelf(toolName, toolUseContext.options.toolAliases);
    let clients = () => findLongestPrefixClients(resolvedName, currentMcpClients(toolUseContext));
    let reportState = (outcome) =>
      report(outcome, {
        serverState: getMcpServerBaseUrlFromToolName(clients()),
      });
    let connection = clients().find((client) => client.type === "connected");
    if (!connection) return reportState("not_connected");
    let listOutcome = await runWithDeadline(
      () =>
        listMcpTools(connection, {
          signal,
          timeout: lookMs,
        }),
      lookMs,
      signal,
    );
    if (listOutcome.how === "aborted" || signal.aborted) return abortedResult();
    if (listOutcome.how === "late") return reportState("look_timed_out");
    if (listOutcome.how === "failed") {
      logForDebugging(
        `waitForDeviceBridgeTool: tools/list on the device bridge failed: ${describeConnectError(listOutcome.error, connection.config)}`,
        {
          level: "warn",
        },
      );
      return reportState("look_failed");
    }
    let tools_2 = listOutcome.value.tools;
    let hasTool =
      Array.isArray(tools_2) &&
      tools_2.some(
        (tool) =>
          typeof tool === "object" &&
          tool !== null &&
          "name" in tool &&
          typeof tool.name === "string" &&
          buildMcpToolName(connection.name, tool.name) === resolvedName,
      );
    let listingState = officeBridgeListingState(listOutcome.value);
    let missingToolOutcome =
      listingState === "stub"
        ? "stub"
        : listingState === "live"
          ? "live_without_tool"
          : "unmarked_without_tool";
    if (!hasTool && (listingState === "stub" || !listOutcome.value.nextCursor))
      return reportState(missingToolOutcome);
    let swapResult;
    let refreshOutcome = await runWithDeadline(
      () =>
        refreshMcpServerTools(
          connection,
          (previousTools, nextTools) => {
            swapResult = swapMcpServerTools(previousTools, nextTools, connection.config);
          },
          owner,
        ),
      lookMs,
      signal,
    );
    if (refreshOutcome.how === "aborted" || signal.aborted) return abortedResult();
    let refreshedTools = toolUseContext.options.refreshTools?.() ?? tools;
    let toolByName = findToolByName(refreshedTools, toolName, toolUseContext.options.toolAliases);
    if (toolByName)
      return report("after_look", {
        tool: toolByName,
        tools: refreshedTools,
      });
    logForDebugging(
      `waitForDeviceBridgeTool: refreshing the device bridge's tools did not bring "${toolName}" (${refreshOutcome.how === "failed" ? describeConnectError(refreshOutcome.error, connection.config) : refreshOutcome.how === "done" ? `${refreshOutcome.value.status}, ${swapResult === undefined ? "nothing swapped" : swapResult ? "swapped in" : "the swap was refused"}` : "not in time"})`,
      {
        level: "warn",
      },
    );
    let newTools =
      refreshOutcome.how === "done" && refreshOutcome.value.status === "refreshed"
        ? refreshOutcome.value.newTools
        : undefined;
    if (hasTool || (newTools && findToolByName(newTools, toolName, toolUseContext.options.toolAliases)))
      return reportState("listed_not_pooled");
    if (newTools) return reportState(missingToolOutcome);
    return reportState(refreshOutcome.how === "late" ? "look_timed_out" : "look_failed");
  } catch (error) {
    logError(error);
    return report("threw", {
      tool: undefined,
      tools,
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
  let findToolResult = (message) =>
    toolUseID !== undefined && message.type === "user" && Array.isArray(message.message?.content)
      ? message.message.content.find(
          (block) => block?.type === "tool_result" && block.tool_use_id === toolUseID,
        )
      : undefined;
  let message = messages.findLast((message) => findToolResult(message) !== undefined);
  let lastToolResult = message && findToolResult(message);
  let found = NON_EXECUTION_KINDS.find((kind) => message?.type === "user" && kind === message.toolDenialKind);
  let toolUseBlock =
    toolUseID !== undefined && Array.isArray(assistantMessage?.message?.content)
      ? assistantMessage.message.content.find((block) => block?.type === "tool_use" && block.id === toolUseID)
      : undefined;
  let tool =
    toolUseBlock && findTool(outcome.toolWait?.tools ?? turnStartTools, toolUseBlock.name, toolAliases);
  return {
    answer_behavior_kind: behavior === "allow" || behavior === "deny" ? behavior : "other",
    answer_outcome_kind: outcome.reExecuted ? "applied" : outcome.reason,
    call_result_kind:
      lastToolResult?.type !== "tool_result"
        ? "none"
        : (found ??
          (!lastToolResult.is_error ? "ok" : outcome.callStarted ? "error" : "error-not-started-here")),
    call_concurrency_kind:
      toolUseBlock === undefined
        ? "no_call"
        : tool === undefined
          ? "tool_not_loaded"
          : (() => {
                try {
                  let parsedInput = tool.inputSchema.safeParse(toolUseBlock.input);
                  return parsedInput.success && tool.isConcurrencySafe(parsedInput.data);
                } catch {
                  return false;
                }
              })()
            ? "safe"
            : "unsafe",
    call_is_for_device_bridge:
      typeof toolUseBlock?.name === "string" &&
      mcpInfoFromString(toolUseBlock.name)?.serverName === REMOTE_DEVICES,
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
          (message) =>
            message.type === "assistant" ||
            (message.type === "user" &&
              Array.isArray(message.message.content) &&
              message.message.content[0]?.type === "tool_result"),
        ) + 1,
      ),
      (message) => message.type === "attachment" && attachmentToMessages(message).messages.length > 0,
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
  let turnStartIndex = mutableMessages.length;
  let hasDeferredResult = () =>
    deferredToolUse !== undefined &&
    (orphanedPermission?.denyIsRefusal === true || isPermissionCardHoldEnabled()) &&
    hasToolResultAfter(mutableMessages, turnStartIndex, deferredToolUse.toolUseID);
  let buildOkResult = () =>
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
  let buildStoppedResult = () =>
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
    let lastUserMessage = lastUserAfterAssistant(mutableMessages);
    let permissionOutcome = yield* handleOrphanedPermission(
      orphanedPermission,
      tools,
      canUseTool,
      mutableMessages,
      processUserInputContext,
      waitForDeviceBridgeTool,
      answers,
    );
    if (!permissionOutcome.reExecuted) dropCcrTurnId();
    try {
      let deferredToolUse = resolveDeferredToolUse({
        behavior: orphanedPermission.permissionResult?.behavior,
        outcome: permissionOutcome,
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
    let waitFields = {
      waited_ms: permissionOutcome.toolWait?.waitedMs ?? 0,
      server_state: fromEnumOpt(permissionOutcome.toolWait?.serverState),
      server_state_at_start: fromEnumOpt(permissionOutcome.toolWait?.initialServerState),
      device_bridge_wait_end: fromEnumOpt(permissionOutcome.toolWait?.bridgeEnd),
      resumes_interrupted_turn: orphanedPermission.resumesInterruptedTurn === true,
    };
    let behavior = orphanedPermission.permissionResult?.behavior;
    let missingTool = permissionOutcome.reExecuted ? undefined : permissionOutcome.missingTool;
    let departureFields = {
      answer_behavior: fromEnum(behavior === "allow" || behavior === "deny" ? behavior : "other"),
      tool_departure_cause: fromEnumOpt(missingTool?.departureCause),
      server_transport: fromEnumOpt(missingTool?.serverTransport),
      server_is_device_bridge: missingTool?.serverIsDeviceBridge,
      server_tools_list_failed: missingTool?.serverToolsListFailed,
      server_tools_in_pool: fromEnumOpt(missingTool?.serverToolsInPool),
    };
    if (permissionOutcome.reExecuted)
      logEvent("tengu_orphaned_permission_applied", {
        found_on_reread: permissionOutcome.toolWait !== undefined,
        ...waitFields,
      });
    if (!permissionOutcome.reExecuted && permissionOutcome.reason === "closed_unrun")
      logEvent("tengu_orphaned_permission_closed_unrun", {
        ...waitFields,
        ...departureFields,
      });
    if (
      !permissionOutcome.reExecuted &&
      permissionOutcome.reason !== "closed_unrun" &&
      !hasPrompt &&
      (!deferredToolUse || hasDeferredResult())
    ) {
      if (permissionOutcome.reason === "aborted") return false;
      let unappliedFields = {
        reason: fromEnum(permissionOutcome.reason),
        ...waitFields,
        ...departureFields,
      };
      if (
        orphanedPermission.resumesInterruptedTurn &&
        !orphanedPermission.siblings?.length &&
        lastUserMessage
      ) {
        logForDebugging(
          "Orphaned permission could not be applied; it stood in for the interrupted turn it was parked on, so the turn proceeds to the model on the interrupted prompt",
        );
        logEvent("tengu_orphaned_permission_unapplied_turn_resumed", unappliedFields);
        return false;
      }
      logForDebugging(
        "Orphaned permission could not be applied, or left a served call unsettled, and the turn has no prompt: ending the turn without a model call",
      );
      logEvent("tengu_orphaned_permission_unapplied_turn_end", unappliedFields);
      yield buildOkResult();
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
    let handoffOutcome;
    try {
      handoffOutcome = yield* handleHandedOffTurn(
        handedOffTurn,
        tools,
        mutableMessages,
        processUserInputContext,
        canUseTool,
        beginTranscriptFlush,
        handoffRelay,
        async (stagedFiles) => {
          try {
            await taskListCatchUp.beforeRun();
          } finally {
            if (awaitStagedFiles)
              await measurePhase("resume_other", "resume_staged_files_wait", () =>
                awaitStagedFiles(stagedFiles),
              );
            await placeFilesByName?.(handedOffTurn, stagedFiles);
          }
        },
        placeCarriedWrites,
      );
    } finally {
      if (handoffRelay && handedOffTurn.relayMarker !== undefined && handedOffTurn.kind !== "stopped")
        try {
          handoffRelay.noteHandoffMarkerFate(
            handedOffTurn.kind,
            handoffOutcome === undefined ? "unfinished" : handoffOutcome.ran ? "ran" : handoffOutcome.reason,
          );
        } catch (error) {
          logError(error);
        }
    }
    await taskListCatchUp.catchUp(isHandoffTurnSettled(handoffOutcome));
    if (handoffOutcome.ran) onHandedOffCallsRan(handoffOutcome.contextLayers);
    logEvent("tengu_turn_handoff_run", {
      ran: handoffOutcome.ran,
      reason: fromEnumOpt(handoffOutcome.ran ? undefined : handoffOutcome.reason),
      kind: fromEnum(handedOffTurn.kind),
      tool_uses: handedOffTurn.toolUseIDs.length,
      carried_messages: handedOffTurn.messages.length,
      has_memory_context: handedOffTurn.memoryLine !== undefined,
      has_relay_marker: handedOffTurn.relayMarker !== undefined,
      attachment_rows_ahead: attachmentRowsAhead,
    });
    if (
      !handoffOutcome.ran &&
      (handedOffTurn.kind === "stopped" ||
        handoffOutcome.reason === "stopped_closed" ||
        handoffOutcome.reason === "stopped_unconfirmed")
    ) {
      yield buildStoppedResult();
      return true;
    }
    if (!handoffOutcome.ran && handoffOutcome.reason === "history_appended") {
      yield buildOkResult();
      return true;
    }
    if (!handoffOutcome.ran && !hasPrompt && !deferredToolUse) {
      yield buildOkResult();
      return true;
    }
  }
  if (!deferredToolUse) return false;
  dropCcrTurnId();
  clearContextKey();
  clearTurnTraceContexts();
  let deferredResult = (call, isError) =>
    buildResultMessage({
      startedAt: earlyResult.startedAt,
      common: {
        is_error: isError,
        duration_api_ms: 0,
        num_turns: mutableMessages.length,
        stop_reason: isError ? "tool_deferred_unavailable" : "tool_deferred",
        session_id: getSessionId(),
        total_cost_usd: getTotalCostUSD(),
        usage: earlyResult.usage,
        modelUsage: getModelUsage(),
        permission_denials: earlyResult.permissionDenials,
        ...(isError && {
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
        ...((isError || !hasPrompt) && earlyResult.sendEcho),
        ...((isError || !hasPrompt) && earlyResult.resumeReasonStamp),
        deferred_tool_use: {
          id: call.toolUseID,
          name: call.toolName,
          input: call.toolInput,
        },
      },
    });
  if (hasDeferredResult()) {
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
    yield deferredResult(deferredToolUse, true);
    return true;
  }
  let resumedCall = yield* resumeDeferredToolUse(
    deferredToolUse,
    canUseTool,
    mutableMessages,
    processUserInputContext,
  );
  if (!resumedCall) return false;
  if (persistSession)
    await recordTranscript(
      mutableMessages,
      undefined,
      undefined,
      undefined,
      processUserInputContext.storageV5,
    );
  yield deferredResult(resumedCall, false);
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
var getCoordinatorUserContext_2; // deferred: loads other modules while loading; runs once its import cycle is complete
deferInit("chunk-tyg7f3ek.js:440808", () => {
  getCoordinatorUserContext_2 = require("./coordinator/coordinatorMode.js").getCoordinatorUserContext;
});
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
  let renderedBasePrompt = withCliSections(baseSystemPromptOf(customSystemPrompt, defaultSystemPrompt), {
    tools,
    memoryMechanicsPrompt,
    appendSystemPrompt: undefined,
  });
  let appendHeadResult = appendSystemPromptHead
    ? renderAppendPromptHead(
        renderedBasePrompt,
        appendSystemPrompt,
        appendSystemPromptHead,
        shouldUseGlobalCacheScope(),
      )
    : undefined;
  let appendPromptText = appendHeadResult ? appendHeadResult.append : appendSystemPrompt;
  return {
    systemPrompt: asSystemPrompt([
      ...(appendHeadResult ? appendHeadResult.base : renderedBasePrompt),
      ...(appendPromptText ? [appendPromptText] : []),
    ]),
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
  let transportBacked = isTransportBacked(session);
  let uiSurfaceCapabilitySource = () => ({
    redactsWhatItPersists: transportBacked,
    isRemoteTransport: transportStateByHost.of(session).active?.isRemoteTransport() === true,
    sessionWriters: transportStateByHost.of(session).active?.sessionWriters(),
  });
  let message = buildSystemInitMessage({
    ...(transportBacked ? buildRemoteSystemInitFields() : buildSystemInitFields()),
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
    plugins: transportBacked ? [] : plugins.enabled,
    additionalDirectories: transportBacked
      ? undefined
      : additionalDirectoriesForInit(proactivityState.toolPermissionContext),
    pluginErrors: transportBacked
      ? []
      : [...plugins.errors, ...pluginsSyncErrors(session)]
          .filter(isMarketplacePluginError)
          .map((pluginError) => {
            let pluginPath = pluginNameOfError(pluginError);
            return {
              plugin: pluginError.source,
              type: pluginError.type,
              message: pluginErrorText(pluginError),
              ...(pluginPath !== undefined && {
                path: pluginPath,
              }),
            };
          }),
    mcpServerErrors: transportBacked ? [] : getSkippedDynamicServers(),
    pluginWarnings: transportBacked
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
      ...(transportBacked ? [] : [MCP_READ_RESOURCE_V1]),
      ...(transportBacked ? [] : [MCP_TOOL_UI_META_V1]),
      ...uiSurfaceCapabilities(uiSurfaceCapabilitySource),
      ...uiHookedCapabilities(uiSurfaceCapabilitySource),
      ...(persistsWithoutRedaction(uiSurfaceCapabilitySource()) ? [MCP_CALL_RESULT_NOT_FOR_MODEL_V1] : []),
      ...(isReadFileAsWrittenServed(session) ? [READ_FILE_AS_WRITTEN_V1] : []),
      ...emptyMarkerList(),
      ...(shouldOfferLinuxSandboxHint(tools) ? [START_SHELL_TASK_V1] : []),
      ...[],
    ],
  });
  recordInitTiming(message, startTime);
  return message;
}
//@ chunk-tyg7f3ek.js:443633-446804 placement
/**
 * 构造 headless 模式的 ToolUseContext（文件历史、AppState 读写、SDK 状态回调等）。
 */
function createHeadlessToolUseContext(sessionDeps, phaseConfig) {
  let { getAppState, setAppState, setSDKStatus, tools } = sessionDeps;
  let getFileHistory = () => getAppState().fileHistory;
  let applyFileHistoryOp = (op) => {
    setAppState((appState) => {
      let nextFileHistory = reduceFileHistoryState(appState.fileHistory, op, sessionDeps.storageV5);
      if (nextFileHistory === appState.fileHistory) return appState;
      return {
        ...appState,
        fileHistory: nextFileHistory,
      };
    });
  };
  return {
    renderedSystemPrompt: sessionDeps.renderedSystemPrompt,
    messages: phaseConfig.messages,
    messageQueue: sessionDeps.messageQueue,
    session: sessionDeps.session,
    turnStartIndex: 0,
    primitiveToolGrant: sessionDeps.primitiveToolGrant,
    ...(phaseConfig.phase === "query" && {
      permissionLayers: phaseConfig.permissionLayers,
    }),
    setMessages: phaseConfig.phase === "input" ? phaseConfig.setMessages : () => {},
    applyMessageOp: phaseConfig.phase === "input" ? phaseConfig.applyMessageOp : () => {},
    onChangeAPIKey: () => {},
    onPermissionDenial: sessionDeps.onPermissionDenial,
    requestDialog: sessionDeps.requestDialog,
    permissionRelays: NO_BRIDGE_CONSENT,
    sessionState: sessionDeps.sessionState,
    agentContext: mainAgentContext(),
    options: {
      commands: sessionDeps.commands,
      debug: false,
      tools,
      toolCatalog: sessionDeps.toolCatalog ?? TOOL_CATALOG,
      refreshTools: sessionDeps.refreshTools,
      refreshMcpClients: sessionDeps.refreshMcpClients,
      verbose: sessionDeps.verbose,
      mainLoopModel: phaseConfig.mainLoopModel,
      fallbackModel: sessionDeps.fallbackModel,
      thinkingConfig: sessionDeps.thinkingConfig,
      mcpClients: sessionDeps.mcpClients,
      mcpResources: {},
      ideInstallationStatus: null,
      isNonInteractiveSession: true,
      runQuery: query,
      customSystemPrompt: sessionDeps.customSystemPrompt,
      ...(sessionDeps.customSystemPrompt !== undefined && {
        omitGitStatus: true,
      }),
      appendSystemPrompt: sessionDeps.appendSystemPrompt,
      planModeInstructions: sessionDeps.planModeInstructions,
      systemPromptSnapshot: sessionDeps.systemPromptSnapshot,
      appendSubagentSystemPrompt: sessionDeps.appendSubagentSystemPrompt,
      toolAliases: sessionDeps.toolAliases,
      excludeDynamicSections: sessionDeps.excludeDynamicSections,
      agentDefinitions: {
        activeAgents: sessionDeps.agents,
        allAgents: [],
        allowedAgentTypes: sessionDeps.allowedAgentTypes,
      },
      theme: resolveThemeSetting(resolveSetting("theme", "dark").value),
      maxBudgetUsd: sessionDeps.maxBudgetUsd,
      messageClientPlatform: sessionDeps.messageClientPlatform,
      messageInboundOrigin: sessionDeps.messageInboundOrigin,
      forwardSubagentText: sessionDeps.forwardSubagentText,
      ...(phaseConfig.phase === "query" && {
        activeSkill: phaseConfig.activeSkill,
      }),
      requiresStructuredOutput: sessionDeps.requiresStructuredOutput,
      autoCompactWindow: phaseConfig.appState.autoCompactWindow,
      fastMode: phaseConfig.appState.fastMode,
      cacheBreakerPhrase: phaseConfig.appState.cacheBreakerPhrase,
      activeGoal: phaseConfig.appState.activeGoal,
      ultraplanSessionUrl: phaseConfig.appState.ultraplanSessionUrl,
    },
    getAppState,
    setAppState,
    ...createAppStateAccessors(getAppState, setAppState),
    queuedNotificationsRegistry: createNotificationDrain(getAppState, setAppState, sessionDeps.session),
    taskRegistry: createTaskFramework(getAppState, setAppState),
    sessionHooksRegistry: sessionDeps.sessionHooks,
    teammateColors: createColorAssigner(fieldAccessor(getAppState, setAppState, "teammateColors")),
    rootToolSurface: {
      tools,
      mainLoopModel: phaseConfig.mainLoopModel,
    },
    abortController: phaseConfig.abortController,
    readFileState: sessionDeps.readFileState,
    nestedMemoryAttachmentTriggers: [],
    pendingNestedMemoryTriggers: sessionDeps.pendingNestedMemoryTriggers,
    sessionEnvVars: sessionDeps.sessionEnvVars,
    toolState: sessionDeps.toolState,
    toolDecisions: new Map(),
    dynamicSkillDirTriggers: [],
    memorySelector: sessionDeps.memorySelector,
    isolationLatch: sessionDeps.isolationLatch,
    storageV5: sessionDeps.storageV5,
    credentials: sessionDeps.credentials,
    getFileHistoryState: getFileHistory,
    applyFileHistoryOp,
    ...(phaseConfig.phase === "input" && {
      makeFileHistorySnapshot: async (snapshotArgs) => {
        if (!phaseConfig.persistSession) return;
        await fileHistoryMakeSnapshot(getFileHistory, applyFileHistoryOp, snapshotArgs, {
          preCheckpoint: true,
        });
      },
    }),
    applyAttributionOp: (op) => {
      setAppState((appState) => {
        let nextAttribution = restoreAttributionStateFromSnapshots(appState.attribution, op);
        if (nextAttribution === appState.attribution) return appState;
        return {
          ...appState,
          attribution: nextAttribution,
        };
      });
    },
    onCompactEvent: (event) => {
      if (event.type === "sdk_status") setSDKStatus?.(event.status, event.metadata);
    },
    onQueryEvent: (event) => {
      if (event.type === "apply_flag_settings") applySessionSettingsPatch(event.settings, setAppState);
      else if (event.type === "conversation_reset") {
        sessionDeps.sessionState?.notifyConversationReset();
        notifyToolsKept(sessionDeps.sessionState);
      }
    },
  };
}
//@ chunk-tyg7f3ek.js:446804-446865 placement
function setCwdOrPin(cwd, toolUseContext) {
  try {
    setCwd(cwd, toolUseContext);
    return;
  } catch (error) {
    return pinMissingWorkingDirectory(error, toolUseContext);
  }
}
//@ chunk-tyg7f3ek.js:446865-446943 placement
async function setCwdV5OrPin(cwd, session, context) {
  try {
    await setCwdV5(cwd, session, context);
    return;
  } catch (error) {
    return pinMissingWorkingDirectory(error, session);
  }
}
//@ chunk-tyg7f3ek.js:446943-447452 placement
function pinMissingWorkingDirectory(error, toolUseContext) {
  if (!(error instanceof MissingWorkingDirectoryError)) throw error;
  toolUseContext.setCwd(error.path);
  setCwdForCallChain(error.path);
  logForDebugging(
    `[headless] working directory ${error.path} no longer exists; the turn starts pinned to it`,
    {
      level: "warn",
    },
  );
  let pinState = missingWorkingDirectoryPins.of(toolUseContext);
  if (pinState.pinned) return;
  pinState.pinned = true;
  try {
    logEvent("tengu_shell_set_cwd", {
      success: false,
      missing_at_turn: true,
    });
  } catch {}
  let pathSuffix = isTransportBacked(toolUseContext) ? "" : ` ${error.path}`;
  return informationalSystemMessage(
    createSystemMessage(
      `The session's working directory${pathSuffix} no longer exists; shell commands cannot start there and relative file paths that use it will fail until it is restored.`,
      "warning",
    ),
  );
}
//@ chunk-tyg7f3ek.js:447452-447567 placement
function declaredToolSetFor(tools, predicate, turnState) {
  return new DeclaredToolSet(
    tools.filter((tool) => predicate(tool) && isToolDeclaredForTurn(tool, tools, turnState)),
    {
      only: new Map(),
      order: [],
      names: tools.map((tool) => tool.name),
    },
  );
}
//@ chunk-tyg7f3ek.js:447567-447963 placement
function resolveToolSearchForTurn(tool, tools, turnState) {
  turnState.requestsHaveToolSearch ??=
    isToolSearchEnabledOptimistic() &&
    !isToolSearchPrecluded(turnState.model(), tools) &&
    !toolSearchRejectedOn(getStickyBetas(), turnState.model());
  if (!turnState.requestsHaveToolSearch) return "harmful";
  if (isToolDeclaredForTurn(tool, tools, turnState))
    return turnState.isNewConversation && isFoamySpringEnabled_2() ? "free" : "harmful";
  turnState.loaded ??= extractDiscoveredToolNames(turnState.messages, {
    surfaced: {
      exceptAnnouncements: new Set(),
    },
  });
  if (!isDeferredTool(tool, turnState.nonDeferrableBuiltins) || turnState.loaded.has(tool.name))
    return deferredToolsKeptCached() ? "costly" : "harmful";
  return turnState.held === undefined ? "costly" : "free";
}
//@ chunk-tyg7f3ek.js:447963-448257 placement
function isToolDeclaredForTurn(tool, tools, turnState) {
  let nonDeferrableBuiltins = (turnState.nonDeferrableBuiltins ??= getNonDeferrableBuiltins());
  if (turnState.held === undefined && turnState.aboutToHold === undefined)
    turnState.aboutToHold =
      computeDeclaredToolSet(
        getStickyBetas(),
        tools,
        (tool) => isDeferredTool(tool, nonDeferrableBuiltins),
        turnState.model(),
        turnState.isNewConversation &&
          !messagesSinceCompactBoundary(turnState.messages).some((message) => message.type === "assistant"),
      ) ?? null;
  return !isDeferredToolInConversation(tool, turnState.held ?? turnState.aboutToHold ?? undefined, tools, {
    nonDeferrableBuiltins,
  });
}
//@ chunk-tyg7f3ek.js:448257-448270 placement
var DEVICE_BRIDGE_TOOL_WAIT_MS = 60000;
//@ chunk-tyg7f3ek.js:448342-448521 sole-consumer
function readTurnSignals(turnStartClock, frameTiming, nowPerfMs, nowWallMs) {
  if (
    turnStartClock === undefined ||
    frameTiming?.turnStartMark === undefined ||
    frameTiming.receivedWallMs === undefined
  )
    return;
  try {
    return turnStartClock.readSince(
      frameTiming.turnStartMark,
      nowPerfMs,
      nowWallMs - frameTiming.enqueuedWallMs,
    );
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-tyg7f3ek.js:448521-483526 placement
function QueryEngine(sessionConfig) {
  clearClassifierContext();
  let { getAppState, setAppState } = sessionConfig;
  let initialMessages = sessionConfig.initialMessages ?? [];
  let conversation =
    sessionConfig.conversation ??
    orderedRowSource({
      keep: (rows) => {
        initialMessages.push(...rows);
      },
      rows: () => initialMessages,
      list: initialMessages,
      isHookable: true,
    });
  let announceBeforePrompt = Boolean(env.CLAUDE_CODE_SESSION_START_ANNOUNCEMENTS_BEFORE_PROMPT);
  let androidEvidence = androidEvidenceByHost.of(sessionConfig.session.host);
  androidEvidence.absorb(initialMessages);
  let readFileCache = sessionConfig.readFileCache;
  let sessionEnvVars = sessionConfig.sessionEnvVars ?? new Map();
  let isolationLatch = sessionConfig.isolationLatch ?? createIsolationLatch();
  let toolState = sessionConfig.toolState ?? new InstanceRegistry();
  let sessionHooks = sessionConfig.sessionHooks ?? createSessionHooksRegistry();
  let any = initialMessages.some(
    (initialMessage) =>
      initialMessage.type === "assistant" || (initialMessage.type === "user" && !initialMessage.isMeta),
  );
  let gatewayNoticeShown = false;
  let memorySelector = sessionConfig.memorySelector ?? emptyPickerState();
  let userSpecifiedModel = sessionConfig.userSpecifiedModel;
  let activeFastMode;
  let abortController = createAbortController();
  function abortIfParentAborted() {
    let signal = sessionConfig.abortController?.signal;
    if (signal?.aborted) abortController.abort(signal.reason);
  }
  function onParentAbort() {
    abortController.abort(sessionConfig.abortController?.signal.reason);
  }
  sessionConfig.abortController?.signal.addEventListener("abort", onParentAbort, {
    once: true,
  });
  abortIfParentAborted();
  function abortTurn(reason = "remote-cancel") {
    abortController.abort(userAbortReason(reason));
    abortController = createAbortController();
    abortIfParentAborted();
  }
  let pendingParams = null;
  let pendingTurnError;
  function takeTurnError() {
    let turnError = pendingTurnError;
    pendingTurnError = undefined;
    return turnError;
  }
  let inputStream = new Stream();
  let queryEngine = createQueryEngine({
    run: query,
    queryParams: async () => {
      if (pendingParams === null) throw Error("headless session: turn picked up without prepared params");
      let params = pendingParams;
      pendingParams = null;
      return params;
    },
    hostOwnsPermissionMode: true,
    sdkResultVerdict: true,
    fastModeState: () =>
      activeFastMode === undefined
        ? undefined
        : getFastModeState(activeFastMode.model, activeFastMode.enabled),
    fastModeDisabledReason: () =>
      getFastModeUnavailableReasonCode() ??
      (activeFastMode && getFastRejectedReason(activeFastMode.model, activeFastMode.enabled)) ??
      undefined,
    onCommandLifecycle: sessionConfig.onCommandLifecycle,
    onTurnThrow: (error) => {
      pendingTurnError = error;
    },
  });
  queryEngine.streamInput(inputStream).catch(logError);
  let turnEventRows = [];
  let settledNoteRows = [];
  let turnStreamBridge = createTurnStreamBridge((rows) => {
    turnEventRows.push(...rows);
  });
  let openTurnSpans = new Set();
  let turnEventsSettleMs = sessionConfig.turnEventsSettleMs ?? DEVICE_BRIDGE_TOOL_WAIT_MS;
  let eventsYieldedInput = false;
  function runSafely(label, logModsFirstTurn, fallbackValue) {
    try {
      return logModsFirstTurn();
    } catch (error) {
      logForDebugging(
        `headless session: ${label} failed, the turn goes on without it: ` + errorMessage(error),
        {
          level: "error",
        },
      );
      return fallbackValue;
    }
  }
  async function settleTurnEvents() {
    let abortController = new AbortController();
    try {
      let outcome = await withDeadline(
        Promise.race([
          turnStreamBridge
            .settled()
            .then(() => opsDelivered())
            .then(() => "settled"),
          abortTurnSignal(sessionConfig.messageQueue, abortController.signal).then(() => "yielded"),
        ]),
        turnEventsSettleMs,
      );
      eventsYieldedInput = outcome === "yielded";
      if (outcome === undefined) {
        turnStreamBridge.sever();
        runSafely("the mods' first-turn row at the cut", logModsFirstTurn, undefined);
        logForDebugging(
          `headless session: turn events still running after ${turnEventsSettleMs}ms; the turn ends without them and their late notes are dropped`,
          {
            level: "warn",
          },
        );
      } else if (outcome === "yielded")
        logForDebugging(
          "headless session: a turn event hook queued input; the turn ends so it can run, and the events settle with the turn that runs it",
        );
    } catch (error) {
      eventsYieldedInput = false;
      logForDebugging(`headless session: settling the turn events failed: ${errorMessage(error)}`, {
        level: "warn",
      });
    } finally {
      abortController.abort();
    }
    return turnEventRows.splice(0);
  }
  async function recordTurnNotes(turnRecord, transcript, shouldPersist, shouldFlush) {
    settledNoteRows = await settleTurnEvents();
    if (settledNoteRows.length === 0) return;
    try {
      settledNoteRows = [...(await appendRowsWithHooks(conversation, settledNoteRows))];
      transcript.push(...settledNoteRows);
      if (shouldPersist) {
        await turnRecord.record(true);
        if (shouldFlush) await flushSessionStorage();
      }
    } catch (error) {
      logForDebugging("headless session: recording the turn's notes failed: " + errorMessage(error), {
        level: "error",
      });
    }
  }
  let seenUuids = new Set(snapshotUuids(initialMessages));
  function handlePromptSnapshot(customSystemPrompt, appendSystemPrompt, systemPromptSnapshot) {
    let takeDelivered = false;
    try {
      takeDelivered =
        customSystemPrompt !== undefined &&
        customSystemPrompt !== "" &&
        sessionConfig.takeSystemPromptDelivered?.() === true;
      let promptNeedsSnapshot =
        takeDelivered &&
        shouldSnapshotSystemPrompt({
          systemPromptSnapshot,
        }) &&
        !snapshotContainsPrompt(messagesSinceCompactBoundary(initialMessages), customSystemPrompt);
      let recentMessages = messagesSinceCompactBoundary(initialMessages);
      let last = snapshotUuids(recentMessages).at(-1);
      let liveAppendTag =
        sessionConfig.liveAppendSections !== undefined &&
        (appendSystemPrompt || (last !== undefined && seenUuids.has(last))) &&
        shouldSnapshotSystemPrompt({
          systemPromptSnapshot,
        })
          ? tagBlockChange(recentMessages, appendSystemPrompt, sessionConfig.liveAppendSections)
          : undefined;
      if (promptNeedsSnapshot || liveAppendTag !== undefined) {
        let appendedRows = appendRowsWithHooks(conversation, [lazyToolAttachment()]);
        if (appendedRows instanceof Promise) appendedRows.catch(logError);
        noteSystemPromptSectionInvalidation(
          promptNeedsSnapshot ? "sdk_system_prompt" : "host_append_section",
        );
      }
      if (liveAppendTag !== undefined) sessionConfig.onLiveAppendSectionChange?.(liveAppendTag);
      if (takeDelivered) {
        takeDelivered = false;
        logFeatureOk("prompt_snapshot_host_supersede", {
          prompt_rerendered: promptNeedsSnapshot,
        });
      }
      if (promptNeedsSnapshot) sessionConfig.onHostPromptSupersedesRecord?.();
    } catch (error) {
      logError(error);
      if (takeDelivered) logFeatureBad("prompt_snapshot_host_supersede", "threw");
    }
  }
  let turnInFlight = false;
  let initSent = false;
  let lastTurnEndWallMs;
  let neverParentUuid;
  let turnRecorder;
  let deferredRows;
  function keepRows(rows) {
    if (deferredRows !== undefined) {
      deferredRows.push({
        rows,
        isAnswered: true,
      });
      return;
    }
    conversation.keep(rows);
    turnRecorder?.appendHostRows(rows);
  }
  function appendRows(rows) {
    let appended = appendRowsWithHooks(conversation, rows, {
      keep: keepRows,
    });
    if (appended instanceof Promise) appended.catch(logError);
  }
  function flushDeferredRows() {
    let queued = deferredRows;
    deferredRows = undefined;
    for (let { rows, isAnswered } of queued ?? [])
      if (isAnswered) keepRows(rows);
      else appendRows(rows);
  }
  let heldSnapshotRows;
  function releaseHeldRows(shouldKeep) {
    let held = heldSnapshotRows;
    if (held === undefined || held.length === 0) return;
    try {
      if (shouldKeep) {
        let last = initialMessages.findLast(
          (initialMessage) => initialMessage.type === "assistant" || initialMessage.type === "user",
        );
        if (!(
          last?.type === "assistant" &&
          !last.isApiErrorMessage &&
          last.message.content.every((block) => block.type !== "tool_use") &&
          last.message.content.some(
            (block) =>
              block.type === "text" && block.text.trim() !== "" && block.text.trim() !== NO_CONTENT_MESSAGE,
          )
        ))
          return;
      }
      heldSnapshotRows = [];
      appendRows(held);
    } catch (error) {
      logError(error);
    }
  }
  async function* submitMessage(input, turnOptions) {
    if (turnInFlight) throw Error("headless session: a turn is already in flight");
    turnInFlight = true;
    if (abortController.signal.aborted) {
      abortController = createAbortController();
      abortIfParentAborted();
    }
    let turnAbortController = abortController;
    let turnStartWallMs = lastTurnEndWallMs;
    let signal = turnOptions?.abortController?.signal;
    function abortFromCaller() {
      turnAbortController.abort(signal?.reason);
    }
    if (signal?.aborted) abortFromCaller();
    else
      signal?.addEventListener("abort", abortFromCaller, {
        once: true,
      });
    try {
      try {
        setAutoModeUnavailableStopNotice(undefined);
      } catch (error) {
        logError(error);
      }
      settledNoteRows = [];
      if (!eventsYieldedInput) turnEventRows.length = 0;
      if (turnOptions?.withdrawnFileUuids?.length)
        reconcileSavedFilesForTurn(initialMessages, turnOptions.withdrawnFileUuids);
      yield* runTurn(input, turnOptions, turnAbortController);
      for (let noteRow of settledNoteRows)
        if (noteRow.type === "system" && noteRow.subtype === "informational")
          yield informationalSystemMessage(noteRow);
    } finally {
      signal?.removeEventListener("abort", abortFromCaller);
      flushDeferredRows();
      turnRecorder = undefined;
      releaseHeldRows(false);
      heldSnapshotRows = undefined;
      turnInFlight = false;
      endProfile();
      if (lastTurnEndWallMs === turnStartWallMs) lastTurnEndWallMs = Date.now();
    }
  }
  let clientDisallowedTools = [];
  function applyTurnDenials(names, extraDisallowed = []) {
    let { setToolPermissionContext } = createPermissionContextSetters(setAppState);
    let heldToolSet;
    let promptSnapshot;
    let turnDisallowed;
    getStickyBetas().turnDeniedTools = undefined;
    try {
      heldToolSet = asDeclaredToolSet(getStickyBetas());
      promptSnapshot =
        names.length === 0 || heldToolSet !== undefined ? undefined : latestPromptSnapshot(initialMessages);
      turnDisallowed = getAppState().toolPermissionContext.alwaysDenyRules.command ?? [];
      if (names.length > 0 && heldToolSet === undefined) {
        applyTurnDisallowedTools(setToolPermissionContext, []);
        if (promptSnapshot === undefined)
          turnDisallowed = getAppState().toolPermissionContext.alwaysDenyRules.command ?? [];
      }
      if (promptSnapshot !== undefined) {
        adoptSnapshotTools(promptSnapshot);
        heldToolSet = asDeclaredToolSet(getStickyBetas());
      }
      let toolsCache;
      let turnState = {
        held: heldToolSet,
        messages: initialMessages,
        isNewConversation:
          heldToolSet === undefined && promptSnapshot === undefined && !getStickyBetas().declaredToolsDecided,
        model: () =>
          resolveTurnModelAndThinking({
            userSpecifiedModel,
            permissionMode: getAppState().toolPermissionContext.mode,
            thinkingConfig: resolveLazy(sessionConfig.thinkingConfig),
          }).mainLoopModel,
      };
      let deniedTools = filterTurnDisallowedTools(
        names,
        turnDisallowed,
        () => (toolsCache ??= sessionConfig.refreshTools?.() ?? resolveLazy(sessionConfig.tools)),
        (toolName) => heldToolSet?.has(toolName) ?? promptSnapshot?.toolDescriptions.has(toolName) ?? false,
        (tool, toolList) => resolveToolSearchForTurn(tool, toolList, turnState),
      );
      if (heldToolSet === undefined && deniedTools.length > 0) {
        toolsCache ??= sessionConfig.refreshTools?.() ?? resolveLazy(sessionConfig.tools);
        getStickyBetas().turnDeniedTools = declaredToolSetFor(
          toolsCache,
          (tool) =>
            isToolDisallowedThisTurn(
              {
                turnDisallowedTools: deniedTools,
              },
              tool,
            ),
          turnState,
        );
      }
      applyTurnDisallowedTools(setToolPermissionContext, uniq([...extraDisallowed, ...deniedTools]));
    } catch (error) {
      logError(error);
      try {
        let deniedNames = turnDisallowed ?? getAppState().toolPermissionContext.alwaysDenyRules.command ?? [];
        applyTurnDisallowedTools(
          setToolPermissionContext,
          uniq([
            ...extraDisallowed,
            ...names.filter(
              (toolName) =>
                deniedNames.includes(toolName) ||
                (heldToolSet?.has(toolName) ?? promptSnapshot?.toolDescriptions.has(toolName) ?? false),
            ),
          ]),
        );
        logFeatureSad("headless_turn_deny", "judging_threw");
      } catch (error) {
        logError(error);
      }
    }
  }
  function adoptSnapshotTools(snapshot) {
    try {
      let conversation = getStickyBetas();
      if (
        conversation.declaredToolsDecided ||
        sessionConfig.refreshTools === undefined ||
        !shouldSnapshotSystemPrompt({
          systemPromptSnapshot: resolveLazy(sessionConfig.systemPromptSnapshot),
        })
      )
        return;
      let declaredToolSet = resolveDeclaredToolSet(
        conversation,
        () => ({
          names: snapshot.toolDescriptions.keys(),
          servers: snapshot.toolServers,
          entries: snapshot.toolEntries,
        }),
        sessionConfig.refreshTools(),
        {
          latch: false,
          permissionContext: getAppState().toolPermissionContext,
        },
      );
      if (
        declaredToolSet !== undefined &&
        [...snapshot.toolDescriptions.keys()].every((key) => declaredToolSet.has(key))
      )
        conversation.declaredTools ??= declaredToolSet;
    } catch (error) {
      logError(error);
    }
  }
  async function* runTurn(input, turnOptions, turnAbortController) {
    let typedPersonPromise = isTypedPersonPrompt(
      sessionConfig.session.host,
      input,
      turnOptions,
      turnAbortController.signal,
    );
    if (typedPersonPromise !== undefined) await typedPersonPromise;
    let turnStartClock = turnOptions?.turnStartClock;
    useMessageActions(turnStartClock, "tool_reread");
    try {
      markOwnClientPrompt(toolState, turnOptions?.clientPlatform);
      noteTurnClientPlatform(sessionConfig.session, turnOptions?.clientPlatform);
    } catch (error) {
      logError(error);
    }
    clientDisallowedTools = turnOptions?.clientDisallowedTools ?? clientDisallowedTools;
    if (turnOptions?.shouldQuery !== false && turnOptions?.skipSkillPermissionReset !== true)
      applyTurnDenials(
        turnOptions?.keepsDisallowedTools === true
          ? clientDisallowedTools
          : (turnOptions?.disallowedTools ?? []),
      );
    let totalUsage = EMPTY_USAGE;
    let toolList = sessionConfig.refreshTools?.() ?? resolveLazy(sessionConfig.tools);
    let commands = resolveLazy(sessionConfig.commands);
    let mcpClientsSource = sessionConfig.refreshMcpClients?.() ?? resolveLazy(sessionConfig.mcpClients);
    let agents = resolveLazy(sessionConfig.agents);
    let allowedAgentTypes = resolveLazy(sessionConfig.allowedAgentTypes);
    let primitiveToolGrant = resolveLazy(sessionConfig.primitiveToolGrant);
    let jsonSchema = resolveLazy(sessionConfig.jsonSchema);
    let customSystemPrompt = resolveLazy(sessionConfig.customSystemPrompt);
    let appendSystemPrompt = resolveLazy(sessionConfig.appendSystemPrompt);
    let planModeInstructions = resolveLazy(sessionConfig.planModeInstructions);
    let systemPromptSnapshot = resolveLazy(sessionConfig.systemPromptSnapshot);
    handlePromptSnapshot(customSystemPrompt, appendSystemPrompt, systemPromptSnapshot);
    let appendSubagentSystemPrompt = resolveLazy(sessionConfig.appendSubagentSystemPrompt);
    let toolAliases = resolveLazy(sessionConfig.toolAliases);
    let excludeDynamicSections = resolveLazy(sessionConfig.excludeDynamicSections);
    let forwardSubagentText = resolveLazy(sessionConfig.forwardSubagentText) ?? false;
    let { storageV5 } = sessionConfig;
    let cwdNotice;
    useMessageActions(turnStartClock, "cwd");
    if (sessionConfig.cwd !== null) {
      let cwd = resolveLazy(sessionConfig.cwd);
      if (isStorageV5Enabled() && storageV5 !== undefined)
        cwdNotice = await setCwdV5OrPin(cwd, sessionConfig.session, storageV5);
      else cwdNotice = setCwdOrPin(cwd, sessionConfig.session);
    }
    if (cwdNotice !== undefined) yield cwdNotice;
    rearmCreditsExhaustedNotice();
    let persistSession = !isSessionPersistenceDisabled();
    let startTime = performance.now();
    let now = Date.now();
    beginProfile();
    let turnSignals = readTurnSignals(turnStartClock, turnOptions?.frameTiming, startTime, now);
    useMessageActions(turnStartClock, "earlier_turn", startTime);
    if (turnOptions?.shouldQuery !== false) {
      startFirstRequestGate(sessionConfig.session, toolList);
      try {
        kickTurnEndCheckMemCtx(sessionConfig.session, {
          credentials: sessionConfig.credentials,
          storageV5,
        });
      } catch (error) {
        logForDebugging(
          `memory snapshot kick failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    let uuid =
      turnOptions?.uuid && (turnOptions.uuidIsClientEventUuid || !turnOptions.isMeta)
        ? turnOptions.uuid
        : undefined;
    let record = buildRunningTurnRecord(
      uuid,
      turnOptions?.resumeReason === undefined
        ? turnOptions?.userMessageUuids
        : answeredMergedUuids(initialMessages, turnOptions.userMessageUuids, turnOptions.alsoLeftToThisReRun),
      {
        primaryIsMeta: turnOptions?.isMeta === true,
        resultsAlsoList: turnOptions?.handedOffTurnUserMessageUuids,
        standIn: turnOptions?.userMessageUuids?.at(-1),
        wasPutBack: (messageUuid) => wasPutBackSafe(sessionConfig.messageQueue, messageUuid),
      },
    );
    let resumeReasonStamp =
      turnOptions?.resumeReason !== undefined
        ? {
            resume_reason: turnOptions.resumeReason,
          }
        : undefined;
    let lastUserUuidByKind = {};
    let { permissionDenials, recordDenial, canUseTool } = createPermissionDenialTracker(
      sessionConfig.canUseTool,
    );
    let appState = getAppState();
    let { mainLoopModel, runtimeModel, thinkingConfig } = resolveTurnModelAndThinking({
      userSpecifiedModel,
      permissionMode: appState.toolPermissionContext.mode,
      thinkingConfig: resolveLazy(sessionConfig.thinkingConfig),
    });
    startProfilePhase("model_config_wait");
    let modelFacts =
      turnOptions?.shouldQuery === false
        ? undefined
        : await awaitMcpSettle(runtimeModel, {
            storageV5: sessionConfig.storageV5,
            credentials: sessionConfig.credentials,
            abortController: turnAbortController,
          });
    endProfilePhase("model_config_wait");
    if (sessionConfig.storageV5 !== undefined)
      loadAllPluginsCacheOnly(sessionConfig.storageV5, sessionConfig.credentials).catch(() => {});
    let promptConfig = {
      session: sessionConfig.session,
      tools: toolList,
      runtimeModel,
      customSystemPrompt,
      appendSystemPrompt,
      appendSystemPromptHead: sessionConfig.appendSystemPromptHead,
      excludeDynamicSections,
      cacheBreakerPhrase: appState.cacheBreakerPhrase,
      mcpClients: mcpClientsSource,
      storageV5: sessionConfig.storageV5,
      credentials: sessionConfig.credentials,
    };
    applyPendingInvalidations();
    let promptRenderEpoch = getSystemPromptSectionEpoch();
    startProfilePhase("system_prompt");
    let { systemPrompt, userContext, systemContext } = await buildHeadlessSystemPrompt(promptConfig);
    endProfilePhase("system_prompt");
    let memoryFiles = any ? undefined : getUserContextMemoryFiles(sessionConfig.session);
    let hostConfig = {
      session: sessionConfig.session,
      messageQueue: sessionConfig.messageQueue,
      commands,
      tools: toolList,
      refreshTools: sessionConfig.refreshTools,
      toolCatalog: sessionConfig.toolCatalog,
      refreshMcpClients: sessionConfig.refreshMcpClients,
      verbose: sessionConfig.verbose ?? false,
      fallbackModel: sessionConfig.fallbackModel,
      thinkingConfig,
      mcpClients: mcpClientsSource,
      customSystemPrompt,
      appendSystemPrompt,
      planModeInstructions,
      systemPromptSnapshot,
      appendSubagentSystemPrompt,
      toolAliases,
      excludeDynamicSections,
      agents,
      allowedAgentTypes,
      primitiveToolGrant,
      maxBudgetUsd: sessionConfig.maxBudgetUsd,
      messageClientPlatform: turnOptions?.clientPlatform,
      messageInboundOrigin: turnOptions?.inboundOrigin,
      forwardSubagentText,
      requiresStructuredOutput:
        jsonSchema !== undefined && toolList.some((tool) => toolMatchesName(tool, STRUCTUREDOUTPUT)),
      renderedSystemPrompt: systemPrompt,
      onPermissionDenial: recordDenial,
      requestDialog: sessionConfig.requestDialog,
      sessionState: sessionConfig.sessionState,
      getAppState,
      setAppState,
      setSDKStatus: sessionConfig.setSDKStatus,
      readFileState: readFileCache,
      pendingNestedMemoryTriggers: sessionConfig.pendingNestedMemoryTriggers,
      sessionEnvVars,
      memorySelector,
      isolationLatch,
      toolState,
      sessionHooks,
      storageV5: sessionConfig.storageV5,
      credentials: sessionConfig.credentials,
    };
    let headlessToolUseContext = createHeadlessToolUseContext(hostConfig, {
      phase: "input",
      messages: initialMessages,
      mainLoopModel,
      appState,
      abortController: turnAbortController,
      setMessages: (updater) => {
        let nextMessages = updater(initialMessages);
        if (nextMessages !== initialMessages) {
          if (nextMessages.length === 0) {
            conversation.cut();
            neverParentUuid = undefined;
          }
          initialMessages.length = 0;
          initialMessages.push(...nextMessages);
        }
      },
      applyMessageOp: (op) => {
        let applyEdit = (edit) => {
          let editedMessages = applyMessageListEdit(initialMessages, edit);
          if (editedMessages !== initialMessages) {
            initialMessages.length = 0;
            initialMessages.push(...editedMessages);
          }
        };
        let appendBatch = applyMessageListAppend(op, applyEdit);
        let appendResult =
          appendBatch === undefined
            ? conversation.behindAppends(() => applyEdit(op))
            : appendRowsWithHooks(conversation, appendBatch.rows, {
                keep: appendBatch.keep,
              });
        if (appendResult instanceof Promise) appendResult.catch(logError);
      },
      persistSession,
    });
    let needsInit =
      turnOptions?.orphanedPermission?.initFirst === true || turnOptions?.handedOffTurn !== undefined;
    if (needsInit) {
      startProfilePhase("init_message");
      let initMessage = await buildInitMessage(hostConfig, mainLoopModel, appState.fastMode);
      endProfilePhase("init_message");
      startProfilePhase("init_frame_send");
      initSent = true;
      yield initWithUserMessageUuids(initMessage, record);
      endProfilePhase("init_frame_send");
    }
    let hasPrompt = !(Array.isArray(input) && input.length === 0);
    let handoffRan = false;
    let permissionLayers = headlessToolUseContext.permissionLayers;
    if (!initSent)
      try {
        sessionConfig.onTurnBeganBeforeInit?.();
      } catch (error) {
        logError(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `onTurnBeganBeforeInit threw; the turn goes on: ${errorMessage(error)}`,
            "onTurnBeganBeforeInit threw",
          ),
        );
      }
    startProfilePhase("resume_other");
    let inPlaceOfFirstRequest = turnOptions?.inPlaceOfFirstRequest !== undefined;
    let turnOverrides = inPlaceOfFirstRequest ? undefined : turnOptions;
    let earlyReturned = yield* runHeadlessTurn({
      orphanedPermission: turnOverrides?.orphanedPermission,
      handedOffTurn: turnOverrides?.handedOffTurn,
      beginTranscriptFlush: sessionConfig.beginTranscriptFlush,
      awaitStagedFiles: sessionConfig.awaitStagedFiles,
      placeFilesByName: sessionConfig.placeFilesByName,
      placeCarriedWrites: sessionConfig.placeCarriedWrites,
      handoffRelay: sessionConfig.handoffRelay,
      deferredToolUse: turnOverrides?.deferredToolUse,
      hasPrompt,
      tools: toolList,
      mutableMessages: initialMessages,
      processUserInputContext: headlessToolUseContext,
      canUseTool,
      answers: sessionConfig.answers,
      persistSession,
      earlyResult: {
        startedAt: startTime,
        usage: totalUsage,
        permissionDenials,
        mainLoopModel,
        fastMode: appState.fastMode,
        origin: turnOptions?.origin,
        sendEcho: record.fields(),
        resumeReasonStamp,
      },
      onHandedOffCallsRan: (nextLayers) => {
        handoffRan = true;
        permissionLayers = nextLayers;
      },
      onOrphanedAnswerSettled: sessionConfig.onOrphanedAnswerSettled,
    });
    endProfilePhase("resume_other");
    if (earlyReturned) return;
    let processInputCheckpoint = profileCheckpoint("before_processUserInput", {
      once: true,
    });
    let hasHearthRelay =
      turnOptions?.hearthRelayMessageIds !== undefined ||
      turnOptions?.hearthRelayRows !== undefined ||
      turnOptions?.hearthRelayThreadTs !== undefined;
    let turnId = ensureTurnId(turnOptions?.uuid, turnOptions?.verifiedSlackHumanTurn || hasHearthRelay);
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
      input,
      mode: turnOptions?.inputMode ?? "prompt",
      clientBashCommand: turnOptions?.inputMode === "bash",
      clientBashCommandCwd: turnOptions?.inputMode === "bash" ? turnOptions.clientBashCommandCwd : undefined,
      interactionPrompt: currentPromptHandle(),
      context: {
        ...headlessToolUseContext,
        messages: initialMessages,
        askPerson: (askRequest) =>
          confirmWithUser({
            ...askRequest,
            canUseTool,
            toolUseContext: headlessToolUseContext,
          }),
      },
      messages: initialMessages,
      uuid: turnId,
      isMeta: turnOptions?.isMeta,
      shouldQuery: turnOptions?.shouldQuery,
      queryHeldForNextTurn: turnOptions?.queryHeldForNextTurn,
      querySource: "sdk",
      origin: turnOptions?.origin,
      skipSlashCommands: inPlaceOfFirstRequest || turnOptions?.skipSlashCommands,
      skipAttachments: inPlaceOfFirstRequest
        ? "all"
        : turnOptions?.skipAttachments
          ? turnOptions.shouldQuery === false
            ? "all"
            : "mentions"
          : undefined,
      skipSubmissionHooks: inPlaceOfFirstRequest || turnOptions?.skipSubmissionHooks,
      aheadOfSessionStart: turnOptions?.orphanedPermission !== undefined,
      bridgeOrigin: turnOverrides?.bridgeOrigin,
      localStdinOrigin: turnOptions?.localStdinOrigin,
      sessionChannelPersonTyped: turnOptions?.sessionChannelPersonTyped,
      ownWordUuids: turnOptions?.ownWordUuids,
      hostInitiator: turnOptions?.hostInitiator,
      inboundOrigin: turnOptions?.inboundOrigin,
      toolsUsed: turnOptions?.toolsUsed,
      modelScheduledOrigin: turnOverrides?.modelScheduledOrigin,
      wakeupSource: turnOptions?.wakeupSource,
      artifactCommentTurn: turnOptions?.artifactCommentTurn,
      pollEventDelivery: turnOptions?.pollEventDelivery,
      pollEventProvenance: turnOptions?.pollEventProvenance,
      pollEventDeclared: turnOptions?.pollEventDeclared,
      skipSkillPermissionReset: turnOptions?.skipSkillPermissionReset === true || handoffRan,
      verifiedSlackHumanTurn: turnOptions?.verifiedSlackHumanTurn,
      textNotTyped: turnOptions?.textNotTyped,
      ownFilePaths: turnOptions?.ownFilePaths,
      noPersonArrived: turnOptions?.noPersonArrived,
      inlinedImagePaths: turnOptions?.inlinedImagePaths,
      stampThreadState: turnOptions?.stampThreadState,
      entries: promptEntryTracker,
    });
    endProfilePhase("process_user_input");
    startProfilePhase("conversation_append");
    if (processInputCheckpoint) profileCheckpoint("after_processUserInput");
    let messages_2 =
      (turnOptions?.orphanedPermission !== undefined || turnOptions?.handedOffTurn !== undefined) &&
      !hasPrompt
        ? messages.filter((message) => !isEmptyUserMessage(message))
        : inPlaceOfFirstRequest
          ? messages.filter(
              (message) =>
                turnOptions?.refusedPromptIsStoredAlready === true &&
                message.type === "user" &&
                message.isMeta !== true,
            )
          : messages;
    let shouldRunModel =
      turnOptions?.inPlaceOfFirstRequest !== "nothing" &&
      (inPlaceOfFirstRequest || (shouldQuery && turnOptions?.shouldQuery !== false));
    if (turnOptions?.origin?.kind !== "plugin")
      setLocalCommandExitCode(shouldRunModel ? undefined : commandExitCode);
    if (turnOptions?.origin) stampMissingOrigin(messages_2, turnOptions.origin);
    if (turnOptions?.skipAttachments === true) markSkipAttachments(messages_2);
    if (turnOptions?.textNotTyped === true) markTextNotTyped(messages_2);
    if (turnOptions?.shouldQuery === false && turnOptions.queryHeldForNextTurn !== true)
      markTranscriptOnly(messages_2);
    if (interrupted)
      markDroppedPrompts(
        messages_2,
        turnId,
        turnOptions?.resumeReason === undefined ? turnOptions?.userMessageUuids : undefined,
      );
    if (turnOptions?.taskDelivery) attachTaskDelivery(messages_2, turnOptions.taskDelivery, turnId);
    stampMergedSends(
      messages_2,
      turnId,
      turnOptions?.mergedSendUuids,
      turnOptions?.clientPlatform,
      getContextKey(),
    );
    withdrawBridgeAttachments(
      messages_2,
      turnId,
      input,
      turnOptions?.imageFileUuids,
      turnOptions?.savedFiles,
    );
    if (turnOptions?.verifiedSlackHumanTurn && turnId)
      markVerifiedHumanTurn(messages_2, turnId, {
        projectsUserTurn: turnOptions.projectsUserTurn === true,
        emailSenderTurn: turnOptions.emailSenderTurn,
      });
    if (hasHearthRelay && turnId)
      setHearthRelayMetadata(messages_2, turnId, {
        messageIds: turnOptions?.hearthRelayMessageIds,
        rows: turnOptions?.hearthRelayRows,
        threadTs: turnOptions?.hearthRelayThreadTs,
      });
    if (announceBeforePrompt)
      announceBeforePrompt =
        !checkSessionStartPlacement({
          conversation: initialMessages,
          turnMessages: messages_2,
          model: runtimeModel,
          startsModelTurn: shouldRunModel,
        }) && !shouldRunModel;
    if (shouldRunModel)
      try {
        sessionConfig.beforeTurnInput?.();
      } catch (error) {
        logError(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `beforeTurnInput threw; the turn goes on without the host's rows: ${errorMessage(error)}`,
            "beforeTurnInput threw",
          ),
        );
      }
    let compactResult = messages_2.find(isCompactBoundaryMessage);
    if (compactResult !== undefined)
      await mirrorTaskListSnapshot(compactResult, sessionConfig.session, sessionConfig.storageV5);
    if (appendHookableFastPath()) await conversation.settled();
    let turnSpan = {
      before: initialMessages.at(-1)?.uuid,
      next: undefined,
    };
    let appendedOpt = await appendRowsWithHooks(conversation, messages_2);
    if (appendedOpt !== messages_2) messages_2.splice(0, messages_2.length, ...appendedOpt);
    let errorRowBehindRefusedPrompt = inPlaceOfFirstRequest
      ? turnOptions?.errorRowBehindRefusedPrompt
      : undefined;
    if (
      errorRowBehindRefusedPrompt !== undefined &&
      initialMessages.findLastIndex(
        (initialMessage) => initialMessage.uuid === errorRowBehindRefusedPrompt.uuid,
      ) === -1
    )
      conversation.keep([errorRowBehindRefusedPrompt]);
    if (errorRowBehindRefusedPrompt !== undefined) neverParentUuid = turnOptions?.uuid;
    promptEntryTracker.handedOff();
    let turnMessages = [...initialMessages];
    if (isFoamySpringEnabled()) heldSnapshotRows = [];
    let persistWriter = persistTurnRows({
      conversation: initialMessages,
      messages: turnMessages,
      persistSession,
      storageV5: sessionConfig.storageV5,
      holdsLoadersRows: sessionConfig.loadShowsCutOffCalls === true,
      foldCopies: sessionConfig.messageQueue,
      neverParentUuid,
    });
    turnRecorder = persistSession ? persistWriter : undefined;
    if (
      shouldRunModel &&
      !inPlaceOfFirstRequest &&
      !interrupted &&
      turnOptions?.origin?.kind === "human" &&
      isSunnyGardenSenderAddress()
    )
      await prefetchSenderAddressFor(promptIdForRequest(turnMessages, mainAgentContext()));
    let eagerFlush = Boolean(env.CLAUDE_CODE_EAGER_FLUSH) || Boolean(env.CLAUDE_CODE_IS_COWORK);
    if (persistSession && messages_2.length > 0) {
      let recordPromise = persistWriter.record();
      if (isBareMode());
      else {
        endProfilePhase("conversation_append");
        startProfilePhase("transcript_persist");
        await recordPromise;
        if (eagerFlush) await flushSessionStorage();
        endProfilePhase("transcript_persist");
        startProfilePhase("conversation_append");
      }
    }
    let replayRows =
      turnOptions?.inputMode === "bash"
        ? userRowsWithoutInput(messages_2)
        : sessionConfig.replayUserMessages
          ? userRowsToReplay(messages_2, turnOptions)
          : [];
    let includePartialMessages = sessionConfig.includePartialMessages ?? false;
    let replayAcks = includePartialMessages && (sessionConfig.replayAcksAtRequestDispatch ?? false);
    endProfilePhase("conversation_append");
    startProfilePhase("tool_pool_refresh");
    applyPollEventToolPermissions(createPermissionContextSetters(setAppState), allowedTools, turnOptions);
    let skillModelAllowed = model != null && (isExemptDefaultResolvingPick(model) || isModelAllowed(model));
    if (model && !skillModelAllowed)
      logForDebugging(
        `Skill/command model "${model}" is not in the availableModels allowlist; keeping the session model`,
        {
          level: "warn",
        },
      );
    let selectedModel =
      skillModelAllowed &&
      isSkillModelOverrideAllowedInMode({
        skillModel: model,
        mode: getAppState().toolPermissionContext.mode,
        fastMode: getAppState().fastMode ?? false,
      })
        ? model
        : mainLoopModel;
    activeFastMode = {
      model: selectedModel,
      enabled: appState.fastMode,
    };
    let effectiveTools = toolList;
    let mcpClients = mcpClientsSource;
    let toolPoolReused;
    try {
      let refreshedTools = sessionConfig.refreshTools?.() ?? toolList;
      if (sessionConfig.refreshTools !== undefined) toolPoolReused = refreshedTools === toolList;
      effectiveTools =
        refreshedTools.length === toolList.length &&
        refreshedTools.every((tool, index) => tool.name === toolList[index]?.name)
          ? toolList
          : refreshedTools;
      mcpClients = sessionConfig.refreshMcpClients?.() ?? mcpClientsSource;
    } catch (error) {
      logError(error);
    }
    endProfilePhase("tool_pool_refresh");
    if (effectiveTools !== toolList)
      try {
        let systemPromptSectionEpoch = getSystemPromptSectionEpoch();
        startProfilePhase("system_prompt_rebuild");
        try {
          ({ systemPrompt, userContext, systemContext } = await buildHeadlessSystemPrompt({
            ...promptConfig,
            tools: effectiveTools,
          }));
        } finally {
          endProfilePhase("system_prompt_rebuild");
        }
        promptRenderEpoch = systemPromptSectionEpoch;
      } catch (error) {
        if (!isAbortError(error)) logError(error);
      }
    let queryHostConfig = {
      ...hostConfig,
      tools: effectiveTools,
      mcpClients,
      renderedSystemPrompt: systemPrompt,
    };
    let headlessToolUseContext_2 = createHeadlessToolUseContext(queryHostConfig, {
      phase: "query",
      messages: turnMessages,
      mainLoopModel: selectedModel,
      appState: getAppState(),
      abortController: turnAbortController,
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
    if (!needsInit) {
      startProfilePhase("init_message");
      let initPayload = await buildInitMessage(queryHostConfig, selectedModel, appState.fastMode);
      endProfilePhase("init_message");
      startProfilePhase("init_frame_send");
      initSent = true;
      let startToInitMs = elapsedMs(startTime, performance.now());
      yield initWithUserMessageUuids(initPayload, record);
      if (shouldRunModel)
        sampleQueueLatency({
          enqueuedWallMs: turnOptions?.frameTiming?.enqueuedWallMs,
          previousTurnEndedWallMs: lastTurnEndWallMs,
          startWallMs: now,
          startToInitMs,
        });
    } else startProfilePhase("init_frame_send");
    logShouldQueryResolved({
      shouldQuery: shouldRunModel,
      fromUserInput: shouldQuery,
      fromOptions: turnOptions?.shouldQuery,
    });
    yield* preservedAttachmentRows(messages_2, getSessionId());
    if (!any) {
      any = true;
      let sizeWarning = await checkContextInstructionsSize(memoryFiles, getSessionId(), selectedModel);
      if (sizeWarning !== null) yield sizeWarning;
    }
    if (!gatewayNoticeShown) {
      gatewayNoticeShown = true;
      let gatewayNotice = gatewayCodeTabRulesNotice(sessionConfig.session);
      if (gatewayNotice !== null) yield gatewayNotice;
    }
    if (!shouldRunModel) {
      endProfilePhase("init_frame_send");
      if (turnOptions?.inputMode !== "bash") yield* replayMessagesToSdk(messages_2);
      if (persistSession) {
        await persistWriter.record(
          sessionConfig.loadShowsCutOffCalls === true &&
            turnOptions?.resumeReason !== undefined &&
            !interrupted,
        );
        if (eagerFlush) await flushSessionStorage();
      }
      yield* turnOptions?.inputMode === "bash"
        ? replayUserRows(replayRows, turnOptions)
        : userRowsForSdk(replayRows, turnOptions);
      if (interrupted)
        try {
          turnOptions?.onPromptCheckInterrupted?.();
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
          usage: totalUsage,
          modelUsage: getModelUsage(),
          permission_denials: permissionDenials,
          terminal_reason: interrupted ? "aborted_streaming" : undefined,
          fast_mode_state: getFastModeState(selectedModel, getAppState().fastMode),
          fast_mode_disabled_reason:
            getFastModeUnavailableReasonCode() ??
            getFastRejectedReason(selectedModel, getAppState().fastMode) ??
            undefined,
          origin: turnOptions?.origin,
          subagent_stats: buildFileHistorySnapshotChain(sessionConfig.session),
          safety_stops: getSafetyStops(),
        },
        variant: interrupted
          ? {
              subtype: "error_during_execution",
              errors: ["prompt_check: the turn was stopped before its prompt was checked"],
              ...record.errorVariantFields(),
              ...resumeReasonStamp,
            }
          : {
              subtype: "success",
              result: resultText ?? "",
              ...record.fields(),
              ...resumeReasonStamp,
              ...(localCommand !== undefined && {
                local_command: normalizeCustomSubtype(localCommand),
              }),
            },
      });
      if (eventsYieldedInput) await recordTurnNotes(persistWriter, turnMessages, persistSession, eagerFlush);
      return;
    }
    yield* systemMessagesToSdk(messages_2);
    if (fileHistoryEnabled() && persistSession)
      messages_2
        .filter((row) => isOwnPromptRow(row, turnOptions))
        .forEach((ownRow) => {
          fileHistoryMakeSnapshot(
            headlessToolUseContext_2.getFileHistoryState,
            headlessToolUseContext_2.applyFileHistoryOp,
            ownRow.uuid,
          );
        });
    let turnTiming = startTurnTiming({
      toolUseContext: headlessToolUseContext_2,
      sessionState: sessionConfig.sessionState,
    });
    let plainDeltaActive = false;
    let sawTextDelta = false;
    let plainDeltaCount = 0;
    let emitPlainDelta = includePartialMessages ? turnOptions?.emitPlainDelta : undefined;
    let takePlainDelta =
      emitPlainDelta === undefined
        ? undefined
        : (streamEventMessage) => {
            if (
              emitPlainDelta === undefined ||
              !plainDeltaActive ||
              (!sawTextDelta &&
                streamEventMessage.event.type === "content_block_delta" &&
                streamEventMessage.event.delta.type === "text_delta")
            )
              return false;
            try {
              let emitted = emitPlainDelta(
                toStreamEventMessage(streamEventMessage, {
                  uuid: randomUUID(),
                  session_id: getSessionId(),
                }),
              );
              if (emitted) plainDeltaCount++;
              return emitted;
            } catch (error) {
              emitPlainDelta = undefined;
              logPlainDeltaFailure("host_threw", error);
              return false;
            }
          };
    pendingParams = {
      messages: turnMessages,
      systemPrompt,
      promptRenderEpoch,
      modelFacts,
      userContext,
      systemContext,
      canUseTool: sessionConfig.canUseTool,
      toolUseContext: headlessToolUseContext_2,
      fallbackModel: sessionConfig.fallbackModel,
      querySource: "sdk",
      maxTurns: sessionConfig.maxTurns,
      taskBudget: sessionConfig.taskBudget,
      takePlainDelta,
      stopHookActive: turnOptions?.stopHookActive,
      joinedDisallowedTools: (toolNames) => {
        let cleanMcpClients =
          toolNames.length > 0
            ? []
            : (sessionConfig.refreshMcpClients?.() ?? resolveLazy(sessionConfig.mcpClients));
        applyTurnDenials(
          toolNames,
          filterMcpToolsBySelectedServers(
            getAppState().toolPermissionContext.turnDisallowedTools ?? [],
            toolNames,
            cleanMcpClients,
          ),
        );
        clientDisallowedTools = uniq([
          ...filterMcpToolsBySelectedServers(clientDisallowedTools, toolNames, cleanMcpClients),
          ...toolNames,
        ]);
      },
      inPlaceOfFirstRequest:
        turnOptions?.inPlaceOfFirstRequest === "nothing" ? undefined : turnOptions?.inPlaceOfFirstRequest,
    };
    takeTurnError();
    let sinceError = getInMemoryErrors().at(-1);
    for (let span of openTurnSpans) span.next = turnSpan;
    openTurnSpans.clear();
    openTurnSpans.add(turnSpan);
    let turnStartEventId = runSafely(
      "turn.start",
      () =>
        buildTurnStartEvent({
          turnEvents: turnStreamBridge,
          newMessages: messages_2,
          input: typeof input === "string" ? input : undefined,
          signal: turnAbortController.signal,
          abort: () => turnAbortController.abort(userAbortReason("turn-abort")),
        }),
      undefined,
    );
    endProfilePhase("init_frame_send");
    startProfilePhase("engine_pickup");
    inputStream.enqueue({
      type: "user",
      message: {
        role: "user",
        content: input,
      },
      parent_tool_use_id: null,
      origin: turnOptions?.origin,
    });
    let turnId_2 = randomUUID();
    let displayOverrides = new Map();
    let currentTools = () => sessionConfig.refreshTools?.() ?? effectiveTools;
    let replayOwnTaskNotifications = false;
    try {
      replayOwnTaskNotifications = resolveLazy(sessionConfig.replayOwnTaskNotifications) ?? false;
    } catch (error) {
      logError(error);
    }
    let sdkOptions = {
      replayUserMessages: sessionConfig.replayUserMessages ?? false,
      replayOwnTaskNotifications,
      includePartialMessages,
      ...false,
    };
    let retractionFilter = createRetractionFilter();
    let collapseNotices = (reason) =>
      collapseRefusalFallbackNotices(retractionFilter.settle(reason), getSessionId());
    let partialStreamRetraction = createPartialStreamRetraction(includePartialMessages);
    let initialStructuredCount = jsonSchema ? countNamedToolUses(initialMessages, STRUCTUREDOUTPUT) : 0;
    let marker = initialMessages.at(-1);
    let pendingStructured = [];
    let retractedCalls = 0;
    let retractedToolUseIds = new Set();
    let streamUsage = EMPTY_USAGE;
    let countedMessageId;
    let lastCountedMessageId;
    let stopReason = null;
    let firstAssistantAt = 0;
    let messageStartAt = 0;
    let firstContentAt = 0;
    let firstFrameUpload;
    let firstTextUpload;
    let requestSentAtMs = 0;
    let requestSentWallMs = 0;
    let requestInputTokens = 0;
    let numTurns = 1;
    let replayDone = replayRows.length === 0;
    function* replayRowsOnce() {
      if (!replayDone) {
        replayDone = true;
        yield* replayUserRows(replayRows, turnOptions);
      }
    }
    let turnFinished = false;
    let cleanupDone = false;
    let runningTurnTracker = createRunningTurnTracker(() => record.fields()?.user_message_uuids ?? []);
    if (turnOptions?.inputMode === "bash") yield* replayRowsOnce();
    try {
      while (true) {
        let { value: turnMessage, done } = await queryEngine.next();
        plainDeltaActive = false;
        if (done) throw Error("headless session: the engine loop ended before the turn result");
        let outMsg = turnMessage;
        let forwardToSdk = true;
        let needsReplayCheck =
          (turnMessage.type === "assistant" && !("parent_tool_use_id" in turnMessage)) ||
          turnMessage.type === "user" ||
          (turnMessage.type === "system" && turnMessage.subtype === "compact_boundary");
        let pendingNotices = [];
        let refusalServed = false;
        switch (turnMessage.type) {
          case "assistant": {
            if ("parent_tool_use_id" in turnMessage) break;
            let row = withoutSessionId(turnMessage);
            settleTakenSafe(sessionConfig.messageQueue);
            let shownAsStoredIn = takeShownAsStoredMark(
              row,
              persistSession ? sessionConfig.markOfRepliesShownAsStored : undefined,
            );
            runningTurnTracker.onAssistantRow(row);
            turnTiming.onAssistantMessage(row);
            if (!firstAssistantAt) firstAssistantAt = performance.now();
            if (row.message.stop_reason != null) stopReason = row.message.stop_reason;
            if (row.isApiErrorMessage) pendingNotices.push(...collapseNotices("stream_error"));
            let usageDelta = assistantUsageDelta(row, countedMessageId, lastCountedMessageId);
            if (usageDelta) {
              lastCountedMessageId = row.message.id;
              totalUsage = addUsage_2(totalUsage, usageDelta);
            }
            refusalServed = row.message.stop_reason != null && row.message.stop_reason !== "refusal";
            turnMessages.push(row);
            if (persistSession && shownAsStoredIn === undefined) persistWriter.record();
            conversation.keep([row]);
            if (shownAsStoredIn === undefined) {
              yield* replayRowsOnce();
              androidEvidence.absorb([row]);
            }
            let displayedMessage;
            try {
              let hookResult = await runMessageDisplayHook(
                sessionConfig.session,
                row,
                turnId_2,
                sessionHooks,
                turnAbortController.signal,
                sessionConfig.storageV5,
                sessionConfig.credentials,
              );
              displayedMessage = hookResult.message;
              if (shownAsStoredIn !== undefined)
                markShownAsStored(row, shownAsStoredIn, hookResult.hookOutputApplied);
            } finally {
              if (shownAsStoredIn !== undefined) persistWriter.record();
            }
            if (shownAsStoredIn !== undefined) {
              yield* replayRowsOnce();
              androidEvidence.absorb([row]);
            }
            if (displayedMessage !== row) displayOverrides.set(row, displayedMessage);
            outMsg = {
              ...displayedMessage,
              session_id: turnMessage.session_id,
              uuid: turnMessage.uuid,
            };
            break;
          }
          case "user": {
            let row = withoutSessionId(turnMessage);
            if (isInterruptionOnlyMessage(row)) pendingNotices.push(...collapseNotices("interrupted"));
            deferredRows = [];
            try {
              turnMessages.push(row);
              if (persistSession) await persistWriter.record();
              conversation.keep([row]);
              androidEvidence.absorb([row]);
              persistWriter.settlePreservedTail(row.uuid);
            } finally {
              flushDeferredRows();
            }
            numTurns++;
            break;
          }
          case "progress":
          case "attachment": {
            let row = markMaxTurnsExit(withoutSessionId(turnMessage));
            let storedRow = stripAgentToolResultForStorage(row);
            conversation.keep([storedRow]);
            androidEvidence.absorb([row]);
            let sourceUuid = getSourceUuid(row);
            if (sourceUuid !== undefined) persistWriter.holdFoldCopy(storedRow, sourceUuid);
            if (persistSession) {
              turnMessages.push(storedRow);
              persistWriter.record();
            }
            if (row.type === "attachment") record.noteAttachment(row.attachment);
            if (row.type === "attachment" && row.attachment.type === "structured_output")
              if (
                row.attachment.toolUseID !== undefined
                  ? retractedToolUseIds.has(row.attachment.toolUseID)
                  : retractedToolUseIds.size > 0
              ) {
                persistWriter.evict(row.uuid);
                logEvent("tengu_structured_output_late_retraction_drop", {});
              } else
                pendingStructured.push({
                  toolUseID: row.attachment.toolUseID,
                  attachmentUuid: row.uuid,
                });
            break;
          }
          case "tombstone": {
            runningTurnTracker.onRetraction(turnMessage.message.uuid);
            yield* partialStreamRetraction.onTombstone(turnMessage);
            persistWriter.evict(turnMessage.message.uuid);
            retractionFilter.dropHeld(turnMessage.message.uuid);
            let content =
              turnMessage.message.type === "assistant" ? turnMessage.message.message.content : undefined;
            let toolUseIds = Array.isArray(content)
              ? content.flatMap((block) =>
                  block.type === "tool_use" && block.name === STRUCTUREDOUTPUT ? [block.id] : [],
                )
              : [];
            if (toolUseIds.length > 0) {
              retractedCalls++;
              toolUseIds.forEach((toolUseId) => retractedToolUseIds.add(toolUseId));
              let matchesRetraction = (pending) =>
                pending.toolUseID === undefined || toolUseIds.includes(pending.toolUseID);
              let filtered = pendingStructured.filter(matchesRetraction);
              filtered.forEach((pending) => persistWriter.evict(pending.attachmentUuid));
              pendingStructured = pendingStructured.filter((pending) => !matchesRetraction(pending));
              logEvent("tengu_structured_output_retracted", {
                retracted_results: filtered.length,
                surviving_results: pendingStructured.length,
                tombstoned_calls: retractedCalls,
              });
            }
            break;
          }
          case "stream_event":
            if (
              !("parent_tool_use_id" in turnMessage && turnMessage.parent_tool_use_id) &&
              !isPingStreamEvent(turnMessage.event)
            ) {
              settleTakenSafe(sessionConfig.messageQueue);
              persistWriter.settleFoldCopies();
            }
            turnTiming.onStreamEvent(turnMessage);
            pendingNotices.push(...partialStreamRetraction.onStreamEvent(turnMessage.event, streamUsage));
            if (
              !firstContentAt &&
              (turnMessage.event.type === "content_block_start" ||
                turnMessage.event.type === "content_block_delta")
            )
              firstContentAt = performance.now();
            if (turnMessage.event.type === "message_start") {
              if (!messageStartAt) messageStartAt = performance.now();
              streamUsage = mergeUsageFromDelta(EMPTY_USAGE, turnMessage.event.message.usage);
              if (!requestSentAtMs && "requestSentAtMs" in turnMessage && turnMessage.requestSentAtMs)
                requestSentAtMs = turnMessage.requestSentAtMs;
              if (!requestSentWallMs && "requestSentWallMs" in turnMessage && turnMessage.requestSentWallMs) {
                requestSentWallMs = turnMessage.requestSentWallMs;
                requestInputTokens =
                  streamUsage.input_tokens +
                  streamUsage.cache_read_input_tokens +
                  streamUsage.cache_creation_input_tokens;
              }
              countedMessageId = turnMessage.event.message.id;
            } else if (turnMessage.event.type === "message_delta") {
              if (turnMessage.event.delta.stop_reason != null) {
                stopReason = turnMessage.event.delta.stop_reason;
                if (turnMessage.event.delta.stop_reason !== "refusal")
                  pendingNotices.push(...collapseNotices("served"));
              }
              streamUsage = parseUsageIterations(turnMessage.event.usage)?.servedFallbackModel
                ? addResponseUsageAttributes(streamUsage, turnMessage.event.usage)
                : mergeUsageFromDelta(streamUsage, turnMessage.event.usage);
              if (persistSession) persistWriter.record();
            } else if (turnMessage.event.type === "message_stop")
              totalUsage = addUsage_2(totalUsage, streamUsage);
            break;
          case "system":
            if (turnMessage.subtype === "status" && turnMessage.status === "compacting")
              persistWriter.settleFoldCopies("compaction");
            else if (turnMessage.subtype === "status") persistWriter.settleFoldCopies();
            if (turnMessage.subtype === "status" && turnMessage.status === "requesting")
              runningTurnTracker.onRoundStart();
            if (turnMessage.subtype === "model_refusal_fallback") {
              forwardToSdk = false;
              let refusalFallbackMessage = createRefusalFallbackMessage(turnMessage);
              recordRefusalEntry(refusalFallbackMessage, turnMessages, persistSession);
              yield* partialStreamRetraction.onRefusalFallbackBanner(
                refusalFallbackMessage.direction,
                streamUsage,
              );
              if (isRefusalFallbackEnabled())
                yield* collapseRefusalFallbackNotices(
                  retractionFilter.accept(refusalFallbackMessage),
                  getSessionId(),
                );
            } else {
              appendSystemRow(turnMessage, turnMessages, persistWriter, persistSession);
              if (turnMessage.subtype === "model_refusal_no_fallback") yield* collapseNotices("exhausted");
              else if (turnMessage.subtype === "model_fallback")
                yield* collapseNotices("availability_switch");
              else if (turnMessage.subtype === "informational")
                try {
                  forwardToSdk = !isTransportBacked(sessionConfig.session);
                } catch {
                  forwardToSdk = false;
                }
            }
            if (turnMessage.subtype === "compact_boundary") {
              let boundary = persistWriter.dropPreservedRowsNotInConversation(
                convertCompactBoundaryMessage(turnMessage),
              );
              let continuesTurns = turnOptions?.resumeReason !== undefined;
              runningTurnTracker.onBoundary(boundary, {
                openerUuid:
                  continuesTurns && turnOptions.isMeta
                    ? turnOptions.resumedTurnOpenerUuid
                    : (turnOptions?.resumedTurnOpenerUuid ?? uuid),
                conversation: initialMessages,
                continuedTurnsRows: continuesTurns ? initialMessages : undefined,
              });
              deferredRows = [];
              try {
                await mirrorTaskListSnapshot(boundary, sessionConfig.session, sessionConfig.storageV5);
                if (persistSession) await persistWriter.flushBeforeCompactBoundary(boundary);
                turnMessages.push(boundary);
                if (persistSession) await persistWriter.record(true);
                conversation.keep([boundary]);
                persistWriter.applyCompactBoundary(boundary);
              } finally {
                flushDeferredRows();
              }
            }
            break;
          case "post_turn_summary":
            setAppState((prevState) =>
              prevState.postTurnSummary === turnMessage.value
                ? prevState
                : {
                    ...prevState,
                    postTurnSummary: turnMessage.value,
                  },
            );
            break;
          case "active_goal":
            setAppState((prevState) =>
              prevState.activeGoal === turnMessage.value
                ? prevState
                : {
                    ...prevState,
                    activeGoal: turnMessage.value,
                  },
            );
            break;
          case "command_lifecycle":
            if (turnMessage.state === "started") {
              let commandFingerprint = record.noteCommandStarted(turnMessage.command_uuid);
              try {
                turnOptions?.onCommandTakenIn?.(turnMessage.command_uuid, commandFingerprint);
              } catch (error) {
                logError(error);
              }
              persistWriter.settleFoldCopies();
            }
            break;
          case "result": {
            turnFinished = true;
            cleanupDone = true;
            turnTiming.end(turnMessage.terminal_reason);
            finalizeTurn(persistWriter, toolList);
            let turnError = takeTurnError();
            if (turnError !== undefined) {
              yield* partialStreamRetraction.closeAtTurnEnd(streamUsage);
              throw turnError.error;
            }
            turnMessage.permission_denials.unshift(...permissionDenials);
            yield* partialStreamRetraction.closeAtTurnEnd(streamUsage);
            yield* collapseNotices("turn_end");
            let notice = getAutoModeUnavailableStopNotice();
            if (notice !== undefined) {
              let noticeText = notice;
              try {
                if (isTransportBacked(sessionConfig.session)) noticeText = minimalUnavailableNotice(notice);
              } catch {
                noticeText = minimalUnavailableNotice(notice);
              }
              yield informationalSystemMessage(createSystemMessage(noticeText, "warning"));
            }
            if (persistSession) {
              await persistWriter.record(true);
              if (eagerFlush) await flushSessionStorage();
            }
            let isSuccessResult =
              turnMessage.subtype === "success" &&
              !turnMessage.is_error &&
              turnMessage.deferred_tool_use === undefined;
            if (
              jsonSchema !== undefined &&
              isSuccessResult &&
              pendingStructured.length === 0 &&
              retractedCalls > 0
            ) {
              logEvent("tengu_structured_output_retraction_exhausted", {
                tombstoned_calls: retractedCalls,
                num_turns: turnMessage.num_turns,
              });
              yield buildResultMessage({
                startedAt: startTime,
                common: {
                  is_error: true,
                  duration_api_ms: turnMessage.duration_api_ms,
                  num_turns: turnMessage.num_turns,
                  stop_reason: stopReason,
                  session_id: getSessionId(),
                  total_cost_usd: turnMessage.total_cost_usd,
                  usage: totalUsage,
                  modelUsage: turnMessage.modelUsage,
                  permission_denials: turnMessage.permission_denials,
                  terminal_reason: isAbortedTerminalReason(turnMessage.terminal_reason)
                    ? turnMessage.terminal_reason
                    : "structured_output_retry_exhausted",
                  fast_mode_state: turnMessage.fast_mode_state,
                  fast_mode_disabled_reason: turnMessage.fast_mode_disabled_reason,
                  origin: turnOptions?.origin,
                  subagent_stats: buildFileHistorySnapshotChain(sessionConfig.session),
                  safety_stops: getSafetyStops(),
                },
                variant: {
                  subtype: "error_max_structured_output_retries",
                  errors: [STRUCTURED_OUTPUT_RETRACTED_MESSAGE],
                  ...record.errorVariantFields(),
                  ...resumeReasonStamp,
                },
              });
              return;
            }
            if (isSuccessResult && firstAssistantAt)
              logEvent("tengu_sdk_ttft", {
                ttft_ms: elapsedMs(startTime, firstAssistantAt),
                model: telemetrySafeModelName(selectedModel),
                ...(toolPoolReused !== undefined && {
                  tool_pool_reused: toolPoolReused,
                }),
              });
            let spawnInfo = isSuccessResult ? consumeApiRequestSentFromSpawn() : undefined;
            let timeToRequestMs =
              isSuccessResult && requestSentAtMs ? elapsedMs(startTime, requestSentAtMs) : undefined;
            let profile =
              timeToRequestMs !== undefined ? consumeProfile(timeToRequestMs, requestSentAtMs) : undefined;
            let processTurnIndex =
              turnMessage.subtype === "success" &&
              turnMessage.is_error &&
              turnMessage.deferred_tool_use === undefined
                ? currentTurnIndex()
                : undefined;
            let result = turnMessages.findLast(
              (row) => (row.type === "assistant" || row.type === "user") && !persistWriter.isHostRow(row),
            );
            let salvagedText =
              result?.type === "assistant" && !(result.isApiErrorMessage && !turnMessage.is_error)
                ? getSalvageableResultText(result, displayOverrides.get(result))
                : undefined;
            let resultFields = record.resultFields();
            let firstFrameTiming = postTimingFields(isSuccessResult, startTime, firstFrameUpload);
            let firstTextTiming = postTimingFields(isSuccessResult, startTime, firstTextUpload);
            outMsg = {
              ...turnMessage,
              usage: totalUsage,
              duration_ms: elapsedMs(startTime, performance.now()),
              ...(turnMessage.subtype === "error_during_execution" && {
                errors: orderForTransport(
                  sessionConfig.session,
                  turnMessage.errors[0] ?? "",
                  appendUnique(turnMessage.errors.slice(1), getRecentErrorLog(sinceError)),
                  "first",
                ),
              }),
              ...(turnMessage.subtype !== "success" && record.errorVariantFields()),
              ...(turnMessage.subtype !== "success" && resumeReasonStamp),
              ...(turnMessage.subtype === "success" && {
                ...(salvagedText !== undefined && {
                  result: salvagedText,
                }),
                ttft_ms:
                  isSuccessResult && firstAssistantAt ? elapsedMs(startTime, firstAssistantAt) : undefined,
                ttft_stream_ms:
                  isSuccessResult && messageStartAt ? elapsedMs(startTime, messageStartAt) : undefined,
                time_to_request_ms: timeToRequestMs,
                ...(profile && {
                  time_to_request_phases_ms: profile.phases,
                  turn_start_resume_kind: turnContinuationKind({
                    orphanedPermission: turnOptions?.orphanedPermission,
                    handedOffTurn: turnOptions?.handedOffTurn,
                    deferredToolUse: turnOptions?.deferredToolUse,
                  }),
                  ...(turnOptions?.handedOffTurn?.intakePhasesMs !== undefined && {
                    handoff_intake_phases_ms: turnOptions.handedOffTurn.intakePhasesMs,
                  }),
                }),
                ...(processTurnIndex !== undefined && {
                  process_turn_index: processTurnIndex,
                }),
                ...(profile?.window && {
                  process_turn_index: profile.window.processTurnIndex,
                  time_to_request_loop_lag_ms: profile.window.loopLagMs,
                }),
                ...(profile?.window?.resources && {
                  time_to_request_cpu_ms: profile.window.resources.cpuMs,
                  time_to_request_major_faults: profile.window.resources.majorFaults,
                }),
                ...(profile?.memory && {
                  process_rss_mib_turn_start: profile.memory.atBegin.rssMib,
                  process_anon_mib_turn_start: profile.memory.atBegin.anonMib,
                  process_rss_mib_result: profile.memory.atConsume.rssMib,
                  process_anon_mib_result: profile.memory.atConsume.anonMib,
                  process_peak_rss_mib: profile.memory.atConsume.peakRssMib,
                }),
                ...(profile?.betweenTurns && {
                  process_cpu_ms_between_turns: profile.betweenTurns.cpuMs,
                  process_wall_ms_between_turns: profile.betweenTurns.wallMs,
                }),
                ...(profile?.turn && {
                  process_cpu_ms_turn: profile.turn.cpuMs,
                  process_wall_ms_turn: profile.turn.wallMs,
                }),
                ...(profile?.shellCpu && {
                  shell_cpu_ms_turn: profile.shellCpu.turnMs,
                  ...(profile.shellCpu.sinceLastResult && {
                    shell_cpu_ms_since_last_result: profile.shellCpu.sinceLastResult.cpuMs,
                    shell_wall_ms_since_last_result: profile.shellCpu.sinceLastResult.wallMs,
                  }),
                }),
                ...(profile?.streaming && {
                  process_cpu_ms_streaming: profile.streaming.cpuMs,
                  process_wall_ms_streaming: profile.streaming.wallMs,
                  main_stream_count: profile.streaming.streams,
                  main_stream_event_count: profile.streaming.events,
                  ...(profile.streaming.chunks !== undefined && {
                    main_stream_chunk_count: profile.streaming.chunks,
                  }),
                }),
                ...(profile?.inputAttachments && {
                  input_attachments_detail: profile.inputAttachments,
                }),
                ...(profile?.storeConfirm && {
                  resume_store_confirm_detail: profile.storeConfirm,
                }),
                first_content_frame_ms:
                  isSuccessResult && firstContentAt ? elapsedMs(startTime, firstContentAt) : undefined,
                first_stream_post_ms: firstFrameTiming.postMs,
                first_stream_post_ack_ms:
                  isSuccessResult && firstFrameUpload?.ackedAtMs
                    ? elapsedMs(startTime, firstFrameUpload.ackedAtMs)
                    : undefined,
                first_stream_post_queue_wait_ms: firstFrameTiming.queueWaitMs,
                first_stream_post_queued_behind: firstFrameTiming.queuedBehind,
                first_text_post_ms: firstTextTiming.postMs,
                first_text_post_queue_wait_ms: firstTextTiming.queueWaitMs,
                first_text_post_queued_behind: firstTextTiming.queuedBehind,
                text_post_count: firstTextTiming.textPosts,
                text_post_gap_over_500ms_count: firstTextTiming.textPostGapsOver500Ms,
                text_post_flush_timer_max_late_ms: firstTextTiming.flushTimerMaxLateMs,
                ...resultFields,
                ...resumeReasonStamp,
                ...(isSuccessResult &&
                  requestSentWallMs &&
                  resultFields !== undefined &&
                  resultFields.user_message_uuid === uuid && {
                    request_sent_wall_ms: requestSentWallMs,
                    ...(requestInputTokens > 0 && {
                      first_request_input_tokens: requestInputTokens,
                    }),
                    ...(turnOptions?.frameTiming?.serverReceivedWallMs !== undefined && {
                      user_message_server_received_wall_ms: turnOptions.frameTiming.serverReceivedWallMs,
                    }),
                    ...(firstFrameUpload?.postedWallMs !== undefined && {
                      first_stream_post_wall_ms: firstFrameUpload.postedWallMs,
                    }),
                    ...(firstTextUpload?.postedWallMs !== undefined && {
                      first_text_post_wall_ms: firstTextUpload.postedWallMs,
                    }),
                    ...(turnOptions?.frameTiming?.receivedWallMs !== undefined && {
                      frame_received_wall_ms: turnOptions.frameTiming.receivedWallMs,
                      frame_enqueued_wall_ms: turnOptions.frameTiming.enqueuedWallMs,
                      turn_started_wall_ms: now,
                      ...(turnOptions.frameTiming.intakePhasesMs !== undefined && {
                        frame_intake_phases_ms: turnOptions.frameTiming.intakePhasesMs,
                      }),
                      ...(turnSignals !== undefined && {
                        turn_start_phases_ms: turnSignals.phases,
                        ...(turnSignals.controlRequestsMs > 0 && {
                          turn_start_control_requests_ms: turnSignals.controlRequestsMs,
                        }),
                      }),
                    }),
                  }),
                ...(spawnInfo && {
                  time_to_request_from_spawn_ms: spawnInfo.ms,
                  warm_spare_claimed: spawnInfo.warmSpareClaimed,
                  flag_fetch_kick: spawnInfo.flagFetchKick,
                  time_origin_ms: spawnInfo.timeOriginMs,
                }),
              }),
            };
            break;
          }
          default:
            break;
        }
        if (
          needsReplayCheck ||
          (includePartialMessages &&
            turnMessage.type === "stream_event" &&
            !isPingStreamEvent(turnMessage.event)) ||
          (replayAcks &&
            turnMessage.type === "system" &&
            turnMessage.subtype === "status" &&
            turnMessage.status === "requesting")
        ) {
          if (!replayDone) yield* replayRowsOnce();
        }
        if (pendingNotices.length > 0) yield* pendingNotices;
        let sessionId = getSessionId();
        if (forwardToSdk)
          for (let sdkMessage of toSdkMessages(
            outMsg.session_id === sessionId
              ? outMsg
              : {
                  ...outMsg,
                  session_id: sessionId,
                },
            currentTools,
            sdkOptions,
          )) {
            if (
              sdkMessage.type === "assistant" &&
              turnMessage.type === "assistant" &&
              !("parent_tool_use_id" in turnMessage)
            )
              partialStreamRetraction.onAssistantMessage(turnMessage);
            if (
              sdkMessage.type === "stream_event" &&
              sdkMessage.parent_tool_use_id == null &&
              isMarkerTextDelta(sdkMessage.event)
            ) {
              turnTiming.markFirstTextPainted("stream_event");
              sawTextDelta = true;
              if (firstTextUpload === undefined && sessionConfig.trackFirstTextFrameUpload !== undefined)
                firstTextUpload = sessionConfig.trackFirstTextFrameUpload(sdkMessage.uuid);
            } else if (
              sdkMessage.type === "assistant" &&
              sdkMessage.parent_tool_use_id == null &&
              collectReadNotificationsToolUseIds(sdkMessage, BRIEF_TOOL_NAME_SET)
            )
              turnTiming.markFirstTextPainted("message", sdkMessage.message.id);
            if (
              firstFrameUpload === undefined &&
              sessionConfig.trackFirstFrameUpload !== undefined &&
              sdkMessage.type === "stream_event" &&
              sdkMessage.parent_tool_use_id == null &&
              !isPingStreamEvent(sdkMessage.event)
            )
              firstFrameUpload = sessionConfig.trackFirstFrameUpload(sdkMessage.uuid);
            let messageKind =
              sdkMessage.type === "assistant" && sdkMessage.parent_tool_use_id == null
                ? "assistant"
                : sdkMessage.type === "stream_event" &&
                    sdkMessage.parent_tool_use_id == null &&
                    !isPingStreamEvent(sdkMessage.event)
                  ? "stream_event"
                  : undefined;
            let turnFields = messageKind === undefined ? undefined : record.fields();
            if (
              messageKind !== undefined &&
              turnFields !== undefined &&
              turnFields.user_message_uuid !== lastUserUuidByKind[messageKind]
            ) {
              lastUserUuidByKind[messageKind] = turnFields.user_message_uuid;
              yield {
                ...sdkMessage,
                ...turnFields,
                ...resumeReasonStamp,
              };
            } else if (sdkMessage.type === "system" && sdkMessage.subtype === "thinking_tokens") {
              let fields = record.fields();
              yield fields === undefined
                ? sdkMessage
                : {
                    ...sdkMessage,
                    user_message_uuid: fields.user_message_uuid,
                  };
            } else if (
              sdkMessage.type === "system" &&
              sdkMessage.subtype === "status" &&
              sdkMessage.status === "requesting"
            )
              yield withUserMessageUuids(sdkMessage, record);
            else {
              plainDeltaActive = messageKind === "stream_event" && isTextOrJsonDeltaEvent(turnMessage);
              yield sdkMessage;
            }
          }
        if (refusalServed) yield* collapseNotices("served");
        if (turnFinished) return;
        if (
          turnMessage.type === "user" &&
          jsonSchema !== undefined &&
          !hasReachedBudget(sessionConfig.maxBudgetUsd)
        ) {
          let MAX_STRUCTURED_OUTPUT_RETRIES_2 =
            env.MAX_STRUCTURED_OUTPUT_RETRIES ?? MAX_STRUCTURED_OUTPUT_RETRIES;
          if (
            countNamedToolUses(initialMessages, STRUCTUREDOUTPUT) + retractedCalls - initialStructuredCount >=
              MAX_STRUCTURED_OUTPUT_RETRIES_2 &&
            pendingStructured.length === 0
          ) {
            cleanupDone = true;
            await drainAbandonedTurn(turnAbortController, permissionDenials);
            turnFinished = true;
            finalizeTurn(persistWriter, toolList);
            if (persistSession) {
              await persistWriter.record(true);
              if (eagerFlush) await flushSessionStorage();
            }
            turnTiming.end("structured_output_retry_exhausted");
            yield* partialStreamRetraction.closeAtTurnEnd(streamUsage);
            yield* collapseNotices("turn_end");
            yield buildResultMessage({
              startedAt: startTime,
              common: {
                is_error: true,
                duration_api_ms: getTotalAPIDuration(),
                num_turns: numTurns,
                stop_reason: stopReason,
                session_id: getSessionId(),
                total_cost_usd: getTotalCostUSD(),
                usage: totalUsage,
                modelUsage: getModelUsage(),
                permission_denials: permissionDenials,
                terminal_reason: "structured_output_retry_exhausted",
                fast_mode_state: getFastModeState(selectedModel, appState.fastMode),
                fast_mode_disabled_reason:
                  getFastModeUnavailableReasonCode() ??
                  getFastRejectedReason(selectedModel, appState.fastMode) ??
                  undefined,
                origin: turnOptions?.origin,
                subagent_stats: buildFileHistorySnapshotChain(sessionConfig.session),
                safety_stops: getSafetyStops(),
              },
              variant: {
                subtype: "error_max_structured_output_retries",
                errors: [
                  formatStructuredOutputFailure(
                    MAX_STRUCTURED_OUTPUT_RETRIES_2,
                    retractedCalls,
                    hasSuccessfulToolCallSince(initialMessages, marker),
                  ),
                ],
                ...record.errorVariantFields(),
                ...resumeReasonStamp,
              },
            });
            return;
          }
        }
      }
    } finally {
      lastTurnEndWallMs = Date.now();
      emitPlainDelta = undefined;
      if (plainDeltaCount > 0)
        logForDebugging(
          `[headless] ${plainDeltaCount} streamed deltas went straight to output this turn (CLAUDE_CODE_PLAIN_DELTA_FAST_PATH)`,
          {
            level: "info",
          },
        );
      turnTiming.end(undefined, turnAbortController.signal.aborted);
      turnTiming.dispose();
      if (!turnFinished) await drainAbandonedTurn(turnAbortController);
      if (!cleanupDone) finalizeTurn(persistWriter, toolList);
      await persistWriter.settleFoldCopies("all");
      openTurnSpans.delete(turnSpan);
      if (turnStartEventId !== undefined)
        runSafely(
          "turn.complete",
          () =>
            raiseTurnComplete({
              turnEvents: turnStreamBridge,
              turnId: turnStartEventId,
              transcript: {
                getSnapshot: () => initialMessages,
              },
              span: turnSpan,
              durationMs: elapsedMs(startTime, performance.now()),
              isAborted: turnAbortController.signal.aborted,
            }),
          undefined,
        );
      await recordTurnNotes(persistWriter, turnMessages, persistSession, eagerFlush);
    }
  }
  async function drainAbandonedTurn(controller, permissionDenials) {
    if (controller === abortController) abortTurn();
    try {
      while (true) {
        let { value: message, done } = await queryEngine.next();
        if (done) return;
        if (message.type === "result") {
          permissionDenials?.push(...message.permission_denials);
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
  function finalizeTurn(writer, toolList) {
    writer.flushUnanchoredPreservedTail();
    try {
      clearCutResults();
    } catch (error) {
      logError(error);
    }
    try {
      let stripped = stripToolResultsForStorage(initialMessages, toolList, 0, true);
      if (stripped !== initialMessages)
        for (let j = 0; j < stripped.length; j++) initialMessages[j] = stripped[j];
    } catch (error) {
      logError(error);
    }
    releaseHeldRows(true);
  }
  function appendSystemRow(systemMessage, transcript, writer, shouldPersist) {
    if ("timestamp" in systemMessage && "level" in systemMessage) {
      let row = withoutSessionId(systemMessage);
      conversation.keep([row]);
      if (shouldPersist) {
        transcript.push(row);
        writer.record();
      }
      return;
    }
    let replacement;
    switch (systemMessage.subtype) {
      case "model_fallback":
        replacement = createModelFallbackSystemMessage(systemMessage);
        break;
      case "model_consent_fallback":
        replacement = createConsentFallbackMessage(systemMessage);
        break;
      case "model_refusal_no_fallback":
        replacement = createRefusalNoFallbackMessage(systemMessage);
        break;
      default:
        return;
    }
    conversation.keep([replacement]);
    if (shouldPersist) transcript.push(replacement);
  }
  function recordRefusalEntry(refusalFallbackMessage, transcript, shouldPersist) {
    conversation.keep([refusalFallbackMessage]);
    if (shouldPersist) {
      transcript.push(refusalFallbackMessage);
      logEvent("tengu_refusal_fallback_entry_recorded", {
        request_id: sanitizeMarkName(refusalFallbackMessage.requestId),
      });
    }
  }
  async function buildInitMessage(hostConfig, model, fastMode) {
    let [skills, plugins] = await loadSkillsAndPlugins(hostConfig.storageV5);
    let appState = getAppState();
    let resolvedSkills;
    try {
      resolvedSkills = dropSyncedClashes(skills, appState.mcp.commands);
    } catch (error) {
      logError(error);
      resolvedSkills = skills.filter((skill) => skill.loadedFrom !== "syncedSkills");
    }
    let capabilities;
    try {
      capabilities = resolveLazy(sessionConfig.capabilities);
    } catch (error) {
      logError(error);
      capabilities = [];
    }
    return await buildSdkInitMessage({
      session: hostConfig.session,
      tools: hostConfig.tools,
      mcpClients: hostConfig.mcpClients,
      model,
      readSessionEffort: () => resolveEffortLevel(appState),
      permissionMode: appState.toolPermissionContext.mode,
      commands: hostConfig.commands,
      agents: hostConfig.agents,
      skills: resolvedSkills,
      plugins,
      fastMode,
      proactivityState: appState,
      capabilities,
      messagesInView: () => messagesSinceCompactBoundary(initialMessages),
    });
  }
  return {
    submitMessage,
    interrupt: abortTurn,
    setModel: (model) => {
      userSpecifiedModel = model;
    },
    getMessages: () => initialMessages,
    keepArrivedRows: keepRows,
    appendMessages: (rows) => {
      if (heldSnapshotRows !== undefined) heldSnapshotRows.push(...rows);
      else if (deferredRows !== undefined)
        deferredRows.push({
          rows,
          isAnswered: false,
        });
      else appendRows(rows);
    },
    appendsSettled: () => conversation.settled(),
    getReadFileState: () => readFileCache,
    dispose: () => {
      clearClassifierContext();
      sessionConfig.abortController?.signal.removeEventListener("abort", onParentAbort);
      abortController.abort(userAbortReason("remote-cancel"));
      inputStream.done();
      queryEngine.return(undefined).catch(logError);
      initialMessages = [];
      readFileCache = createRemoteFileState(READ_FILE_STATE_CACHE_SIZE);
      sessionEnvVars = new Map();
      toolState = new InstanceRegistry();
      sessionHooks = createSessionHooksRegistry();
      memorySelector = emptyPickerState();
    },
  };
}
//@ chunk-tyg7f3ek.js:483526-483578 layout
/**
 * 非负取整的时间差
 */
function elapsedMs(startMs, endMs) {
  return Math.max(0, Math.round(endMs - startMs));
}
//@ chunk-tyg7f3ek.js:483578-483926 layout
/**
 * 发送时间相关遥测字段。
 */
function postTimingFields(enabled, startMs, timing) {
  try {
    let postedAtMs = timing?.postedAtMs;
    let enqueuedAtMs = timing?.enqueuedAtMs;
    if (!enabled || !postedAtMs) return {};
    let textRhythm = timing?.textRhythm;
    return {
      postMs: elapsedMs(startMs, postedAtMs),
      ...(enqueuedAtMs !== undefined &&
        enqueuedAtMs !== 0 && {
          queueWaitMs: elapsedMs(enqueuedAtMs, postedAtMs),
          queuedBehind: timing?.queuedBehind,
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
function resolveLazy(value) {
  return isFunction(value) ? value() : value;
}
//@ chunk-tyg7f3ek.js:485787-485831 affinity
/**
 * typeof 为 function。
 */
function isFunction(value) {
  return typeof value === "function";
}
//@ chunk-18hwfzwa.js:1510660-1510734 fingerprint = getCoordinatorUserContext (0.572)
/**
 * coordinator 用户上下文缓存（初始 null）。
 */
var getCoordinatorUserContext; // deferred: loads other modules while loading; runs once its import cycle is complete
var coordinatorContextCache;
deferInit("chunk-18hwfzwa.js:1510660", () => {
  getCoordinatorUserContext = require("./coordinator/coordinatorMode.js").getCoordinatorUserContext;
  coordinatorContextCache = null;
});
export { ask, QueryEngine, coordinatorContextCache, getCoordinatorUserContext };
