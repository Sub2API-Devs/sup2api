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
/**
 * 清理函数注册表（注册、按序执行）。
 */
//@ chunk-cgr0tezp.js:15479-15927 placement
class CleanupRegistry {
  #e = new Set();
  #t = !1;
  get drainStarted() {
    return this.#t;
  }
  register(e) {
    let n = toCleanupFn(e);
    this.#e.add(n);
    let r = () => {
      this.#e.delete(n);
    };
    return Object.assign(r, { [Symbol.dispose]: r });
  }
  async drain() {
    this.#t = !0;
    let list = Array.from(this.#e);
    this.#e.clear();
    let found = (await Promise.allSettled(list.map(async (i) => i()))).find((i) => i.status === "rejected");
    if (found !== void 0) throw found.reason;
  }
  async [Symbol.asyncDispose]() {
    await this.drain();
  }
  get sizeForTesting() {
    return this.#e.size;
  }
}
//@ chunk-cgr0tezp.js:15927-15997 placement
class en {
  cleanup = new CleanupRegistry();
  preExitFlush = new CleanupRegistry();
  preExitFlushWaits = new Map();
}
//@ chunk-cgr0tezp.js:15997-16022 placement
var ri = new HostScoped(() => new en());
//@ chunk-cgr0tezp.js:16022-16050 placement
function ie() {
  return onProcessRootHost(ri);
}
/**
 * 清理超时与清理注册 API。
 */
//@ chunk-cgr0tezp.js:16050-16063 placement
var CLEANUP_TIMEOUT_MS = 2000;
/**
 * 注册退出时清理函数。
 */
//@ chunk-cgr0tezp.js:16063-16110 placement
function registerCleanup(e) {
  return ie().cleanup.register(e);
}
/**
 * 执行全部清理函数。
 */
//@ chunk-cgr0tezp.js:16110-16158 placement
async function runCleanups() {
  await ie().cleanup.drain();
}
/**
 * 清理是否已开始。
 */
//@ chunk-cgr0tezp.js:16158-16205 placement
function isCleanupStarted() {
  return ie().cleanup.drainStarted;
}
/**
 * 注册退出前刷新函数（可指定最长等待）。
 */
//@ chunk-cgr0tezp.js:16205-16406 placement
function registerPreExitFlush(e, n) {
  let { preExitFlush: preExitFlush, preExitFlushWaits: preExitFlushWaits } = ie(),
    register = preExitFlush.register(e);
  if (n !== void 0) preExitFlushWaits.set(e, { mayWaitMs: n, unregister: register });
  let o = () => {
    (preExitFlushWaits.delete(e), register());
  };
  return Object.assign(o, { [Symbol.dispose]: o });
}
//@ chunk-cgr0tezp.js:16406-16504 placement
function J_s() {
  return Math.max(0, ...Array.from(ie().preExitFlushWaits.values(), (e) => e.mayWaitMs));
}
/**
 * 把所有登记的退出前刷写等待移到一个新的清理注册表里（并解除原登记），清空后依次执行完毕。
 */
//@ chunk-cgr0tezp.js:16504-16641 placement
async function drainPreExitFlushes() {
  let { preExitFlushWaits: preExitFlushWaits } = ie(),
    n = new CleanupRegistry();
  (preExitFlushWaits.forEach(({ unregister: unregister }, i) => {
    (unregister(), n.register(i));
  }),
    preExitFlushWaits.clear(),
    await n.drain());
}
//@ chunk-cgr0tezp.js:16641-16733 placement
async function zwr() {
  let { preExitFlush: preExitFlush, preExitFlushWaits: preExitFlushWaits } = ie();
  (preExitFlushWaits.clear(), await preExitFlush.drain());
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
function parseDebugFilterCached(e) {
  let lookup = debugFilterCache.lookup(e);
  if (lookup !== void 0) return lookup;
  let r = parseDebugFilter(e);
  return (debugFilterCache.remember(e, r), r);
}

export {
  registerCleanup,
  isCleanupStarted,
  registerPreExitFlush,
  parseDebugFilterCached,
  CLEANUP_TIMEOUT_MS,
  runCleanups,
  J_s,
  drainPreExitFlushes,
  zwr,
};
