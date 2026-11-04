/**
 * hooks/useCancelRequest.ts
 *
 * 取消请求处理器（Esc/Ctrl+C）：中断当前回合、取消待定唤醒/队友、处理排队命令。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useCancelRequest.ts
 * pieces: chunk-18hwfzwa.js (4)
 * attribution: sole-consumer 1, affinity 2, fingerprint 1
 */
import { isZincHarborOn, clearHeldInput } from "../plugins/functionHooks/inputHold.js";
import { taskAbortController } from "../tasks/taskKinds.js";
import {
  isInterruptibleBackgroundSubagent,
  interruptBackgroundSubagent,
  isObserverAgentTask,
  markAgentNotified,
  killAsyncAgent,
  killAllRunningAgentTasks,
} from "../tasks/LocalAgentTask/LocalAgentTask.js";
import {
  stopAgentFromUi,
  isAgentPanelTask,
  isLiveAgentOrTeammateTask,
  interruptIfStoppable,
  stopTask,
  liveDocWatchController,
  KILL_AGENTS_CONFIRM_MS,
} from "../components/tasks/stopTask.js";
import { isLocalAgent, exitTeammateView } from "../state/teammateViewHelpers.js";
import { isInProcessTeammateTask } from "../tasks/InProcessTeammateTask/types.js";
import { interruptTeammateWork } from "../utils/inProcessTeammateHelpers.js";
import { plural } from "../utils/stringUtils.js";
import { mainAgentId, onSessionCronsChange } from "../bootstrap/state.js";
import { useAppStoreDirect, useSetAppState, useAppState } from "../state/AppState.js";
import { useSpinnerStore } from "../components/Spinner/spinnerStatus.js";
import { useSetVoiceState } from "../context/voice.js";
import { useSession } from "../context/session.js";
import { useCallback, useRef, useSyncExternalStore } from "../../vendor/react/cjs/react.production.js";
import {
  useShadowedFooterActionHandler,
  isPanelOrTeammateTask,
} from "../components/CoordinatorAgentStatus.js";
import { useStoreSelector } from "./useStoreSelector.js";
import { detachedCallSlots } from "../services/tools/detachedToolCalls.js";
import { useTheme_2 } from "../components/design-system/ThemeProvider.js";
import { useCommandQueueOrDefault, useQueuedMessageText } from "../context/QueuedMessageContext.js";
import { useCommandQueue } from "../components/Messages.js";
import { useNotifications } from "../context/notifications.js";
import { hasLoopTask, syncLoopTickState } from "../utils/loop/loopWakeups.js";
import { isBgSession } from "../utils/concurrentSessions.js";
import { renderWithForceUpdate } from "./useForceRender.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { useQuotaAutoResumeState } from "../components/rateLimit/quotaAutoResume.js";
import {
  isPhaseActive,
  hasPendingContinuation,
  isAutoArmedByItself,
} from "../services/quotaAutoResume/quotaAutoResume.js";
import {
  isClaimableAutoReactSubscription,
  hasStoppableAutoReactSupervision,
  killAutoReactSubscriptions,
} from "../services/artifacts/frameLive.js";
import {
  processQueuedCommands as processQueuedCommands_4,
  artifactWatchStopNotice,
  drainQueuedTaskNotifications,
  activeArtifactConnections,
  emptyPartitionedNotifications,
  partitionStopNotifications,
  leaveArtifactRooms,
  dropNonDurableStopDisclosures,
  requeueStopNotifications,
} from "../tasks/MonitorWsTask/MonitorWsTask.js";
import { markStoppedByUser } from "../tasks/stopTask.js";
import { killInProcessTeammate } from "../utils/swarm/spawnInProcess.js";
import { emitTaskNotification } from "../utils/task/taskNotifications.js";
import { getEffortLevelIfSupported } from "../utils/effort.js";
import { getMainLoopModel } from "../utils/model/model.js";
import { lit as lit_2, fromEnum } from "../services/analytics/safeMetadata.js";
import { sanitizeMarkName } from "../utils/startupMarks.js";
import { promptInputValue } from "../state/promptInputStore.js";
import { cancelQuotaAutoResumeWithNotice } from "./useChromeExtensionNotification.js";
import { logEvent } from "../services/analytics/index.js";
import { hasModeCharCommand, shouldPrependModeChar } from "../utils/messageQueueManager.js";
import { clearSummonWakeTimers, bumpScanGeneration } from "../services/artifacts/summonArms.js";
import { useSecondOverlayKeys, useOverlayKeys } from "../context/overlayContext.js";
import { useDialogOfKind } from "../state/dialogQueue.js";
import { LOCAL_JSX_DIALOG } from "../commands/rate-limit-options/index.js";
import { LayoutOverflow } from "../ink/layout/node.js";
import { useKeybinding } from "../keybindings/useKeybinding.js";
import {
  pairingForObserver,
  MAIN_OBSERVED_KEY,
  stopMainObservers,
} from "../services/agentObserver/agentObserver.js";
import { isAutoreactArmed } from "../services/artifacts/comments/postReply.js";
import { isScreeningPendingEntry } from "../utils/historyFile.js";
import { alwaysFalseTool } from "../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { isPollEventMode } from "../utils/pollEvents.js";
import { recordSubmittedPrompts } from "../history.js";
import { withExpandedPastes } from "../utils/hooks/postSamplingHooks.js";
import { isBuiltInArtifactHiddenForMcp } from "../services/artifacts/artifactsMcpTools.js";
import { formatTaskNotification } from "../utils/xmlTags.js";
import { escapeXml_2 as escapeXml } from "../utils/confusables.js";
import { stoppedAfterAutoActionsNotice } from "../tools/ArtifactTool/artifactNotices.js";
import { getShortcutDisplay } from "../keybindings/shortcutFormat.js";

//@ chunk-18hwfzwa.js:465321-466660 sole-consumer
/**
 * 取消时中断后台子代理与队友并汇总。
 */
function interruptBackgroundWork(tasks, taskRegistry, addNotification, store, storageV5) {
  if (isZincHarborOn()) {
    let interruptedDescriptions = [];
    let stoppedDescriptions = [];
    let teammateCount = 0;
    for (let [key, value] of Object.entries(tasks)) {
      if (taskAbortController(value)) continue;
      if (isInterruptibleBackgroundSubagent(value)) {
        if (interruptBackgroundSubagent(key, taskRegistry)) {
          if (!isObserverAgentTask(value)) interruptedDescriptions.push(value.description);
        } else if (isObserverAgentTask(value)) {
          markAgentNotified(key, taskRegistry);
          killAsyncAgent(key, taskRegistry, "user");
        } else {
          stopAgentFromUi(key, value, taskRegistry, storageV5);
          stoppedDescriptions.push(value.description);
        }
      } else if (isLocalAgent(value) && value.agentType === "main-session" && value.status === "running") {
        stopAgentFromUi(key, value, taskRegistry, storageV5);
        stoppedDescriptions.push(value.description);
      } else if (isInProcessTeammateTask(value) && interruptTeammateWork(value)) teammateCount++;
    }
    if (interruptedDescriptions.length === 0 && stoppedDescriptions.length === 0 && teammateCount === 0)
      return false;
    if (interruptedDescriptions.length > 0 || stoppedDescriptions.length > 0) {
      let messages = [];
      if (interruptedDescriptions.length > 0)
        messages.push(
          `${interruptedDescriptions.length} background ${plural(interruptedDescriptions.length, "agent")} ${plural(interruptedDescriptions.length, "was", "were")} interrupted by the user and parked: ${interruptedDescriptions.map((description) => `"${description}"`).join(", ")}. Progress is preserved; resume an agent by sending it a message.`,
        );
      if (stoppedDescriptions.length > 0)
        messages.push(
          `${stoppedDescriptions.length} background ${plural(stoppedDescriptions.length, "task")} ${plural(stoppedDescriptions.length, "was", "were")} stopped by the user: ${stoppedDescriptions.map((description) => `"${description}"`).join(", ")}.`,
        );
      store.enqueuePendingNotification({
        agentId: mainAgentId(),
        value: messages.join(" "),
        mode: "task-notification",
        skipAttachments: true,
        passive: true,
        priority: "next",
      });
    }
    let parkedCount = interruptedDescriptions.length + teammateCount;
    let parts = [];
    if (parkedCount > 0)
      parts.push(
        `${parkedCount} background ${plural(parkedCount, "agent")} parked \u2014 send a message to resume`,
      );
    if (stoppedDescriptions.length > 0)
      parts.push(
        `${stoppedDescriptions.length} background ${plural(stoppedDescriptions.length, "task")} stopped`,
      );
    addNotification({
      key: "agents-parked",
      kind: "feedback",
      text: parts.join(" \xB7 "),
      priority: "immediate",
      timeoutMs: 5000,
    });
    return true;
  }
  return false;
}
//@ chunk-18hwfzwa.js:466660-466747 affinity
var noopUnsubscribeFactory = () => () => {};
var LOOP_WAKEUP_CANCELLED = "loop-wakeup-cancelled";
var LOOP_WAKEUP_CANCELLED_TEXT = "Pending wakeup cancelled";
var GESTURE_WINDOW_MS = 1000;
//@ chunk-18hwfzwa.js:466747-473810 fingerprint (2.1.88 match: CancelRequestHandler, 0.522)
function CancelRequestHandler(props) {
  let {
    onCancel,
    onAgentsKilled,
    isBackgroundTasksDialogVisible,
    screen,
    abortSignal,
    isExternalLoading = false,
    isCloudMessageHeld = false,
    popCommandFromQueue,
    isInputOverlayActive,
    isVimEditing,
    inputMode,
    isInputEmpty,
    exitDetachesToCaller = false,
    sendsPromptsElsewhere = false,
    getInFlightMessageId,
    stoppableWork,
  } = props;
  let appStoreDirect = useAppStoreDirect();
  let setAppState = useSetAppState();
  let spinnerStore = useSpinnerStore();
  let taskRegistry = useSetVoiceState();
  let session = useSession();
  let hasFooterSelection = useCallback(
    () => appStoreDirect.getState().footerSelection !== null,
    [appStoreDirect],
  );
  let shadowedFooterActionHandler = useShadowedFooterActionHandler(hasFooterSelection);
  let storeSelector = useStoreSelector(detachedCallSlots.of(session), hasRunningTask);
  let { storageV5 } = useTheme_2();
  let store = useCommandQueueOrDefault();
  let setAppState_2 = useCommandQueue();
  let { addNotification, removeNotification } = useNotifications();
  let lastKillAgentsPressRef = useRef(0);
  let viewSelectionMode = useRef(0);
  let viewSelectionMode_2 = useAppState((state) => state.viewSelectionMode);
  let queuedMessageText = useQueuedMessageText();
  let handleCancel = useSyncExternalStore(onSessionCronsChange, hasLoopTask);
  let exitDetaches = exitDetachesToCaller || isBgSession();
  let calmRiddleEnabled = renderWithForceUpdate(() =>
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_calm_riddle", true),
  );
  let detachesAndCalm = exitDetaches && calmRiddleEnabled;
  let canCancel = handleCancel && !detachesAndCalm;
  let phase = useQuotaAutoResumeState().phase;
  let isPhaseActiveNow = isPhaseActive(phase);
  let isIdleInPhase = isPhaseActiveNow && isInputEmpty === true;
  let isArmedOrStale = phase === "armed" || phase === "stale";
  let hasAgentPanelTask = useAppState((state) => Object.values(state.tasks).some(isAgentPanelTask));
  let killAllAgentsAndNotify = useCallback(
    (state) =>
      stoppableWork === undefined ? noopUnsubscribeFactory() : stoppableWork.onOutstandingChange(state),
    [stoppableWork],
  );
  let hasStoppableWork = useSyncExternalStore(
    killAllAgentsAndNotify,
    () => (stoppableWork?.stoppable() ?? 0) > 0,
  );
  let shouldPrependModeChar_2 = useAppState((state) =>
    Object.values(state.tasks).some(isClaimableAutoReactSubscription),
  );
  let any = setAppState_2.some(processQueuedCommands_4);
  let handleCancelPress = useCallback(
    ({ passive }) => {
      let tasks = appStoreDirect.getState().tasks;
      let running = Object.entries(tasks).filter(([, t]) => isLiveAgentOrTeammateTask(t));
      if (running.length === 0) return false;
      for (let [taskId, handle] of running) {
        markAgentNotified(taskId, taskRegistry);
        if (isLocalAgent(handle) && !isObserverAgentTask(handle))
          markStoppedByUser(taskId, taskRegistry, storageV5);
      }
      killAllRunningAgentTasks(tasks, taskRegistry, "user");
      for (let [taskId, task] of running)
        if (task.type === "in_process_teammate")
          killInProcessTeammate(taskId, taskRegistry, setAppState, storageV5);
      let descriptions = [];
      for (let [taskId, task] of running) {
        if (isObserverAgentTask(task)) continue;
        descriptions.push(task.description);
        if (task.type === "in_process_teammate") continue;
        emitTaskNotification(taskId, "stopped", {
          toolUseId: task.toolUseId,
          summary: task.description,
        });
      }
      if (descriptions.length === 0) {
        onAgentsKilled();
        return true;
      }
      let summary =
        descriptions.length === 1
          ? `Background agent "${descriptions[0]}" was stopped by the user.`
          : `${descriptions.length} background agents were stopped by the user: ${descriptions.map((description) => `"${description}"`).join(", ")}.`;
      store.enqueuePendingNotification({
        agentId: mainAgentId(),
        value: summary,
        mode: "task-notification",
        skipAttachments: true,
        ...(passive && {
          passive: true,
          priority: "next",
        }),
      });
      onAgentsKilled();
      return true;
    },
    [appStoreDirect, onAgentsKilled, taskRegistry, setAppState, store, storageV5],
  );
  let handleInterrupt = useCallback(
    ({ gesture, suppressBackgroundAgentKill = false, pressLandedOnWork = false }) => {
      let handleKillAgents = getEffortLevelIfSupported(getMainLoopModel(), queuedMessageText);
      let inFlightMessageId = getInFlightMessageId?.();
      let killOptions = {
        source: lit_2("escape"),
        streamMode: fromEnum(spinnerStore.get().mode),
        ...(handleKillAgents && {
          effort_level: fromEnum(handleKillAgents),
        }),
        ...(inFlightMessageId && {
          message_id: sanitizeMarkName(inFlightMessageId),
        }),
      };
      let isBusy = (abortSignal !== undefined && !abortSignal.aborted) || isExternalLoading;
      let isHardInterrupt = gesture === "ctrl_c" && detachesAndCalm && !isBusy;
      let tickValue = isHardInterrupt ? 0 : syncLoopTickState();
      if (tickValue > 0)
        addNotification({
          key: LOOP_WAKEUP_CANCELLED,
          kind: "feedback",
          text: LOOP_WAKEUP_CANCELLED_TEXT,
          priority: "immediate",
          timeoutMs: 8000,
          requeueOnPreempt: true,
          invalidates: [LOOP_WAKEUP_CANCELLED],
        });
      let isInputEmptyNow = promptInputValue(session) === "";
      let allowAgentKill = !suppressBackgroundAgentKill || isInputEmptyNow;
      let hasPendingContinuationNow = hasPendingContinuation() && allowAgentKill;
      let unusedFlag = false;
      if (hasPendingContinuationNow) {
        cancelQuotaAutoResumeWithNotice(addNotification, gesture);
        unusedFlag = true;
      }
      if (isAutoArmedByItself() && allowAgentKill) {
        cancelQuotaAutoResumeWithNotice(addNotification, gesture);
        unusedFlag = true;
      }
      if (isBusy || (isCloudMessageHeld && isInputEmptyNow)) {
        viewSelectionMode.current = Date.now();
        logEvent("tengu_cancel", killOptions);
        detachedCallSlots.of(session).stopRunning();
        onCancel();
        return true;
      }
      if (isInputEmptyNow && detachedCallSlots.of(session).stopRunning() > 0) {
        viewSelectionMode.current = Date.now();
        logEvent("tengu_cancel", killOptions);
        return true;
      }
      let any = Object.values(appStoreDirect.getState().tasks).some(isClaimableAutoReactSubscription);
      let any_2 = store.getCommandQueueSnapshot().some(processQueuedCommands_4);
      let shouldDrain =
        !suppressBackgroundAgentKill &&
        (hasAgentPanelTask || any || any_2 || hasStoppableAutoReactSupervision());
      let canPopQueuedModeCommand =
        hasModeCharCommand(store, isInputEmptyNow) && popCommandFromQueue !== undefined;
      let hasTickTarget = tickValue > 0;
      let isInterruptible =
        shouldDrain ||
        canPopQueuedModeCommand ||
        hasTickTarget ||
        (isHardInterrupt && hasLoopTask()) ||
        pressLandedOnWork ||
        abortSignal !== undefined ||
        Date.now() - viewSelectionMode.current < GESTURE_WINDOW_MS;
      if (isArmedOrStale && !unusedFlag && !isInterruptible && allowAgentKill) {
        cancelQuotaAutoResumeWithNotice(addNotification, gesture);
        unusedFlag = true;
      }
      if (canPopQueuedModeCommand && popCommandFromQueue) {
        popCommandFromQueue();
        return true;
      }
      if (
        !suppressBackgroundAgentKill &&
        any_2 &&
        !hasAgentPanelTask &&
        !any &&
        !hasStoppableAutoReactSupervision()
      ) {
        clearSummonWakeTimers();
        bumpScanGeneration();
        artifactWatchStopNotice(0, drainQueuedTaskNotifications(store), {
          passive: true,
        });
        viewSelectionMode.current = Date.now();
        logEvent("tengu_cancel", killOptions);
        return unusedFlag || hasTickTarget;
      }
      let any_3 = Object.values(appStoreDirect.getState().tasks).some(isAgentPanelTask);
      if (
        !suppressBackgroundAgentKill &&
        (hasAgentPanelTask || hasStoppableWork || any || hasStoppableAutoReactSupervision())
      ) {
        let interrupted = interruptIfStoppable(stoppableWork);
        let killedSubscriptions = killAutoReactSubscriptions(taskRegistry, {
          durable: false,
        });
        let drainedNotifications = drainQueuedTaskNotifications(store);
        artifactWatchStopNotice(killedSubscriptions, drainedNotifications, {
          nameChordGesture: true,
          passive: true,
        });
        if (
          (isZincHarborOn()
            ? interruptBackgroundWork(
                appStoreDirect.getState().tasks,
                taskRegistry,
                addNotification,
                store,
                storageV5,
              )
            : handleCancelPress({
                passive: true,
              })) ||
          any_3 ||
          interrupted ||
          killedSubscriptions > 0 ||
          drainedNotifications.length > 0
        ) {
          viewSelectionMode.current = Date.now();
          logEvent("tengu_cancel", killOptions);
          return interrupted || unusedFlag || hasTickTarget;
        }
      }
      if (unusedFlag) return true;
      if (onCancel() === false && !hasTickTarget) return false;
      logEvent("tengu_cancel", killOptions);
      return true;
    },
    [
      abortSignal,
      isExternalLoading,
      isCloudMessageHeld,
      popCommandFromQueue,
      onCancel,
      getInFlightMessageId,
      queuedMessageText,
      hasAgentPanelTask,
      hasStoppableWork,
      stoppableWork,
      handleCancelPress,
      appStoreDirect,
      spinnerStore,
      taskRegistry,
      addNotification,
      store,
      session,
      storageV5,
      isArmedOrStale,
      detachesAndCalm,
    ],
  );
  let secondOverlayKeys = useSecondOverlayKeys();
  let hasModalOverlay = useOverlayKeys() && !secondOverlayKeys;
  let dialogOfKind = useDialogOfKind(LOCAL_JSX_DIALOG.kind);
  let isLayoutVisible = LayoutOverflow() === "visible";
  let isBusyNow = (abortSignal !== undefined && !abortSignal.aborted) || isExternalLoading;
  let isHeldMessageIdle = isCloudMessageHeld && isInputEmpty;
  let hasSelectorOnIdleInput = storeSelector && isInputEmpty;
  let any_2 = setAppState_2.some((state) => shouldPrependModeChar(state, isInputEmpty));
  let isNonPromptModeIdle = inputMode !== undefined && inputMode !== "prompt" && isInputEmpty;
  let isViewingAgent = viewSelectionMode_2 === "viewing-agent";
  let shouldCancel =
    screen !== "transcript" &&
    !isBackgroundTasksDialogVisible &&
    !dialogOfKind &&
    !secondOverlayKeys &&
    !isInputOverlayActive;
  let isActive =
    shouldCancel &&
    !hasModalOverlay &&
    !isLayoutVisible &&
    (isBusyNow || isHeldMessageIdle || hasSelectorOnIdleInput || any_2 || handleCancel || isIdleInPhase) &&
    !isNonPromptModeIdle &&
    !isVimEditing &&
    !isViewingAgent;
  let cancelReason =
    shouldCancel &&
    (isBusyNow ||
      (hasModalOverlay
        ? false
        : isHeldMessageIdle ||
          hasSelectorOnIdleInput ||
          any_2 ||
          canCancel ||
          isPhaseActiveNow ||
          hasAgentPanelTask ||
          hasStoppableWork ||
          shouldPrependModeChar_2 ||
          any ||
          hasStoppableAutoReactSupervision() ||
          isViewingAgent));
  useKeybinding(
    "chat:cancel",
    () => {
      if (appStoreDirect.getState().queueEditIndex !== null || shadowedFooterActionHandler("chat:cancel"))
        return false;
      handleInterrupt({
        gesture: "escape",
        suppressBackgroundAgentKill: true,
      });
    },
    {
      context: "Chat",
      isActive,
    },
  );
  let cancelCallback = useCallback(() => {
    if (isViewingAgent) {
      let { viewingAgentTaskId, tasks } = appStoreDirect.getState();
      let viewedTask = viewingAgentTaskId ? tasks[viewingAgentTaskId] : undefined;
      let isPanelTask = isPanelOrTeammateTask(viewedTask);
      if (isPanelTask) {
        viewSelectionMode.current = Date.now();
        stopTask(viewedTask, taskRegistry, setAppState, {
          session,
          storageV5,
        });
      }
      exitTeammateView(setAppState);
      if (isBusyNow || isHeldMessageIdle || hasSelectorOnIdleInput || any_2 || canCancel || isIdleInPhase)
        handleInterrupt({
          gesture: "ctrl_c",
          suppressBackgroundAgentKill: true,
          pressLandedOnWork: isPanelTask,
        });
      return;
    }
    let isBusyNow_2 = (abortSignal !== undefined && !abortSignal.aborted) || isExternalLoading;
    if (hasModalOverlay && !isBusyNow_2) return false;
    if (
      !handleInterrupt({
        gesture: "ctrl_c",
      })
    )
      return false;
  }, [
    isViewingAgent,
    hasModalOverlay,
    abortSignal,
    isExternalLoading,
    appStoreDirect,
    taskRegistry,
    session,
    setAppState,
    storageV5,
    isBusyNow,
    isHeldMessageIdle,
    hasSelectorOnIdleInput,
    any_2,
    canCancel,
    isIdleInPhase,
    handleInterrupt,
  ]);
  useKeybinding("app:interrupt", cancelCallback, {
    context: "Global",
    isActive: cancelReason,
  });
  useKeybinding("app:exit", () => (promptInputValue(session) === "" ? cancelCallback() : false), {
    context: "Global",
    isActive: cancelReason && isInputEmpty && !hasModalOverlay && !exitDetaches && isZincHarborOn(),
  });
  let drainCallback = useCallback(() => {
    let tasks = appStoreDirect.getState().tasks;
    let hasRunningAgents = Object.values(tasks).some(isLiveAgentOrTeammateTask);
    let hasStoppable = (stoppableWork?.stoppable() ?? 0) > 0;
    let isObserverArmed = pairingForObserver(session, MAIN_OBSERVED_KEY)?.state === "armed";
    let any = Object.values(tasks).some(isClaimableAutoReactSubscription);
    let isAutoreactArmedNow = isAutoreactArmed();
    let hasLiveDocWatch = liveDocWatchController != null && liveDocWatchController.liveDocWatchCount() > 0;
    let shouldStop =
      activeArtifactConnections() > 0 ||
      Object.keys(appStoreDirect.getState().artifactRoomJoinConsentSlugs ?? {}).length > 0;
    if (
      !hasRunningAgents &&
      !hasStoppable &&
      !isObserverArmed &&
      !any &&
      !hasLiveDocWatch &&
      !shouldStop &&
      !isAutoreactArmedNow
    ) {
      addNotification({
        key: "kill-agents-none",
        kind: "feedback",
        text: "No background agents running",
        priority: "immediate",
        timeoutMs: 2000,
      });
      return;
    }
    let now = Date.now();
    if (now - lastKillAgentsPressRef.current <= KILL_AGENTS_CONFIRM_MS) {
      lastKillAgentsPressRef.current = 0;
      removeNotification("kill-agents-confirm");
      let effortLevelIfSupported = getEffortLevelIfSupported(getMainLoopModel(), queuedMessageText);
      logEvent("tengu_cancel", {
        source: lit_2("kill_agents"),
        ...(effortLevelIfSupported && {
          effort_level: fromEnum(effortLevelIfSupported),
        }),
      });
      let drainedNotifications = drainQueuedTaskNotifications(store);
      let emptyPartition = emptyPartitionedNotifications();
      let hasAnyRunning = hasRunningAgents || hasStoppable || isObserverArmed || any;
      if (hasAnyRunning || isAutoreactArmedNow || hasLiveDocWatch || shouldStop)
        viewSelectionMode.current = Date.now();
      if (hasAnyRunning) {
        if (hasPendingContinuation()) cancelQuotaAutoResumeWithNotice(addNotification, "kill_agents_chord");
        if (store.getCommandQueue().some(isScreeningPendingEntry)) popCommandFromQueue?.();
        let notifications = store
          .clearCommandQueue({
            reason: "cleared_on_cancel",
            ...(alwaysFalseTool() && {
              keep: isPollEventMode,
            }),
          })
          .concat(clearHeldInput());
        emptyPartition = partitionStopNotifications(notifications);
        recordSubmittedPrompts(notifications, storageV5, {
          armUndo: false,
          placed: withExpandedPastes,
        });
      }
      let stoppedObservers = stopMainObservers(session, storageV5);
      liveDocWatchController?.stopAllLiveDocWatches();
      leaveArtifactRooms();
      let autoreactArmed = isAutoreactArmedNow;
      let killedSubscriptions = killAutoReactSubscriptions(taskRegistry, {
        storageV5,
      });
      dropNonDurableStopDisclosures(store);
      if (
        killedSubscriptions > 0 ||
        (autoreactArmed && !sendsPromptsElsewhere) ||
        drainedNotifications.length > 0
      ) {
        let isArtifactHidden = isBuiltInArtifactHiddenForMcp();
        store.enqueuePendingNotification({
          agentId: mainAgentId(),
          value: formatTaskNotification({
            taskType: "artifact-auto-react",
            summary: escapeXml(
              killedSubscriptions > 0
                ? `${killedSubscriptions} artifact ${isArtifactHidden ? plural(killedSubscriptions, "comment watch", "comment watches") : `auto-reply ${plural(killedSubscriptions, "subscription")}`} stopped by the user`
                : isArtifactHidden
                  ? "Artifact comments sent to Claude no longer wake this session"
                  : "Artifact auto-replies are disarmed for the rest of this session",
            ),
            body: `
${escapeXml(
  drainedNotifications
    .map(stoppedAfterAutoActionsNotice)
    .concat([
      isArtifactHidden
        ? killedSubscriptions > 0
          ? "Comments sent to Claude no longer wake this session. Wakes stay off until the user restarts Claude Code and publishes again."
          : "No watch was active to stop. Wakes stay off until the user restarts Claude Code and publishes again."
        : killedSubscriptions > 0
          ? "Auto-replies are disarmed for the rest of this session (a new session re-arms on publish; a watch this session carried is ended or stays disarmed for its continuations)."
          : "No subscription was active to stop (a new session re-arms on publish; a watch this session carried stays disarmed for its continuations).",
    ]).join(`

`),
)}`,
          }),
          mode: "task-notification",
          skipAttachments: true,
          origin: {
            kind: "task-notification",
            source: "artifact-auto-react-stop-disclosure",
            ...(drainedNotifications.length > 0 && {
              carriesDiscardRecord: true,
            }),
          },
        });
      }
      requeueStopNotifications(store, emptyPartition, killedSubscriptions);
      interruptIfStoppable(stoppableWork);
      if (
        !handleCancelPress({
          passive: false,
        }) &&
        stoppedObservers
      )
        onAgentsKilled();
      return;
    }
    lastKillAgentsPressRef.current = now;
    let shortcut = getShortcutDisplay("chat:killAgents", "Chat", "ctrl+x ctrl+k");
    addNotification({
      key: "kill-agents-confirm",
      kind: "feedback",
      text: `Press ${shortcut} again to stop background agents`,
      row1Hint: `${shortcut} again to stop agents`,
      priority: "immediate",
      timeoutMs: KILL_AGENTS_CONFIRM_MS,
    });
  }, [
    appStoreDirect,
    addNotification,
    removeNotification,
    handleCancelPress,
    onAgentsKilled,
    queuedMessageText,
    taskRegistry,
    stoppableWork,
    session,
    store,
    storageV5,
    sendsPromptsElsewhere,
  ]);
  useKeybinding("chat:killAgents", drainCallback, {
    context: "Chat",
  });
  return null;
}
//@ chunk-18hwfzwa.js:473810-473910 affinity
function hasRunningTask(tasks) {
  for (let task of tasks.values()) if (task.status === "running" && !task.stopRequested) return true;
  return false;
}
export { CancelRequestHandler };
