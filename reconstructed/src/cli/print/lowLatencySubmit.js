/**
 * cli/print/lowLatencySubmit.ts
 *
 * 2.1.316 新增：[low-latency-submit] 排队消息的提前投递（在当前轮次中插入或等待），含失败重试与观察者/协调者来源判定
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0sfjpx19.js (28)
 * attribution: placement 28
 */
import { logForDebugging } from "../../utils/debug.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { DoctorLazy } from "../handlers/util.js";
import {
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../../utils/errors.js";
import { stringSchema, objectSchema, array } from "../../../vendor/zod/v4/classic/schemas.js";
import { logError } from "../../utils/log.js";
import { logEvent } from "../../services/analytics/index.js";
import { isRefillableInput } from "../../utils/messageQueueManager.js";
import { isBackgroundTasksOff } from "../../tools/AgentTool/backgroundGates.js";
import { dropTextInBriefTurns } from "../../components/Messages.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { env } from "../../utils/env.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import {
  MOVED_RESULT_HOLD_MS,
  GRACE_POLL_TICKS,
  decideQueuedPromptAction,
  MAX_MOVED_RESULT_WAITS,
} from "./setModelControl.js";
import {
  backgroundShellsToDeliverMessage,
  isForegroundShellOf,
  isForegroundShellFromCaller,
  isForegroundTask,
} from "../../tasks/LocalShellTask/LocalShellTask.js";
import { killTask } from "../../tasks/LocalShellTask/killShellTasks.js";
import {
  foregroundCallRegistrySlots,
  backgroundForegroundCalls,
} from "../../services/tools/detachedToolCalls.js";
import { isActivityReasonActive, getMainLoopRefcount } from "../../utils/sessionActivity.js";
import { mainAgentId, getDisableSlashCommands } from "../../bootstrap/state.js";
import { PREAMBLE_TASK_SUFFIX, stripPreambleSuffix } from "../../tasks/LocalShellTask/backgroundNotices.js";
import {
  isForegroundAgentTask,
  hasUserInitiatedPending,
  canReceiveNotification,
} from "../../tasks/taskKinds.js";
import { AGENT, TASK } from "../../tools/AgentTool/constants.js";
import {
  moveAgentToBackground,
  queuePendingMessage,
  isBackgroundedSubagent,
  hasCompletedWithFindings,
} from "../../tasks/LocalAgentTask/LocalAgentTask.js";
import { isExactReplToolName } from "../../tools/REPLTool/constants.js";
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
import { getTaskRunState } from "../../utils/task/taskNotifications.js";
import { neverFalse } from "../../utils/pollEvents.js";
import { uniq } from "../../utils/collections.js";
import { isTaskNotificationOrigin } from "../../utils/backgroundSessionResume.js";
import { REFUSAL_FALLBACK_DIALOG } from "../../services/requestUserDialog.js";
import { FABLE_OVERAGE_CONSENT_DIALOG } from "../../services/api/overageConsent.js";
import { AUTO_MODE_SERVER_FALLBACK, ENUM_PROMPT } from "../../components/nudges/nudgeIds.js";
import { toBridgeSlashCommands, getCommandName } from "../../commands.js";
import { dropSyncedNameClashes } from "../../utils/commandPredicates.js";
import { uniqByExport } from "../../../vendor/lodash-es/uniqBy.js";
import { bridgeHostState } from "../../bridge/bridgeHostState.js";
import { ContextUsageEstimateReporter } from "./resumeTurnBoundaries.js";

//@ chunk-0sfjpx19.js:34121-34784 placement
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
//@ chunk-0sfjpx19.js:34784-39757 placement
/**
 * 低延迟提交队列：决定排队消息何时可提前送入正在进行的轮次（约 5 KB）。
 */
class LowLatencySubmitQueue {
  #t;
  #e = new Map();
  #n = null;
  #f = [];
  #m = false;
  #p = "";
  #d = false;
  #o = 0;
  #l = false;
  #r = new Set();
  #g = 0;
  #u = 0;
  #h = false;
  constructor(deps) {
    this.#t = deps;
  }
  sendQueuedNow = () => {
    let didSchedule = false;
    this.#a(() => {
      if (this.#h) return;
      let { messageQueue, turn } = this.#t;
      if (!turn.guard.isRunning && !turn.guard.isDispatchingForModel) {
        this.#s();
        return;
      }
      let agentId = agentIdOrMain(turn.agentId);
      for (let queuedMessage of messageQueue.getCommandQueueSnapshot())
        if (
          queuedMessage.uuid !== undefined &&
          queuedMessage.agentId === agentId &&
          queuedMessage.mode === "prompt" &&
          isRefillableInput(queuedMessage) &&
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
        this.#s();
        return;
      }
      didSchedule = true;
      this.#d = false;
      this.#l = false;
      if (this.#f.length === 0) this.#f = [messageQueue.subscribe(this.#S), turn.guard.subscribe(this.#C)];
      if (this.#n === null) this.#y(0);
    });
    return didSchedule;
  };
  moveHolders() {
    this.#a(() => {
      let { turn, transcript, taskRegistry } = this.#t;
      if (this.#h || !isLocalTurnRunning(turn) || isBackgroundTasksOff()) return;
      let liveToolUseIds = dropTextInBriefTurns(transcript.getSnapshot());
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
    this.#h = true;
    this.#a(() => this.#s());
  }
  #y(delayMs) {
    this.#n?.();
    this.#n = this.#t.clock.setTimeout(this.#v, delayMs);
  }
  #i() {
    this.#n?.();
    this.#n = null;
    this.#o = 0;
    this.#r.clear();
    this.#g = 0;
    this.#u = 0;
  }
  #s() {
    this.#i();
    for (let unsubscribe of this.#f.splice(0)) unsubscribe();
    this.#w();
    this.#e.clear();
    this.#m = false;
    this.#p = "";
    this.#d = false;
    this.#l = false;
  }
  #c() {
    if (this.#e.size > 0) this.#y(MOVED_RESULT_HOLD_MS);
  }
  #w() {
    for (let [messageUuid, moveState] of this.#e)
      if (moveState.raisedFrom !== null) {
        let raisedFrom = moveState.raisedFrom;
        moveState.raisedFrom = null;
        this.#t.messageQueue.demoteFromNow(messageUuid, raisedFrom);
      }
  }
  #b() {
    let liveUuids = new Set(
      this.#t.messageQueue.getCommandQueueSnapshot().map((queuedMessage) => queuedMessage.uuid),
    );
    for (let [messageUuid, moveState] of this.#e) {
      if (liveUuids.has(messageUuid)) continue;
      this.#e.delete(messageUuid);
      if (this.#t.messageQueue.isFoldInFlight(messageUuid)) this.#l = true;
      if (moveState.outcome !== "undecided" && moveState.outcome !== "delivered_early")
        logFeatureSad(this.#t.featureName, moveState.outcome);
    }
  }
  #S = () => {
    this.#a(() => {
      let [previousFirstUuid] = this.#e.keys();
      this.#b();
      if (this.#e.size === 0) {
        this.#s();
        return;
      }
      if (this.#l) {
        this.#i();
        return;
      }
      let [currentFirstUuid] = this.#e.keys();
      if (currentFirstUuid !== previousFirstUuid && (this.#n !== null || this.#t.turn.guard.isActive))
        this.#y(0);
    });
  };
  #C = () => {
    this.#a(() => {
      let { guard } = this.#t.turn;
      if (!guard.isActive) {
        this.#d = true;
        this.#i();
        return;
      }
      if (this.#d) this.#s();
    });
  };
  #v = () => {
    this.#n = null;
    this.#a(() => {
      this.#A();
    });
  };
  #a(callback) {
    try {
      callback();
    } catch (error) {
      logError(error);
      if (!this.#m) {
        this.#m = true;
        logFeatureBad(this.#t.featureName, "check_threw");
      }
    }
  }
  #A() {
    let { messageQueue, turn, transcript, session, taskRegistry } = this.#t;
    this.#b();
    if (this.#e.size === 0) {
      this.#s();
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
    let liveToolUseIds = dropTextInBriefTurns(snapshot);
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
      if (hasRaisedHolders) this.#c();
      else this.#i();
      return;
    }
    let { head, uuid, priority } = picked;
    let agentTasks = foregroundAgentTasksInSet(values, liveToolUseIds, turn.agentId);
    let calls = (foregroundCallRegistrySlots.peek(session)?.list() ?? []).filter((call) =>
      setHasToolUseId(liveToolUseIds, call.toolUseId),
    );
    let backgroundingDisabled = isBackgroundTasksOff();
    let movableShells = backgroundingDisabled ? [] : liveShells;
    let movableAgentTasks = backgroundingDisabled
      ? []
      : agentTasks.filter((agentTask) => isToolUseMarkedAgentOrTask(liveToolUseIds, agentTask));
    let evidence = turn.readEvidence();
    let last = snapshot.at(-1);
    for (let toolUseId of this.#r) if (!liveToolUseIds.has(toolUseId)) this.#r.delete(toolUseId);
    let decisionInput = {
      head,
      hasFoldTakenPrompt: this.#l,
      isLocalTurnActive: turn.guard.isActive,
      isLocalTurnRunning: isLocalTurnRunning(turn),
      isHeldByDialog: evidence.isHeldByDialog,
      holderCount: liveShells.length + agentTasks.length + calls.length,
      unmovableHolderCount:
        (backgroundingDisabled ? liveShells.length : 0) + (agentTasks.length - movableAgentTasks.length),
      isExecuting: evidence.isToolCallStarting || liveToolUseIds.size > 0,
      isAwaitingMovedResult: this.#r.size > 0,
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
    if (traceLine !== this.#p) {
      this.#p = traceLine;
      logForDebugging(`[low-latency-submit] ${traceLine} agent=${turn.agentId ?? "main"}`);
    }
    switch (decision.action) {
      case "stand_by":
        this.#i();
        return;
      case "wait":
        this.#o = decision.reason === "unmovable_grace" ? this.#o + 1 : 0;
        if (decision.reason === "moved_result" && ++this.#g >= MAX_MOVED_RESULT_WAITS) this.#r.clear();
        if (decision.reason !== "not_ready" && pickedState.outcome === "undecided")
          pickedState.outcome = decision.reason;
        this.#c();
        return;
      case "background": {
        let outcome = pickedState.outcome;
        pickedState.outcome = "delivered_early";
        let movedToolUseIds = toolUseIdsToMoveToBackground(movableShells, movableAgentTasks, taskRegistry);
        let movedCount = movedToolUseIds.length;
        let backgroundedCallCount = backgroundForegroundCalls(calls);
        movedCount += backgroundedCallCount;
        if (backgroundedCallCount > 0) movedToolUseIds.push(...calls.map((movedCall) => movedCall.toolUseId));
        if (this.#e.size > 0) {
          this.#g = 0;
          for (let movedToolUseId of movedToolUseIds)
            if (movedToolUseId !== undefined) this.#r.add(movedToolUseId);
        }
        if (movedCount === 0) {
          pickedState.outcome = outcome === "undecided" ? "nothing_moved" : outcome;
          if (decisionInput.isUnmovableGraceOver) {
            if (backgroundingDisabled) this.#_(pickedState);
            else this.#k(pickedState, uuid, priority);
            return;
          }
          if (this.#e.size > 0) this.#o++;
        } else {
          this.#o = 0;
          if (outcome !== "delivered_early") logFeatureOk(this.#t.featureName);
        }
        this.#c();
        return;
      }
      case "interrupt":
        this.#k(pickedState, uuid, priority);
        return;
      case "cancel":
        this.#_(pickedState);
    }
  }
  #_(moveState) {
    let { interruptForSubmit } = this.#t.turn;
    if (interruptForSubmit === undefined) {
      if (moveState.outcome === "undecided") moveState.outcome = "nothing_moved";
    } else {
      if (moveState.outcome !== "delivered_early") moveState.outcome = "fell_back_to_cancel";
      interruptForSubmit();
    }
    this.#i();
  }
  #k(moveState, messageUuid, raisedFrom) {
    this.#o = 0;
    this.#u = 0;
    moveState.raisedFrom = raisedFrom;
    if (!this.#t.messageQueue.promoteToNow(messageUuid)) moveState.raisedFrom = null;
    else if (moveState.outcome !== "delivered_early") {
      moveState.outcome = "delivered_early";
      logFeatureOk(this.#t.featureName);
    }
    this.#c();
  }
}
//@ chunk-0sfjpx19.js:39757-39787 placement
function agentIdOrMain(agentId) {
  return agentId ?? mainAgentId();
}
//@ chunk-0sfjpx19.js:39787-39949 placement
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
//@ chunk-0sfjpx19.js:39949-40030 placement
function foregroundAgentTasksInSet(allTasks, liveToolUseIds, parentAgentId) {
  return allTasks
    .filter((task) => isForegroundAgentTask(task, parentAgentId))
    .filter((task) => setHasToolUseId(liveToolUseIds, task.toolUseId));
}
//@ chunk-0sfjpx19.js:40030-40114 placement
function isToolUseMarkedAgentOrTask(marks, { toolUseId }) {
  let mark = toolUseId === undefined ? undefined : marks.get(toolUseId);
  return mark === AGENT || mark === TASK;
}
//@ chunk-0sfjpx19.js:40114-40213 placement
function toolUseIdsToMoveToBackground(tasks, agentTasks, taskRegistry) {
  return [
    ...backgroundShellsToDeliverMessage(tasks, taskRegistry).map(firstLineOfToolUseId),
    ...agentTasks
      .filter((agentTask) => moveAgentToBackground(agentTask.id, taskRegistry))
      .map((agentTask) => agentTask.toolUseId),
  ];
}
//@ chunk-0sfjpx19.js:40213-40293 placement
function isLocalTurnRunning(turn) {
  return turn.guard.isRunning && turn.abortController?.signal.aborted === false;
}
//@ chunk-0sfjpx19.js:40293-40360 placement
function firstLineOfToolUseId(task) {
  return task.toolUseId === undefined ? undefined : stripPreambleSuffix(task.toolUseId);
}
//@ chunk-0sfjpx19.js:40360-40921 placement
function isTurnRunning(allTasks, liveToolUseIds, exemptShells, agentId) {
  let any = [...liveToolUseIds.values()].some(isExactReplToolName);
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
//@ chunk-0sfjpx19.js:40921-40966 placement
function setHasToolUseId(toolUseIdSet, toolUseId) {
  return toolUseId !== undefined && toolUseIdSet.has(toolUseId);
}
//@ chunk-0sfjpx19.js:40966-41040 placement
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
//@ chunk-0sfjpx19.js:41040-41910 placement
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
//@ chunk-0sfjpx19.js:41910-41937 placement
/**
 * 代理恢复退避参数：最多 5 次瞬时失败重试、基数 2s、上限 60s。
 */
var MAX_TRANSIENT_RESUME_RETRIES = 5;
var RESUME_BACKOFF_BASE_MS = 2000;
var RESUME_BACKOFF_CAP_MS = 60000;
//@ chunk-0sfjpx19.js:41937-42039 placement
/**
 * 指数退避加抖动：延迟取 min(上限, 基数×2^(n−1))，结果在其一半到全值之间随机。
 */
function jitteredBackoffMs(attempt, random = Math.random) {
  let min = Math.min(RESUME_BACKOFF_CAP_MS, RESUME_BACKOFF_BASE_MS * 2 ** Math.max(0, attempt - 1));
  return Math.round(min / 2 + (random() * min) / 2);
}
//@ chunk-0sfjpx19.js:42039-42116 placement
var realTimers = {
  setTimeout: (fn, delayMs) => setTimeout(fn, delayMs),
  clearTimeout: (timer) => clearTimeout(timer),
};
//@ chunk-0sfjpx19.js:42116-43567 placement
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
//@ chunk-0sfjpx19.js:43567-43597 placement
/**
 * 判断消息是否为"只含结果"的任务通知（排除纯工具调用的用户消息）。
 */
function isResultOnlyTaskNotification(message) {
  return neverFalse(message);
}
//@ chunk-0sfjpx19.js:43597-44358 placement
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
    let toolsUsed = uniq(filtered.flatMap((notification) => notification.toolsUsed ?? []));
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
//@ chunk-0sfjpx19.js:44358-44446 placement
var TASK_NOTIFICATION_ORIGIN = {
  kind: "task-notification",
};
var SESSION_TASK_NOTIFICATION_ORIGIN = {
  kind: "task-notification",
  producer: "session-task",
};
//@ chunk-0sfjpx19.js:44446-44521 placement
function notificationOriginForResults(notifications) {
  return notifications.length > 0 &&
    notifications.every((notification) => isTaskNotificationOrigin(notification.origin, undefined))
    ? SESSION_TASK_NOTIFICATION_ORIGIN
    : TASK_NOTIFICATION_ORIGIN;
}
//@ chunk-0sfjpx19.js:44521-44694 placement
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
//@ chunk-0sfjpx19.js:44694-44755 placement
function resultOnlyMessagesOfAgent(messages, agentId) {
  return messages.filter((message) => message.agentId === agentId && isResultOnlyTaskNotification(message));
}
//@ chunk-0sfjpx19.js:44755-44767 placement
var SLACK_CONNECT_DIALOGS_CACHE = null;
//@ chunk-0sfjpx19.js:44767-44968 placement
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
//@ chunk-0sfjpx19.js:44968-45109 placement
function logBridgeInitializeCommands(commands) {
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_initialize_commands", false)) return [];
  if (getDisableSlashCommands()) return [];
  let bridgeSlashCommands = toBridgeSlashCommands(commands);
  logFeatureOk("bridge_initialize_commands");
  return bridgeSlashCommands;
}
//@ chunk-0sfjpx19.js:45109-45348 placement
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
//@ chunk-0sfjpx19.js:45348-45722 placement
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
  LowLatencySubmitQueue,
  commandNamesForBridge,
  createDeliveredResultsTracker,
  buildTaskNotificationText,
  isRetryableAgentError,
  MAX_TRANSIENT_RESUME_RETRIES,
  jitteredBackoffMs,
  isResultOnlyTaskNotification,
  createStrandedResumeRetrier,
  buildBridgeInitializeCommands,
  logBridgeInitializeCommands,
  isSdkHostOrigin,
};
