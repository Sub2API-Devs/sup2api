/**
 * screens/repl/SessionController.ts
 *
 * 2.1.316 新增。REPL 控制器：会话。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (18)
 * attribution: placement 18
 */
import { randomUUID } from "crypto";
import { dirname } from "path";
import { isSubagentHistoryEnabled } from "../../components/messages/UserPromptMessage.js";
import { unwrapMidTurnUserMessage } from "../../utils/messages/nonUserMessages.js";
import { unwrapCoordinatorMessage } from "../../utils/crossSessionMessages.js";
import { createDependencyWatcher } from "../../cli/print/rewindStandIn.js";
import { isLocalAgent } from "../../state/teammateViewHelpers.js";
import {
  getAgentTranscript,
  isTranscriptPersistenceDisabled,
  getMaterializedSessionFile,
  getTranscriptPathForSession,
  pinSessionId,
  getCurrentSessionDisplayTitle,
  resetSessionFilePointer,
  applyEndedByModelOnResume,
  clearSessionMetadata,
  restoreSessionMetadata,
  buildForkAdoptionMeta,
  holdPrecautionarySuppressionFor,
  markPrecautionClearResilientFor,
  copyPrecautionarySuppressionTo,
  getSessionIdFromLog,
  cacheHookSessionTitle,
  adoptResumedSessionFileAsync,
  adoptResumedSessionFile,
  saveWorktreeState,
  saveIsolationLatch,
  saveMode,
  subscribeSessionAgentNameChanged,
  getCurrentSessionAgentName,
  getCurrentSessionIsolationLatch,
  readTranscriptTailForTip,
  extractLastSyncedEventUuid,
  isRemoteEgressSuppressedFor,
  bridgeSessionForPulledWindow,
} from "../../utils/sessionStorage.js";
import { identityAgentId2, identityAgentId } from "../../utils/agentId.js";
import { degradeRestoredMessages, clearClassifierContext } from "../../utils/conversationRecovery.js";
import { logError } from "../../utils/log.js";
import {
  getOauthAccountInfo,
  subscribeOAuthCredentialsChangedOnDisk,
  checkOAuthCredentialsChangedOnDisk,
} from "../../utils/auth.js";
import {
  currentRestoreSource,
  markSessionRestored,
  reloadAgentDefinitionsForModeSwitch,
  loadAgentDefinitionsForSessionCwd,
  restoreAgentFromSession,
  restoreModelFromSession,
  appendSlackTagResumeRecords,
  computeStandaloneAgentContext,
  installRestoredModel,
  rearmRefusalFallbackHeaderFromTranscript,
  preparePlanModeRestoreOnInteractiveResume,
  restoreSessionStateFromLog,
  pushRestoredMemoryPauseNotice,
  exitRestoredWorktree,
  restoreWorktreeForResume,
  worktreeResumeNotice,
} from "../../utils/sessionRestore.js";
import {
  getSessionId,
  getParentSessionId,
  switchSession,
  getStickyBetas,
  removeSessionCronTasks,
  getSessionCronTasks,
  resetCostState,
  onSessionSwitch,
  getMainLoopModelOverride,
  hasRefusalFallbackOccurred,
  hasRefusalFallbackHeaderArmed,
  getInitialMainLoopModel,
  setLastMainThreadContextTokens,
  clearPendingContextCompacted,
  clearRefusalFallbackOccurred,
  setMainLoopModelOverride,
  getTotalOutputTokens,
  getLastInteractionTime,
  NOTIF_ACTIVE_THRESHOLD_MS,
} from "../../bootstrap/state.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { logForDebugging, createAttachmentMessage_2 as createAttachmentMessage } from "../../utils/debug.js";
import { string } from "../../../vendor/zod/v4/classic/schemas.js";
import { Text, Box } from "../../ink/components/Text.js";
import { createSignal } from "../../utils/signal.js";
import { createQueueBusyCheck } from "../../utils/messageQueueIdle.js";
import { resetContinueState } from "../../commands/continue/continueState.js";
import { shouldOfferResumeCompact, runResumeCompactOffer } from "./resumeCompactOffer.js";
import {
  estimateTokensWithAnchor,
  findLastRealAssistantMessage,
} from "../../services/compact/autoCompact.js";
import { messagesSinceCompactBoundary } from "../../services/projects/threadRows.js";
import {
  loadPrecomputedCompact,
  getPrecomputeEntry,
  prefetchPrecomputedSidecar,
} from "../../services/compact/precomputedCompact.js";
import { getQuerySourceForREPL } from "../../utils/promptCategory.js";
import { getMainLoopModelFromState } from "../../hooks/useMainLoopModel.js";
import {
  maybeShowColdResumeQuotaWarning,
  showIdleReturnDialog,
  quotaWarningSurface,
  buildPreviousConversationPointer,
  isPreviousConversationPointerAllowed,
} from "./idleReturn.js";
import { fromEnum, lit as lit_2 } from "../../services/analytics/safeMetadata.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { useDefaultToNewerModelKey } from "../../utils/newerModelOffer.js";
import { stripIgnorables } from "../../utils/sanitization.js";
import { createSystemMessage, getModeFromInput } from "../../utils/messages.js";
import { truncateToWidth } from "../../utils/format.js";
import {
  dropMalformedAttachments,
  deserializeToMessages,
  dedupeSessionStartRows,
} from "../../utils/transcript/deserialize.js";
import { getSessionProject } from "../../bootstrap/sessionSlices.js";
import { getSessionEndHookTimeoutMs, executeSessionEndHooks } from "../../utils/hooks.js";
import {
  processSessionStartHooks,
  takePendingHookSessionTitle,
  startHookRun,
  contextTokensOf,
} from "../../utils/sessionStart.js";
import { copyPlanForFork, copyPlanForResume } from "../../utils/plans.js";
import { copyFileHistoryForResume } from "../../utils/fileHistory.js";
import { liveAgentNames } from "../../utils/agentNameRegistry.js";
import { flushAndSaveCosts, setCostStateForRestore } from "../../cost-tracker.js";
import { forfeitAllChatPins } from "../../tasks/LocalAgentTask/childWork.js";
import { clearFileStateCacheKeepingSeeds } from "../../utils/fileStateCache.js";
import { getTaskRunState } from "../../utils/task/taskNotifications.js";
import { taskOutputDirForSession, initTaskOutputAsSymlink } from "../../utils/task/diskOutput.js";
import {
  seedCommentMonitorIntent,
  takeRestoredMonitorIntents,
  tornStopIntents,
  isAutoReactWired,
} from "../../services/artifacts/commentMonitor.js";
import { recordSwitchIfChanged } from "../../utils/model/modelSwitchHooks.js";
import { isAgentSwarmsEnabled } from "../../utils/agentSwarmsEnabled.js";
import { retireResumeSwapPair, rehydrateSession } from "./sessionRehydration.js";
import { retireConversationReplicas, disposeLiveState } from "../../services/liveReplica/liveReplica.js";
import {
  resetStickyBetaNameOnlyEntries,
  clearAdvisorHeld,
  clearInlineToolsRefusal,
  dropWireShapeSeed,
  clearWebSearchHistoryRejected,
  clearMediaItemCap,
  clearRefusedToolSchemas,
  forgetBeta,
} from "../../bootstrap/stateSlices.js";
import { getToolSearchBeta } from "../../utils/betas.js";
import { resetPickerState } from "../../memdir/findRelevantMemories.js";
import { AGENT_TASK_TYPES } from "../../tasks/taskKinds.js";
import { hasCompletedWithFindings } from "../../tasks/LocalAgentTask/LocalAgentTask.js";
import { invalidateToolDescriptions } from "../../services/api/toolDescriptionCache.js";
import { clearDeclared } from "../../tools/WaitForMcpServersTool/WaitForMcpServersTool.js";
import { getEndedByModel } from "../../tasks/endedByModel.js";
import { installDevModsPlaceholderExpander } from "../../services/plugins/devMods/devModsWatcher.js";
import { reclaimSessionNameOnResume } from "../../utils/sessionNameUniqueness.js";
import { lastResumeRecordRegistry } from "../../utils/lastResumeRecord.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { findIsolationLatchFromHistory } from "../../services/tools/webToolIsolation.js";
import { currentToolPermissionContext } from "../../utils/permissions/currentPermissionContext.js";
import { claudeAiEnvironment } from "../../constants/claudeAiOrigin.js";
import {
  describeNotResumedIncomplete,
  otherArmedSlugs,
  classifyMonitorHold,
  describeHeldMonitor,
  describeNotResumedAfterSwitch,
  rearmOnResumeSafe,
} from "../../services/artifacts/commentMonitorResume.js";
import { artifactViewerUrlFor } from "../../tools/ArtifactTool/artifactUrls.js";
import {
  findLiveReplyHolder,
  describeHolderWithOthersComments,
} from "../../services/artifacts/comments/replyYield.js";
import { isProcessRunning } from "../../utils/genericProcessUtils.js";
import { provenSameProcessAsync } from "../../utils/processIdentity.js";
import { restoreRemoteAgentTasks } from "../../tasks/RemoteAgentTask/RemoteAgentTask.js";
import { isMcpTasksEnabled } from "../../services/mcp/mcpTaskWorker.js";
import { loadMcpTaskModule } from "../../cli/print/resumeMcpTasks.js";
import {
  formatOrphanSummary,
  formatAgentRestartFailedNotice,
  formatOrphanedAgentNotification,
  formatAgentRestartedNotice,
  withResumeCapabilities,
} from "../../tasks/resumeOrphanedTasks.js";
import { getCurrentWorktreeSession } from "../../utils/worktree.js";
import { primePasteIdsFromMessages, readPromptText, renumberPastedContents } from "../../history.js";
import { emitReplBridgeEvent } from "../../hooks/useReplBridge.js";
import { logEvent } from "../../services/analytics/index.js";
import {
  sanitizedErrorNameForTelemetry,
  toError,
  errorMessage,
  isAbortError,
  hasExactErrorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../../utils/errors.js";
import {
  applyArtifactResumeCarry,
  collectResumeArtifactCarry,
  rebuildArtifactCarryAfterRewind,
} from "../../tools/ArtifactTool/artifactResumeCarry.js";
import { isResumeFrameSeedEligible } from "../../services/artifacts/artifactToolGates.js";
import { discardQueuedOutside, detachedCallSlots } from "../../services/tools/detachedToolCalls.js";
import { diagnosticTrackingSlot } from "../../services/diagnosticTracking.js";
import {
  isConversationResetSwitch,
  cancelOnConversationReset,
} from "../../services/quotaAutoResume/quotaAutoResume.js";
import { teammatePermissionContextBySessionRoot } from "../../utils/swarm/teammateIdleResult.js";
import { setToolPermissionContextAndNotify } from "../../components/agents/AgentsMenu.js";
import { noteFirstFullscreenFrame } from "../../utils/fullscreenBootGuard.js";
import { commitGate } from "../../utils/api.js";
import { setJitPolicyAfterStartup } from "../../utils/jitPolicy.js";
import { useArtifactWatchStartup } from "../../services/artifacts/watchArtifact.js";
import { WakeRouter, resumeStrandedAgent } from "./wakeRouter.js";
import {
  resumeAgentBackground,
  isResumeDenied,
  ResumeAgentStateError,
} from "../../tools/AgentTool/resumeAgent.js";
import { lazyCommandRunSignal } from "../../plugins/functionHooks/commandRunDispatch.js";
import { idleCompactionSlot, COMPACTED_WHILE_IDLE_TEXT } from "../../services/compact/idleCompaction.js";
import { subscribeGlobalConfigInstalled } from "../../utils/config.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  resetUserData,
  refreshGrowthBookAfterAuthChange,
  initializeGrowthBook,
} from "../../services/analytics/growthbook.js";
import { updateGroveSettings_2, getGroveNoticeConfig } from "../../services/api/grove.js";
import { refreshRemoteManagedSettings } from "../../services/remoteManagedSettings/loader.js";
import { showStandaloneSecurityDialog } from "../../components/ManagedSettingsSecurityDialog/showStandaloneSecurityDialog.js";
import { loginEventCounter } from "../../services/oauth/loginEvents.js";
import { isBgSession, isActingAsBgJob, getBgJobDir, getBgTakeover } from "../../utils/concurrentSessions.js";
import {
  canAutoReply,
  subscribeAutoReplyChanges,
  drainUnattendedReplies,
  getAutoReactSlugs,
  formatAutoReplyNotice,
} from "../../services/artifactComments/autoReplyNotices.js";
import { count } from "../../utils/collections.js";
import {
  isCarriedFrameLiveWatch,
  readAndConsumeAdoptJson,
  TAKEOVER_ADOPT_WAIT_MS,
  recordUnresumedFrameLive,
  killOrphanedAdoptedShell,
  adoptCron,
  resolveAdoptedScriptPath,
  linkAdoptedWorkflowDir,
  emitAdoptWorkflowFailed,
  recordUnresumedAdopt,
  mcpSettledForAdopt,
  STALE_THRESHOLD_MS,
  takeUnresumedAdopt,
  emitAdoptAgentDenied,
  emitAdoptAgentFailed,
  takeUnresumedFrameLive,
  reparkUnresumedFrameLive,
  releaseReparkedFrameLive,
} from "../../utils/background/adopt.js";
import { syncLiveInFlightSnapshot } from "../../services/daemon/jobState.js";
import { summarizeBackgroundWork } from "../../tasks/backgroundTaskLabels.js";
import { HeldPeerMessages } from "../../utils/peerInbound/heldPeerMessages.js";
import { createAutoDialogSelector } from "./storeHooks.js";
import { promptInputStoreFor } from "../../state/promptInputStore.js";
import { startCrossSessionHoldReceipt } from "../../utils/crossSessionHoldReceipt.js";
import { registerReplyYieldNotices } from "../../services/artifacts/replyYieldHolder.js";
import { syncJobStateName } from "../../utils/background/jobStateNameSync.js";
import { sessionNameYieldedNotice } from "../../commands/rename/rename.js";
import { swarmHostState } from "../../utils/swarm/hostState.js";
import { commandListDisplayTruncated } from "../../components/permissions/shellPermissionHelpers.js";
import { startSessionHooks } from "../../plugins/functionHooks/sessionEvents.js";
import { loadPluginHooks } from "../../utils/plugins/loadPluginHooks.js";
import { appendRowsWithHooks, collectRewoundFileTrackingPaths } from "../../utils/queryHelpers.js";
import { taskRootUnderTemp, normalizeFilePath } from "../../utils/tempDirRealpaths.js";
import { reconcileCarriedAgents, resumeCarriedWorkflow } from "../../utils/background/adoptCarriedAgents.js";
import { spawnShellTask } from "../../tasks/LocalShellTask/LocalShellTask.js";
import { DetachedShellProcess } from "../../tasks/LocalShellTask/DetachedShellProcess.js";
import { registerAdoptedWorkflowTask } from "../../tasks/LocalWorkflowTask/LocalWorkflowTask.js";
import { waitForStoreState } from "../../context/voice.js";
import { isArtifactFetchEnabled } from "../../tools/WebFetchTool/WebFetchTool.js";
import { parseArtifactUrl } from "../../tools/ArtifactTool/constants.js";
import { getShortcutDisplay } from "../../keybindings/shortcutFormat.js";
import { peekPendingWatchArtifact } from "../../cli/watchArtifactArgs.js";
import { mainObservedArtifactVersion } from "../../services/artifacts/readObservation.js";
import { probeAdoptedJob } from "../../utils/background/adoptJob.js";
import { noopLedger } from "../../services/api/promptPrefixLedger.js";
import { decideRefusalFallbackRestore } from "./modelRefusalFallback.js";
import { usesFirstPartyModelIds } from "../../utils/model/providers.js";
import { getActiveModelFallback } from "../../services/api/safeguardMessages.js";
import { notePendingConversationEdit } from "../../utils/shell/shellToolUtils.js";
import { cronCarryAttachment } from "../../services/compact/compactCarry.js";
import { threadAskMarkerFor } from "../../services/projects/threadTranscript.js";
import { setLastCacheSafeForkMessages } from "../../utils/forkedAgent.js";
import { classifyFallbackOrigin } from "../../services/api/refusalFallback.js";
import { isFastModeEnabled, isFastModeActive, reportFastModeToggle } from "../../utils/fastMode.js";
import { mergeTurnTags } from "../../utils/userTurnTags.js";
import { isObjectBlock } from "../../utils/toolResultStorage.js";
import { splitStampedImages } from "../../utils/messageQueueManager.js";
import { setSliceField } from "../../state/sliceHelpers.js";
import { recordImagePath, storeImageAndRecord } from "../../utils/imageStore.js";
import { createAbortController } from "../../utils/abortController.js";
import { buildCompactCacheSafeParams } from "../../commands/compact/compact.js";
import {
  partialCompactConversation,
  buildPostCompactMessages_2,
  ERROR_MESSAGE_NOT_ENOUGH_MESSAGES,
  buildPostCompactMessages,
  getTokenCountFromUsage_4,
} from "../../services/compact/compact.js";
import { findMessageIndexByUuid } from "../../cli/queuedCommands.js";
import { pruneDisplayedContent } from "../../cli/print/turnStreaming.js";
import { cleanupAfterCompaction } from "../../services/compact/postCompactCleanup.js";
import { leadingCompactHint } from "../../components/messages/GroupedToolUseContent.js";
import { env } from "../../utils/env.js";
import { isRemoteSessionAvailable } from "../../remote/remoteMode.js";
import { compactCommand } from "../../commands/compact/index.js";
import { isClaudeMdLoadingDisabled } from "../../utils/settings/customizationDisabled.js";
import {
  getMemoryFilesCached,
  isManagedOrVirtualPath,
  shouldInjectMemoryFile,
} from "../../utils/claudemd.js";
import { getReadTimestamp } from "../../tools/FileReadTool/savedOutputPaths.js";
import { stripBomAndCarriageReturn } from "../../utils/remoteFileState.js";

//@ chunk-18hwfzwa.js:344654-344715 placement
function appendLine(h, x) {
  if (h.trim() === "") return x;
  return `${h}
${x}`;
}
//@ chunk-18hwfzwa.js:344715-344830 placement
function restorePromptAfterCancel(draft, x, { neverSubmitted: D = false } = {}) {
  draft.setMode("prompt");
  draft.replaceValue(appendLine(draft.value, x));
  if (!D) draft.markCameBack();
}
//@ chunk-18hwfzwa.js:369774-369833 placement
function noopController({ store, dialogStore, queue }) {
  return () => {};
}
//@ chunk-18hwfzwa.js:369833-371237 placement
function mergeQueuedHumanMessages(h, messages) {
  let D = new Set(messages.map((kt) => kt.uuid));
  let filtered = h.filter((kt) => !D.has(kt.uuid));
  if (!isSubagentHistoryEnabled()) return [...filtered, ...messages];
  let ee = [];
  for (let kt of filtered) {
    if (kt.type !== "user" || kt.isMeta !== true || typeof kt.message.content !== "string") continue;
    let kind = kt.origin?.kind;
    let It =
      kind === "human"
        ? unwrapMidTurnUserMessage(kt.message.content)
        : kind === "coordinator"
          ? unwrapCoordinatorMessage(kt.message.content)
          : undefined;
    if (kind !== undefined && It !== undefined)
      ee.push({
        row: kt,
        key: joinLines(kind, It),
        words: It,
      });
  }
  let ke = new Map(h.map((kt, At) => [kt.uuid, At]));
  let Re = new Set();
  let Be = [];
  let He;
  for (let kt of messages) {
    let At = ke.get(kt.uuid);
    if (At !== undefined) {
      He = At;
      continue;
    }
    if (kt.type !== "user" || kt.isMeta === true || typeof kt.message.content !== "string") continue;
    let kind = kt.origin?.kind;
    if (kind !== "human" && kind !== "coordinator") continue;
    let Ot = joinLines(kind, kt.message.content);
    let Et = He;
    let Dt =
      Et === undefined
        ? undefined
        : ee.find((Lt) => Lt.key === Ot && !Re.has(Lt.row.uuid) && (ke.get(Lt.row.uuid) ?? -1) > Et);
    if (Dt === undefined) Be.push(Ot);
    else Re.add(Dt.row.uuid);
  }
  for (let kt of Be) {
    let last = ee.findLast((It) => It.key === kt && !Re.has(It.row.uuid));
    if (last !== undefined) Re.add(last.row.uuid);
  }
  let We = new Map();
  for (let { row, words } of ee)
    if (!Re.has(row.uuid)) {
      let { isMeta, ...Ot } = row;
      We.set(row.uuid, {
        ...Ot,
        message: {
          ...row.message,
          content: words,
        },
      });
    }
  let ze = [];
  let Xe = new Map();
  let rt;
  for (let kt of h) {
    let At = We.get(kt.uuid);
    if (D.has(kt.uuid)) rt = kt.uuid;
    else if (At !== undefined && rt !== undefined) Xe.set(rt, [...(Xe.get(rt) ?? []), At]);
    else {
      ze.push(At ?? kt);
      rt = undefined;
    }
  }
  return [...ze, ...messages.flatMap((kt) => [kt, ...(Xe.get(kt.uuid) ?? [])])];
}
//@ chunk-18hwfzwa.js:371237-371273 placement
function joinLines(kind, x) {
  return `${kind}
${x}`;
}
//@ chunk-18hwfzwa.js:371273-371914 placement
function syncViewedAgentPermissionMode({ store, setAppState, storageV5 }) {
  return createDependencyWatcher(
    [store],
    () => {
      let { viewingAgentTaskId, tasks } = store.getState();
      let ke = viewingAgentTaskId ? tasks[viewingAgentTaskId] : undefined;
      let Re = isLocalAgent(ke) && ke.retain && !ke.diskLoaded;
      return [viewingAgentTaskId, Re];
    },
    (L, ee) => {
      if (!L || !ee) return;
      let ke = L;
      getAgentTranscript(identityAgentId2(ke), storageV5)
        .then((agentTranscript) => {
          setAppState((Be) => {
            let He = Be.tasks[ke];
            if (!isLocalAgent(He) || He.diskLoaded || !He.retain) return Be;
            let We = Be.transcripts[ke];
            let messages = We?.messages ?? [];
            let Xe = new Set(messages.map((message) => message.uuid));
            let rt = mergeQueuedHumanMessages(agentTranscript?.messages ?? [], messages);
            let filtered = rt.filter((At) => !Xe.has(At.uuid));
            degradeRestoredMessages(filtered);
            return {
              ...Be,
              tasks: {
                ...Be.tasks,
                [ke]: {
                  ...He,
                  diskLoaded: true,
                },
              },
              transcripts: {
                ...Be.transcripts,
                [ke]: {
                  inProgressToolUseIDs: new Set(),
                  ...We,
                  messages: rt,
                },
              },
            };
          });
        })
        .catch(logError);
    },
  );
}
//@ chunk-18hwfzwa.js:371914-371989 placement
var artifactsMcpEntryModule = require("./chunk-cm57mjc2.js");
var RESUME_RETRY_DELAYS_MS = [1000, 3000, 1e4];
var DRAIN_CHECK_INTERVAL_MS = 50;
var MAX_DRAIN_WAIT_CYCLES = 1300;
//@ chunk-18hwfzwa.js:371989-372064 placement
function oauthAccountFingerprint() {
  let oauthAccountInfo = getOauthAccountInfo();
  return `${oauthAccountInfo?.accountUuid}|${oauthAccountInfo?.profileFetchedAt}`;
}
//@ chunk-18hwfzwa.js:372064-372127 placement
function isNotPlacedSystemMessage(h) {
  return h.type !== "system" || h.subtype !== "placed";
}
//@ chunk-18hwfzwa.js:372127-372224 placement
function transcriptStampSessionController(h) {
  let lastIndex = h.findLastIndex(isNotPlacedSystemMessage);
  let found = h.find(isNotPlacedSystemMessage);
  return `${lastIndex + 1}|${found?.uuid}|${h[lastIndex]?.uuid}`;
}
//@ chunk-18hwfzwa.js:372224-372356 placement
/**
 * 当前会话 id 与 transcript 路径（持久化关闭或无会话文件时 null）。
 */
function currentTranscriptRef() {
  let h = currentRestoreSource();
  if (h !== null) return h;
  if (isTranscriptPersistenceDisabled() || getMaterializedSessionFile() === null) return null;
  let sessionId = getSessionId();
  return {
    sessionId,
    transcriptPath: getTranscriptPathForSession(sessionId),
  };
}
//@ chunk-18hwfzwa.js:372356-372447 placement
var SLASH_COMMAND_PICKER_KEYS = new Set([
  "slash_command_picker",
  "slash_command_session_id",
  "slash_command_title",
]);
//@ chunk-18hwfzwa.js:372447-411777 placement
/**
 * SessionController：REPL 会话控制器，管理会话 ID、续接、分叉与会话级状态。
 */
class SessionController {
  session;
  #e = new Set();
  #t = 0;
  #o = null;
  #n;
  store;
  _setAppState;
  transcript;
  turn;
  draft;
  #s;
  #r;
  scope;
  engine;
  dialogStore;
  taskRegistry;
  messageQueue;
  storageV5;
  credentials;
  sessionHooks;
  initialMessages;
  conversationOrigin;
  preClearOrigin;
  initialMainThreadAgentDefinition;
  disableQuery;
  runsNoModelTurn;
  _resetReplTabToConvo;
  _resetTurnEventTail;
  _clock;
  _sandbox;
  _spinnerStore;
  _pendingHookSet;
  _landingHookSet = null;
  _restoredStamp;
  _disposed = false;
  _queuedClearWatch = null;
  _cancelSiblingLoginCheck;
  adoptedPrefillRef;
  _adoptedPrefill = undefined;
  _adoptedFrameLive = undefined;
  _host = null;
  _snapshot;
  _changed = createSignal();
  constructor({
    session,
    presentation,
    store,
    setAppState,
    transcript,
    turn,
    draft,
    chrome,
    scrollPin,
    scope,
    engine,
    dialogStore,
    taskRegistry,
    messageQueue,
    storageV5,
    credentials,
    sessionHooks,
    initialMessages,
    initialMessagesOrigin = "local",
    initialMainThreadAgentDefinition,
    disableQuery = false,
    hasRemoteTransport,
    resetReplTabToConvo,
    resetTurnEventTail,
    clock,
    sandbox,
    spinnerStore,
    pendingHookMessages,
  }) {
    this.session = session;
    this.#e.add(getSessionId());
    this.#n = presentation;
    this.store = store;
    this._setAppState = setAppState;
    this.transcript = transcript;
    this.turn = turn;
    this.draft = draft;
    this.#s = chrome;
    this.#r = scrollPin;
    this.scope = scope;
    this.engine = engine;
    this.dialogStore = dialogStore;
    this.taskRegistry = taskRegistry;
    this.messageQueue = messageQueue;
    this.storageV5 = storageV5;
    this.credentials = credentials;
    this.sessionHooks = sessionHooks;
    this.initialMessages = initialMessages;
    this.conversationOrigin = initialMessagesOrigin;
    this.initialMainThreadAgentDefinition = initialMainThreadAgentDefinition;
    this.disableQuery = disableQuery;
    this.runsNoModelTurn = disableQuery || hasRemoteTransport;
    this._resetReplTabToConvo = resetReplTabToConvo;
    this._resetTurnEventTail = resetTurnEventTail;
    this._clock = clock;
    this._sandbox = sandbox;
    this._spinnerStore = spinnerStore;
    this._pendingHookSet = pendingHookMessages
      ? {
          run: pendingHookMessages,
          sessionId: session.id,
        }
      : null;
    this._restoredStamp = initialMessages && transcriptStampSessionController(initialMessages);
    this._snapshot = {
      conversationId: randomUUID(),
      haikuTitle: undefined,
      headHooksPending: this.headHooksPending,
    };
    let Ao = () => this._adoptedPrefill;
    this.adoptedPrefillRef = {
      get current() {
        return Ao();
      },
    };
  }
  subscribe = this._changed.subscribe;
  getSnapshot = () => this._snapshot;
  _publish(h) {
    let _snapshot = this._snapshot;
    let D = {
      ..._snapshot,
      ...h,
    };
    if (
      D.conversationId === _snapshot.conversationId &&
      D.haikuTitle === _snapshot.haikuTitle &&
      D.headHooksPending === _snapshot.headHooksPending
    )
      return;
    this._snapshot = D;
    this._changed.emit();
  }
  bindHost(_host) {
    this._host = _host;
  }
  _requireHost() {
    if (this._host === null) throw Error("SessionController: used before its screen bound a host");
    return this._host;
  }
  _buildIdleToolUseContext() {
    return this.turn.buildToolUseContext(
      this.transcript.getSnapshot(),
      [],
      new AbortController(),
      this._requireHost().mainLoopModel,
    );
  }
  _liveTranscript() {
    return createQueueBusyCheck(this.messageQueue, () => this.transcript.getSnapshot());
  }
  setHaikuTitle = (haikuTitle) => {
    this._publish({
      haikuTitle,
    });
  };
  bumpConversationId = () => {
    this._publish({
      conversationId: randomUUID(),
    });
  };
  applyConversationReset = (conversationId) => {
    this.transcript.cut();
    this.turn.resetForConversation({
      kind: "fresh",
    });
    this._publish({
      conversationId,
      haikuTitle: undefined,
    });
    resetContinueState();
    this._resetTurnEventTail();
    this.preClearOrigin = this.conversationOrigin;
    this.conversationOrigin = "local";
  };
  maybePromptStaleResume(h, x) {
    this._promptStaleResume(h, x).catch(logError);
  }
  async _promptStaleResume(h, x) {
    let { transcript, storageV5, session } = this;
    let ke = shouldOfferResumeCompact(h, estimateTokensWithAnchor);
    if (ke) {
      let Re = messagesSinceCompactBoundary(h);
      try {
        loadPrecomputedCompact(
          session.precompute,
          "main",
          getQuerySourceForREPL(),
          Re,
          getMainLoopModelFromState(this.store.getState()),
          storageV5,
        );
      } catch (error) {
        logError(error);
      }
      let Be = () => {
        let precomputeEntry = getPrecomputeEntry(session.precompute, undefined);
        return (
          precomputeEntry?.status === "ready" &&
          Re.some((ze) => ze.uuid === precomputeEntry.coverage.lastUuid)
        );
      };
      if (
        (await runResumeCompactOffer(
          this.scope.requestDialog,
          {
            ...ke,
            hasPrecomputedSummary: Be(),
          },
          {
            getMessageCount: () => transcript.getSnapshot().length,
            storage: storageV5,
            hasPrecomputedSummary: Be,
            runCompact: () => void this._submitSlashCommand("/compact"),
          },
        )) !== "skipped_no_summary"
      )
        return;
    }
    try {
      let Re = maybeShowColdResumeQuotaWarning(h, getMainLoopModelFromState(this.store.getState()), "resume");
      if (Re) {
        let Be = this.#t;
        this.#c(
          Be,
          await showIdleReturnDialog(this.scope.requestDialog, Re, {
            trigger: "resume",
            offersLookUp: offersLookUp(h, x),
            startNewConversation: () => this._startNewConversation(h, x),
          }),
        );
        return;
      }
    } catch (error) {
      logFeatureBad("cli_cold_resume_quota_warning", "prompt_failed");
      throw error;
    }
    try {
      await useDefaultToNewerModelKey(h, {
        requestDialog: this.scope.requestDialog,
        addNotification: (Re) => this._requireHost().addNotification(Re),
        removeNotification: (Re) => this._requireHost().removeNotification(Re),
        session,
        store: this.store,
        setAppState: this._setAppState,
        transcript,
        storageV5,
      });
    } catch (error) {
      logFeatureBad("cli_newer_model_offer", "prompt_failed");
      throw error;
    }
  }
  evaluateIdleCacheQuota() {
    if (this.#o === this.#t) return null;
    try {
      return maybeShowColdResumeQuotaWarning(
        this.transcript.getSnapshot(),
        getMainLoopModelFromState(this.store.getState()),
        "idle",
      );
    } catch (error) {
      logFeatureBad(quotaWarningSurface("idle"), "prompt_failed");
      logError(error);
      return null;
    }
  }
  async askIdleCacheQuota(h) {
    let x = this.#t;
    try {
      let D = await showIdleReturnDialog(this.scope.requestDialog, h, {
        trigger: "idle",
        offersLookUp: offersLookUp(this.transcript.getSnapshot(), currentTranscriptRef()),
        startNewConversation: () =>
          this._startNewConversation(this.transcript.getSnapshot(), currentTranscriptRef(), "idle"),
      });
      this.#c(x, D);
    } catch (error) {
      logFeatureBad(quotaWarningSurface("idle"), "prompt_failed");
      throw error;
    }
  }
  #c(h, x) {
    if (x === "resume" || x === "dismiss") this.#o = h;
  }
  async _startNewConversation(h, x, D = "resume") {
    let L = quotaWarningSurface(D);
    let sessionId = getSessionId();
    let ke = pinSessionId(sessionId);
    let Re = null;
    let pointerFailed = false;
    if (x !== null && canLookUpPrevious(h, ke))
      try {
        Re = buildPreviousConversationPointer({
          resumed: h,
          source: x,
        });
      } catch (error) {
        pointerFailed = true;
        logError(error);
      }
    let previousTitle;
    try {
      previousTitle = Re === null ? undefined : getCurrentSessionDisplayTitle(sessionId);
    } catch (error) {
      logError(error);
    }
    let We = new Set(this.messageQueue.getCommandQueue());
    try {
      await this._submitSlashCommand(
        "/clear",
        D === "idle"
          ? {
              fromKeybinding: true,
              keepsComposer: true,
              leavesIdeSelection: true,
            }
          : undefined,
      );
    } catch (error) {
      logFeatureBad(L, "clear_failed");
      logError(error);
      return;
    }
    let ze = {
      pointer: Re,
      pointerFailed,
      previousTitle,
      feature: L,
    };
    if (getSessionId() !== sessionId) {
      this._finishNewConversation(ze, true);
      return;
    }
    let Xe = (kt) => !We.has(kt) && kt.mode === "prompt" && kt.value === "/clear";
    let found = this.messageQueue.getCommandQueue().find(Xe);
    this.messageQueue.someInFlightDrainCommand((kt) => {
      if (found === undefined && Xe(kt)) found = kt;
      return found !== undefined;
    });
    if (found === undefined) {
      this._finishNewConversation(ze, false);
      return;
    }
    this._watchQueuedClear(found, sessionId, ke, ze);
  }
  _watchQueuedClear(h, x, D, L) {
    this._queuedClearWatch?.settle(false);
    if (this._disposed) {
      this._finishNewConversation(L, false);
      return;
    }
    let { messageQueue, turn } = this;
    let Re = [];
    let Be = false;
    let He = false;
    let We = {
      stop: () => {
        for (let It of Re.splice(0)) It();
        if (this._queuedClearWatch === We) this._queuedClearWatch = null;
      },
      settle: (It) => {
        if (Be) return;
        Be = true;
        We.stop();
        this._finishNewConversation(
          He
            ? {
                ...L,
                pointer: null,
              }
            : L,
          It,
        );
      },
    };
    this._queuedClearWatch = We;
    let ze = (It) => It === h || (h.uuid !== undefined && It.uuid === h.uuid);
    let Xe = messageQueue.someInFlightDrainCommand(ze);
    let rt;
    let kt = 0;
    let At = () => {
      try {
        if (this._queuedClearWatch !== We) return;
        if (getSessionId() === x && isRemoteOrBridgeSession(D)) He = true;
        let It = messageQueue.someInFlightDrainCommand(ze);
        Xe ||= It;
        if (turn.guard.isActive) {
          kt = 0;
          return;
        }
        if (messageQueue.getCommandQueue().some(ze)) return;
        let Ot = Xe && getSessionId() !== x && getParentSessionId() === x;
        if (!Ot && It && kt < MAX_DRAIN_WAIT_CYCLES) {
          kt++;
          rt?.();
          rt = this._clock.setTimeout(At, DRAIN_CHECK_INTERVAL_MS);
          return;
        }
        We.settle(Ot);
      } catch (error) {
        We.stop();
        logError(error);
        if (!Be) {
          Be = true;
          logFeatureSad(L.feature, "clear_not_applied");
        }
      }
    };
    Re.push(
      turn.guard.subscribe(At),
      messageQueue.subscribe(() => queueMicrotask(At)),
      () => rt?.(),
    );
    queueMicrotask(At);
  }
  _finishNewConversation({ pointer, pointerFailed, previousTitle, feature }, ee) {
    let ke = false;
    if (pointer !== null && ee)
      try {
        let Re = previousTitle === undefined ? "" : stripIgnorables(previousTitle);
        let systemMessage = createSystemMessage(
          Re === ""
            ? "New conversation. Claude can look up the previous conversation if you refer to it."
            : `New conversation. Claude can look up "${truncateToWidth(Re, 60)}" if you refer to it.`,
          "notice",
        );
        this.transcript.apply({
          type: "append",
          messages: [systemMessage, pointer],
        });
      } catch (error) {
        ke = true;
        logError(error);
      }
    if (!ee) logFeatureSad(feature, "clear_not_applied");
    else if (pointerFailed || ke)
      logFeatureSad(feature, pointerFailed ? "pointer_failed" : "pointer_append_failed");
    else logFeatureOk(feature);
  }
  _submitSlashCommand(h, x) {
    return this._requireHost().onSubmit(
      h,
      {
        setCursorOffset: () => {},
        clearBuffer: () => {},
        resetHistory: () => {},
      },
      {
        ...x,
        inputModeOverride: "prompt",
      },
    );
  }
  markConversationRemote = () => {
    this.conversationOrigin = "remote";
    this.#t++;
  };
  resume = async (h, log, D) => {
    let {
      session,
      store,
      _setAppState,
      turn,
      dialogStore,
      taskRegistry,
      scope,
      storageV5,
      credentials,
      initialMainThreadAgentDefinition,
      draft,
    } = this;
    let { mainLoopModel } = this._requireHost();
    let replace = this.transcript.replace;
    let startTime = performance.now();
    try {
      markSessionRestored(session.host);
      let result = {
        ...log,
        messages: dropMalformedAttachments(log.messages),
      };
      let messages = deserializeToMessages(result.messages);
      let Lt = undefined;
      let oo = require("./chunk-yxywkh50.js");
      let Xt = oo.matchSessionMode(log.mode);
      if (Xt) {
        let agentDefinitions = await reloadAgentDefinitionsForModeSwitch(
          getSessionProject(session).originalCwd,
          [],
          storageV5,
        );
        _setAppState((Yo) => ({
          ...Yo,
          agentDefinitions,
        }));
        messages.push(createSystemMessage(Xt, "warning"));
      }
      let sessionEndHookTimeoutMs = getSessionEndHookTimeoutMs();
      await executeSessionEndHooks(session, "resume", {
        sessionHooks: this.sessionHooks,
        getAppState: () => store.getState(),
        signal: AbortSignal.timeout(sessionEndHookTimeoutMs),
        storageV5,
        credentials,
      });
      let sessionAgentDefinitions = await loadAgentDefinitionsForSessionCwd(log.projectPath, storageV5);
      let { agentDefinition } = restoreAgentFromSession(
        log.agentSetting,
        initialMainThreadAgentDefinition,
        store.getState().agentDefinitions,
        {
          sessionAgentDefinitions,
          sessionCwd: log.projectPath,
          onResolveMiss: (vo) => messages.push(createSystemMessage(vo, "warning")),
        },
      );
      scope.setMainThreadAgentDefinition(agentDefinition);
      _setAppState((vo) => ({
        ...vo,
        agent: agentDefinition?.agentType,
      }));
      let ao;
      let co;
      if (D !== "fork")
        co = await restoreModelFromSession(
          messages,
          mainLoopModel,
          (vo) => messages.push(createSystemMessage(vo, "warning")),
          {
            scheduleTelemetry: (vo) => {
              ao = vo;
            },
            storageV5,
            credentials,
          },
        );
      appendSlackTagResumeRecords(messages, {
        fork: D === "fork",
        sessionId: h,
      });
      let bo = await processSessionStartHooks(session, D === "fork" ? "fork" : "resume", {
        sessionId: h,
        envFileSessionId: identityAgentId(h),
        sessionTitle: log.customTitle,
        agentType: agentDefinition?.agentType,
        model: co ?? mainLoopModel,
        resumedMessages: log.messages,
        storageV5,
        credentials,
      });
      messages.push(...dedupeSessionStartRows(messages, bo));
      if (D === "fork") copyPlanForFork(log, identityAgentId(h), storageV5);
      else copyPlanForResume(log, identityAgentId(h), storageV5);
      if (log.fileHistorySnapshots) copyFileHistoryForResume(log, identityAgentId(h), storageV5);
      _setAppState((vo) => ({
        ...vo,
        standaloneAgentContext: computeStandaloneAgentContext(log.agentName, log.agentColor),
        sendMessagePins: {},
        agentNameRegistry: liveAgentNames(vo.agentNameRegistry, vo.tasks),
      }));
      let Ao =
        D === "fork"
          ? this.conversationOrigin
          : D === "rewind_pre_clear"
            ? (this.preClearOrigin ?? this.conversationOrigin)
            : "local";
      turn.resetLoadingState();
      turn.setAbortController(null);
      this.transcript.cut();
      this._publish({
        conversationId: h,
      });
      this._resetTurnEventTail();
      flushAndSaveCosts(undefined, storageV5);
      let taskId = identityAgentId(h);
      let Ro = pinSessionId(taskId);
      let sessionId = getSessionId();
      this.#e.add(sessionId);
      let Io = this.#e.has(taskId);
      switchSession(taskId, D === "fork" ? "fork" : "resume", log.fullPath ? dirname(log.fullPath) : null);
      if (D !== "fork") _setAppState(forfeitAllChatPins);
      if (D !== "fork" && taskId !== sessionId) clearFileStateCacheKeepingSeeds(scope.readFileState);
      this.restoreReadFileState(
        messages,
        log.projectPath ?? getSessionProject(session).originalCwd,
        D === "fork",
        Ao,
      );
      if (D !== "fork")
        getTaskRunState().inheritPredecessorLinks(taskOutputDirForSession(taskId), log.modified.getTime());
      if (D !== "fork")
        seedCommentMonitorIntent(log.artifactCommentMonitor, {
          ...(storageV5 !== undefined && {
            storageV5,
          }),
        });
      if (co) {
        let vo = installRestoredModel(messages, co, false, storageV5, credentials);
        if (vo)
          _setAppState((Yo) => {
            if (Yo.mainLoopModel === vo) return Yo;
            recordSwitchIfChanged(session, Yo, vo, "resume");
            return {
              ...Yo,
              mainLoopModel: vo,
            };
          });
      }
      rearmRefusalFallbackHeaderFromTranscript(messages, D === "fork");
      ao?.();
      let { renameRecordingForSession } = await import("./chunk-qh27pgpw.js");
      await renameRecordingForSession(session, storageV5);
      await resetSessionFilePointer();
      let mn = isAgentSwarmsEnabled()
        ? await (await import("./chunk-6cc2zqkz.js")).rekeySessionTeamInSession(storageV5)
        : undefined;
      if (mn)
        _setAppState((vo) => ({
          ...vo,
          teamContext: mn.teamContext,
          teammateColors: mn.teammateColors,
        }));
      if (D !== "fork") {
        retireResumeSwapPair(store.getState, store.setState, dialogStore, this.session);
        retireConversationReplicas();
        disposeLiveState();
        this.rehydrateResumedFrameState(messages, false, Ao, false);
        resetStickyBetaNameOnlyEntries(getStickyBetas());
        clearAdvisorHeld(getStickyBetas());
        clearInlineToolsRefusal(getStickyBetas());
        dropWireShapeSeed(getStickyBetas());
        clearWebSearchHistoryRejected(getStickyBetas());
        clearMediaItemCap(getStickyBetas());
        clearRefusedToolSchemas(getStickyBetas());
        forgetBeta(getStickyBetas(), getToolSearchBeta());
        resetPickerState(scope.memorySelector);
        if (
          !Object.values(store.getState().tasks).some(
            (task) =>
              AGENT_TASK_TYPES.has(task.type) &&
              (task.status === "running" || (isLocalAgent(task) && hasCompletedWithFindings(task))),
          )
        ) {
          invalidateToolDescriptions();
          clearDeclared(session.host);
        }
        if (SLASH_COMMAND_PICKER_KEYS.has(D) && !Io) {
          let planModeRestoreOnInteractiveResume = await preparePlanModeRestoreOnInteractiveResume({
            storedPermissionMode: log.permissionMode,
            messages,
            forkSession: false,
            permissionModeSuppliedOnInvocation: false,
            lane: "interactive_slash",
          });
          _setAppState((kn) => {
            let Fn = planModeRestoreOnInteractiveResume(kn.toolPermissionContext);
            return Fn
              ? {
                  ...kn,
                  toolPermissionContext: Fn,
                }
              : kn;
          });
        }
      }
      restoreSessionStateFromLog(result, store.setState, this.sessionHooks, {
        preserveLiveBudget: D === "fork" || D === "rewind_pre_clear",
      });
      applyEndedByModelOnResume(getEndedByModel(log), _setAppState);
      clearSessionMetadata();
      restoreSessionMetadata(
        D === "fork"
          ? buildForkAdoptionMeta(log, {
              stripRelocatedCwd: true,
            })
          : {
              ...log,
              artifactCommentMonitor: undefined,
            },
        {
          taintSid: Ro,
          storageV5,
        },
      );
      installDevModsPlaceholderExpander();
      pushRestoredMemoryPauseNotice(messages);
      if (D === "fork")
        if (log.precautionarySuppressionHeld) {
          holdPrecautionarySuppressionFor(Ro);
          markPrecautionClearResilientFor(Ro);
        } else copyPrecautionarySuppressionTo(Ro, pinSessionId(getSessionIdFromLog(log)));
      let Cn = takePendingHookSessionTitle();
      if (Cn) cacheHookSessionTitle(Cn);
      reclaimSessionNameOnResume(log.agentName, storageV5, {
        autoOnly: !log.customTitle,
      });
      if (D !== "fork" && log.bridgeSessionId)
        _setAppState((vo) =>
          vo.replBridgeEnabled && !vo.replBridgeOutboundOnly
            ? vo
            : {
                ...vo,
                replBridgeEnabled: true,
                replBridgeOutboundOnly: false,
              },
        );
      this._publish({
        haikuTitle: undefined,
      });
      if (D !== "fork") {
        exitRestoredWorktree(
          log.worktreeSession === undefined ? log.projectPath : log.worktreeSession?.worktreePath,
          storageV5,
        );
        let vo = restoreWorktreeForResume(
          lastResumeRecordRegistry.of(session.host),
          log.worktreeSession,
          log.projectPath,
          {
            storageV5,
          },
        );
        if (vo) messages.push(createSystemMessage(worktreeResumeNotice(vo), "warning"));
        this._resetReplTabToConvo();
        scope.isolationLatch.onLatch = undefined;
        if (isStorageV5Enabled() && storageV5 !== undefined) await adoptResumedSessionFileAsync(storageV5);
        else adoptResumedSessionFile();
        scope.reseatIsolationLatch(
          log.isolationLatch ??
            findIsolationLatchFromHistory(
              messages,
              scope.combinedInitialTools,
              undefined,
              undefined,
              session,
            ),
        );
        {
          let Yo = takeRestoredMonitorIntents({
            ...(storageV5 !== undefined && {
              storageV5,
            }),
          });
          let kn = [...tornStopIntents()];
          let Fn = currentToolPermissionContext() ? "replShort" : "repl";
          if (kn.length > 0) {
            let env = claudeAiEnvironment();
            messages.push(
              createSystemMessage(
                describeNotResumedIncomplete(
                  kn.map((slug) =>
                    artifactViewerUrlFor({
                      slug,
                      env,
                    }),
                  ),
                  Fn,
                ),
                "warning",
              ),
            );
          }
          let bn = otherArmedSlugs(Yo, isAutoReactWired);
          if (bn.length > 0) {
            let sessionId = taskId;
            let hn = "unknown";
            let Mn;
            let others = 0;
            let Sn = false;
            try {
              let { listRegisteredSessionRecords } = await import("./chunk-ewxn4535.js");
              let liveReplyHolder = await findLiveReplyHolder({
                records: await listRegisteredSessionRecords(),
                sessionId,
                selfPid: process.pid,
                isRunning: isProcessRunning,
                isSameProcess: provenSameProcessAsync,
              });
              Sn = true;
              hn = liveReplyHolder.verdict;
              Mn = liveReplyHolder.holder;
              others = liveReplyHolder.otherHolders?.length ?? 0;
            } catch {
              logFeatureSad("artifact_live_subscribe", "holder_probe_failed");
            }
            let env = claudeAiEnvironment();
            let mapped = bn.map((slug) =>
              artifactViewerUrlFor({
                slug,
                env,
              }),
            );
            let now = Date.now();
            if (hn !== "none" && Sn)
              classifyMonitorHold(hn === "live" ? "held_by_live_session" : "holder_unknown", {
                path: "switch",
                probed: Sn,
                liveHolder: Mn,
                otherHolders: others,
                monitors: bn.length,
                jobStamped: [...Yo.values()].some((cn) => cn.state === "armed" && cn.holder === "bg"),
                jobHolder: "none",
                takeover: "not_attempted",
                now,
              });
            if (hn === "live")
              messages.push(
                createSystemMessage(
                  describeHeldMonitor(
                    mapped,
                    Mn !== undefined ? describeHolderWithOthersComments(Mn, others, now) : undefined,
                    Fn,
                  ),
                  "notice",
                ),
              );
            else messages.push(createSystemMessage(describeNotResumedAfterSwitch(mapped, Fn), "notice"));
          }
        }
        restoreRemoteAgentTasks({
          abortController: new AbortController(),
          taskRegistry,
          storageV5,
          credentials,
        });
        if (isMcpTasksEnabled())
          loadMcpTaskModule({
            sessionId: taskId,
            conversation: [...messages],
            taskRegistry,
            getMcpClients: () => store.getState().mcp.clients,
            requestDialog: scope.requestDialog,
            storageV5,
            credentials,
          });
        removeSessionCronTasks(
          getSessionCronTasks().map((Yo) => Yo.id),
          {
            handOff: true,
          },
        );
        formatOrphanSummary(messages, taskRegistry, undefined, undefined, storageV5, undefined, () => ({
          kind: "runningPool",
          tools: scope.computeTools(),
        }));
      } else {
        takeRestoredMonitorIntents({
          ...(storageV5 !== undefined && {
            storageV5,
          }),
        });
        let currentWorktreeSession = getCurrentWorktreeSession();
        if (currentWorktreeSession) saveWorktreeState(currentWorktreeSession, storageV5);
        if (scope.isolationLatch.current) saveIsolationLatch(scope.isolationLatch.current, storageV5);
      }
      let { isCoordinatorMode } = require("./chunk-yxywkh50.js");
      saveMode(isCoordinatorMode() ? "coordinator" : "normal");
      resetCostState();
      setCostStateForRestore(log);
      if (D !== "fork") scope.reconstructContentReplacementState(messages, log.contentReplacements ?? []);
      primePasteIdsFromMessages(messages);
      emitReplBridgeEvent(session, identityAgentId(h));
      clearClassifierContext();
      replace(() => messages);
      this.conversationOrigin = Ao;
      if (D !== "fork") draft.replaceValue("");
      if (D !== "fork") {
        try {
          await prefetchPrecomputedSidecar(
            taskId,
            {
              sessionId: taskId,
              transcriptPath: log.fullPath,
            },
            session.precompute,
            storageV5,
          );
        } catch (error) {
          logError(error);
        }
        this.maybePromptStaleResume(messages, {
          sessionId: taskId,
          transcriptPath: log.fullPath ?? getTranscriptPathForSession(taskId),
        });
      }
      logEvent("tengu_session_resumed", {
        entrypoint: fromEnum(D),
        success: true,
        resume_duration_ms: Math.round(performance.now() - startTime),
      });
    } catch (error) {
      logEvent("tengu_session_resumed", {
        entrypoint: fromEnum(D),
        success: false,
        failure_reason: lit_2("processing_error"),
        error_name: sanitizedErrorNameForTelemetry(toError(error)),
      });
      throw error;
    }
  };
  rehydrateResumedFrameState(h, continuesConversation = false, D = "local", reportCarry = true) {
    let { _setAppState } = this;
    applyArtifactResumeCarry(
      _setAppState,
      collectResumeArtifactCarry(h, {
        origin: D,
        seedEligible: isResumeFrameSeedEligible(),
        reportCarry,
      }),
      {
        continuesConversation,
        keepCloudRows: D === "remote",
      },
    );
  }
  _discardDetachedToolCallsOutside(h) {
    discardQueuedOutside(detachedCallSlots.of(this.session), this.messageQueue, h);
  }
  restoreReadFileState(h, x, D = false, L = "local") {
    let { scope, turn, store } = this;
    scope.mergeReadFileStateFrom(h, x);
    turn.resetForConversation({
      kind: "resumed",
      messages: h,
    });
    this._discardDetachedToolCallsOutside(h);
    this.rehydrateResumedFrameState(h, D, L);
    store.setState((Be) =>
      rehydrateSession(h, Be, {
        restoreAgentNames: !D,
      }),
    );
  }
  start() {
    let h = [];
    let x = () => {
      this._disposed = true;
      this._queuedClearWatch?.settle(false);
      for (let idx = h.length - 1; idx >= 0; idx--) h[idx]();
      diagnosticTrackingSlot.of(this.session).shutdown();
    };
    try {
      this._runStartSteps(h);
    } catch (error) {
      x();
      throw error;
    }
    return x;
  }
  _runStartSteps(h) {
    let { store, transcript, session, storageV5 } = this;
    h.push(
      syncViewedAgentPermissionMode({
        store,
        setAppState: store.setState,
        storageV5,
      }),
    );
    this._startFeeds(h);
    h.push(
      onSessionSwitch((He, We) => {
        this.#e.add(He);
        if (isConversationResetSwitch(We)) this.#t++;
      }),
    );
    h.push(
      subscribeSessionAgentNameChanged(() => {
        let currentSessionAgentName = getCurrentSessionAgentName();
        if (!currentSessionAgentName) return;
        store.setState((We) =>
          We.standaloneAgentContext?.name === currentSessionAgentName
            ? We
            : {
                ...We,
                standaloneAgentContext: {
                  ...We.standaloneAgentContext,
                  name: currentSessionAgentName,
                },
              },
        );
      }),
    );
    try {
      this._startSiblingLoginWatch(h);
    } catch (error) {
      logError(
        Error("SessionController.start: sibling-login watch threw", {
          cause: error,
        }),
      );
    }
    this._raiseSessionStart();
    if (this._pendingHookSet) this._subscribeHookSet(this._pendingHookSet);
    h.push(
      this.session.subscribe(() => {
        let _pendingHookSet = this._pendingHookSet;
        if (_pendingHookSet && this.session.id !== _pendingHookSet.sessionId)
          this._releaseHookSet(_pendingHookSet, true);
      }),
    );
    h.push(() => this.releasePendingHookMessages());
    try {
      this.restoreOnMount();
    } catch (error) {
      logError(
        Error("SessionController.start: restoreOnMount threw", {
          cause: error,
        }),
      );
    }
    try {
      this.rearmArtifactLiveOnMount();
    } catch (error) {
      logError(
        Error("SessionController.start: rearmArtifactLiveOnMount threw", {
          cause: error,
        }),
      );
    }
    this.onInit().catch(logError);
    let ke = this._sandbox.start();
    h.push(ke.stop);
    if (ke.refused) return;
    let Re = teammatePermissionContextBySessionRoot.of(session);
    Re.registerSetter((He) => setToolPermissionContextAndNotify(store.setState, He));
    h.push(() => Re.unregisterSetter());
    h.push(this.turn.watchLaunchPrompt());
    noteFirstFullscreenFrame();
    commitGate(session);
    setJitPolicyAfterStartup();
    useArtifactWatchStartup({
      initialMessages: this.initialMessages,
      transcript,
      store,
      storageV5,
      addNotification: (He) => this._requireHost().addNotification(He),
      artifactMountGate: this.artifactMountGate,
    });
    if (artifactsMcpEntryModule !== null)
      try {
        h.push(
          artifactsMcpEntryModule.startArtifactsMcpEntryWatch({
            session,
            store,
            scope: this.scope,
            storageV5,
            credentials: this.credentials,
          }),
        );
      } catch (error) {
        logError(
          Error("SessionController.start: Artifacts MCP entry watch threw", {
            cause: error,
          }),
        );
      }
    h.push(this._startUnattendedMonitoringWatch());
    if (!this.runsNoModelTurn)
      h.push(
        WakeRouter({
          clock: this._clock,
          store,
          queue: this.messageQueue,
          taskRegistry: this.taskRegistry,
          dispatchWake: (
            agentId,
            prompt,
            onDeliveryCommitted,
            resultsOnly,
            promptOrigin,
            promptNoticeLengths,
            promptNoticeOwn,
            promptNoticeRunIds,
            promptToolsUsed,
          ) =>
            resumeAgentBackground({
              agentId,
              prompt,
              promptToolsUsed,
              resultsOnly,
              onDeliveryCommitted,
              promptOrigin,
              promptNoticeLengths,
              promptNoticeOwn,
              promptNoticeRunIds,
              toolUseContext: this._buildIdleToolUseContext(),
              liveTranscript: this._liveTranscript(),
              canUseTool: this._requireHost().canUseTool,
            }),
        }),
      );
    h.push(getTaskRunState().taskEvicted.subscribe(this._spinnerStore.evict));
    h.push(lazyCommandRunSignal.subscribe(this._spinnerStore.applyEvent));
    if (!this.runsNoModelTurn)
      h.push(
        resumeStrandedAgent({
          taskRegistry: this.taskRegistry,
          getToolUseContext: () => this._buildIdleToolUseContext(),
          liveTranscript: this._liveTranscript(),
          getCanUseTool: () => this._requireHost().canUseTool,
          addNotification: (He) => this._requireHost().addNotification(He),
        }),
      );
    let Be = idleCompactionSlot.of(session);
    Be.host = this.#d;
    h.push(() => {
      if (Be.host === this.#d) Be.host = null;
    });
  }
  _startSiblingLoginWatch(h) {
    if (!this._siblingLoginWatchEnabled()) return;
    h.push(
      subscribeOAuthCredentialsChangedOnDisk(this.session.host, () => {
        if (!this._siblingLoginWatchEnabled()) return;
        this._adoptSiblingLogin().catch(logError);
      }),
    );
    let x = oauthAccountFingerprint();
    h.push(
      subscribeGlobalConfigInstalled(() => {
        try {
          let D = oauthAccountFingerprint();
          if (D === x) return;
          x = D;
          if (!this._siblingLoginWatchEnabled()) return;
        } catch (error) {
          logForDebugging(`sibling-login watch: the account-entry listener failed: ${errorMessage(error)}`, {
            level: "error",
          });
          return;
        }
        this._cancelSiblingLoginCheck?.();
        this._scheduleSiblingLoginCheck(0);
      }),
      () => this._cancelSiblingLoginCheck?.(),
    );
  }
  _siblingLoginWatchEnabled() {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_streamed_thimble", true);
  }
  _scheduleSiblingLoginCheck(h) {
    let x = RESUME_RETRY_DELAYS_MS[h];
    if (x === undefined) return;
    this._cancelSiblingLoginCheck = this._clock.setTimeout(() => {
      this._cancelSiblingLoginCheck = undefined;
      if (this._disposed || !this.scope.apiKeyVerification.showsLoginNotice()) return;
      checkOAuthCredentialsChangedOnDisk(this.session.host, this.credentials).catch(logError);
      this._scheduleSiblingLoginCheck(h + 1);
    }, x);
  }
  async _adoptSiblingLogin() {
    let { session, scope, storageV5, credentials } = this;
    if (
      !(await scope.apiKeyVerification.recheckAfterCredentialsChange({
        host: session.host,
        credentials,
        storageV5,
      })) ||
      this._disposed
    )
      return;
    updateGroveSettings_2.cache?.clear?.();
    getGroveNoticeConfig.cache?.clear?.();
    resetUserData();
    refreshGrowthBookAfterAuthChange();
    let ke;
    try {
      ke = await refreshRemoteManagedSettings(showStandaloneSecurityDialog, storageV5, credentials);
    } catch (error) {
      logFeatureBad("auth_sibling_login_adopt", "managed_settings_refresh_threw");
      throw error;
    }
    if (this._disposed) return;
    if (!ke) {
      logForDebugging(
        "sibling-login watch: the managed-settings refresh for the adopted login did not complete; claude.ai connectors and the other login-dependent surfaces stay as they were until /login or a restart",
        {
          level: "warn",
        },
      );
      logFeatureSad("auth_sibling_login_adopt", "managed_settings_refresh_incomplete");
      return;
    }
    loginEventCounter.of(session).loginCompleted();
    logFeatureOk("auth_sibling_login_adopt");
  }
  _startUnattendedMonitoringWatch() {
    if (!isBgSession()) return () => {};
    let { store, taskRegistry, storageV5 } = this;
    let L = () => {};
    {
      let Re = canAutoReply();
      L = subscribeAutoReplyChanges(() => {
        let Be = canAutoReply();
        if (Be === Re) return;
        Re = Be;
        if (Be) this.discloseUnattendedActivity();
      });
    }
    let ee = count(Object.values(store.getState().tasks), isCarriedFrameLiveWatch);
    let dependencyWatcher = createDependencyWatcher(
      [store],
      () => [count(Object.values(store.getState().tasks), isCarriedFrameLiveWatch)],
      (Re) => {
        if (Re === ee) return;
        ee = Re;
        syncLiveInFlightSnapshot(summarizeBackgroundWork(taskRegistry.all()), storageV5);
      },
    );
    return () => {
      L();
      dependencyWatcher();
    };
  }
  _startFeeds(h) {
    let { store, transcript, messageQueue } = this;
    h.push(
      HeldPeerMessages({
        clock: this._clock,
        store,
        transcript,
        requestDialog: this.scope.requestDialog,
        visibleDialog: createAutoDialogSelector(this.dialogStore, promptInputStoreFor(this.session)),
      }),
    );
    h.push(
      startCrossSessionHoldReceipt({
        clock: this._clock,
        transcript,
        queue: messageQueue,
      }),
    );
    h.push(
      registerReplyYieldNotices({
        transcript,
      }),
    );
    h.push(
      syncJobStateName({
        session: this.session,
        storageV5: this.storageV5,
        credentials: this.credentials,
        setAppState: store.setState,
        onYieldedName: (ee, ke) => {
          let Re = sessionNameYieldedNotice(ke, ee);
          if (!getMaterializedSessionFile()) {
            this._requireHost().addNotification({
              key: "session-name-yielded",
              kind: "warning",
              text: Re,
              color: "warning",
              priority: "immediate",
              timeoutMs: 15000,
            });
            return;
          }
          transcript.apply({
            type: "append",
            messages: [createSystemMessage(Re, "notice")],
          });
        },
      }),
    );
    h.push(
      noopController({
        store,
        dialogStore: this.dialogStore,
        queue: messageQueue,
      }),
    );
    h.push(
      swarmHostState().ingress.messageDropped.subscribe((commands) =>
        transcript.apply({
          type: "append",
          messages: [createSystemMessage(commandListDisplayTruncated(commands), "warning")],
        }),
      ),
    );
  }
  _raiseSessionStart() {
    startSessionHooks({
      loaded: loadPluginHooks(this.storageV5, this.credentials),
      surface: "terminal",
      isInteractive: true,
    });
  }
  _releaseHookSet(h, x) {
    if (this._pendingHookSet !== h) return;
    this._pendingHookSet = null;
    this._publish({
      headHooksPending: false,
    });
    if (x) {
      if (this._landingHookSet === h) this._landingHookSet = null;
      h.run.abort();
    }
  }
  _settleHookSet(h, x) {
    if (this._pendingHookSet !== h || this._landingHookSet === h) return;
    let D = this.session.id === h.sessionId && x.length > 0;
    switch (h.run.placement) {
      case "head": {
        if (!D) {
          this._releaseHookSet(h, false);
          return;
        }
        this._landingHookSet = h;
        let L = () => {
          if (this._landingHookSet === h) this._landingHookSet = null;
          this._releaseHookSet(h, false);
        };
        try {
          let ee = 0;
          let ke = appendRowsWithHooks(this.transcript.conversation, x, {
            keep: (Re) => {
              if (this._landingHookSet !== h) return;
              let Be = ee;
              ee += Re.length;
              this.transcript.replace((He) => He.toSpliced(Be, 0, ...Re));
            },
          });
          if (ke instanceof Promise)
            return ke.then(L, (error) => {
              if (!isAbortError(error)) logError(error);
              L();
            });
        } catch (error) {
          if (!isAbortError(error)) logError(error);
        }
        L();
        return;
      }
      case "tail": {
        this._releaseHookSet(h, false);
        if (!D) return;
        let snapshot = this.transcript.getSnapshot();
        let ee = dedupeSessionStartRows(snapshot, x);
        if (ee.length === 0) return;
        let ke = appendRowsWithHooks(this.transcript.conversation, ee, {
          keep: (Re) => {
            let snapshot = this.transcript.getSnapshot();
            if (this.isAsRestored(snapshot))
              this._restoredStamp = transcriptStampSessionController([...snapshot, ...Re]);
            this.transcript.keep({
              type: "append",
              messages: [...Re],
            });
          },
        });
        if (ke instanceof Promise)
          ke.catch((error) => {
            if (!isAbortError(error)) logError(error);
          });
        return;
      }
    }
  }
  _subscribeHookSet(h) {
    h.run.promise.then(
      (x) => this._settleHookSet(h, x),
      () => this._releaseHookSet(h, false),
    );
  }
  awaitPendingHooks = () => {
    let _pendingHookSet = this._pendingHookSet;
    if (!_pendingHookSet) return;
    if (this.session.id !== _pendingHookSet.sessionId) {
      this._releaseHookSet(_pendingHookSet, true);
      return;
    }
    return _pendingHookSet.run.promise.then((x) => this._settleHookSet(_pendingHookSet, x));
  };
  deferHookMessages = (h) => {
    this.releasePendingHookMessages();
    let x = {
      run: startHookRun("head", h),
      sessionId: this.session.id,
    };
    this._pendingHookSet = x;
    this._publish({
      headHooksPending: true,
    });
    this._subscribeHookSet(x);
    if (this._disposed) this._releaseHookSet(x, true);
  };
  releasePendingHookMessages = () => {
    let _pendingHookSet = this._pendingHookSet;
    if (_pendingHookSet) this._releaseHookSet(_pendingHookSet, true);
  };
  get headHooksPending() {
    return this._pendingHookSet?.run.placement === "head";
  }
  isAsRestored(h) {
    return this._restoredStamp === transcriptStampSessionController(h);
  }
  restoreOnMount() {
    let { initialMessages, session, taskRegistry, storageV5, credentials, store, scope, messageQueue } = this;
    if (initialMessages && initialMessages.length > 0) {
      scope.reseatIsolationLatch(
        getCurrentSessionIsolationLatch() ??
          findIsolationLatchFromHistory(
            initialMessages,
            scope.combinedInitialTools,
            undefined,
            undefined,
            session,
          ),
      );
      this.restoreReadFileState(
        initialMessages,
        getSessionProject(session).originalCwd,
        false,
        this.conversationOrigin,
      );
      restoreRemoteAgentTasks({
        abortController: new AbortController(),
        taskRegistry,
        storageV5,
        credentials,
      });
      if (isMcpTasksEnabled())
        loadMcpTaskModule({
          sessionId: getSessionId(),
          conversation: [...initialMessages],
          taskRegistry,
          getMcpClients: () => store.getState().mcp.clients,
          requestDialog: this.scope.requestDialog,
          storageV5,
          credentials,
        });
      if (isActingAsBgJob()) {
        let bgJobDir = getBgJobDir();
        let We = readAndConsumeAdoptJson(bgJobDir, {
          waitMs: isBgSession() || !getBgTakeover()?.expectHandoff ? 0 : TAKEOVER_ADOPT_WAIT_MS,
          extraShellOutputRoot: (() => {
            let bgTakeover = getBgTakeover();
            if (!bgTakeover?.adoptShellOutputRoot) {
              let last = lastResumeRecordRegistry.of(session.host).last;
              return last ? taskRootUnderTemp(normalizeFilePath(last.worktreePath)) : undefined;
            }
            return bgTakeover.adoptShellOutputReadRoot
              ? [bgTakeover.adoptShellOutputRoot, bgTakeover.adoptShellOutputReadRoot]
              : bgTakeover.adoptShellOutputRoot;
          })(),
        });
        let owner = Symbol("adopt-consume");
        this._adoptedPrefill = We.then((kt) => kt?.prefill).catch(() => {
          return;
        });
        this._adoptedFrameLive = We.then((kt) => {
          if (kt?.frameLive === undefined) return;
          if (bgJobDir !== undefined) recordUnresumedFrameLive(bgJobDir, kt.frameLive, owner);
          return {
            entries: kt.frameLive,
            jobDir: bgJobDir,
            owner,
          };
        }).catch(() => {
          return;
        });
        let Xe = new Set();
        let rt = new Set();
        (async () => {
          try {
            let kt = await We;
            if (kt) {
              let At = await reconcileCarriedAgents(
                kt.agents ?? [],
                {
                  initialMessages,
                  taskRegistry,
                  storageV5,
                },
                messageQueue,
              );
              Xe = At.reported;
              let { registered } = At;
              let Ot = new Set(registered.map((Dt) => Dt.agentId));
              for (let shell of kt.shells) {
                if (shell.agentId !== undefined && !Ot.has(shell.agentId)) {
                  killOrphanedAdoptedShell(shell);
                  logFeatureSad("task_local_agent", "adopt_owner_skipped", {
                    skipped_kind: fromEnum("shell"),
                  });
                  logForDebugging(
                    `[adopt] shell ${shell.taskId} skipped: owner ${shell.agentId} not registered`,
                    {
                      level: "warn",
                    },
                  );
                  continue;
                }
                try {
                  await initTaskOutputAsSymlink(shell.taskId, shell.outputPath, (Lt) =>
                    logEvent("tengu_adopt_link", {
                      kind: lit_2("shell"),
                      method: fromEnum(Lt),
                    }),
                  );
                  spawnShellTask(
                    {
                      taskId: shell.taskId,
                      command: shell.command,
                      description: shell.description,
                      lastReportedTotalLines: shell.lastReportedTotalLines,
                      toolUseId: shell.toolUseId,
                      kind: shell.kind,
                      agentId: shell.agentId,
                      shellCommand: new DetachedShellProcess({
                        taskId: shell.taskId,
                        pid: shell.pid,
                        procStart: shell.procStart,
                        startTimeTicks: shell.startTimeTicks,
                      }),
                    },
                    taskRegistry,
                  );
                } catch (error) {
                  logForDebugging(`[adopt] shell ${shell.taskId} skipped: ${error}`, {
                    level: "warn",
                  });
                }
              }
              adoptCron(
                kt.cron.filter((Dt) => {
                  if (Dt.agentId !== undefined && !Ot.has(Dt.agentId)) {
                    logFeatureSad("task_local_agent", "adopt_owner_skipped", {
                      skipped_kind: fromEnum("cron"),
                    });
                    return false;
                  }
                  return true;
                }),
                kt.loopWakeFires,
              );
              let Et = [];
              for (let Dt of kt.workflows ?? []) {
                let Lt;
                try {
                  Lt = {
                    ...Dt,
                    scriptPath: resolveAdoptedScriptPath(Dt.scriptPath),
                  };
                  await linkAdoptedWorkflowDir(Lt);
                  registerAdoptedWorkflowTask(Lt, taskRegistry);
                  Et.push(Lt);
                  rt.add(Lt.taskId);
                } catch (error) {
                  if (Lt === undefined) {
                    let { scriptPath, ...io } = Dt;
                    emitAdoptWorkflowFailed(io, "adopt scriptPath rejected", messageQueue);
                    logFeatureSad("task_local_workflow", "adopt_scriptpath_rejected");
                    logForDebugging(`[adopt] workflow ${Dt.taskId} skipped: scriptPath rejected`, {
                      level: "warn",
                    });
                  } else {
                    emitAdoptWorkflowFailed(Lt, "transcript link failed", messageQueue);
                    logFeatureSad("task_local_workflow", "adopt_link_failed");
                    logForDebugging(`[adopt] workflow ${Dt.taskId} skipped: ${error}`, {
                      level: "warn",
                    });
                  }
                }
              }
              if (bgJobDir !== undefined) recordUnresumedAdopt(bgJobDir, registered, Et, owner);
              this.resumeAdoptedAgents(registered, Et, bgJobDir, owner);
            }
          } finally {
            await formatOrphanSummary(
              initialMessages,
              taskRegistry,
              (kt) => this.resumeOrphanedAgents(kt, bgJobDir),
              Xe,
              storageV5,
              undefined,
              () => ({
                kind: "runningPool",
                tools: this.scope.computeTools(),
              }),
              rt,
            );
          }
        })();
      } else if (!this.runsNoModelTurn)
        formatOrphanSummary(
          initialMessages,
          taskRegistry,
          undefined,
          undefined,
          storageV5,
          undefined,
          () => ({
            kind: "runningPool",
            tools: this.scope.computeTools(),
          }),
        );
      if (!this.disableQuery && store.getState().initialMessage === null)
        this.maybePromptStaleResume(initialMessages, currentRestoreSource());
    }
  }
  resumeAdoptedAgents(h, x, D, L) {
    let { store, taskRegistry, storageV5, messageQueue } = this;
    waitForStoreState(store, mcpSettledForAdopt, {
      timeoutMs: STALE_THRESHOLD_MS / 4,
    })
      .then(() => {
        if (!isActingAsBgJob() || getBgJobDir() !== D) {
          logForDebugging(
            "[adopt] deferred resume skipped: takeover released or replaced during MCP-settle wait",
          );
          return;
        }
        if (D !== undefined && (h.length > 0 || x.length > 0)) {
          let Xe = takeUnresumedAdopt(D, L);
          if (Xe.agents.length === 0 && Xe.workflows.length === 0) {
            logForDebugging(
              "[adopt] deferred resume skipped: parked entries already taken by the exit handoff or a later consume",
            );
            return;
          }
        }
        let { canUseTool } = this._requireHost();
        let { toolState } = this._buildIdleToolUseContext();
        let permissionMode = store.getState().toolPermissionContext.mode;
        for (let Xe of x)
          resumeCarriedWorkflow(
            Xe,
            {
              taskRegistry,
              toolState,
              permissionMode,
            },
            messageQueue,
          );
        for (let Xe of h)
          resumeAgentBackground({
            agentId: Xe.agentId,
            prompt: Xe.description ?? "(resumed agent)",
            continueInterruptedTurn: true,
            toolUseContext: this._buildIdleToolUseContext(),
            canUseTool,
          })
            .then((rt) => {
              if (isResumeDenied(rt)) {
                try {
                  logFeatureSad("task_local_agent", "adopt_resume_denied");
                  emitAdoptAgentDenied(Xe, rt.deniedByPlugin, taskRegistry, messageQueue);
                } catch (error) {
                  logError(error);
                }
                return;
              }
              if (!rt.alreadyCompleted)
                syncLiveInFlightSnapshot(summarizeBackgroundWork(taskRegistry.all()), storageV5);
            })
            .catch((error) => {
              taskRegistry.remove(Xe.agentId);
              emitAdoptAgentFailed(Xe, "resume failed", taskRegistry, messageQueue);
              logFeatureSad("task_local_agent", "adopt_resume_failed");
              if (error instanceof ResumeAgentStateError) {
                logForDebugging(`[adopt] agent ${Xe.agentId} resume skipped: ${error.message}`, {
                  level: "warn",
                });
                return;
              }
              logError(error);
            });
      })
      .catch(logError);
  }
  resumeOrphanedAgents(h, x) {
    let { store, taskRegistry, storageV5 } = this;
    waitForStoreState(store, mcpSettledForAdopt, {
      timeoutMs: STALE_THRESHOLD_MS / 4,
    })
      .then(() => {
        if (!isActingAsBgJob() || getBgJobDir() !== x) {
          logForDebugging(
            "[orphan-resume] deferred auto-resume skipped: takeover released or replaced during MCP-settle wait",
          );
          return;
        }
        let { canUseTool } = this._requireHost();
        for (let Re of h)
          resumeAgentBackground({
            agentId: Re.agentId,
            prompt: Re.description,
            continueInterruptedTurn: true,
            toolUseContext: this._buildIdleToolUseContext(),
            canUseTool,
            isWebFetchLaunch: Re.isWebFetchLaunch,
          })
            .then((Be) => {
              if (isResumeDenied(Be)) {
                try {
                  logFeatureSad("task_local_agent", "orphan_auto_resume_denied");
                  formatAgentRestartFailedNotice(this._orphanAsThisSessionSeesIt(Re), Be.deniedByPlugin);
                } catch (error) {
                  logError(error);
                }
                return;
              }
              if (Be.alreadyCompleted) {
                formatOrphanedAgentNotification(
                  {
                    ...this._orphanAsThisSessionSeesIt(Re),
                    outputFile: Re.outputFile ?? Be.outputFile,
                  },
                  taskRegistry,
                );
                return;
              }
              formatAgentRestartedNotice(Re);
              syncLiveInFlightSnapshot(summarizeBackgroundWork(taskRegistry.all()), storageV5);
            })
            .catch((error) => {
              logFeatureSad("task_local_agent", "orphan_auto_resume_failed");
              formatAgentRestartFailedNotice(this._orphanAsThisSessionSeesIt(Re), errorMessage(error));
              if (error instanceof ResumeAgentStateError) {
                logForDebugging(`[orphan-resume] agent ${Re.agentId} auto-resume failed: ${error.message}`, {
                  level: "warn",
                });
                return;
              }
              logError(error);
            });
      })
      .catch(logError);
  }
  _orphanAsThisSessionSeesIt(h) {
    try {
      return withResumeCapabilities(h, {
        kind: "runningPool",
        tools: this.scope.computeTools(),
      });
    } catch (error) {
      logError(
        Error("resumeOrphanedAgents: reading the tool pool threw", {
          cause: error,
        }),
      );
      return h;
    }
  }
  artifactMountGate = async () => {
    await initializeGrowthBook().catch(() => null);
    let toolUseContext = this.turn.buildToolUseContext(
      this.initialMessages ?? [],
      [],
      new AbortController(),
      this._requireHost().mainLoopModel,
    );
    let allowed = await isArtifactFetchEnabled(
      toolUseContext.options.tools,
      this.store.getState().toolPermissionContext,
      {
        promptless: true,
      },
    );
    return {
      toolUseContext,
      allowed,
    };
  };
  discloseUnattendedActivity = (h) => {
    let { taskRegistry } = this;
    let D = drainUnattendedReplies();
    if (D.total === 0) return;
    let filtered = Object.values(taskRegistry.all()).filter(isCarriedFrameLiveWatch);
    let env = claudeAiEnvironment();
    let mapped = [...D.bySlug.keys()]
      .map((slug) => ({
        slug,
        url: artifactViewerUrlFor({
          slug,
          env,
        }),
      }))
      .filter(({ slug, url }) => parseArtifactUrl(url)?.slug === slug)
      .map(({ url }) => url);
    let where = D.bySlug.size === 1 && mapped.length === 1 ? ` on ${mapped[0]}` : "";
    let shortcutDisplay = getShortcutDisplay("chat:killAgents", "Chat", "ctrl+x ctrl+k");
    let stop =
      filtered.length > 0 || h?.willRearm === true || getAutoReactSlugs().size > 0
        ? ` To turn off automatic replies, stop the Artifact comment monitor task, or press ${shortcutDisplay} twice to turn them off for this session.`
        : "";
    this.transcript.apply({
      type: "append",
      messages: [
        formatAutoReplyNotice(D.total, {
          where,
          stop,
        }),
      ],
    });
  };
  rearmArtifactLiveOnMount() {
    let { store, taskRegistry, storageV5 } = this;
    rearmOnResumeSafe(
      {
        initialMessages: this.initialMessages,
        startupWatchSlug: peekPendingWatchArtifact()?.slug,
        storageV5,
      },
      {
        publishContext: isBgSession() ? "bg_session" : "interactive",
        ui: "repl",
        shortNotices: currentToolPermissionContext,
        emit: (L) =>
          this.transcript.apply({
            type: "append",
            messages: [...L],
          }),
        gate: this.artifactMountGate,
        readFrameState: () => {
          let state = store.getState();
          return {
            artifactRefs: state.artifactRefs,
            artifactReadVersions: state.artifactReadVersions,
            frameUrls: state.frameUrls,
          };
        },
        getKnownVer: (L) => mainObservedArtifactVersion(store.getState(), L),
        commentsGateOpen: () => require("./chunk-8vtgtz3z.js").artifactCommentsPromptGateOpen(),
        mayRequestTakeover: () => true,
        jobHolderVerdicts: probeAdoptedJob,
        carried: {
          adopted: this._adoptedFrameLive?.then((L) => {
            if (L === undefined) return;
            let { entries, jobDir, owner } = L;
            return {
              entries,
              park:
                jobDir === undefined
                  ? undefined
                  : {
                      take: () => takeUnresumedFrameLive(jobDir, owner),
                      repark: (Be) => reparkUnresumedFrameLive(jobDir, Be, owner),
                      release: (Be) => releaseReparkedFrameLive(jobDir, Be, owner),
                    },
            };
          }),
          discloseUnattended: (L) => this.discloseUnattendedActivity(L),
          onCarriedArmed: () => {
            if (isBgSession())
              syncLiveInFlightSnapshot(summarizeBackgroundWork(taskRegistry.all()), storageV5);
          },
        },
      },
    );
  }
  rewindConversationTo(h, x) {
    let { transcript, scope, store, turn } = this;
    let snapshot = transcript.getSnapshot();
    let messageIndex = findMessageIndex(snapshot, h);
    if (messageIndex === -1) return;
    let messages = snapshot.slice(0, messageIndex);
    let sliced = snapshot.slice(messageIndex);
    noopLedger(getStickyBetas(), "rewind");
    cancelOnConversationReset(x);
    let ze = decideRefusalFallbackRestore({
      keptMessages: messages,
      slicedMessages: sliced,
      currentOverride: getMainLoopModelOverride(),
      latchActive: hasRefusalFallbackOccurred() || hasRefusalFallbackHeaderArmed(),
      firstParty: usesFirstPartyModelIds(),
      modelBeforeSwap: getActiveModelFallback()?.previousModel,
      initialModel: getInitialMainLoopModel(),
    });
    try {
      scope.evictRewoundFileTracking(collectRewoundFileTrackingPaths(sliced));
    } catch (error) {
      logError(error);
    }
    if (x !== "auto_restore_cancel") resetPickerState(scope.memorySelector);
    logEvent("tengu_conversation_rewind", {
      preRewindMessageCount: snapshot.length,
      postRewindMessageCount: messageIndex,
      messagesRemoved: snapshot.length - messageIndex,
      rewindToMessageIndex: messageIndex,
      source: fromEnum(x),
    });
    notePendingConversationEdit("rewind");
    transcript.cut();
    transcript.replace(messages);
    if (!this.runsNoModelTurn)
      try {
        let It = cronCarryAttachment(messages, sliced);
        if (It !== null)
          transcript.apply(
            {
              type: "append",
              messages: [It],
            },
            "held",
          );
      } catch (error) {
        logError(error);
      }
    try {
      let It = threadAskMarkerFor(messages);
      if (It !== null)
        transcript.apply(
          {
            type: "append",
            messages: [createAttachmentMessage(It)],
          },
          "held",
        );
    } catch (error) {
      logError(error);
    }
    setLastMainThreadContextTokens(contextTokensOf(messages));
    setLastCacheSafeForkMessages(messages);
    this.bumpConversationId();
    if (x === "message_selector") this.#r.repin(true, "rewind");
    this._resetTurnEventTail();
    turn.resetForConversation({
      kind: "rewound",
    });
    this._discardDetachedToolCallsOutside(messages);
    clearPendingContextCompacted();
    if (ze) {
      if (ze.clearLatch) clearRefusalFallbackOccurred();
      if (ze.model.action === "restore") setMainLoopModelOverride(ze.model.value);
      logEvent("tengu_refusal_fallback_rewind_unwind", {
        action: fromEnum(
          ze.model.action === "restore"
            ? "model_restored"
            : ze.model.reason === "not_first_party"
              ? "model_kept_3p"
              : "model_kept_writer_mismatch",
        ),
        ...(ze.model.action === "restore" && {
          restored_from: fromEnum(ze.model.restoredFrom),
        }),
        latch_cleared: ze.clearLatch,
        banners_sliced: ze.bannersSliced,
        model_scope: fromEnum(classifyFallbackOrigin(ze.lastSlicedFallbackModel)),
        source: fromEnum(x),
      });
    }
    let Xe =
      ze && ze.model.action === "restore"
        ? {
            mainLoopModel: ze.model.value,
          }
        : undefined;
    let fastMode = store.getState().fastMode;
    let kt = Xe && isFastModeEnabled() ? isFastModeActive(Xe.mainLoopModel, fastMode) : undefined;
    let At =
      x === "auto_restore_cancel"
        ? null
        : rebuildArtifactCarryAfterRewind(
            messages,
            isResumeFrameSeedEligible() && this.conversationOrigin === "local",
          );
    store.setState((It) => ({
      ...(x === "auto_restore_cancel"
        ? It
        : rehydrateSession(messages, It, {
            restoreAgentNames: false,
          })),
      ...At,
      ...Xe,
      ...(kt !== undefined && {
        fastMode: kt,
      }),
      toolPermissionContext:
        h.permissionMode && It.toolPermissionContext.mode !== h.permissionMode
          ? {
              ...It.toolPermissionContext,
              mode: h.permissionMode,
            }
          : It.toolPermissionContext,
      promptSuggestion: {
        status: "empty",
      },
      ...(findLastRealAssistantMessage(messages) === undefined && {
        cacheMissAckedAtOutputTokens: getTotalOutputTokens(),
      }),
    }));
    if (kt !== undefined) reportFastModeToggle(fastMode, kt);
    logFeatureOk("repl_rewind_conversation");
  }
  restoreMessageSync = (h, x, D = []) => {
    let L = D[0];
    if (L === undefined) {
      this.rewindConversationTo(h, x);
      this.restoreDraftFrom(h);
      return;
    }
    let ee = [];
    try {
      for (let Re of [...D, h]) {
        let Be = {
          value: "",
          pastedContents: {},
        };
        this.restoreDraftInto(Re, {
          replaceValue: (value) => {
            Be.value = value;
          },
          setMode: () => {},
          setPastedContents: (pastedContents) => {
            Be.pastedContents = pastedContents;
          },
        });
        ee.push(Be);
      }
    } catch (error) {
      logError(error);
      this.rewindConversationTo(h, x);
      this.restoreDraftFrom(h);
      return;
    }
    this.rewindConversationTo(L, x);
    this.draft.replaceValue(ee.reduce((acc, Be) => appendLine(acc, Be.value), ""));
    this.draft.setMode("prompt");
    let ke = {};
    for (let Re of ee) ke = mergeTurnTags(ke, Object.values(Re.pastedContents));
    if (Object.keys(ke).length > 0) this.draft.setPastedContents(ke);
  };
  restoreDraftFrom = (h) => {
    this.restoreDraftInto(h, this.draft);
  };
  restoreDraftInto(h, x) {
    let { _setAppState } = this;
    this.#s.restoreIdeSelectionConsumedBy(h.uuid);
    let modeFromInput = getModeFromInput(h);
    let ee = modeFromInput
      ? modeFromInput.mode === "prompt"
        ? readPromptText(modeFromInput.text)
        : {
            text: modeFromInput.text,
            pastedContents: {},
          }
      : undefined;
    if (modeFromInput && ee) {
      x.replaceValue(ee.text);
      x.setMode(modeFromInput.mode);
      if (Object.keys(ee.pastedContents).length > 0) x.setPastedContents(ee.pastedContents);
    }
    if (Array.isArray(h.message.content)) {
      let filtered = h.message.content.filter((Re) => isObjectBlock(Re) && Re.type === "image");
      if (filtered.length > 0) {
        let { stamped, manufactured } = splitStampedImages(filtered, h.imagePasteIds);
        let He = renumberPastedContents({
          display: ee?.text ?? "",
          pastedContents: manufactured,
          allowCurrentEpochSkip: false,
        });
        let We = renumberPastedContents({
          display: He.display,
          pastedContents: stamped,
          allowCurrentEpochSkip: true,
        });
        let ze = {
          ...He.pastedContents,
          ...We.pastedContents,
        };
        if (ee && We.display !== ee.text) x.replaceValue(We.display);
        let Xe = setSliceField(_setAppState, "storedImagePaths");
        for (let rt of Object.values(ze))
          if (stamped[rt.id] === undefined && manufactured[rt.id] === undefined) {
            recordImagePath(rt, Xe);
            storeImageAndRecord(rt, Xe);
          }
        x.setPastedContents({
          ...ee?.pastedContents,
          ...ze,
        });
      }
    }
  }
  handleRestoreMessage = async (h, x) => {
    setImmediate((D, L, ee) => D(L, ee), this.restoreMessageSync, h, x);
  };
  handleSummarize = async (h, userFeedback, D = "from") => {
    let { transcript, turn, _setAppState, draft } = this;
    let { mainLoopModel, addNotification } = this._requireHost();
    let replace = transcript.replace;
    let messages = messagesSinceCompactBoundary(transcript.getSnapshot());
    let pivotIndex = findMessageIndex(messages, h);
    if (pivotIndex === -1) {
      transcript.apply({
        type: "append",
        messages: [
          createSystemMessage(
            "That message is no longer in the active context. Choose a more recent message.",
            "warning",
          ),
        ],
      });
      return;
    }
    let abortController = createAbortController();
    let context = turn.buildToolUseContext(messages, [], abortController, mainLoopModel);
    let cacheSafeParams = await buildCompactCacheSafeParams({
      toolUseContext: context,
      forkContextMessages: messages,
      mainThreadAgentDefinition: this.scope.mainThreadAgentDefinition,
    });
    let It = await partialCompactConversation(messages, pivotIndex, context, cacheSafeParams, {
      userFeedback,
      direction: D,
      onNotification: addNotification,
      onResponseLength: turn.stream.onResponseLength,
    });
    let postCompactMessages = buildPostCompactMessages_2(It, D);
    if (this.#n === "fullscreen" && D === "from")
      replace((Dt) => {
        let messageIndexByUuid = findMessageIndexByUuid(Dt, h.uuid);
        return [...Dt.slice(0, messageIndexByUuid === -1 ? 0 : messageIndexByUuid), ...postCompactMessages];
      });
    else {
      replace(postCompactMessages);
      this.bumpConversationId();
    }
    _setAppState((Dt) => pruneDisplayedContent(Dt, transcript.getSnapshot()));
    setLastCacheSafeForkMessages(postCompactMessages);
    cleanupAfterCompaction(
      context.session,
      context.options.querySource,
      _setAppState,
      undefined,
      undefined,
      context.storageV5,
    );
    if (D === "from") {
      let modeFromInput = getModeFromInput(h);
      if (modeFromInput) {
        let Lt =
          modeFromInput.mode === "prompt"
            ? readPromptText(modeFromInput.text)
            : {
                text: modeFromInput.text,
                pastedContents: {},
              };
        draft.replaceValue(Lt.text);
        draft.setMode(modeFromInput.mode);
        if (Object.keys(Lt.pastedContents).length > 0) draft.setPastedContents(Lt.pastedContents);
        this.#s.restoreIdeSelectionConsumedBy(h.uuid);
      }
    }
    let Et = leadingCompactHint(
      transcript.getSnapshot(),
      It.boundaryMarker.uuid,
      getShortcutDisplay("app:toggleTranscript", "Global", "ctrl+o"),
    );
    addNotification({
      key: "summarize-ctrl-o-hint",
      kind: "contextual",
      text: `Conversation summarized${Et}`,
      priority: "medium",
      timeoutMs: 8000,
    });
  };
  #i() {
    if (isRemoteSessionAvailable())
      return Error("a thin client's conversation lives on the remote session; compact it there");
    if (this.turn.getSnapshot().isExternalLoading)
      return Error("an external turn is driving the conversation; it compacts between turns");
    return null;
  }
  async #a() {
    try {
      let { isHeldInAnotherPidDomain, listRegisteredSessionRecords } = await import("./chunk-ewxn4535.js");
      let D = await listRegisteredSessionRecords();
      let sessionId = getSessionId();
      if (await isHeldInAnotherPidDomain(D, sessionId)) return true;
      let { verdict } = await findLiveReplyHolder({
        records: D,
        sessionId,
        selfPid: process.pid,
        isRunning: isProcessRunning,
        isSameProcess: provenSameProcessAsync,
      });
      return verdict !== "none";
    } catch {
      logFeatureSad("compact_idle", "holder_probe_failed");
      return true;
    }
  }
  async #l() {
    if (isTranscriptPersistenceDisabled()) return null;
    let transcriptTailForTip = await readTranscriptTailForTip(getSessionId(), this.storageV5);
    let x =
      transcriptTailForTip === null ? undefined : extractLastSyncedEventUuid(transcriptTailForTip.content);
    if (x === undefined) return "transcript_unreadable";
    return this.transcript.getSnapshot().some((D) => D.uuid === x) ? null : "transcript_advanced";
  }
  #d = {
    refusal: async () => {
      if (await this.#a()) return "held_elsewhere";
      let h = await this.#l();
      if (h !== null) return h;
      if (this.#i() !== null || this.turn.guard.isActive) return "busy";
      if (Date.now() - getLastInteractionTime() < NOTIF_ACTIVE_THRESHOLD_MS) return "present";
      return null;
    },
    compact: () =>
      this.compactConversation({
        instructions: "",
        apiAttemptsLeft: {
          count: 1,
        },
      }).then(
        (h) => {
          if (h.skip !== undefined) return null;
          this.transcript.apply({
            type: "append",
            messages: [createSystemMessage(COMPACTED_WHILE_IDLE_TEXT, "notice")],
          });
          return {
            tokensBefore: h.tokensBefore,
            tokensAfter: h.tokensAfter,
          };
        },
        (error) => {
          if (hasExactErrorMessage(error, ERROR_MESSAGE_NOT_ENOUGH_MESSAGES)) return null;
          if (!(
            error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS ||
            isAbortError(error) ||
            (error instanceof Error && error.cause !== undefined)
          ))
            logError(error);
          throw error;
        },
      ),
  };
  compactConversation = async ({ instructions, origin, apiAttemptsLeft }) => {
    let { transcript, turn, scope, _setAppState } = this;
    let { mainLoopModel, addNotification } = this._requireHost();
    let We = this.#i();
    if (We !== null) throw We;
    let ze = turn.guard.isActive ? null : turn.guard.tryStart();
    if (ze === null) throw Error("a turn is in flight; the conversation compacts between turns");
    let abortController = createAbortController();
    turn.setAbortController(abortController);
    try {
      let snapshot = transcript.getSnapshot();
      let toolUseContext = turn.buildToolUseContext(
        messagesSinceCompactBoundary(snapshot),
        [],
        abortController,
        mainLoopModel,
      );
      toolUseContext.compactionApiAttemptsLeft = apiAttemptsLeft;
      let { compactManually } = await compactCommand.load();
      let It = await compactManually(toolUseContext, {
        customInstructions: instructions,
        mainThreadAgentDefinition: scope.mainThreadAgentDefinition,
        trigger: origin === undefined ? "auto" : "plugin",
        origin,
      });
      if (It.type === "skipped")
        return {
          skip: It.reason,
        };
      if (It.type !== "compact")
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          It.type === "text" ? It.value : "the compaction produced no summary",
          "plugin compaction refused",
        );
      if (turn.guard.generation !== ze && turn.guard.isActive)
        throw Error("a newer turn began before the compaction could be applied");
      let postCompactMessages = buildPostCompactMessages({
        ...It.compactionResult,
        messagesToKeep: It.compactionResult.messagesToKeep.map(getTokenCountFromUsage_4),
      });
      let Dt = new Set(snapshot.map((io) => io.uuid));
      let Lt = new Set(postCompactMessages.map((postCompactMessage) => postCompactMessage.uuid));
      let oo = (io) => io.filter((so) => !Dt.has(so.uuid) && !Lt.has(so.uuid));
      if (this.#n === "fullscreen")
        transcript.replace((io) => [
          ...io.filter((so) => Dt.has(so.uuid) && !Lt.has(so.uuid)),
          ...postCompactMessages,
          ...oo(io),
        ]);
      else {
        transcript.replace((io) => [...postCompactMessages, ...oo(io)]);
        this.bumpConversationId();
      }
      _setAppState((io) => pruneDisplayedContent(io, transcript.getSnapshot()));
      setLastCacheSafeForkMessages(messagesSinceCompactBoundary(transcript.getSnapshot()));
      let Xt = leadingCompactHint(
        transcript.getSnapshot(),
        It.compactionResult.boundaryMarker.uuid,
        getShortcutDisplay("app:toggleTranscript", "Global", "ctrl+o"),
      );
      addNotification({
        key: "summarize-ctrl-o-hint",
        kind: "contextual",
        text: `Conversation compacted${Xt}`,
        priority: "medium",
        timeoutMs: 8000,
      });
      return It.result;
    } finally {
      turn.guard.end(ze);
      if (turn.getSnapshot().abortController === abortController) turn.setAbortController(null);
    }
  };
  async onInit() {
    let { session, scope, engine, storageV5, credentials } = this;
    scope.apiKeyVerification.verify({
      credentials,
      storageV5,
    });
    let ke = isClaudeMdLoadingDisabled()
      ? []
      : await getMemoryFilesCached(session, false, storageV5, credentials);
    if (ke.length > 0) {
      let joined = ke.map(
        (He) =>
          `  [${He.type}] ${He.path} (${He.content.length} chars)${He.parent ? ` (included by ${He.parent})` : ""}`,
      ).join(`
`);
      logForDebugging(`Loaded ${ke.length} CLAUDE.md/rules files:
${joined}`);
    } else logForDebugging("No CLAUDE.md/rules files found");
    let results = await Promise.all(
      ke
        .filter((Be) => !isManagedOrVirtualPath(Be.path))
        .map(async (Be) => {
          let He = shouldInjectMemoryFile(Be);
          let seedTs = await getReadTimestamp(Be, He, storageV5);
          return {
            file: Be,
            injected: He,
            seedTs,
          };
        }),
    );
    for (let { file, injected, seedTs } of results) {
      scope.seedMemoryFile(file.path, {
        content: file.contentDiffersFromDisk
          ? (file.rawContent ?? file.content)
          : stripBomAndCarriageReturn(file.content),
        timestamp: seedTs,
        offset: undefined,
        limit: undefined,
        isPartialView: file.contentDiffersFromDisk,
        seededFromContext: injected,
        ...(!injected && {
          contentNotInModelContext: true,
        }),
        keepContent: true,
      });
      engine.seedReadState(
        file.path,
        seedTs,
        isStorageV5Enabled() && storageV5 !== undefined
          ? file.contentDiffersFromDisk
            ? (file.rawContent ?? file.content)
            : file.content
          : undefined,
      );
    }
  }
}
//@ chunk-18hwfzwa.js:411777-411834 placement
function offersLookUp(h, x) {
  return (
    x !== null && canLookUpPrevious(h, pinSessionId(getSessionId())) && isPreviousConversationPointerAllowed()
  );
}
//@ chunk-18hwfzwa.js:411834-411880 placement
function canLookUpPrevious(h, x) {
  return !isRemoteOrBridgeSession(x) && !h.some(isForeignToBridgeSession);
}
//@ chunk-18hwfzwa.js:411880-411926 placement
function isRemoteOrBridgeSession(h) {
  return isRemoteEgressSuppressedFor(h) || bridgeSessionForPulledWindow(h) !== undefined;
}
//@ chunk-18hwfzwa.js:411926-411997 placement
function findMessageIndex(h, x) {
  let index = h.lastIndexOf(x);
  return index !== -1 ? index : findMessageIndexByUuid(h, x.uuid);
}
//@ chunk-18hwfzwa.js:411997-412092 placement
function isForeignToBridgeSession(h) {
  return "foreignToBridgeSession" in h && typeof h.foreignToBridgeSession === "string";
}
export { SessionController, appendLine, restorePromptAfterCancel };
