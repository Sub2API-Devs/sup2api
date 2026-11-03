/**
 * utils/memoize.ts
 *
 * memoizeWithTTL（过期后台刷新）与 memoizeWithLRU
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/memoize.ts
 * pieces: chunk-02nm3ce0.js (7)
 * attribution: fingerprint 2, placement 5
 */
import { jsonStringify } from "./slowOperations.js";
import { logForDebugging } from "./debug.js";
import { Dc } from "../../vendor/lru-cache/dist/esm/index.min.js";

/**
 * 带 TTL 的 memoize：过期后返回旧值并后台刷新。
 */
//@ chunk-02nm3ce0.js:17038-17853 fingerprint = memoizeWithTTL (0.683)
function memoizeWithTTL(e, i = 300000, s) {
  let n = (o) => (typeof i === "function" ? i(o) : i),
    cache = new Map(),
    h = new Map(),
    memoized = async (...o) => {
      let key = jsonStringify(o),
        cached = cache.get(key);
      if (cached && s && !s(cached.value, cached.timestamp)) {
        if (cached.refreshPromise) return cached.refreshPromise;
        (cache.delete(key), (cached = void 0));
      }
      let now = Date.now();
      if (!cached) {
        let g = h.get(key);
        if (g) return g;
        let value = e(...o);
        h.set(key, value);
        try {
          let w = await value;
          if (h.get(key) === value)
            cache.set(key, { value: w, timestamp: Date.now(), refreshing: !1, lifetimeMs: n(w) });
          return w;
        } finally {
          if (h.get(key) === value) h.delete(key);
        }
      }
      if (cached && now - cached.timestamp > cached.lifetimeMs && !cached.refreshing) {
        cached.refreshing = !0;
        let g = cached,
          newValue = e(...o);
        return (
          (g.refreshPromise = newValue),
          newValue
            .then((w) => {
              if (cache.get(key) === g)
                cache.set(key, { value: w, timestamp: Date.now(), refreshing: !1, lifetimeMs: n(w) });
            })
            .catch((w) => {
              if ((logForDebugging(String(w), { level: "error" }), cache.get(key) === g)) cache.delete(key);
            }),
          cached.value
        );
      }
      return cache.get(key).value;
    };
  return (
    (memoized.cache = {
      clear: () => {
        (cache.clear(), h.clear());
      },
    }),
    memoized
  );
}
/**
 * 带 LRU 容量上限的 memoize。
 */
//@ chunk-02nm3ce0.js:17853-18135 fingerprint = memoizeWithLRU (1)
function memoizeWithLRU(f, cacheFn, maxCacheSize = 100) {
  let cache = new Dc({ max: maxCacheSize }),
    memoized = (...h) => {
      let key = cacheFn(...h),
        cached = cache.get(key);
      if (cached !== void 0) return cached;
      let result = f(...h);
      return (cache.set(key, result), result);
    };
  return (
    (memoized.cache = {
      clear: () => cache.clear(),
      size: () => cache.size,
      delete: (key) => cache.delete(key),
      get: (key) => cache.peek(key),
      has: (key) => cache.has(key),
      set: (h, l) => void cache.set(h, l),
    }),
    memoized
  );
}
//@ chunk-02nm3ce0.js:18135-18149 placement
var P = new Set();
//@ chunk-02nm3ce0.js:18149-18182 placement
function aV(e) {
  return (P.add(e), e);
}
/**
 * 清空 Map 缓存，但保留指定键的条目。
 */
//@ chunk-02nm3ce0.js:18182-18306 placement
function retainCacheKeys(e, i) {
  let s = [];
  for (let n of i) {
    let r = e.get(n);
    if (r !== void 0) s.push([n, r]);
  }
  e.clear();
  for (let [n, r] of s) e.set(n, r);
}
//@ chunk-02nm3ce0.js:18306-18316 placement
var G = 128;
//@ chunk-02nm3ce0.js:18316-18579 placement
function memoizeWithTTLAsync(e, i, s) {
  let n = s?.maxSize ?? G,
    cache = new Map();
  P.add(cache);
  function h(...l) {
    let o = i ? i(...l) : l[0],
      cached = cache.get(o);
    if (cached) return cached;
    let promise = e(...l);
    if (cache.size >= n) cache.delete(cache.keys().next().value);
    return (
      cache.set(o, promise),
      promise.catch(() => {
        if (cache.get(o) === promise) cache.delete(o);
      }),
      promise
    );
  }
  return ((h.cache = cache), h);
}

export { P, G, memoizeWithLRU, memoizeWithTTL, retainCacheKeys, memoizeWithTTLAsync, aV };
