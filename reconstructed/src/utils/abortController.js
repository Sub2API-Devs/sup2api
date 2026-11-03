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
var Phr = 1000;
/**
 * 按单调时钟设置超时：到期前若时钟显示还剩超过 1 秒就重新安排（避免睡眠/漂移导致提前触发），到期时调用 onExpire；返回 clear 句柄。
 */
//@ chunk-mq9v2gw5.js:281-439 placement
function setMonotonicTimeout(e, r, o, { unref: t } = { unref: !0 }) {
  let n = { onExpire: e, clock: o, expiresAt: o.monotonicNow() + r, unref: t, cancel: void 0 };
  return (armMonotonicTimer(n, r), { clear: k.bind(void 0, n) });
}
//@ chunk-mq9v2gw5.js:439-555 placement
function armMonotonicTimer(e, r) {
  e.cancel = e.clock.setTimeout(onMonotonicTimer.bind(void 0, e), Math.min(Math.max(0, r || 0), 2147483647), {
    unref: e.unref,
  });
}
//@ chunk-mq9v2gw5.js:555-667 placement
function onMonotonicTimer(e) {
  e.cancel = void 0;
  let r = e.expiresAt - e.clock.monotonicNow();
  if (!(r > 1000)) {
    e.onExpire();
    return;
  }
  armMonotonicTimer(e, r);
}
//@ chunk-mq9v2gw5.js:667-710 placement
function k(e) {
  (e.cancel?.(), (e.cancel = void 0));
}
//@ chunk-mq9v2gw5.js:710-719 placement
var d = 50;
//@ chunk-mq9v2gw5.js:719-785 placement
function createAbortController(maxListeners = d) {
  let controller = new AbortController();
  return (setMaxListeners(maxListeners, controller.signal), controller);
}
//@ chunk-mq9v2gw5.js:785-853 fingerprint = propagateAbort (1)
function propagateAbort(e) {
  let parent = this.deref();
  e.deref()?.abort(parent?.signal.reason);
}
//@ chunk-mq9v2gw5.js:853-946 fingerprint = removeAbortHandler (1)
function removeAbortHandler(e) {
  let parent = this.deref(),
    handler = e.deref();
  if (parent && handler) parent.signal.removeEventListener("abort", handler);
}
//@ chunk-mq9v2gw5.js:946-1055 placement
var abortHandlerFinalizer = new FinalizationRegistry(
  ({ parentSignalRef: parentSignalRef, handler: handler }) => {
    parentSignalRef.deref()?.removeEventListener("abort", handler);
  },
);
/**
 * 把子控制器挂到父控制器上：父已 abort 则立刻调用 handler；否则注册一次性 abort 监听，子 abort 时反向移除监听。
 */
//@ chunk-mq9v2gw5.js:1055-1350 placement
function linkAbortToParent(e, r, o) {
  let weakRef = new WeakRef(r),
    weakRef_2 = new WeakRef(e);
  if (e.signal.aborted) {
    o.call(weakRef_2, weakRef);
    return;
  }
  let a = o.bind(weakRef_2, weakRef);
  (e.signal.addEventListener("abort", a, { once: !0 }),
    abortHandlerFinalizer.register(r, { parentSignalRef: new WeakRef(e.signal), handler: a }),
    r.signal.addEventListener("abort", removeAbortHandler.bind(weakRef_2, new WeakRef(a)), { once: !0 }));
}
/**
 * 创建子 AbortController：父 signal abort 时子也 abort（reason 透传）。用 WeakRef 引用父子，子被回收时 FinalizationRegistry 自动移除父上的监听，避免长会话泄漏。
 */
//@ chunk-mq9v2gw5.js:1350-1397 placement
function createChildAbortController(e, r) {
  let o = createAbortController(r);
  return (linkAbortToParent(e, o, propagateAbort), o);
}
/**
 * 轮次内的子 AbortController，记录所属 turnController，构造时自动跟随父 abort 并调高监听上限。
 */
//@ chunk-mq9v2gw5.js:1397-1521 placement
class PromptScopedAbortController extends AbortController {
  turnController;
  constructor(e) {
    super();
    this.turnController = e;
    (setMaxListeners(d, this.signal), linkAbortToParent(e, this, propagateAbort));
  }
}
//@ chunk-mq9v2gw5.js:1521-1587 placement
var ASK_WITHDRAWN_BY_ASKER = "ask-withdrawn-by-asker",
  ASK_WITHDRAWN_ABORT_REASON = new DOMException(ASK_WITHDRAWN_BY_ASKER, "AbortError");
/**
 * signal 是否因提问方撤回（ask-withdrawn-by-asker）而 abort。
 */
//@ chunk-mq9v2gw5.js:1587-1638 placement
function isAskWithdrawnByAsker(e) {
  return e.aborted && unwrapAbortReason(e.reason) === ASK_WITHDRAWN_BY_ASKER;
}
/**
 * 为一次提问创建子控制器：子 abort 会向上 abort 父；撤回信号触发时子以 ask-withdrawn-by-asker 原因 abort（不影响父）。
 */
//@ chunk-mq9v2gw5.js:1638-1873 placement = createChildAbortController (0.879)
function withdrawablePromptScope(parent, withdrawSignal) {
  let child = new PromptScopedAbortController(parent);
  if (
    (child.signal.addEventListener(
      "abort",
      () => {
        if (!withdrawSignal.aborted && !parent.signal.aborted) parent.abort(child.signal.reason);
      },
      { once: !0 },
    ),
    withdrawSignal.aborted)
  )
    child.abort(ASK_WITHDRAWN_ABORT_REASON);
  else withdrawSignal.addEventListener("abort", () => child.abort(ASK_WITHDRAWN_ABORT_REASON), { once: !0 });
  return child;
}
//@ chunk-mq9v2gw5.js:1873-1947 placement
function turnAbortControllerOf(e) {
  let r = e;
  while (r instanceof PromptScopedAbortController) r = r.turnController;
  return r;
}
/**
 * 把父 AbortController 的中止转发给子控制器，返回解除转发的函数。
 */
//@ chunk-mq9v2gw5.js:1947-2157 placement = createCapacityWake (0.799)
function attachDetachableAbortRelay(sourceController, targetController) {
  if (sourceController.signal.aborted)
    return (targetController.abort(sourceController.signal.reason), () => {});
  let abort = () => targetController.abort(sourceController.signal.reason);
  return (
    sourceController.signal.addEventListener("abort", abort, { once: !0 }),
    () => sourceController.signal.removeEventListener("abort", abort)
  );
}
/**
 * 各种中断原因对应的 AbortError（用户取消、远程取消、关机、打断、回合中止、转后台、拒绝回退编辑、恢复超时、权限停止）。
 */
//@ chunk-mq9v2gw5.js:2157-2718 placement
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
function unwrapAbortReason(e) {
  return e instanceof DOMException && e.name === "AbortError" ? e.message : e;
}
//@ chunk-mq9v2gw5.js:2828-3071 placement
async function raceWithAbortSignalPastInterrupt(e, r, o) {
  let abortController = new AbortController();
  function n() {
    if (unwrapAbortReason(r.reason) !== "interrupt") abortController.abort();
  }
  if (r.aborted) n();
  else r.addEventListener("abort", n, { once: !0 });
  try {
    return await raceWithAbortSignal(e, abortController.signal, o);
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
var x = new Set(["user-cancel", "remote-cancel"]);
//@ chunk-mq9v2gw5.js:3237-3273 placement
function isCancelAbortReason(e) {
  return x.has(unwrapAbortReason(e));
}
//@ chunk-mq9v2gw5.js:3273-3357 placement
var S = new Set(["interrupt", "turn-abort", "refusal-fallback-edit", "permission-stop"]);
//@ chunk-mq9v2gw5.js:3357-3392 placement
function isSilentAbortReason(e) {
  return S.has(unwrapAbortReason(e));
}
/**
 * 中止原因是否是 shutdown。
 */
//@ chunk-mq9v2gw5.js:3392-3450 placement = sendShutdownRequestToMailbox (0.557)
function shutdownInterruptStamp(e) {
  return unwrapAbortReason(e.reason) === "shutdown" ? !0 : void 0;
}
//@ chunk-mq9v2gw5.js:3450-3484 placement
var SERVER_FALLBACK_TOMBSTONE = "server-fallback-tombstone";
//@ chunk-mq9v2gw5.js:3484-3535 placement
function isServerFallbackDiscard(e) {
  return e.aborted && unwrapAbortReason(e.reason) === SERVER_FALLBACK_TOMBSTONE;
}
//@ chunk-mq9v2gw5.js:3535-3574 placement
var dOMException = new DOMException(SERVER_FALLBACK_TOMBSTONE, "AbortError");
//@ chunk-mq9v2gw5.js:3574-3598 placement
function serverFallbackTombstoneAbortReason() {
  return dOMException;
}
//@ chunk-mq9v2gw5.js:3598-3655 placement
var SUBAGENT_PARK = "subagent-park",
  dOMException_2 = new DOMException(SUBAGENT_PARK, "AbortError");
//@ chunk-mq9v2gw5.js:3655-3679 placement
function subagentParkAbortReason() {
  return dOMException_2;
}
//@ chunk-mq9v2gw5.js:3679-3730 placement
function isSubagentParkAbort(e) {
  return e.aborted && unwrapAbortReason(e.reason) === SUBAGENT_PARK;
}
//@ chunk-mq9v2gw5.js:3730-4170 placement
function classifyAbortReasonForTelemetry(e) {
  switch (unwrapAbortReason(e)) {
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
      return !0;
    case "turn_teardown":
    case "recovery_timeout":
    case "server_fallback_tombstone":
      return !1;
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
/**
 * 恢复超时：输入毫秒 ×1.5，夹在 10 分钟到 1 小时之间；NaN 取 10 分钟。
 */
//@ chunk-mq9v2gw5.js:4512-4611 placement
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
  return setMonotonicTimeout(abortWithRecoveryTimeout.bind(void 0, new WeakRef(e)), r, o);
}
/**
 * 创建只传播可恢复类 abort 原因的子控制器，并挂 recovery-timeout 定时器，到期自动 abort。
 */
//@ chunk-mq9v2gw5.js:4732-4872 placement = createChildAbortController (0.879)
function createRecoveryAbortController(e, r, o) {
  let t = createAbortController();
  if ((linkAbortToParent(e, t, propagateRecoverableAbort), t.signal.aborted)) return t;
  return (t.signal.addEventListener("abort", armRecoveryCeiling(t, r, o).clear, { once: !0 }), t);
}
//@ chunk-ad2e1aj6.js:43157-43267 fingerprint = createChildAbortController (0.879)
function createChildAbortController_2(e) {
  return new Promise((n) => {
    if (e.aborted) n();
    else e.addEventListener("abort", () => n(), { once: !0 });
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
  Phr,
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
