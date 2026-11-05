/**
 * utils/plugins/functionHooks/pluginTimers.ts
 *
 * 2.1.316 新增。插件定时器。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-r1vze92t.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isHeldByPlugin, holdQueuedInput } from "../../../plugins/functionHooks/inputHold.js";
import { runIgnoringAbort } from "../../../plugins/functionHooks/dispatch/dispatchScope.js";
import { toastStoppedOnce } from "../../../plugins/functionHooks/apiCatalog.js";

//@ chunk-r1vze92t.js:271-406 placement
/**
 * 定时任务属于插件且插件定时器当前被挡住（xZ）时：登记在插件就绪后执行，非循环任务还登记重试回调；返回是否被挡住。
 */
function deferIfPluginTimersHeld(entry, run, fallbackRun) {
  let { plugin } = entry;
  let held = plugin !== undefined && isHeldByPlugin();
  if (held) runIgnoringAbort(() => toastStoppedOnce(plugin));
  if (held && !entry.recurring) holdQueuedInput(run, undefined, entry.agentId ? "stays" : fallbackRun);
  return held;
}
//@ chunk-r1vze92t.js:406-851 placement
/**
 * 定时任务执行器的包装工厂：tTr 包装单个任务，被挡住时延后到插件就绪；nTr 按插件分组批量执行，返回已延后的任务 id。
 */
var wrapScheduledTaskRunner = (runOne) => (entry, done) => {
  let doneOnce = () => {
    if (done !== undefined) runIgnoringAbort(done);
  };
  let runIfFree = () => {
    if (deferIfPluginTimersHeld(entry, runIfFree, doneOnce)) return;
    runOne(entry, doneOnce);
  };
  let held = deferIfPluginTimersHeld(entry, runIfFree, doneOnce);
  if (!held) runOne(entry, () => {});
  return held && !entry.recurring;
};
var wrapScheduledTaskBatchRunner = (runBatch) => (entries, done) => {
  let byPlugin = new Map();
  entries.forEach((entry) => {
    byPlugin.set(entry.plugin, [...(byPlugin.get(entry.plugin) ?? []), entry]);
  });
  return [...byPlugin].flatMap(([plugin, group]) => {
    let holder =
      plugin === undefined
        ? {}
        : {
            plugin,
          };
    let finish = () => runIgnoringAbort(() => done(group));
    let runIfFree = () => {
      if (deferIfPluginTimersHeld(holder, runIfFree, finish)) return;
      runBatch(group, plugin, finish);
    };
    let held = deferIfPluginTimersHeld(holder, runIfFree, finish);
    let started = false;
    let groupDone = false;
    if (!held)
      runBatch(group, plugin, () => {
        started = true;
        if (groupDone) finish();
      });
    groupDone = true;
    return held || !started ? group.map((item) => item.id) : [];
  });
};
export { wrapScheduledTaskBatchRunner, wrapScheduledTaskRunner };
