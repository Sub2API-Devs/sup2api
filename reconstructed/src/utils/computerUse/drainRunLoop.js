/**
 * utils/computerUse/drainRunLoop.ts
 *
 * macOS 主 run loop 泵：引用计数地以 1ms 间隔驱动 Swift 模块，并给原生调用加超时。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/computerUse/drainRunLoop.ts
 * pieces: chunk-ha3km179.js (8)
 * attribution: fingerprint 5, layout 3
 */
import { getComputerUseSession } from "./session.js";
import { requireComputerUseSwift } from "./swiftLoader.js";
import { logForDebugging } from "../debug.js";

//@ chunk-ha3km179.js:51167-51204 fingerprint = drainTick (1)
/**
 * 驱动一次 macOS 主线程 run loop（Swift 模块 _drainMainRunLoop）。
 */
function drainTick(cu) {
  cu._drainMainRunLoop();
}
//@ chunk-ha3km179.js:51204-51371 fingerprint = retain (0.77)
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
//@ chunk-ha3km179.js:51371-51606 fingerprint = release (0.77)
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
//@ chunk-ha3km179.js:51606-51619 layout
/**
 * 原生 computer-use 调用默认超时 30s。
 */
var NATIVE_CALL_TIMEOUT_MS = 30000;
//@ chunk-ha3km179.js:51619-51708 fingerprint = timeoutReject (1)
/**
 * 原生 computer-use 调用超时错误。
 */
class NativeCallTimeoutError extends Error {
  constructor(e) {
    super(`computer-use native call exceeded ${e}ms`);
  }
}
//@ chunk-ha3km179.js:51708-51738 layout
/**
 * setTimeout 回调：以 NativeCallTimeoutError 拒绝。
 */
function rejectWithNativeTimeout(e, n) {
  e(new NativeCallTimeoutError(n));
}
//@ chunk-ha3km179.js:51738-51748 layout
/**
 * release 的别名，供 ESC 热键注销时释放 run loop 泵。
 */
var releasePump = release;
//@ chunk-ha3km179.js:51748-51947 fingerprint = drainRunLoop (0.838)
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
