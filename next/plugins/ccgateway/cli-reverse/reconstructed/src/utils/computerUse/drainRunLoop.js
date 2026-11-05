/**
 * utils/computerUse/drainRunLoop.ts
 *
 * macOS 主 run loop 泵：引用计数地以 1ms 间隔驱动 Swift 模块，并给原生调用加超时。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/computerUse/drainRunLoop.ts
 * pieces: chunk-w3ch4xq2.js (8)
 * attribution: fingerprint 5, layout 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getComputerUseSession } from "./session.js";
import { requireComputerUseSwift } from "./swiftLoader.js";
import { logForDebugging } from "../debug.js";

//@ chunk-w3ch4xq2.js:55656-55693 fingerprint (2.1.88 match: drainTick, 1)
/**
 * 驱动一次 macOS 主线程 run loop（Swift 模块 _drainMainRunLoop）。
 */
function drainTick(cu) {
  cu._drainMainRunLoop();
}
//@ chunk-w3ch4xq2.js:55693-55860 fingerprint (2.1.88 match: retain, 0.77)
/**
 * 引用计数 +1，首次时每 1ms 泵一次主 run loop。
 */
function retain() {
  let cuState = getComputerUseSession();
  cuState.runLoopPumpRetainCount++;
  if (cuState.runLoopPump === undefined) {
    cuState.runLoopPump = setInterval(drainTick, 1, requireComputerUseSwift());
    logForDebugging("[drainRunLoop] pump started", {
      level: "verbose",
    });
  }
}
//@ chunk-w3ch4xq2.js:55860-56095 fingerprint (2.1.88 match: release, 0.77)
/**
 * 引用计数 -1，归零时停止 run loop 泵。
 */
function release() {
  let cuState = getComputerUseSession();
  cuState.runLoopPumpRetainCount--;
  if (cuState.runLoopPumpRetainCount <= 0 && cuState.runLoopPump !== undefined) {
    clearInterval(cuState.runLoopPump);
    cuState.runLoopPump = undefined;
    logForDebugging("[drainRunLoop] pump stopped", {
      level: "verbose",
    });
    cuState.runLoopPumpRetainCount = 0;
  }
}
//@ chunk-w3ch4xq2.js:56095-56108 layout
/**
 * 原生 computer-use 调用默认超时 30s。
 */
var NATIVE_CALL_TIMEOUT_MS = 30000;
//@ chunk-w3ch4xq2.js:56108-56197 fingerprint (2.1.88 match: timeoutReject, 1)
/**
 * 原生 computer-use 调用超时错误。
 */
class NativeCallTimeoutError extends Error {
  constructor(options) {
    super(`computer-use native call exceeded ${options}ms`);
  }
}
//@ chunk-w3ch4xq2.js:56197-56227 layout
/**
 * setTimeout 回调：以 NativeCallTimeoutError 拒绝。
 */
function rejectWithNativeTimeout(promise, timeoutMs) {
  promise(new NativeCallTimeoutError(timeoutMs));
}
//@ chunk-w3ch4xq2.js:56227-56237 layout
/**
 * release 的别名，供 ESC 热键注销时释放 run loop 泵。
 */
var releasePump = release;
//@ chunk-w3ch4xq2.js:56237-56436 fingerprint (2.1.88 match: drainRunLoop, 0.839)
/**
 * 在 run loop 泵保持期间执行原生调用，超时（默认 30s）抛 NativeCallTimeoutError。
 */
async function drainRunLoop(fn, timeoutMs = NATIVE_CALL_TIMEOUT_MS) {
  retain();
  let timer;
  try {
    let work = fn();
    work.catch(() => {});
    let timeout = Promise.withResolvers();
    timer = setTimeout(rejectWithNativeTimeout, timeoutMs, timeout.reject, timeoutMs);
    return await Promise.race([work, timeout.promise]);
  } finally {
    clearTimeout(timer);
    release();
  }
}
export { releasePump };
