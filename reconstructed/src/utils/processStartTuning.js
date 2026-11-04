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
import { identity } from "./identity.js";

//@ chunk-xjnjbame.js:227-551 placement
/**
 * 进程启动调优环境变量
 */
var PROCESS_START_TUNING_ENV = [
  "BUN_GC_TIMER_INTERVAL",
  "MIMALLOC_PURGE_HOLES_MIN_INTERVAL",
  "BUN_IDLE_GC_SECONDS",
  "MIMALLOC_PURGE_DELAY",
  "BUN_JSC_useFTLJIT",
  "BUN_JSC_percentCPUPerMBForEdenTimer",
  "BUN_JSC_percentCPUPerMBForFullTimer",
];
var processStartTuningState = identity(
  {
    isNoted: false,
    namesSet: undefined,
    purgeDelayMs: undefined,
  },
  (state) => {
    state.isNoted = false;
    state.namesSet = undefined;
    state.purgeDelayMs = undefined;
  },
);
//@ chunk-xjnjbame.js:551-809 placement
/**
 * 记录进程启动调优环境变量。
 */
function noteProcessStartTuning() {
  if (processStartTuningState.isNoted) return;
  processStartTuningState.isNoted = true;
  try {
    let namesSet = 0;
    for (let [index, name] of PROCESS_START_TUNING_ENV.entries())
      if (process.env[name]) namesSet |= 1 << index;
    let envMimallocPurgeDelay = process.env.MIMALLOC_PURGE_DELAY;
    processStartTuningState.purgeDelayMs =
      envMimallocPurgeDelay !== undefined && /^\d{1,7}$/.test(envMimallocPurgeDelay)
        ? Number(envMimallocPurgeDelay)
        : undefined;
    processStartTuningState.namesSet = namesSet;
  } catch {
    processStartTuningState.purgeDelayMs = undefined;
  }
}
//@ chunk-xjnjbame.js:809-842 placement
function processStartTuning() {
  return processStartTuningState.namesSet;
}
//@ chunk-xjnjbame.js:842-879 placement
function processStartPurgeDelayMs() {
  return processStartTuningState.purgeDelayMs;
}
export { processStartTuning, processStartPurgeDelayMs, noteProcessStartTuning };
