/**
 * utils/workloadContext.ts
 *
 * AsyncLocalStorage 中的 workload 标签（如 cron）与插件调度来源，用于 User-Agent 与归因。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/workloadContext.ts
 * pieces: chunk-aepeg2w5.js (6)
 * attribution: fingerprint 3, layout 3
 */
import { AsyncLocalStorage } from "async_hooks";
import { withWorkloadStorage } from "./http.js";

//@ chunk-aepeg2w5.js:592165-592190 fingerprint = WORKLOAD_CRON (1)
var WORKLOAD_CRON = "cron";
var workloadStorage = new AsyncLocalStorage();
//@ chunk-aepeg2w5.js:592190-592236 fingerprint = getWorkload (1)
/**
 * 当前异步上下文的 workload 标签（如 cron），写进 User-Agent。
 */
function getWorkload() {
  return workloadStorage.getStore()?.workload;
}
//@ chunk-aepeg2w5.js:592236-592291 layout
function getScheduledByPlugin() {
  return workloadStorage.getStore()?.scheduledByPlugin;
}
//@ chunk-aepeg2w5.js:592291-592376 layout
function getHookCallerOrScheduler(e) {
  return e?.hookCaller !== undefined && !e.hookServesModel ? e.hookCaller : getScheduledByPlugin();
}
//@ chunk-aepeg2w5.js:592376-592452 layout
function clearScheduledByPlugin() {
  let e = workloadStorage.getStore();
  if (e !== undefined) e.scheduledByPlugin = undefined;
}
//@ chunk-aepeg2w5.js:592452-592522 fingerprint = runWithWorkload (0.544)
/**
 * 在 AsyncLocalStorage 中以给定 workload 运行函数。
 */
function runWithWorkload(workload, fn) {
  return withWorkloadStorage(
    {
      workload,
      scheduledByPlugin: undefined,
    },
    fn,
  );
}
export {
  clearScheduledByPlugin,
  WORKLOAD_CRON,
  getWorkload,
  getHookCallerOrScheduler,
  workloadStorage,
  getScheduledByPlugin,
  runWithWorkload,
};
