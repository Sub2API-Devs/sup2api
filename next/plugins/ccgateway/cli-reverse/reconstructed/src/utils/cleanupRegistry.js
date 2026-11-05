/**
 * utils/cleanupRegistry.ts
 *
 * 旧版已有同名文件，2.1.316 有扩充：清理函数注册表（注册、按序执行）；注册退出前刷新函数（可指定最长等待）等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/cleanupRegistry.ts
 * pieces: chunk-6hadbefe.js (16)
 * attribution: placement 16
 */
import { logForDebugging } from "./debug.js";
import { HostScoped } from "./hostScoped.js";
import { onProcessRootHost } from "../bootstrap/state.js";
import { shouldShowDebugCategories } from "./debugFilter.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-6hadbefe.js:2874-3016 placement
function toCleanupFn(disposable) {
  if (typeof disposable === "function") return disposable;
  if (Symbol.asyncDispose in disposable) return () => disposable[Symbol.asyncDispose]();
  return () => disposable[Symbol.dispose]();
}
//@ chunk-6hadbefe.js:3016-3464 placement
/**
 * 清理函数注册表（注册、按序执行）。
 */
let CleanupRegistry; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-6hadbefe.js:3016", () => {
  CleanupRegistry = class CleanupRegistry {
    #e = new Set();
    #t = false;
    get drainStarted() {
      return this.#t;
    }
    register(disposable) {
      let cleanupFn = toCleanupFn(disposable);
      this.#e.add(cleanupFn);
      let unregister = () => {
        this.#e.delete(cleanupFn);
      };
      return Object.assign(unregister, {
        [Symbol.dispose]: unregister,
      });
    }
    async drain() {
      this.#t = true;
      let list = Array.from(this.#e);
      this.#e.clear();
      let found = (await Promise.allSettled(list.map(async (cleanupFn) => cleanupFn()))).find(
        (settledResult) => settledResult.status === "rejected",
      );
      if (found !== undefined) throw found.reason;
    }
    async [Symbol.asyncDispose]() {
      await this.drain();
    }
    get sizeForTesting() {
      return this.#e.size;
    }
  };
});
//@ chunk-6hadbefe.js:3464-3534 placement
/**
 * 清理与退出前刷写的注册表集合（含各自等待表）。
 */
class CleanupRegistries {
  cleanup = new CleanupRegistry();
  preExitFlush = new CleanupRegistry();
  preExitFlushWaits = new Map();
}
//@ chunk-6hadbefe.js:3534-3559 placement
/**
 * 按宿主隔离的清理注册表集合。
 */
var cleanupRegistriesByHost; // deferred: uses CleanupRegistries of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-6hadbefe.js:3534", () => {
  cleanupRegistriesByHost = new HostScoped(() => new CleanupRegistries());
});
//@ chunk-6hadbefe.js:3559-3586 placement
/**
 * 取出进程根的清理注册表集合。
 */
function getCleanupRegistries() {
  return onProcessRootHost(cleanupRegistriesByHost);
}
//@ chunk-6hadbefe.js:3586-3598 placement
/**
 * 清理超时与清理注册 API。
 */
var CLEANUP_TIMEOUT_MS = 2000;
//@ chunk-6hadbefe.js:3598-3644 placement
/**
 * 注册退出时清理函数。
 */
function registerCleanup(disposable) {
  return getCleanupRegistries().cleanup.register(disposable);
}
//@ chunk-6hadbefe.js:3644-3691 placement
/**
 * 执行全部清理函数。
 */
async function runCleanups() {
  await getCleanupRegistries().cleanup.drain();
}
//@ chunk-6hadbefe.js:3691-3737 placement
/**
 * 清理是否已开始。
 */
function isCleanupStarted() {
  return getCleanupRegistries().cleanup.drainStarted;
}
//@ chunk-6hadbefe.js:3737-3937 placement
/**
 * 注册退出前刷新函数（可指定最长等待）。
 */
function registerPreExitFlush(flushFn, mayWaitMs) {
  let { preExitFlush, preExitFlushWaits } = getCleanupRegistries();
  let unregisterFlush = preExitFlush.register(flushFn);
  if (mayWaitMs !== undefined)
    preExitFlushWaits.set(flushFn, {
      mayWaitMs,
      unregister: unregisterFlush,
    });
  let dispose = () => {
    preExitFlushWaits.delete(flushFn);
    unregisterFlush();
  };
  return Object.assign(dispose, {
    [Symbol.dispose]: dispose,
  });
}
//@ chunk-6hadbefe.js:3937-4034 placement
/**
 * 返回所有退出前刷写中最长的等待时长。
 */
function maxPreExitFlushWaitMs() {
  return Math.max(
    0,
    ...Array.from(getCleanupRegistries().preExitFlushWaits.values(), (entry) => entry.mayWaitMs),
  );
}
//@ chunk-6hadbefe.js:4034-4170 placement
/**
 * 把所有登记的退出前刷写等待移到一个新的清理注册表里（并解除原登记），清空后依次执行完毕。
 */
async function drainPreExitFlushes_2() {
  let { preExitFlushWaits } = getCleanupRegistries();
  let registry = new CleanupRegistry();
  preExitFlushWaits.forEach(({ unregister }, flushFn) => {
    unregister();
    registry.register(flushFn);
  });
  preExitFlushWaits.clear();
  await registry.drain();
}
//@ chunk-6hadbefe.js:4170-4261 placement
/**
 * 清空等待表并执行所有退出前刷写。
 */
async function drainPreExitFlushes() {
  let { preExitFlush, preExitFlushWaits } = getCleanupRegistries();
  preExitFlushWaits.clear();
  await preExitFlush.drain();
}
//@ chunk-6hadbefe.js:4261-4385 placement
class DebugFilterCache {
  parsed = new Map();
  lookup(filterString) {
    return this.parsed.get(filterString);
  }
  remember(filterString, value) {
    this.parsed.set(filterString, value);
  }
  reset() {
    this.parsed.clear();
  }
}
//@ chunk-6hadbefe.js:4385-4399 placement
var debugFilterCache; // deferred: uses DebugFilterCache of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-6hadbefe.js:4385", () => {
  debugFilterCache = new DebugFilterCache();
});
//@ chunk-6hadbefe.js:4399-4494 placement
function parseDebugFilterCached(filterString) {
  let cached = debugFilterCache.lookup(filterString);
  if (cached !== undefined) return cached;
  let entry = shouldShowDebugCategories(filterString);
  debugFilterCache.remember(filterString, entry);
  return entry;
}
export {
  isCleanupStarted,
  registerCleanup,
  CLEANUP_TIMEOUT_MS,
  runCleanups,
  maxPreExitFlushWaitMs,
  drainPreExitFlushes_2,
  drainPreExitFlushes,
  registerPreExitFlush,
  parseDebugFilterCached,
};
