/**
 * utils/processStartTuning.ts
 *
 * 2.1.316 新增。记录进程启动调优环境变量。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-xjnjbame.js (4)
 * attribution: placement 4
 */
import { ge } from "./identity.js";

/**
 * 进程启动调优环境变量
 */
//@ chunk-xjnjbame.js:227-551 placement
var PROCESS_START_TUNING_ENV = [
    "BUN_GC_TIMER_INTERVAL",
    "MIMALLOC_PURGE_HOLES_MIN_INTERVAL",
    "BUN_IDLE_GC_SECONDS",
    "MIMALLOC_PURGE_DELAY",
    "BUN_JSC_useFTLJIT",
    "BUN_JSC_percentCPUPerMBForEdenTimer",
    "BUN_JSC_percentCPUPerMBForFullTimer",
  ],
  e = ge({ isNoted: !1, namesSet: void 0, purgeDelayMs: void 0 }, (n) => {
    ((n.isNoted = !1), (n.namesSet = void 0), (n.purgeDelayMs = void 0));
  });
/**
 * 记录进程启动调优环境变量。
 */
//@ chunk-xjnjbame.js:551-809 placement
function noteProcessStartTuning() {
  if (e.isNoted) return;
  e.isNoted = !0;
  try {
    let n = 0;
    for (let [r, s] of PROCESS_START_TUNING_ENV.entries()) if (process.env[s]) n |= 1 << r;
    let envMimallocPurgeDelay = process.env.MIMALLOC_PURGE_DELAY;
    ((e.purgeDelayMs =
      envMimallocPurgeDelay !== void 0 && /^\d{1,7}$/.test(envMimallocPurgeDelay)
        ? Number(envMimallocPurgeDelay)
        : void 0),
      (e.namesSet = n));
  } catch {
    e.purgeDelayMs = void 0;
  }
}
//@ chunk-xjnjbame.js:809-842 placement
function processStartTuning() {
  return e.namesSet;
}
//@ chunk-xjnjbame.js:842-879 placement
function processStartPurgeDelayMs() {
  return e.purgeDelayMs;
}

export { processStartTuning, processStartPurgeDelayMs };
