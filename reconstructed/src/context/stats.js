/**
 * context/stats.tsx
 *
 * 会话统计存储与 Provider（计数、观测分布、集合），退出时写入 lastSessionMetrics；混入一个在途计数器与图布局辅助。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/context/stats.tsx
 * pieces: chunk-xe7zq1p4.js (8)
 * attribution: placement 3, sole-consumer 1, affinity 1, fingerprint 2, layout 1
 */
import { init_react_production, qt, P } from "../../vendor/react/cjs/react.production.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { useTheme_2 } from "../components/design-system/ThemeProvider.js";
import { isStorageV5Enabled } from "../utils/hoverRest.js";
import { registerPreExitFlush } from "../utils/cleanupRegistry.js";
import { saveCurrentProjectConfig, saveCurrentProjectConfigSyncForExit } from "../utils/config.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";

//@ chunk-xe7zq1p4.js:1784-1788 placement
init_react_production();
//@ chunk-xe7zq1p4.js:1788-1792 placement
init_react_production();
//@ chunk-xe7zq1p4.js:1792-1810 placement
var statsContext = qt(undefined);
//@ chunk-xe7zq1p4.js:2004-2128 sole-consumer
/**
 * 已排序数组的线性插值百分位。
 */
function interpolatedPercentile(sorted, r) {
  let i = (r / 100) * (sorted.length - 1);
  let floored = Math.floor(i);
  let a = Math.ceil(i);
  if (floored === a) return sorted[floored];
  return sorted[floored] + (sorted[a] - sorted[floored]) * (i - floored);
}
//@ chunk-xe7zq1p4.js:2128-2140 affinity
/**
 * 1024：观测值蓄水池采样容量。
 */
var STATS_RESERVOIR_SIZE = 1024;
//@ chunk-xe7zq1p4.js:2140-2903 fingerprint = createStatsStore (1)
/**
 * 会话统计存储：increment/set 计数、observe 数值（蓄水池采样，输出 count/min/max/avg/p50/p95/p99）、add 集合；getAll 汇总。
 */
function createStatsStore() {
  let metrics = new Map();
  let histograms = new Map();
  let sets = new Map();
  return {
    increment(name, value = 1) {
      metrics.set(name, (metrics.get(name) ?? 0) + value);
    },
    set(name, value) {
      metrics.set(name, value);
    },
    observe(name, value) {
      let c = histograms.get(name);
      if (!c) {
        c = {
          reservoir: [],
          count: 0,
          sum: 0,
          min: value,
          max: value,
        };
        histograms.set(name, c);
      }
      c.count++;
      c.sum += value;
      if (value < c.min) c.min = value;
      if (value > c.max) c.max = value;
      if (c.reservoir.length < STATS_RESERVOIR_SIZE) c.reservoir.push(value);
      else {
        let j = Math.floor(Math.random() * c.count);
        if (j < STATS_RESERVOIR_SIZE) c.reservoir[j] = value;
      }
    },
    add(name, value) {
      let c = sets.get(name);
      if (!c) {
        c = new Set();
        sets.set(name, c);
      }
      c.add(value);
    },
    getAll() {
      let result = Object.fromEntries(metrics);
      for (let [name, c] of histograms) {
        if (c.count === 0) continue;
        result[`${name}_count`] = c.count;
        result[`${name}_min`] = c.min;
        result[`${name}_max`] = c.max;
        result[`${name}_avg`] = c.sum / c.count;
        let sorted = [...c.reservoir].sort((M, T) => M - T);
        result[`${name}_p50`] = interpolatedPercentile(sorted, 50);
        result[`${name}_p95`] = interpolatedPercentile(sorted, 95);
        result[`${name}_p99`] = interpolatedPercentile(sorted, 99);
      }
      for (let [name, c] of sets) result[name] = c.size;
      return result;
    },
  };
}
//@ chunk-xe7zq1p4.js:2903-2919 layout
/**
 * StatsContext：统计存储的 React Context（默认 null）。
 */
var StatsContext = qt(null);
//@ chunk-xe7zq1p4.js:2919-3563 fingerprint = StatsProvider (0.745)
/**
 * 统计 Provider：退出时把 getAll() 写入配置 lastSessionMetrics（V5 存储可用时异步写）。
 */
function StatsProvider(props) {
  let $ = w(8);
  let { store: externalStore, children } = props;
  let a;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    a = createStatsStore();
    $[0] = a;
  } else a = $[0];
  let store = externalStore ?? a;
  let { storageV5 } = useTheme_2();
  let T;
  let t3;
  if ($[1] !== storageV5 || $[2] !== store) {
    T = () => {
      let u = false;
      let U =
        isStorageV5Enabled() && storageV5 !== undefined
          ? registerPreExitFlush(async () => {
              let metrics = store.getAll();
              if (Object.keys(metrics).length > 0)
                await saveCurrentProjectConfig(
                  (current) => ({
                    ...current,
                    lastSessionMetrics: metrics,
                  }),
                  storageV5,
                );
              u = true;
            })
          : undefined;
      let flush = () => {
        if (u) {
          return;
        }
        let metrics = store.getAll();
        if (Object.keys(metrics).length > 0)
          saveCurrentProjectConfigSyncForExit((current) => ({
            ...current,
            lastSessionMetrics: metrics,
          }));
      };
      process.on("exit", flush);
      return () => {
        U?.();
        process.off("exit", flush);
      };
    };
    t3 = [store, storageV5];
    $[1] = storageV5;
    $[2] = store;
    $[3] = T;
    $[4] = t3;
  } else {
    T = $[3];
    t3 = $[4];
  }
  P(T, t3);
  let t4;
  if ($[5] !== children || $[6] !== store) {
    t4 = jsxProd_default(StatsContext.Provider, {
      value: store,
      children,
    });
    $[5] = children;
    $[6] = store;
    $[7] = t4;
  } else t4 = $[7];
  return t4;
}
export { statsContext, createStatsStore, StatsProvider };
