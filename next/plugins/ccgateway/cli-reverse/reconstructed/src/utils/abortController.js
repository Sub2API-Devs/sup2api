/**
 * utils/abortController.ts
 *
 * AbortController 工具：父子控制器（WeakRef + FinalizationRegistry 防泄漏）、提问撤回原因、恢复超时控制器
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/abortController.ts
 * pieces: chunk-w10mwqe3.js (44)
 * attribution: placement 42, layout 1, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { setMaxListeners } from "events";
import { raceWithAbortSignal } from "./sleep.js";
import { deferInit, beginDeferredInits } from "../../runtime/deferred-init.js";

// This module is the first evaluated of an import cycle of 2 modules closed by ./sleep.js;
// the load-time work of the cycle's statements marked "deferred" waits until the cycle is complete (runtime/deferred-init.js).
beginDeferredInits("src/utils/sleep.js");
// This module is the first evaluated of an import cycle of 2 modules closed by ./sleep.js (in the hooks worker thread);
// the load-time work of the cycle's statements marked "deferred" waits until the cycle is complete (runtime/deferred-init.js).
beginDeferredInits("worker:src/utils/sleep.js");
//@ chunk-w10mwqe3.js:268-281 placement
/**
 * 单调时钟定时器重排的阈值（1 秒）。
 */
var MONOTONIC_TIMER_RECHECK_MS = 1000;
//@ chunk-w10mwqe3.js:281-439 placement
/**
 * 按单调时钟设置超时：到期前若时钟显示还剩超过 1 秒就重新安排（避免睡眠/漂移导致提前触发），到期时调用 onExpire；返回 clear 句柄。
 */
function setMonotonicTimeout(
  onExpire,
  timeoutMs,
  clock,
  { unref } = {
    unref: true,
  },
) {
  let timer = {
    onExpire,
    clock,
    expiresAt: clock.monotonicNow() + timeoutMs,
    unref,
    cancel: undefined,
  };
  armMonotonicTimer(timer, timeoutMs);
  return {
    clear: cancelTimer.bind(undefined, timer),
  };
}
//@ chunk-w10mwqe3.js:439-555 placement
function armMonotonicTimer(timer, delayMs) {
  timer.cancel = timer.clock.setTimeout(
    onMonotonicTimer.bind(undefined, timer),
    Math.min(Math.max(0, delayMs || 0), 2147483647),
    {
      unref: timer.unref,
    },
  );
}
//@ chunk-w10mwqe3.js:555-667 placement
function onMonotonicTimer(timer) {
  timer.cancel = undefined;
  let remainingMs = timer.expiresAt - timer.clock.monotonicNow();
  if (!(remainingMs > 1000)) {
    timer.onExpire();
    return;
  }
  armMonotonicTimer(timer, remainingMs);
}
//@ chunk-w10mwqe3.js:667-710 placement
/**
 * 取消定时器并清空其句柄。
 */
function cancelTimer(timer) {
  timer.cancel?.();
  timer.cancel = undefined;
}
//@ chunk-w10mwqe3.js:710-719 placement
/**
 * AbortController 信号默认允许的监听数（50）。
 */
var DEFAULT_MAX_LISTENERS = 50;
//@ chunk-w10mwqe3.js:719-785 placement
function createAbortController(maxListeners = DEFAULT_MAX_LISTENERS) {
  let controller = new AbortController();
  setMaxListeners(maxListeners, controller.signal);
  return controller;
}
//@ chunk-w10mwqe3.js:785-853 layout (2.1.88 match: propagateAbort, 1)
function propagateAbort(childRef) {
  let parent = this.deref();
  childRef.deref()?.abort(parent?.signal.reason);
}
//@ chunk-w10mwqe3.js:853-946 fingerprint (2.1.88 match: removeAbortHandler, 1)
function removeAbortHandler(handlerRef) {
  let parent = this.deref();
  let handler = handlerRef.deref();
  if (parent && handler) parent.signal.removeEventListener("abort", handler);
}
//@ chunk-w10mwqe3.js:946-1069 placement
var abortHandlerFinalizer; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var weakMap;
deferInit("chunk-w10mwqe3.js:946", () => {
  abortHandlerFinalizer = new FinalizationRegistry(({ parentSignalRef, handler }) => {
    parentSignalRef.deref()?.removeEventListener("abort", handler);
  });
  weakMap = new WeakMap();
});
//@ chunk-w10mwqe3.js:1069-1382 placement
/**
 * 把子控制器挂到父控制器上：父已 abort 则立刻调用 handler；否则注册一次性 abort 监听，子 abort 时反向移除监听。
 */
function linkAbortToParent(parentController, childController, notifyParentAborted) {
  weakMap.set(childController.signal, childController);
  let weakChild = new WeakRef(childController);
  let weakParent = new WeakRef(parentController);
  if (parentController.signal.aborted) {
    notifyParentAborted.call(weakParent, weakChild);
    return;
  }
  let abortHandler = notifyParentAborted.bind(weakParent, weakChild);
  parentController.signal.addEventListener("abort", abortHandler, {
    once: true,
  });
  abortHandlerFinalizer.register(childController, {
    parentSignalRef: new WeakRef(parentController.signal),
    handler: abortHandler,
  });
  childController.signal.addEventListener(
    "abort",
    removeAbortHandler.bind(weakParent, new WeakRef(abortHandler)),
    {
      once: true,
    },
  );
}
//@ chunk-w10mwqe3.js:1382-1429 placement
/**
 * 创建子 AbortController：父 signal abort 时子也 abort（reason 透传）。用 WeakRef 引用父子，子被回收时 FinalizationRegistry 自动移除父上的监听，避免长会话泄漏。
 */
function createChildAbortController(parentController, maxListeners) {
  let childController = createAbortController(maxListeners);
  linkAbortToParent(parentController, childController, propagateAbort);
  return childController;
}
//@ chunk-w10mwqe3.js:1429-1552 placement
/**
 * 轮次内的子 AbortController，记录所属 turnController，构造时自动跟随父 abort 并调高监听上限。
 */
class PromptScopedAbortController extends AbortController {
  turnController;
  constructor(parentController) {
    super();
    this.turnController = parentController;
    setMaxListeners(DEFAULT_MAX_LISTENERS, this.signal);
    linkAbortToParent(parentController, this, propagateAbort);
  }
}
//@ chunk-w10mwqe3.js:1552-1618 placement
var ASK_WITHDRAWN_BY_ASKER; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var ASK_WITHDRAWN_ABORT_REASON;
deferInit("chunk-w10mwqe3.js:1552", () => {
  ASK_WITHDRAWN_BY_ASKER = "ask-withdrawn-by-asker";
  ASK_WITHDRAWN_ABORT_REASON = new DOMException(ASK_WITHDRAWN_BY_ASKER, "AbortError");
});
//@ chunk-w10mwqe3.js:1618-1669 placement
/**
 * signal 是否因提问方撤回（ask-withdrawn-by-asker）而 abort。
 */
function isAskWithdrawnByAsker(signal) {
  return signal.aborted && unwrapAbortReason(signal.reason) === ASK_WITHDRAWN_BY_ASKER;
}
//@ chunk-w10mwqe3.js:1669-1903 placement (2.1.88 match: createChildAbortController, 0.878)
/**
 * 为一次提问创建子控制器：子 abort 会向上 abort 父；撤回信号触发时子以 ask-withdrawn-by-asker 原因 abort（不影响父）。
 */
function withdrawablePromptScope(parent, withdrawSignal) {
  let child = new PromptScopedAbortController(parent);
  child.signal.addEventListener(
    "abort",
    () => {
      if (!withdrawSignal.aborted && !parent.signal.aborted) parent.abort(child.signal.reason);
    },
    {
      once: true,
    },
  );
  if (withdrawSignal.aborted) child.abort(ASK_WITHDRAWN_ABORT_REASON);
  else
    withdrawSignal.addEventListener("abort", () => child.abort(ASK_WITHDRAWN_ABORT_REASON), {
      once: true,
    });
  return child;
}
//@ chunk-w10mwqe3.js:1903-1976 placement
function turnAbortControllerOf(abortController) {
  let controller = abortController;
  while (controller instanceof PromptScopedAbortController) controller = controller.turnController;
  return controller;
}
//@ chunk-w10mwqe3.js:1976-2186 placement (2.1.88 match: createCapacityWake, 0.798)
/**
 * 把父 AbortController 的中止转发给子控制器，返回解除转发的函数。
 */
function attachDetachableAbortRelay(sourceController, targetController) {
  if (sourceController.signal.aborted) {
    targetController.abort(sourceController.signal.reason);
    return () => {};
  }
  let abort = () => targetController.abort(sourceController.signal.reason);
  sourceController.signal.addEventListener("abort", abort, {
    once: true,
  });
  return () => sourceController.signal.removeEventListener("abort", abort);
}
//@ chunk-w10mwqe3.js:2186-2747 placement
/**
 * 各种中断原因对应的 AbortError（用户取消、远程取消、关机、打断、回合中止、转后台、拒绝回退编辑、恢复超时、权限停止）。
 */
var ABORT_REASONS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-w10mwqe3.js:2186", () => {
  ABORT_REASONS = {
    "user-cancel": new DOMException("user-cancel", "AbortError"),
    "remote-cancel": new DOMException("remote-cancel", "AbortError"),
    shutdown: new DOMException("shutdown", "AbortError"),
    interrupt: new DOMException("interrupt", "AbortError"),
    "turn-abort": new DOMException("turn-abort", "AbortError"),
    background: new DOMException("background", "AbortError"),
    "refusal-fallback-edit": new DOMException("refusal-fallback-edit", "AbortError"),
    "recovery-timeout": new DOMException("recovery-timeout", "AbortError"),
    "permission-stop": new DOMException("permission-stop", "AbortError"),
  };
});
//@ chunk-w10mwqe3.js:2747-2774 placement
function userAbortReason(abortKind) {
  return ABORT_REASONS[abortKind];
}
//@ chunk-w10mwqe3.js:2774-2857 placement (2.1.88 match: AbortError, 1)
function unwrapAbortReason(reason) {
  return reason instanceof DOMException && reason.name === "AbortError" ? reason.message : reason;
}
//@ chunk-w10mwqe3.js:2857-3100 placement
async function raceWithAbortSignalPastInterrupt(definition, parentSignal, options) {
  let abortController = new AbortController();
  function onAbort() {
    if (unwrapAbortReason(parentSignal.reason) !== "interrupt") abortController.abort();
  }
  if (parentSignal.aborted) onAbort();
  else
    parentSignal.addEventListener("abort", onAbort, {
      once: true,
    });
  try {
    return await raceWithAbortSignal(definition, abortController.signal, options);
  } finally {
    parentSignal.removeEventListener("abort", onAbort);
  }
}
//@ chunk-w10mwqe3.js:3100-3183 placement
var CANCEL_REASONS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-w10mwqe3.js:3100", () => {
  CANCEL_REASONS = new Set(["user-cancel", "remote-cancel", "shutdown", "interrupt", "turn-abort"]);
});
//@ chunk-w10mwqe3.js:3183-3219 placement
function isUserInitiatedAbortReason(abortKind) {
  return CANCEL_REASONS.has(unwrapAbortReason(abortKind));
}
//@ chunk-w10mwqe3.js:3219-3266 placement
/**
 * 视为“用户取消/远端取消”的中止原因集合。
 */
var CANCEL_ABORT_REASONS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-w10mwqe3.js:3219", () => {
  CANCEL_ABORT_REASONS = new Set(["user-cancel", "remote-cancel"]);
});
//@ chunk-w10mwqe3.js:3266-3302 placement
function isCancelAbortReason(abortReason) {
  return CANCEL_ABORT_REASONS.has(unwrapAbortReason(abortReason));
}
//@ chunk-w10mwqe3.js:3302-3386 placement
/**
 * 无需提示用户的静默中止原因集合。
 */
var SILENT_ABORT_REASONS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-w10mwqe3.js:3302", () => {
  SILENT_ABORT_REASONS = new Set(["interrupt", "turn-abort", "refusal-fallback-edit", "permission-stop"]);
});
//@ chunk-w10mwqe3.js:3386-3422 placement
function isSilentAbortReason(reason) {
  return SILENT_ABORT_REASONS.has(unwrapAbortReason(reason));
}
//@ chunk-w10mwqe3.js:3422-3480 placement (2.1.88 match: sendShutdownRequestToMailbox, 0.557)
/**
 * 中止原因是否是 shutdown。
 */
function shutdownInterruptStamp(signal) {
  return unwrapAbortReason(signal.reason) === "shutdown" ? true : undefined;
}
//@ chunk-w10mwqe3.js:3480-3514 placement
var SERVER_FALLBACK_TOMBSTONE = "server-fallback-tombstone";
//@ chunk-w10mwqe3.js:3514-3565 placement
function isServerFallbackDiscard(signal) {
  return signal.aborted && unwrapAbortReason(signal.reason) === SERVER_FALLBACK_TOMBSTONE;
}
//@ chunk-w10mwqe3.js:3565-3604 placement
var dOMException; // deferred: uses SERVER_FALLBACK_TOMBSTONE of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-w10mwqe3.js:3565", () => {
  dOMException = new DOMException(SERVER_FALLBACK_TOMBSTONE, "AbortError");
});
//@ chunk-w10mwqe3.js:3604-3628 placement
function serverFallbackTombstoneAbortReason() {
  return dOMException;
}
//@ chunk-w10mwqe3.js:3628-3685 placement
var SUBAGENT_PARK; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var dOMException_2;
deferInit("chunk-w10mwqe3.js:3628", () => {
  SUBAGENT_PARK = "subagent-park";
  dOMException_2 = new DOMException(SUBAGENT_PARK, "AbortError");
});
//@ chunk-w10mwqe3.js:3685-3709 placement
function subagentParkAbortReason() {
  return dOMException_2;
}
//@ chunk-w10mwqe3.js:3709-3760 placement
function isSubagentParkAbort(signal) {
  return signal.aborted && unwrapAbortReason(signal.reason) === SUBAGENT_PARK;
}
//@ chunk-w10mwqe3.js:3760-4200 placement
function classifyAbortReasonForTelemetry(reason) {
  switch (unwrapAbortReason(reason)) {
    case "user-cancel":
      return "user_cancel";
    case "remote-cancel":
      return "remote_cancel";
    case "shutdown":
      return "shutdown";
    case "interrupt":
      return "interrupt";
    case "turn-abort":
      return "interrupt";
    case "background":
      return "background";
    case "recovery-timeout":
      return "recovery_timeout";
    case "permission-stop":
      return "turn_teardown";
    case SERVER_FALLBACK_TOMBSTONE:
      return "server_fallback_tombstone";
    case SUBAGENT_PARK:
      return "subagent_park";
    default:
      return "turn_teardown";
  }
}
//@ chunk-w10mwqe3.js:4200-4426 placement
function isUserAttributableAbortKind(abortKind) {
  switch (abortKind) {
    case "user_cancel":
    case "remote_cancel":
    case "shutdown":
    case "interrupt":
    case "background":
    case "subagent_park":
      return true;
    case "turn_teardown":
    case "recovery_timeout":
    case "server_fallback_tombstone":
      return false;
  }
}
//@ chunk-w10mwqe3.js:4426-4529 placement (2.1.88 match: propagateAbort, 1)
function propagateRecoverableAbort(controllerRef) {
  let parent = this.deref();
  if (!parent || !isUserInitiatedAbortReason(parent.signal.reason)) return;
  controllerRef.deref()?.abort(parent.signal.reason);
}
//@ chunk-w10mwqe3.js:4529-4542 placement
var MIN_RECOVERY_TIMEOUT_MS = 600000;
//@ chunk-w10mwqe3.js:4542-4641 placement
/**
 * 恢复超时：输入毫秒 ×1.5，夹在 10 分钟到 1 小时之间；NaN 取 10 分钟。
 */
function recoveryTimeoutForContextTokens(contextTokens) {
  if (Number.isNaN(contextTokens)) return MIN_RECOVERY_TIMEOUT_MS;
  return Math.min(3600000, Math.max(MIN_RECOVERY_TIMEOUT_MS, Math.round(contextTokens * 1.5)));
}
//@ chunk-w10mwqe3.js:4641-4696 placement
function abortWithRecoveryTimeout(controllerRef) {
  controllerRef.deref()?.abort(userAbortReason("recovery-timeout"));
}
//@ chunk-w10mwqe3.js:4696-4762 placement
function armRecoveryCeiling(abortController, timeoutMs, clock) {
  return setMonotonicTimeout(
    abortWithRecoveryTimeout.bind(undefined, new WeakRef(abortController)),
    timeoutMs,
    clock,
  );
}
//@ chunk-w10mwqe3.js:4762-4902 placement (2.1.88 match: createChildAbortController, 0.878)
/**
 * 创建只传播可恢复类 abort 原因的子控制器，并挂 recovery-timeout 定时器，到期自动 abort。
 */
function createRecoveryAbortController(parentController, recoveryTimeoutMs, clock) {
  let abortController = createAbortController();
  linkAbortToParent(parentController, abortController, propagateRecoverableAbort);
  if (abortController.signal.aborted) return abortController;
  abortController.signal.addEventListener(
    "abort",
    armRecoveryCeiling(abortController, recoveryTimeoutMs, clock).clear,
    {
      once: true,
    },
  );
  return abortController;
}
export {
  turnAbortControllerOf,
  subagentParkAbortReason,
  createChildAbortController,
  createAbortController,
  attachDetachableAbortRelay,
  shutdownInterruptStamp,
  userAbortReason,
  PromptScopedAbortController,
  isServerFallbackDiscard,
  isAskWithdrawnByAsker,
  MONOTONIC_TIMER_RECHECK_MS,
  unwrapAbortReason,
  isCancelAbortReason,
  withdrawablePromptScope,
  isSubagentParkAbort,
  setMonotonicTimeout,
  isUserInitiatedAbortReason,
  armRecoveryCeiling,
  recoveryTimeoutForContextTokens,
  classifyAbortReasonForTelemetry,
  isUserAttributableAbortKind,
  raceWithAbortSignalPastInterrupt,
  isSilentAbortReason,
  serverFallbackTombstoneAbortReason,
  createRecoveryAbortController,
};
