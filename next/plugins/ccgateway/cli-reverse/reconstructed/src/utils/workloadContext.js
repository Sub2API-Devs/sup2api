/**
 * utils/workloadContext.ts
 *
 * AsyncLocalStorage 中的 workload 标签（如 cron）与插件调度来源，用于 User-Agent 与归因。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/workloadContext.ts
 * pieces: chunk-exfmq47h.js (6)
 * attribution: fingerprint 3, layout 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { AsyncLocalStorage } from "async_hooks";
import { withWorkloadStorage } from "./http.js";
import { deferInit, beginDeferredInits } from "../../runtime/deferred-init.js";

// This module is the first evaluated of an import cycle of 3771 modules closed by ./http.js;
// the load-time work of the cycle's statements marked "deferred" waits until the cycle is complete (runtime/deferred-init.js).
beginDeferredInits("src/utils/http.js");
//@ chunk-exfmq47h.js:604647-604672 fingerprint (2.1.88 match: WORKLOAD_CRON, 1)
var WORKLOAD_CRON; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var workloadStorage;
deferInit("chunk-exfmq47h.js:604647", () => {
  WORKLOAD_CRON = "cron";
  workloadStorage = new AsyncLocalStorage();
});
//@ chunk-exfmq47h.js:604672-604718 fingerprint (2.1.88 match: getWorkload, 1)
/**
 * 当前异步上下文的 workload 标签（如 cron），写进 User-Agent。
 */
function getWorkload() {
  return workloadStorage.getStore()?.workload;
}
//@ chunk-exfmq47h.js:604718-604773 layout
function getScheduledByPlugin() {
  return workloadStorage.getStore()?.scheduledByPlugin;
}
//@ chunk-exfmq47h.js:604773-604858 layout
function getHookCallerOrScheduler(context) {
  return context?.hookCaller !== undefined && !context.hookServesModel
    ? context.hookCaller
    : getScheduledByPlugin();
}
//@ chunk-exfmq47h.js:604858-604934 layout
function clearScheduledByPlugin() {
  let store = workloadStorage.getStore();
  if (store !== undefined) store.scheduledByPlugin = undefined;
}
//@ chunk-exfmq47h.js:604934-605004 fingerprint (2.1.88 match: runWithWorkload, 0.545)
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
  WORKLOAD_CRON,
  runWithWorkload,
  clearScheduledByPlugin,
  workloadStorage,
  getWorkload,
  getHookCallerOrScheduler,
  getScheduledByPlugin,
};
