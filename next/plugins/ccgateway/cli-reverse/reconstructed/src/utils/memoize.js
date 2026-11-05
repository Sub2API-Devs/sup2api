/**
 * utils/memoize.ts
 *
 * memoizeWithTTL（过期后台刷新）与 memoizeWithLRU
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/memoize.ts
 * pieces: chunk-yneawn9n.js (7)
 * attribution: fingerprint 1, layout 1, placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { jsonStringify } from "./slowOperations.js";
import { logForDebugging } from "./debug.js";
import { LRUCache } from "../../vendor/lru-cache/dist/esm/index.min.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-yneawn9n.js:264-1079 fingerprint (2.1.88 match: memoizeWithTTL, 0.683)
/**
 * 带 TTL 的 memoize：过期后返回旧值并后台刷新。
 */
function memoizeWithTTL(fn, ttl = 300000, shouldRefresh) {
  let lifetimeFor = (value) => (typeof ttl === "function" ? ttl(value) : ttl);
  let cache = new Map();
  let inFlight = new Map();
  let memoized = async (...args) => {
    let key = jsonStringify(args);
    let cached = cache.get(key);
    if (cached && shouldRefresh && !shouldRefresh(cached.value, cached.timestamp)) {
      if (cached.refreshPromise) return cached.refreshPromise;
      cache.delete(key);
      cached = undefined;
    }
    let now = Date.now();
    if (!cached) {
      let pending = inFlight.get(key);
      if (pending) return pending;
      let value = fn(...args);
      inFlight.set(key, value);
      try {
        let resolvedValue = await value;
        if (inFlight.get(key) === value)
          cache.set(key, {
            value: resolvedValue,
            timestamp: Date.now(),
            refreshing: false,
            lifetimeMs: lifetimeFor(resolvedValue),
          });
        return resolvedValue;
      } finally {
        if (inFlight.get(key) === value) inFlight.delete(key);
      }
    }
    if (cached && now - cached.timestamp > cached.lifetimeMs && !cached.refreshing) {
      cached.refreshing = true;
      let staleEntry = cached;
      let newValue = fn(...args);
      staleEntry.refreshPromise = newValue;
      newValue
        .then((nextValue) => {
          if (cache.get(key) === staleEntry)
            cache.set(key, {
              value: nextValue,
              timestamp: Date.now(),
              refreshing: false,
              lifetimeMs: lifetimeFor(nextValue),
            });
        })
        .catch((e) => {
          logForDebugging(String(e), {
            level: "error",
          });
          if (cache.get(key) === staleEntry) cache.delete(key);
        });
      return cached.value;
    }
    return cache.get(key).value;
  };
  memoized.cache = {
    clear: () => {
      cache.clear();
      inFlight.clear();
    },
  };
  return memoized;
}
//@ chunk-yneawn9n.js:1079-1361 layout (2.1.88 match: memoizeWithLRU, 1)
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
    set: (key, value) => void cache.set(key, value),
  };
  return memoized;
}
//@ chunk-yneawn9n.js:1361-1375 placement
/**
 * 需要保留键的缓存集合（清理时不清这些）。
 */
var retainedCacheKeys; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-yneawn9n.js:1361", () => {
  retainedCacheKeys = new Set();
});
//@ chunk-yneawn9n.js:1375-1408 placement
/**
 * 把对象登记为"保留键"缓存并返回它。
 */
function retainCacheKey(key) {
  retainedCacheKeys.add(key);
  return key;
}
//@ chunk-yneawn9n.js:1408-1532 placement
/**
 * 清空 Map 缓存，但保留指定键的条目。
 */
function retainCacheKeys(cache, keepKeys) {
  let keptEntries = [];
  for (let key of keepKeys) {
    let value = cache.get(key);
    if (value !== undefined) keptEntries.push([key, value]);
  }
  cache.clear();
  for (let [key, value] of keptEntries) cache.set(key, value);
}
//@ chunk-yneawn9n.js:1532-1542 placement
/**
 * LRU 缓存默认容量。
 */
var DEFAULT_LRU_MAX_SIZE = 128;
//@ chunk-yneawn9n.js:1542-1805 placement
function memoizeWithTTLAsync(fn, keyFn, options) {
  let maxSize = options?.maxSize ?? DEFAULT_LRU_MAX_SIZE;
  let cache = new Map();
  retainedCacheKeys.add(cache);
  function memoized(...args) {
    let key = keyFn ? keyFn(...args) : args[0];
    let cached = cache.get(key);
    if (cached) return cached;
    let promise = fn(...args);
    if (cache.size >= maxSize) cache.delete(cache.keys().next().value);
    cache.set(key, promise);
    promise.catch(() => {
      if (cache.get(key) === promise) cache.delete(key);
    });
    return promise;
  }
  memoized.cache = cache;
  return memoized;
}
export { retainCacheKeys, memoizeWithLRU, memoizeWithTTL, retainCacheKey, memoizeWithTTLAsync };
