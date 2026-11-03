/**
 * utils/cleanupRegistry.ts
 *
 * 旧版已有同名文件，2.1.316 有扩充：清理函数注册表（注册、按序执行）；注册退出前刷新函数（可指定最长等待）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/cleanupRegistry.ts
 * pieces: chunk-cgr0tezp.js (16)
 * attribution: placement 16
 */
import { logForDebugging } from "./debug.js";
import { HostScoped } from "./hostScoped.js";
import { onProcessRootHost } from "../bootstrap/state.js";
import { parseDebugFilter } from "./debugFilter.js";

//@ chunk-cgr0tezp.js:15337-15479 placement
function toCleanupFn(e) {
  if (typeof e === "function") return e;
  if (Symbol.asyncDispose in e) return () => e[Symbol.asyncDispose]();
  return () => e[Symbol.dispose]();
}
//@ chunk-cgr0tezp.js:15479-15927 placement
/**
 * 清理函数注册表（注册、按序执行）。
 */
class CleanupRegistry {
  #e = new Set();
  #t = false;
  get drainStarted() {
    return this.#t;
  }
  register(e) {
    let cleanupFn = toCleanupFn(e);
    this.#e.add(cleanupFn);
    let r = () => {
      this.#e.delete(cleanupFn);
    };
    return Object.assign(r, {
      [Symbol.dispose]: r,
    });
  }
  async drain() {
    this.#t = true;
    let list = Array.from(this.#e);
    this.#e.clear();
    let found = (await Promise.allSettled(list.map(async (i) => i()))).find((i) => i.status === "rejected");
    if (found !== undefined) throw found.reason;
  }
  async [Symbol.asyncDispose]() {
    await this.drain();
  }
  get sizeForTesting() {
    return this.#e.size;
  }
}
//@ chunk-cgr0tezp.js:15927-15997 placement
/**
 * 清理与退出前刷写的注册表集合（含各自等待表）。
 */
class CleanupRegistries {
  cleanup = new CleanupRegistry();
  preExitFlush = new CleanupRegistry();
  preExitFlushWaits = new Map();
}
//@ chunk-cgr0tezp.js:15997-16022 placement
/**
 * 按宿主隔离的清理注册表集合。
 */
var cleanupRegistriesByHost = new HostScoped(() => new CleanupRegistries());
//@ chunk-cgr0tezp.js:16022-16050 placement
/**
 * 取出进程根的清理注册表集合。
 */
function getCleanupRegistries() {
  return onProcessRootHost(cleanupRegistriesByHost);
}
//@ chunk-cgr0tezp.js:16050-16063 placement
/**
 * 清理超时与清理注册 API。
 */
var CLEANUP_TIMEOUT_MS = 2000;
//@ chunk-cgr0tezp.js:16063-16110 placement
/**
 * 注册退出时清理函数。
 */
function registerCleanup(e) {
  return getCleanupRegistries().cleanup.register(e);
}
//@ chunk-cgr0tezp.js:16110-16158 placement
/**
 * 执行全部清理函数。
 */
async function runCleanups() {
  await getCleanupRegistries().cleanup.drain();
}
//@ chunk-cgr0tezp.js:16158-16205 placement
/**
 * 清理是否已开始。
 */
function isCleanupStarted() {
  return getCleanupRegistries().cleanup.drainStarted;
}
//@ chunk-cgr0tezp.js:16205-16406 placement
/**
 * 注册退出前刷新函数（可指定最长等待）。
 */
function registerPreExitFlush(e, n) {
  let { preExitFlush, preExitFlushWaits } = getCleanupRegistries();
  let s = preExitFlush.register(e);
  if (n !== undefined)
    preExitFlushWaits.set(e, {
      mayWaitMs: n,
      unregister: s,
    });
  let o = () => {
    preExitFlushWaits.delete(e);
    s();
  };
  return Object.assign(o, {
    [Symbol.dispose]: o,
  });
}
//@ chunk-cgr0tezp.js:16406-16504 placement
/**
 * 返回所有退出前刷写中最长的等待时长。
 */
function maxPreExitFlushWaitMs() {
  return Math.max(0, ...Array.from(getCleanupRegistries().preExitFlushWaits.values(), (e) => e.mayWaitMs));
}
//@ chunk-cgr0tezp.js:16504-16641 placement
/**
 * 把所有登记的退出前刷写等待移到一个新的清理注册表里（并解除原登记），清空后依次执行完毕。
 */
async function drainPreExitFlushes_2() {
  let { preExitFlushWaits } = getCleanupRegistries();
  let n = new CleanupRegistry();
  preExitFlushWaits.forEach(({ unregister }, i) => {
    unregister();
    n.register(i);
  });
  preExitFlushWaits.clear();
  await n.drain();
}
//@ chunk-cgr0tezp.js:16641-16733 placement
/**
 * 清空等待表并执行所有退出前刷写。
 */
async function drainPreExitFlushes() {
  let { preExitFlush, preExitFlushWaits } = getCleanupRegistries();
  preExitFlushWaits.clear();
  await preExitFlush.drain();
}
//@ chunk-cgr0tezp.js:16733-16857 placement
class DebugFilterCache {
  parsed = new Map();
  lookup(e) {
    return this.parsed.get(e);
  }
  remember(e, n) {
    this.parsed.set(e, n);
  }
  reset() {
    this.parsed.clear();
  }
}
//@ chunk-cgr0tezp.js:16857-16871 placement
var debugFilterCache = new DebugFilterCache();
//@ chunk-cgr0tezp.js:16871-16966 placement
function parseDebugFilterCached(filterString) {
  let n = debugFilterCache.lookup(filterString);
  if (n !== undefined) return n;
  let debugFilter = parseDebugFilter(filterString);
  debugFilterCache.remember(filterString, debugFilter);
  return debugFilter;
}
export {
  registerCleanup,
  isCleanupStarted,
  registerPreExitFlush,
  parseDebugFilterCached,
  CLEANUP_TIMEOUT_MS,
  runCleanups,
  maxPreExitFlushWaitMs,
  drainPreExitFlushes_2,
  drainPreExitFlushes,
};
