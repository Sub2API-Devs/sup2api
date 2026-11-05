/**
 * screens/repl/SessionController.ts
 *
 * 2.1.316 新增。REPL 控制器：会话。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (21)
 * attribution: placement 19, layout 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { randomUUID } from "crypto";
import { dirname } from "path";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { logForDebugging, createAttachmentMessage_2 as createAttachmentMessage } from "../../utils/debug.js";
import { stringSchema, objectSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { Text, Box } from "../../ink/components/Text.js";
import {
  isAccountCopyEnabled,
  ownerDiffers,
  getSessionOwner,
  ownStoredLoginOwner,
  rememberKnownAccount,
  accountLabelOfOwner,
  currentAccountLabel,
  currentSessionFileIsFor,
  saveSessionOwner,
  getAgentTranscript,
  isTranscriptPersistenceDisabled,
  getMaterializedSessionFile,
  getTranscriptPathForSession,
  pinSessionId,
  getCurrentSessionDisplayTitle,
  appendToolsUsedEntryBeforeClear,
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
import { logError } from "../../utils/log.js";
import { logEvent } from "../../services/analytics/index.js";
import { createElement } from "../../../vendor/react/cjs/react.production.js";
import { SessionOwnerDialog } from "./copySessionDialog.js";
import { SESSION_OWNER } from "../../components/dialogs/dialogKinds.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import {
  getSessionId,
  getConversationToolsUsed,
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
import { branchAndResume } from "../../commands/branch/branch.js";
import { createSystemMessage, getModeFromInput } from "../../utils/messages.js";
import { isSubagentHistoryEnabled } from "../../components/messages/UserPromptMessage.js";
import { unwrapMidTurnUserMessage } from "../../utils/messages/nonUserMessages.js";
import { unwrapCoordinatorMessage } from "../../utils/crossSessionMessages.js";
import { createDependencyWatcher } from "../../cli/print/rewindStandIn.js";
import { isLocalAgent } from "../../state/teammateViewHelpers.js";
import { identityAgentId2, identityAgentId } from "../../utils/agentId.js";
import { degradeRestoredMessages, clearClassifierContext } from "../../utils/conversationRecovery.js";
import {
  getOauthAccountInfo,
  loginSwitchMemo,
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
import { env } from "../../utils/env.js";
import { useDefaultToNewerModelKey } from "../../utils/newerModelOffer.js";
import { collectToolsUsedBeforeSummary } from "../../utils/messages/untrustedArtifactContent.js";
import { stripIgnorables } from "../../utils/sanitization.js";
import { truncateToWidth } from "../../utils/format.js";
import {
  dropMalformedAttachments,
  deserializeToMessages,
  assertResumeNotRefused,
  dedupeSessionStartRows,
} from "../../utils/transcript/deserialize.js";
import { codeModeAccepted } from "../../utils/codeMode/accepted.js";
import { stripToolUseIdBookkeeping } from "../../utils/transcript/entryTypes.js";
import { noModelPin, recordModelPinSwitch, noopModelPinReset } from "../../utils/sessionModelPin.js";
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
  isGmailAttachmentTool,
} from "../../bootstrap/stateSlices.js";
import { getToolSearchBeta } from "../../utils/betas.js";
import { resetPickerState } from "../../memdir/findRelevantMemories.js";
import { AGENT_TASK_TYPES } from "../../tasks/taskKinds.js";
import { hasCompletedWithFindings } from "../../components/tasks/RemoteSessionProgress.js";
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
import { fromEnum, lit as lit_2 } from "../../services/analytics/safeMetadata.js";
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
import { loginEventCounter } from "../../services/oauth/loginEvents.js";
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
import { isBgSession, isActingAsBgJob, getBgJobDir, getBgTakeover } from "../../utils/concurrentSessions.js";
import {
  canAutoReply,
  subscribeAutoReplyChanges,
  drainUnattendedReplies,
  getAutoReactSlugs,
  formatAutoReplyNotice,
} from "../../services/artifactComments/autoReplyNotices.js";
import { countWhere } from "../../utils/collections.js";
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
import { restorePastedImageContents } from "../../utils/messageQueueManager.js";
import { setSliceField } from "../../state/sliceHelpers.js";
import { recordImagePath, storeImageAndRecord } from "../../utils/imageStore.js";
import { createAbortController } from "../../utils/abortController.js";
import { buildCompactCacheSafeParams } from "../../commands/compact/compact.js";
import {
  partialCompactConversation,
  buildPostCompactMessages_2,
  ERROR_MESSAGE_NOT_ENOUGH_MESSAGES,
  buildPostCompactMessages,
  getTokenCountFromUsage_6,
} from "../../services/compact/compact.js";
import { findMessageIndexByUuid } from "../../cli/queuedCommands.js";
import { pruneDisplayedContent } from "../../cli/print/turnStreaming.js";
import { cleanupAfterCompaction } from "../../services/compact/postCompactCleanup.js";
import { leadingCompactHint } from "../../components/messages/GroupedToolUseContent.js";
import { isRemoteSessionAvailable } from "../../remote/remoteMode.js";
import { compactNonInteractiveCommand } from "../../commands/compact/index.js";
import { isClaudeMdLoadingDisabled } from "../../utils/settings/customizationDisabled.js";
import {
  getMemoryFilesCached,
  isManagedOrVirtualPath,
  shouldInjectMemoryFile,
} from "../../utils/claudemd.js";
import { getReadTimestamp } from "../../tools/FileReadTool/savedOutputPaths.js";
import { stripBomAndCarriageReturn } from "../../utils/remoteFileState.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:355948-356195 placement
var DIALOG_KINDS_PLACEHOLDER; // deferred: loads other modules while loading; runs once its import cycle is complete
var workflowPermissionDialog;
var workflowDialogKindsModule;
var dialogKindsModuleA;
var dialogKindsModuleB;
var artifactsMcpEntryModule;
var bridgeCoordinatorModule;
deferInit("chunk-czq1j3j2.js:355948", () => {
  DIALOG_KINDS_PLACEHOLDER = null;
  workflowPermissionDialog =
    require("../../components/dialogs/workflowPermissionDialog.lazy.js").workflowPermissionDialog;
  workflowDialogKindsModule = require("../../tools/ContinueInProjectsTool/CONTINUE_NOTIFICATION.lazy.js");
  dialogKindsModuleA = require("../../components/projects/continueInProjectsTargetRequest.js");
  dialogKindsModuleB = require("../../components/projects/messageRevealConfirm.js");
  artifactsMcpEntryModule = require("../../components/projects/continueInProjectsComposeRequest.js");
  bridgeCoordinatorModule = require("../../commands/send-to-project/remoteControlOffRequest.js");
});
//@ chunk-czq1j3j2.js:361298-363368 placement
/**
 * 会话归属守卫：检查本地是否还留着别的账号的登录，若不匹配就停掉 REPL 桥接并提示 /login 或复制会话。
 */
class SessionOwnerCheck {
  host;
  #e = false;
  #t = null;
  #o;
  #n = false;
  #r = null;
  constructor(host) {
    this.host = host;
  }
  asking() {
    return this.#t !== null;
  }
  holdsStoredLogin = () => {
    this.#e ||= isAccountCopyEnabled();
    return this.#e && (this.#t !== null || ownerDiffers(getSessionOwner(), ownStoredLoginOwner()));
  };
  check() {
    this.#e ||= isAccountCopyEnabled();
    if (!this.#e) return false;
    rememberKnownAccount(this.host.storageV5).catch(logError);
    let sessionOwner = getSessionOwner();
    let currentIdentity = ownStoredLoginOwner();
    if (!sessionOwner || (currentIdentity && !ownerDiffers(sessionOwner, currentIdentity))) {
      this.#l();
      return false;
    }
    if (!currentIdentity) return this.#t !== null;
    let { store, localJsx } = this.host;
    store.setState((state) =>
      state.replBridgeEnabled || state.replBridgeOutboundOnly || state.replBridgeError !== undefined
        ? {
            ...state,
            replBridgeEnabled: false,
            replBridgeExplicit: false,
            replBridgeOutboundOnly: false,
            replBridgeError: undefined,
            replBridgeErrorKind: undefined,
          }
        : state,
    );
    if (this.#t !== null) return true;
    this.#r ??= store.getState().initialMessage;
    store.setState((state) =>
      state.initialMessage === null
        ? state
        : {
            ...state,
            initialMessage: null,
          },
    );
    this.#o = currentIdentity;
    let startedAccount = accountLabelOfOwner(sessionOwner);
    let now = currentAccountLabel(startedAccount);
    let handle = localJsx.show(
      createElement(SessionOwnerDialog, {
        started: startedAccount,
        now,
        onChoice: (choice) => void this.#s(choice, startedAccount).catch(logError),
      }),
      {
        commandName: SESSION_OWNER,
        immediate: false,
        hidesPrompt: true,
        retireAtTurnBoundary: false,
      },
    );
    this.#t = handle;
    handle.closed.then(() => {
      if (this.#t === handle) this.#t = null;
    });
    return true;
  }
  async #s(choice, startedAccount) {
    if (this.#n) return;
    this.#n = true;
    try {
      switch (choice) {
        case "exit":
          logFeatureSad("auth_session_owner_ask", "exit");
          await this.host.submitSlashCommand("/exit");
          return;
        case "login":
          await this.host.submitSlashCommand("/login");
          if (ownStoredLoginOwner()) {
            this.#t?.close();
            this.#t = null;
            if (!this.check()) logFeatureOk("auth_session_owner_ask");
          }
          return;
        case "copy": {
          let { transcript, storageV5, credentials, resume } = this.host;
          let currentIdentity = ownStoredLoginOwner();
          if (!currentIdentity) return;
          if (ownerDiffers(this.#o, currentIdentity)) {
            this.#t?.close();
            this.#t = null;
            this.check();
            return;
          }
          if (currentSessionFileIsFor(getSessionId())) {
            let copyError;
            if (
              !(await branchAndResume(
                {
                  messages: transcript.getSnapshot(),
                  storageV5,
                  credentials,
                  resume,
                },
                (error) => {
                  copyError = error;
                },
              ))
            ) {
              logFeatureBad("auth_session_owner_ask", "copy_failed");
              if (copyError)
                transcript.apply({
                  type: "append",
                  messages: [createSystemMessage(copyError, "warning")],
                });
              return;
            }
          }
          saveSessionOwner(currentIdentity);
          transcript.apply({
            type: "append",
            messages: [
              createSystemMessage(
                `Copied to ${currentAccountLabel(startedAccount)}. The original stays with ${startedAccount ?? "the account that started it"}.`,
                "notice",
              ),
            ],
          });
          logFeatureOk("auth_session_owner_ask");
          this.#l();
          return;
        }
      }
    } finally {
      this.#n = false;
    }
  }
  #l() {
    this.#t?.close();
    this.#t = null;
    let heldInitialMessage = this.#r;
    this.#r = null;
    if (heldInitialMessage !== null)
      this.host.store.setState((state) =>
        state.initialMessage === null
          ? {
              ...state,
              initialMessage: heldInitialMessage,
            }
          : state,
      );
  }
}
//@ chunk-czq1j3j2.js:382375-382436 placement
function appendLine(existing, line) {
  if (existing.trim() === "") return line;
  return `${existing}
${line}`;
}
//@ chunk-czq1j3j2.js:382436-382551 placement
function restorePromptAfterCancel(draft, text, { neverSubmitted = false } = {}) {
  draft.setMode("prompt");
  draft.replaceValue(appendLine(draft.value, text));
  if (!neverSubmitted) draft.markCameBack();
}
//@ chunk-czq1j3j2.js:407187-407246 placement
function noopController({ store, dialogStore, queue }) {
  return () => {};
}
//@ chunk-czq1j3j2.js:407246-408650 placement
function mergeQueuedHumanMessages(messages, messages_2) {
  let uuids = new Set(messages_2.map((message) => message.uuid));
  let filtered = messages.filter((message) => !uuids.has(message.uuid));
  if (!isSubagentHistoryEnabled()) return [...filtered, ...messages_2];
  let merged = [];
  for (let message of filtered) {
    if (message.type !== "user" || message.isMeta !== true || typeof message.message.content !== "string")
      continue;
    let kind = message.origin?.kind;
    let unwrapped =
      kind === "human"
        ? unwrapMidTurnUserMessage(message.message.content)
        : kind === "coordinator"
          ? unwrapCoordinatorMessage(message.message.content)
          : undefined;
    if (kind !== undefined && unwrapped !== undefined)
      merged.push({
        row: message,
        key: joinLines(kind, unwrapped),
        words: unwrapped,
      });
  }
  let indexByUuid = new Map(messages.map((message, index) => [message.uuid, index]));
  let consumedUuids = new Set();
  let unmatchedKeys = [];
  let lastIndex;
  for (let message of messages_2) {
    let index = indexByUuid.get(message.uuid);
    if (index !== undefined) {
      lastIndex = index;
      continue;
    }
    if (message.type !== "user" || message.isMeta === true || typeof message.message.content !== "string")
      continue;
    let kind = message.origin?.kind;
    if (kind !== "human" && kind !== "coordinator") continue;
    let key = joinLines(kind, message.message.content);
    let afterIndex = lastIndex;
    let match =
      afterIndex === undefined
        ? undefined
        : merged.find(
            (entry) =>
              entry.key === key &&
              !consumedUuids.has(entry.row.uuid) &&
              (indexByUuid.get(entry.row.uuid) ?? -1) > afterIndex,
          );
    if (match === undefined) unmatchedKeys.push(key);
    else consumedUuids.add(match.row.uuid);
  }
  for (let key of unmatchedKeys) {
    let last = merged.findLast((entry) => entry.key === key && !consumedUuids.has(entry.row.uuid));
    if (last !== undefined) consumedUuids.add(last.row.uuid);
  }
  let rewrittenRows = new Map();
  for (let { row, words } of merged)
    if (!consumedUuids.has(row.uuid)) {
      let { isMeta, ...rest } = row;
      rewrittenRows.set(row.uuid, {
        ...rest,
        message: {
          ...row.message,
          content: words,
        },
      });
    }
  let kept = [];
  let extrasByUuid = new Map();
  let anchorUuid;
  for (let message of messages) {
    let rewritten = rewrittenRows.get(message.uuid);
    if (uuids.has(message.uuid)) anchorUuid = message.uuid;
    else if (rewritten !== undefined && anchorUuid !== undefined)
      extrasByUuid.set(anchorUuid, [...(extrasByUuid.get(anchorUuid) ?? []), rewritten]);
    else {
      kept.push(rewritten ?? message);
      anchorUuid = undefined;
    }
  }
  return [...kept, ...messages_2.flatMap((message) => [message, ...(extrasByUuid.get(message.uuid) ?? [])])];
}
//@ chunk-czq1j3j2.js:408650-408686 placement
function joinLines(kind, text) {
  return `${kind}
${text}`;
}
//@ chunk-czq1j3j2.js:408686-409327 placement
function syncViewedAgentPermissionMode({ store, setAppState, storageV5 }) {
  return createDependencyWatcher(
    [store],
    () => {
      let { viewingAgentTaskId, tasks } = store.getState();
      let task = viewingAgentTaskId ? tasks[viewingAgentTaskId] : undefined;
      let condition = isLocalAgent(task) && task.retain && !task.diskLoaded;
      return [viewingAgentTaskId, condition];
    },
    (agentId, newMessages) => {
      if (!agentId || !newMessages) return;
      let taskId = agentId;
      getAgentTranscript(identityAgentId2(taskId), storageV5)
        .then((agentTranscript) => {
          setAppState((state) => {
            let task = state.tasks[taskId];
            if (!isLocalAgent(task) || task.diskLoaded || !task.retain) return state;
            let agentTranscript_2 = state.transcripts[taskId];
            let messages = agentTranscript_2?.messages ?? [];
            let existingUuids = new Set(messages.map((message) => message.uuid));
            let mergedMessages = mergeQueuedHumanMessages(agentTranscript?.messages ?? [], messages);
            let filtered = mergedMessages.filter((message) => !existingUuids.has(message.uuid));
            degradeRestoredMessages(filtered);
            return {
              ...state,
              tasks: {
                ...state.tasks,
                [taskId]: {
                  ...task,
                  diskLoaded: true,
                },
              },
              transcripts: {
                ...state.transcripts,
                [taskId]: {
                  inProgressToolUseIDs: new Set(),
                  ...agentTranscript_2,
                  messages: mergedMessages,
                },
              },
            };
          });
        })
        .catch(logError);
    },
  );
}
//@ chunk-czq1j3j2.js:409327-409402 layout
var artifactsEntryWatch; // deferred: loads other modules while loading; runs once its import cycle is complete
var RESUME_RETRY_DELAYS_MS;
var DRAIN_CHECK_INTERVAL_MS;
var MAX_DRAIN_WAIT_CYCLES;
deferInit("chunk-czq1j3j2.js:409327", () => {
  artifactsEntryWatch = require("../../services/mcp/startArtifactsMcpEntryWatch.lazy.js");
  RESUME_RETRY_DELAYS_MS = [1000, 3000, 1e4];
  DRAIN_CHECK_INTERVAL_MS = 50;
  MAX_DRAIN_WAIT_CYCLES = 1300;
});
//@ chunk-czq1j3j2.js:409402-409477 placement
function oauthAccountFingerprint() {
  let oauthAccountInfo = getOauthAccountInfo();
  return `${oauthAccountInfo?.accountUuid}|${oauthAccountInfo?.profileFetchedAt}`;
}
//@ chunk-czq1j3j2.js:409477-409540 placement
function isNotPlacedSystemMessage(message) {
  return message.type !== "system" || message.subtype !== "placed";
}
//@ chunk-czq1j3j2.js:409540-409637 placement
function transcriptStampSessionController(messages) {
  let lastIndex = messages.findLastIndex(isNotPlacedSystemMessage);
  let found = messages.find(isNotPlacedSystemMessage);
  return `${lastIndex + 1}|${found?.uuid}|${messages[lastIndex]?.uuid}`;
}
//@ chunk-czq1j3j2.js:409637-409769 placement
/**
 * 当前会话 id 与 transcript 路径（持久化关闭或无会话文件时 null）。
 */
function currentTranscriptRef() {
  let source = currentRestoreSource();
  if (source !== null) return source;
  if (isTranscriptPersistenceDisabled() || getMaterializedSessionFile() === null) return null;
  let sessionId = getSessionId();
  return {
    sessionId,
    transcriptPath: getTranscriptPathForSession(sessionId),
  };
}
//@ chunk-czq1j3j2.js:409769-409860 placement
var SLASH_COMMAND_PICKER_KEYS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:409769", () => {
  SLASH_COMMAND_PICKER_KEYS = new Set([
    "slash_command_picker",
    "slash_command_session_id",
    "slash_command_title",
  ]);
});
//@ chunk-czq1j3j2.js:409860-451081 placement
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
  #r;
  #s;
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
  #l;
  askAboutSessionOwner = () => this.#l.check();
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
    this.#r = chrome;
    this.#s = scrollPin;
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
    this.#l = new SessionOwnerCheck({
      localJsx: scope.localJsx,
      store,
      transcript,
      storageV5,
      credentials,
      resume: (session, log, mode) => this.resume(session, log, mode),
      submitSlashCommand: (command) => this._submitSlashCommand(command),
    });
    this._snapshot = {
      conversationId: randomUUID(),
      haikuTitle: undefined,
      headHooksPending: this.headHooksPending,
    };
    let getAdoptedPrefill = () => this._adoptedPrefill;
    this.adoptedPrefillRef = {
      get current() {
        return getAdoptedPrefill();
      },
    };
  }
  subscribe = this._changed.subscribe;
  getSnapshot = () => this._snapshot;
  _publish(patch) {
    let _snapshot = this._snapshot;
    let next = {
      ..._snapshot,
      ...patch,
    };
    if (
      next.conversationId === _snapshot.conversationId &&
      next.haikuTitle === _snapshot.haikuTitle &&
      next.headHooksPending === _snapshot.headHooksPending
    )
      return;
    this._snapshot = next;
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
  maybePromptStaleResume(messages, pin) {
    this._promptStaleResume(messages, pin).catch(logError);
  }
  async _promptStaleResume(messages, pin) {
    let { transcript, storageV5, session } = this;
    let offer = shouldOfferResumeCompact(messages, estimateTokensWithAnchor);
    if (offer) {
      let recentMessages = messagesSinceCompactBoundary(messages);
      try {
        loadPrecomputedCompact(
          session.precompute,
          "main",
          getQuerySourceForREPL(),
          recentMessages,
          getMainLoopModelFromState(this.store.getState()),
          storageV5,
        );
      } catch (error) {
        logError(error);
      }
      let hasPrecomputedSummary = () => {
        let precomputeEntry = getPrecomputeEntry(session.precompute, undefined);
        return (
          precomputeEntry?.status === "ready" &&
          recentMessages.some((message) => message.uuid === precomputeEntry.coverage.lastUuid)
        );
      };
      if (
        (await runResumeCompactOffer(
          this.scope.requestDialog,
          {
            ...offer,
            hasPrecomputedSummary: hasPrecomputedSummary(),
          },
          {
            getMessageCount: () => transcript.getSnapshot().length,
            storage: storageV5,
            hasPrecomputedSummary,
            runCompact: () => void this._submitSlashCommand("/compact"),
          },
        )) !== "skipped_no_summary"
      )
        return;
    }
    try {
      let warning = maybeShowColdResumeQuotaWarning(
        messages,
        getMainLoopModelFromState(this.store.getState()),
        "resume",
      );
      if (warning) {
        let generation = this.#t;
        this.#i(
          generation,
          await showIdleReturnDialog(this.scope.requestDialog, warning, {
            trigger: "resume",
            offersLookUp: offersLookUp(messages, pin),
            startNewConversation: () => this._startNewConversation(messages, pin),
          }),
        );
        return;
      }
    } catch (error) {
      logFeatureBad("cli_cold_resume_quota_warning", "prompt_failed");
      throw error;
    }
    try {
      await useDefaultToNewerModelKey(messages, {
        requestDialog: this.scope.requestDialog,
        addNotification: (notification) => this._requireHost().addNotification(notification),
        removeNotification: (notification) => this._requireHost().removeNotification(notification),
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
  async askIdleCacheQuota(warning) {
    let generation = this.#t;
    try {
      let outcome = await showIdleReturnDialog(this.scope.requestDialog, warning, {
        trigger: "idle",
        offersLookUp: offersLookUp(this.transcript.getSnapshot(), currentTranscriptRef()),
        startNewConversation: () =>
          this._startNewConversation(this.transcript.getSnapshot(), currentTranscriptRef(), "idle"),
      });
      this.#i(generation, outcome);
    } catch (error) {
      logFeatureBad(quotaWarningSurface("idle"), "prompt_failed");
      throw error;
    }
  }
  #i(generation, outcome) {
    if (outcome === "resume" || outcome === "dismiss") this.#o = generation;
  }
  async _startNewConversation(messages, pin, trigger = "resume") {
    let quotaSurface = quotaWarningSurface(trigger);
    let sessionId = getSessionId();
    let pinnedSid = pinSessionId(sessionId);
    let pointer = null;
    let pointerFailed = false;
    let toolsUsed = [];
    let toolsCapture = null;
    if (pin !== null && canLookUpPrevious(messages, pinnedSid))
      try {
        let conversationToolsUsed = getConversationToolsUsed();
        toolsCapture = {
          ledger: conversationToolsUsed,
          names: conversationToolsUsed.captureRecords(),
        };
        toolsUsed = [
          ...conversationToolsUsed.names(),
          ...collectToolsUsedBeforeSummary(messages, undefined, false, true),
        ];
        pointer = buildPreviousConversationPointer({
          resumed: messages,
          source: pin,
        });
      } catch (error) {
        pointerFailed = true;
        logError(error);
      }
    let previousTitle;
    try {
      previousTitle = pointer === null ? undefined : getCurrentSessionDisplayTitle(sessionId);
    } catch (error) {
      logError(error);
    }
    let beforeUuids = new Set(this.messageQueue.getCommandQueue());
    try {
      await this._submitSlashCommand(
        "/clear",
        trigger === "idle"
          ? {
              fromKeybinding: true,
              keepsComposer: true,
              leavesIdeSelection: true,
            }
          : undefined,
      );
    } catch (error) {
      finishToolsCapture(toolsCapture);
      logFeatureBad(quotaSurface, "clear_failed");
      logError(error);
      return;
    }
    let plan = {
      pointer,
      pointerFailed,
      toolsUsed,
      toolsCapture,
      previousTitle,
      feature: quotaSurface,
    };
    if (getSessionId() !== sessionId) {
      this._finishNewConversation(plan, true);
      return;
    }
    let isClearCommand = (command) =>
      !beforeUuids.has(command) && command.mode === "prompt" && command.value === "/clear";
    let found = this.messageQueue.getCommandQueue().find(isClearCommand);
    this.messageQueue.someInFlightDrainCommand((command) => {
      if (found === undefined && isClearCommand(command)) found = command;
      return found !== undefined;
    });
    if (found === undefined) {
      this._finishNewConversation(plan, false);
      return;
    }
    this._watchQueuedClear(found, sessionId, pinnedSid, plan);
  }
  _watchQueuedClear(clearCommand, sessionId, pin, plan) {
    this._queuedClearWatch?.settle(false);
    if (this._disposed) {
      this._finishNewConversation(plan, false);
      return;
    }
    let { messageQueue, turn } = this;
    let unsubscribers = [];
    let settled = false;
    let remoteMove = false;
    let watch = {
      stop: () => {
        for (let unsubscribe of unsubscribers.splice(0)) unsubscribe();
        if (this._queuedClearWatch === watch) this._queuedClearWatch = null;
      },
      settle: (remote) => {
        if (settled) return;
        settled = true;
        watch.stop();
        this._finishNewConversation(
          remoteMove
            ? {
                ...plan,
                pointer: null,
              }
            : plan,
          remote,
        );
      },
    };
    this._queuedClearWatch = watch;
    let matches = (command) =>
      command === clearCommand || (clearCommand.uuid !== undefined && command.uuid === clearCommand.uuid);
    let inFlight = messageQueue.someInFlightDrainCommand(matches);
    let cancelTimer;
    let waitCycles = 0;
    let check = () => {
      try {
        if (this._queuedClearWatch !== watch) return;
        if (getSessionId() === sessionId && isRemoteOrBridgeSession(pin)) remoteMove = true;
        let stillInFlight = messageQueue.someInFlightDrainCommand(matches);
        inFlight ||= stillInFlight;
        if (turn.guard.isActive) {
          waitCycles = 0;
          return;
        }
        if (messageQueue.getCommandQueue().some(matches)) return;
        let landedElsewhere = inFlight && getSessionId() !== sessionId && getParentSessionId() === sessionId;
        if (!landedElsewhere && stillInFlight && waitCycles < MAX_DRAIN_WAIT_CYCLES) {
          waitCycles++;
          cancelTimer?.();
          cancelTimer = this._clock.setTimeout(check, DRAIN_CHECK_INTERVAL_MS);
          return;
        }
        watch.settle(landedElsewhere);
      } catch (error) {
        watch.stop();
        logError(error);
        if (!settled) {
          settled = true;
          finishToolsCapture(plan.toolsCapture);
          logFeatureSad(plan.feature, "clear_not_applied");
        }
      }
    };
    unsubscribers.push(
      turn.guard.subscribe(check),
      messageQueue.subscribe(() => queueMicrotask(check)),
      () => cancelTimer?.(),
    );
    queueMicrotask(check);
  }
  _finishNewConversation(
    { pointer, pointerFailed, toolsUsed, toolsCapture, previousTitle, feature },
    landed,
  ) {
    let captured = finishToolsCapture(toolsCapture);
    let pointerFailedToAppend = false;
    if (pointer !== null && landed)
      try {
        getConversationToolsUsed().record([...toolsUsed, ...captured]);
        let cleanTitle = previousTitle === undefined ? "" : stripIgnorables(previousTitle);
        let systemMessage = createSystemMessage(
          cleanTitle === ""
            ? "New conversation. Claude can look up the previous conversation if you refer to it."
            : `New conversation. Claude can look up "${truncateToWidth(cleanTitle, 60)}" if you refer to it.`,
          "notice",
        );
        this.transcript.apply({
          type: "append",
          messages: [systemMessage, pointer],
        });
      } catch (error) {
        pointerFailedToAppend = true;
        logError(error);
      }
    if (!landed) logFeatureSad(feature, "clear_not_applied");
    else if (pointerFailed || pointerFailedToAppend)
      logFeatureSad(feature, pointerFailed ? "pointer_failed" : "pointer_append_failed");
    else logFeatureOk(feature);
  }
  _submitSlashCommand(text, options) {
    return this._requireHost().onSubmit(
      text,
      {
        setCursorOffset: () => {},
        clearBuffer: () => {},
        resetHistory: () => {},
      },
      {
        ...options,
        inputModeOverride: "prompt",
      },
    );
  }
  markConversationRemote = () => {
    this.conversationOrigin = "remote";
    this.#t++;
  };
  resume = async (taskId, log, mode) => {
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
    let askedOwner = false;
    try {
      markSessionRestored(session.host);
      let result = {
        ...log,
        messages: dropMalformedAttachments(log.messages),
      };
      if (codeModeAccepted()) for (let message of result.messages) stripToolUseIdBookkeeping(message);
      let messages = deserializeToMessages(result.messages);
      let modelNotice =
        mode !== "fork"
          ? noModelPin(
              {
                replMode: log.replMode,
                replTypedEvents: log.replTypedEvents,
                messages,
                source: "store",
                sessionId: taskId,
                withinSession: true,
              },
              (warningText) => messages.push(createSystemMessage(warningText, "warning")),
            )
          : undefined;
      if (modelNotice) assertResumeNotRefused(modelNotice);
      let sessionModeModule = require("../../coordinator/coordinatorMode.js");
      let modeWarning = sessionModeModule.matchSessionMode(log.mode);
      if (modeWarning) {
        let agentDefinitions = await reloadAgentDefinitionsForModeSwitch(
          getSessionProject(session).originalCwd,
          [],
          storageV5,
        );
        _setAppState((state) => ({
          ...state,
          agentDefinitions,
        }));
        messages.push(createSystemMessage(modeWarning, "warning"));
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
          onResolveMiss: (notice) => messages.push(createSystemMessage(notice, "warning")),
        },
      );
      scope.setMainThreadAgentDefinition(agentDefinition);
      _setAppState((state) => ({
        ...state,
        agent: agentDefinition?.agentType,
      }));
      let flushTelemetry;
      let restoredModel;
      if (mode !== "fork")
        restoredModel = await restoreModelFromSession(
          messages,
          mainLoopModel,
          (notice) => messages.push(createSystemMessage(notice, "warning")),
          {
            scheduleTelemetry: (schedule) => {
              flushTelemetry = schedule;
            },
            storageV5,
            credentials,
          },
        );
      appendSlackTagResumeRecords(messages, {
        fork: mode === "fork",
        sessionId: taskId,
      });
      await appendToolsUsedEntryBeforeClear(storageV5);
      let conversationToolsUsed = getConversationToolsUsed();
      let capturedRecords = conversationToolsUsed.captureRecords();
      let startRows;
      try {
        startRows = await processSessionStartHooks(session, mode === "fork" ? "fork" : "resume", {
          sessionId: taskId,
          envFileSessionId: identityAgentId(taskId),
          sessionTitle: log.customTitle,
          agentType: agentDefinition?.agentType,
          model: restoredModel ?? mainLoopModel,
          resumedMessages: log.messages,
          storageV5,
          credentials,
        });
      } finally {
        conversationToolsUsed.endCapture(capturedRecords);
      }
      messages.push(...dedupeSessionStartRows(messages, startRows));
      if (mode === "fork") copyPlanForFork(log, identityAgentId(taskId), storageV5);
      else copyPlanForResume(log, identityAgentId(taskId), storageV5);
      if (log.fileHistorySnapshots) copyFileHistoryForResume(log, identityAgentId(taskId), storageV5);
      _setAppState((state) => ({
        ...state,
        standaloneAgentContext: computeStandaloneAgentContext(log.agentName, log.agentColor),
        sendMessagePins: {},
        agentNameRegistry: liveAgentNames(state.agentNameRegistry, state.tasks),
      }));
      let origin =
        mode === "fork"
          ? this.conversationOrigin
          : mode === "rewind_pre_clear"
            ? (this.preClearOrigin ?? this.conversationOrigin)
            : "local";
      turn.resetLoadingState();
      turn.setAbortController(null);
      this.transcript.cut();
      this._publish({
        conversationId: taskId,
      });
      this._resetTurnEventTail();
      flushAndSaveCosts(undefined, storageV5);
      let agentId = identityAgentId(taskId);
      let taintSid = pinSessionId(agentId);
      let sessionId = getSessionId();
      this.#e.add(sessionId);
      let known = this.#e.has(agentId);
      switchSession(
        agentId,
        mode === "fork" ? "fork" : "resume",
        log.fullPath ? dirname(log.fullPath) : null,
      );
      if (mode !== "fork") _setAppState(forfeitAllChatPins);
      if (mode !== "fork" && agentId !== sessionId) clearFileStateCacheKeepingSeeds(scope.readFileState);
      this.restoreReadFileState(
        messages,
        log.projectPath ?? getSessionProject(session).originalCwd,
        mode === "fork",
        origin,
      );
      if (mode !== "fork")
        getTaskRunState().inheritPredecessorLinks(taskOutputDirForSession(agentId), log.modified.getTime());
      if (mode !== "fork")
        seedCommentMonitorIntent(log.artifactCommentMonitor, {
          ...(storageV5 !== undefined && {
            storageV5,
          }),
        });
      if (restoredModel) {
        let restoredModelValue = installRestoredModel(messages, restoredModel, false, storageV5, credentials);
        if (restoredModelValue)
          _setAppState((state) => {
            if (state.mainLoopModel === restoredModelValue) return state;
            recordSwitchIfChanged(session, state, restoredModelValue, "resume");
            return {
              ...state,
              mainLoopModel: restoredModelValue,
            };
          });
      }
      if (codeModeAccepted() && modelNotice) recordModelPinSwitch(modelNotice);
      rearmRefusalFallbackHeaderFromTranscript(messages, mode === "fork");
      flushTelemetry?.();
      let { renameRecordingForSession } = await import("../../utils/asciicast.js");
      await renameRecordingForSession(session, storageV5);
      await resetSessionFilePointer();
      let teamContext = isAgentSwarmsEnabled()
        ? await (
            await import("../../tools/TeamCreateTool/initializeSessionTeam.lazy.js")
          ).rekeySessionTeamInSession(storageV5)
        : undefined;
      if (teamContext)
        _setAppState((state) => ({
          ...state,
          teamContext: teamContext.teamContext,
          teammateColors: teamContext.teammateColors,
        }));
      if (mode !== "fork") {
        retireResumeSwapPair(store.getState, store.setState, dialogStore, this.session);
        retireConversationReplicas();
        disposeLiveState();
        this.rehydrateResumedFrameState(messages, false, origin, false);
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
        if (codeModeAccepted() && agentId !== sessionId) {
          let { danglingReceipts } = require("../../utils/codeMode/lostEvals.js");
          require("../../utils/codeMode/replSessionEnd.js").endMainThreadConversation(
            scope.toolState,
            this.messageQueue,
            "another conversation was resumed",
            danglingReceipts(messages).map((receipt) => receipt.toolUseId),
          );
        }
        if (SLASH_COMMAND_PICKER_KEYS.has(mode) && !known) {
          let planModeRestoreOnInteractiveResume = await preparePlanModeRestoreOnInteractiveResume({
            storedPermissionMode: log.permissionMode,
            messages,
            forkSession: false,
            permissionModeSuppliedOnInvocation: false,
            lane: "interactive_slash",
          });
          _setAppState((state) => {
            let nextContext = planModeRestoreOnInteractiveResume(state.toolPermissionContext);
            return nextContext
              ? {
                  ...state,
                  toolPermissionContext: nextContext,
                }
              : state;
          });
        }
      }
      restoreSessionStateFromLog(result, store.setState, this.sessionHooks, {
        preserveLiveBudget: mode === "fork" || mode === "rewind_pre_clear",
      });
      applyEndedByModelOnResume(getEndedByModel(log), _setAppState);
      let toolNames = getConversationToolsUsed().names();
      let toolsToRecord = Object.values(store.getState().tasks).some((task) =>
        AGENT_TASK_TYPES.has(task.type),
      )
        ? toolNames
        : toolNames.filter(isGmailAttachmentTool);
      clearSessionMetadata();
      getConversationToolsUsed().record(toolsToRecord);
      restoreSessionMetadata(
        mode === "fork"
          ? buildForkAdoptionMeta(log, {
              stripRelocatedCwd: true,
            })
          : {
              ...log,
              artifactCommentMonitor: undefined,
            },
        {
          taintSid,
          storageV5,
        },
      );
      askedOwner = mode !== "fork" && this.askAboutSessionOwner();
      installDevModsPlaceholderExpander();
      pushRestoredMemoryPauseNotice(messages);
      if (mode === "fork")
        if (log.precautionarySuppressionHeld) {
          holdPrecautionarySuppressionFor(taintSid);
          markPrecautionClearResilientFor(taintSid);
        } else copyPrecautionarySuppressionTo(taintSid, pinSessionId(getSessionIdFromLog(log)));
      let hookTitle = takePendingHookSessionTitle();
      if (hookTitle) cacheHookSessionTitle(hookTitle);
      if (capturedRecords.length > 0) getConversationToolsUsed().record(capturedRecords);
      reclaimSessionNameOnResume(log.agentName, storageV5, {
        autoOnly: !log.customTitle,
      });
      if (mode !== "fork" && log.bridgeSessionId && !askedOwner)
        _setAppState((state) =>
          state.replBridgeEnabled && !state.replBridgeOutboundOnly
            ? state
            : {
                ...state,
                replBridgeEnabled: true,
                replBridgeOutboundOnly: false,
              },
        );
      this._publish({
        haikuTitle: undefined,
      });
      if (mode !== "fork") {
        exitRestoredWorktree(
          log.worktreeSession === undefined ? log.projectPath : log.worktreeSession?.worktreePath,
          storageV5,
        );
        let worktree = restoreWorktreeForResume(
          lastResumeRecordRegistry.of(session.host),
          log.worktreeSession,
          log.projectPath,
          {
            storageV5,
          },
        );
        if (worktree) messages.push(createSystemMessage(worktreeResumeNotice(worktree), "warning"));
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
          let monitorIntents = takeRestoredMonitorIntents({
            ...(storageV5 !== undefined && {
              storageV5,
            }),
          });
          let tornIntents = [...tornStopIntents()];
          let surface = currentToolPermissionContext() ? "replShort" : "repl";
          if (tornIntents.length > 0) {
            let env = claudeAiEnvironment();
            messages.push(
              createSystemMessage(
                describeNotResumedIncomplete(
                  tornIntents.map((slug) =>
                    artifactViewerUrlFor({
                      slug,
                      env,
                    }),
                  ),
                  surface,
                ),
                "warning",
              ),
            );
          }
          let otherSlugs = otherArmedSlugs(monitorIntents, isAutoReactWired);
          if (otherSlugs.length > 0) {
            let sessionId = agentId;
            let replyState = "unknown";
            let liveReply;
            let others = 0;
            let stopped = false;
            try {
              let { listRegisteredSessionRecords } =
                await import("../../utils/udsMessaging/SessionRecordsUnreadableError.lazy.js");
              let liveReplyHolder = await findLiveReplyHolder({
                records: await listRegisteredSessionRecords(),
                sessionId,
                selfPid: process.pid,
                isRunning: isProcessRunning,
                isSameProcess: provenSameProcessAsync,
              });
              stopped = true;
              replyState = liveReplyHolder.verdict;
              liveReply = liveReplyHolder.holder;
              others = liveReplyHolder.otherHolders?.length ?? 0;
            } catch {
              logFeatureSad("artifact_live_subscribe", "holder_probe_failed");
            }
            let env = claudeAiEnvironment();
            let mapped = otherSlugs.map((slug) =>
              artifactViewerUrlFor({
                slug,
                env,
              }),
            );
            let now = Date.now();
            if (replyState !== "none" && stopped)
              classifyMonitorHold(replyState === "live" ? "held_by_live_session" : "holder_unknown", {
                path: "switch",
                probed: stopped,
                liveHolder: liveReply,
                otherHolders: others,
                monitors: otherSlugs.length,
                jobStamped: [...monitorIntents.values()].some(
                  (record) => record.state === "armed" && record.holder === "bg",
                ),
                jobHolder: "none",
                takeover: "not_attempted",
                now,
              });
            if (replyState === "live")
              messages.push(
                createSystemMessage(
                  describeHeldMonitor(
                    mapped,
                    liveReply !== undefined
                      ? describeHolderWithOthersComments(liveReply, others, now)
                      : undefined,
                    surface,
                  ),
                  "notice",
                ),
              );
            else messages.push(createSystemMessage(describeNotResumedAfterSwitch(mapped, surface), "notice"));
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
            sessionId: agentId,
            conversation: [...messages],
            taskRegistry,
            getMcpClients: () => store.getState().mcp.clients,
            requestDialog: scope.requestDialog,
            storageV5,
            credentials,
          });
        removeSessionCronTasks(
          getSessionCronTasks().map((task) => task.id),
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
      let { isCoordinatorMode } = require("../../coordinator/coordinatorMode.js");
      saveMode(isCoordinatorMode() ? "coordinator" : "normal");
      if (codeModeAccepted()) noopModelPinReset(modelNotice?.declined === true);
      resetCostState();
      setCostStateForRestore(log);
      if (mode !== "fork") scope.reconstructContentReplacementState(messages, log.contentReplacements ?? []);
      primePasteIdsFromMessages(messages);
      emitReplBridgeEvent(session, identityAgentId(taskId));
      clearClassifierContext();
      replace(() => messages);
      this.conversationOrigin = origin;
      if (mode !== "fork") draft.replaceValue("");
      if (mode !== "fork") {
        try {
          await prefetchPrecomputedSidecar(
            agentId,
            {
              sessionId: agentId,
              transcriptPath: log.fullPath,
            },
            session.precompute,
            storageV5,
          );
        } catch (error) {
          logError(error);
        }
        if (!askedOwner)
          this.maybePromptStaleResume(messages, {
            sessionId: agentId,
            transcriptPath: log.fullPath ?? getTranscriptPathForSession(agentId),
          });
      }
      logEvent("tengu_session_resumed", {
        entrypoint: fromEnum(mode),
        success: true,
        resume_duration_ms: Math.round(performance.now() - startTime),
      });
    } catch (error) {
      logEvent("tengu_session_resumed", {
        entrypoint: fromEnum(mode),
        success: false,
        failure_reason: lit_2("processing_error"),
        error_name: sanitizedErrorNameForTelemetry(toError(error)),
      });
      throw error;
    }
  };
  rehydrateResumedFrameState(messages, continuesConversation = false, origin = "local", reportCarry = true) {
    let { _setAppState } = this;
    applyArtifactResumeCarry(
      _setAppState,
      collectResumeArtifactCarry(messages, {
        origin,
        seedEligible: isResumeFrameSeedEligible(),
        reportCarry,
      }),
      {
        continuesConversation,
        keepCloudRows: origin === "remote",
      },
    );
  }
  _discardDetachedToolCallsOutside(keepBefore) {
    discardQueuedOutside(detachedCallSlots.of(this.session), this.messageQueue, keepBefore);
  }
  restoreReadFileState(messages, cwd, isFork = false, origin = "local") {
    let { scope, turn, store } = this;
    scope.mergeReadFileStateFrom(messages, cwd);
    turn.resetForConversation({
      kind: "resumed",
      messages,
    });
    this._discardDetachedToolCallsOutside(messages);
    this.rehydrateResumedFrameState(messages, isFork, origin);
    store.setState((state) =>
      rehydrateSession(messages, state, {
        restoreAgentNames: !isFork,
      }),
    );
  }
  start() {
    let completed = [];
    let finish = () => {
      this._disposed = true;
      this._queuedClearWatch?.settle(false);
      for (let idx = completed.length - 1; idx >= 0; idx--) completed[idx]();
      diagnosticTrackingSlot.of(this.session).shutdown();
    };
    try {
      this._runStartSteps(completed);
    } catch (error) {
      finish();
      throw error;
    }
    return finish;
  }
  _runStartSteps(messages) {
    let { store, transcript, session, storageV5 } = this;
    messages.push(
      syncViewedAgentPermissionMode({
        store,
        setAppState: store.setState,
        storageV5,
      }),
    );
    this._startFeeds(messages);
    messages.push(
      onSessionSwitch((from, to) => {
        this.#e.add(from);
        if (isConversationResetSwitch(to)) this.#t++;
      }),
    );
    messages.push(
      subscribeSessionAgentNameChanged(() => {
        let currentSessionAgentName = getCurrentSessionAgentName();
        if (!currentSessionAgentName) return;
        store.setState((state) =>
          state.standaloneAgentContext?.name === currentSessionAgentName
            ? state
            : {
                ...state,
                standaloneAgentContext: {
                  ...state.standaloneAgentContext,
                  name: currentSessionAgentName,
                },
              },
        );
      }),
    );
    try {
      this._startSiblingLoginWatch(messages);
    } catch (error) {
      logError(
        Error("SessionController.start: sibling-login watch threw", {
          cause: error,
        }),
      );
    }
    this._raiseSessionStart();
    if (this._pendingHookSet) this._subscribeHookSet(this._pendingHookSet);
    messages.push(
      this.session.subscribe(() => {
        let _pendingHookSet = this._pendingHookSet;
        if (_pendingHookSet && this.session.id !== _pendingHookSet.sessionId)
          this._releaseHookSet(_pendingHookSet, true);
      }),
    );
    messages.push(() => this.releasePendingHookMessages());
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
    let sandboxStop = this._sandbox.start();
    messages.push(sandboxStop.stop);
    if (sandboxStop.refused) return;
    let permissionContext = teammatePermissionContextBySessionRoot.of(session);
    permissionContext.registerSetter((setter) => setToolPermissionContextAndNotify(store.setState, setter));
    messages.push(() => permissionContext.unregisterSetter());
    messages.push(this.turn.watchLaunchPrompt());
    noteFirstFullscreenFrame();
    commitGate(session);
    let loginCounter = loginEventCounter.of(session);
    let loginSwitchHolder = loginSwitchMemo();
    let holdsStoredLogin = this.#l.holdsStoredLogin;
    loginSwitchHolder.sessionOwnerHold = holdsStoredLogin;
    messages.push(
      () => {
        if (loginSwitchHolder.sessionOwnerHold === holdsStoredLogin)
          loginSwitchHolder.sessionOwnerHold = null;
      },
      createDependencyWatcher(
        [loginCounter],
        () => [loginCounter.getSnapshot().loginCompleted],
        () => {
          if (this.askAboutSessionOwner()) this.turn.abort("remote-cancel");
        },
      ),
    );
    setJitPolicyAfterStartup();
    useArtifactWatchStartup({
      initialMessages: this.initialMessages,
      transcript,
      store,
      storageV5,
      addNotification: (notification) => this._requireHost().addNotification(notification),
      artifactMountGate: this.artifactMountGate,
    });
    if (artifactsEntryWatch !== null)
      try {
        messages.push(
          artifactsEntryWatch.startArtifactsMcpEntryWatch({
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
    messages.push(this._startUnattendedMonitoringWatch());
    if (codeModeAccepted())
      getTaskRunState().onSubagentResume ??=
        require("../../utils/codeMode/lostEvals.js").reportLostSubagentReplEvals;
    if (!this.runsNoModelTurn)
      messages.push(
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
    messages.push(getTaskRunState().taskEvicted.subscribe(this._spinnerStore.evict));
    messages.push(lazyCommandRunSignal.subscribe(this._spinnerStore.applyEvent));
    if (!this.runsNoModelTurn)
      messages.push(
        resumeStrandedAgent({
          taskRegistry: this.taskRegistry,
          getToolUseContext: () => this._buildIdleToolUseContext(),
          liveTranscript: this._liveTranscript(),
          getCanUseTool: () => this._requireHost().canUseTool,
          addNotification: (notification) => this._requireHost().addNotification(notification),
        }),
      );
    let slot = idleCompactionSlot.of(session);
    slot.host = this.#u;
    messages.push(() => {
      if (slot.host === this.#u) slot.host = null;
    });
  }
  _startSiblingLoginWatch(attempt) {
    if (!this._siblingLoginWatchEnabled()) return;
    attempt.push(
      subscribeOAuthCredentialsChangedOnDisk(this.session.host, () => {
        if (!this._siblingLoginWatchEnabled()) return;
        this._adoptSiblingLogin().catch(logError);
      }),
    );
    let fingerprint = oauthAccountFingerprint();
    attempt.push(
      subscribeGlobalConfigInstalled(() => {
        try {
          let initialFingerprint = oauthAccountFingerprint();
          if (initialFingerprint === fingerprint) return;
          fingerprint = initialFingerprint;
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
  _scheduleSiblingLoginCheck(attempt) {
    let delayMs = RESUME_RETRY_DELAYS_MS[attempt];
    if (delayMs === undefined) return;
    this._cancelSiblingLoginCheck = this._clock.setTimeout(() => {
      this._cancelSiblingLoginCheck = undefined;
      if (this._disposed || !this.scope.apiKeyVerification.showsLoginNotice()) return;
      checkOAuthCredentialsChangedOnDisk(this.session.host, this.credentials).catch(logError);
      this._scheduleSiblingLoginCheck(attempt + 1);
    }, delayMs);
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
    let stop;
    try {
      stop = await refreshRemoteManagedSettings(showStandaloneSecurityDialog, storageV5, credentials);
    } catch (error) {
      logFeatureBad("auth_sibling_login_adopt", "managed_settings_refresh_threw");
      throw error;
    }
    if (this._disposed) return;
    if (!stop) {
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
    let noop = () => {};
    {
      let autoReply = canAutoReply();
      noop = subscribeAutoReplyChanges(() => {
        let autoReplyOn = canAutoReply();
        if (autoReplyOn === autoReply) return;
        autoReply = autoReplyOn;
        if (autoReplyOn) this.discloseUnattendedActivity();
      });
    }
    let liveWatches = countWhere(Object.values(store.getState().tasks), isCarriedFrameLiveWatch);
    let dependencyWatcher = createDependencyWatcher(
      [store],
      () => [countWhere(Object.values(store.getState().tasks), isCarriedFrameLiveWatch)],
      (task) => {
        if (task === liveWatches) return;
        liveWatches = task;
        syncLiveInFlightSnapshot(summarizeBackgroundWork(taskRegistry.all()), storageV5);
      },
    );
    return () => {
      noop();
      dependencyWatcher();
    };
  }
  _startFeeds(messages) {
    let { store, transcript, messageQueue } = this;
    messages.push(
      HeldPeerMessages({
        clock: this._clock,
        store,
        transcript,
        requestDialog: this.scope.requestDialog,
        visibleDialog: createAutoDialogSelector(this.dialogStore, promptInputStoreFor(this.session)),
      }),
    );
    messages.push(
      startCrossSessionHoldReceipt({
        clock: this._clock,
        transcript,
        queue: messageQueue,
      }),
    );
    messages.push(
      registerReplyYieldNotices({
        transcript,
      }),
    );
    messages.push(
      syncJobStateName({
        session: this.session,
        storageV5: this.storageV5,
        credentials: this.credentials,
        setAppState: store.setState,
        onYieldedName: (name, reason) => {
          let notice = sessionNameYieldedNotice(reason, name);
          if (!getMaterializedSessionFile()) {
            this._requireHost().addNotification({
              key: "session-name-yielded",
              kind: "warning",
              text: notice,
              color: "warning",
              priority: "immediate",
              timeoutMs: 15000,
            });
            return;
          }
          transcript.apply({
            type: "append",
            messages: [createSystemMessage(notice, "notice")],
          });
        },
      }),
    );
    messages.push(
      noopController({
        store,
        dialogStore: this.dialogStore,
        queue: messageQueue,
      }),
    );
    messages.push(
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
  _releaseHookSet(hookSet, why) {
    if (this._pendingHookSet !== hookSet) return;
    this._pendingHookSet = null;
    this._publish({
      headHooksPending: false,
    });
    if (why) {
      if (this._landingHookSet === hookSet) this._landingHookSet = null;
      hookSet.run.abort();
    }
  }
  _settleHookSet(hookSet, messages) {
    if (this._pendingHookSet !== hookSet || this._landingHookSet === hookSet) return;
    let sameSession = this.session.id === hookSet.sessionId && messages.length > 0;
    switch (hookSet.run.placement) {
      case "head": {
        if (!sameSession) {
          this._releaseHookSet(hookSet, false);
          return;
        }
        this._landingHookSet = hookSet;
        let release = () => {
          if (this._landingHookSet === hookSet) this._landingHookSet = null;
          this._releaseHookSet(hookSet, false);
        };
        try {
          let count = 0;
          let appended = appendRowsWithHooks(this.transcript.conversation, messages, {
            keep: (message) => {
              if (this._landingHookSet !== hookSet) return;
              let total = count;
              count += message.length;
              this.transcript.replace((rows) => rows.toSpliced(total, 0, ...message));
            },
          });
          if (appended instanceof Promise)
            return appended.then(release, (error) => {
              if (!isAbortError(error)) logError(error);
              release();
            });
        } catch (error) {
          if (!isAbortError(error)) logError(error);
        }
        release();
        return;
      }
      case "tail": {
        this._releaseHookSet(hookSet, false);
        if (!sameSession) return;
        let snapshot = this.transcript.getSnapshot();
        let deduped = dedupeSessionStartRows(snapshot, messages);
        if (deduped.length === 0) return;
        let appended = appendRowsWithHooks(this.transcript.conversation, deduped, {
          keep: (message) => {
            let snapshot = this.transcript.getSnapshot();
            if (this.isAsRestored(snapshot))
              this._restoredStamp = transcriptStampSessionController([...snapshot, ...message]);
            this.transcript.keep({
              type: "append",
              messages: [...message],
            });
          },
        });
        if (appended instanceof Promise)
          appended.catch((error) => {
            if (!isAbortError(error)) logError(error);
          });
        return;
      }
    }
  }
  _subscribeHookSet(hookSet) {
    hookSet.run.promise.then(
      (messages) => this._settleHookSet(hookSet, messages),
      () => this._releaseHookSet(hookSet, false),
    );
  }
  awaitPendingHooks = () => {
    let _pendingHookSet = this._pendingHookSet;
    if (!_pendingHookSet) return;
    if (this.session.id !== _pendingHookSet.sessionId) {
      this._releaseHookSet(_pendingHookSet, true);
      return;
    }
    return _pendingHookSet.run.promise.then((result) => this._settleHookSet(_pendingHookSet, result));
  };
  deferHookMessages = (run) => {
    this.releasePendingHookMessages();
    let hookSet = {
      run: startHookRun("head", run),
      sessionId: this.session.id,
    };
    this._pendingHookSet = hookSet;
    this._publish({
      headHooksPending: true,
    });
    this._subscribeHookSet(hookSet);
    if (this._disposed) this._releaseHookSet(hookSet, true);
  };
  releasePendingHookMessages = () => {
    let _pendingHookSet = this._pendingHookSet;
    if (_pendingHookSet) this._releaseHookSet(_pendingHookSet, true);
  };
  get headHooksPending() {
    return this._pendingHookSet?.run.placement === "head";
  }
  isAsRestored(snapshot) {
    return this._restoredStamp === transcriptStampSessionController(snapshot);
  }
  restoreOnMount() {
    let { initialMessages, session, taskRegistry, storageV5, credentials, store, scope, messageQueue } = this;
    let askedOwnerAgain = false;
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
      askedOwnerAgain = this.askAboutSessionOwner();
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
        let adoptPromise = readAndConsumeAdoptJson(bgJobDir, {
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
        this._adoptedPrefill = adoptPromise
          .then((adopt) => adopt?.prefill)
          .catch(() => {
            return;
          });
        this._adoptedFrameLive = adoptPromise
          .then((adopt) => {
            if (adopt?.frameLive === undefined) return;
            if (bgJobDir !== undefined) recordUnresumedFrameLive(bgJobDir, adopt.frameLive, owner);
            return {
              entries: adopt.frameLive,
              jobDir: bgJobDir,
              owner,
            };
          })
          .catch(() => {
            return;
          });
        let seen = new Set();
        let reported = new Set();
        (async () => {
          try {
            let adopted = await adoptPromise;
            if (adopted) {
              let agents = await reconcileCarriedAgents(
                adopted.agents ?? [],
                {
                  initialMessages,
                  taskRegistry,
                  storageV5,
                },
                messageQueue,
              );
              seen = agents.reported;
              let { registered } = agents;
              let agentIds = new Set(registered.map((entry) => entry.agentId));
              for (let shell of adopted.shells) {
                if (shell.agentId !== undefined && !agentIds.has(shell.agentId)) {
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
                  await initTaskOutputAsSymlink(shell.taskId, shell.outputPath, (link) =>
                    logEvent("tengu_adopt_link", {
                      kind: lit_2("shell"),
                      method: fromEnum(link),
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
                adopted.cron.filter((task) => {
                  if (task.agentId !== undefined && !agentIds.has(task.agentId)) {
                    logFeatureSad("task_local_agent", "adopt_owner_skipped", {
                      skipped_kind: fromEnum("cron"),
                    });
                    return false;
                  }
                  return true;
                }),
                adopted.loopWakeFires,
              );
              let promises = [];
              for (let workflow of adopted.workflows ?? []) {
                let scriptText;
                try {
                  scriptText = {
                    ...workflow,
                    scriptPath: resolveAdoptedScriptPath(workflow.scriptPath),
                  };
                  await linkAdoptedWorkflowDir(scriptText);
                  registerAdoptedWorkflowTask(scriptText, taskRegistry);
                  promises.push(scriptText);
                  reported.add(scriptText.taskId);
                } catch (error) {
                  if (scriptText === undefined) {
                    let { scriptPath, ...rest } = workflow;
                    emitAdoptWorkflowFailed(rest, "adopt scriptPath rejected", messageQueue);
                    logFeatureSad("task_local_workflow", "adopt_scriptpath_rejected");
                    logForDebugging(`[adopt] workflow ${workflow.taskId} skipped: scriptPath rejected`, {
                      level: "warn",
                    });
                  } else {
                    emitAdoptWorkflowFailed(scriptText, "transcript link failed", messageQueue);
                    logFeatureSad("task_local_workflow", "adopt_link_failed");
                    logForDebugging(`[adopt] workflow ${workflow.taskId} skipped: ${error}`, {
                      level: "warn",
                    });
                  }
                }
              }
              if (bgJobDir !== undefined) recordUnresumedAdopt(bgJobDir, registered, promises, owner);
              this.resumeAdoptedAgents(registered, promises, bgJobDir, owner);
            }
          } finally {
            await formatOrphanSummary(
              initialMessages,
              taskRegistry,
              (task) => this.resumeOrphanedAgents(task, bgJobDir),
              seen,
              storageV5,
              undefined,
              () => ({
                kind: "runningPool",
                tools: this.scope.computeTools(),
              }),
              reported,
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
      if (!this.disableQuery && !askedOwnerAgain && store.getState().initialMessage === null)
        this.maybePromptStaleResume(initialMessages, currentRestoreSource());
    }
  }
  resumeAdoptedAgents(agents, entries, bgJobDir, owner) {
    let { store, taskRegistry, storageV5, messageQueue } = this;
    waitForStoreState(store, mcpSettledForAdopt, {
      timeoutMs: STALE_THRESHOLD_MS / 4,
    })
      .then(() => {
        if (!isActingAsBgJob() || getBgJobDir() !== bgJobDir) {
          logForDebugging(
            "[adopt] deferred resume skipped: takeover released or replaced during MCP-settle wait",
          );
          return;
        }
        if (bgJobDir !== undefined && (agents.length > 0 || entries.length > 0)) {
          let known = takeUnresumedAdopt(bgJobDir, owner);
          if (known.agents.length === 0 && known.workflows.length === 0) {
            logForDebugging(
              "[adopt] deferred resume skipped: parked entries already taken by the exit handoff or a later consume",
            );
            return;
          }
        }
        let { canUseTool } = this._requireHost();
        let { toolState } = this._buildIdleToolUseContext();
        let permissionMode = store.getState().toolPermissionContext.mode;
        for (let entry of entries)
          resumeCarriedWorkflow(
            entry,
            {
              taskRegistry,
              toolState,
              permissionMode,
            },
            messageQueue,
          );
        for (let agent of agents)
          resumeAgentBackground({
            agentId: agent.agentId,
            prompt: agent.description ?? "(resumed agent)",
            continueInterruptedTurn: true,
            toolUseContext: this._buildIdleToolUseContext(),
            canUseTool,
          })
            .then((result) => {
              if (isResumeDenied(result)) {
                try {
                  logFeatureSad("task_local_agent", "adopt_resume_denied");
                  emitAdoptAgentDenied(agent, result.deniedByPlugin, taskRegistry, messageQueue);
                } catch (error) {
                  logError(error);
                }
                return;
              }
              if (!result.alreadyCompleted)
                syncLiveInFlightSnapshot(summarizeBackgroundWork(taskRegistry.all()), storageV5);
            })
            .catch((error) => {
              taskRegistry.remove(agent.agentId);
              emitAdoptAgentFailed(agent, "resume failed", taskRegistry, messageQueue);
              logFeatureSad("task_local_agent", "adopt_resume_failed");
              if (error instanceof ResumeAgentStateError) {
                logForDebugging(`[adopt] agent ${agent.agentId} resume skipped: ${error.message}`, {
                  level: "warn",
                });
                return;
              }
              logError(error);
            });
      })
      .catch(logError);
  }
  resumeOrphanedAgents(agents, bgJobDir) {
    let { store, taskRegistry, storageV5 } = this;
    waitForStoreState(store, mcpSettledForAdopt, {
      timeoutMs: STALE_THRESHOLD_MS / 4,
    })
      .then(() => {
        if (!isActingAsBgJob() || getBgJobDir() !== bgJobDir) {
          logForDebugging(
            "[orphan-resume] deferred auto-resume skipped: takeover released or replaced during MCP-settle wait",
          );
          return;
        }
        let { canUseTool } = this._requireHost();
        for (let agent of agents)
          resumeAgentBackground({
            agentId: agent.agentId,
            prompt: agent.description,
            continueInterruptedTurn: true,
            toolUseContext: this._buildIdleToolUseContext(),
            canUseTool,
            isWebFetchLaunch: agent.isWebFetchLaunch,
          })
            .then((outcome) => {
              if (isResumeDenied(outcome)) {
                try {
                  logFeatureSad("task_local_agent", "orphan_auto_resume_denied");
                  formatAgentRestartFailedNotice(
                    this._orphanAsThisSessionSeesIt(agent),
                    outcome.deniedByPlugin,
                  );
                } catch (error) {
                  logError(error);
                }
                return;
              }
              if (outcome.alreadyCompleted) {
                formatOrphanedAgentNotification(
                  {
                    ...this._orphanAsThisSessionSeesIt(agent),
                    outputFile: agent.outputFile ?? outcome.outputFile,
                  },
                  taskRegistry,
                );
                return;
              }
              formatAgentRestartedNotice(agent);
              syncLiveInFlightSnapshot(summarizeBackgroundWork(taskRegistry.all()), storageV5);
            })
            .catch((error) => {
              logFeatureSad("task_local_agent", "orphan_auto_resume_failed");
              formatAgentRestartFailedNotice(this._orphanAsThisSessionSeesIt(agent), errorMessage(error));
              if (error instanceof ResumeAgentStateError) {
                logForDebugging(
                  `[orphan-resume] agent ${agent.agentId} auto-resume failed: ${error.message}`,
                  {
                    level: "warn",
                  },
                );
                return;
              }
              logError(error);
            });
      })
      .catch(logError);
  }
  _orphanAsThisSessionSeesIt(task) {
    try {
      return withResumeCapabilities(task, {
        kind: "runningPool",
        tools: this.scope.computeTools(),
      });
    } catch (error) {
      logError(
        Error("resumeOrphanedAgents: reading the tool pool threw", {
          cause: error,
        }),
      );
      return task;
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
  discloseUnattendedActivity = (text) => {
    let { taskRegistry } = this;
    let replies = drainUnattendedReplies();
    if (replies.total === 0) return;
    let filtered = Object.values(taskRegistry.all()).filter(isCarriedFrameLiveWatch);
    let env = claudeAiEnvironment();
    let mapped = [...replies.bySlug.keys()]
      .map((slug) => ({
        slug,
        url: artifactViewerUrlFor({
          slug,
          env,
        }),
      }))
      .filter(({ slug, url }) => parseArtifactUrl(url)?.slug === slug)
      .map(({ url }) => url);
    let where = replies.bySlug.size === 1 && mapped.length === 1 ? ` on ${mapped[0]}` : "";
    let shortcutDisplay = getShortcutDisplay("chat:killAgents", "Chat", "ctrl+x ctrl+k");
    let stop =
      filtered.length > 0 || text?.willRearm === true || getAutoReactSlugs().size > 0
        ? ` To turn off automatic replies, stop the Artifact comment monitor task, or press ${shortcutDisplay} twice to turn them off for this session.`
        : "";
    this.transcript.apply({
      type: "append",
      messages: [
        formatAutoReplyNotice(replies.total, {
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
        emit: (messages) =>
          this.transcript.apply({
            type: "append",
            messages: [...messages],
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
        getKnownVer: (path) => mainObservedArtifactVersion(store.getState(), path),
        commentsGateOpen: () =>
          require("../../services/artifacts/artifactToolSchema.js").artifactCommentsPromptGateOpen(),
        mayRequestTakeover: () => true,
        jobHolderVerdicts: probeAdoptedJob,
        carried: {
          adopted: this._adoptedFrameLive?.then((frame) => {
            if (frame === undefined) return;
            let { entries, jobDir, owner } = frame;
            return {
              entries,
              park:
                jobDir === undefined
                  ? undefined
                  : {
                      take: () => takeUnresumedFrameLive(jobDir, owner),
                      repark: (agent) => reparkUnresumedFrameLive(jobDir, agent, owner),
                      release: (agent) => releaseReparkedFrameLive(jobDir, agent, owner),
                    },
            };
          }),
          discloseUnattended: (text) => this.discloseUnattendedActivity(text),
          onCarriedArmed: () => {
            if (isBgSession())
              syncLiveInFlightSnapshot(summarizeBackgroundWork(taskRegistry.all()), storageV5);
          },
        },
      },
    );
  }
  rewindConversationTo(messages, uuid) {
    let { transcript, scope, store, turn } = this;
    let messages_2 = transcript.getSnapshot();
    let messageIndex = findMessageIndex(messages_2, messages);
    if (messageIndex === -1) return;
    let messages_3 = messages_2.slice(0, messageIndex);
    let sliced = messages_2.slice(messageIndex);
    noopLedger(getStickyBetas(), "rewind");
    cancelOnConversationReset(uuid);
    let restore = decideRefusalFallbackRestore({
      keptMessages: messages_3,
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
    if (uuid !== "auto_restore_cancel") resetPickerState(scope.memorySelector);
    logEvent("tengu_conversation_rewind", {
      preRewindMessageCount: messages_2.length,
      postRewindMessageCount: messageIndex,
      messagesRemoved: messages_2.length - messageIndex,
      rewindToMessageIndex: messageIndex,
      source: fromEnum(uuid),
    });
    notePendingConversationEdit("rewind");
    transcript.cut();
    transcript.replace(messages_3);
    if (!this.runsNoModelTurn)
      try {
        let cronRow = cronCarryAttachment(messages_3, sliced);
        if (cronRow !== null)
          transcript.apply(
            {
              type: "append",
              messages: [cronRow],
            },
            "held",
          );
      } catch (error) {
        logError(error);
      }
    try {
      let marker = threadAskMarkerFor(messages_3);
      if (marker !== null)
        transcript.apply(
          {
            type: "append",
            messages: [createAttachmentMessage(marker)],
          },
          "held",
        );
    } catch (error) {
      logError(error);
    }
    setLastMainThreadContextTokens(contextTokensOf(messages_3));
    setLastCacheSafeForkMessages(messages_3);
    this.bumpConversationId();
    if (uuid === "message_selector") this.#s.repin(true, "rewind");
    this._resetTurnEventTail();
    turn.resetForConversation({
      kind: "rewound",
    });
    this._discardDetachedToolCallsOutside(messages_3);
    clearPendingContextCompacted();
    if (restore) {
      if (restore.clearLatch) clearRefusalFallbackOccurred();
      if (restore.model.action === "restore") setMainLoopModelOverride(restore.model.value);
      logEvent("tengu_refusal_fallback_rewind_unwind", {
        action: fromEnum(
          restore.model.action === "restore"
            ? "model_restored"
            : restore.model.reason === "not_first_party"
              ? "model_kept_3p"
              : "model_kept_writer_mismatch",
        ),
        ...(restore.model.action === "restore" && {
          restored_from: fromEnum(restore.model.restoredFrom),
        }),
        latch_cleared: restore.clearLatch,
        banners_sliced: restore.bannersSliced,
        model_scope: fromEnum(classifyFallbackOrigin(restore.lastSlicedFallbackModel)),
        source: fromEnum(uuid),
      });
    }
    let a =
      restore && restore.model.action === "restore"
        ? {
            mainLoopModel: restore.model.value,
          }
        : undefined;
    let fastMode = store.getState().fastMode;
    let b = a && isFastModeEnabled() ? isFastModeActive(a.mainLoopModel, fastMode) : undefined;
    let c =
      uuid === "auto_restore_cancel"
        ? null
        : rebuildArtifactCarryAfterRewind(
            messages_3,
            isResumeFrameSeedEligible() && this.conversationOrigin === "local",
          );
    store.setState((state) => ({
      ...(uuid === "auto_restore_cancel"
        ? state
        : rehydrateSession(messages_3, state, {
            restoreAgentNames: false,
          })),
      ...c,
      ...a,
      ...(b !== undefined && {
        fastMode: b,
      }),
      toolPermissionContext:
        messages.permissionMode && state.toolPermissionContext.mode !== messages.permissionMode
          ? {
              ...state.toolPermissionContext,
              mode: messages.permissionMode,
            }
          : state.toolPermissionContext,
      promptSuggestion: {
        status: "empty",
      },
      ...(findLastRealAssistantMessage(messages_3) === undefined && {
        cacheMissAckedAtOutputTokens: getTotalOutputTokens(),
      }),
    }));
    if (b !== undefined) reportFastModeToggle(fastMode, b);
    logFeatureOk("repl_rewind_conversation", {
      source: fromEnum(uuid),
    });
  }
  restoreMessageSync = (entry, entry_2, prior = []) => {
    let lastPrior = prior[0];
    if (lastPrior === undefined) {
      this.rewindConversationTo(entry, entry_2);
      this.restoreDraftFrom(entry);
      return;
    }
    let restoredDrafts;
    try {
      restoredDrafts = this.recordDraftsOf([...prior, entry]);
    } catch (error) {
      logError(error);
      this.rewindConversationTo(entry, entry_2);
      this.restoreDraftFrom(entry);
      return;
    }
    this.rewindConversationTo(lastPrior, entry_2);
    this.fillDraftFrom(restoredDrafts);
  };
  restoreDraftsFrom = (entries) => {
    let [first, ...rest] = entries;
    if (first !== undefined && rest.length === 0) {
      this.restoreDraftFrom(first);
      return;
    }
    this.fillDraftFrom(this.recordDraftsOf(entries));
  };
  recordDraftsOf(messages) {
    return messages.map((message) => {
      let blank = {
        value: "",
        pastedContents: {},
      };
      this.restoreDraftInto(message, {
        replaceValue: (value) => {
          blank.value = value;
        },
        setMode: () => {},
        setPastedContents: (pastedContents) => {
          blank.pastedContents = pastedContents;
        },
      });
      return blank;
    });
  }
  fillDraftFrom(message) {
    this.draft.replaceValue(message.reduce((acc, acc2) => appendLine(acc, acc2.value), ""));
    this.draft.setMode("prompt");
    let pastes = {};
    for (let row of message) pastes = mergeTurnTags(pastes, Object.values(row.pastedContents));
    if (Object.keys(pastes).length > 0) this.draft.setPastedContents(pastes);
  }
  restoreDraftFrom = (entry) => {
    this.restoreDraftInto(entry, this.draft);
  };
  restoreDraftInto(entry, index) {
    let { _setAppState } = this;
    this.#r.restoreIdeSelectionConsumedBy(entry.uuid);
    let modeFromInput = getModeFromInput(entry);
    let mode = modeFromInput
      ? modeFromInput.mode === "prompt"
        ? readPromptText(modeFromInput.text)
        : {
            text: modeFromInput.text,
            pastedContents: {},
          }
      : undefined;
    if (modeFromInput && mode) {
      index.replaceValue(mode.text);
      index.setMode(modeFromInput.mode);
      if (Object.keys(mode.pastedContents).length > 0) index.setPastedContents(mode.pastedContents);
    }
    if (Array.isArray(entry.message.content)) {
      let content = entry.message.content.filter((block) => isObjectBlock(block) && block.type === "image");
      if (content.length > 0) {
        let { stamped, manufactured } = restorePastedImageContents(content, entry.imagePasteIds);
        let before = renumberPastedContents({
          display: mode?.text ?? "",
          pastedContents: manufactured,
          allowCurrentEpochSkip: false,
        });
        let after = renumberPastedContents({
          display: before.display,
          pastedContents: stamped,
          allowCurrentEpochSkip: true,
        });
        let pastes = {
          ...before.pastedContents,
          ...after.pastedContents,
        };
        if (mode && after.display !== mode.text) index.replaceValue(after.display);
        let stored = setSliceField(_setAppState, "storedImagePaths");
        for (let paste of Object.values(pastes))
          if (stamped[paste.id] === undefined && manufactured[paste.id] === undefined) {
            recordImagePath(paste, stored);
            storeImageAndRecord(paste, stored);
          }
        index.setPastedContents({
          ...mode?.pastedContents,
          ...pastes,
        });
      }
    }
  }
  handleRestoreMessage = async (messages, index) => {
    setImmediate((fn, a, b) => fn(a, b), this.restoreMessageSync, messages, index);
  };
  handleSummarize = async (messages, userFeedback, direction = "from") => {
    let { transcript, turn, _setAppState, draft } = this;
    let { mainLoopModel, addNotification } = this._requireHost();
    let replace = transcript.replace;
    let messages_2 = messagesSinceCompactBoundary(transcript.getSnapshot());
    let pivotIndex = findMessageIndex(messages_2, messages);
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
    let context = turn.buildToolUseContext(messages_2, [], abortController, mainLoopModel);
    let cacheSafeParams = await buildCompactCacheSafeParams({
      toolUseContext: context,
      forkContextMessages: messages_2,
      mainThreadAgentDefinition: this.scope.mainThreadAgentDefinition,
    });
    let compacted = await partialCompactConversation(messages_2, pivotIndex, context, cacheSafeParams, {
      userFeedback,
      direction,
      onNotification: addNotification,
      onResponseLength: turn.stream.onResponseLength,
    });
    let postCompactMessages = buildPostCompactMessages_2(compacted, direction);
    if (this.#n === "fullscreen" && direction === "from")
      replace((rows) => {
        let messageIndexByUuid = findMessageIndexByUuid(rows, messages.uuid);
        return [...rows.slice(0, messageIndexByUuid === -1 ? 0 : messageIndexByUuid), ...postCompactMessages];
      });
    else {
      replace(postCompactMessages);
      this.bumpConversationId();
    }
    _setAppState((state) => pruneDisplayedContent(state, transcript.getSnapshot()));
    setLastCacheSafeForkMessages(postCompactMessages);
    cleanupAfterCompaction(
      context.session,
      context.options.querySource,
      _setAppState,
      undefined,
      undefined,
      context.storageV5,
    );
    if (direction === "from") {
      let modeFromInput = getModeFromInput(messages);
      if (modeFromInput) {
        let branch =
          modeFromInput.mode === "prompt"
            ? readPromptText(modeFromInput.text)
            : {
                text: modeFromInput.text,
                pastedContents: {},
              };
        draft.replaceValue(branch.text);
        draft.setMode(modeFromInput.mode);
        if (Object.keys(branch.pastedContents).length > 0) draft.setPastedContents(branch.pastedContents);
        this.#r.restoreIdeSelectionConsumedBy(messages.uuid);
      }
    }
    let hint = leadingCompactHint(
      transcript.getSnapshot(),
      compacted.boundaryMarker.uuid,
      getShortcutDisplay("app:toggleTranscript", "Global", "ctrl+o"),
    );
    addNotification({
      key: "summarize-ctrl-o-hint",
      kind: "contextual",
      text: `Conversation summarized${hint}`,
      priority: "medium",
      timeoutMs: 8000,
    });
  };
  #a() {
    if (isRemoteSessionAvailable())
      return Error("a thin client's conversation lives on the remote session; compact it there");
    if (this.turn.getSnapshot().isExternalLoading)
      return Error("an external turn is driving the conversation; it compacts between turns");
    return null;
  }
  async #c() {
    try {
      let { isHeldInAnotherPidDomain, listRegisteredSessionRecords } =
        await import("../../utils/udsMessaging/SessionRecordsUnreadableError.lazy.js");
      let records = await listRegisteredSessionRecords();
      let sessionId = getSessionId();
      if (await isHeldInAnotherPidDomain(records, sessionId)) return true;
      let { verdict } = await findLiveReplyHolder({
        records,
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
  async #d() {
    if (isTranscriptPersistenceDisabled()) return null;
    let transcriptTailForTip = await readTranscriptTailForTip(getSessionId(), this.storageV5);
    let uuid =
      transcriptTailForTip === null ? undefined : extractLastSyncedEventUuid(transcriptTailForTip.content);
    if (uuid === undefined) return "transcript_unreadable";
    return this.transcript.getSnapshot().some((row) => row.uuid === uuid) ? null : "transcript_advanced";
  }
  #u = {
    refusal: async () => {
      if (await this.#c()) return "held_elsewhere";
      let result = await this.#d();
      if (result !== null) return result;
      if (this.#a() !== null || this.turn.guard.isActive || this.#l.asking()) return "busy";
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
        (state) => {
          if (state.skip !== undefined) return null;
          this.transcript.apply({
            type: "append",
            messages: [createSystemMessage(COMPACTED_WHILE_IDLE_TEXT, "notice")],
          });
          return {
            tokensBefore: state.tokensBefore,
            tokensAfter: state.tokensAfter,
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
    let x = this.#a();
    if (x !== null) throw x;
    let handle = turn.guard.isActive ? null : turn.guard.tryStart();
    if (handle === null) throw Error("a turn is in flight; the conversation compacts between turns");
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
      let { compactManually } = await compactNonInteractiveCommand.load();
      let result = await compactManually(toolUseContext, {
        customInstructions: instructions,
        mainThreadAgentDefinition: scope.mainThreadAgentDefinition,
        trigger: origin === undefined ? "auto" : "plugin",
        origin,
      });
      if (result.type === "skipped")
        return {
          skip: result.reason,
        };
      if (result.type !== "compact")
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          result.type === "text" ? result.value : "the compaction produced no summary",
          "plugin compaction refused",
        );
      if (turn.guard.generation !== handle && turn.guard.isActive)
        throw Error("a newer turn began before the compaction could be applied");
      let postCompactMessages = buildPostCompactMessages({
        ...result.compactionResult,
        messagesToKeep: result.compactionResult.messagesToKeep.map(getTokenCountFromUsage_6),
      });
      let beforeUuids = new Set(snapshot.map((row) => row.uuid));
      let afterUuids = new Set(postCompactMessages.map((postCompactMessage) => postCompactMessage.uuid));
      let keepRest = (row) => row.filter((row) => !beforeUuids.has(row.uuid) && !afterUuids.has(row.uuid));
      if (this.#n === "fullscreen")
        transcript.replace((rows) => [
          ...rows.filter((row) => beforeUuids.has(row.uuid) && !afterUuids.has(row.uuid)),
          ...postCompactMessages,
          ...keepRest(rows),
        ]);
      else {
        transcript.replace((rows) => [...postCompactMessages, ...keepRest(rows)]);
        this.bumpConversationId();
      }
      _setAppState((state) => pruneDisplayedContent(state, transcript.getSnapshot()));
      setLastCacheSafeForkMessages(messagesSinceCompactBoundary(transcript.getSnapshot()));
      let hint = leadingCompactHint(
        transcript.getSnapshot(),
        result.compactionResult.boundaryMarker.uuid,
        getShortcutDisplay("app:toggleTranscript", "Global", "ctrl+o"),
      );
      addNotification({
        key: "summarize-ctrl-o-hint",
        kind: "contextual",
        text: `Conversation compacted${hint}`,
        priority: "medium",
        timeoutMs: 8000,
      });
      return result.result;
    } finally {
      turn.guard.end(handle);
      if (turn.getSnapshot().abortController === abortController) turn.setAbortController(null);
    }
  };
  async onInit() {
    let { session, scope, engine, storageV5, credentials } = this;
    scope.apiKeyVerification.verify({
      credentials,
      storageV5,
    });
    let disabled = isClaudeMdLoadingDisabled()
      ? []
      : await getMemoryFilesCached(session, false, storageV5, credentials);
    if (disabled.length > 0) {
      let joined = disabled.map(
        (a) =>
          `  [${a.type}] ${a.path} (${a.content.length} chars)${a.parent ? ` (included by ${a.parent})` : ""}`,
      ).join(`
`);
      logForDebugging(`Loaded ${disabled.length} CLAUDE.md/rules files:
${joined}`);
    } else logForDebugging("No CLAUDE.md/rules files found");
    let results = await Promise.all(
      disabled
        .filter((file) => !isManagedOrVirtualPath(file.path))
        .map(async (file) => {
          let inject = shouldInjectMemoryFile(file);
          let seedTs = await getReadTimestamp(file, inject, storageV5);
          return {
            file,
            injected: inject,
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
//@ chunk-czq1j3j2.js:451081-451138 placement
function offersLookUp(resumed, pin) {
  return (
    pin !== null &&
    canLookUpPrevious(resumed, pinSessionId(getSessionId())) &&
    isPreviousConversationPointerAllowed()
  );
}
//@ chunk-czq1j3j2.js:451138-451184 placement
function canLookUpPrevious(messages, pin) {
  return !isRemoteOrBridgeSession(pin) && !messages.some(isForeignToBridgeSession);
}
//@ chunk-czq1j3j2.js:451184-451265 layout
function finishToolsCapture(toolsCapture) {
  if (toolsCapture === null) return [];
  toolsCapture.ledger.endCapture(toolsCapture.names);
  return toolsCapture.names;
}
//@ chunk-czq1j3j2.js:451265-451311 placement
function isRemoteOrBridgeSession(pin) {
  return isRemoteEgressSuppressedFor(pin) || bridgeSessionForPulledWindow(pin) !== undefined;
}
//@ chunk-czq1j3j2.js:451311-451382 placement
function findMessageIndex(messages, message) {
  let index = messages.lastIndexOf(message);
  return index !== -1 ? index : findMessageIndexByUuid(messages, message.uuid);
}
//@ chunk-czq1j3j2.js:451382-451477 placement
function isForeignToBridgeSession(message) {
  return "foreignToBridgeSession" in message && typeof message.foreignToBridgeSession === "string";
}
export {
  appendLine,
  SessionController,
  DIALOG_KINDS_PLACEHOLDER,
  workflowDialogKindsModule,
  dialogKindsModuleA,
  dialogKindsModuleB,
  artifactsMcpEntryModule,
  bridgeCoordinatorModule,
  workflowPermissionDialog,
  restorePromptAfterCancel,
};
