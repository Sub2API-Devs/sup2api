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
import { xZ, holdQueuedInput } from "../../../plugins/functionHooks/inputHold.js";
import { Km } from "../../../plugins/functionHooks/dispatch/dispatchScope.js";
import { toastStoppedOnce } from "../../../plugins/functionHooks/apiCatalog.js";

/**
 * 定时任务属于插件且插件定时器当前被挡住（xZ）时：登记在插件就绪后执行，非循环任务还登记重试回调；返回是否被挡住。
 */
//@ chunk-1z9pe0vy.js:270-404 placement
function deferIfPluginTimersHeld(i, r, d) {
  let { plugin: plugin } = i,
    e = plugin !== void 0 && xZ();
  if (e) Km(() => toastStoppedOnce(plugin));
  if (e && !i.recurring) holdQueuedInput(r, void 0, i.agentId ? "stays" : d);
  return e;
}
/**
 * 定时任务执行器的包装工厂：tTr 包装单个任务，被挡住时延后到插件就绪；nTr 按插件分组批量执行，返回已延后的任务 id。
 */
//@ chunk-1z9pe0vy.js:404-849 placement
var wrapScheduledTaskRunner = (i) => (r, d) => {
    let n = () => {
        if (d !== void 0) Km(d);
      },
      e = () => {
        if (deferIfPluginTimersHeld(r, e, n)) return;
        i(r, n);
      },
      o = deferIfPluginTimersHeld(r, e, n);
    if (!o) i(r, () => {});
    return o && !r.recurring;
  },
  wrapScheduledTaskBatchRunner = (i) => (r, d) => {
    let n = new Map();
    return (
      r.forEach((e) => {
        n.set(e.plugin, [...(n.get(e.plugin) ?? []), e]);
      }),
      [...n].flatMap(([e, o]) => {
        let l = e === void 0 ? {} : { plugin: e },
          t = () => Km(() => d(o)),
          u = () => {
            if (deferIfPluginTimersHeld(l, u, t)) return;
            i(o, e, t);
          },
          a = deferIfPluginTimersHeld(l, u, t),
          f = !1,
          g = !1;
        if (!a)
          i(o, e, () => {
            if (((f = !0), g)) t();
          });
        return ((g = !0), a || !f ? o.map((c) => c.id) : []);
      })
    );
  };

export { wrapScheduledTaskBatchRunner, wrapScheduledTaskRunner };
