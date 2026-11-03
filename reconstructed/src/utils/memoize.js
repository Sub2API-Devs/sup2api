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
import { LRUCache } from "../../vendor/lru-cache/dist/esm/index.min.js";

//@ chunk-02nm3ce0.js:17038-17853 fingerprint = memoizeWithTTL (0.683)
/**
 * 带 TTL 的 memoize：过期后返回旧值并后台刷新。
 */
function memoizeWithTTL(e, i = 300000, s) {
  let n = (o) => (typeof i === "function" ? i(o) : i);
  let cache = new Map();
  let h = new Map();
  let memoized = async (...args) => {
    let key = jsonStringify(args);
    let cached = cache.get(key);
    if (cached && s && !s(cached.value, cached.timestamp)) {
      if (cached.refreshPromise) return cached.refreshPromise;
      cache.delete(key);
      cached = undefined;
    }
    let now = Date.now();
    if (!cached) {
      let g = h.get(key);
      if (g) return g;
      let value = e(...args);
      h.set(key, value);
      try {
        let w = await value;
        if (h.get(key) === value)
          cache.set(key, {
            value: w,
            timestamp: Date.now(),
            refreshing: false,
            lifetimeMs: n(w),
          });
        return w;
      } finally {
        if (h.get(key) === value) h.delete(key);
      }
    }
    if (cached && now - cached.timestamp > cached.lifetimeMs && !cached.refreshing) {
      cached.refreshing = true;
      let g = cached;
      let newValue = e(...args);
      g.refreshPromise = newValue;
      newValue
        .then((w) => {
          if (cache.get(key) === g)
            cache.set(key, {
              value: w,
              timestamp: Date.now(),
              refreshing: false,
              lifetimeMs: n(w),
            });
        })
        .catch((e) => {
          logForDebugging(String(e), {
            level: "error",
          });
          if (cache.get(key) === g) cache.delete(key);
        });
      return cached.value;
    }
    return cache.get(key).value;
  };
  memoized.cache = {
    clear: () => {
      cache.clear();
      h.clear();
    },
  };
  return memoized;
}
//@ chunk-02nm3ce0.js:17853-18135 fingerprint = memoizeWithLRU (1)
/**
 * 带 LRU 容量上限的 memoize。
 */
function memoizeWithLRU(f, cacheFn, maxCacheSize = 100) {
  let cache = new LRUCache({
    max: maxCacheSize,
  });
  let memoized = (...args) => {
    let key = cacheFn(...args);
    let cached = cache.get(key);
    if (cached !== undefined) return cached;
    let result = f(...args);
    cache.set(key, result);
    return result;
  };
  memoized.cache = {
    clear: () => cache.clear(),
    size: () => cache.size,
    delete: (key) => cache.delete(key),
    get: (key) => cache.peek(key),
    has: (key) => cache.has(key),
    set: (h, l) => void cache.set(h, l),
  };
  return memoized;
}
//@ chunk-02nm3ce0.js:18135-18149 placement
/**
 * 需要保留键的缓存集合（清理时不清这些）。
 */
var retainedCacheKeys = new Set();
//@ chunk-02nm3ce0.js:18149-18182 placement
/**
 * 把对象登记为"保留键"缓存并返回它。
 */
function retainCacheKey(e) {
  retainedCacheKeys.add(e);
  return e;
}
//@ chunk-02nm3ce0.js:18182-18306 placement
/**
 * 清空 Map 缓存，但保留指定键的条目。
 */
function retainCacheKeys(e, i) {
  let s = [];
  for (let n of i) {
    let r = e.get(n);
    if (r !== undefined) s.push([n, r]);
  }
  e.clear();
  for (let [n, r] of s) e.set(n, r);
}
//@ chunk-02nm3ce0.js:18306-18316 placement
/**
 * LRU 缓存默认容量。
 */
var DEFAULT_LRU_MAX_SIZE = 128;
//@ chunk-02nm3ce0.js:18316-18579 placement
function memoizeWithTTLAsync(e, i, s) {
  let maxSize = s?.maxSize ?? DEFAULT_LRU_MAX_SIZE;
  let cache = new Map();
  retainedCacheKeys.add(cache);
  function h(...l) {
    let o = i ? i(...l) : l[0];
    let cached = cache.get(o);
    if (cached) return cached;
    let promise = e(...l);
    if (cache.size >= maxSize) cache.delete(cache.keys().next().value);
    cache.set(o, promise);
    promise.catch(() => {
      if (cache.get(o) === promise) cache.delete(o);
    });
    return promise;
  }
  h.cache = cache;
  return h;
}
export {
  retainedCacheKeys,
  DEFAULT_LRU_MAX_SIZE,
  memoizeWithLRU,
  memoizeWithTTL,
  retainCacheKeys,
  memoizeWithTTLAsync,
  retainCacheKey,
};
