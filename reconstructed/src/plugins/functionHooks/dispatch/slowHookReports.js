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
import { ge } from "../../../utils/identity.js";
import { pd } from "../../../utils/hooks/functionHookMatchers.js";
import { AntSlowLogger } from "../../../utils/slowOperations.js";

//@ chunk-4121qate.js:71776-71787 placement
var SLOW_PLUGIN_HOOK_WINDOW_MS = 1e4;
//@ chunk-4121qate.js:71787-71883 placement
function createSlowHookReportMap() {
  return ge(new Map(), (e) => {
    for (let o of e.values()) clearTimeout(o.timer);
    e.clear();
  });
}
//@ chunk-4121qate.js:71883-71895 placement
var slowHookReports = createSlowHookReportMap();
//@ chunk-4121qate.js:71895-71907 placement
var SLOW_HOOK_REPORT_INTERVAL_MS = 1000;
//@ chunk-4121qate.js:72078-72399 placement
function reportPluginHookWithoutNext(e) {
  let { plugin: plugin, tier: tier, event: event, ms: ms } = e,
    i = `${event} ${plugin}`,
    p = slowHookReports.get(i),
    f = `${plugin} (${tier}) answered ${event} without next()`;
  if (p !== void 0) {
    ((p.count += 1), (p.lastMs = ms));
    return;
  }
  pd().log(`${f} in ${ms.toFixed(1)}ms; nothing beneath it ran for this dispatch`);
  let a = setTimeout(AntSlowLogger, SLOW_PLUGIN_HOOK_WINDOW_MS, i, f);
  (a.unref(), slowHookReports.set(i, { count: 0, lastMs: ms, timer: a }));
}

export {
  SLOW_HOOK_REPORT_INTERVAL_MS,
  createSlowHookReportMap,
  reportPluginHookWithoutNext,
  slowHookReports,
  SLOW_PLUGIN_HOOK_WINDOW_MS,
};
