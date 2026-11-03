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
import { string, u, array } from "../../../vendor/zod/v4/classic/schemas.js";
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
import { Ji } from "../../../vendor/lodash-es/uniqBy.js";
import { bridgeHostState } from "../../bridge/bridgeHostState.js";
import { ContextUsageEstimateReporter } from "./resumeTurnBoundaries.js";

//@ chunk-0sfjpx19.js:34121-34784 placement
function pickQueuedMessageToMove(commandQueue, n, messageQueue, s) {
  let index = commandQueue.findIndex((w) => w.uuid !== undefined && n.has(w.uuid) && w.priority !== "now");
  let y = commandQueue[index];
  let uuid = y?.uuid;
  if (y === undefined || uuid === undefined) return null;
  let priority = y.priority === "later" ? "later" : "next";
  if (y.drainOnly === true && y.promptSubmitted !== undefined)
    return {
      head: "ended_by_hook",
      uuid,
      priority,
    };
  let sliced = commandQueue.slice(0, index);
  if (
    commandQueue.some((w) => w.screeningPending === true && w.agentId === s) ||
    messageQueue.isFoldInFlight(uuid) ||
    messageQueue.isMidTurnFoldSuspended() ||
    sliced.some((w) => w.priority === "now" && w.agentId === s)
  )
    return {
      head: "not_ready",
      uuid,
      priority,
    };
  if (sliced.some((w) => w.agentId === s && (w.mode === "prompt" || w.mode === "bash")))
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
  constructor(e) {
    this.#t = e;
  }
  sendQueuedNow = () => {
    let e = false;
    this.#a(() => {
      if (this.#h) return;
      let { messageQueue, turn } = this.#t;
      if (!turn.guard.isRunning && !turn.guard.isDispatchingForModel) {
        this.#s();
        return;
      }
      let s = agentIdOrMain(turn.agentId);
      for (let y of messageQueue.getCommandQueueSnapshot())
        if (
          y.uuid !== undefined &&
          y.agentId === s &&
          y.mode === "prompt" &&
          isRefillableInput(y) &&
          !this.#e.has(y.uuid)
        )
          this.#e.set(y.uuid, {
            outcome: "undecided",
            raisedFrom: null,
          });
      if (this.#e.size === 0) return;
      let head = pickQueuedMessageToMove(messageQueue.getCommandQueue(), this.#e, messageQueue, s)?.head;
      if (head === "behind_earlier" || head === "ended_by_hook") {
        this.#s();
        return;
      }
      e = true;
      this.#d = false;
      this.#l = false;
      if (this.#f.length === 0) this.#f = [messageQueue.subscribe(this.#S), turn.guard.subscribe(this.#C)];
      if (this.#n === null) this.#y(0);
    });
    return e;
  };
  moveHolders() {
    this.#a(() => {
      let { turn, transcript, taskRegistry } = this.#t;
      if (this.#h || !isLocalTurnRunning(turn) || isBackgroundTasksOff()) return;
      let s = dropTextInBriefTurns(transcript.getSnapshot());
      let values = Object.values(taskRegistry.all());
      toolUseIdsToMoveToBackground(
        runningForegroundShellsFor(values, s, turn.agentId),
        foregroundAgentTasksInSet(values, s, turn.agentId).filter((y) => isToolUseMarkedAgentOrTask(s, y)),
        taskRegistry,
      );
    });
  }
  dispose() {
    this.#h = true;
    this.#a(() => this.#s());
  }
  #y(e) {
    this.#n?.();
    this.#n = this.#t.clock.setTimeout(this.#v, e);
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
    for (let e of this.#f.splice(0)) e();
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
    for (let [e, n] of this.#e)
      if (n.raisedFrom !== null) {
        let raisedFrom = n.raisedFrom;
        n.raisedFrom = null;
        this.#t.messageQueue.demoteFromNow(e, raisedFrom);
      }
  }
  #b() {
    let e = new Set(this.#t.messageQueue.getCommandQueueSnapshot().map((n) => n.uuid));
    for (let [n, r] of this.#e) {
      if (e.has(n)) continue;
      this.#e.delete(n);
      if (this.#t.messageQueue.isFoldInFlight(n)) this.#l = true;
      if (r.outcome !== "undecided" && r.outcome !== "delivered_early")
        logFeatureSad(this.#t.featureName, r.outcome);
    }
  }
  #S = () => {
    this.#a(() => {
      let [e] = this.#e.keys();
      this.#b();
      if (this.#e.size === 0) {
        this.#s();
        return;
      }
      if (this.#l) {
        this.#i();
        return;
      }
      let [n] = this.#e.keys();
      if (n !== e && (this.#n !== null || this.#t.turn.guard.isActive)) this.#y(0);
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
  #a(e) {
    try {
      e();
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
    let y = pickQueuedMessageToMove(
      messageQueue.getCommandQueue(),
      this.#e,
      messageQueue,
      agentIdOrMain(turn.agentId),
    );
    let _ = y === null ? undefined : this.#e.get(y.uuid);
    let snapshot = transcript.getSnapshot();
    let k = dropTextInBriefTurns(snapshot);
    let values = Object.values(taskRegistry.all());
    let tasks = runningForegroundShellsFor(values, k, turn.agentId);
    let T = turn.guard.isActive && [...this.#e.values()].some((V) => V.raisedFrom !== null);
    if (T && !isBackgroundTasksOff()) {
      backgroundShellsToDeliverMessage(tasks, taskRegistry);
      this.#u = k.size > 0 ? this.#u + 1 : 0;
      if (turn.endsUnmovableShells && this.#u > GRACE_POLL_TICKS)
        for (let V of isTurnRunning(values, k, tasks, turn.agentId)) killTask(V.id, taskRegistry);
    }
    if (y === null || _ === undefined) {
      if (T) this.#c();
      else this.#i();
      return;
    }
    let { head, uuid, priority } = y;
    let G = foregroundAgentTasksInSet(values, k, turn.agentId);
    let filtered = (foregroundCallRegistrySlots.peek(session)?.list() ?? []).filter((V) =>
      setHasToolUseId(k, V.toolUseId),
    );
    let P = isBackgroundTasksOff();
    let U = P ? [] : tasks;
    let L = P ? [] : G.filter((V) => isToolUseMarkedAgentOrTask(k, V));
    let evidence = turn.readEvidence();
    let last = snapshot.at(-1);
    for (let V of this.#r) if (!k.has(V)) this.#r.delete(V);
    let Q = {
      head,
      hasFoldTakenPrompt: this.#l,
      isLocalTurnActive: turn.guard.isActive,
      isLocalTurnRunning: isLocalTurnRunning(turn),
      isHeldByDialog: evidence.isHeldByDialog,
      holderCount: tasks.length + G.length + filtered.length,
      unmovableHolderCount: (P ? tasks.length : 0) + (G.length - L.length),
      isExecuting: evidence.isToolCallStarting || k.size > 0,
      isAwaitingMovedResult: this.#r.size > 0,
      isBackgroundingDisabled: P,
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
    let ne = decideQueuedPromptAction(Q);
    let z = `${ne.action}${ne.action === "wait" ? ` ${ne.reason}` : ""} head=${head} holders=${Q.holderCount} executing=${Q.isExecuting}`;
    if (z !== this.#p) {
      this.#p = z;
      logForDebugging(`[low-latency-submit] ${z} agent=${turn.agentId ?? "main"}`);
    }
    switch (ne.action) {
      case "stand_by":
        this.#i();
        return;
      case "wait":
        this.#o = ne.reason === "unmovable_grace" ? this.#o + 1 : 0;
        if (ne.reason === "moved_result" && ++this.#g >= MAX_MOVED_RESULT_WAITS) this.#r.clear();
        if (ne.reason !== "not_ready" && _.outcome === "undecided") _.outcome = ne.reason;
        this.#c();
        return;
      case "background": {
        let outcome = _.outcome;
        _.outcome = "delivered_early";
        let j = toolUseIdsToMoveToBackground(U, L, taskRegistry);
        let pe = j.length;
        let me = backgroundForegroundCalls(filtered);
        pe += me;
        if (me > 0) j.push(...filtered.map((ce) => ce.toolUseId));
        if (this.#e.size > 0) {
          this.#g = 0;
          for (let ce of j) if (ce !== undefined) this.#r.add(ce);
        }
        if (pe === 0) {
          _.outcome = outcome === "undecided" ? "nothing_moved" : outcome;
          if (Q.isUnmovableGraceOver) {
            if (P) this.#_(_);
            else this.#k(_, uuid, priority);
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
        this.#k(_, uuid, priority);
        return;
      case "cancel":
        this.#_(_);
    }
  }
  #_(e) {
    let { interruptForSubmit } = this.#t.turn;
    if (interruptForSubmit === undefined) {
      if (e.outcome === "undecided") e.outcome = "nothing_moved";
    } else {
      if (e.outcome !== "delivered_early") e.outcome = "fell_back_to_cancel";
      interruptForSubmit();
    }
    this.#i();
  }
  #k(e, n, raisedFrom) {
    this.#o = 0;
    this.#u = 0;
    e.raisedFrom = raisedFrom;
    if (!this.#t.messageQueue.promoteToNow(n)) e.raisedFrom = null;
    else if (e.outcome !== "delivered_early") {
      e.outcome = "delivered_early";
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
function runningForegroundShellsFor(e, n, agentId) {
  return e
    .filter((s) => isForegroundShellOf(s, agentId))
    .filter(
      (s) =>
        s.status === "running" &&
        ((s.caller === "inner" && s.toolUseId?.includes(PREAMBLE_TASK_SUFFIX) === true) ||
          isForegroundShellFromCaller(s, agentId)) &&
        setHasToolUseId(n, firstLineOfToolUseId(s)),
    );
}
//@ chunk-0sfjpx19.js:39949-40030 placement
function foregroundAgentTasksInSet(e, n, agentId) {
  return e.filter((s) => isForegroundAgentTask(s, agentId)).filter((s) => setHasToolUseId(n, s.toolUseId));
}
//@ chunk-0sfjpx19.js:40030-40114 placement
function isToolUseMarkedAgentOrTask(e, { toolUseId }) {
  let r = toolUseId === undefined ? undefined : e.get(toolUseId);
  return r === AGENT || r === TASK;
}
//@ chunk-0sfjpx19.js:40114-40213 placement
function toolUseIdsToMoveToBackground(tasks, n, taskRegistry) {
  return [
    ...backgroundShellsToDeliverMessage(tasks, taskRegistry).map(firstLineOfToolUseId),
    ...n.filter((s) => moveAgentToBackground(s.id, taskRegistry)).map((s) => s.toolUseId),
  ];
}
//@ chunk-0sfjpx19.js:40213-40293 placement
function isLocalTurnRunning(turn) {
  return turn.guard.isRunning && turn.abortController?.signal.aborted === false;
}
//@ chunk-0sfjpx19.js:40293-40360 placement
function firstLineOfToolUseId(e) {
  return e.toolUseId === undefined ? undefined : stripPreambleSuffix(e.toolUseId);
}
//@ chunk-0sfjpx19.js:40360-40921 placement
function isTurnRunning(e, n, r, agentId) {
  let any = [...n.values()].some(isExactReplToolName);
  let filtered = e.filter(isLocalAgent).filter((b) => b.status === "running" && !b.isBackgrounded);
  let _ = new Set(
    filtered
      .filter((b) => b.parentAgentId === agentId && (any || setHasToolUseId(n, b.toolUseId)))
      .map((b) => b.agentId),
  );
  for (let b = -1; b !== _.size;) {
    b = _.size;
    for (let k of filtered) if (k.parentAgentId !== undefined && _.has(k.parentAgentId)) _.add(k.agentId);
  }
  return e.filter(isLocalShellTask).filter((b) => {
    let k = isForegroundShellFromCaller(b, agentId) || r.includes(b);
    let w = isForegroundTask(b);
    if (b.status !== "running" || !w || k) return false;
    if (b.agentId !== agentId) return b.agentId !== undefined && _.has(b.agentId);
    let { toolUseId } = b;
    return any || (toolUseId !== undefined && setHasToolUseId(n, firstLineOf(toolUseId, ":")));
  });
}
//@ chunk-0sfjpx19.js:40921-40966 placement
function setHasToolUseId(e, toolUseId) {
  return toolUseId !== undefined && e.has(toolUseId);
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
async function deliverQueuedNow(e, taskRegistry, r) {
  let s = isHeldByPlugin();
  let h = drainPendingMessages(e, taskRegistry);
  let y = ({ origin, userInitiatedAt }) =>
    userInitiatedAt !== undefined ||
    origin === undefined ||
    origin.kind === "human" ||
    origin.kind === "observer" ||
    ((origin.kind === "coordinator" || origin.kind === "peer") && origin.plugin === undefined);
  let _ = s ? h.find(y) : h[0];
  if (_ === undefined) {
    queuePendingMessage(e, h, taskRegistry);
    if (h.length > 0)
      holdQueuedInput(() => getTaskRunState().agentStrandedMessages.emit(e), undefined, "stays");
    return;
  }
  let filtered = h.filter((S) => S !== _);
  let k = hasUserInitiatedPending(taskRegistry.get(e), h);
  queuePendingMessage(e, filtered, taskRegistry);
  let w;
  try {
    w = await r(_, k);
  } catch (error) {
    let T = [_, ...drainPendingMessages(e, taskRegistry)];
    if (isRetryableAgentError(error)) {
      queuePendingMessage(e, T, taskRegistry);
      throw error;
    }
    let D = hasUserInitiatedPending(taskRegistry.get(e), T);
    if (
      error instanceof AgentStoppedByUserError &&
      D &&
      canReceiveNotification(taskRegistry.get(e), {
        userInitiated: true,
      })
    ) {
      queuePendingMessage(e, T, taskRegistry);
      throw new AgentResumeTransientError(
        `a message the user typed for agent ${e} arrived while a resume their stop refused was in flight; retrying with it`,
      );
    }
    let E =
      error instanceof ResumeAgentStateError ||
      !canReceiveNotification(taskRegistry.get(e), {
        userInitiated: D,
      });
    if (!E) queuePendingMessage(e, T, taskRegistry);
    getTaskRunState().agentResumeFailed.emit(e, {
      error,
      undeliverable: E ? T : [],
      terminal: E,
    });
    throw error;
  }
  if (isResumeDenied(w)) dropDeniedResumeMessages(e, taskRegistry, [_, ...filtered], w);
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
function jitteredBackoffMs(e, random = Math.random) {
  let min = Math.min(RESUME_BACKOFF_CAP_MS, RESUME_BACKOFF_BASE_MS * 2 ** Math.max(0, e - 1));
  return Math.round(min / 2 + (random() * min) / 2);
}
//@ chunk-0sfjpx19.js:42039-42116 placement
var realTimers = {
  setTimeout: (e, n) => setTimeout(e, n),
  clearTimeout: (e) => clearTimeout(e),
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
  let y = new Map();
  let _ = false;
  let b = (S) => {
    let timer = y.get(S)?.timer;
    if (timer !== undefined) timers.clearTimeout(timer);
    y.delete(S);
  };
  let k = async (S) => {
    try {
      await deliverQueuedNow(S, taskRegistry, (T, D) => resume(S, T, D));
      b(S);
    } catch (error) {
      let D = y.get(S);
      b(S);
      if (!isRetryableAgentError(error)) throw error;
      let E = {
        attempt: (D?.attempt ?? 0) + 1,
        transient: (D?.transient ?? 0) + (error instanceof AgentResumeTransientError ? 1 : 0),
      };
      if (E.transient > MAX_TRANSIENT_RESUME_RETRIES) {
        getTaskRunState().agentResumeFailed.emit(S, {
          error,
          undeliverable: drainPendingMessages(S, taskRegistry),
          terminal: true,
        });
        throw new ResumeAgentStateError(
          `still failing after ${MAX_TRANSIENT_RESUME_RETRIES} retries: ${errorMessage(error)}`,
        );
      }
      let N = jitteredBackoffMs(E.attempt, random);
      logForDebugging(
        `stranded resume of ${S} retries in ${N}ms (attempt ${E.attempt}, ${E.transient}/${MAX_TRANSIENT_RESUME_RETRIES} transient): ${errorMessage(error)}`,
      );
      E.timer = timers.setTimeout(() => {
        E.timer = undefined;
        let G = taskRegistry.get(S);
        if (isLocalAgent(G) && G.pendingMessages.length === 0) {
          b(S);
          return;
        }
        if (!isLocalAgent(G)) {
          b(S);
          let L = new ResumeAgentStateError(
            `Agent ${S} was evicted before its stranded resume retry ran; nothing further will be delivered from its queue.`,
          );
          getTaskRunState().agentResumeFailed.emit(S, {
            error: L,
            undeliverable: [],
            terminal: true,
          });
          onFailed(S, L);
          return;
        }
        let userInitiated = hasUserInitiatedPending(G);
        let { stoppedByUser, status } = G;
        if (
          !canReceiveNotification(G, {
            userInitiated,
          })
        ) {
          b(S);
          let L =
            stoppedByUser === true
              ? new AgentStoppedByUserError(`Agent ${S} was stopped by the user and won't be resumed.`)
              : new ResumeAgentStateError(`Agent ${S} is ${status} and cannot take queued messages.`);
          getTaskRunState().agentResumeFailed.emit(S, {
            error: L,
            undeliverable: drainPendingMessages(S, taskRegistry),
            terminal: true,
          });
          onFailed(S, L);
          return;
        }
        w(S);
      }, N);
      y.set(S, E);
      throw error;
    }
  };
  let w = async (S) => {
    if (_) return;
    try {
      await k(S);
    } catch (error) {
      onFailed(S, error);
    }
  };
  return {
    dispatch: w,
    dispose: () => {
      _ = true;
      for (let key of [...y.keys()]) b(key);
    },
  };
}
//@ chunk-0sfjpx19.js:43567-43597 placement
/**
 * 判断消息是否为"只含结果"的任务通知（排除纯工具调用的用户消息）。
 */
function isResultOnlyTaskNotification(e) {
  return neverFalse(e);
}
//@ chunk-0sfjpx19.js:43597-44358 placement
function buildTaskNotificationText(e, tasks) {
  if (!tasks || e.length === 0) return [];
  let r = new Map();
  let s = new Map();
  for (let h of e) {
    if (!h.agentId || !(h.mode === "task-notification" || isResultOnlyTaskNotification(h))) continue;
    let y = r.get(h.agentId);
    if (!y) {
      let task = tasks[h.agentId];
      if (
        !isBackgroundedSubagent(task) ||
        !hasCompletedWithFindings(task) ||
        task.finalizing ||
        task.resuming
      )
        continue;
      y = task;
      r.set(h.agentId, y);
    }
    let _ = s.get(h.agentId) ?? [];
    if (h.mode === "task-notification") _.push(h);
    s.set(h.agentId, _);
  }
  return Array.from(s, ([h, y]) => {
    let filtered = y.filter((w) => typeof w.value === "string" && w.value);
    let mapped = filtered.map((w) => String(w.value));
    let k = uniq(filtered.flatMap((w) => w.toolsUsed ?? []));
    return {
      agentId: h,
      prompt: mapped.join(`

`),
      consumedCommands: y,
      resultsOnly: y.length === 0,
      origin: notificationOriginForResults(y),
      ...(k.length > 0 && {
        toolsUsed: k,
      }),
      noticeLengths: mapped.map((w) => w.length),
      noticeOwn: filtered.map((w) => isTaskNotificationOrigin(w.origin, undefined)),
      noticeRunIds: filtered.map((w) => w.runId ?? null),
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
function notificationOriginForResults(e) {
  return e.length > 0 && e.every((n) => isTaskNotificationOrigin(n.origin, undefined))
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
    note(n, r) {
      for (let s of resultOnlyMessagesOfAgent(n, r)) weakSet.add(s);
    },
    holds(n, r) {
      let s = resultOnlyMessagesOfAgent(n, r.agentId);
      return r.resultsOnly && s.length > 0 && s.every((h) => weakSet.has(h));
    },
  };
}
//@ chunk-0sfjpx19.js:44694-44755 placement
function resultOnlyMessagesOfAgent(e, n) {
  return e.filter((r) => r.agentId === n && isResultOnlyTaskNotification(r));
}
//@ chunk-0sfjpx19.js:44755-44767 placement
var SLACK_CONNECT_DIALOGS_CACHE = null;
//@ chunk-0sfjpx19.js:44767-44968 placement
function isSdkHostOrigin(kind, n) {
  if (kind === REFUSAL_FALLBACK_DIALOG.kind || kind === FABLE_OVERAGE_CONSENT_DIALOG.kind) return true;
  if (kind === AUTO_MODE_SERVER_FALLBACK) return n === "sdk_host";
  if (kind === ENUM_PROMPT) return n === "sdk_host";
  return (
    n === "sdk_host" &&
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
function commandNamesForBridge(e, n, r) {
  let s = dropSyncedNameClashes(e, [...n, ...r]);
  if (n.length === 0) return s;
  let h = new Set(s.map((b) => b.name));
  let y = new Set(s.map(getCommandName));
  let mapped = Ji(n, "name")
    .filter((b) => !h.has(b.name))
    .map((b) =>
      b.isMcp && y.has(getCommandName(b))
        ? {
            ...b,
            isHidden: true,
          }
        : b,
    );
  return [...s, ...mapped];
}
//@ chunk-0sfjpx19.js:45348-45722 placement
function buildBridgeInitializeCommands(e, n) {
  let r = bridgeHostState();
  let s = r.replHandle ?? r.sdkHostedHandle;
  if (!s || s.outboundOnly) return;
  if (r.contextUsageMirror === undefined) {
    let h = new ContextUsageEstimateReporter((contextUsage) => {
      let _ = r.replHandle ?? r.sdkHostedHandle;
      if (r.contextUsageMirror === h && _ && !_.outboundOnly)
        _.reportMetadata({
          context_usage: contextUsage,
        });
    });
    r.contextUsageMirror = h;
  }
  return n ? r.contextUsageMirror.reportAtTurnEnd(e, n) : r.contextUsageMirror.report(e);
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
