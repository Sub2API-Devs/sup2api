/**
 * utils/teammateContext.ts
 *
 * 构造同进程 teammate 上下文（AsyncLocalStorage 中存放的身份对象）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/teammateContext.ts
 * pieces: chunk-dtzk9y3z.js (4)
 * attribution: callgraph-witnessed 2, callgraph-fingerprint 1, fingerprint 1
 */
import { AsyncLocalStorage } from "async_hooks";

//@ chunk-dtzk9y3z.js:456-468 callgraph-witnessed (2.1.88 match: teammateContextStorage, 0)
/**
 * 同进程 teammate 上下文的 AsyncLocalStorage。
 */
var teammateContextStorage = new AsyncLocalStorage();
//@ chunk-dtzk9y3z.js:468-502 callgraph-witnessed (2.1.88 match: getTeammateContext, 1)
/**
 * 取当前同进程 teammate 上下文。
 */
function getTeammateContext() {
  return teammateContextStorage.getStore();
}
//@ chunk-dtzk9y3z.js:502-538 callgraph-fingerprint (2.1.88 match: runWithTeammateContext, 1)
/**
 * 在 teammate 上下文中运行函数（inProcessRunner 使用）。
 */
function runWithTeammateContext(teammateContext, fn) {
  return teammateContextStorage.run(teammateContext, fn);
}
//@ chunk-dtzk9y3z.js:581-625 fingerprint (2.1.88 match: createTeammateContext, 1)
/**
 * 用配置构造 teammate 上下文并标 isInProcess=true。
 */
function createTeammateContext(config) {
  return {
    ...config,
    isInProcess: true,
  };
}
export { getTeammateContext, runWithTeammateContext, createTeammateContext, teammateContextStorage };
