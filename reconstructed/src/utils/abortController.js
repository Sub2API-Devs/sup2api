/**
 * utils/abortController.ts
 *
 * AbortController 工具：父子控制器（WeakRef + FinalizationRegistry 防泄漏）、提问撤回原因、恢复超时控制器
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/abortController.ts
 * pieces: chunk-ad2e1aj6.js (1), chunk-mq9v2gw5.js (44)
 * attribution: fingerprint 3, placement 42
 */
import { setMaxListeners } from "events";
import { raceWithAbortSignal } from "./sleep.js";

//@ chunk-mq9v2gw5.js:268-281 placement
/**
 * 单调时钟定时器重排的阈值（1 秒）。
 */
var MONOTONIC_TIMER_RECHECK_MS = 1000;
//@ chunk-mq9v2gw5.js:281-439 placement
/**
 * 按单调时钟设置超时：到期前若时钟显示还剩超过 1 秒就重新安排（避免睡眠/漂移导致提前触发），到期时调用 onExpire；返回 clear 句柄。
 */
function setMonotonicTimeout(
  onExpire,
  r,
  clock,
  { unref: t } = {
    unref: true,
  },
) {
  let n = {
    onExpire,
    clock,
    expiresAt: clock.monotonicNow() + r,
    unref: t,
    cancel: undefined,
  };
  armMonotonicTimer(n, r);
  return {
    clear: cancelTimer.bind(undefined, n),
  };
}
//@ chunk-mq9v2gw5.js:439-555 placement
function armMonotonicTimer(e, r) {
  e.cancel = e.clock.setTimeout(
    onMonotonicTimer.bind(undefined, e),
    Math.min(Math.max(0, r || 0), 2147483647),
    {
      unref: e.unref,
    },
  );
}
//@ chunk-mq9v2gw5.js:555-667 placement
function onMonotonicTimer(e) {
  e.cancel = undefined;
  let r = e.expiresAt - e.clock.monotonicNow();
  if (!(r > 1000)) {
    e.onExpire();
    return;
  }
  armMonotonicTimer(e, r);
}
//@ chunk-mq9v2gw5.js:667-710 placement
/**
 * 取消定时器并清空其句柄。
 */
function cancelTimer(e) {
  e.cancel?.();
  e.cancel = undefined;
}
//@ chunk-mq9v2gw5.js:710-719 placement
/**
 * AbortController 信号默认允许的监听数（50）。
 */
var DEFAULT_MAX_LISTENERS = 50;
//@ chunk-mq9v2gw5.js:719-785 placement
function createAbortController(maxListeners = DEFAULT_MAX_LISTENERS) {
  let controller = new AbortController();
  setMaxListeners(maxListeners, controller.signal);
  return controller;
}
//@ chunk-mq9v2gw5.js:785-853 fingerprint = propagateAbort (1)
function propagateAbort(e) {
  let parent = this.deref();
  e.deref()?.abort(parent?.signal.reason);
}
//@ chunk-mq9v2gw5.js:853-946 fingerprint = removeAbortHandler (1)
function removeAbortHandler(e) {
  let parent = this.deref();
  let handler = e.deref();
  if (parent && handler) parent.signal.removeEventListener("abort", handler);
}
//@ chunk-mq9v2gw5.js:946-1055 placement
var abortHandlerFinalizer = new FinalizationRegistry(({ parentSignalRef, handler }) => {
  parentSignalRef.deref()?.removeEventListener("abort", handler);
});
//@ chunk-mq9v2gw5.js:1055-1350 placement
/**
 * 把子控制器挂到父控制器上：父已 abort 则立刻调用 handler；否则注册一次性 abort 监听，子 abort 时反向移除监听。
 */
function linkAbortToParent(e, abortController, o) {
  let weakRef = new WeakRef(abortController);
  let weakRef_2 = new WeakRef(e);
  if (e.signal.aborted) {
    o.call(weakRef_2, weakRef);
    return;
  }
  let a = o.bind(weakRef_2, weakRef);
  e.signal.addEventListener("abort", a, {
    once: true,
  });
  abortHandlerFinalizer.register(abortController, {
    parentSignalRef: new WeakRef(e.signal),
    handler: a,
  });
  abortController.signal.addEventListener("abort", removeAbortHandler.bind(weakRef_2, new WeakRef(a)), {
    once: true,
  });
}
//@ chunk-mq9v2gw5.js:1350-1397 placement
/**
 * 创建子 AbortController：父 signal abort 时子也 abort（reason 透传）。用 WeakRef 引用父子，子被回收时 FinalizationRegistry 自动移除父上的监听，避免长会话泄漏。
 */
function createChildAbortController(e, maxListeners) {
  let abortController = createAbortController(maxListeners);
  linkAbortToParent(e, abortController, propagateAbort);
  return abortController;
}
//@ chunk-mq9v2gw5.js:1397-1521 placement
/**
 * 轮次内的子 AbortController，记录所属 turnController，构造时自动跟随父 abort 并调高监听上限。
 */
class PromptScopedAbortController extends AbortController {
  turnController;
  constructor(abortController) {
    super();
    this.turnController = abortController;
    setMaxListeners(DEFAULT_MAX_LISTENERS, this.signal);
    linkAbortToParent(abortController, this, propagateAbort);
  }
}
//@ chunk-mq9v2gw5.js:1521-1587 placement
var ASK_WITHDRAWN_BY_ASKER = "ask-withdrawn-by-asker";
var ASK_WITHDRAWN_ABORT_REASON = new DOMException(ASK_WITHDRAWN_BY_ASKER, "AbortError");
//@ chunk-mq9v2gw5.js:1587-1638 placement
/**
 * signal 是否因提问方撤回（ask-withdrawn-by-asker）而 abort。
 */
function isAskWithdrawnByAsker(e) {
  return e.aborted && unwrapAbortReason(e.reason) === ASK_WITHDRAWN_BY_ASKER;
}
//@ chunk-mq9v2gw5.js:1638-1873 placement = createChildAbortController (0.879)
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
//@ chunk-mq9v2gw5.js:1873-1947 placement
function turnAbortControllerOf(abortController) {
  let r = abortController;
  while (r instanceof PromptScopedAbortController) r = r.turnController;
  return r;
}
//@ chunk-mq9v2gw5.js:1947-2157 placement = createCapacityWake (0.799)
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
//@ chunk-mq9v2gw5.js:2157-2718 placement
/**
 * 各种中断原因对应的 AbortError（用户取消、远程取消、关机、打断、回合中止、转后台、拒绝回退编辑、恢复超时、权限停止）。
 */
var ABORT_REASONS = {
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
//@ chunk-mq9v2gw5.js:2718-2745 placement
function userAbortReason(e) {
  return ABORT_REASONS[e];
}
//@ chunk-mq9v2gw5.js:2745-2828 placement = AbortError (1)
function unwrapAbortReason(reason) {
  return reason instanceof DOMException && reason.name === "AbortError" ? reason.message : reason;
}
//@ chunk-mq9v2gw5.js:2828-3071 placement
async function raceWithAbortSignalPastInterrupt(definition, r, o) {
  let abortController = new AbortController();
  function n() {
    if (unwrapAbortReason(r.reason) !== "interrupt") abortController.abort();
  }
  if (r.aborted) n();
  else
    r.addEventListener("abort", n, {
      once: true,
    });
  try {
    return await raceWithAbortSignal(definition, abortController.signal, o);
  } finally {
    r.removeEventListener("abort", n);
  }
}
//@ chunk-mq9v2gw5.js:3071-3154 placement
var _ = new Set(["user-cancel", "remote-cancel", "shutdown", "interrupt", "turn-abort"]);
//@ chunk-mq9v2gw5.js:3154-3190 placement
function isUserInitiatedAbortReason(e) {
  return _.has(unwrapAbortReason(e));
}
//@ chunk-mq9v2gw5.js:3190-3237 placement
/**
 * 视为“用户取消/远端取消”的中止原因集合。
 */
var CANCEL_ABORT_REASONS = new Set(["user-cancel", "remote-cancel"]);
//@ chunk-mq9v2gw5.js:3237-3273 placement
function isCancelAbortReason(reason) {
  return CANCEL_ABORT_REASONS.has(unwrapAbortReason(reason));
}
//@ chunk-mq9v2gw5.js:3273-3357 placement
/**
 * 无需提示用户的静默中止原因集合。
 */
var SILENT_ABORT_REASONS = new Set(["interrupt", "turn-abort", "refusal-fallback-edit", "permission-stop"]);
//@ chunk-mq9v2gw5.js:3357-3392 placement
function isSilentAbortReason(reason) {
  return SILENT_ABORT_REASONS.has(unwrapAbortReason(reason));
}
//@ chunk-mq9v2gw5.js:3392-3450 placement = sendShutdownRequestToMailbox (0.557)
/**
 * 中止原因是否是 shutdown。
 */
function shutdownInterruptStamp(signal) {
  return unwrapAbortReason(signal.reason) === "shutdown" ? true : undefined;
}
//@ chunk-mq9v2gw5.js:3450-3484 placement
var SERVER_FALLBACK_TOMBSTONE = "server-fallback-tombstone";
//@ chunk-mq9v2gw5.js:3484-3535 placement
function isServerFallbackDiscard(signal) {
  return signal.aborted && unwrapAbortReason(signal.reason) === SERVER_FALLBACK_TOMBSTONE;
}
//@ chunk-mq9v2gw5.js:3535-3574 placement
var dOMException = new DOMException(SERVER_FALLBACK_TOMBSTONE, "AbortError");
//@ chunk-mq9v2gw5.js:3574-3598 placement
function serverFallbackTombstoneAbortReason() {
  return dOMException;
}
//@ chunk-mq9v2gw5.js:3598-3655 placement
var SUBAGENT_PARK = "subagent-park";
var dOMException_2 = new DOMException(SUBAGENT_PARK, "AbortError");
//@ chunk-mq9v2gw5.js:3655-3679 placement
function subagentParkAbortReason() {
  return dOMException_2;
}
//@ chunk-mq9v2gw5.js:3679-3730 placement
function isSubagentParkAbort(signal) {
  return signal.aborted && unwrapAbortReason(signal.reason) === SUBAGENT_PARK;
}
//@ chunk-mq9v2gw5.js:3730-4170 placement
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
//@ chunk-mq9v2gw5.js:4170-4396 placement
function isUserAttributableAbortKind(e) {
  switch (e) {
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
//@ chunk-mq9v2gw5.js:4396-4499 placement = propagateAbort (1)
function propagateRecoverableAbort(e) {
  let parent = this.deref();
  if (!parent || !isUserInitiatedAbortReason(parent.signal.reason)) return;
  e.deref()?.abort(parent.signal.reason);
}
//@ chunk-mq9v2gw5.js:4499-4512 placement
var MIN_RECOVERY_TIMEOUT_MS = 600000;
//@ chunk-mq9v2gw5.js:4512-4611 placement
/**
 * 恢复超时：输入毫秒 ×1.5，夹在 10 分钟到 1 小时之间；NaN 取 10 分钟。
 */
function recoveryTimeoutForContextTokens(e) {
  if (Number.isNaN(e)) return MIN_RECOVERY_TIMEOUT_MS;
  return Math.min(3600000, Math.max(MIN_RECOVERY_TIMEOUT_MS, Math.round(e * 1.5)));
}
//@ chunk-mq9v2gw5.js:4611-4666 placement
function abortWithRecoveryTimeout(e) {
  e.deref()?.abort(userAbortReason("recovery-timeout"));
}
//@ chunk-mq9v2gw5.js:4666-4732 placement
function armRecoveryCeiling(e, r, o) {
  return setMonotonicTimeout(abortWithRecoveryTimeout.bind(undefined, new WeakRef(e)), r, o);
}
//@ chunk-mq9v2gw5.js:4732-4872 placement = createChildAbortController (0.879)
/**
 * 创建只传播可恢复类 abort 原因的子控制器，并挂 recovery-timeout 定时器，到期自动 abort。
 */
function createRecoveryAbortController(abortController, r, clock) {
  let abortController_2 = createAbortController();
  linkAbortToParent(abortController, abortController_2, propagateRecoverableAbort);
  if (abortController_2.signal.aborted) return abortController_2;
  abortController_2.signal.addEventListener("abort", armRecoveryCeiling(abortController_2, r, clock).clear, {
    once: true,
  });
  return abortController_2;
}
//@ chunk-ad2e1aj6.js:43157-43267 fingerprint = createChildAbortController (0.879)
function createChildAbortController_2(signal) {
  return new Promise((resolve) => {
    if (signal.aborted) resolve();
    else
      signal.addEventListener("abort", () => resolve(), {
        once: true,
      });
  });
}
export {
  unwrapAbortReason,
  turnAbortControllerOf,
  createAbortController,
  attachDetachableAbortRelay,
  isSubagentParkAbort,
  setMonotonicTimeout,
  PromptScopedAbortController,
  createChildAbortController,
  raceWithAbortSignalPastInterrupt,
  userAbortReason,
  subagentParkAbortReason,
  shutdownInterruptStamp,
  isServerFallbackDiscard,
  isCancelAbortReason,
  MONOTONIC_TIMER_RECHECK_MS,
  isSilentAbortReason,
  serverFallbackTombstoneAbortReason,
  createRecoveryAbortController,
  isUserInitiatedAbortReason,
  createChildAbortController_2,
  isAskWithdrawnByAsker,
  armRecoveryCeiling,
  recoveryTimeoutForContextTokens,
  classifyAbortReasonForTelemetry,
  isUserAttributableAbortKind,
  withdrawablePromptScope,
};
