/**
 * utils/processStartTuning.ts
 *
 * 2.1.316 新增。记录进程启动调优环境变量。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-59v9mbtg.js (6)
 * attribution: placement 5, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { identity } from "./identity.js";

//@ chunk-59v9mbtg.js:227-648 placement
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
var FALSY_ENV_VALUES = new Set(["", "0", "false", "no", "off"]);
var processStartTuningState = identity(
  {
    isNoted: false,
    namesSet: undefined,
    purgeDelayMs: undefined,
    isCollectionTimerOff: undefined,
  },
  (state) => {
    state.isNoted = false;
    state.namesSet = undefined;
    state.purgeDelayMs = undefined;
    state.isCollectionTimerOff = undefined;
  },
);
//@ chunk-59v9mbtg.js:648-705 layout
function envValueIsOn(value) {
  return value !== undefined && !FALSY_ENV_VALUES.has(value.toLowerCase());
}
//@ chunk-59v9mbtg.js:705-993 placement
/**
 * 记录进程启动调优环境变量。
 */
function noteProcessStartTuning() {
  if (processStartTuningState.isNoted) return;
  processStartTuningState.isNoted = true;
  try {
    let env = process.env;
    let namesSet = 0;
    for (let [index, name] of PROCESS_START_TUNING_ENV.entries()) if (env[name]) namesSet |= 1 << index;
    let MIMALLOC_PURGE_DELAY = env.MIMALLOC_PURGE_DELAY;
    let purgeDelayMs =
      MIMALLOC_PURGE_DELAY !== undefined && /^\d{1,7}$/.test(MIMALLOC_PURGE_DELAY)
        ? Number(MIMALLOC_PURGE_DELAY)
        : undefined;
    let isCollectionTimerOff = envValueIsOn(env.BUN_GC_TIMER_DISABLE);
    processStartTuningState.purgeDelayMs = purgeDelayMs;
    processStartTuningState.isCollectionTimerOff = isCollectionTimerOff;
    processStartTuningState.namesSet = namesSet;
  } catch {}
}
//@ chunk-59v9mbtg.js:993-1026 placement
function processStartTuning() {
  return processStartTuningState.namesSet;
}
//@ chunk-59v9mbtg.js:1026-1063 placement
function processStartPurgeDelayMs() {
  return processStartTuningState.purgeDelayMs;
}
//@ chunk-59v9mbtg.js:1063-1108 placement
/**
 * 进程启动调优状态：采集计时器是否关闭。
 */
function processStartCollectionTimerOff() {
  return processStartTuningState.isCollectionTimerOff;
}
export {
  processStartTuning,
  processStartPurgeDelayMs,
  processStartCollectionTimerOff,
  noteProcessStartTuning,
};
