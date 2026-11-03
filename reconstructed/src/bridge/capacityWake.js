/**
 * bridge/capacityWake.ts
 *
 * 可唤醒的轮询等待信号：外部 abort 或"有空位"唤醒时提前结束等待；另含若干同形的中止转发小助手
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/bridge/capacityWake.ts
 * pieces: chunk-wbbfk060.js (1)
 * attribution: fingerprint 1
 */

//@ chunk-wbbfk060.js:19273-19719 fingerprint = createCapacityWake (1)
/**
 * 创建可唤醒信号：signal() 返回合并了外部中止与"唤醒"的一次性 signal，wake() 触发当前等待结束（会话结束腾出容量时调用）。
 */
function createCapacityWake(outerSignal) {
  let wakeController = new AbortController();
  function wake() {
    wakeController.abort();
    wakeController = new AbortController();
  }
  function signal() {
    let merged = new AbortController();
    let abort = () => merged.abort();
    if (outerSignal.aborted || wakeController.signal.aborted) {
      merged.abort();
      return {
        signal: merged.signal,
        cleanup: () => {},
      };
    }
    outerSignal.addEventListener("abort", abort, {
      once: true,
    });
    let capSig = wakeController.signal;
    capSig.addEventListener("abort", abort, {
      once: true,
    });
    return {
      signal: merged.signal,
      cleanup: () => {
        outerSignal.removeEventListener("abort", abort);
        capSig.removeEventListener("abort", abort);
      },
    };
  }
  return {
    signal,
    wake,
  };
}
export { createCapacityWake };
