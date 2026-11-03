/**
 * utils/plugins/functionHooks/pluginTimers.ts
 *
 * 2.1.316 新增。插件定时器。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1z9pe0vy.js (2)
 * attribution: placement 2
 */
import { isHeldByPlugin, holdQueuedInput } from "../../../plugins/functionHooks/inputHold.js";
import { runIgnoringAbort } from "../../../plugins/functionHooks/dispatch/dispatchScope.js";
import { toastStoppedOnce } from "../../../plugins/functionHooks/apiCatalog.js";

//@ chunk-1z9pe0vy.js:270-404 placement
/**
 * 定时任务属于插件且插件定时器当前被挡住（xZ）时：登记在插件就绪后执行，非循环任务还登记重试回调；返回是否被挡住。
 */
function deferIfPluginTimersHeld(i, r, d) {
  let { plugin } = i;
  let e = plugin !== undefined && isHeldByPlugin();
  if (e) runIgnoringAbort(() => toastStoppedOnce(plugin));
  if (e && !i.recurring) holdQueuedInput(r, undefined, i.agentId ? "stays" : d);
  return e;
}
//@ chunk-1z9pe0vy.js:404-849 placement
/**
 * 定时任务执行器的包装工厂：tTr 包装单个任务，被挡住时延后到插件就绪；nTr 按插件分组批量执行，返回已延后的任务 id。
 */
var wrapScheduledTaskRunner = (i) => (r, d) => {
  let n = () => {
    if (d !== undefined) runIgnoringAbort(d);
  };
  let e = () => {
    if (deferIfPluginTimersHeld(r, e, n)) return;
    i(r, n);
  };
  let o = deferIfPluginTimersHeld(r, e, n);
  if (!o) i(r, () => {});
  return o && !r.recurring;
};
var wrapScheduledTaskBatchRunner = (i) => (r, d) => {
  let n = new Map();
  r.forEach((e) => {
    n.set(e.plugin, [...(n.get(e.plugin) ?? []), e]);
  });
  return [...n].flatMap(([e, o]) => {
    let l =
      e === undefined
        ? {}
        : {
            plugin: e,
          };
    let t = () => runIgnoringAbort(() => d(o));
    let u = () => {
      if (deferIfPluginTimersHeld(l, u, t)) return;
      i(o, e, t);
    };
    let a = deferIfPluginTimersHeld(l, u, t);
    let f = false;
    let g = false;
    if (!a)
      i(o, e, () => {
        f = true;
        if (g) t();
      });
    g = true;
    return a || !f ? o.map((c) => c.id) : [];
  });
};
export { wrapScheduledTaskBatchRunner, wrapScheduledTaskRunner };
