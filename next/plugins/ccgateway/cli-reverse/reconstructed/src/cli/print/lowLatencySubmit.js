/**
 * cli/print/lowLatencySubmit.ts
 *
 * 2.1.316 新增：[low-latency-submit] 排队消息的提前投递（在当前轮次中插入或等待），含失败重试与观察者/协调者来源判定
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-aac6cgbf.js (11), chunk-nh1pvp1m.js (17)
 * attribution: placement 28
 */
import { logForDebugging } from "../../utils/debug.js";
import { DoctorLazy } from "../handlers/util.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { stringSchema, objectSchema, literal } from "../../../vendor/zod/v4/classic/schemas.js";
import { isQueuedCommandEditable } from "../../utils/messageQueueManager.js";
import { logError } from "../../utils/log.js";
import { isBackgroundTasksOff } from "../../tools/AgentTool/backgroundGates.js";
import { unansweredToolBriefs } from "../../components/Messages.js";
import {
  MOVED_RESULT_HOLD_MS,
  MOVED_RESULT_POLL_MS,
  GRACE_POLL_TICKS,
  decideQueuedPromptAction,
  MAX_MOVED_RESULT_WAITS,
} from "./setModelControl.js";
import {
  backgroundShellsToDeliverMessage,
  isArmedForegroundShell,
  isForegroundShellOf,
  isForegroundShellFromCaller,
  isForegroundTask,
} from "../../tasks/LocalShellTask/LocalShellTask.js";
import { killTask } from "../../tasks/LocalShellTask/killShellTasks.js";
import {
  foregroundCallRegistrySlots,
  backgroundForegroundCalls,
} from "../../services/tools/detachedToolCalls.js";
import { getTaskRunState } from "../../utils/task/taskNotifications.js";
import { getIsNonInteractiveSession, mainAgentId, getDisableSlashCommands } from "../../bootstrap/state.js";
import {
  isAutoBackgroundHeld,
  moveAgentToBackground,
  queuePendingMessage,
  isBackgroundedSubagent,
} from "../../tasks/LocalAgentTask/LocalAgentTask.js";
import { isActivityReasonActive, getMainLoopRefcount } from "../../utils/sessionActivity.js";
import { PREAMBLE_TASK_SUFFIX, stripPreambleSuffix } from "../../tasks/LocalShellTask/backgroundNotices.js";
import {
  isForegroundAgentTask,
  hasUserInitiatedPending,
  canReceiveNotification,
} from "../../tasks/taskKinds.js";
import { AGENT, TASK } from "../../tools/AgentTool/constants.js";
import { isEvalToolCallName } from "../../tools/REPLTool/constants.js";
import { isLocalAgent } from "../../state/teammateViewHelpers.js";
import { isLocalShellTask } from "../../tasks/LocalShellTask/guards.js";
import { firstLineOf } from "../../utils/stringUtils.js";
import {
  AgentResumeInProgressError,
  AgentResumeTransientError,
  AgentStillStoppingError,
  AgentStoppedByUserError,
  ResumeAgentStateError,
  isResumeDenied,
} from "../../tools/AgentTool/resumeAgent.js";
import { isHeldByPlugin, holdQueuedInput } from "../../plugins/functionHooks/inputHold.js";
import {
  drainPendingMessages,
  dropDeniedResumeMessages,
} from "../../tasks/LocalAgentTask/pendingMessages.js";
import { errorMessage } from "../../utils/errors.js";
import { isEvalSettleWakePollEvent } from "../../utils/pollEvents.js";
import { hasCompletedWithFindings } from "../../components/tasks/RemoteSessionProgress.js";
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import { isTaskNotificationOrigin } from "../../utils/backgroundSessionResume.js";
import { REFUSAL_FALLBACK_DIALOG } from "../../services/requestUserDialog.js";
import { FABLE_OVERAGE_CONSENT_DIALOG } from "../../services/api/overageConsent.js";
import { AUTO_MODE_SERVER_FALLBACK, ENUM_PROMPT } from "../../components/nudges/nudgeIds.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { toBridgeSlashCommands, getCommandName } from "../../commands.js";
import { dropSyncedNameClashes } from "../../utils/commandPredicates.js";
import { uniqByExport } from "../../../vendor/lodash-es/uniqBy.js";
import { bridgeHostState } from "../../bridge/bridgeHostState.js";
import { ContextUsageEstimateReporter } from "./resumeTurnBoundaries.js";

//@ chunk-aac6cgbf.js:2446-3108 placement
function pickQueuedMessageToMove(commandQueue, movingUuids, messageQueue, agentId) {
  let index = commandQueue.findIndex(
    (queuedMessage) =>
      queuedMessage.uuid !== undefined &&
      movingUuids.has(queuedMessage.uuid) &&
      queuedMessage.priority !== "now",
  );
  let candidate = commandQueue[index];
  let uuid = candidate?.uuid;
  if (candidate === undefined || uuid === undefined) return null;
  let priority = candidate.priority === "later" ? "later" : "next";
  if (candidate.drainOnly === true && candidate.promptSubmitted !== undefined)
    return {
      head: "ended_by_hook",
      uuid,
      priority,
    };
  let sliced = commandQueue.slice(0, index);
  if (
    commandQueue.some(
      (queuedMessage) => queuedMessage.screeningPending === true && queuedMessage.agentId === agentId,
    ) ||
    messageQueue.isFoldInFlight(uuid) ||
    messageQueue.isMidTurnFoldSuspended() ||
    sliced.some((earlierMessage) => earlierMessage.priority === "now" && earlierMessage.agentId === agentId)
  )
    return {
      head: "not_ready",
      uuid,
      priority,
    };
  if (
    sliced.some(
      (earlierMessage) =>
        earlierMessage.agentId === agentId &&
        (earlierMessage.mode === "prompt" || earlierMessage.mode === "bash"),
    )
  )
    return {
      head: "behind_earlier",
      uuid,
      priority,
    };
  return {
    head: "deliverable",
    uuid,
    priority,
  };
}
//@ chunk-aac6cgbf.js:3108-8422 placement
/**
 * 低延迟提交队列：决定排队消息何时可提前送入正在进行的轮次（约 5 KB）。
 */
class LowLatencySubmitQueue {
  #n;
  #e = new Map();
  #t = null;
  #p = [];
  #g = false;
  #h = "";
  #c = false;
  #o = 0;
  #l = false;
  #s = new Set();
  #y = 0;
  #u = 0;
  #i = false;
  #m = 0;
  #S = false;
  constructor(deps) {
    this.#n = deps;
  }
  sendQueuedNow = () => this.#v(isQueuedCommandEditable);
  sendAgentMessageNow() {
    this.#i = true;
    this.#m = 0;
    if (this.#v(() => true)) {
      this.#t?.();
      this.#T();
    }
    return this.#m;
  }
  #v(accept) {
    let didSchedule = false;
    this.#d(() => {
      if (this.#S) return;
      let { messageQueue, turn } = this.#n;
      if (!turn.guard.isRunning && !turn.guard.isDispatchingForModel) {
        this.#a();
        return;
      }
      let agentId = agentIdOrMain(turn.agentId);
      for (let queuedMessage of messageQueue.getCommandQueueSnapshot())
        if (
          queuedMessage.uuid !== undefined &&
          queuedMessage.agentId === agentId &&
          queuedMessage.mode === "prompt" &&
          accept(queuedMessage) &&
          !this.#e.has(queuedMessage.uuid)
        )
          this.#e.set(queuedMessage.uuid, {
            outcome: "undecided",
            raisedFrom: null,
          });
      if (this.#e.size === 0) return;
      let head = pickQueuedMessageToMove(
        messageQueue.getCommandQueue(),
        this.#e,
        messageQueue,
        agentId,
      )?.head;
      if (head === "behind_earlier" || head === "ended_by_hook") {
        this.#a();
        return;
      }
      didSchedule = true;
      this.#c = false;
      this.#l = false;
      if (this.#p.length === 0) this.#p = [messageQueue.subscribe(this.#w), turn.guard.subscribe(this.#M)];
      if (this.#t === null) this.#b(0);
    });
    return didSchedule;
  }
  moveHolders() {
    this.#d(() => {
      let { turn, transcript, taskRegistry } = this.#n;
      if (this.#S || !isLocalTurnRunning(turn) || isBackgroundTasksOff()) return;
      let liveToolUseIds = unansweredToolBriefs(transcript.getSnapshot());
      let values = Object.values(taskRegistry.all());
      toolUseIdsToMoveToBackground(
        runningForegroundShellsFor(values, liveToolUseIds, turn.agentId),
        foregroundAgentTasksInSet(values, liveToolUseIds, turn.agentId).filter((agentTask) =>
          isToolUseMarkedAgentOrTask(liveToolUseIds, agentTask),
        ),
        taskRegistry,
      );
    });
  }
  dispose() {
    this.#S = true;
    this.#d(() => this.#a());
  }
  #b(delayMs) {
    this.#t?.();
    this.#t = this.#n.clock.setTimeout(this.#T, delayMs);
  }
  #r() {
    this.#t?.();
    this.#t = null;
    this.#o = 0;
    this.#s.clear();
    this.#y = 0;
    this.#u = 0;
  }
  #a() {
    this.#r();
    for (let unsubscribe of this.#p.splice(0)) unsubscribe();
    this.#A();
    this.#e.clear();
    this.#g = false;
    this.#h = "";
    this.#c = false;
    this.#l = false;
  }
  #f() {
    if (this.#e.size > 0) this.#b(this.#i ? MOVED_RESULT_HOLD_MS : MOVED_RESULT_POLL_MS);
  }
  #A() {
    for (let [messageUuid, moveState] of this.#e)
      if (moveState.raisedFrom !== null) {
        let raisedFrom = moveState.raisedFrom;
        moveState.raisedFrom = null;
        this.#n.messageQueue.demoteFromNow(messageUuid, raisedFrom);
      }
  }
  #_() {
    let liveUuids = new Set(
      this.#n.messageQueue.getCommandQueueSnapshot().map((queuedMessage) => queuedMessage.uuid),
    );
    for (let [messageUuid, moveState] of this.#e) {
      if (liveUuids.has(messageUuid)) continue;
      this.#e.delete(messageUuid);
      if (this.#n.messageQueue.isFoldInFlight(messageUuid)) this.#l = true;
      if (moveState.outcome !== "undecided" && moveState.outcome !== "delivered_early")
        logFeatureSad(this.#n.featureName, moveState.outcome);
    }
  }
  #w = () => {
    this.#d(() => {
      let [previousFirstUuid] = this.#e.keys();
      this.#_();
      if (this.#e.size === 0) {
        this.#a();
        return;
      }
      if (this.#l) {
        this.#r();
        return;
      }
      let [currentFirstUuid] = this.#e.keys();
      if (currentFirstUuid !== previousFirstUuid && (this.#t !== null || this.#n.turn.guard.isActive))
        this.#b(0);
    });
  };
  #M = () => {
    this.#d(() => {
      let { guard } = this.#n.turn;
      if (!guard.isActive) {
        this.#c = true;
        this.#r();
        return;
      }
      if (this.#c) this.#a();
    });
  };
  #T = () => {
    this.#t = null;
    this.#d(() => {
      this.#I();
    });
  };
  #d(callback) {
    try {
      callback();
    } catch (error) {
      logError(error);
      this.#m = null;
      if (!this.#g) {
        this.#g = true;
        logFeatureBad(this.#n.featureName, "check_threw");
      }
    }
  }
  #I() {
    let { messageQueue, turn, transcript, session, taskRegistry } = this.#n;
    this.#_();
    if (this.#e.size === 0) {
      this.#a();
      return;
    }
    let picked = pickQueuedMessageToMove(
      messageQueue.getCommandQueue(),
      this.#e,
      messageQueue,
      agentIdOrMain(turn.agentId),
    );
    let pickedState = picked === null ? undefined : this.#e.get(picked.uuid);
    let snapshot = transcript.getSnapshot();
    let liveToolUseIds = unansweredToolBriefs(snapshot);
    let values = Object.values(taskRegistry.all());
    let liveShells = runningForegroundShellsFor(values, liveToolUseIds, turn.agentId);
    let hasRaisedHolders =
      turn.guard.isActive && [...this.#e.values()].some((moveState) => moveState.raisedFrom !== null);
    if (hasRaisedHolders && !isBackgroundTasksOff()) {
      backgroundShellsToDeliverMessage(liveShells, taskRegistry);
      this.#u = liveToolUseIds.size > 0 ? this.#u + 1 : 0;
      if (turn.endsUnmovableShells && this.#u > GRACE_POLL_TICKS)
        for (let task of isTurnRunning(values, liveToolUseIds, liveShells, turn.agentId))
          killTask(task.id, taskRegistry);
    }
    if (picked === null || pickedState === undefined) {
      if (hasRaisedHolders) this.#f();
      else this.#r();
      return;
    }
    let { head, uuid, priority } = picked;
    let target = foregroundAgentTasksInSet(values, liveToolUseIds, turn.agentId);
    let calls = (foregroundCallRegistrySlots.peek(session)?.list() ?? []).filter((call) =>
      setHasToolUseId(liveToolUseIds, call.toolUseId),
    );
    let backgroundingDisabled = isBackgroundTasksOff();
    let movableShells = backgroundingDisabled
      ? []
      : liveShells.filter((liveShell) => {
          if (!this.#i) return true;
          let toolUseId = firstLineOfToolUseId(liveShell);
          let exclusiveOwner =
            toolUseId === undefined ? undefined : getTaskRunState().exclusiveCallQueuedBehind.get(toolUseId);
          return (
            isArmedForegroundShell(liveShell, turn.agentId) &&
            !exclusiveOwner?.isQueued() &&
            !exclusiveOwner?.mayYetBeQueued()
          );
        });
    let agentTasks =
      backgroundingDisabled || (this.#i && getIsNonInteractiveSession())
        ? []
        : target.filter(
            (agentTask) =>
              isToolUseMarkedAgentOrTask(liveToolUseIds, agentTask) &&
              !(this.#i && isAutoBackgroundHeld(agentTask)),
          );
    let evidence = turn.readEvidence();
    let last = snapshot.at(-1);
    for (let toolUseId of this.#s) if (!liveToolUseIds.has(toolUseId)) this.#s.delete(toolUseId);
    let totalCount = liveShells.length + target.length + calls.length;
    let remainingCount = liveShells.length - movableShells.length + (target.length - agentTasks.length);
    let decisionInput = {
      head,
      hasFoldTakenPrompt: this.#l,
      isLocalTurnActive: turn.guard.isActive,
      isLocalTurnRunning: isLocalTurnRunning(turn),
      isHeldByDialog: evidence.isHeldByDialog,
      holderCount: totalCount,
      unmovableHolderCount: this.#i && remainingCount > 0 ? totalCount : remainingCount,
      isExecuting: evidence.isToolCallStarting || liveToolUseIds.size > 0,
      isAwaitingMovedResult: this.#s.size > 0,
      isBackgroundingDisabled: backgroundingDisabled,
      isCompacting: evidence.isCompacting,
      isUnmovableGraceOver: this.#o >= GRACE_POLL_TICKS,
      isMainRequestInFlight:
        evidence.isMainRequestAnnounced &&
        !(
          last?.type === "assistant" &&
          (last.message.stop_reason !== null || last.isApiErrorMessage === true)
        ) &&
        isActivityReasonActive("api_call") &&
        getMainLoopRefcount() > 0,
    };
    let decision = decideQueuedPromptAction(decisionInput);
    let traceLine = `${decision.action}${decision.action === "wait" ? ` ${decision.reason}` : ""} head=${head} holders=${decisionInput.holderCount} executing=${decisionInput.isExecuting}`;
    if (traceLine !== this.#h) {
      this.#h = traceLine;
      logForDebugging(`[low-latency-submit] ${traceLine} agent=${turn.agentId ?? "main"}`);
    }
    switch (decision.action) {
      case "stand_by":
        this.#r();
        return;
      case "wait":
        this.#o = decision.reason === "unmovable_grace" ? this.#o + 1 : 0;
        if (decision.reason === "moved_result" && ++this.#y >= MAX_MOVED_RESULT_WAITS) this.#s.clear();
        if (decision.reason !== "not_ready" && pickedState.outcome === "undecided")
          pickedState.outcome = decision.reason;
        this.#f();
        return;
      case "background": {
        let outcome = pickedState.outcome;
        pickedState.outcome = "delivered_early";
        let movedToolUseIds = toolUseIdsToMoveToBackground(movableShells, agentTasks, taskRegistry);
        let movedCount = movedToolUseIds.length;
        let backgroundedCallCount = backgroundForegroundCalls(calls);
        movedCount += backgroundedCallCount;
        this.#m = movedCount;
        if (backgroundedCallCount > 0) movedToolUseIds.push(...calls.map((movedCall) => movedCall.toolUseId));
        if (this.#e.size > 0) {
          this.#y = 0;
          for (let movedToolUseId of movedToolUseIds)
            if (movedToolUseId !== undefined) this.#s.add(movedToolUseId);
        }
        if (movedCount === 0) {
          pickedState.outcome = outcome === "undecided" ? "nothing_moved" : outcome;
          if (decisionInput.isUnmovableGraceOver) {
            if (backgroundingDisabled) this.#x(pickedState);
            else this.#k(pickedState, uuid, priority);
            return;
          }
          if (this.#e.size > 0) this.#o++;
        } else {
          this.#o = 0;
          if (outcome !== "delivered_early") logFeatureOk(this.#n.featureName);
        }
        this.#f();
        return;
      }
      case "interrupt":
        this.#k(pickedState, uuid, priority);
        return;
      case "cancel":
        this.#x(pickedState);
    }
  }
  #x(moveState) {
    let { interruptForSubmit } = this.#n.turn;
    if (interruptForSubmit === undefined) {
      if (moveState.outcome === "undecided") moveState.outcome = "nothing_moved";
    } else {
      if (moveState.outcome !== "delivered_early") moveState.outcome = "fell_back_to_cancel";
      interruptForSubmit();
    }
    this.#r();
  }
  #k(moveState, messageUuid, raisedFrom) {
    this.#o = 0;
    this.#u = 0;
    moveState.raisedFrom = raisedFrom;
    if (!this.#n.messageQueue.promoteToNow(messageUuid)) moveState.raisedFrom = null;
    else if (moveState.outcome !== "delivered_early") {
      moveState.outcome = "delivered_early";
      logFeatureOk(this.#n.featureName);
    }
    this.#f();
  }
}
//@ chunk-aac6cgbf.js:8422-8451 placement
function agentIdOrMain(agentId) {
  return agentId ?? mainAgentId();
}
//@ chunk-aac6cgbf.js:8451-8610 placement
function runningForegroundShellsFor(allTasks, liveToolUseIds, agentId) {
  return allTasks
    .filter((task) => isForegroundShellOf(task, agentId))
    .filter(
      (task) =>
        task.status === "running" &&
        ((task.caller === "inner" && task.toolUseId?.includes(PREAMBLE_TASK_SUFFIX) === true) ||
          isForegroundShellFromCaller(task, agentId)) &&
        setHasToolUseId(liveToolUseIds, firstLineOfToolUseId(task)),
    );
}
//@ chunk-aac6cgbf.js:8610-8689 placement
function foregroundAgentTasksInSet(allTasks, liveToolUseIds, parentAgentId) {
  return allTasks
    .filter((task) => isForegroundAgentTask(task, parentAgentId))
    .filter((task) => setHasToolUseId(liveToolUseIds, task.toolUseId));
}
//@ chunk-aac6cgbf.js:8689-8772 placement
function isToolUseMarkedAgentOrTask(marks, { toolUseId }) {
  let mark = toolUseId === undefined ? undefined : marks.get(toolUseId);
  return mark === AGENT || mark === TASK;
}
//@ chunk-aac6cgbf.js:8772-8869 placement
function toolUseIdsToMoveToBackground(tasks, agentTasks, taskRegistry) {
  return [
    ...backgroundShellsToDeliverMessage(tasks, taskRegistry).map(firstLineOfToolUseId),
    ...agentTasks
      .filter((agentTask) => moveAgentToBackground(agentTask.id, taskRegistry))
      .map((agentTask) => agentTask.toolUseId),
  ];
}
//@ chunk-aac6cgbf.js:8869-8948 placement
function isLocalTurnRunning(turn) {
  return turn.guard.isRunning && turn.abortController?.signal.aborted === false;
}
//@ chunk-aac6cgbf.js:8948-9014 placement
function firstLineOfToolUseId(task) {
  return task.toolUseId === undefined ? undefined : stripPreambleSuffix(task.toolUseId);
}
//@ chunk-aac6cgbf.js:9014-9573 placement
function isTurnRunning(allTasks, liveToolUseIds, exemptShells, agentId) {
  let any = [...liveToolUseIds.values()].some(isEvalToolCallName);
  let filtered = allTasks
    .filter(isLocalAgent)
    .filter((agent) => agent.status === "running" && !agent.isBackgrounded);
  let descendantAgentIds = new Set(
    filtered
      .filter(
        (agent) =>
          agent.parentAgentId === agentId && (any || setHasToolUseId(liveToolUseIds, agent.toolUseId)),
      )
      .map((agent) => agent.agentId),
  );
  for (let previousCount = -1; previousCount !== descendantAgentIds.size;) {
    previousCount = descendantAgentIds.size;
    for (let agent of filtered)
      if (agent.parentAgentId !== undefined && descendantAgentIds.has(agent.parentAgentId))
        descendantAgentIds.add(agent.agentId);
  }
  return allTasks.filter(isLocalShellTask).filter((shellTask) => {
    let isExempt = isForegroundShellFromCaller(shellTask, agentId) || exemptShells.includes(shellTask);
    let isForeground = isForegroundTask(shellTask);
    if (shellTask.status !== "running" || !isForeground || isExempt) return false;
    if (shellTask.agentId !== agentId)
      return shellTask.agentId !== undefined && descendantAgentIds.has(shellTask.agentId);
    let { toolUseId } = shellTask;
    return any || (toolUseId !== undefined && setHasToolUseId(liveToolUseIds, firstLineOf(toolUseId, ":")));
  });
}
//@ chunk-aac6cgbf.js:9573-9617 placement
function setHasToolUseId(toolUseIdSet, toolUseId) {
  return toolUseId !== undefined && toolUseIdSet.has(toolUseId);
}
//@ chunk-nh1pvp1m.js:60545-60619 placement
/**
 * 判断错误是否属于可重试的代理恢复错误（恢复进行中 / 暂时性 / 仍在停止三类）。
 */
function isRetryableAgentError(error) {
  return (
    error instanceof AgentResumeInProgressError ||
    error instanceof AgentResumeTransientError ||
    error instanceof AgentStillStoppingError
  );
}
//@ chunk-nh1pvp1m.js:60619-61492 placement
async function deliverQueuedNow(agentId, taskRegistry, resume) {
  let heldByPlugin = isHeldByPlugin();
  let pendingMessages = drainPendingMessages(agentId, taskRegistry);
  let isDeliverable = ({ origin, userInitiatedAt }) =>
    userInitiatedAt !== undefined ||
    origin === undefined ||
    origin.kind === "human" ||
    origin.kind === "observer" ||
    ((origin.kind === "coordinator" || origin.kind === "peer") && origin.plugin === undefined);
  let chosenMessage = heldByPlugin ? pendingMessages.find(isDeliverable) : pendingMessages[0];
  if (chosenMessage === undefined) {
    queuePendingMessage(agentId, pendingMessages, taskRegistry);
    if (pendingMessages.length > 0)
      holdQueuedInput(() => getTaskRunState().agentStrandedMessages.emit(agentId), undefined, "stays");
    return;
  }
  let filtered = pendingMessages.filter((message) => message !== chosenMessage);
  let userInitiated = hasUserInitiatedPending(taskRegistry.get(agentId), pendingMessages);
  queuePendingMessage(agentId, filtered, taskRegistry);
  let resumeResult;
  try {
    resumeResult = await resume(chosenMessage, userInitiated);
  } catch (error) {
    let remainingMessages = [chosenMessage, ...drainPendingMessages(agentId, taskRegistry)];
    if (isRetryableAgentError(error)) {
      queuePendingMessage(agentId, remainingMessages, taskRegistry);
      throw error;
    }
    let requeuedUserInitiated = hasUserInitiatedPending(taskRegistry.get(agentId), remainingMessages);
    if (
      error instanceof AgentStoppedByUserError &&
      requeuedUserInitiated &&
      canReceiveNotification(taskRegistry.get(agentId), {
        userInitiated: true,
      })
    ) {
      queuePendingMessage(agentId, remainingMessages, taskRegistry);
      throw new AgentResumeTransientError(
        `a message the user typed for agent ${agentId} arrived while a resume their stop refused was in flight; retrying with it`,
      );
    }
    let undeliverable =
      error instanceof ResumeAgentStateError ||
      !canReceiveNotification(taskRegistry.get(agentId), {
        userInitiated: requeuedUserInitiated,
      });
    if (!undeliverable) queuePendingMessage(agentId, remainingMessages, taskRegistry);
    getTaskRunState().agentResumeFailed.emit(agentId, {
      error,
      undeliverable: undeliverable ? remainingMessages : [],
      terminal: undeliverable,
    });
    throw error;
  }
  if (isResumeDenied(resumeResult))
    dropDeniedResumeMessages(agentId, taskRegistry, [chosenMessage, ...filtered], resumeResult);
}
//@ chunk-nh1pvp1m.js:61492-61519 placement
/**
 * 代理恢复退避参数：最多 5 次瞬时失败重试、基数 2s、上限 60s。
 */
var MAX_TRANSIENT_RESUME_RETRIES = 5;
var RESUME_BACKOFF_BASE_MS = 2000;
var RESUME_BACKOFF_CAP_MS = 60000;
//@ chunk-nh1pvp1m.js:61519-61621 placement
/**
 * 指数退避加抖动：延迟取 min(上限, 基数×2^(n−1))，结果在其一半到全值之间随机。
 */
function jitteredBackoffMs(attempt, random = Math.random) {
  let min = Math.min(RESUME_BACKOFF_CAP_MS, RESUME_BACKOFF_BASE_MS * 2 ** Math.max(0, attempt - 1));
  return Math.round(min / 2 + (random() * min) / 2);
}
//@ chunk-nh1pvp1m.js:61621-61698 placement
var realTimers = {
  setTimeout: (fn, delayMs) => setTimeout(fn, delayMs),
  clearTimeout: (timer) => clearTimeout(timer),
};
//@ chunk-nh1pvp1m.js:61698-63151 placement
/**
 * 恢复卡住时按退避重试，多次失败后回调 onFailed。
 */
function createStrandedResumeRetrier({
  taskRegistry,
  resume,
  onFailed,
  timers = realTimers,
  random = Math.random,
}) {
  let pendingRetries = new Map();
  let disposed = false;
  let clearRetry = (agentId) => {
    let timer = pendingRetries.get(agentId)?.timer;
    if (timer !== undefined) timers.clearTimeout(timer);
    pendingRetries.delete(agentId);
  };
  let attemptDelivery = async (agentId) => {
    try {
      await deliverQueuedNow(agentId, taskRegistry, (message, userInitiated) =>
        resume(agentId, message, userInitiated),
      );
      clearRetry(agentId);
    } catch (error) {
      let previousRetry = pendingRetries.get(agentId);
      clearRetry(agentId);
      if (!isRetryableAgentError(error)) throw error;
      let retryState = {
        attempt: (previousRetry?.attempt ?? 0) + 1,
        transient: (previousRetry?.transient ?? 0) + (error instanceof AgentResumeTransientError ? 1 : 0),
      };
      if (retryState.transient > MAX_TRANSIENT_RESUME_RETRIES) {
        getTaskRunState().agentResumeFailed.emit(agentId, {
          error,
          undeliverable: drainPendingMessages(agentId, taskRegistry),
          terminal: true,
        });
        throw new ResumeAgentStateError(
          `still failing after ${MAX_TRANSIENT_RESUME_RETRIES} retries: ${errorMessage(error)}`,
        );
      }
      let delayMs = jitteredBackoffMs(retryState.attempt, random);
      logForDebugging(
        `stranded resume of ${agentId} retries in ${delayMs}ms (attempt ${retryState.attempt}, ${retryState.transient}/${MAX_TRANSIENT_RESUME_RETRIES} transient): ${errorMessage(error)}`,
      );
      retryState.timer = timers.setTimeout(() => {
        retryState.timer = undefined;
        let agent = taskRegistry.get(agentId);
        if (isLocalAgent(agent) && agent.pendingMessages.length === 0) {
          clearRetry(agentId);
          return;
        }
        if (!isLocalAgent(agent)) {
          clearRetry(agentId);
          let evictionError = new ResumeAgentStateError(
            `Agent ${agentId} was evicted before its stranded resume retry ran; nothing further will be delivered from its queue.`,
          );
          getTaskRunState().agentResumeFailed.emit(agentId, {
            error: evictionError,
            undeliverable: [],
            terminal: true,
          });
          onFailed(agentId, evictionError);
          return;
        }
        let userInitiated = hasUserInitiatedPending(agent);
        let { stoppedByUser, status } = agent;
        if (
          !canReceiveNotification(agent, {
            userInitiated,
          })
        ) {
          clearRetry(agentId);
          let refusalError =
            stoppedByUser === true
              ? new AgentStoppedByUserError(`Agent ${agentId} was stopped by the user and won't be resumed.`)
              : new ResumeAgentStateError(`Agent ${agentId} is ${status} and cannot take queued messages.`);
          getTaskRunState().agentResumeFailed.emit(agentId, {
            error: refusalError,
            undeliverable: drainPendingMessages(agentId, taskRegistry),
            terminal: true,
          });
          onFailed(agentId, refusalError);
          return;
        }
        dispatch(agentId);
      }, delayMs);
      pendingRetries.set(agentId, retryState);
      throw error;
    }
  };
  let dispatch = async (agentId) => {
    if (disposed) return;
    try {
      await attemptDelivery(agentId);
    } catch (error) {
      onFailed(agentId, error);
    }
  };
  return {
    dispatch,
    dispose: () => {
      disposed = true;
      for (let key of [...pendingRetries.keys()]) clearRetry(key);
    },
  };
}
//@ chunk-nh1pvp1m.js:63151-63181 placement
/**
 * 判断消息是否为"只含结果"的任务通知（排除纯工具调用的用户消息）。
 */
function isResultOnlyTaskNotification(message) {
  return isEvalSettleWakePollEvent(message);
}
//@ chunk-nh1pvp1m.js:63181-63942 placement
function buildTaskNotificationText(allMessages, tasks) {
  if (!tasks || allMessages.length === 0) return [];
  let tasksByAgent = new Map();
  let notificationsByAgent = new Map();
  for (let notification of allMessages) {
    if (
      !notification.agentId ||
      !(notification.mode === "task-notification" || isResultOnlyTaskNotification(notification))
    )
      continue;
    let task = tasksByAgent.get(notification.agentId);
    if (!task) {
      let task_2 = tasks[notification.agentId];
      if (
        !isBackgroundedSubagent(task_2) ||
        !hasCompletedWithFindings(task_2) ||
        task_2.finalizing ||
        task_2.resuming
      )
        continue;
      task = task_2;
      tasksByAgent.set(notification.agentId, task);
    }
    let notifications = notificationsByAgent.get(notification.agentId) ?? [];
    if (notification.mode === "task-notification") notifications.push(notification);
    notificationsByAgent.set(notification.agentId, notifications);
  }
  return Array.from(notificationsByAgent, ([agentId, notifications]) => {
    let filtered = notifications.filter(
      (notification) => typeof notification.value === "string" && notification.value,
    );
    let mapped = filtered.map((notification) => String(notification.value));
    let toolsUsed = normalizeCaseForComparison_2(
      filtered.flatMap((notification) => notification.toolsUsed ?? []),
    );
    return {
      agentId,
      prompt: mapped.join(`

`),
      consumedCommands: notifications,
      resultsOnly: notifications.length === 0,
      origin: notificationOriginForResults(notifications),
      ...(toolsUsed.length > 0 && {
        toolsUsed,
      }),
      noticeLengths: mapped.map((promptText) => promptText.length),
      noticeOwn: filtered.map((notification) => isTaskNotificationOrigin(notification.origin, undefined)),
      noticeRunIds: filtered.map((notification) => notification.runId ?? null),
    };
  });
}
//@ chunk-nh1pvp1m.js:63942-64030 placement
var TASK_NOTIFICATION_ORIGIN = {
  kind: "task-notification",
};
var SESSION_TASK_NOTIFICATION_ORIGIN = {
  kind: "task-notification",
  producer: "session-task",
};
//@ chunk-nh1pvp1m.js:64030-64105 placement
function notificationOriginForResults(notifications) {
  return notifications.length > 0 &&
    notifications.every((notification) => isTaskNotificationOrigin(notification.origin, undefined))
    ? SESSION_TASK_NOTIFICATION_ORIGIN
    : TASK_NOTIFICATION_ORIGIN;
}
//@ chunk-nh1pvp1m.js:64105-64278 placement
/**
 * 记录已送达的子代理结果消息，并判断某次"仅结果"投递涉及的结果是否都已送达过。
 */
function createDeliveredResultsTracker() {
  let weakSet = new WeakSet();
  return {
    note(allMessages, agentId) {
      for (let message of resultOnlyMessagesOfAgent(allMessages, agentId)) weakSet.add(message);
    },
    holds(allMessages, result) {
      let agentMessages = resultOnlyMessagesOfAgent(allMessages, result.agentId);
      return (
        result.resultsOnly &&
        agentMessages.length > 0 &&
        agentMessages.every((message) => weakSet.has(message))
      );
    },
  };
}
//@ chunk-nh1pvp1m.js:64278-64339 placement
function resultOnlyMessagesOfAgent(messages, agentId) {
  return messages.filter((message) => message.agentId === agentId && isResultOnlyTaskNotification(message));
}
//@ chunk-nh1pvp1m.js:64339-64351 placement
var SLACK_CONNECT_DIALOGS_CACHE = null;
//@ chunk-nh1pvp1m.js:64351-64552 placement
function isSdkHostOrigin(kind, originKind) {
  if (kind === REFUSAL_FALLBACK_DIALOG.kind || kind === FABLE_OVERAGE_CONSENT_DIALOG.kind) return true;
  if (kind === AUTO_MODE_SERVER_FALLBACK) return originKind === "sdk_host";
  if (kind === ENUM_PROMPT) return originKind === "sdk_host";
  return (
    originKind === "sdk_host" &&
    SLACK_CONNECT_DIALOGS_CACHE !== null &&
    SLACK_CONNECT_DIALOGS_CACHE.slackConnectDialogs.some(
      (slackConnectDialog) => slackConnectDialog.kind === kind,
    )
  );
}
//@ chunk-nh1pvp1m.js:64552-64693 placement
function logBridgeInitializeCommands(commands) {
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_initialize_commands", false)) return [];
  if (getDisableSlashCommands()) return [];
  let bridgeSlashCommands = toBridgeSlashCommands(commands);
  logFeatureOk("bridge_initialize_commands");
  return bridgeSlashCommands;
}
//@ chunk-nh1pvp1m.js:64693-64932 placement
function commandNamesForBridge(commands, extraCommands, syncedCommands) {
  let merged = dropSyncedNameClashes(commands, [...extraCommands, ...syncedCommands]);
  if (extraCommands.length === 0) return merged;
  let takenNames = new Set(merged.map((command) => command.name));
  let takenCommandNames = new Set(merged.map(getCommandName));
  let mapped = uniqByExport(extraCommands, "name")
    .filter((command) => !takenNames.has(command.name))
    .map((command) =>
      command.isMcp && takenCommandNames.has(getCommandName(command))
        ? {
            ...command,
            isHidden: true,
          }
        : command,
    );
  return [...merged, ...mapped];
}
//@ chunk-nh1pvp1m.js:64932-65306 placement
function buildBridgeInitializeCommands(usage, turnEndAt) {
  let bridgeHost = bridgeHostState();
  let bridgeHandle = bridgeHost.replHandle ?? bridgeHost.sdkHostedHandle;
  if (!bridgeHandle || bridgeHandle.outboundOnly) return;
  if (bridgeHost.contextUsageMirror === undefined) {
    let reporter = new ContextUsageEstimateReporter((contextUsage) => {
      let bridgeHandle = bridgeHost.replHandle ?? bridgeHost.sdkHostedHandle;
      if (bridgeHost.contextUsageMirror === reporter && bridgeHandle && !bridgeHandle.outboundOnly)
        bridgeHandle.reportMetadata({
          context_usage: contextUsage,
        });
    });
    bridgeHost.contextUsageMirror = reporter;
  }
  return turnEndAt
    ? bridgeHost.contextUsageMirror.reportAtTurnEnd(usage, turnEndAt)
    : bridgeHost.contextUsageMirror.report(usage);
}
export {
  buildBridgeInitializeCommands,
  commandNamesForBridge,
  logBridgeInitializeCommands,
  isSdkHostOrigin,
  LowLatencySubmitQueue,
  createDeliveredResultsTracker,
  isResultOnlyTaskNotification,
  buildTaskNotificationText,
  isRetryableAgentError,
  MAX_TRANSIENT_RESUME_RETRIES,
  createStrandedResumeRetrier,
  jitteredBackoffMs,
};
