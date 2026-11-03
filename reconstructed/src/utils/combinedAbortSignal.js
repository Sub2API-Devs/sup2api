/**
 * utils/combinedAbortSignal.ts
 *
 * 合并多个 AbortSignal 与超时为一个 signal
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/combinedAbortSignal.ts
 * pieces: chunk-sthwtwzm.js (1)
 * attribution: fingerprint 1
 */
import { createAbortController } from "./abortController.js";
import { ec } from "./timerDelayClamp.js";

/**
 * 合并多个 AbortSignal（及可选超时）为一个，任一触发即 abort，返回 signal 与清理函数。
 */
//@ chunk-sthwtwzm.js:263-731 fingerprint = createCombinedAbortSignal (0.925)
function createCombinedAbortSignal(signal, opts) {
  let { signalB: signalB, timeoutMs: timeoutMs, refTimer: refTimer } = opts ?? {},
    combined = createAbortController();
  if (signal?.aborted || signalB?.aborted)
    return (combined.abort(), { signal: combined.signal, cleanup: () => {} });
  let timer,
    abortCombined = () => {
      if (timer !== void 0) clearTimeout(timer);
      combined.abort();
    };
  if (timeoutMs !== void 0) {
    if (((timer = setTimeout(abortCombined, Math.min(timeoutMs, ec))), !refTimer)) timer.unref?.();
  }
  (signal?.addEventListener("abort", abortCombined), signalB?.addEventListener("abort", abortCombined));
  let cleanup = () => {
    if (timer !== void 0) clearTimeout(timer);
    (signal?.removeEventListener("abort", abortCombined),
      signalB?.removeEventListener("abort", abortCombined));
  };
  return { signal: combined.signal, cleanup: cleanup };
}

export { createCombinedAbortSignal };
