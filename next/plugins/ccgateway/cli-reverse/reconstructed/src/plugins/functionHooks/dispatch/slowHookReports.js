/**
 * plugins/functionHooks/dispatch/slowHookReports.ts
 *
 * 2.1.316 新增。插件函数 hook 慢调用与"未调用 next()"的报告。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4121qate.js (5)
 * attribution: placement 5
 */
import { identity } from "../../../utils/identity.js";
import { matcherLog } from "../../../utils/hooks/functionHookMatchers.js";
import { AntSlowLogger } from "../../../utils/slowOperations.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-4121qate.js:71776-71787 placement
var SLOW_PLUGIN_HOOK_WINDOW_MS = 1e4;
//@ chunk-4121qate.js:71787-71883 placement
function createSlowHookReportMap() {
  return identity(new Map(), (map) => {
    for (let report of map.values()) clearTimeout(report.timer);
    map.clear();
  });
}
//@ chunk-4121qate.js:71883-71895 placement
var slowHookReports_2; // deferred: uses createSlowHookReportMap of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-4121qate.js:71883", () => {
  slowHookReports_2 = createSlowHookReportMap();
});
//@ chunk-4121qate.js:71895-71907 placement
var SLOW_HOOK_REPORT_INTERVAL_MS_2 = 1000;
//@ chunk-4121qate.js:72078-72399 placement
function reportPluginHookWithoutNext(report) {
  let { plugin, tier, event, ms } = report;
  let key = `${event} ${plugin}`;
  let existing = slowHookReports_2.get(key);
  let secondExisting = `${plugin} (${tier}) answered ${event} without next()`;
  if (existing !== undefined) {
    existing.count += 1;
    existing.lastMs = ms;
    return;
  }
  matcherLog().log(`${secondExisting} in ${ms.toFixed(1)}ms; nothing beneath it ran for this dispatch`);
  let timer = setTimeout(AntSlowLogger, SLOW_PLUGIN_HOOK_WINDOW_MS, key, secondExisting);
  timer.unref();
  slowHookReports_2.set(key, {
    count: 0,
    lastMs: ms,
    timer,
  });
}
export {
  SLOW_HOOK_REPORT_INTERVAL_MS_2,
  createSlowHookReportMap,
  reportPluginHookWithoutNext,
  slowHookReports_2,
  SLOW_PLUGIN_HOOK_WINDOW_MS,
};
