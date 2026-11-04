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
import { init_react_production, createContext, useEffect } from "../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { useTheme_2 } from "../components/design-system/ThemeProvider.js";
import { isStorageV5Enabled } from "../utils/hoverRest.js";
import { registerPreExitFlush } from "../utils/cleanupRegistry.js";
import { saveCurrentProjectConfig, saveCurrentProjectConfigSyncForExit } from "../utils/config.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-xe7zq1p4.js:1784-1788 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-xe7zq1p4.js:1784", () => {
  init_react_production();
});
//@ chunk-xe7zq1p4.js:1788-1792 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-xe7zq1p4.js:1788", () => {
  init_react_production();
});
//@ chunk-xe7zq1p4.js:1792-1810 placement
var statsContext; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-xe7zq1p4.js:1792", () => {
  statsContext = createContext(undefined);
});
//@ chunk-xe7zq1p4.js:2004-2128 sole-consumer
/**
 * 已排序数组的线性插值百分位。
 */
function interpolatedPercentile(sorted, percentile) {
  let position = (percentile / 100) * (sorted.length - 1);
  let floored = Math.floor(position);
  let upper = Math.ceil(position);
  if (floored === upper) return sorted[floored];
  return sorted[floored] + (sorted[upper] - sorted[floored]) * (position - floored);
}
//@ chunk-xe7zq1p4.js:2128-2140 affinity
/**
 * 1024：观测值蓄水池采样容量。
 */
var STATS_RESERVOIR_SIZE = 1024;
//@ chunk-xe7zq1p4.js:2140-2903 fingerprint (2.1.88 match: createStatsStore, 1)
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
      let histogram = histograms.get(name);
      if (!histogram) {
        histogram = {
          reservoir: [],
          count: 0,
          sum: 0,
          min: value,
          max: value,
        };
        histograms.set(name, histogram);
      }
      histogram.count++;
      histogram.sum += value;
      if (value < histogram.min) histogram.min = value;
      if (value > histogram.max) histogram.max = value;
      if (histogram.reservoir.length < STATS_RESERVOIR_SIZE) histogram.reservoir.push(value);
      else {
        let j = Math.floor(Math.random() * histogram.count);
        if (j < STATS_RESERVOIR_SIZE) histogram.reservoir[j] = value;
      }
    },
    add(name, value) {
      let setEntry = sets.get(name);
      if (!setEntry) {
        setEntry = new Set();
        sets.set(name, setEntry);
      }
      setEntry.add(value);
    },
    getAll() {
      let result = Object.fromEntries(metrics);
      for (let [name, histogram] of histograms) {
        if (histogram.count === 0) continue;
        result[`${name}_count`] = histogram.count;
        result[`${name}_min`] = histogram.min;
        result[`${name}_max`] = histogram.max;
        result[`${name}_avg`] = histogram.sum / histogram.count;
        let sorted = [...histogram.reservoir].sort((a, b) => a - b);
        result[`${name}_p50`] = interpolatedPercentile(sorted, 50);
        result[`${name}_p95`] = interpolatedPercentile(sorted, 95);
        result[`${name}_p99`] = interpolatedPercentile(sorted, 99);
      }
      for (let [name, setEntry] of sets) result[name] = setEntry.size;
      return result;
    },
  };
}
//@ chunk-xe7zq1p4.js:2903-2919 layout
/**
 * StatsContext：统计存储的 React Context（默认 null）。
 */
var StatsContext; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-xe7zq1p4.js:2903", () => {
  StatsContext = createContext(null);
});
//@ chunk-xe7zq1p4.js:2919-3563 fingerprint (2.1.88 match: StatsProvider, 0.745)
/**
 * 统计 Provider：退出时把 getAll() 写入配置 lastSessionMetrics（V5 存储可用时异步写）。
 */
function StatsProvider(props) {
  let $ = useMemoCache(8);
  let { store: externalStore, children } = props;
  let statsStore;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    statsStore = createStatsStore();
    $[0] = statsStore;
  } else statsStore = $[0];
  let store = externalStore ?? statsStore;
  let { storageV5 } = useTheme_2();
  let providerElement;
  let t3;
  if ($[1] !== storageV5 || $[2] !== store) {
    providerElement = () => {
      let unmounting = false;
      let cleanup =
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
              unmounting = true;
            })
          : undefined;
      let flush = () => {
        if (unmounting) {
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
        cleanup?.();
        process.off("exit", flush);
      };
    };
    t3 = [store, storageV5];
    $[1] = storageV5;
    $[2] = store;
    $[3] = providerElement;
    $[4] = t3;
  } else {
    providerElement = $[3];
    t3 = $[4];
  }
  useEffect(providerElement, t3);
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
