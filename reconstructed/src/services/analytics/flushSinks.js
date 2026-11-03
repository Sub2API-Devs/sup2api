/**
 * services/analytics/flushSinks.ts
 *
 * 2.1.316 新增。退出前刷新遥测汇（含注册的预刷新任务）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-c13g0cfa.js (5)
 * attribution: placement 5
 */
import { sleep } from "../../utils/sleep.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { onProcessRootHost } from "../../bootstrap/state.js";

/**
 * 退出前刷新遥测汇（含注册的预刷新任务）。
 */
//@ chunk-c13g0cfa.js:297-711 placement
async function flushAnalyticsSinks() {
  try {
    let s = t();
    if (s.length > 0) (await Promise.race([Promise.allSettled(s), sleep(200)]), (s.length = 0));
    let [
        { settle1PEventLoggingBeforeExit: e, shutdown1PEventLogging: r },
        { shutdownDatadog: n },
        { shutdownErrorTracking: a },
      ] = await Promise.all([
        import("./chunk-3x77zjqp.js"),
        import("./chunk-195bxx7h.js"),
        import("./chunk-vpst3pmt.js"),
      ]),
      i = e(),
      c = [r(), n(), a()];
    (await Promise.race([Promise.all(c), sleep(500)]), await i);
  } catch {}
}
//@ chunk-c13g0cfa.js:711-728 placement
class o {
  tasks = [];
}
//@ chunk-c13g0cfa.js:728-751 placement
var u = new HostScoped(() => new o());
//@ chunk-c13g0cfa.js:751-783 placement
function t() {
  return onProcessRootHost(u).tasks;
}
//@ chunk-c13g0cfa.js:783-825 placement
function registerPreFlushTask(s) {
  t().push(s.catch(() => {}));
}

export { flushAnalyticsSinks, registerPreFlushTask };
