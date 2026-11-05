/**
 * tools/REPLTool/stepBudget.ts
 *
 * 步数额度与墙钟预算：发步、停止哨兵、未处理拒绝过滤（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-n51jggtb.js (13)
 * attribution: placement 13
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { replSyncRunMs } from "../../utils/codeMode.js";
import { claimPendingWriteLine } from "../../utils/shutdown/pendingWrites.js";
import { isUntrustedObject } from "../../utils/untrustedValues.js";
import { STEP_FN_NAME } from "./instrument.js";
import { defineGlobal } from "./vmHardening.js";
import { runInVm } from "./vmContext.js";
import { createSignal } from "../../utils/signal.js";
import { isHostError } from "../../utils/errors/hostError.js";
import { getErrnoCode } from "../../utils/errors.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-n51jggtb.js:60281-60296 placement
/**
 * 插桩的额外常量。
 */
var STEP_MAX_OUTPUT_CHARS = 64;
var STEP_MAX_LINES = 5;
//@ chunk-n51jggtb.js:157574-157753 placement
/**
 * 为一次运行重置步数额度并通知订阅者。
 */
function beginTurn(steps, call) {
  flushStopCounters(steps);
  let entry = weakMap_3.get(steps);
  if (entry !== undefined) {
    entry.owner = new WeakRef(call);
    entry.turns++;
    entry.started.emit();
  }
  startStepClock(steps);
  steps.budget = call.stepBudget;
  steps.rest = call.stepBudget;
  steps.budgetStopped = false;
  steps.left = 0;
}
//@ chunk-n51jggtb.js:157753-157772 placement
/**
 * 步数状态 WeakMap。
 */
var weakMap_3; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-n51jggtb.js:157753", () => {
  weakMap_3 = new WeakMap();
});
//@ chunk-n51jggtb.js:157772-157811 placement
/**
 * 启动新的一轮步数额度。
 */
function startStepClock(steps) {
  weakMap_3.get(steps)?.start(replSyncRunMs());
}
//@ chunk-n51jggtb.js:157811-157910 placement
/**
 * 换主时转移步数归属。
 */
function resumeSteps(steps, call) {
  flushStopCounters(steps);
  let entry = weakMap_3.get(steps);
  if (entry !== undefined) {
    entry.owner = new WeakRef(call);
    entry.started.emit();
  }
  startStepClock(steps);
}
//@ chunk-n51jggtb.js:158043-158115 placement
/**
 * 订阅步数轮次开始事件。
 */
function onStepStarted(call, listener) {
  return weakMap_3.get(call.steps)?.started.subscribe(listener) ?? (() => {});
}
//@ chunk-n51jggtb.js:158115-158263 placement
/**
 * 把累计的停因计数归到宿主。
 */
function flushStopCounters(steps) {
  let owner = weakMap_3.get(steps)?.owner?.deref();
  if (owner !== undefined) {
    owner.clockStops += steps.clockStops;
    owner.budgetStops += steps.budgetStops;
  }
  steps.clockStops = 0;
  steps.budgetStops = 0;
}
//@ chunk-n51jggtb.js:158263-158341 placement
/**
 * 取出并清零步数停止计数。
 */
function takeStopCounters(session, call) {
  flushStopCounters(session.steps);
  return {
    clock: call.clockStops,
    budget: call.budgetStops,
  };
}
//@ chunk-n51jggtb.js:158341-158386 placement
/**
 * 停止哨兵集合与 Promise 链深度上限。
 */
var weakSet_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var weakSet_3;
var MAX_PROTOTYPE_HOPS;
var rejectionFilterInstalled;
deferInit("chunk-n51jggtb.js:158341", () => {
  weakSet_2 = new WeakSet();
  weakSet_3 = new WeakSet();
  MAX_PROTOTYPE_HOPS = 4;
  rejectionFilterInstalled = false;
});
//@ chunk-n51jggtb.js:158386-158739 placement
/**
 * 安装未处理拒绝的过滤器，识别步数/墙钟停止与被弃置的 Promise。
 */
function installRejectionFilter() {
  if (rejectionFilterInstalled) return;
  rejectionFilterInstalled = true;
  claimPendingWriteLine((reason, promise) => {
    if (typeof reason === "object" && reason !== null && weakSet_2.has(reason))
      return "REPL: swallowed an unhandled rejection (not exiting): the step budget or the wall clock stopped script code that nothing awaited";
    return isReplPromise(promise)
      ? "REPL: swallowed an unhandled rejection (not exiting): a promise that a script left unread was rejected"
      : undefined;
  });
}
//@ chunk-n51jggtb.js:158739-158892 placement
/**
 * 沿原型链判断是否为脚本留下的 Promise。
 */
function isReplPromise(value) {
  let current = value;
  for (let j = 0; j <= MAX_PROTOTYPE_HOPS; j++) {
    if (typeof current !== "object" || current === null || isUntrustedObject(current)) return false;
    if (weakSet_3.has(current)) return true;
    current = Object.getPrototypeOf(current);
  }
  return false;
}
//@ chunk-n51jggtb.js:158892-162322 placement
/**
 * 安装 VM 侧的计步器（按步长发放额度并读时钟）。
 */
function installStepBudget(vmContext, steps, sealerContext) {
  let counterName = `${STEP_FN_NAME}Counter`;
  let installed = sealerContext.clone({
    steps: undefined,
    markStop: undefined,
    start: undefined,
  });
  installed.steps = steps;
  installed.markStop = sealerContext.fn((error) => {
    if (typeof error === "object" && error !== null) weakSet_2.add(error);
  });
  defineGlobal(vmContext, counterName, installed);
  runInVm(
    `'use strict';
    const ${STEP_FN_NAME} = (() => { try { return ((carried) => {
      const steps = carried.steps
      const markStop = carried.markStop
      const BuiltinRangeError = RangeError
      const clock = Date.now
      // markStop is the host's: whatever it throws ends in this catch and
      // never reaches script code (REVIEW.md, REPLTOOL-07). The stop,
      // unmarked, is still thrown.
      const stop = (message) => {
        const error = new BuiltinRangeError(message)
        try { markStop(error) } catch {}
        return error
      }
      carried.start = (boundMs) => {
        const now = clock()
        steps.bound = boundMs
        steps.deadline = now + boundMs
        steps.lastClock = now
        steps.stride = 1
        steps.stopped = false
      }
      const clockStop = (ms) =>
        stop(
          'REPL: a turn ran past ' + ms + ' ms, its wall clock, and ' +
            "was stopped. A turn is the code that runs from the script's start, " +
            "a tool call's result or a timer's firing until the next tool call's " +
            'result or timer. Slow built-in calls, such as a regular expression ' +
            'match over a long input, use that time up: give such calls less to ' +
            'do, or await a tool call or a timer between them.',
        )
      // Steps are handed out a stride at a time: left counts the current stride
      // down, rest is the budget not yet handed out. Only the step that ends a
      // stride gets here, to read the clock; that step is not counted yet.
      const nextStride = () => {
        if (steps.rest <= 0) {
          steps.left = 0
          if (!steps.budgetStopped) {
            steps.budgetStopped = true
            steps.budgetStops++
          }
          throw stop(
            'REPL: a turn ran ' + steps.budget + ' steps, its budget (a step is ' +
              'one pass through a loop or one call of a function), and was ' +
              "stopped. A turn is the code that runs from the script's start, a " +
              "tool call's result or a timer's firing until the next tool call's " +
              'result or timer. End the loop, or await a tool call or a timer in it.',
          )
        }
        const now = clock()
        if (now > steps.deadline) {
          steps.left = 0
          if (!steps.stopped) {
            steps.stopped = true
            steps.clockStops++
          }
          throw clockStop(steps.bound)
        }
        const stride =
          now - steps.lastClock >= ${STEP_MAX_LINES}
            ? 1
            : steps.stride < ${STEP_MAX_OUTPUT_CHARS}
              ? steps.stride * 2
              : ${STEP_MAX_OUTPUT_CHARS}
        steps.lastClock = now
        steps.stride = stride
        const take = stride < steps.rest ? stride : steps.rest
        steps.rest -= take
        steps.left = take - 1
      }
      return () => {
        if (--steps.left < 0) {
          nextStride()
        }
      }
    })(globalThis.${counterName}) } finally { delete globalThis.${counterName} } })();`,
    vmContext,
    sealerContext.rejectImport,
  );
  if (installed.start === undefined)
    throw Error(
      "REPL: internal error: the step counter did not set up its clock (installStepBudget). This is a fault in the REPL tool, not in the script.",
    );
  weakMap_3.set(steps, {
    start: installed.start,
    turns: 0,
    owner: undefined,
    started: createSignal(),
  });
  installRejectionFilter();
}
//@ chunk-n51jggtb.js:162322-162758 placement
/**
 * 在墙钟内同步执行脚本，超时转成模型可读的说明。
 */
function runSynchronousScript(vmModule, call) {
  let timeoutMs = replSyncRunMs();
  startStepClock(call.steps);
  try {
    return vmModule.runInContext(call.vmContext, {
      timeout: timeoutMs,
    });
  } catch (error) {
    if (isHostError(error) && getErrnoCode(error) === "ERR_SCRIPT_EXECUTION_TIMEOUT") {
      let timeoutError = Error(
        `REPL: the script's synchronous run took ${timeoutMs} ms, its wall clock, and was stopped. The step budget counts loops and calls, not the time one built-in call takes, such as a regular expression match over a long input; give such a call less to do.`,
      );
      timeoutError.stack = "";
      throw timeoutError;
    }
    throw error;
  }
}
export {
  startStepClock,
  beginTurn,
  weakSet_3,
  installStepBudget,
  weakMap_3,
  resumeSteps,
  takeStopCounters,
  onStepStarted,
  runSynchronousScript,
};
