/**
 * tools/REPLTool/watchdog.ts
 *
 * 可暂停的墙钟看门狗与按工具超时的排雷（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-n51jggtb.js (6)
 * attribution: placement 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isBackgroundTasksOff } from "../AgentTool/backgroundGates.js";
import { SHELL_TOOL_NAMES } from "../../utils/shell/shellToolUtils.js";
import { codeModeAccepted } from "../../utils/codeMode/accepted.js";
import { joinToolNames } from "./stopReasons.js";
import { plural } from "../../utils/stringUtils.js";
import { formatDuration as formatDuration_2 } from "../../utils/format.js";
import { systemClock } from "../../utils/sleep.js";
import { REPL_TIMER_LATE_MS, REPL_TIMER_GRACE_MS } from "../../utils/codeMode.js";
import { REPL_MAX_TIMEOUT_MS } from "../RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { armLatenessAwareTimer } from "./asyncSettle.js";

//@ chunk-n51jggtb.js:176028-176154 placement
/**
 * 按卡住时的调用形态归类（nothing/shellCall/call）。
 */
function timeoutKind(startingCalls, lane) {
  if (startingCalls.length === 0) return "nothing";
  return lane === "classic" &&
    !isBackgroundTasksOff() &&
    startingCalls.every((toolName) => SHELL_TOOL_NAMES.includes(toolName))
    ? "shellCall"
    : "call";
}
//@ chunk-n51jggtb.js:176154-177990 placement
/**
 * 墙钟超时的长说明：区分调用在沙箱里跑过、被 hook 重跑、shell 调用等情形。
 */
function wallClockTimeoutMessage(limitMs, startingCalls, kind) {
  let anotherRunning = kind !== "nothing";
  if (codeModeAccepted() && startingCalls.length > 0) {
    let single = startingCalls.length === 1;
    let callCountText = `its ${joinToolNames(startingCalls)} ${plural(startingCalls.length, "call")}`;
    let filtered = startingCalls.filter((entry) => entry.ranBefore);
    let sandboxRerunText =
      filtered.length === 0
        ? ""
        : filtered.length === 1
          ? ` The ${filtered[0].toolName} call had run once in the sandbox, which blocked it, and was waiting to run again outside it.`
          : ` ${filtered.length} of them had run once in the sandbox, which blocked them, and were waiting to run again outside it.`;
    let filtered_2 = startingCalls.filter((entry) => entry.rerunByHook === true);
    let hookRerunText =
      filtered_2.length === 0
        ? ""
        : filtered_2.length === 1
          ? ` The ${filtered_2[0].toolName} call had already run, and a plugin's hook had started it again.`
          : ` ${filtered_2.length} of them had already run, and a plugin's hook had started them again.`;
    let hangHint = anotherRunning
      ? " Another call was still running and may be hung \u2014 try a shorter timeout on the tool itself, or split the work."
      : ` Otherwise ${single ? "it" : "one of them"} may be hung in a hook or in a check of its directories.`;
    return `REPL execution exceeded its wall-clock limit of ${formatDuration_2(limitMs, {
      hideTrailingZeros: true,
    })} while ${callCountText} ${single ? "was" : "were"} waiting to run.${sandboxRerunText}${hookRerunText} ${single ? "It" : "They"} may have been waiting for the user to answer a permission prompt, which is now closed. If so, running ${single ? "it" : "them"} again will ask the user again.${hangHint}`;
  }
  switch (kind) {
    case "shellCall":
      return `REPL execution exceeded its wall-clock limit of ${formatDuration_2(limitMs, {
        hideTrailingZeros: true,
      })} before a shell call finished. The limit is on the whole script, and a command still running when it is reached is stopped with the script. A command whose own timeout ends before the limit moves to the background at that timeout and keeps running (one that starts with sleep is stopped instead), so give a long command a shorter timeout, or split the work.`;
    case "nothing":
    case "call":
      return `REPL execution exceeded hard wall-clock limit of ${limitMs}ms. An inner tool call may be hung \u2014 try a shorter timeout on the tool itself, or split the work.`;
  }
}
//@ chunk-n51jggtb.js:209871-210385 placement
/**
 * 墙钟计时器：在途调用为空时暂停计时，恢复时补计。
 */
function createTurnTracker({
  deadline,
  self: callState,
  outstanding,
  ownTimers,
  subscribeTurns,
  now = Date.now,
  afterTurn = setImmediate,
}) {
  let ownPending = 0;
  let count = outstanding.count;
  let paused = false;
  let update = () => {
    let shouldPause = count > 0 && ownTimers() === 0;
    if (shouldPause !== paused) {
      paused = shouldPause;
      if (shouldPause) {
        deadline.pauseForOthers();
        deadline.charge(0);
      } else deadline.resumeFromOthers();
    }
  };
  update();
  let inTurn = false;
  let turnStart;
  let chargeTurn = () => {
    if (turnStart !== undefined) {
      deadline.charge(now() - turnStart);
      turnStart = undefined;
    }
  };
  let maybeStartClock = () => {
    if (inTurn && ownPending === 0 && paused) turnStart = now();
  };
  let onTurnStart = () => {
    chargeTurn();
    inTurn = true;
    maybeStartClock();
    afterTurn(() => {
      chargeTurn();
      update();
      inTurn = false;
    });
  };
  let unsubscribe = outstanding.changed.subscribe((call, phase) => {
    chargeTurn();
    let delta = phase === "start" ? 1 : -1;
    if (call === callState) ownPending += delta;
    else count += delta;
    update();
    maybeStartClock();
  });
  let unsubscribeTurns = subscribeTurns(onTurnStart);
  return {
    turnStarted: onTurnStart,
    stop: () => {
      unsubscribe();
      unsubscribeTurns();
    },
  };
}
//@ chunk-n51jggtb.js:210385-211007 placement
/**
 * 可暂停的墙钟定时器实现。
 */
function createDeadline(budgetMs, onExpire, clock = systemClock) {
  let activeCalls = 0;
  let pausedForOthers = false;
  let remainingMs = budgetMs;
  let startedAt = 0;
  let handle;
  let expired = false;
  let graceOnly = false;
  let started = false;
  function counting() {
    return activeCalls > 0 || (pausedForOthers && !graceOnly);
  }
  function expire() {
    expired = true;
    onExpire();
  }
  function schedule() {
    if (!started || expired || handle !== undefined || counting()) return;
    if (remainingMs <= 0) {
      expire();
      return;
    }
    startedAt = clock.now();
    handle = clock.setTimeout(onTimer, remainingMs, {
      unref: true,
    });
  }
  function charge(elapsed) {
    if (!graceOnly && elapsed - remainingMs > REPL_TIMER_LATE_MS) {
      graceOnly = true;
      remainingMs = REPL_TIMER_GRACE_MS;
    } else remainingMs -= elapsed;
  }
  function onTimer() {
    handle = undefined;
    charge(Math.max(clock.now() - startedAt, remainingMs));
    schedule();
  }
  function reschedule() {
    if (counting() && handle !== undefined) {
      handle();
      handle = undefined;
      charge(clock.now() - startedAt);
    }
    schedule();
  }
  return {
    start: () => {
      started = true;
      schedule();
    },
    onToolStart: () => {
      activeCalls++;
      reschedule();
    },
    onToolEnd: () => {
      activeCalls--;
      reschedule();
    },
    pauseForOthers: () => {
      pausedForOthers = true;
      reschedule();
    },
    resumeFromOthers: () => {
      pausedForOthers = false;
      reschedule();
    },
    charge: (ms) => {
      if (!started || expired || !counting()) return;
      charge(ms);
      if (remainingMs <= 0) {
        expire();
        return;
      }
      schedule();
    },
    cancel: () => {
      expired = true;
      handle?.();
      handle = undefined;
    },
  };
}
//@ chunk-n51jggtb.js:211007-211026 placement
/**
 * 看门狗的基础延时与倍数。
 */
var WATCHDOG_GRACE_MS = 5000;
var WATCHDOG_FACTOR = 1.5;
//@ chunk-n51jggtb.js:211026-211426 placement
/**
 * 按工具自身超时排看门狗（倍数 + 基础延时，超过上限则不用）。
 */
function createInnerWatchdog(onFire, clock = systemClock) {
  let timers = new Map();
  let fire = (call, watchdogMs) => {
    timers.delete(call.toolUseId);
    onFire(call, watchdogMs);
  };
  return {
    arm: (call) => {
      let existing = timers.get(call.toolUseId);
      if (existing !== undefined) {
        existing();
        timers.delete(call.toolUseId);
      }
      if (call.nativeTimeoutMs === undefined) return;
      let watchdogMs = Math.ceil(call.nativeTimeoutMs * WATCHDOG_FACTOR) + WATCHDOG_GRACE_MS;
      if (watchdogMs >= REPL_MAX_TIMEOUT_MS) return;
      timers.set(
        call.toolUseId,
        armLatenessAwareTimer(clock, () => fire(call, watchdogMs), watchdogMs),
      );
    },
    clear: (toolUseId) => {
      let timer = timers.get(toolUseId);
      if (timer !== undefined) {
        timer();
        timers.delete(toolUseId);
      }
    },
    cancel: () => {
      for (let timer of timers.values()) timer();
      timers.clear();
    },
  };
}
export { createDeadline, createInnerWatchdog, createTurnTracker, timeoutKind, wallClockTimeoutMessage };
