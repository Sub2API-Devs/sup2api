/**
 * tools/REPLTool/callState.ts
 *
 * 调用槽位发放、在途计数与调用状态容器（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-n51jggtb.js (11)
 * attribution: placement 11
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { REPL_MAX_REFUSALS_WHEN_OVER, replToolCallCap } from "../../utils/codeMode.js";
import { tagError } from "./instrument.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { callLimitStatus } from "./stopReasons.js";
import { yieldToEventLoop } from "../../native-ts/file-index/index.js";
import { beginTurn } from "./stepBudget.js";
import { matchesToolName } from "../../Tool.js";
import { REPL_TOOL_NAME } from "./constants.js";
import { createReplReadProbeSlot } from "./sessionHelpers.js";
import { createConsoleCapture } from "./consoleRing.js";
import { getCwd } from "../../utils/cwd.js";

//@ chunk-n51jggtb.js:83603-83940 placement
/**
 * 按并发额度发放调用令牌，abort 时一次性放行。
 */
function createTokenSlots(initialTokens, signal) {
  let tokens = initialTokens;
  let waiters = [];
  let waiterIndex = 0;
  signal.addEventListener(
    "abort",
    () => {
      let sliced = waiters.slice(waiterIndex);
      waiters = [];
      waiterIndex = 0;
      for (let resolve of sliced) resolve(false);
    },
    {
      once: true,
    },
  );
  return {
    take() {
      if (signal.aborted) return Promise.resolve(false);
      if (tokens > 0) {
        tokens--;
        return Promise.resolve(true);
      }
      return new Promise((resolve) => {
        waiters.push(resolve);
      });
    },
    give() {
      let resolve = waiters[waiterIndex];
      if (resolve === undefined) {
        tokens++;
        return;
      }
      waiterIndex++;
      if (waiterIndex === waiters.length) {
        waiters = [];
        waiterIndex = 0;
      }
      resolve(true);
    },
  };
}
//@ chunk-n51jggtb.js:83994-84055 placement
/**
 * 取出并清空 outstanding 槽。
 */
function takeShellDirectories(slot) {
  let pending = slot.pending ?? [];
  slot.pending = undefined;
  return pending;
}
//@ chunk-n51jggtb.js:84055-84108 placement
/**
 * 取出并清空 facts 槽。
 */
function takeFacts(slot) {
  let facts = slot.facts;
  slot.facts = undefined;
  return facts;
}
//@ chunk-n51jggtb.js:88790-89284 placement
/**
 * tracker：把内层调用进度整理成 start/executing/close 与提交记录。
 */
function createHookProgressTracker(onProgress) {
  let held;
  let closed = false;
  let reachedTool = false;
  let openRuns = 0;
  return {
    mayHaveReachedTool: () => reachedTool || openRuns > 0,
    close: () => {
      closed = true;
    },
    beginRun: () => {
      let run = {
        closing: undefined,
        commits: [],
        ranInput: undefined,
      };
      openRuns++;
      return {
        run,
        endRun: () => {
          openRuns--;
        },
        onProgress: (update) => {
          if (update.type === "progress" && update.data.phase === "executing") reachedTool = true;
          if (closed) return;
          if (update.type !== "progress") {
            onProgress?.(update);
            return;
          }
          switch (update.data.phase) {
            case "start":
              if (held !== undefined) {
                onProgress?.(held);
                held = undefined;
                onProgress?.(update);
              }
              return;
            case "executing":
              run.ranInput = update.data.toolInput;
              onProgress?.(update);
              return;
            case "complete":
            case "error":
              run.closing = update;
              held = update;
          }
        },
      };
    },
  };
}
//@ chunk-n51jggtb.js:162758-162890 placement
/**
 * 把调用与 abort 信号绑定，abort 时标记取消。
 */
function cancelCallOnAbort(replState, call, signal) {
  if (signal.aborted) {
    replState.endCall(call, "cancelled");
    return;
  }
  signal.addEventListener("abort", () => replState.endCall(call, "cancelled"), {
    once: true,
  });
}
//@ chunk-n51jggtb.js:162890-162931 placement
/**
 * 返回一个永不 settle 的 Promise。
 */
function neverSettles() {
  return new Promise(() => {});
}
//@ chunk-n51jggtb.js:162931-163029 placement
/**
 * 取消后让调用结果一直挂起。
 */
function awaitUnlessCancelled(call, promise) {
  return promise.then(
    (value) => (call.cancelled ? neverSettles() : value),
    (error) => {
      if (call.cancelled) return neverSettles();
      throw error;
    },
  );
}
//@ chunk-n51jggtb.js:163029-163705 placement
/**
 * 执行前检查调用上限与残留代码状态，超限时抛出可读错误。
 */
async function callToolWithCap(call, steps, outstanding, label, fn) {
  if (call.ended && call.stopSignal?.aborted === true && ++call.callsWhenOver > REPL_MAX_REFUSALS_WHEN_OVER) {
    if (call.callsWhenOver === REPL_MAX_REFUSALS_WHEN_OVER + 1) call.onLeftoverCodeStopped?.();
    return neverSettles();
  }
  let cap = replToolCallCap();
  if (call.toolCalls >= cap) {
    if (call.toolCallsRefused) return neverSettles();
    call.toolCallsRefused = true;
    let capError = tagError(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${label}: this script has made ${cap.toLocaleString("en-US")} calls, its cap. The call was not made, and no later call of this script will be answered.`,
        "REPL call cap reached",
      ),
      callLimitStatus(cap),
    );
    call.onToolCallCap?.(capError);
    throw capError;
  }
  call.toolCalls++;
  call.pendingCalls++;
  try {
    return await trackOutstandingCall(outstanding, call, async () => {
      try {
        return await fn();
      } finally {
        await yieldToEventLoop();
      }
    });
  } finally {
    call.pendingCalls--;
    call.onCallSettled?.();
    beginTurn(steps, call);
    if (call.ended && call.pendingCalls === 0) call.onIdle?.();
  }
}
//@ chunk-n51jggtb.js:163705-164025 placement
/**
 * 包一层在途调用计数与开始/结束事件。
 */
async function trackOutstandingCall(outstanding, call, fn) {
  let stopSignal = call.stopSignal;
  if (stopSignal === undefined || stopSignal.aborted) return await fn();
  let tracked = false;
  let end = () => {
    if (!tracked) return;
    tracked = false;
    outstanding.count--;
    outstanding.changed.emit(call, "end");
  };
  try {
    tracked = true;
    outstanding.count++;
    outstanding.changed.emit(call, "start");
    stopSignal.addEventListener("abort", end, {
      once: true,
    });
    if (stopSignal.aborted) end();
    return await fn();
  } finally {
    stopSignal.removeEventListener("abort", end);
    end();
  }
}
//@ chunk-n51jggtb.js:164025-164072 placement
/**
 * 从工具列表里滤掉 REPL 自身。
 */
function toolsExceptRepl(tools) {
  return tools.filter((tool) => !matchesToolName(tool, REPL_TOOL_NAME));
}
//@ chunk-n51jggtb.js:164072-164711 placement
/**
 * 建立一次脚本调用的运行时状态对象。
 */
function createCallState(
  sealers,
  {
    toolWrappers,
    team,
    evals,
    discovery,
    stepBudget,
    outside,
    hostWait = (promise) => promise(),
    resumed = () => Promise.resolve(),
    shellDirectorySlot = {
      pending: undefined,
    },
    readProbeSlot = createReplReadProbeSlot(),
    stopSignal,
    envVars,
  },
) {
  return {
    toolWrappers,
    team,
    evals,
    discovery,
    hostWait,
    resumed,
    console: createConsoleCapture(sealers),
    cwd: getCwd(),
    envVars,
    shellDirectorySlot,
    readProbeSlot,
    timers: new Set(),
    clockHeartbeat: undefined,
    clockStops: 0,
    budgetStops: 0,
    ended: false,
    cancelled: false,
    outside,
    pendingCalls: 0,
    onIdle: undefined,
    onCallSettled: undefined,
    stopSignal,
    ringLines: 0,
    toolCalls: 0,
    toolCallsRefused: false,
    onToolCallCap: undefined,
    callsWhenOver: 0,
    onLeftoverCodeStopped: undefined,
    stepBudget,
  };
}
export {
  createTokenSlots,
  takeShellDirectories,
  takeFacts,
  createHookProgressTracker,
  neverSettles,
  awaitUnlessCancelled,
  callToolWithCap,
  createCallState,
  toolsExceptRepl,
  trackOutstandingCall,
  cancelCallOnAbort,
};
