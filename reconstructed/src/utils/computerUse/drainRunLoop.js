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

/**
 * 驱动一次 macOS 主线程 run loop（Swift 模块 _drainMainRunLoop）。
 */
//@ chunk-ha3km179.js:51167-51204 fingerprint = drainTick (1)
function drainTick(cu) {
  cu._drainMainRunLoop();
}
/**
 * 引用计数 +1，首次时每 1ms 泵一次主 run loop。
 */
//@ chunk-ha3km179.js:51204-51371 fingerprint = retain (0.77)
function retain() {
  let cuState = getComputerUseSession();
  if ((cuState.runLoopPumpRetainCount++, cuState.runLoopPump === void 0))
    ((cuState.runLoopPump = setInterval(drainTick, 1, requireComputerUseSwift())),
      logForDebugging("[drainRunLoop] pump started", { level: "verbose" }));
}
/**
 * 引用计数 -1，归零时停止 run loop 泵。
 */
//@ chunk-ha3km179.js:51371-51606 fingerprint = release (0.77)
function release() {
  let cuState = getComputerUseSession();
  if (
    (cuState.runLoopPumpRetainCount--, cuState.runLoopPumpRetainCount <= 0 && cuState.runLoopPump !== void 0)
  )
    (clearInterval(cuState.runLoopPump),
      (cuState.runLoopPump = void 0),
      logForDebugging("[drainRunLoop] pump stopped", { level: "verbose" }),
      (cuState.runLoopPumpRetainCount = 0));
}
/**
 * 原生 computer-use 调用默认超时 30s。
 */
//@ chunk-ha3km179.js:51606-51619 layout
var NATIVE_CALL_TIMEOUT_MS = 30000;
/**
 * 原生 computer-use 调用超时错误。
 */
//@ chunk-ha3km179.js:51619-51708 fingerprint = timeoutReject (1)
class NativeCallTimeoutError extends Error {
  constructor(e) {
    super(`computer-use native call exceeded ${e}ms`);
  }
}
/**
 * setTimeout 回调：以 NativeCallTimeoutError 拒绝。
 */
//@ chunk-ha3km179.js:51708-51738 layout
function rejectWithNativeTimeout(e, n) {
  e(new NativeCallTimeoutError(n));
}
/**
 * release 的别名，供 ESC 热键注销时释放 run loop 泵。
 */
//@ chunk-ha3km179.js:51738-51748 layout
var releasePump = release;
/**
 * 在 run loop 泵保持期间执行原生调用，超时（默认 30s）抛 NativeCallTimeoutError。
 */
//@ chunk-ha3km179.js:51748-51947 fingerprint = drainRunLoop (0.838)
async function drainRunLoop(e, timeoutMs = NATIVE_CALL_TIMEOUT_MS) {
  retain();
  let timer;
  try {
    let work = e();
    work.catch(() => {});
    let withResolvers = Promise.withResolvers();
    return (
      (timer = setTimeout(rejectWithNativeTimeout, timeoutMs, withResolvers.reject, timeoutMs)),
      await Promise.race([work, withResolvers.promise])
    );
  } finally {
    (clearTimeout(timer), release());
  }
}

export { releasePump };
