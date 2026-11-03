/**
 * context/stats.tsx
 *
 * 会话统计存储与 Provider（计数、观测分布、集合），退出时写入 lastSessionMetrics；混入一个在途计数器与图布局辅助。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/context/stats.tsx
 * pieces: chunk-xe7zq1p4.js (8)
 * attribution: placement 3, affinity 2, fingerprint 2, layout 1
 */
import { j, qt, P } from "../../vendor/react/cjs/react.production.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { Me } from "../components/design-system/ThemeProvider.js";
import { isStorageV5Enabled } from "../utils/hoverRest.js";
import { registerPreExitFlush } from "../utils/cleanupRegistry.js";
import { saveCurrentProjectConfig, saveCurrentProjectConfigSyncForExit } from "../utils/config.js";
import { e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";

//@ chunk-xe7zq1p4.js:1784-1788 placement
j();
//@ chunk-xe7zq1p4.js:1788-1792 placement
j();
//@ chunk-xe7zq1p4.js:1792-1810 placement
var ie = qt(void 0);
/**
 * 已排序数组的线性插值百分位。
 */
//@ chunk-xe7zq1p4.js:2004-2128 affinity
function interpolatedPercentile(n, r) {
  let i = (r / 100) * (n.length - 1),
    floored = Math.floor(i),
    ceil = Math.ceil(i);
  if (floored === ceil) return n[floored];
  return n[floored] + (n[ceil] - n[floored]) * (i - floored);
}
/**
 * 1024：观测值蓄水池采样容量。
 */
//@ chunk-xe7zq1p4.js:2128-2140 affinity
var STATS_RESERVOIR_SIZE = 1024;
/**
 * 会话统计存储：increment/set 计数、observe 数值（蓄水池采样，输出 count/min/max/avg/p50/p95/p99）、add 集合；getAll 汇总。
 */
//@ chunk-xe7zq1p4.js:2140-2903 fingerprint = createStatsStore (1)
function createStatsStore() {
  let metrics = new Map(),
    histograms = new Map(),
    sets = new Map();
  return {
    increment(o, a = 1) {
      metrics.set(o, (metrics.get(o) ?? 0) + a);
    },
    set(o, a) {
      metrics.set(o, a);
    },
    observe(o, a) {
      let c = histograms.get(o);
      if (!c) ((c = { reservoir: [], count: 0, sum: 0, min: a, max: a }), histograms.set(o, c));
      if ((c.count++, (c.sum += a), a < c.min)) c.min = a;
      if (a > c.max) c.max = a;
      if (c.reservoir.length < STATS_RESERVOIR_SIZE) c.reservoir.push(a);
      else {
        let floored = Math.floor(Math.random() * c.count);
        if (floored < STATS_RESERVOIR_SIZE) c.reservoir[floored] = a;
      }
    },
    add(o, a) {
      let c = sets.get(o);
      if (!c) ((c = new Set()), sets.set(o, c));
      c.add(a);
    },
    getAll() {
      let result = Object.fromEntries(metrics);
      for (let [a, c] of histograms) {
        if (c.count === 0) continue;
        ((result[`${a}_count`] = c.count),
          (result[`${a}_min`] = c.min),
          (result[`${a}_max`] = c.max),
          (result[`${a}_avg`] = c.sum / c.count));
        let sorted = [...c.reservoir].sort((M, T) => M - T);
        ((result[`${a}_p50`] = interpolatedPercentile(sorted, 50)),
          (result[`${a}_p95`] = interpolatedPercentile(sorted, 95)),
          (result[`${a}_p99`] = interpolatedPercentile(sorted, 99)));
      }
      for (let [a, c] of sets) result[a] = c.size;
      return result;
    },
  };
}
/**
 * StatsContext：统计存储的 React Context（默认 null）。
 */
//@ chunk-xe7zq1p4.js:2903-2919 layout
var StatsContext = qt(null);
/**
 * 统计 Provider：退出时把 getAll() 写入配置 lastSessionMetrics（V5 存储可用时异步写）。
 */
//@ chunk-xe7zq1p4.js:2919-3563 fingerprint = StatsProvider (0.745)
function StatsProvider(t0) {
  let o = w(8),
    { store: externalStore, children: children } = t0,
    a;
  if (o[0] === MEMO_CACHE_SENTINEL) ((a = createStatsStore()), (o[0] = a));
  else a = o[0];
  let store = externalStore ?? a,
    { storageV5: storageV5 } = Me(),
    T,
    W;
  if (o[1] !== storageV5 || o[2] !== store)
    ((T = () => {
      let u = !1;
      let U =
        isStorageV5Enabled() && storageV5 !== void 0
          ? registerPreExitFlush(async () => {
              let all = store.getAll();
              if (Object.keys(all).length > 0)
                await saveCurrentProjectConfig((p) => ({ ...p, lastSessionMetrics: all }), storageV5);
              u = !0;
            })
          : void 0;
      let flush = () => {
        if (u) {
          return;
        }
        let metrics = store.getAll();
        if (Object.keys(metrics).length > 0)
          saveCurrentProjectConfigSyncForExit((current) => ({ ...current, lastSessionMetrics: metrics }));
      };
      return (
        process.on("exit", flush),
        () => {
          (U?.(), process.off("exit", flush));
        }
      );
    }),
      (W = [store, storageV5]),
      (o[1] = storageV5),
      (o[2] = store),
      (o[3] = T),
      (o[4] = W));
  else ((T = o[3]), (W = o[4]));
  P(T, W);
  let N;
  if (o[5] !== children || o[6] !== store)
    ((N = e(StatsContext.Provider, { value: store, children: children })),
      (o[5] = children),
      (o[6] = store),
      (o[7] = N));
  else N = o[7];
  return N;
}

export { createStatsStore, ie, StatsProvider };
