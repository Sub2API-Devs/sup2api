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
import { MAX_TIMER_DELAY_MS } from "./timerDelayClamp.js";

//@ chunk-sthwtwzm.js:263-731 fingerprint (2.1.88 match: createCombinedAbortSignal, 0.925)
/**
 * 合并多个 AbortSignal（及可选超时）为一个，任一触发即 abort，返回 signal 与清理函数。
 */
function createCombinedAbortSignal(signal, opts) {
  let { signalB, timeoutMs, refTimer } = opts ?? {};
  let combined = createAbortController();
  if (signal?.aborted || signalB?.aborted) {
    combined.abort();
    return {
      signal: combined.signal,
      cleanup: () => {},
    };
  }
  let timer;
  let abortCombined = () => {
    if (timer !== undefined) clearTimeout(timer);
    combined.abort();
  };
  if (timeoutMs !== undefined) {
    timer = setTimeout(abortCombined, Math.min(timeoutMs, MAX_TIMER_DELAY_MS));
    if (!refTimer) timer.unref?.();
  }
  signal?.addEventListener("abort", abortCombined);
  signalB?.addEventListener("abort", abortCombined);
  let cleanup = () => {
    if (timer !== undefined) clearTimeout(timer);
    signal?.removeEventListener("abort", abortCombined);
    signalB?.removeEventListener("abort", abortCombined);
  };
  return {
    signal: combined.signal,
    cleanup,
  };
}
export { createCombinedAbortSignal };
