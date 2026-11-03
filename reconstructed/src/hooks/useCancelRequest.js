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
import { ce, R, yt } from "../../vendor/react/cjs/react.production.js";
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
    let ke = [];
    let Re = [];
    let Be = 0;
    for (let [key, value] of Object.entries(tasks)) {
      if (taskAbortController(value)) continue;
      if (isInterruptibleBackgroundSubagent(value)) {
        if (interruptBackgroundSubagent(key, taskRegistry)) {
          if (!isObserverAgentTask(value)) ke.push(value.description);
        } else if (isObserverAgentTask(value)) {
          markAgentNotified(key, taskRegistry);
          killAsyncAgent(key, taskRegistry, "user");
        } else {
          stopAgentFromUi(key, value, taskRegistry, storageV5);
          Re.push(value.description);
        }
      } else if (isLocalAgent(value) && value.agentType === "main-session" && value.status === "running") {
        stopAgentFromUi(key, value, taskRegistry, storageV5);
        Re.push(value.description);
      } else if (isInProcessTeammateTask(value) && interruptTeammateWork(value)) Be++;
    }
    if (ke.length === 0 && Re.length === 0 && Be === 0) return false;
    if (ke.length > 0 || Re.length > 0) {
      let ze = [];
      if (ke.length > 0)
        ze.push(
          `${ke.length} background ${plural(ke.length, "agent")} ${plural(ke.length, "was", "were")} interrupted by the user and parked: ${ke.map((Xe) => `"${Xe}"`).join(", ")}. Progress is preserved; resume an agent by sending it a message.`,
        );
      if (Re.length > 0)
        ze.push(
          `${Re.length} background ${plural(Re.length, "task")} ${plural(Re.length, "was", "were")} stopped by the user: ${Re.map((Xe) => `"${Xe}"`).join(", ")}.`,
        );
      store.enqueuePendingNotification({
        agentId: mainAgentId(),
        value: ze.join(" "),
        mode: "task-notification",
        skipAttachments: true,
        passive: true,
        priority: "next",
      });
    }
    let He = ke.length + Be;
    let We = [];
    if (He > 0) We.push(`${He} background ${plural(He, "agent")} parked \u2014 send a message to resume`);
    if (Re.length > 0) We.push(`${Re.length} background ${plural(Re.length, "task")} stopped`);
    addNotification({
      key: "agents-parked",
      kind: "feedback",
      text: We.join(" \xB7 "),
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
//@ chunk-18hwfzwa.js:466747-473810 fingerprint = CancelRequestHandler (0.522)
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
  let io = ce(() => appStoreDirect.getState().footerSelection !== null, [appStoreDirect]);
  let shadowedFooterActionHandler = useShadowedFooterActionHandler(io);
  let storeSelector = useStoreSelector(detachedCallSlots.of(session), hasRunningTask);
  let { storageV5 } = useTheme_2();
  let store = useCommandQueueOrDefault();
  let setAppState_2 = useCommandQueue();
  let { addNotification, removeNotification } = useNotifications();
  let lastKillAgentsPressRef = R(0);
  let viewSelectionMode = R(0);
  let viewSelectionMode_2 = useAppState((Pr) => Pr.viewSelectionMode);
  let queuedMessageText = useQueuedMessageText();
  let handleCancel = yt(onSessionCronsChange, hasLoopTask);
  let Cn = exitDetachesToCaller || isBgSession();
  let No = renderWithForceUpdate(() => getFeatureValue_CACHED_MAY_BE_STALE("tengu_calm_riddle", true));
  let vo = Cn && No;
  let Yo = handleCancel && !vo;
  let phase = useQuotaAutoResumeState().phase;
  let Fn = isPhaseActive(phase);
  let bn = Fn && isInputEmpty === true;
  let Go = phase === "armed" || phase === "stale";
  let hn = useAppState((Pr) => Object.values(Pr.tasks).some(isAgentPanelTask));
  let killAllAgentsAndNotify = ce(
    (Pr) => (stoppableWork === undefined ? noopUnsubscribeFactory() : stoppableWork.onOutstandingChange(Pr)),
    [stoppableWork],
  );
  let Xo = yt(killAllAgentsAndNotify, () => (stoppableWork?.stoppable() ?? 0) > 0);
  let Sn = useAppState((Pr) => Object.values(Pr.tasks).some(isClaimableAutoReactSubscription));
  let any = setAppState_2.some(processQueuedCommands_4);
  let on = ce(
    ({ passive }) => {
      let tasks = appStoreDirect.getState().tasks;
      let running = Object.entries(tasks).filter(([, t]) => isLiveAgentOrTeammateTask(t));
      if (running.length === 0) return false;
      for (let [wr, zr] of running) {
        markAgentNotified(wr, taskRegistry);
        if (isLocalAgent(zr) && !isObserverAgentTask(zr)) markStoppedByUser(wr, taskRegistry, storageV5);
      }
      killAllRunningAgentTasks(tasks, taskRegistry, "user");
      for (let [taskId, zr] of running)
        if (zr.type === "in_process_teammate")
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
  let handleInterrupt = ce(
    ({ gesture, suppressBackgroundAgentKill = false, pressLandedOnWork = false }) => {
      let handleKillAgents = getEffortLevelIfSupported(getMainLoopModel(), queuedMessageText);
      let Zr = getInFlightMessageId?.();
      let wr = {
        source: lit_2("escape"),
        streamMode: fromEnum(spinnerStore.get().mode),
        ...(handleKillAgents && {
          effort_level: fromEnum(handleKillAgents),
        }),
        ...(Zr && {
          message_id: sanitizeMarkName(Zr),
        }),
      };
      let zr = (abortSignal !== undefined && !abortSignal.aborted) || isExternalLoading;
      let _r = gesture === "ctrl_c" && vo && !zr;
      let fr = _r ? 0 : syncLoopTickState();
      if (fr > 0)
        addNotification({
          key: LOOP_WAKEUP_CANCELLED,
          kind: "feedback",
          text: LOOP_WAKEUP_CANCELLED_TEXT,
          priority: "immediate",
          timeoutMs: 8000,
          requeueOnPreempt: true,
          invalidates: [LOOP_WAKEUP_CANCELLED],
        });
      let $r = promptInputValue(session) === "";
      let Yr = !suppressBackgroundAgentKill || $r;
      let Er = hasPendingContinuation() && Yr;
      let Vr = false;
      if (Er) {
        cancelQuotaAutoResumeWithNotice(addNotification, gesture);
        Vr = true;
      }
      if (isAutoArmedByItself() && Yr) {
        cancelQuotaAutoResumeWithNotice(addNotification, gesture);
        Vr = true;
      }
      if (zr || (isCloudMessageHeld && $r)) {
        viewSelectionMode.current = Date.now();
        logEvent("tengu_cancel", wr);
        detachedCallSlots.of(session).stopRunning();
        onCancel();
        return true;
      }
      if ($r && detachedCallSlots.of(session).stopRunning() > 0) {
        viewSelectionMode.current = Date.now();
        logEvent("tengu_cancel", wr);
        return true;
      }
      let any = Object.values(appStoreDirect.getState().tasks).some(isClaimableAutoReactSubscription);
      let any_2 = store.getCommandQueueSnapshot().some(processQueuedCommands_4);
      let is = !suppressBackgroundAgentKill && (hn || any || any_2 || hasStoppableAutoReactSupervision());
      let ws = hasModeCharCommand(store, $r) && popCommandFromQueue !== undefined;
      let Ci = fr > 0;
      let oi =
        is ||
        ws ||
        Ci ||
        (_r && hasLoopTask()) ||
        pressLandedOnWork ||
        abortSignal !== undefined ||
        Date.now() - viewSelectionMode.current < GESTURE_WINDOW_MS;
      if (Go && !Vr && !oi && Yr) {
        cancelQuotaAutoResumeWithNotice(addNotification, gesture);
        Vr = true;
      }
      if (ws && popCommandFromQueue) {
        popCommandFromQueue();
        return true;
      }
      if (!suppressBackgroundAgentKill && any_2 && !hn && !any && !hasStoppableAutoReactSupervision()) {
        clearSummonWakeTimers();
        bumpScanGeneration();
        artifactWatchStopNotice(0, drainQueuedTaskNotifications(store), {
          passive: true,
        });
        viewSelectionMode.current = Date.now();
        logEvent("tengu_cancel", wr);
        return Vr || Ci;
      }
      let any_3 = Object.values(appStoreDirect.getState().tasks).some(isAgentPanelTask);
      if (!suppressBackgroundAgentKill && (hn || Xo || any || hasStoppableAutoReactSupervision())) {
        let Zi = interruptIfStoppable(stoppableWork);
        let da = killAutoReactSubscriptions(taskRegistry, {
          durable: false,
        });
        let qn = drainQueuedTaskNotifications(store);
        artifactWatchStopNotice(da, qn, {
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
            : on({
                passive: true,
              })) ||
          any_3 ||
          Zi ||
          da > 0 ||
          qn.length > 0
        ) {
          viewSelectionMode.current = Date.now();
          logEvent("tengu_cancel", wr);
          return Zi || Vr || Ci;
        }
      }
      if (Vr) return true;
      if (onCancel() === false && !Ci) return false;
      logEvent("tengu_cancel", wr);
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
      hn,
      Xo,
      stoppableWork,
      on,
      appStoreDirect,
      spinnerStore,
      taskRegistry,
      addNotification,
      store,
      session,
      storageV5,
      Go,
      vo,
    ],
  );
  let secondOverlayKeys = useSecondOverlayKeys();
  let Dn = useOverlayKeys() && !secondOverlayKeys;
  let dialogOfKind = useDialogOfKind(LOCAL_JSX_DIALOG.kind);
  let mr = LayoutOverflow() === "visible";
  let Kn = (abortSignal !== undefined && !abortSignal.aborted) || isExternalLoading;
  let Wn = isCloudMessageHeld && isInputEmpty;
  let Fr = storeSelector && isInputEmpty;
  let any_2 = setAppState_2.some((Pr) => shouldPrependModeChar(Pr, isInputEmpty));
  let Un = inputMode !== undefined && inputMode !== "prompt" && isInputEmpty;
  let dr = viewSelectionMode_2 === "viewing-agent";
  let or =
    screen !== "transcript" &&
    !isBackgroundTasksDialogVisible &&
    !dialogOfKind &&
    !secondOverlayKeys &&
    !isInputOverlayActive;
  let isActive =
    or && !Dn && !mr && (Kn || Wn || Fr || any_2 || handleCancel || bn) && !Un && !isVimEditing && !dr;
  let Qn =
    or &&
    (Kn ||
      (Dn
        ? false
        : Wn ||
          Fr ||
          any_2 ||
          Yo ||
          Fn ||
          hn ||
          Xo ||
          Sn ||
          any ||
          hasStoppableAutoReactSupervision() ||
          dr));
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
  let ur = ce(() => {
    if (dr) {
      let { viewingAgentTaskId, tasks } = appStoreDirect.getState();
      let Ur = viewingAgentTaskId ? tasks[viewingAgentTaskId] : undefined;
      let Zr = isPanelOrTeammateTask(Ur);
      if (Zr) {
        viewSelectionMode.current = Date.now();
        stopTask(Ur, taskRegistry, setAppState, {
          session,
          storageV5,
        });
      }
      exitTeammateView(setAppState);
      if (Kn || Wn || Fr || any_2 || Yo || bn)
        handleInterrupt({
          gesture: "ctrl_c",
          suppressBackgroundAgentKill: true,
          pressLandedOnWork: Zr,
        });
      return;
    }
    let Pr = (abortSignal !== undefined && !abortSignal.aborted) || isExternalLoading;
    if (Dn && !Pr) return false;
    if (
      !handleInterrupt({
        gesture: "ctrl_c",
      })
    )
      return false;
  }, [
    dr,
    Dn,
    abortSignal,
    isExternalLoading,
    appStoreDirect,
    taskRegistry,
    session,
    setAppState,
    storageV5,
    Kn,
    Wn,
    Fr,
    any_2,
    Yo,
    bn,
    handleInterrupt,
  ]);
  useKeybinding("app:interrupt", ur, {
    context: "Global",
    isActive: Qn,
  });
  useKeybinding("app:exit", () => (promptInputValue(session) === "" ? ur() : false), {
    context: "Global",
    isActive: Qn && isInputEmpty && !Dn && !Cn && isZincHarborOn(),
  });
  let Ir = ce(() => {
    let tasks = appStoreDirect.getState().tasks;
    let hasRunningAgents = Object.values(tasks).some(isLiveAgentOrTeammateTask);
    let Gn = (stoppableWork?.stoppable() ?? 0) > 0;
    let Ur = pairingForObserver(session, MAIN_OBSERVED_KEY)?.state === "armed";
    let any = Object.values(tasks).some(isClaimableAutoReactSubscription);
    let wr = isAutoreactArmed();
    let zr = liveDocWatchController != null && liveDocWatchController.liveDocWatchCount() > 0;
    let _r =
      activeArtifactConnections() > 0 ||
      Object.keys(appStoreDirect.getState().artifactRoomJoinConsentSlugs ?? {}).length > 0;
    if (!hasRunningAgents && !Gn && !Ur && !any && !zr && !_r && !wr) {
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
      let Vr = drainQueuedTaskNotifications(store);
      let ms = emptyPartitionedNotifications();
      let Xs = hasRunningAgents || Gn || Ur || any;
      if (Xs || wr || zr || _r) viewSelectionMode.current = Date.now();
      if (Xs) {
        if (hasPendingContinuation()) cancelQuotaAutoResumeWithNotice(addNotification, "kill_agents_chord");
        if (store.getCommandQueue().some(isScreeningPendingEntry)) popCommandFromQueue?.();
        let combined = store
          .clearCommandQueue({
            reason: "cleared_on_cancel",
            ...(alwaysFalseTool() && {
              keep: isPollEventMode,
            }),
          })
          .concat(clearHeldInput());
        ms = partitionStopNotifications(combined);
        recordSubmittedPrompts(combined, storageV5, {
          armUndo: false,
          placed: withExpandedPastes,
        });
      }
      let Ls = stopMainObservers(session, storageV5);
      liveDocWatchController?.stopAllLiveDocWatches();
      leaveArtifactRooms();
      let is = wr;
      let ws = killAutoReactSubscriptions(taskRegistry, {
        storageV5,
      });
      dropNonDurableStopDisclosures(store);
      if (ws > 0 || (is && !sendsPromptsElsewhere) || Vr.length > 0) {
        let Ci = isBuiltInArtifactHiddenForMcp();
        store.enqueuePendingNotification({
          agentId: mainAgentId(),
          value: formatTaskNotification({
            taskType: "artifact-auto-react",
            summary: escapeXml(
              ws > 0
                ? `${ws} artifact ${Ci ? plural(ws, "comment watch", "comment watches") : `auto-reply ${plural(ws, "subscription")}`} stopped by the user`
                : Ci
                  ? "Artifact comments sent to Claude no longer wake this session"
                  : "Artifact auto-replies are disarmed for the rest of this session",
            ),
            body: `
${escapeXml(
  Vr.map(stoppedAfterAutoActionsNotice).concat([
    Ci
      ? ws > 0
        ? "Comments sent to Claude no longer wake this session. Wakes stay off until the user restarts Claude Code and publishes again."
        : "No watch was active to stop. Wakes stay off until the user restarts Claude Code and publishes again."
      : ws > 0
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
            ...(Vr.length > 0 && {
              carriesDiscardRecord: true,
            }),
          },
        });
      }
      requeueStopNotifications(store, ms, ws);
      interruptIfStoppable(stoppableWork);
      if (
        !on({
          passive: false,
        }) &&
        Ls
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
    on,
    onAgentsKilled,
    queuedMessageText,
    taskRegistry,
    stoppableWork,
    session,
    store,
    storageV5,
    sendsPromptsElsewhere,
  ]);
  useKeybinding("chat:killAgents", Ir, {
    context: "Chat",
  });
  return null;
}
//@ chunk-18hwfzwa.js:473810-473910 affinity
function hasRunningTask(h) {
  for (let x of h.values()) if (x.status === "running" && !x.stopRequested) return true;
  return false;
}
export { CancelRequestHandler };
