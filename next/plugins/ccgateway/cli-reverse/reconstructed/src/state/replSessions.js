/**
 * state/replSessions.ts
 *
 * REPL 脚本会话表与单上下文运行状态：排队派发 eval、结算与中止（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-k3zg85zg.js (15)
 * attribution: placement 15
 */
import { isEvalSettleCommand } from "../utils/pollEvents/evalSettleKind.js";
import { isMainAgentCommand } from "../utils/messageQueueManager.js";
import { REPL_STATUS_EVENT_KIND, discardPollEvent } from "../utils/pollEvents.js";
import { createSignal } from "../utils/signal.js";
import { codeModeAccepted } from "../utils/codeMode/accepted.js";
import { logError } from "../utils/log.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../utils/errors.js";
import { turnAbortDetachesEval } from "../utils/codeMode/asyncReplReceipt.js";
import { isTerminalShutdown, heldUntilExit } from "../utils/terminalShutdown.js";
import { createAbortController, userAbortReason } from "../utils/abortController.js";
import { isHostError } from "../utils/errors/hostError.js";
import { tickDataToStore } from "../utils/codeMode/toolCallTicks.js";

//@ chunk-k3zg85zg.js:634-647 placement
var MAIN = "main";
//@ chunk-k3zg85zg.js:647-682 placement
function isMainAgentSettleEvent(command) {
  return isEvalSettleCommand(command) && isMainAgentCommand(command);
}
//@ chunk-k3zg85zg.js:682-757 placement
function isMainAgentStatusEvent(command) {
  return (
    command.mode === "poll-event" &&
    command.pollEvent?.kind === REPL_STATUS_EVENT_KIND &&
    isMainAgentCommand(command)
  );
}
//@ chunk-k3zg85zg.js:757-870 placement
function dropStatusLineOnStop(queue) {
  queue.setPassive?.(isMainAgentSettleEvent, true);
  discardPollEvent(
    queue.removeByFilter(isMainAgentStatusEvent),
    "a stop ended the scripts this status line describes",
  );
}
//@ chunk-k3zg85zg.js:870-880 placement
var ASYNC_REPL_MAX_EVALS = 8;
//@ chunk-k3zg85zg.js:880-1282 placement
/**
 * 单个上下文里脚本运行状态的容器：运行集合、投递链、待结算、扣留报告轮次与工具调用 id 映射。
 */
class SessionContext {
  context = undefined;
  running = new Set();
  attached = undefined;
  deliveryChain = Promise.resolve();
  depth = 0;
  pending = new Map();
  ranEvals = false;
  epoch = 0;
  conversation = 0;
  holdReportsEpoch = 0;
  declined = undefined;
  rewoundToolUses = new Set();
  kept = undefined;
  evalIdByToolUseId = new Map();
  ticks = createSignal();
  unwaited = new Set();
  undelivered = new Set();
  statusLineGiven = false;
  settling = new Map();
  onRunningChange = () => {};
  runningCache = {
    at: -1,
    value: new Map(),
  };
  runningChanges = 0;
}
//@ chunk-k3zg85zg.js:1282-1354 placement
var MAX_SNIPPET_CHARS = 100;
var MAX_FINISHED_TICKS = 50;
var MAX_TOOL_USE_IDS = 256;
var NO_EVALS = {
  list: () => [],
  abort: () => (codeModeAccepted() ? "no such eval" : ""),
};
//@ chunk-k3zg85zg.js:1354-12129 placement
/**
 * REPL 脚本会话表：按上下文登记会话、派发 eval 并按序号/深度/轮次排队，处理未结算上限、中止与结算。
 */
class ReplSessions {
  #e = new Map();
  #d = 1;
  #t = 0;
  #i = 0;
  #r = createSignal();
  #a = createSignal();
  #l = new WeakMap();
  takeScriptNumber() {
    return this.#d++;
  }
  dispatch(sessionId, run, options, snippetSource = "") {
    if (!codeModeAccepted()) throw Error("unreachable");
    let context = this.#n(sessionId);
    if (context.depth >= ASYNC_REPL_MAX_EVALS)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `async REPL dispatch rejected: ${context.depth} evals already waiting or running on this context \u2014 wait for their settles (Poll) before dispatching more`,
        "async REPL dispatch rejected: unsettled evals cap",
      );
    let evalId = this.#d++;
    let { epoch, conversation } = context;
    let retired = () =>
      (context.conversation !== conversation && context.kept?.(evalId) !== true) ||
      (options.toolUseId !== undefined && context.rewoundToolUses.has(options.toolUseId));
    let reportsHeld = () => context.holdReportsEpoch > epoch;
    if (options.toolUseId !== undefined) {
      context.evalIdByToolUseId.set(options.toolUseId, evalId);
      if (context.evalIdByToolUseId.size > MAX_TOOL_USE_IDS) {
        for (let [toolUseId, mappedEvalId] of context.evalIdByToolUseId)
          if (!context.pending.has(mappedEvalId) && !context.settling.has(mappedEvalId)) {
            context.evalIdByToolUseId.delete(toolUseId);
            break;
          }
      }
    }
    context.ranEvals = true;
    context.depth++;
    let releaseCount = 2;
    let resolveEnded = () => {};
    let ended = new Promise((resolve) => {
      resolveEnded = resolve;
    });
    let release = () => {
      releaseCount--;
      if (releaseCount === 0) resolveEnded();
    };
    let finish = () => {
      context.unwaited.delete(evalId);
      context.undelivered.delete(evalId);
      context.settling.delete(evalId);
      notifyRunningChange(context);
      release();
    };
    let entry = {
      startedAt: undefined,
      detached: false,
      description: options.description,
      replyId: options.replyId,
      snippet: snippetSource.replace(/\s+/g, " ").trim().slice(0, MAX_SNIPPET_CHARS),
      controller: undefined,
      abortRequested: undefined,
      epoch: context.epoch,
      late: undefined,
      ticks: new Map(),
      finished: new Set(),
      callReturned: false,
      readNotYetStarted: undefined,
      left: () => {
        options.signal.removeEventListener("abort", onTurnAbort);
        release();
      },
      retired,
      stopped: new AbortController(),
    };
    function onTurnAbort() {
      if (!turnAbortDetachesEval(options.signal.reason)) entry.stopped.abort();
    }
    if (options.signal.aborted) onTurnAbort();
    else
      options.signal.addEventListener("abort", onTurnAbort, {
        once: true,
      });
    if (context.declined !== undefined)
      if (options.replyId !== undefined && context.declined.replyIds.has(options.replyId)) {
        entry.stopped.abort(context.declined.reason);
        entry.abortRequested = "declined";
      } else context.declined = undefined;
    context.pending.set(evalId, entry);
    context.unwaited.add(evalId);
    context.undelivered.add(evalId);
    context.statusLineGiven = false;
    notifyRunningChange(context);
    this.#s(this.#t + 1);
    let previousAttached = context.attached ?? Promise.resolve();
    let resolveAttached = () => {};
    let attached = new Promise((resolve) => {
      resolveAttached = resolve;
    });
    context.attached = attached;
    attached.then(() => {
      if (context.attached === attached) context.attached = undefined;
    });
    let settled = false;
    let runEval = async () => {
      let message;
      let cancelled = false;
      let abortBy;
      let turnAborted = () => options.signal.aborted && !turnAbortDetachesEval(options.signal.reason);
      if (turnAborted()) {
        cancelled = true;
        abortBy = "person";
        message =
          "cancelled before start \u2014 the dispatching turn was aborted while this eval waited for its turn; the script never ran";
      } else if (context.epoch !== epoch) {
        cancelled = true;
        abortBy = "person";
        message =
          "cancelled before start \u2014 the session was interrupted while this eval waited for its turn; the script never ran";
      } else if (entry.abortRequested !== undefined) {
        cancelled = true;
        abortBy = entry.abortRequested === "person" ? "person" : "other";
        message =
          entry.abortRequested === "person"
            ? "cancelled before start \u2014 the user stopped this eval while it waited for its turn; the script never ran"
            : entry.abortRequested === "declined"
              ? "cancelled before start \u2014 the user declined the permission dialog for an earlier script's call (a No or an Esc), which also cancels the scripts behind that one; the script never ran"
              : entry.abortRequested === "taskStop"
                ? "cancelled before start \u2014 a TaskStop call stopped this eval while it waited for its turn; the script never ran"
                : entry.abortRequested === "session"
                  ? "cancelled before start \u2014 Claude Code stopped this eval while it waited for its turn; the script never ran"
                  : "cancelled before start \u2014 a script aborted this eval (self.running().abort()) while it waited for its turn; it never ran";
      } else {
        if (isTerminalShutdown()) await heldUntilExit();
        let abortController = createAbortController();
        let detachTimer;
        let detached = false;
        let detach = () => {
          if (detached) return;
          clearTimeout(detachTimer);
          entry.detached = true;
          resolveAttached();
        };
        let onAbort = () => {
          if (turnAborted()) abortController.abort(options.signal.reason);
          else if (options.staysAttachedOnTurnAbort !== true) detach();
        };
        if (options.signal.aborted) onAbort();
        else
          options.signal.addEventListener("abort", onAbort, {
            once: true,
          });
        context.running.add(abortController);
        entry.startedAt = Date.now();
        notifyRunningChange(context);
        entry.controller = abortController;
        if (!entry.detached) detachTimer = setTimeout(detach, options.detachAfterMs);
        try {
          message = await run(abortController, {
            reportNotYetStarted: (readNotYetStarted) => {
              entry.readNotYetStarted = readNotYetStarted;
            },
          });
        } catch (error) {
          cancelled = true;
          message = isHostError(error)
            ? error.message
            : "host-side failure before settling (non-Error rejection; detail withheld from coercion)";
        } finally {
          detached = true;
          clearTimeout(detachTimer);
          context.running.delete(abortController);
        }
      }
      settled = true;
      this.#p(
        sessionId,
        evalId,
        message,
        cancelled,
        options,
        resolveAttached,
        retired,
        finish,
        reportsHeld,
        abortBy,
      );
    };
    let running = previousAttached.then(async () => {
      try {
        await runEval();
      } finally {
        if (!settled) {
          this.#s(this.#t - 1);
          resolveAttached();
          finish();
        }
      }
    });
    running.catch(logError);
    let finished = running
      .then(
        () => {},
        () => {},
      )
      .then(() => {
        context.depth--;
        if (entry.late === undefined) settleIntoDelivery(context, evalId, entry);
        notifyRunningChange(context);
      });
    return {
      evalId,
      finished,
      retired,
      ended,
      stopped: entry.stopped.signal,
    };
  }
  pending(sessionId, nowMs = Date.now()) {
    if (!codeModeAccepted()) return [];
    return this.ledger(sessionId, nowMs).filter((row) => row.state !== "late");
  }
  ledger(sessionId, nowMs = Date.now()) {
    if (!codeModeAccepted()) return [];
    let context = this.#e.get(sessionId);
    if (context === undefined) return [];
    return [...context.pending].map(([evalId, entry]) => ({
      id: evalId,
      state:
        entry.late !== undefined
          ? "late"
          : entry.startedAt === undefined
            ? "waiting"
            : entry.detached
              ? "detached"
              : "running",
      runningMs: entry.startedAt === undefined ? 0 : nowMs - entry.startedAt,
      snippet: entry.snippet,
      notYetStarted: entry.readNotYetStarted?.() ?? [],
    }));
  }
  holdLate(sessionId, evalId, late) {
    if (!codeModeAccepted()) {
      late.abort();
      return;
    }
    let context = this.#e.get(sessionId);
    let entry = context?.pending.get(evalId);
    if (context === undefined || entry === undefined || entry.late !== undefined) {
      late.abort();
      return;
    }
    entry.late = {
      abort: late.abort,
      discard: late.discard,
    };
    entry.ticks.clear();
    entry.finished.clear();
    notifyRunningChange(context);
    this.#c(this.#i + 1);
    let settleLate = () => this.#o(context, evalId, entry);
    late.idle.then(settleLate, settleLate);
  }
  #o(context, evalId, entry) {
    if (context.pending.get(evalId) !== entry) return;
    settleIntoDelivery(context, evalId, entry);
    notifyRunningChange(context);
    this.#c(this.#i - 1);
  }
  stopAskerOf(asker) {
    return this.#l.get(asker);
  }
  recordTick(sessionId, evalId, data) {
    if (!codeModeAccepted()) return;
    let context = this.#e.get(sessionId);
    let entry = context?.pending.get(evalId);
    if (context === undefined || entry === undefined) return;
    let tick;
    try {
      tick = tickDataToStore(data);
    } catch {
      return;
    }
    entry.ticks.set(tick.toolUseId, tick);
    if (isFinishedOrFailed(tick)) {
      entry.finished.add(tick.toolUseId);
      if (entry.finished.size > MAX_FINISHED_TICKS) {
        let oldest = entry.finished.values().next().value;
        if (oldest !== undefined) {
          entry.finished.delete(oldest);
          entry.ticks.delete(oldest);
        }
      }
    } else entry.finished.delete(tick.toolUseId);
    if (entry.callReturned && entry.startedAt !== undefined)
      emitTick(context, {
        evalId,
        startedAt: entry.startedAt,
        tick,
      });
  }
  callReturned(sessionId, evalId) {
    if (!codeModeAccepted()) return;
    let context = this.#e.get(sessionId);
    let entry = context?.pending.get(evalId);
    if (context === undefined || entry === undefined || entry.callReturned) return;
    entry.callReturned = true;
    if (entry.startedAt === undefined) return;
    for (let tick of entry.ticks.values())
      emitTick(context, {
        evalId,
        startedAt: entry.startedAt,
        tick,
      });
  }
  ticks(sessionId) {
    if (!codeModeAccepted()) return [];
    let context = this.#e.get(sessionId);
    if (context === undefined) return [];
    let rows = [];
    for (let [evalId, entry] of context.pending) {
      if (!entry.callReturned || entry.startedAt === undefined) continue;
      for (let tick of entry.ticks.values())
        rows.push({
          evalId,
          startedAt: entry.startedAt,
          tick,
        });
    }
    return rows;
  }
  takeUnwaited(sessionId, skip) {
    if (!codeModeAccepted()) return [];
    let context = this.#e.get(sessionId);
    if (context === undefined) return [];
    let evalIds = [...context.unwaited].filter((evalId) => skip?.has(evalId) ?? true);
    for (let evalId of evalIds) context.unwaited.delete(evalId);
    return evalIds;
  }
  noteStatusLine(sessionId) {
    if (!codeModeAccepted()) return;
    this.#n(sessionId).statusLineGiven = true;
  }
  takeStatusLineGiven(sessionId) {
    if (!codeModeAccepted()) return false;
    let context = this.#e.get(sessionId);
    if (context === undefined) return false;
    let given = context.statusLineGiven;
    context.statusLineGiven = false;
    return given;
  }
  undelivered(sessionId) {
    if (!codeModeAccepted()) return UNDELIVERED_EMPTY;
    return this.#e.get(sessionId)?.undelivered ?? UNDELIVERED_EMPTY;
  }
  runningScripts(sessionId) {
    if (!codeModeAccepted()) return RUNNING_SCRIPTS_EMPTY;
    let context = this.#e.get(sessionId);
    if (context === undefined) return RUNNING_SCRIPTS_EMPTY;
    if (context.runningCache.at === context.runningChanges) return context.runningCache.value;
    let runningById = new Map();
    for (let [toolUseId, evalId] of context.evalIdByToolUseId) {
      let entry = context.pending.get(evalId);
      let record = entry ?? context.settling.get(evalId);
      if (record === undefined || (entry !== undefined && (entry.epoch !== context.epoch || entry.retired())))
        continue;
      runningById.set(toolUseId, {
        evalId,
        description: record.description,
        startedAt: record.startedAt,
        late: entry?.late !== undefined && !context.undelivered.has(evalId),
      });
    }
    context.runningCache = {
      at: context.runningChanges,
      value: runningById,
    };
    return runningById;
  }
  onRunningScriptsChange(listener) {
    if (!codeModeAccepted()) return () => {};
    return this.#a.subscribe(listener);
  }
  onTick(sessionId, listener) {
    if (!codeModeAccepted()) return () => {};
    return this.#n(sessionId).ticks.subscribe(listener);
  }
  abort(sessionId, evalId, by = "script") {
    if (!codeModeAccepted()) return "";
    let context = this.#e.get(sessionId);
    let entry = context?.pending.get(evalId);
    if (context === undefined || entry === undefined) return "no such eval (it may have settled already)";
    entry.stopped.abort();
    if (entry.late !== undefined) {
      entry.late.abort();
      this.#o(context, evalId, entry);
    } else if (entry.controller !== undefined) {
      if (by !== "person" && !entry.controller.signal.aborted) this.#l.set(entry.controller.signal, by);
      entry.controller.abort(userAbortReason("user-cancel"));
    } else entry.abortRequested = by;
    return "";
  }
  cancelWaiting(sessionId, reason, replyId) {
    if (!codeModeAccepted()) return;
    let context = this.#e.get(sessionId);
    if (context === undefined) return;
    let replyIds = context.declined?.replyIds ?? new Set();
    replyIds.add(replyId);
    context.declined = {
      reason,
      replyIds,
    };
    for (let entry of context.pending.values())
      if (entry.controller === undefined && entry.abortRequested === undefined) {
        entry.stopped.abort(reason);
        entry.abortRequested = "declined";
        if (entry.replyId !== undefined) replyIds.add(entry.replyId);
      }
  }
  access(sessionId, selfEval) {
    if (!codeModeAccepted()) return NO_EVALS;
    return {
      list: () => {
        let selfEvalId = selfEval();
        return this.ledger(sessionId).map((row) => ({
          ...row,
          self: row.id === selfEvalId,
        }));
      },
      abort: (evalId) => this.abort(sessionId, evalId),
    };
  }
  outstanding(sessionId) {
    if (sessionId === undefined) return this.#t + this.#i;
    let context = this.#e.get(sessionId);
    if (context === undefined) return 0;
    let lateCount = 0;
    for (let entry of context.pending.values()) if (entry.late !== undefined) lateCount++;
    return context.undelivered.size + lateCount;
  }
  unsettled(sessionId) {
    if (sessionId === undefined) return this.#t;
    return this.#e.get(sessionId)?.undelivered.size ?? 0;
  }
  #u;
  mainThreadStoppableWork() {
    this.#u ??= {
      outstanding: () => this.outstanding(MAIN),
      stoppable: () => this.stoppable([MAIN]),
      onOutstandingChange: (onOutstandingChange) => this.onOutstandingChange(onOutstandingChange),
      interrupt: () => {
        this.interrupt([MAIN]);
      },
    };
    return this.#u;
  }
  stoppable(only) {
    if (!codeModeAccepted()) return 0;
    let wanted = only === undefined ? undefined : new Set(only);
    let count = 0;
    for (let [sessionId, context] of this.#e) {
      if (wanted !== undefined && !wanted.has(sessionId)) continue;
      for (let entry of context.pending.values())
        if (
          entry.epoch === context.epoch &&
          !entry.abortRequested &&
          entry.controller?.signal.aborted !== true
        )
          count++;
    }
    return count;
  }
  onOutstandingChange(listener) {
    return this.#r.subscribe(listener);
  }
  #s(value) {
    this.#t = value;
    this.#r.emit();
  }
  #c(value) {
    this.#i = value;
    this.#r.emit();
  }
  depth(sessionId) {
    return this.#e.get(sessionId)?.depth ?? 0;
  }
  attached(sessionId) {
    return this.#e.get(sessionId)?.attached;
  }
  #p(sessionId, evalId, text, cancelled, options, resolveAttached, retired, finish, reportsHeld, abortBy) {
    if (!codeModeAccepted()) return;
    let context = this.#n(sessionId);
    context.deliveryChain = context.deliveryChain
      .then(() => options.deliver(evalId, text, cancelled, retired(), reportsHeld, abortBy))
      .catch(logError)
      .finally(() => {
        resolveAttached();
        this.#s(this.#t - 1);
        finish();
      });
  }
  clear(sessionIds, keepsNamed) {
    let ids = sessionIds === undefined ? undefined : Array.from(sessionIds);
    for (let context of this.#f(ids)) {
      context.conversation++;
      context.kept = keepsNamed;
      if (codeModeAccepted()) for (let entry of context.pending.values()) entry.late?.discard();
    }
    this.interrupt(ids, {
      keepsNamed,
    });
  }
  dropRewound(sessionId, toolUseIds) {
    let context = this.#e.get(sessionId);
    if (context === undefined) return;
    for (let toolUseId of toolUseIds) {
      context.rewoundToolUses.add(toolUseId);
      let evalId = context.evalIdByToolUseId.get(toolUseId);
      if (evalId !== undefined) context.settling.delete(evalId);
    }
    notifyRunningChange(context);
  }
  tracks(sessionId, evalId) {
    let context = this.#e.get(sessionId);
    return (
      context !== undefined &&
      (context.pending.has(evalId) || context.undelivered.has(evalId) || context.settling.has(evalId))
    );
  }
  evalIdsOf(sessionId, toolUseIds) {
    let byToolUseId = this.#e.get(sessionId)?.evalIdByToolUseId;
    let evalIds = new Set();
    if (byToolUseId === undefined) return evalIds;
    for (let toolUseId of toolUseIds) {
      let evalId = byToolUseId.get(toolUseId);
      if (evalId !== undefined) evalIds.add(evalId);
    }
    return evalIds;
  }
  interrupt(sessionIds, { holdReportsIn, keepsNamed } = {}) {
    let ids = sessionIds === undefined ? undefined : Array.from(sessionIds);
    for (let context of this.#f(ids)) {
      context.epoch++;
      context.statusLineGiven = false;
      if (holdReportsIn !== undefined) context.holdReportsEpoch = context.epoch;
      for (let controller of context.running) controller.abort(userAbortReason("user-cancel"));
      for (let evalId of context.settling.keys())
        if (keepsNamed?.(evalId) !== true) context.settling.delete(evalId);
      notifyRunningChange(context);
      if (codeModeAccepted()) {
        for (let [evalId, entry] of context.pending) {
          entry.stopped.abort();
          if (entry.late !== undefined) {
            entry.late.abort();
            this.#o(context, evalId, entry);
          }
        }
      }
      context.context?.clearAllTimers();
      context.declined = undefined;
    }
    if (codeModeAccepted() && holdReportsIn !== undefined && (ids === undefined || ids.includes(MAIN)))
      dropStatusLineOnStop(holdReportsIn);
    this.#r.emit();
  }
  #f(sessionIds) {
    return sessionIds === undefined
      ? this.#e.values()
      : Array.from(sessionIds, (sessionId) => this.#e.get(sessionId)).filter(
          (sessionId) => sessionId !== undefined,
        );
  }
  get(sessionId) {
    return this.#e.get(sessionId)?.context;
  }
  has(sessionId) {
    return this.#e.get(sessionId)?.context !== undefined;
  }
  set(sessionId, context) {
    this.#n(sessionId).context = context;
  }
  release(sessionId) {
    let context = this.#e.get(sessionId);
    if (context?.context === undefined) return false;
    context.context.clearAllTimers();
    context.context = undefined;
    if (!context.ranEvals) this.#e.delete(sessionId);
    return true;
  }
  forget(sessionId) {
    let context = this.#e.get(sessionId);
    if (context === undefined) return;
    let isIdle = () =>
      context.depth === 0 &&
      context.pending.size === 0 &&
      context.undelivered.size === 0 &&
      context.settling.size === 0;
    let stillOurs = () => this.#e.get(sessionId) === context && context.context === undefined;
    let previousHandler = context.onRunningChange;
    let restore = () => {
      if (!stillOurs() || isIdle()) context.onRunningChange = previousHandler;
      if (stillOurs() && isIdle())
        context.deliveryChain.finally(() => {
          if (stillOurs() && isIdle()) this.#e.delete(sessionId);
        });
    };
    context.onRunningChange = () => {
      previousHandler();
      restore();
    };
    restore();
  }
  #n(sessionId) {
    let context = this.#e.get(sessionId);
    if (context === undefined) {
      context = new SessionContext();
      context.onRunningChange = () => this.#a.emit();
      this.#e.set(sessionId, context);
    }
    return context;
  }
}
//@ chunk-k3zg85zg.js:12129-12180 placement
function mainThreadStoppableWork(session) {
  return session.mainThreadStoppableWork();
}
//@ chunk-k3zg85zg.js:12180-12224 placement
function getReplSessions(context) {
  return context.toolState.get(ReplSessions);
}
//@ chunk-k3zg85zg.js:12224-12285 placement
function isFinishedOrFailed(summary) {
  return summary.phase === "complete" || summary.phase === "error";
}
//@ chunk-k3zg85zg.js:12285-12309 placement
var RUNNING_SCRIPTS_EMPTY = new Map();
var UNDELIVERED_EMPTY = new Set();
//@ chunk-k3zg85zg.js:12309-12511 placement
function settleIntoDelivery(context, evalId, entry) {
  context.pending.delete(evalId);
  entry.left();
  if (
    entry.startedAt !== undefined &&
    !entry.stopped.signal.aborted &&
    !entry.retired() &&
    context.undelivered.has(evalId)
  )
    context.settling.set(evalId, {
      description: entry.description,
      startedAt: entry.startedAt,
    });
}
//@ chunk-k3zg85zg.js:12511-12564 placement
function notifyRunningChange(context) {
  context.runningChanges++;
  context.onRunningChange();
}
//@ chunk-k3zg85zg.js:12564-12615 placement
function emitTick(session, tick) {
  try {
    session.ticks.emit(tick);
  } catch (error) {
    logError(error);
  }
}
export { ReplSessions, getReplSessions, ASYNC_REPL_MAX_EVALS, NO_EVALS, mainThreadStoppableWork };
