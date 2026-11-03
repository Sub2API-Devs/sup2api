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
import { o, u, A } from "../../../vendor/zod/v4/classic/schemas.js";
import { logError } from "../../utils/log.js";
import { logEvent } from "../../services/analytics/index.js";
import { Up } from "../../utils/messageQueueManager.js";
import { uf } from "../../tools/AgentTool/backgroundGates.js";
import { dropTextInBriefTurns } from "../../components/Messages.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { env } from "../../utils/env.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { Ci, Qn, decideQueuedPromptAction, vi } from "./setModelControl.js";
import {
  backgroundShellsToDeliverMessage,
  isForegroundShellOf,
  isForegroundShellFromCaller,
  isForegroundTask,
} from "../../tasks/LocalShellTask/LocalShellTask.js";
import { killTask } from "../../tasks/LocalShellTask/killShellTasks.js";
import { Q_e, backgroundForegroundCalls } from "../../services/tools/detachedToolCalls.js";
import { isActivityReasonActive, getMainLoopRefcount } from "../../utils/sessionActivity.js";
import { mainAgentId, getDisableSlashCommands } from "../../bootstrap/state.js";
import { $qe, Wbn } from "../../tasks/LocalShellTask/backgroundNotices.js";
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
import { S4 } from "../../tools/REPLTool/constants.js";
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
import { xZ, holdQueuedInput } from "../../plugins/functionHooks/inputHold.js";
import {
  drainPendingMessages,
  dropDeniedResumeMessages,
} from "../../tasks/LocalAgentTask/pendingMessages.js";
import { getTaskRunState } from "../../utils/task/taskNotifications.js";
import { sfi } from "../../utils/pollEvents.js";
import { uniq } from "../../utils/collections.js";
import { k2t } from "../../utils/backgroundSessionResume.js";
import { REFUSAL_FALLBACK_DIALOG } from "../../services/requestUserDialog.js";
import { FABLE_OVERAGE_CONSENT_DIALOG } from "../../services/api/overageConsent.js";
import { AUTO_MODE_SERVER_FALLBACK, ENUM_PROMPT } from "../../components/nudges/nudgeIds.js";
import { toBridgeSlashCommands, getCommandName } from "../../commands.js";
import { dropSyncedNameClashes } from "../../utils/commandPredicates.js";
import { Ji } from "../../../vendor/lodash-es/uniqBy.js";
import { ao } from "../../bridge/bridgeHostState.js";
import { ContextUsageEstimateReporter } from "./resumeTurnBoundaries.js";

//@ chunk-0sfjpx19.js:34121-34784 placement
function pickQueuedMessageToMove(e, n, r, s) {
  let index = e.findIndex((w) => w.uuid !== void 0 && n.has(w.uuid) && w.priority !== "now"),
    y = e[index],
    _ = y?.uuid;
  if (y === void 0 || _ === void 0) return null;
  let b = y.priority === "later" ? "later" : "next";
  if (y.drainOnly === !0 && y.promptSubmitted !== void 0)
    return { head: "ended_by_hook", uuid: _, priority: b };
  let sliced = e.slice(0, index);
  if (
    e.some((w) => w.screeningPending === !0 && w.agentId === s) ||
    r.isFoldInFlight(_) ||
    r.isMidTurnFoldSuspended() ||
    sliced.some((w) => w.priority === "now" && w.agentId === s)
  )
    return { head: "not_ready", uuid: _, priority: b };
  if (sliced.some((w) => w.agentId === s && (w.mode === "prompt" || w.mode === "bash")))
    return { head: "behind_earlier", uuid: _, priority: b };
  return { head: "deliverable", uuid: _, priority: b };
}
/**
 * 低延迟提交队列：决定排队消息何时可提前送入正在进行的轮次（约 5 KB）。
 */
//@ chunk-0sfjpx19.js:34784-39757 placement
class LowLatencySubmitQueue {
  #t;
  #e = new Map();
  #n = null;
  #f = [];
  #m = !1;
  #p = "";
  #d = !1;
  #o = 0;
  #l = !1;
  #r = new Set();
  #g = 0;
  #u = 0;
  #h = !1;
  constructor(e) {
    this.#t = e;
  }
  sendQueuedNow = () => {
    let e = !1;
    return (
      this.#a(() => {
        if (this.#h) return;
        let { messageQueue: messageQueue, turn: turn } = this.#t;
        if (!turn.guard.isRunning && !turn.guard.isDispatchingForModel) {
          this.#s();
          return;
        }
        let s = Yn(turn.agentId);
        for (let y of messageQueue.getCommandQueueSnapshot())
          if (y.uuid !== void 0 && y.agentId === s && y.mode === "prompt" && Up(y) && !this.#e.has(y.uuid))
            this.#e.set(y.uuid, { outcome: "undecided", raisedFrom: null });
        if (this.#e.size === 0) return;
        let h = pickQueuedMessageToMove(messageQueue.getCommandQueue(), this.#e, messageQueue, s)?.head;
        if (h === "behind_earlier" || h === "ended_by_hook") {
          this.#s();
          return;
        }
        if (((e = !0), (this.#d = !1), (this.#l = !1), this.#f.length === 0))
          this.#f = [messageQueue.subscribe(this.#S), turn.guard.subscribe(this.#C)];
        if (this.#n === null) this.#y(0);
      }),
      e
    );
  };
  moveHolders() {
    this.#a(() => {
      let { turn: turn, transcript: transcript, taskRegistry: taskRegistry } = this.#t;
      if (this.#h || !oo(turn) || uf()) return;
      let s = dropTextInBriefTurns(transcript.getSnapshot()),
        values = Object.values(taskRegistry.all());
      no(
        runningForegroundShellsFor(values, s, turn.agentId),
        Zn(values, s, turn.agentId).filter((y) => eo(s, y)),
        taskRegistry,
      );
    });
  }
  dispose() {
    ((this.#h = !0), this.#a(() => this.#s()));
  }
  #y(e) {
    (this.#n?.(), (this.#n = this.#t.clock.setTimeout(this.#v, e)));
  }
  #i() {
    (this.#n?.(), (this.#n = null), (this.#o = 0), this.#r.clear(), (this.#g = 0), (this.#u = 0));
  }
  #s() {
    this.#i();
    for (let e of this.#f.splice(0)) e();
    (this.#w(), this.#e.clear(), (this.#m = !1), (this.#p = ""), (this.#d = !1), (this.#l = !1));
  }
  #c() {
    if (this.#e.size > 0) this.#y(Ci);
  }
  #w() {
    for (let [e, n] of this.#e)
      if (n.raisedFrom !== null) {
        let raisedFrom = n.raisedFrom;
        ((n.raisedFrom = null), this.#t.messageQueue.demoteFromNow(e, raisedFrom));
      }
  }
  #b() {
    let e = new Set(this.#t.messageQueue.getCommandQueueSnapshot().map((n) => n.uuid));
    for (let [n, r] of this.#e) {
      if (e.has(n)) continue;
      if ((this.#e.delete(n), this.#t.messageQueue.isFoldInFlight(n))) this.#l = !0;
      if (r.outcome !== "undecided" && r.outcome !== "delivered_early")
        logFeatureSad(this.#t.featureName, r.outcome);
    }
  }
  #S = () => {
    this.#a(() => {
      let [e] = this.#e.keys();
      if ((this.#b(), this.#e.size === 0)) {
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
      let { guard: guard } = this.#t.turn;
      if (!guard.isActive) {
        ((this.#d = !0), this.#i());
        return;
      }
      if (this.#d) this.#s();
    });
  };
  #v = () => {
    ((this.#n = null),
      this.#a(() => {
        this.#A();
      }));
  };
  #a(e) {
    try {
      e();
    } catch (error) {
      if ((logError(error), !this.#m)) ((this.#m = !0), logFeatureBad(this.#t.featureName, "check_threw"));
    }
  }
  #A() {
    let {
      messageQueue: messageQueue,
      turn: turn,
      transcript: transcript,
      session: session,
      taskRegistry: taskRegistry,
    } = this.#t;
    if ((this.#b(), this.#e.size === 0)) {
      this.#s();
      return;
    }
    let y = pickQueuedMessageToMove(messageQueue.getCommandQueue(), this.#e, messageQueue, Yn(turn.agentId)),
      _ = y === null ? void 0 : this.#e.get(y.uuid),
      snapshot = transcript.getSnapshot(),
      k = dropTextInBriefTurns(snapshot),
      values = Object.values(taskRegistry.all()),
      S = runningForegroundShellsFor(values, k, turn.agentId),
      T = turn.guard.isActive && [...this.#e.values()].some((V) => V.raisedFrom !== null);
    if (T && !uf()) {
      if (
        (backgroundShellsToDeliverMessage(S, taskRegistry),
        (this.#u = k.size > 0 ? this.#u + 1 : 0),
        turn.endsUnmovableShells && this.#u > Qn)
      )
        for (let V of isTurnRunning(values, k, S, turn.agentId)) killTask(V.id, taskRegistry);
    }
    if (y === null || _ === void 0) {
      if (T) this.#c();
      else this.#i();
      return;
    }
    let { head: head, uuid: uuid, priority: priority } = y,
      G = Zn(values, k, turn.agentId),
      filtered = (Q_e.peek(session)?.list() ?? []).filter((V) => je(k, V.toolUseId)),
      P = uf(),
      U = P ? [] : S,
      L = P ? [] : G.filter((V) => eo(k, V)),
      evidence = turn.readEvidence(),
      at = snapshot.at(-1);
    for (let V of this.#r) if (!k.has(V)) this.#r.delete(V);
    let Q = {
        head: head,
        hasFoldTakenPrompt: this.#l,
        isLocalTurnActive: turn.guard.isActive,
        isLocalTurnRunning: oo(turn),
        isHeldByDialog: evidence.isHeldByDialog,
        holderCount: S.length + G.length + filtered.length,
        unmovableHolderCount: (P ? S.length : 0) + (G.length - L.length),
        isExecuting: evidence.isToolCallStarting || k.size > 0,
        isAwaitingMovedResult: this.#r.size > 0,
        isBackgroundingDisabled: P,
        isCompacting: evidence.isCompacting,
        isUnmovableGraceOver: this.#o >= Qn,
        isMainRequestInFlight:
          evidence.isMainRequestAnnounced &&
          !(at?.type === "assistant" && (at.message.stop_reason !== null || at.isApiErrorMessage === !0)) &&
          isActivityReasonActive("api_call") &&
          getMainLoopRefcount() > 0,
      },
      ne = decideQueuedPromptAction(Q),
      z = `${ne.action}${ne.action === "wait" ? ` ${ne.reason}` : ""} head=${head} holders=${Q.holderCount} executing=${Q.isExecuting}`;
    if (z !== this.#p)
      ((this.#p = z), logForDebugging(`[low-latency-submit] ${z} agent=${turn.agentId ?? "main"}`));
    switch (ne.action) {
      case "stand_by":
        this.#i();
        return;
      case "wait":
        if (
          ((this.#o = ne.reason === "unmovable_grace" ? this.#o + 1 : 0),
          ne.reason === "moved_result" && ++this.#g >= vi)
        )
          this.#r.clear();
        if (ne.reason !== "not_ready" && _.outcome === "undecided") _.outcome = ne.reason;
        this.#c();
        return;
      case "background": {
        let outcome = _.outcome;
        _.outcome = "delivered_early";
        let j = no(U, L, taskRegistry),
          pe = j.length,
          me = backgroundForegroundCalls(filtered);
        if (((pe += me), me > 0)) j.push(...filtered.map((ce) => ce.toolUseId));
        if (this.#e.size > 0) {
          this.#g = 0;
          for (let ce of j) if (ce !== void 0) this.#r.add(ce);
        }
        if (pe === 0) {
          if (((_.outcome = outcome === "undecided" ? "nothing_moved" : outcome), Q.isUnmovableGraceOver)) {
            if (P) this.#_(_);
            else this.#k(_, uuid, priority);
            return;
          }
          if (this.#e.size > 0) this.#o++;
        } else if (((this.#o = 0), outcome !== "delivered_early")) logFeatureOk(this.#t.featureName);
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
    let { interruptForSubmit: interruptForSubmit } = this.#t.turn;
    if (interruptForSubmit === void 0) {
      if (e.outcome === "undecided") e.outcome = "nothing_moved";
    } else {
      if (e.outcome !== "delivered_early") e.outcome = "fell_back_to_cancel";
      interruptForSubmit();
    }
    this.#i();
  }
  #k(e, n, r) {
    if (((this.#o = 0), (this.#u = 0), (e.raisedFrom = r), !this.#t.messageQueue.promoteToNow(n)))
      e.raisedFrom = null;
    else if (e.outcome !== "delivered_early")
      ((e.outcome = "delivered_early"), logFeatureOk(this.#t.featureName));
    this.#c();
  }
}
//@ chunk-0sfjpx19.js:39757-39787 placement
function Yn(e) {
  return e ?? mainAgentId();
}
//@ chunk-0sfjpx19.js:39787-39949 placement
function runningForegroundShellsFor(e, n, r) {
  return e
    .filter((s) => isForegroundShellOf(s, r))
    .filter(
      (s) =>
        s.status === "running" &&
        ((s.caller === "inner" && s.toolUseId?.includes($qe) === !0) || isForegroundShellFromCaller(s, r)) &&
        je(n, io(s)),
    );
}
//@ chunk-0sfjpx19.js:39949-40030 placement
function Zn(e, n, r) {
  return e.filter((s) => isForegroundAgentTask(s, r)).filter((s) => je(n, s.toolUseId));
}
//@ chunk-0sfjpx19.js:40030-40114 placement
function eo(e, { toolUseId: toolUseId }) {
  let r = toolUseId === void 0 ? void 0 : e.get(toolUseId);
  return r === AGENT || r === TASK;
}
//@ chunk-0sfjpx19.js:40114-40213 placement
function no(e, n, r) {
  return [
    ...backgroundShellsToDeliverMessage(e, r).map(io),
    ...n.filter((s) => moveAgentToBackground(s.id, r)).map((s) => s.toolUseId),
  ];
}
//@ chunk-0sfjpx19.js:40213-40293 placement
function oo(e) {
  return e.guard.isRunning && e.abortController?.signal.aborted === !1;
}
//@ chunk-0sfjpx19.js:40293-40360 placement
function io(e) {
  return e.toolUseId === void 0 ? void 0 : Wbn(e.toolUseId);
}
//@ chunk-0sfjpx19.js:40360-40921 placement
function isTurnRunning(e, n, r, s) {
  let any = [...n.values()].some(S4),
    filtered = e.filter(isLocalAgent).filter((b) => b.status === "running" && !b.isBackgrounded),
    _ = new Set(
      filtered.filter((b) => b.parentAgentId === s && (any || je(n, b.toolUseId))).map((b) => b.agentId),
    );
  for (let b = -1; b !== _.size;) {
    b = _.size;
    for (let k of filtered) if (k.parentAgentId !== void 0 && _.has(k.parentAgentId)) _.add(k.agentId);
  }
  return e.filter(isLocalShellTask).filter((b) => {
    let k = isForegroundShellFromCaller(b, s) || r.includes(b),
      w = isForegroundTask(b);
    if (b.status !== "running" || !w || k) return !1;
    if (b.agentId !== s) return b.agentId !== void 0 && _.has(b.agentId);
    let { toolUseId: toolUseId } = b;
    return any || (toolUseId !== void 0 && je(n, firstLineOf(toolUseId, ":")));
  });
}
//@ chunk-0sfjpx19.js:40921-40966 placement
function je(e, n) {
  return n !== void 0 && e.has(n);
}
//@ chunk-0sfjpx19.js:40966-41040 placement
function _pt(e) {
  return (
    e instanceof AgentResumeInProgressError ||
    e instanceof AgentResumeTransientError ||
    e instanceof AgentStillStoppingError
  );
}
//@ chunk-0sfjpx19.js:41040-41910 placement
async function deliverQueuedNow(e, n, r) {
  let s = xZ(),
    h = drainPendingMessages(e, n),
    y = ({ origin: origin, userInitiatedAt: userInitiatedAt }) =>
      userInitiatedAt !== void 0 ||
      origin === void 0 ||
      origin.kind === "human" ||
      origin.kind === "observer" ||
      ((origin.kind === "coordinator" || origin.kind === "peer") && origin.plugin === void 0),
    _ = s ? h.find(y) : h[0];
  if (_ === void 0) {
    if ((queuePendingMessage(e, h, n), h.length > 0))
      holdQueuedInput(() => getTaskRunState().agentStrandedMessages.emit(e), void 0, "stays");
    return;
  }
  let filtered = h.filter((S) => S !== _),
    k = hasUserInitiatedPending(n.get(e), h);
  queuePendingMessage(e, filtered, n);
  let w;
  try {
    w = await r(_, k);
  } catch (error) {
    let T = [_, ...drainPendingMessages(e, n)];
    if (_pt(error)) throw (queuePendingMessage(e, T, n), error);
    let D = hasUserInitiatedPending(n.get(e), T);
    if (
      error instanceof AgentStoppedByUserError &&
      D &&
      canReceiveNotification(n.get(e), { userInitiated: !0 })
    )
      throw (
        queuePendingMessage(e, T, n),
        new AgentResumeTransientError(
          `a message the user typed for agent ${e} arrived while a resume their stop refused was in flight; retrying with it`,
        )
      );
    let E = error instanceof ResumeAgentStateError || !canReceiveNotification(n.get(e), { userInitiated: D });
    if (!E) queuePendingMessage(e, T, n);
    throw (
      getTaskRunState().agentResumeFailed.emit(e, { error: error, undeliverable: E ? T : [], terminal: E }),
      error
    );
  }
  if (isResumeDenied(w)) dropDeniedResumeMessages(e, n, [_, ...filtered], w);
}
//@ chunk-0sfjpx19.js:41910-41937 placement
var bpt = 5,
  xi = 2000,
  Ei = 60000;
/**
 * 指数退避加抖动：延迟取 min(上限, 基数×2^(n−1))，结果在其一半到全值之间随机。
 */
//@ chunk-0sfjpx19.js:41937-42039 placement
function jitteredBackoffMs(e, n = Math.random) {
  let min = Math.min(Ei, xi * 2 ** Math.max(0, e - 1));
  return Math.round(min / 2 + (n() * min) / 2);
}
//@ chunk-0sfjpx19.js:42039-42116 placement
var Ii = { setTimeout: (e, n) => setTimeout(e, n), clearTimeout: (e) => clearTimeout(e) };
/**
 * 恢复卡住时按退避重试，多次失败后回调 onFailed。
 */
//@ chunk-0sfjpx19.js:42116-43567 placement
function createStrandedResumeRetrier({
  taskRegistry: taskRegistry,
  resume: resume,
  onFailed: onFailed,
  timers: timers = Ii,
  random: random = Math.random,
}) {
  let y = new Map(),
    _ = !1,
    b = (S) => {
      let T = y.get(S)?.timer;
      if (T !== void 0) timers.clearTimeout(T);
      y.delete(S);
    },
    k = async (S) => {
      try {
        (await deliverQueuedNow(S, taskRegistry, (T, D) => resume(S, T, D)), b(S));
      } catch (error) {
        let D = y.get(S);
        if ((b(S), !_pt(error))) throw error;
        let E = {
          attempt: (D?.attempt ?? 0) + 1,
          transient: (D?.transient ?? 0) + (error instanceof AgentResumeTransientError ? 1 : 0),
        };
        if (E.transient > bpt)
          throw (
            getTaskRunState().agentResumeFailed.emit(S, {
              error: error,
              undeliverable: drainPendingMessages(S, taskRegistry),
              terminal: !0,
            }),
            new ResumeAgentStateError(`still failing after ${bpt} retries: ${errorMessage(error)}`)
          );
        let N = jitteredBackoffMs(E.attempt, random);
        throw (
          logForDebugging(
            `stranded resume of ${S} retries in ${N}ms (attempt ${E.attempt}, ${E.transient}/${bpt} transient): ${errorMessage(error)}`,
          ),
          (E.timer = timers.setTimeout(() => {
            E.timer = void 0;
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
              (getTaskRunState().agentResumeFailed.emit(S, { error: L, undeliverable: [], terminal: !0 }),
                onFailed(S, L));
              return;
            }
            let R = hasUserInitiatedPending(G),
              { stoppedByUser: stoppedByUser, status: status } = G;
            if (!canReceiveNotification(G, { userInitiated: R })) {
              b(S);
              let L =
                stoppedByUser === !0
                  ? new AgentStoppedByUserError(`Agent ${S} was stopped by the user and won't be resumed.`)
                  : new ResumeAgentStateError(`Agent ${S} is ${status} and cannot take queued messages.`);
              (getTaskRunState().agentResumeFailed.emit(S, {
                error: L,
                undeliverable: drainPendingMessages(S, taskRegistry),
                terminal: !0,
              }),
                onFailed(S, L));
              return;
            }
            w(S);
          }, N)),
          y.set(S, E),
          error
        );
      }
    },
    w = async (S) => {
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
      _ = !0;
      for (let S of [...y.keys()]) b(S);
    },
  };
}
//@ chunk-0sfjpx19.js:43567-43597 placement
function MLt(e) {
  return sfi(e);
}
//@ chunk-0sfjpx19.js:43597-44358 placement
function buildTaskNotificationText(e, n) {
  if (!n || e.length === 0) return [];
  let r = new Map(),
    s = new Map();
  for (let h of e) {
    if (!h.agentId || !(h.mode === "task-notification" || MLt(h))) continue;
    let y = r.get(h.agentId);
    if (!y) {
      let b = n[h.agentId];
      if (!isBackgroundedSubagent(b) || !hasCompletedWithFindings(b) || b.finalizing || b.resuming) continue;
      ((y = b), r.set(h.agentId, y));
    }
    let _ = s.get(h.agentId) ?? [];
    if (h.mode === "task-notification") _.push(h);
    s.set(h.agentId, _);
  }
  return Array.from(s, ([h, y]) => {
    let filtered = y.filter((w) => typeof w.value === "string" && w.value),
      mapped = filtered.map((w) => String(w.value)),
      k = uniq(filtered.flatMap((w) => w.toolsUsed ?? []));
    return {
      agentId: h,
      prompt: mapped.join(`

`),
      consumedCommands: y,
      resultsOnly: y.length === 0,
      origin: Li(y),
      ...(k.length > 0 && { toolsUsed: k }),
      noticeLengths: mapped.map((w) => w.length),
      noticeOwn: filtered.map((w) => k2t(w.origin, void 0)),
      noticeRunIds: filtered.map((w) => w.runId ?? null),
    };
  });
}
//@ chunk-0sfjpx19.js:44358-44446 placement
var Pi = { kind: "task-notification" },
  Di = { kind: "task-notification", producer: "session-task" };
//@ chunk-0sfjpx19.js:44446-44521 placement
function Li(e) {
  return e.length > 0 && e.every((n) => k2t(n.origin, void 0)) ? Di : Pi;
}
/**
 * 记录已送达的子代理结果消息，并判断某次"仅结果"投递涉及的结果是否都已送达过。
 */
//@ chunk-0sfjpx19.js:44521-44694 placement
function createDeliveredResultsTracker() {
  let weakSet = new WeakSet();
  return {
    note(n, r) {
      for (let s of so(n, r)) weakSet.add(s);
    },
    holds(n, r) {
      let s = so(n, r.agentId);
      return r.resultsOnly && s.length > 0 && s.every((h) => weakSet.has(h));
    },
  };
}
//@ chunk-0sfjpx19.js:44694-44755 placement
function so(e, n) {
  return e.filter((r) => r.agentId === n && MLt(r));
}
//@ chunk-0sfjpx19.js:44755-44767 placement
var lo = null;
//@ chunk-0sfjpx19.js:44767-44968 placement
function isSdkHostOrigin(e, n) {
  if (e === REFUSAL_FALLBACK_DIALOG.kind || e === FABLE_OVERAGE_CONSENT_DIALOG.kind) return !0;
  if (e === AUTO_MODE_SERVER_FALLBACK) return n === "sdk_host";
  if (e === ENUM_PROMPT) return n === "sdk_host";
  return (
    n === "sdk_host" &&
    lo !== null &&
    lo.slackConnectDialogs.some((slackConnectDialog) => slackConnectDialog.kind === e)
  );
}
//@ chunk-0sfjpx19.js:44968-45109 placement
function logBridgeInitializeCommands(e) {
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_initialize_commands", !1)) return [];
  if (getDisableSlashCommands()) return [];
  let n = toBridgeSlashCommands(e);
  return (logFeatureOk("bridge_initialize_commands"), n);
}
//@ chunk-0sfjpx19.js:45109-45348 placement
function commandNamesForBridge(e, n, r) {
  let s = dropSyncedNameClashes(e, [...n, ...r]);
  if (n.length === 0) return s;
  let h = new Set(s.map((b) => b.name)),
    y = new Set(s.map(getCommandName)),
    mapped = Ji(n, "name")
      .filter((b) => !h.has(b.name))
      .map((b) => (b.isMcp && y.has(getCommandName(b)) ? { ...b, isHidden: !0 } : b));
  return [...s, ...mapped];
}
//@ chunk-0sfjpx19.js:45348-45722 placement
function buildBridgeInitializeCommands(e, n) {
  let r = ao(),
    s = r.replHandle ?? r.sdkHostedHandle;
  if (!s || s.outboundOnly) return;
  if (r.contextUsageMirror === void 0) {
    let h = new ContextUsageEstimateReporter((y) => {
      let _ = r.replHandle ?? r.sdkHostedHandle;
      if (r.contextUsageMirror === h && _ && !_.outboundOnly) _.reportMetadata({ context_usage: y });
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
  _pt,
  bpt,
  jitteredBackoffMs,
  MLt,
  createStrandedResumeRetrier,
  buildBridgeInitializeCommands,
  logBridgeInitializeCommands,
  isSdkHostOrigin,
};
