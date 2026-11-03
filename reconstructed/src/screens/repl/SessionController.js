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
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
  randomUUID as randomUUID_11,
  randomUUID as randomUUID_12,
  randomUUID as randomUUID_13,
  randomUUID as randomUUID_14,
  randomUUID as randomUUID_15,
  randomUUID as randomUUID_16,
  randomUUID as randomUUID_17,
} from "crypto";
import {
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
} from "path";
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
import { Mr, LE } from "../../utils/agentId.js";
import { cKe, Ket } from "../../utils/conversationRecovery.js";
import { logError } from "../../utils/log.js";
import {
  getOauthAccountInfo,
  subscribeOAuthCredentialsChangedOnDisk,
  checkOAuthCredentialsChangedOnDisk,
} from "../../utils/auth.js";
import {
  d1n,
  Igt,
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
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { logForDebugging, createAttachmentMessage_2 as createAttachmentMessage } from "../../utils/debug.js";
import { o } from "../../../vendor/zod/v4/classic/schemas.js";
import { Text, Box } from "../../ink/components/Text.js";
import { createSignal } from "../../utils/signal.js";
import { createQueueBusyCheck } from "../../utils/messageQueueIdle.js";
import { resetContinueState } from "../../commands/continue/continueState.js";
import { shouldOfferResumeCompact, runResumeCompactOffer } from "./resumeCompactOffer.js";
import { Tp, use } from "../../services/compact/autoCompact.js";
import { Us } from "../../services/projects/threadRows.js";
import {
  loadPrecomputedCompact,
  MGt,
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
import { dropMalformedAttachments, Mjr, dedupeSessionStartRows } from "../../utils/transcript/deserialize.js";
import { xo } from "../../bootstrap/sessionSlices.js";
import { getSessionEndHookTimeoutMs, executeSessionEndHooks } from "../../utils/hooks.js";
import { processSessionStartHooks, PGt, startHookRun, contextTokensOf } from "../../utils/sessionStart.js";
import { copyPlanForFork, copyPlanForResume } from "../../utils/plans.js";
import { copyFileHistoryForResume } from "../../utils/fileHistory.js";
import { liveAgentNames } from "../../utils/agentNameRegistry.js";
import { Ozt, setCostStateForRestore } from "../../cost-tracker.js";
import { forfeitAllChatPins } from "../../tasks/LocalAgentTask/childWork.js";
import { clearFileStateCacheKeepingSeeds } from "../../utils/fileStateCache.js";
import { getTaskRunState } from "../../utils/task/taskNotifications.js";
import { taskOutputDirForSession, initTaskOutputAsSymlink } from "../../utils/task/diskOutput.js";
import {
  seedCommentMonitorIntent,
  takeRestoredMonitorIntents,
  Ozn,
  isAutoReactWired,
} from "../../services/artifacts/commentMonitor.js";
import { zE } from "../../utils/model/modelSwitchHooks.js";
import { isAgentSwarmsEnabled } from "../../utils/agentSwarmsEnabled.js";
import { retireResumeSwapPair, rehydrateSession } from "./sessionRehydration.js";
import { retireConversationReplicas, disposeLiveState } from "../../services/liveReplica/liveReplica.js";
import {
  resetStickyBetaNameOnlyEntries,
  xDt,
  clearInlineToolsRefusal,
  dropWireShapeSeed,
  fEr,
  ODt,
  pEr,
  IDt,
} from "../../bootstrap/stateSlices.js";
import { getToolSearchBeta } from "../../utils/betas.js";
import { i6 } from "../../memdir/findRelevantMemories.js";
import { AGENT_TASK_TYPES } from "../../tasks/taskKinds.js";
import { hasCompletedWithFindings } from "../../tasks/LocalAgentTask/LocalAgentTask.js";
import { invalidateToolDescriptions } from "../../services/api/toolDescriptionCache.js";
import { wXn } from "../../tools/WaitForMcpServersTool/WaitForMcpServersTool.js";
import { getEndedByModel } from "../../tasks/endedByModel.js";
import { installDevModsPlaceholderExpander } from "../../services/plugins/devMods/devModsWatcher.js";
import { reclaimSessionNameOnResume } from "../../utils/sessionNameUniqueness.js";
import { loe } from "../../utils/lastResumeRecord.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { findIsolationLatchFromHistory } from "../../services/tools/webToolIsolation.js";
import { tE } from "../../utils/permissions/currentPermissionContext.js";
import { claudeAiEnvironment } from "../../constants/claudeAiOrigin.js";
import {
  describeNotResumedIncomplete,
  EAs,
  classifyMonitorHold,
  describeHeldMonitor,
  describeNotResumedAfterSwitch,
  rearmOnResumeSafe,
} from "../../services/artifacts/commentMonitorResume.js";
import { artifactViewerUrlFor } from "../../tools/ArtifactTool/artifactUrls.js";
import { findLiveReplyHolder, Rzn } from "../../services/artifacts/comments/replyYield.js";
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
import { primePasteIdsFromMessages, rSo, renumberPastedContents } from "../../history.js";
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
import { B9n, kT } from "../../services/tools/detachedToolCalls.js";
import { Q2e } from "../../services/diagnosticTracking.js";
import {
  isConversationResetSwitch,
  cancelOnConversationReset,
} from "../../services/quotaAutoResume/quotaAutoResume.js";
import { mWn } from "../../utils/swarm/teammateIdleResult.js";
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
import { h0e } from "../../plugins/functionHooks/commandRunDispatch.js";
import { dWt, COMPACTED_WHILE_IDLE_TEXT } from "../../services/compact/idleCompaction.js";
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
import { KV } from "../../services/oauth/loginEvents.js";
import { isBgSession, isActingAsBgJob, getBgJobDir, getBgTakeover } from "../../utils/concurrentSessions.js";
import {
  oAe,
  HUs,
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
import { bM } from "../../state/promptInputStore.js";
import { startCrossSessionHoldReceipt } from "../../utils/crossSessionHoldReceipt.js";
import { registerReplyYieldNotices } from "../../services/artifacts/replyYieldHolder.js";
import { syncJobStateName } from "../../utils/background/jobStateNameSync.js";
import { sessionNameYieldedNotice } from "../../commands/rename/rename.js";
import { ci } from "../../utils/swarm/hostState.js";
import { commandListDisplayTruncated } from "../../components/permissions/shellPermissionHelpers.js";
import { startSessionHooks } from "../../plugins/functionHooks/sessionEvents.js";
import { loadPluginHooks } from "../../utils/plugins/loadPluginHooks.js";
import { appendRowsWithHooks, collectRewoundFileTrackingPaths } from "../../utils/queryHelpers.js";
import { nkn, normalizeFilePath } from "../../utils/tempDirRealpaths.js";
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
import { lse } from "../../services/api/promptPrefixLedger.js";
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
import { bl } from "../../utils/toolResultStorage.js";
import { splitStampedImages } from "../../utils/messageQueueManager.js";
import { BH } from "../../state/sliceHelpers.js";
import { recordImagePath, cLe } from "../../utils/imageStore.js";
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
import { Dho } from "../../components/messages/GroupedToolUseContent.js";
import { env } from "../../utils/env.js";
import { wt } from "../../remote/remoteMode.js";
import { compactCommand } from "../../commands/compact/index.js";
import { isClaudeMdLoadingDisabled } from "../../utils/settings/customizationDisabled.js";
import { getMemoryFilesCached, oEt, shouldInjectMemoryFile } from "../../utils/claudemd.js";
import { getReadTimestamp } from "../../tools/FileReadTool/savedOutputPaths.js";
import { __ } from "../../utils/remoteFileState.js";

//@ chunk-18hwfzwa.js:344654-344715 placement
function oO(h, x) {
  if (h.trim() === "") return x;
  return `${h}
${x}`;
}
//@ chunk-18hwfzwa.js:344715-344830 placement
function restorePromptAfterCancel(h, x, { neverSubmitted: D = !1 } = {}) {
  if ((h.setMode("prompt"), h.replaceValue(oO(h.value, x)), !D)) h.markCameBack();
}
//@ chunk-18hwfzwa.js:369774-369833 placement
function mje({ store: store, dialogStore: dialogStore, queue: queue }) {
  return () => {};
}
//@ chunk-18hwfzwa.js:369833-371237 placement
function mergeQueuedHumanMessages(h, x) {
  let D = new Set(x.map((kt) => kt.uuid)),
    filtered = h.filter((kt) => !D.has(kt.uuid));
  if (!isSubagentHistoryEnabled()) return [...filtered, ...x];
  let ee = [];
  for (let kt of filtered) {
    if (kt.type !== "user" || kt.isMeta !== !0 || typeof kt.message.content !== "string") continue;
    let At = kt.origin?.kind,
      It =
        At === "human"
          ? unwrapMidTurnUserMessage(kt.message.content)
          : At === "coordinator"
            ? unwrapCoordinatorMessage(kt.message.content)
            : void 0;
    if (At !== void 0 && It !== void 0) ee.push({ row: kt, key: pje(At, It), words: It });
  }
  let ke = new Map(h.map((kt, At) => [kt.uuid, At])),
    Re = new Set(),
    Be = [],
    He;
  for (let kt of x) {
    let At = ke.get(kt.uuid);
    if (At !== void 0) {
      He = At;
      continue;
    }
    if (kt.type !== "user" || kt.isMeta === !0 || typeof kt.message.content !== "string") continue;
    let It = kt.origin?.kind;
    if (It !== "human" && It !== "coordinator") continue;
    let Ot = pje(It, kt.message.content),
      Et = He,
      Dt =
        Et === void 0
          ? void 0
          : ee.find((Lt) => Lt.key === Ot && !Re.has(Lt.row.uuid) && (ke.get(Lt.row.uuid) ?? -1) > Et);
    if (Dt === void 0) Be.push(Ot);
    else Re.add(Dt.row.uuid);
  }
  for (let kt of Be) {
    let last = ee.findLast((It) => It.key === kt && !Re.has(It.row.uuid));
    if (last !== void 0) Re.add(last.row.uuid);
  }
  let We = new Map();
  for (let { row: row, words: words } of ee)
    if (!Re.has(row.uuid)) {
      let { isMeta: isMeta, ...Ot } = row;
      We.set(row.uuid, { ...Ot, message: { ...row.message, content: words } });
    }
  let ze = [],
    Xe = new Map(),
    rt;
  for (let kt of h) {
    let At = We.get(kt.uuid);
    if (D.has(kt.uuid)) rt = kt.uuid;
    else if (At !== void 0 && rt !== void 0) Xe.set(rt, [...(Xe.get(rt) ?? []), At]);
    else (ze.push(At ?? kt), (rt = void 0));
  }
  return [...ze, ...x.flatMap((kt) => [kt, ...(Xe.get(kt.uuid) ?? [])])];
}
//@ chunk-18hwfzwa.js:371237-371273 placement
function pje(h, x) {
  return `${h}
${x}`;
}
//@ chunk-18hwfzwa.js:371273-371914 placement
function syncViewedAgentPermissionMode({ store: store, setAppState: setAppState, storageV5: storageV5 }) {
  return createDependencyWatcher(
    [store],
    () => {
      let { viewingAgentTaskId: viewingAgentTaskId, tasks: tasks } = store.getState(),
        ke = viewingAgentTaskId ? tasks[viewingAgentTaskId] : void 0,
        Re = isLocalAgent(ke) && ke.retain && !ke.diskLoaded;
      return [viewingAgentTaskId, Re];
    },
    (L, ee) => {
      if (!L || !ee) return;
      let ke = L;
      getAgentTranscript(Mr(ke), storageV5)
        .then((Re) => {
          setAppState((Be) => {
            let He = Be.tasks[ke];
            if (!isLocalAgent(He) || He.diskLoaded || !He.retain) return Be;
            let We = Be.transcripts[ke],
              ze = We?.messages ?? [],
              Xe = new Set(ze.map((At) => At.uuid)),
              rt = mergeQueuedHumanMessages(Re?.messages ?? [], ze),
              filtered = rt.filter((At) => !Xe.has(At.uuid));
            return (
              cKe(filtered),
              {
                ...Be,
                tasks: { ...Be.tasks, [ke]: { ...He, diskLoaded: !0 } },
                transcripts: {
                  ...Be.transcripts,
                  [ke]: { inProgressToolUseIDs: new Set(), ...We, messages: rt },
                },
              }
            );
          });
        })
        .catch(logError);
    },
  );
}
//@ chunk-18hwfzwa.js:371914-371989 placement
var Qae = require("./chunk-cm57mjc2.js"),
  eHt = [1000, 3000, 1e4],
  tHt = 50,
  oHt = 1300;
//@ chunk-18hwfzwa.js:371989-372064 placement
function yje() {
  let h = getOauthAccountInfo();
  return `${h?.accountUuid}|${h?.profileFetchedAt}`;
}
//@ chunk-18hwfzwa.js:372064-372127 placement
function Sje(h) {
  return h.type !== "system" || h.subtype !== "placed";
}
//@ chunk-18hwfzwa.js:372127-372224 placement
function Gae(h) {
  let lastIndex = h.findLastIndex(Sje),
    found = h.find(Sje);
  return `${lastIndex + 1}|${found?.uuid}|${h[lastIndex]?.uuid}`;
}
/**
 * 当前会话 id 与 transcript 路径（持久化关闭或无会话文件时 null）。
 */
//@ chunk-18hwfzwa.js:372224-372356 placement
function currentTranscriptRef() {
  let h = d1n();
  if (h !== null) return h;
  if (isTranscriptPersistenceDisabled() || getMaterializedSessionFile() === null) return null;
  let x = getSessionId();
  return { sessionId: x, transcriptPath: getTranscriptPathForSession(x) };
}
//@ chunk-18hwfzwa.js:372356-372447 placement
var SLASH_COMMAND_PICKER_KEYS = new Set([
  "slash_command_picker",
  "slash_command_session_id",
  "slash_command_title",
]);
/**
 * SessionController：REPL 会话控制器，管理会话 ID、续接、分叉与会话级状态。
 */
//@ chunk-18hwfzwa.js:372447-411777 placement
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
  _disposed = !1;
  _queuedClearWatch = null;
  _cancelSiblingLoginCheck;
  adoptedPrefillRef;
  _adoptedPrefill = void 0;
  _adoptedFrameLive = void 0;
  _host = null;
  _snapshot;
  _changed = createSignal();
  constructor({
    session: h,
    presentation: x,
    store: D,
    setAppState: L,
    transcript: ee,
    turn: ke,
    draft: Re,
    chrome: Be,
    scrollPin: He,
    scope: We,
    engine: ze,
    dialogStore: Xe,
    taskRegistry: rt,
    messageQueue: kt,
    storageV5: At,
    credentials: It,
    sessionHooks: Ot,
    initialMessages: Et,
    initialMessagesOrigin: Dt = "local",
    initialMainThreadAgentDefinition: Lt,
    disableQuery: oo = !1,
    hasRemoteTransport: Xt,
    resetReplTabToConvo: io,
    resetTurnEventTail: so,
    clock: po,
    sandbox: ao,
    spinnerStore: co,
    pendingHookMessages: bo,
  }) {
    ((this.session = h),
      this.#e.add(getSessionId()),
      (this.#n = x),
      (this.store = D),
      (this._setAppState = L),
      (this.transcript = ee),
      (this.turn = ke),
      (this.draft = Re),
      (this.#s = Be),
      (this.#r = He),
      (this.scope = We),
      (this.engine = ze),
      (this.dialogStore = Xe),
      (this.taskRegistry = rt),
      (this.messageQueue = kt),
      (this.storageV5 = At),
      (this.credentials = It),
      (this.sessionHooks = Ot),
      (this.initialMessages = Et),
      (this.conversationOrigin = Dt),
      (this.initialMainThreadAgentDefinition = Lt),
      (this.disableQuery = oo),
      (this.runsNoModelTurn = oo || Xt),
      (this._resetReplTabToConvo = io),
      (this._resetTurnEventTail = so),
      (this._clock = po),
      (this._sandbox = ao),
      (this._spinnerStore = co),
      (this._pendingHookSet = bo ? { run: bo, sessionId: h.id } : null),
      (this._restoredStamp = Et && Gae(Et)),
      (this._snapshot = {
        conversationId: randomUUID_8(),
        haikuTitle: void 0,
        headHooksPending: this.headHooksPending,
      }));
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
    let _snapshot = this._snapshot,
      D = { ..._snapshot, ...h };
    if (
      D.conversationId === _snapshot.conversationId &&
      D.haikuTitle === _snapshot.haikuTitle &&
      D.headHooksPending === _snapshot.headHooksPending
    )
      return;
    ((this._snapshot = D), this._changed.emit());
  }
  bindHost(h) {
    this._host = h;
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
  setHaikuTitle = (h) => {
    this._publish({ haikuTitle: h });
  };
  bumpConversationId = () => {
    this._publish({ conversationId: randomUUID_8() });
  };
  applyConversationReset = (h) => {
    (this.transcript.cut(),
      this.turn.resetForConversation({ kind: "fresh" }),
      this._publish({ conversationId: h, haikuTitle: void 0 }),
      resetContinueState(),
      this._resetTurnEventTail(),
      (this.preClearOrigin = this.conversationOrigin),
      (this.conversationOrigin = "local"));
  };
  maybePromptStaleResume(h, x) {
    this._promptStaleResume(h, x).catch(logError);
  }
  async _promptStaleResume(h, x) {
    let { transcript: transcript, storageV5: storageV5, session: session } = this,
      ke = shouldOfferResumeCompact(h, Tp);
    if (ke) {
      let Re = Us(h);
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
        let We = MGt(session.precompute, void 0);
        return We?.status === "ready" && Re.some((ze) => ze.uuid === We.coverage.lastUuid);
      };
      if (
        (await runResumeCompactOffer(
          this.scope.requestDialog,
          { ...ke, hasPrecomputedSummary: Be() },
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
            offersLookUp: wje(h, x),
            startNewConversation: () => this._startNewConversation(h, x),
          }),
        );
        return;
      }
    } catch (error) {
      throw (logFeatureBad("cli_cold_resume_quota_warning", "prompt_failed"), error);
    }
    try {
      await useDefaultToNewerModelKey(h, {
        requestDialog: this.scope.requestDialog,
        addNotification: (Re) => this._requireHost().addNotification(Re),
        removeNotification: (Re) => this._requireHost().removeNotification(Re),
        session: session,
        store: this.store,
        setAppState: this._setAppState,
        transcript: transcript,
        storageV5: storageV5,
      });
    } catch (error) {
      throw (logFeatureBad("cli_newer_model_offer", "prompt_failed"), error);
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
      return (logFeatureBad(quotaWarningSurface("idle"), "prompt_failed"), logError(error), null);
    }
  }
  async askIdleCacheQuota(h) {
    let x = this.#t;
    try {
      let D = await showIdleReturnDialog(this.scope.requestDialog, h, {
        trigger: "idle",
        offersLookUp: wje(this.transcript.getSnapshot(), currentTranscriptRef()),
        startNewConversation: () =>
          this._startNewConversation(this.transcript.getSnapshot(), currentTranscriptRef(), "idle"),
      });
      this.#c(x, D);
    } catch (error) {
      throw (logFeatureBad(quotaWarningSurface("idle"), "prompt_failed"), error);
    }
  }
  #c(h, x) {
    if (x === "resume" || x === "dismiss") this.#o = h;
  }
  async _startNewConversation(h, x, D = "resume") {
    let L = quotaWarningSurface(D),
      ee = getSessionId(),
      ke = pinSessionId(ee),
      Re = null,
      Be = !1;
    if (x !== null && vje(h, ke))
      try {
        Re = buildPreviousConversationPointer({ resumed: h, source: x });
      } catch (error) {
        ((Be = !0), logError(error));
      }
    let He;
    try {
      He = Re === null ? void 0 : getCurrentSessionDisplayTitle(ee);
    } catch (error) {
      logError(error);
    }
    let We = new Set(this.messageQueue.getCommandQueue());
    try {
      await this._submitSlashCommand(
        "/clear",
        D === "idle" ? { fromKeybinding: !0, keepsComposer: !0, leavesIdeSelection: !0 } : void 0,
      );
    } catch (error) {
      (logFeatureBad(L, "clear_failed"), logError(error));
      return;
    }
    let ze = { pointer: Re, pointerFailed: Be, previousTitle: He, feature: L };
    if (getSessionId() !== ee) {
      this._finishNewConversation(ze, !0);
      return;
    }
    let Xe = (kt) => !We.has(kt) && kt.mode === "prompt" && kt.value === "/clear",
      found = this.messageQueue.getCommandQueue().find(Xe);
    if (
      (this.messageQueue.someInFlightDrainCommand((kt) => {
        if (found === void 0 && Xe(kt)) found = kt;
        return found !== void 0;
      }),
      found === void 0)
    ) {
      this._finishNewConversation(ze, !1);
      return;
    }
    this._watchQueuedClear(found, ee, ke, ze);
  }
  _watchQueuedClear(h, x, D, L) {
    if ((this._queuedClearWatch?.settle(!1), this._disposed)) {
      this._finishNewConversation(L, !1);
      return;
    }
    let { messageQueue: messageQueue, turn: turn } = this,
      Re = [],
      Be = !1,
      He = !1,
      We = {
        stop: () => {
          for (let It of Re.splice(0)) It();
          if (this._queuedClearWatch === We) this._queuedClearWatch = null;
        },
        settle: (It) => {
          if (Be) return;
          ((Be = !0), We.stop(), this._finishNewConversation(He ? { ...L, pointer: null } : L, It));
        },
      };
    this._queuedClearWatch = We;
    let ze = (It) => It === h || (h.uuid !== void 0 && It.uuid === h.uuid),
      someInFlightDrainCommand = messageQueue.someInFlightDrainCommand(ze),
      rt,
      kt = 0,
      At = () => {
        try {
          if (this._queuedClearWatch !== We) return;
          if (getSessionId() === x && _je(D)) He = !0;
          let someInFlightDrainCommand_2 = messageQueue.someInFlightDrainCommand(ze);
          if (((someInFlightDrainCommand ||= someInFlightDrainCommand_2), turn.guard.isActive)) {
            kt = 0;
            return;
          }
          if (messageQueue.getCommandQueue().some(ze)) return;
          let Ot = someInFlightDrainCommand && getSessionId() !== x && getParentSessionId() === x;
          if (!Ot && someInFlightDrainCommand_2 && kt < oHt) {
            (kt++, rt?.(), (rt = this._clock.setTimeout(At, tHt)));
            return;
          }
          We.settle(Ot);
        } catch (error) {
          if ((We.stop(), logError(error), !Be)) ((Be = !0), logFeatureSad(L.feature, "clear_not_applied"));
        }
      };
    (Re.push(
      turn.guard.subscribe(At),
      messageQueue.subscribe(() => queueMicrotask(At)),
      () => rt?.(),
    ),
      queueMicrotask(At));
  }
  _finishNewConversation({ pointer: h, pointerFailed: x, previousTitle: D, feature: L }, ee) {
    let ke = !1;
    if (h !== null && ee)
      try {
        let Re = D === void 0 ? "" : stripIgnorables(D),
          Be = createSystemMessage(
            Re === ""
              ? "New conversation. Claude can look up the previous conversation if you refer to it."
              : `New conversation. Claude can look up "${truncateToWidth(Re, 60)}" if you refer to it.`,
            "notice",
          );
        this.transcript.apply({ type: "append", messages: [Be, h] });
      } catch (error) {
        ((ke = !0), logError(error));
      }
    if (!ee) logFeatureSad(L, "clear_not_applied");
    else if (x || ke) logFeatureSad(L, x ? "pointer_failed" : "pointer_append_failed");
    else logFeatureOk(L);
  }
  _submitSlashCommand(h, x) {
    return this._requireHost().onSubmit(
      h,
      { setCursorOffset: () => {}, clearBuffer: () => {}, resetHistory: () => {} },
      { ...x, inputModeOverride: "prompt" },
    );
  }
  markConversationRemote = () => {
    ((this.conversationOrigin = "remote"), this.#t++);
  };
  resume = async (h, x, D) => {
    let {
        session: session,
        store: store,
        _setAppState: _setAppState,
        turn: turn,
        dialogStore: dialogStore,
        taskRegistry: taskRegistry,
        scope: scope,
        storageV5: storageV5,
        credentials: credentials,
        initialMainThreadAgentDefinition: initialMainThreadAgentDefinition,
        draft: draft,
      } = this,
      { mainLoopModel: mainLoopModel } = this._requireHost(),
      replace = this.transcript.replace,
      startTime = performance.now();
    try {
      Igt(session.host);
      let Et = { ...x, messages: dropMalformedAttachments(x.messages) },
        Dt = Mjr(Et.messages),
        Lt = void 0,
        oo = require("./chunk-yxywkh50.js"),
        matchSessionMode = oo.matchSessionMode(x.mode);
      if (matchSessionMode) {
        let vo = await reloadAgentDefinitionsForModeSwitch(xo(session).originalCwd, [], storageV5);
        (_setAppState((Yo) => ({ ...Yo, agentDefinitions: vo })),
          Dt.push(createSystemMessage(matchSessionMode, "warning")));
      }
      let io = getSessionEndHookTimeoutMs();
      await executeSessionEndHooks(session, "resume", {
        sessionHooks: this.sessionHooks,
        getAppState: () => store.getState(),
        signal: AbortSignal.timeout(io),
        storageV5: storageV5,
        credentials: credentials,
      });
      let so = await loadAgentDefinitionsForSessionCwd(x.projectPath, storageV5),
        { agentDefinition: agentDefinition } = restoreAgentFromSession(
          x.agentSetting,
          initialMainThreadAgentDefinition,
          store.getState().agentDefinitions,
          {
            sessionAgentDefinitions: so,
            sessionCwd: x.projectPath,
            onResolveMiss: (vo) => Dt.push(createSystemMessage(vo, "warning")),
          },
        );
      (scope.setMainThreadAgentDefinition(agentDefinition),
        _setAppState((vo) => ({ ...vo, agent: agentDefinition?.agentType })));
      let ao, co;
      if (D !== "fork")
        co = await restoreModelFromSession(
          Dt,
          mainLoopModel,
          (vo) => Dt.push(createSystemMessage(vo, "warning")),
          {
            scheduleTelemetry: (vo) => {
              ao = vo;
            },
            storageV5: storageV5,
            credentials: credentials,
          },
        );
      appendSlackTagResumeRecords(Dt, { fork: D === "fork", sessionId: h });
      let bo = await processSessionStartHooks(session, D === "fork" ? "fork" : "resume", {
        sessionId: h,
        envFileSessionId: LE(h),
        sessionTitle: x.customTitle,
        agentType: agentDefinition?.agentType,
        model: co ?? mainLoopModel,
        resumedMessages: x.messages,
        storageV5: storageV5,
        credentials: credentials,
      });
      if ((Dt.push(...dedupeSessionStartRows(Dt, bo)), D === "fork")) copyPlanForFork(x, LE(h), storageV5);
      else copyPlanForResume(x, LE(h), storageV5);
      if (x.fileHistorySnapshots) copyFileHistoryForResume(x, LE(h), storageV5);
      _setAppState((vo) => ({
        ...vo,
        standaloneAgentContext: computeStandaloneAgentContext(x.agentName, x.agentColor),
        sendMessagePins: {},
        agentNameRegistry: liveAgentNames(vo.agentNameRegistry, vo.tasks),
      }));
      let Ao =
        D === "fork"
          ? this.conversationOrigin
          : D === "rewind_pre_clear"
            ? (this.preClearOrigin ?? this.conversationOrigin)
            : "local";
      (turn.resetLoadingState(),
        turn.setAbortController(null),
        this.transcript.cut(),
        this._publish({ conversationId: h }),
        this._resetTurnEventTail(),
        Ozt(void 0, storageV5));
      let Bo = LE(h),
        Ro = pinSessionId(Bo),
        Ho = getSessionId();
      this.#e.add(Ho);
      let Io = this.#e.has(Bo);
      if (
        (switchSession(Bo, D === "fork" ? "fork" : "resume", x.fullPath ? dirname_2(x.fullPath) : null),
        D !== "fork")
      )
        _setAppState(forfeitAllChatPins);
      if (D !== "fork" && Bo !== Ho) clearFileStateCacheKeepingSeeds(scope.readFileState);
      if (
        (this.restoreReadFileState(Dt, x.projectPath ?? xo(session).originalCwd, D === "fork", Ao),
        D !== "fork")
      )
        getTaskRunState().inheritPredecessorLinks(taskOutputDirForSession(Bo), x.modified.getTime());
      if (D !== "fork")
        seedCommentMonitorIntent(x.artifactCommentMonitor, {
          ...(storageV5 !== void 0 && { storageV5: storageV5 }),
        });
      if (co) {
        let vo = installRestoredModel(Dt, co, !1, storageV5, credentials);
        if (vo)
          _setAppState((Yo) => {
            if (Yo.mainLoopModel === vo) return Yo;
            return (zE(session, Yo, vo, "resume"), { ...Yo, mainLoopModel: vo });
          });
      }
      (rearmRefusalFallbackHeaderFromTranscript(Dt, D === "fork"), ao?.());
      let { renameRecordingForSession: renameRecordingForSession } = await import("./chunk-qh27pgpw.js");
      (await renameRecordingForSession(session, storageV5), await resetSessionFilePointer());
      let mn = isAgentSwarmsEnabled()
        ? await (await import("./chunk-6cc2zqkz.js")).rekeySessionTeamInSession(storageV5)
        : void 0;
      if (mn)
        _setAppState((vo) => ({ ...vo, teamContext: mn.teamContext, teammateColors: mn.teammateColors }));
      if (D !== "fork") {
        if (
          (retireResumeSwapPair(store.getState, store.setState, dialogStore, this.session),
          retireConversationReplicas(),
          disposeLiveState(),
          this.rehydrateResumedFrameState(Dt, !1, Ao, !1),
          resetStickyBetaNameOnlyEntries(getStickyBetas()),
          xDt(getStickyBetas()),
          clearInlineToolsRefusal(getStickyBetas()),
          dropWireShapeSeed(getStickyBetas()),
          fEr(getStickyBetas()),
          ODt(getStickyBetas()),
          pEr(getStickyBetas()),
          IDt(getStickyBetas(), getToolSearchBeta()),
          i6(scope.memorySelector),
          !Object.values(store.getState().tasks).some(
            (Yo) =>
              AGENT_TASK_TYPES.has(Yo.type) &&
              (Yo.status === "running" || (isLocalAgent(Yo) && hasCompletedWithFindings(Yo))),
          ))
        )
          (invalidateToolDescriptions(), wXn(session.host));
        if (SLASH_COMMAND_PICKER_KEYS.has(D) && !Io) {
          let Yo = await preparePlanModeRestoreOnInteractiveResume({
            storedPermissionMode: x.permissionMode,
            messages: Dt,
            forkSession: !1,
            permissionModeSuppliedOnInvocation: !1,
            lane: "interactive_slash",
          });
          _setAppState((kn) => {
            let Fn = Yo(kn.toolPermissionContext);
            return Fn ? { ...kn, toolPermissionContext: Fn } : kn;
          });
        }
      }
      if (
        (restoreSessionStateFromLog(Et, store.setState, this.sessionHooks, {
          preserveLiveBudget: D === "fork" || D === "rewind_pre_clear",
        }),
        applyEndedByModelOnResume(getEndedByModel(x), _setAppState),
        clearSessionMetadata(),
        restoreSessionMetadata(
          D === "fork"
            ? buildForkAdoptionMeta(x, { stripRelocatedCwd: !0 })
            : { ...x, artifactCommentMonitor: void 0 },
          { taintSid: Ro, storageV5: storageV5 },
        ),
        installDevModsPlaceholderExpander(),
        pushRestoredMemoryPauseNotice(Dt),
        D === "fork")
      )
        if (x.precautionarySuppressionHeld)
          (holdPrecautionarySuppressionFor(Ro), markPrecautionClearResilientFor(Ro));
        else copyPrecautionarySuppressionTo(Ro, pinSessionId(getSessionIdFromLog(x)));
      let Cn = PGt();
      if (Cn) cacheHookSessionTitle(Cn);
      if (
        (reclaimSessionNameOnResume(x.agentName, storageV5, { autoOnly: !x.customTitle }),
        D !== "fork" && x.bridgeSessionId)
      )
        _setAppState((vo) =>
          vo.replBridgeEnabled && !vo.replBridgeOutboundOnly
            ? vo
            : { ...vo, replBridgeEnabled: !0, replBridgeOutboundOnly: !1 },
        );
      if ((this._publish({ haikuTitle: void 0 }), D !== "fork")) {
        exitRestoredWorktree(
          x.worktreeSession === void 0 ? x.projectPath : x.worktreeSession?.worktreePath,
          storageV5,
        );
        let vo = restoreWorktreeForResume(loe.of(session.host), x.worktreeSession, x.projectPath, {
          storageV5: storageV5,
        });
        if (vo) Dt.push(createSystemMessage(worktreeResumeNotice(vo), "warning"));
        if (
          (this._resetReplTabToConvo(),
          (scope.isolationLatch.onLatch = void 0),
          isStorageV5Enabled() && storageV5 !== void 0)
        )
          await adoptResumedSessionFileAsync(storageV5);
        else adoptResumedSessionFile();
        scope.reseatIsolationLatch(
          x.isolationLatch ??
            findIsolationLatchFromHistory(Dt, scope.combinedInitialTools, void 0, void 0, session),
        );
        {
          let Yo = takeRestoredMonitorIntents({ ...(storageV5 !== void 0 && { storageV5: storageV5 }) }),
            kn = [...Ozn()],
            Fn = tE() ? "replShort" : "repl";
          if (kn.length > 0) {
            let Go = claudeAiEnvironment();
            Dt.push(
              createSystemMessage(
                describeNotResumedIncomplete(
                  kn.map((hn) => artifactViewerUrlFor({ slug: hn, env: Go })),
                  Fn,
                ),
                "warning",
              ),
            );
          }
          let bn = EAs(Yo, isAutoReactWired);
          if (bn.length > 0) {
            let Go = Bo,
              hn = "unknown",
              Mn,
              Xo = 0,
              Sn = !1;
            try {
              let { listRegisteredSessionRecords: listRegisteredSessionRecords } =
                  await import("./chunk-ewxn4535.js"),
                Dn = await findLiveReplyHolder({
                  records: await listRegisteredSessionRecords(),
                  sessionId: Go,
                  selfPid: process.pid,
                  isRunning: isProcessRunning,
                  isSameProcess: provenSameProcessAsync,
                });
              ((Sn = !0), (hn = Dn.verdict), (Mn = Dn.holder), (Xo = Dn.otherHolders?.length ?? 0));
            } catch {
              logFeatureSad("artifact_live_subscribe", "holder_probe_failed");
            }
            let $n = claudeAiEnvironment(),
              mapped = bn.map((cn) => artifactViewerUrlFor({ slug: cn, env: $n })),
              now = Date.now();
            if (hn !== "none" && Sn)
              classifyMonitorHold(hn === "live" ? "held_by_live_session" : "holder_unknown", {
                path: "switch",
                probed: Sn,
                liveHolder: Mn,
                otherHolders: Xo,
                monitors: bn.length,
                jobStamped: [...Yo.values()].some((cn) => cn.state === "armed" && cn.holder === "bg"),
                jobHolder: "none",
                takeover: "not_attempted",
                now: now,
              });
            if (hn === "live")
              Dt.push(
                createSystemMessage(
                  describeHeldMonitor(mapped, Mn !== void 0 ? Rzn(Mn, Xo, now) : void 0, Fn),
                  "notice",
                ),
              );
            else Dt.push(createSystemMessage(describeNotResumedAfterSwitch(mapped, Fn), "notice"));
          }
        }
        if (
          (restoreRemoteAgentTasks({
            abortController: new AbortController(),
            taskRegistry: taskRegistry,
            storageV5: storageV5,
            credentials: credentials,
          }),
          isMcpTasksEnabled())
        )
          loadMcpTaskModule({
            sessionId: Bo,
            conversation: [...Dt],
            taskRegistry: taskRegistry,
            getMcpClients: () => store.getState().mcp.clients,
            requestDialog: scope.requestDialog,
            storageV5: storageV5,
            credentials: credentials,
          });
        (removeSessionCronTasks(
          getSessionCronTasks().map((Yo) => Yo.id),
          { handOff: !0 },
        ),
          formatOrphanSummary(Dt, taskRegistry, void 0, void 0, storageV5, void 0, () => ({
            kind: "runningPool",
            tools: scope.computeTools(),
          })));
      } else {
        takeRestoredMonitorIntents({ ...(storageV5 !== void 0 && { storageV5: storageV5 }) });
        let vo = getCurrentWorktreeSession();
        if (vo) saveWorktreeState(vo, storageV5);
        if (scope.isolationLatch.current) saveIsolationLatch(scope.isolationLatch.current, storageV5);
      }
      let { isCoordinatorMode: isCoordinatorMode } = require("./chunk-yxywkh50.js");
      if (
        (saveMode(isCoordinatorMode() ? "coordinator" : "normal"),
        resetCostState(),
        setCostStateForRestore(x),
        D !== "fork")
      )
        scope.reconstructContentReplacementState(Dt, x.contentReplacements ?? []);
      if (
        (primePasteIdsFromMessages(Dt),
        emitReplBridgeEvent(session, LE(h)),
        Ket(),
        replace(() => Dt),
        (this.conversationOrigin = Ao),
        D !== "fork")
      )
        draft.replaceValue("");
      if (D !== "fork") {
        try {
          await prefetchPrecomputedSidecar(
            Bo,
            { sessionId: Bo, transcriptPath: x.fullPath },
            session.precompute,
            storageV5,
          );
        } catch (error) {
          logError(error);
        }
        this.maybePromptStaleResume(Dt, {
          sessionId: Bo,
          transcriptPath: x.fullPath ?? getTranscriptPathForSession(Bo),
        });
      }
      logEvent("tengu_session_resumed", {
        entrypoint: fromEnum(D),
        success: !0,
        resume_duration_ms: Math.round(performance.now() - startTime),
      });
    } catch (error) {
      throw (
        logEvent("tengu_session_resumed", {
          entrypoint: fromEnum(D),
          success: !1,
          failure_reason: lit_2("processing_error"),
          error_name: sanitizedErrorNameForTelemetry(toError(error)),
        }),
        error
      );
    }
  };
  rehydrateResumedFrameState(h, x = !1, D = "local", L = !0) {
    let { _setAppState: _setAppState } = this;
    applyArtifactResumeCarry(
      _setAppState,
      collectResumeArtifactCarry(h, { origin: D, seedEligible: isResumeFrameSeedEligible(), reportCarry: L }),
      { continuesConversation: x, keepCloudRows: D === "remote" },
    );
  }
  _discardDetachedToolCallsOutside(h) {
    B9n(kT.of(this.session), this.messageQueue, h);
  }
  restoreReadFileState(h, x, D = !1, L = "local") {
    let { scope: scope, turn: turn, store: store } = this;
    (scope.mergeReadFileStateFrom(h, x),
      turn.resetForConversation({ kind: "resumed", messages: h }),
      this._discardDetachedToolCallsOutside(h),
      this.rehydrateResumedFrameState(h, D, L),
      store.setState((Be) => rehydrateSession(h, Be, { restoreAgentNames: !D })));
  }
  start() {
    let h = [],
      x = () => {
        ((this._disposed = !0), this._queuedClearWatch?.settle(!1));
        for (let D = h.length - 1; D >= 0; D--) h[D]();
        Q2e.of(this.session).shutdown();
      };
    try {
      this._runStartSteps(h);
    } catch (error) {
      throw (x(), error);
    }
    return x;
  }
  _runStartSteps(h) {
    let { store: store, transcript: transcript, session: session, storageV5: storageV5 } = this;
    (h.push(
      syncViewedAgentPermissionMode({ store: store, setAppState: store.setState, storageV5: storageV5 }),
    ),
      this._startFeeds(h),
      h.push(
        onSessionSwitch((He, We) => {
          if ((this.#e.add(He), isConversationResetSwitch(We))) this.#t++;
        }),
      ),
      h.push(
        subscribeSessionAgentNameChanged(() => {
          let He = getCurrentSessionAgentName();
          if (!He) return;
          store.setState((We) =>
            We.standaloneAgentContext?.name === He
              ? We
              : { ...We, standaloneAgentContext: { ...We.standaloneAgentContext, name: He } },
          );
        }),
      ));
    try {
      this._startSiblingLoginWatch(h);
    } catch (error) {
      logError(Error("SessionController.start: sibling-login watch threw", { cause: error }));
    }
    if ((this._raiseSessionStart(), this._pendingHookSet)) this._subscribeHookSet(this._pendingHookSet);
    (h.push(
      this.session.subscribe(() => {
        let _pendingHookSet = this._pendingHookSet;
        if (_pendingHookSet && this.session.id !== _pendingHookSet.sessionId)
          this._releaseHookSet(_pendingHookSet, !0);
      }),
    ),
      h.push(() => this.releasePendingHookMessages()));
    try {
      this.restoreOnMount();
    } catch (error) {
      logError(Error("SessionController.start: restoreOnMount threw", { cause: error }));
    }
    try {
      this.rearmArtifactLiveOnMount();
    } catch (error) {
      logError(Error("SessionController.start: rearmArtifactLiveOnMount threw", { cause: error }));
    }
    this.onInit().catch(logError);
    let start = this._sandbox.start();
    if ((h.push(start.stop), start.refused)) return;
    let of = mWn.of(session);
    if (
      (of.registerSetter((He) => setToolPermissionContextAndNotify(store.setState, He)),
      h.push(() => of.unregisterSetter()),
      h.push(this.turn.watchLaunchPrompt()),
      noteFirstFullscreenFrame(),
      commitGate(session),
      setJitPolicyAfterStartup(),
      useArtifactWatchStartup({
        initialMessages: this.initialMessages,
        transcript: transcript,
        store: store,
        storageV5: storageV5,
        addNotification: (He) => this._requireHost().addNotification(He),
        artifactMountGate: this.artifactMountGate,
      }),
      Qae !== null)
    )
      try {
        h.push(
          Qae.startArtifactsMcpEntryWatch({
            session: session,
            store: store,
            scope: this.scope,
            storageV5: storageV5,
            credentials: this.credentials,
          }),
        );
      } catch (error) {
        logError(Error("SessionController.start: Artifacts MCP entry watch threw", { cause: error }));
      }
    if ((h.push(this._startUnattendedMonitoringWatch()), !this.runsNoModelTurn))
      h.push(
        WakeRouter({
          clock: this._clock,
          store: store,
          queue: this.messageQueue,
          taskRegistry: this.taskRegistry,
          dispatchWake: (He, We, ze, Xe, rt, kt, At, It, Ot) =>
            resumeAgentBackground({
              agentId: He,
              prompt: We,
              promptToolsUsed: Ot,
              resultsOnly: Xe,
              onDeliveryCommitted: ze,
              promptOrigin: rt,
              promptNoticeLengths: kt,
              promptNoticeOwn: At,
              promptNoticeRunIds: It,
              toolUseContext: this._buildIdleToolUseContext(),
              liveTranscript: this._liveTranscript(),
              canUseTool: this._requireHost().canUseTool,
            }),
        }),
      );
    if (
      (h.push(getTaskRunState().taskEvicted.subscribe(this._spinnerStore.evict)),
      h.push(h0e.subscribe(this._spinnerStore.applyEvent)),
      !this.runsNoModelTurn)
    )
      h.push(
        resumeStrandedAgent({
          taskRegistry: this.taskRegistry,
          getToolUseContext: () => this._buildIdleToolUseContext(),
          liveTranscript: this._liveTranscript(),
          getCanUseTool: () => this._requireHost().canUseTool,
          addNotification: (He) => this._requireHost().addNotification(He),
        }),
      );
    let of_2 = dWt.of(session);
    ((of_2.host = this.#d),
      h.push(() => {
        if (of_2.host === this.#d) of_2.host = null;
      }));
  }
  _startSiblingLoginWatch(h) {
    if (!this._siblingLoginWatchEnabled()) return;
    h.push(
      subscribeOAuthCredentialsChangedOnDisk(this.session.host, () => {
        if (!this._siblingLoginWatchEnabled()) return;
        this._adoptSiblingLogin().catch(logError);
      }),
    );
    let x = yje();
    h.push(
      subscribeGlobalConfigInstalled(() => {
        try {
          let D = yje();
          if (D === x) return;
          if (((x = D), !this._siblingLoginWatchEnabled())) return;
        } catch (error) {
          logForDebugging(`sibling-login watch: the account-entry listener failed: ${errorMessage(error)}`, {
            level: "error",
          });
          return;
        }
        (this._cancelSiblingLoginCheck?.(), this._scheduleSiblingLoginCheck(0));
      }),
      () => this._cancelSiblingLoginCheck?.(),
    );
  }
  _siblingLoginWatchEnabled() {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_streamed_thimble", !0);
  }
  _scheduleSiblingLoginCheck(h) {
    let x = eHt[h];
    if (x === void 0) return;
    this._cancelSiblingLoginCheck = this._clock.setTimeout(() => {
      if (
        ((this._cancelSiblingLoginCheck = void 0),
        this._disposed || !this.scope.apiKeyVerification.showsLoginNotice())
      )
        return;
      (checkOAuthCredentialsChangedOnDisk(this.session.host, this.credentials).catch(logError),
        this._scheduleSiblingLoginCheck(h + 1));
    }, x);
  }
  async _adoptSiblingLogin() {
    let { session: session, scope: scope, storageV5: storageV5, credentials: credentials } = this;
    if (
      !(await scope.apiKeyVerification.recheckAfterCredentialsChange({
        host: session.host,
        credentials: credentials,
        storageV5: storageV5,
      })) ||
      this._disposed
    )
      return;
    (updateGroveSettings_2.cache?.clear?.(),
      getGroveNoticeConfig.cache?.clear?.(),
      resetUserData(),
      refreshGrowthBookAfterAuthChange());
    let ke;
    try {
      ke = await refreshRemoteManagedSettings(showStandaloneSecurityDialog, storageV5, credentials);
    } catch (error) {
      throw (logFeatureBad("auth_sibling_login_adopt", "managed_settings_refresh_threw"), error);
    }
    if (this._disposed) return;
    if (!ke) {
      (logForDebugging(
        "sibling-login watch: the managed-settings refresh for the adopted login did not complete; claude.ai connectors and the other login-dependent surfaces stay as they were until /login or a restart",
        { level: "warn" },
      ),
        logFeatureSad("auth_sibling_login_adopt", "managed_settings_refresh_incomplete"));
      return;
    }
    (KV.of(session).loginCompleted(), logFeatureOk("auth_sibling_login_adopt"));
  }
  _startUnattendedMonitoringWatch() {
    if (!isBgSession()) return () => {};
    let { store: store, taskRegistry: taskRegistry, storageV5: storageV5 } = this,
      L = () => {};
    {
      let Re = oAe();
      L = HUs(() => {
        let Be = oAe();
        if (Be === Re) return;
        if (((Re = Be), Be)) this.discloseUnattendedActivity();
      });
    }
    let ee = count(Object.values(store.getState().tasks), isCarriedFrameLiveWatch),
      ke = createDependencyWatcher(
        [store],
        () => [count(Object.values(store.getState().tasks), isCarriedFrameLiveWatch)],
        (Re) => {
          if (Re === ee) return;
          ((ee = Re), syncLiveInFlightSnapshot(summarizeBackgroundWork(taskRegistry.all()), storageV5));
        },
      );
    return () => {
      (L(), ke());
    };
  }
  _startFeeds(h) {
    let { store: store, transcript: transcript, messageQueue: messageQueue } = this;
    (h.push(
      HeldPeerMessages({
        clock: this._clock,
        store: store,
        transcript: transcript,
        requestDialog: this.scope.requestDialog,
        visibleDialog: createAutoDialogSelector(this.dialogStore, bM(this.session)),
      }),
    ),
      h.push(
        startCrossSessionHoldReceipt({ clock: this._clock, transcript: transcript, queue: messageQueue }),
      ),
      h.push(registerReplyYieldNotices({ transcript: transcript })),
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
            transcript.apply({ type: "append", messages: [createSystemMessage(Re, "notice")] });
          },
        }),
      ),
      h.push(mje({ store: store, dialogStore: this.dialogStore, queue: messageQueue })),
      h.push(
        ci().ingress.messageDropped.subscribe((ee) =>
          transcript.apply({
            type: "append",
            messages: [createSystemMessage(commandListDisplayTruncated(ee), "warning")],
          }),
        ),
      ));
  }
  _raiseSessionStart() {
    startSessionHooks({
      loaded: loadPluginHooks(this.storageV5, this.credentials),
      surface: "terminal",
      isInteractive: !0,
    });
  }
  _releaseHookSet(h, x) {
    if (this._pendingHookSet !== h) return;
    if (((this._pendingHookSet = null), this._publish({ headHooksPending: !1 }), x)) {
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
          this._releaseHookSet(h, !1);
          return;
        }
        this._landingHookSet = h;
        let L = () => {
          if (this._landingHookSet === h) this._landingHookSet = null;
          this._releaseHookSet(h, !1);
        };
        try {
          let ee = 0,
            ke = appendRowsWithHooks(this.transcript.conversation, x, {
              keep: (Re) => {
                if (this._landingHookSet !== h) return;
                let Be = ee;
                ((ee += Re.length), this.transcript.replace((He) => He.toSpliced(Be, 0, ...Re)));
              },
            });
          if (ke instanceof Promise)
            return ke.then(L, (Re) => {
              if (!isAbortError(Re)) logError(Re);
              L();
            });
        } catch (error) {
          if (!isAbortError(error)) logError(error);
        }
        L();
        return;
      }
      case "tail": {
        if ((this._releaseHookSet(h, !1), !D)) return;
        let snapshot = this.transcript.getSnapshot(),
          ee = dedupeSessionStartRows(snapshot, x);
        if (ee.length === 0) return;
        let ke = appendRowsWithHooks(this.transcript.conversation, ee, {
          keep: (Re) => {
            let snapshot = this.transcript.getSnapshot();
            if (this.isAsRestored(snapshot)) this._restoredStamp = Gae([...snapshot, ...Re]);
            this.transcript.keep({ type: "append", messages: [...Re] });
          },
        });
        if (ke instanceof Promise)
          ke.catch((Re) => {
            if (!isAbortError(Re)) logError(Re);
          });
        return;
      }
    }
  }
  _subscribeHookSet(h) {
    h.run.promise.then(
      (x) => this._settleHookSet(h, x),
      () => this._releaseHookSet(h, !1),
    );
  }
  awaitPendingHooks = () => {
    let _pendingHookSet = this._pendingHookSet;
    if (!_pendingHookSet) return;
    if (this.session.id !== _pendingHookSet.sessionId) {
      this._releaseHookSet(_pendingHookSet, !0);
      return;
    }
    return _pendingHookSet.run.promise.then((x) => this._settleHookSet(_pendingHookSet, x));
  };
  deferHookMessages = (h) => {
    this.releasePendingHookMessages();
    let x = { run: startHookRun("head", h), sessionId: this.session.id };
    if (
      ((this._pendingHookSet = x),
      this._publish({ headHooksPending: !0 }),
      this._subscribeHookSet(x),
      this._disposed)
    )
      this._releaseHookSet(x, !0);
  };
  releasePendingHookMessages = () => {
    let _pendingHookSet = this._pendingHookSet;
    if (_pendingHookSet) this._releaseHookSet(_pendingHookSet, !0);
  };
  get headHooksPending() {
    return this._pendingHookSet?.run.placement === "head";
  }
  isAsRestored(h) {
    return this._restoredStamp === Gae(h);
  }
  restoreOnMount() {
    let {
      initialMessages: initialMessages,
      session: session,
      taskRegistry: taskRegistry,
      storageV5: storageV5,
      credentials: credentials,
      store: store,
      scope: scope,
      messageQueue: messageQueue,
    } = this;
    if (initialMessages && initialMessages.length > 0) {
      if (
        (scope.reseatIsolationLatch(
          getCurrentSessionIsolationLatch() ??
            findIsolationLatchFromHistory(
              initialMessages,
              scope.combinedInitialTools,
              void 0,
              void 0,
              session,
            ),
        ),
        this.restoreReadFileState(initialMessages, xo(session).originalCwd, !1, this.conversationOrigin),
        restoreRemoteAgentTasks({
          abortController: new AbortController(),
          taskRegistry: taskRegistry,
          storageV5: storageV5,
          credentials: credentials,
        }),
        isMcpTasksEnabled())
      )
        loadMcpTaskModule({
          sessionId: getSessionId(),
          conversation: [...initialMessages],
          taskRegistry: taskRegistry,
          getMcpClients: () => store.getState().mcp.clients,
          requestDialog: this.scope.requestDialog,
          storageV5: storageV5,
          credentials: credentials,
        });
      if (isActingAsBgJob()) {
        let He = getBgJobDir(),
          We = readAndConsumeAdoptJson(He, {
            waitMs: isBgSession() || !getBgTakeover()?.expectHandoff ? 0 : TAKEOVER_ADOPT_WAIT_MS,
            extraShellOutputRoot: (() => {
              let kt = getBgTakeover();
              if (!kt?.adoptShellOutputRoot) {
                let last = loe.of(session.host).last;
                return last ? nkn(normalizeFilePath(last.worktreePath)) : void 0;
              }
              return kt.adoptShellOutputReadRoot
                ? [kt.adoptShellOutputRoot, kt.adoptShellOutputReadRoot]
                : kt.adoptShellOutputRoot;
            })(),
          }),
          ze = Symbol("adopt-consume");
        ((this._adoptedPrefill = We.then((kt) => kt?.prefill).catch(() => {
          return;
        })),
          (this._adoptedFrameLive = We.then((kt) => {
            if (kt?.frameLive === void 0) return;
            if (He !== void 0) recordUnresumedFrameLive(He, kt.frameLive, ze);
            return { entries: kt.frameLive, jobDir: He, owner: ze };
          }).catch(() => {
            return;
          })));
        let Xe = new Set(),
          rt = new Set();
        (async () => {
          try {
            let kt = await We;
            if (kt) {
              let At = await reconcileCarriedAgents(
                kt.agents ?? [],
                { initialMessages: initialMessages, taskRegistry: taskRegistry, storageV5: storageV5 },
                messageQueue,
              );
              Xe = At.reported;
              let { registered: registered } = At,
                Ot = new Set(registered.map((Dt) => Dt.agentId));
              for (let shell of kt.shells) {
                if (shell.agentId !== void 0 && !Ot.has(shell.agentId)) {
                  (killOrphanedAdoptedShell(shell),
                    logFeatureSad("task_local_agent", "adopt_owner_skipped", {
                      skipped_kind: fromEnum("shell"),
                    }),
                    logForDebugging(
                      `[adopt] shell ${shell.taskId} skipped: owner ${shell.agentId} not registered`,
                      { level: "warn" },
                    ));
                  continue;
                }
                try {
                  (await initTaskOutputAsSymlink(shell.taskId, shell.outputPath, (Lt) =>
                    logEvent("tengu_adopt_link", { kind: lit_2("shell"), method: fromEnum(Lt) }),
                  ),
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
                    ));
                } catch (error) {
                  logForDebugging(`[adopt] shell ${shell.taskId} skipped: ${error}`, { level: "warn" });
                }
              }
              adoptCron(
                kt.cron.filter((Dt) => {
                  if (Dt.agentId !== void 0 && !Ot.has(Dt.agentId))
                    return (
                      logFeatureSad("task_local_agent", "adopt_owner_skipped", {
                        skipped_kind: fromEnum("cron"),
                      }),
                      !1
                    );
                  return !0;
                }),
                kt.loopWakeFires,
              );
              let Et = [];
              for (let Dt of kt.workflows ?? []) {
                let Lt;
                try {
                  ((Lt = { ...Dt, scriptPath: resolveAdoptedScriptPath(Dt.scriptPath) }),
                    await linkAdoptedWorkflowDir(Lt),
                    registerAdoptedWorkflowTask(Lt, taskRegistry),
                    Et.push(Lt),
                    rt.add(Lt.taskId));
                } catch (error) {
                  if (Lt === void 0) {
                    let { scriptPath: scriptPath, ...io } = Dt;
                    (emitAdoptWorkflowFailed(io, "adopt scriptPath rejected", messageQueue),
                      logFeatureSad("task_local_workflow", "adopt_scriptpath_rejected"),
                      logForDebugging(`[adopt] workflow ${Dt.taskId} skipped: scriptPath rejected`, {
                        level: "warn",
                      }));
                  } else
                    (emitAdoptWorkflowFailed(Lt, "transcript link failed", messageQueue),
                      logFeatureSad("task_local_workflow", "adopt_link_failed"),
                      logForDebugging(`[adopt] workflow ${Dt.taskId} skipped: ${error}`, { level: "warn" }));
                }
              }
              if (He !== void 0) recordUnresumedAdopt(He, registered, Et, ze);
              this.resumeAdoptedAgents(registered, Et, He, ze);
            }
          } finally {
            await formatOrphanSummary(
              initialMessages,
              taskRegistry,
              (kt) => this.resumeOrphanedAgents(kt, He),
              Xe,
              storageV5,
              void 0,
              () => ({ kind: "runningPool", tools: this.scope.computeTools() }),
              rt,
            );
          }
        })();
      } else if (!this.runsNoModelTurn)
        formatOrphanSummary(initialMessages, taskRegistry, void 0, void 0, storageV5, void 0, () => ({
          kind: "runningPool",
          tools: this.scope.computeTools(),
        }));
      if (!this.disableQuery && store.getState().initialMessage === null)
        this.maybePromptStaleResume(initialMessages, d1n());
    }
  }
  resumeAdoptedAgents(h, x, D, L) {
    let { store: store, taskRegistry: taskRegistry, storageV5: storageV5, messageQueue: messageQueue } = this;
    waitForStoreState(store, mcpSettledForAdopt, { timeoutMs: STALE_THRESHOLD_MS / 4 })
      .then(() => {
        if (!isActingAsBgJob() || getBgJobDir() !== D) {
          logForDebugging(
            "[adopt] deferred resume skipped: takeover released or replaced during MCP-settle wait",
          );
          return;
        }
        if (D !== void 0 && (h.length > 0 || x.length > 0)) {
          let Xe = takeUnresumedAdopt(D, L);
          if (Xe.agents.length === 0 && Xe.workflows.length === 0) {
            logForDebugging(
              "[adopt] deferred resume skipped: parked entries already taken by the exit handoff or a later consume",
            );
            return;
          }
        }
        let { canUseTool: canUseTool } = this._requireHost(),
          { toolState: toolState } = this._buildIdleToolUseContext(),
          mode = store.getState().toolPermissionContext.mode;
        for (let Xe of x)
          resumeCarriedWorkflow(
            Xe,
            { taskRegistry: taskRegistry, toolState: toolState, permissionMode: mode },
            messageQueue,
          );
        for (let Xe of h)
          resumeAgentBackground({
            agentId: Xe.agentId,
            prompt: Xe.description ?? "(resumed agent)",
            continueInterruptedTurn: !0,
            toolUseContext: this._buildIdleToolUseContext(),
            canUseTool: canUseTool,
          })
            .then((rt) => {
              if (isResumeDenied(rt)) {
                try {
                  (logFeatureSad("task_local_agent", "adopt_resume_denied"),
                    emitAdoptAgentDenied(Xe, rt.deniedByPlugin, taskRegistry, messageQueue));
                } catch (error) {
                  logError(error);
                }
                return;
              }
              if (!rt.alreadyCompleted)
                syncLiveInFlightSnapshot(summarizeBackgroundWork(taskRegistry.all()), storageV5);
            })
            .catch((rt) => {
              if (
                (taskRegistry.remove(Xe.agentId),
                emitAdoptAgentFailed(Xe, "resume failed", taskRegistry, messageQueue),
                logFeatureSad("task_local_agent", "adopt_resume_failed"),
                rt instanceof ResumeAgentStateError)
              ) {
                logForDebugging(`[adopt] agent ${Xe.agentId} resume skipped: ${rt.message}`, {
                  level: "warn",
                });
                return;
              }
              logError(rt);
            });
      })
      .catch(logError);
  }
  resumeOrphanedAgents(h, x) {
    let { store: store, taskRegistry: taskRegistry, storageV5: storageV5 } = this;
    waitForStoreState(store, mcpSettledForAdopt, { timeoutMs: STALE_THRESHOLD_MS / 4 })
      .then(() => {
        if (!isActingAsBgJob() || getBgJobDir() !== x) {
          logForDebugging(
            "[orphan-resume] deferred auto-resume skipped: takeover released or replaced during MCP-settle wait",
          );
          return;
        }
        let { canUseTool: canUseTool } = this._requireHost();
        for (let Re of h)
          resumeAgentBackground({
            agentId: Re.agentId,
            prompt: Re.description,
            continueInterruptedTurn: !0,
            toolUseContext: this._buildIdleToolUseContext(),
            canUseTool: canUseTool,
            isWebFetchLaunch: Re.isWebFetchLaunch,
          })
            .then((Be) => {
              if (isResumeDenied(Be)) {
                try {
                  (logFeatureSad("task_local_agent", "orphan_auto_resume_denied"),
                    formatAgentRestartFailedNotice(this._orphanAsThisSessionSeesIt(Re), Be.deniedByPlugin));
                } catch (error) {
                  logError(error);
                }
                return;
              }
              if (Be.alreadyCompleted) {
                formatOrphanedAgentNotification(
                  { ...this._orphanAsThisSessionSeesIt(Re), outputFile: Re.outputFile ?? Be.outputFile },
                  taskRegistry,
                );
                return;
              }
              (formatAgentRestartedNotice(Re),
                syncLiveInFlightSnapshot(summarizeBackgroundWork(taskRegistry.all()), storageV5));
            })
            .catch((Be) => {
              if (
                (logFeatureSad("task_local_agent", "orphan_auto_resume_failed"),
                formatAgentRestartFailedNotice(this._orphanAsThisSessionSeesIt(Re), errorMessage(Be)),
                Be instanceof ResumeAgentStateError)
              ) {
                logForDebugging(`[orphan-resume] agent ${Re.agentId} auto-resume failed: ${Be.message}`, {
                  level: "warn",
                });
                return;
              }
              logError(Be);
            });
      })
      .catch(logError);
  }
  _orphanAsThisSessionSeesIt(h) {
    try {
      return withResumeCapabilities(h, { kind: "runningPool", tools: this.scope.computeTools() });
    } catch (error) {
      return (logError(Error("resumeOrphanedAgents: reading the tool pool threw", { cause: error })), h);
    }
  }
  artifactMountGate = async () => {
    await initializeGrowthBook().catch(() => null);
    let toolUseContext = this.turn.buildToolUseContext(
        this.initialMessages ?? [],
        [],
        new AbortController(),
        this._requireHost().mainLoopModel,
      ),
      x = await isArtifactFetchEnabled(
        toolUseContext.options.tools,
        this.store.getState().toolPermissionContext,
        { promptless: !0 },
      );
    return { toolUseContext: toolUseContext, allowed: x };
  };
  discloseUnattendedActivity = (h) => {
    let { taskRegistry: taskRegistry } = this,
      D = drainUnattendedReplies();
    if (D.total === 0) return;
    let filtered = Object.values(taskRegistry.all()).filter(isCarriedFrameLiveWatch),
      ee = claudeAiEnvironment(),
      mapped = [...D.bySlug.keys()]
        .map((We) => ({ slug: We, url: artifactViewerUrlFor({ slug: We, env: ee }) }))
        .filter(({ slug: slug, url: url }) => parseArtifactUrl(url)?.slug === slug)
        .map(({ url: url }) => url),
      Re = D.bySlug.size === 1 && mapped.length === 1 ? ` on ${mapped[0]}` : "",
      Be = getShortcutDisplay("chat:killAgents", "Chat", "ctrl+x ctrl+k"),
      He =
        filtered.length > 0 || h?.willRearm === !0 || getAutoReactSlugs().size > 0
          ? ` To turn off automatic replies, stop the Artifact comment monitor task, or press ${Be} twice to turn them off for this session.`
          : "";
    this.transcript.apply({
      type: "append",
      messages: [formatAutoReplyNotice(D.total, { where: Re, stop: He })],
    });
  };
  rearmArtifactLiveOnMount() {
    let { store: store, taskRegistry: taskRegistry, storageV5: storageV5 } = this;
    rearmOnResumeSafe(
      {
        initialMessages: this.initialMessages,
        startupWatchSlug: peekPendingWatchArtifact()?.slug,
        storageV5: storageV5,
      },
      {
        publishContext: isBgSession() ? "bg_session" : "interactive",
        ui: "repl",
        shortNotices: tE,
        emit: (L) => this.transcript.apply({ type: "append", messages: [...L] }),
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
        mayRequestTakeover: () => !0,
        jobHolderVerdicts: probeAdoptedJob,
        carried: {
          adopted: this._adoptedFrameLive?.then((L) => {
            if (L === void 0) return;
            let { entries: entries, jobDir: jobDir, owner: owner } = L;
            return {
              entries: entries,
              park:
                jobDir === void 0
                  ? void 0
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
    let { transcript: transcript, scope: scope, store: store, turn: turn } = this,
      snapshot = transcript.getSnapshot(),
      Be = kje(snapshot, h);
    if (Be === -1) return;
    let sliced = snapshot.slice(0, Be),
      sliced_2 = snapshot.slice(Be);
    (lse(getStickyBetas(), "rewind"), cancelOnConversationReset(x));
    let ze = decideRefusalFallbackRestore({
      keptMessages: sliced,
      slicedMessages: sliced_2,
      currentOverride: getMainLoopModelOverride(),
      latchActive: hasRefusalFallbackOccurred() || hasRefusalFallbackHeaderArmed(),
      firstParty: usesFirstPartyModelIds(),
      modelBeforeSwap: getActiveModelFallback()?.previousModel,
      initialModel: getInitialMainLoopModel(),
    });
    try {
      scope.evictRewoundFileTracking(collectRewoundFileTrackingPaths(sliced_2));
    } catch (error) {
      logError(error);
    }
    if (x !== "auto_restore_cancel") i6(scope.memorySelector);
    if (
      (logEvent("tengu_conversation_rewind", {
        preRewindMessageCount: snapshot.length,
        postRewindMessageCount: Be,
        messagesRemoved: snapshot.length - Be,
        rewindToMessageIndex: Be,
        source: fromEnum(x),
      }),
      notePendingConversationEdit("rewind"),
      transcript.cut(),
      transcript.replace(sliced),
      !this.runsNoModelTurn)
    )
      try {
        let It = cronCarryAttachment(sliced, sliced_2);
        if (It !== null) transcript.apply({ type: "append", messages: [It] }, "held");
      } catch (error) {
        logError(error);
      }
    try {
      let It = threadAskMarkerFor(sliced);
      if (It !== null) transcript.apply({ type: "append", messages: [createAttachmentMessage(It)] }, "held");
    } catch (error) {
      logError(error);
    }
    if (
      (setLastMainThreadContextTokens(contextTokensOf(sliced)),
      setLastCacheSafeForkMessages(sliced),
      this.bumpConversationId(),
      x === "message_selector")
    )
      this.#r.repin(!0, "rewind");
    if (
      (this._resetTurnEventTail(),
      turn.resetForConversation({ kind: "rewound" }),
      this._discardDetachedToolCallsOutside(sliced),
      clearPendingContextCompacted(),
      ze)
    ) {
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
        ...(ze.model.action === "restore" && { restored_from: fromEnum(ze.model.restoredFrom) }),
        latch_cleared: ze.clearLatch,
        banners_sliced: ze.bannersSliced,
        model_scope: fromEnum(classifyFallbackOrigin(ze.lastSlicedFallbackModel)),
        source: fromEnum(x),
      });
    }
    let Xe = ze && ze.model.action === "restore" ? { mainLoopModel: ze.model.value } : void 0,
      fastMode = store.getState().fastMode,
      kt = Xe && isFastModeEnabled() ? isFastModeActive(Xe.mainLoopModel, fastMode) : void 0,
      At =
        x === "auto_restore_cancel"
          ? null
          : rebuildArtifactCarryAfterRewind(
              sliced,
              isResumeFrameSeedEligible() && this.conversationOrigin === "local",
            );
    if (
      (store.setState((It) => ({
        ...(x === "auto_restore_cancel" ? It : rehydrateSession(sliced, It, { restoreAgentNames: !1 })),
        ...At,
        ...Xe,
        ...(kt !== void 0 && { fastMode: kt }),
        toolPermissionContext:
          h.permissionMode && It.toolPermissionContext.mode !== h.permissionMode
            ? { ...It.toolPermissionContext, mode: h.permissionMode }
            : It.toolPermissionContext,
        promptSuggestion: { status: "empty" },
        ...(use(sliced) === void 0 && { cacheMissAckedAtOutputTokens: getTotalOutputTokens() }),
      })),
      kt !== void 0)
    )
      reportFastModeToggle(fastMode, kt);
    logFeatureOk("repl_rewind_conversation");
  }
  restoreMessageSync = (h, x, D = []) => {
    let L = D[0];
    if (L === void 0) {
      (this.rewindConversationTo(h, x), this.restoreDraftFrom(h));
      return;
    }
    let ee = [];
    try {
      for (let Re of [...D, h]) {
        let Be = { value: "", pastedContents: {} };
        (this.restoreDraftInto(Re, {
          replaceValue: (He) => {
            Be.value = He;
          },
          setMode: () => {},
          setPastedContents: (He) => {
            Be.pastedContents = He;
          },
        }),
          ee.push(Be));
      }
    } catch (error) {
      (logError(error), this.rewindConversationTo(h, x), this.restoreDraftFrom(h));
      return;
    }
    (this.rewindConversationTo(L, x),
      this.draft.replaceValue(ee.reduce((Re, Be) => oO(Re, Be.value), "")),
      this.draft.setMode("prompt"));
    let ke = {};
    for (let Re of ee) ke = mergeTurnTags(ke, Object.values(Re.pastedContents));
    if (Object.keys(ke).length > 0) this.draft.setPastedContents(ke);
  };
  restoreDraftFrom = (h) => {
    this.restoreDraftInto(h, this.draft);
  };
  restoreDraftInto(h, x) {
    let { _setAppState: _setAppState } = this;
    this.#s.restoreIdeSelectionConsumedBy(h.uuid);
    let L = getModeFromInput(h),
      ee = L ? (L.mode === "prompt" ? rSo(L.text) : { text: L.text, pastedContents: {} }) : void 0;
    if (L && ee) {
      if ((x.replaceValue(ee.text), x.setMode(L.mode), Object.keys(ee.pastedContents).length > 0))
        x.setPastedContents(ee.pastedContents);
    }
    if (Array.isArray(h.message.content)) {
      let filtered = h.message.content.filter((Re) => bl(Re) && Re.type === "image");
      if (filtered.length > 0) {
        let { stamped: stamped, manufactured: manufactured } = splitStampedImages(filtered, h.imagePasteIds),
          He = renumberPastedContents({
            display: ee?.text ?? "",
            pastedContents: manufactured,
            allowCurrentEpochSkip: !1,
          }),
          We = renumberPastedContents({
            display: He.display,
            pastedContents: stamped,
            allowCurrentEpochSkip: !0,
          }),
          ze = { ...He.pastedContents, ...We.pastedContents };
        if (ee && We.display !== ee.text) x.replaceValue(We.display);
        let Xe = BH(_setAppState, "storedImagePaths");
        for (let rt of Object.values(ze))
          if (stamped[rt.id] === void 0 && manufactured[rt.id] === void 0)
            (recordImagePath(rt, Xe), cLe(rt, Xe));
        x.setPastedContents({ ...ee?.pastedContents, ...ze });
      }
    }
  }
  handleRestoreMessage = async (h, x) => {
    setImmediate((D, L, ee) => D(L, ee), this.restoreMessageSync, h, x);
  };
  handleSummarize = async (h, x, D = "from") => {
    let { transcript: transcript, turn: turn, _setAppState: _setAppState, draft: draft } = this,
      { mainLoopModel: mainLoopModel, addNotification: addNotification } = this._requireHost(),
      replace = transcript.replace,
      ze = Us(transcript.getSnapshot()),
      Xe = kje(ze, h);
    if (Xe === -1) {
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
    let rt = createAbortController(),
      toolUseContext = turn.buildToolUseContext(ze, [], rt, mainLoopModel),
      At = await buildCompactCacheSafeParams({
        toolUseContext: toolUseContext,
        forkContextMessages: ze,
        mainThreadAgentDefinition: this.scope.mainThreadAgentDefinition,
      }),
      It = await partialCompactConversation(ze, Xe, toolUseContext, At, {
        userFeedback: x,
        direction: D,
        onNotification: addNotification,
        onResponseLength: turn.stream.onResponseLength,
      }),
      Ot = buildPostCompactMessages_2(It, D);
    if (this.#n === "fullscreen" && D === "from")
      replace((Dt) => {
        let Lt = findMessageIndexByUuid(Dt, h.uuid);
        return [...Dt.slice(0, Lt === -1 ? 0 : Lt), ...Ot];
      });
    else (replace(Ot), this.bumpConversationId());
    if (
      (_setAppState((Dt) => pruneDisplayedContent(Dt, transcript.getSnapshot())),
      setLastCacheSafeForkMessages(Ot),
      cleanupAfterCompaction(
        toolUseContext.session,
        toolUseContext.options.querySource,
        _setAppState,
        void 0,
        void 0,
        toolUseContext.storageV5,
      ),
      D === "from")
    ) {
      let Dt = getModeFromInput(h);
      if (Dt) {
        let Lt = Dt.mode === "prompt" ? rSo(Dt.text) : { text: Dt.text, pastedContents: {} };
        if ((draft.replaceValue(Lt.text), draft.setMode(Dt.mode), Object.keys(Lt.pastedContents).length > 0))
          draft.setPastedContents(Lt.pastedContents);
        this.#s.restoreIdeSelectionConsumedBy(h.uuid);
      }
    }
    let Et = Dho(
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
    if (wt()) return Error("a thin client's conversation lives on the remote session; compact it there");
    if (this.turn.getSnapshot().isExternalLoading)
      return Error("an external turn is driving the conversation; it compacts between turns");
    return null;
  }
  async #a() {
    try {
      let {
          isHeldInAnotherPidDomain: isHeldInAnotherPidDomain,
          listRegisteredSessionRecords: listRegisteredSessionRecords,
        } = await import("./chunk-ewxn4535.js"),
        D = await listRegisteredSessionRecords(),
        L = getSessionId();
      if (await isHeldInAnotherPidDomain(D, L)) return !0;
      let { verdict: verdict } = await findLiveReplyHolder({
        records: D,
        sessionId: L,
        selfPid: process.pid,
        isRunning: isProcessRunning,
        isSameProcess: provenSameProcessAsync,
      });
      return verdict !== "none";
    } catch {
      return (logFeatureSad("compact_idle", "holder_probe_failed"), !0);
    }
  }
  async #l() {
    if (isTranscriptPersistenceDisabled()) return null;
    let h = await readTranscriptTailForTip(getSessionId(), this.storageV5),
      x = h === null ? void 0 : extractLastSyncedEventUuid(h.content);
    if (x === void 0) return "transcript_unreadable";
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
      this.compactConversation({ instructions: "", apiAttemptsLeft: { count: 1 } }).then(
        (h) => {
          if (h.skip !== void 0) return null;
          return (
            this.transcript.apply({
              type: "append",
              messages: [createSystemMessage(COMPACTED_WHILE_IDLE_TEXT, "notice")],
            }),
            { tokensBefore: h.tokensBefore, tokensAfter: h.tokensAfter }
          );
        },
        (h) => {
          if (hasExactErrorMessage(h, ERROR_MESSAGE_NOT_ENOUGH_MESSAGES)) return null;
          if (!(
            h instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS ||
            isAbortError(h) ||
            (h instanceof Error && h.cause !== void 0)
          ))
            logError(h);
          throw h;
        },
      ),
  };
  compactConversation = async ({
    instructions: instructions,
    origin: origin,
    apiAttemptsLeft: apiAttemptsLeft,
  }) => {
    let { transcript: transcript, turn: turn, scope: scope, _setAppState: _setAppState } = this,
      { mainLoopModel: mainLoopModel, addNotification: addNotification } = this._requireHost(),
      We = this.#i();
    if (We !== null) throw We;
    let ze = turn.guard.isActive ? null : turn.guard.tryStart();
    if (ze === null) throw Error("a turn is in flight; the conversation compacts between turns");
    let Xe = createAbortController();
    turn.setAbortController(Xe);
    try {
      let snapshot = transcript.getSnapshot(),
        toolUseContext = turn.buildToolUseContext(Us(snapshot), [], Xe, mainLoopModel);
      toolUseContext.compactionApiAttemptsLeft = apiAttemptsLeft;
      let { compactManually: compactManually } = await compactCommand.load(),
        It = await compactManually(toolUseContext, {
          customInstructions: instructions,
          mainThreadAgentDefinition: scope.mainThreadAgentDefinition,
          trigger: origin === void 0 ? "auto" : "plugin",
          origin: origin,
        });
      if (It.type === "skipped") return { skip: It.reason };
      if (It.type !== "compact")
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          It.type === "text" ? It.value : "the compaction produced no summary",
          "plugin compaction refused",
        );
      if (turn.guard.generation !== ze && turn.guard.isActive)
        throw Error("a newer turn began before the compaction could be applied");
      let Et = buildPostCompactMessages({
          ...It.compactionResult,
          messagesToKeep: It.compactionResult.messagesToKeep.map(getTokenCountFromUsage_4),
        }),
        Dt = new Set(snapshot.map((io) => io.uuid)),
        Lt = new Set(Et.map((io) => io.uuid)),
        oo = (io) => io.filter((so) => !Dt.has(so.uuid) && !Lt.has(so.uuid));
      if (this.#n === "fullscreen")
        transcript.replace((io) => [
          ...io.filter((so) => Dt.has(so.uuid) && !Lt.has(so.uuid)),
          ...Et,
          ...oo(io),
        ]);
      else (transcript.replace((io) => [...Et, ...oo(io)]), this.bumpConversationId());
      (_setAppState((io) => pruneDisplayedContent(io, transcript.getSnapshot())),
        setLastCacheSafeForkMessages(Us(transcript.getSnapshot())));
      let Xt = Dho(
        transcript.getSnapshot(),
        It.compactionResult.boundaryMarker.uuid,
        getShortcutDisplay("app:toggleTranscript", "Global", "ctrl+o"),
      );
      return (
        addNotification({
          key: "summarize-ctrl-o-hint",
          kind: "contextual",
          text: `Conversation compacted${Xt}`,
          priority: "medium",
          timeoutMs: 8000,
        }),
        It.result
      );
    } finally {
      if ((turn.guard.end(ze), turn.getSnapshot().abortController === Xe)) turn.setAbortController(null);
    }
  };
  async onInit() {
    let {
      session: session,
      scope: scope,
      engine: engine,
      storageV5: storageV5,
      credentials: credentials,
    } = this;
    scope.apiKeyVerification.verify({ credentials: credentials, storageV5: storageV5 });
    let ke = isClaudeMdLoadingDisabled()
      ? []
      : await getMemoryFilesCached(session, !1, storageV5, credentials);
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
        .filter((Be) => !oEt(Be.path))
        .map(async (Be) => {
          let He = shouldInjectMemoryFile(Be),
            We = await getReadTimestamp(Be, He, storageV5);
          return { file: Be, injected: He, seedTs: We };
        }),
    );
    for (let { file: file, injected: injected, seedTs: seedTs } of results)
      (scope.seedMemoryFile(file.path, {
        content: file.contentDiffersFromDisk ? (file.rawContent ?? file.content) : __(file.content),
        timestamp: seedTs,
        offset: void 0,
        limit: void 0,
        isPartialView: file.contentDiffersFromDisk,
        seededFromContext: injected,
        ...(!injected && { contentNotInModelContext: !0 }),
        keepContent: !0,
      }),
        engine.seedReadState(
          file.path,
          seedTs,
          isStorageV5Enabled() && storageV5 !== void 0
            ? file.contentDiffersFromDisk
              ? (file.rawContent ?? file.content)
              : file.content
            : void 0,
        ));
  }
}
//@ chunk-18hwfzwa.js:411777-411834 placement
function wje(h, x) {
  return x !== null && vje(h, pinSessionId(getSessionId())) && isPreviousConversationPointerAllowed();
}
//@ chunk-18hwfzwa.js:411834-411880 placement
function vje(h, x) {
  return !_je(x) && !h.some(sHt);
}
//@ chunk-18hwfzwa.js:411880-411926 placement
function _je(h) {
  return isRemoteEgressSuppressedFor(h) || bridgeSessionForPulledWindow(h) !== void 0;
}
//@ chunk-18hwfzwa.js:411926-411997 placement
function kje(h, x) {
  let index = h.lastIndexOf(x);
  return index !== -1 ? index : findMessageIndexByUuid(h, x.uuid);
}
//@ chunk-18hwfzwa.js:411997-412092 placement
function sHt(h) {
  return "foreignToBridgeSession" in h && typeof h.foreignToBridgeSession === "string";
}

export { SessionController, oO, restorePromptAfterCancel };
