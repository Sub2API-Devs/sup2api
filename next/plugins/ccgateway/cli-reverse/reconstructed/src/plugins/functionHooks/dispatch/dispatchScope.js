/**
 * plugins/functionHooks/dispatch/dispatchScope.ts
 *
 * 函数钩子分发作用域（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (10)
 * attribution: placement 10
 */
import { AsyncLocalStorage } from "async_hooks";
import { isAbortError } from "../../../utils/errors.js";
import { logError } from "../../../utils/log.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-s61vbvea.js:198898-198946 placement
/**
 * 执行并忽略中止错误
 */
function runIgnoringAbort(fn) {
  try {
    fn();
  } catch (error) {
    if (!isAbortError(error)) logError(error);
  }
}
//@ chunk-s61vbvea.js:198946-199106 placement
/**
 * 为一次 UI 渲染分发建立绘制记录：实例键、实例描述、插件列表、进行中标记与读到的状态版本表。
 */
var createDrawingScope = (instanceKey, { surface, component, requestId }, pluginsOf) => ({
  instanceKey,
  instance: {
    surface,
    component,
    requestId,
  },
  pluginsOf,
  isInFlight: true,
  versionsRead: new Map(),
});
//@ chunk-s61vbvea.js:199106-199194 placement
/**
 * 结束作用域
 */
function endScope(holder) {
  if (holder?.scope && holder.scope.owner === holder) {
    holder.scope.isEnded = true;
    holder.scope.values = undefined;
  }
}
//@ chunk-s61vbvea.js:199243-199257 placement
/**
 * 分发作用域 ALS
 */
var dispatchScopeStorage; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-s61vbvea.js:199243", () => {
  dispatchScopeStorage = new AsyncLocalStorage();
});
//@ chunk-s61vbvea.js:199257-199319 placement
/**
 * 取未结束的作用域
 */
function currentScope() {
  let scope = dispatchScopeStorage.getStore();
  return scope?.isEnded ? undefined : scope;
}
//@ chunk-s61vbvea.js:199319-199354 placement
/**
 * 新建作用域
 */
var newScope = (base = {}) => ({
  ...base,
  isEnded: false,
});
//@ chunk-s61vbvea.js:199354-199448 placement
/**
 * 取或建作用域
 */
function scopeOf(scopeHolder) {
  if (!scopeHolder) return;
  if (!scopeHolder.scope || scopeHolder.scope.isEnded)
    scopeHolder.scope = newScope({
      owner: scopeHolder,
    });
  return scopeHolder.scope;
}
//@ chunk-s61vbvea.js:199448-199481 placement
/**
 * 在作用域里执行
 */
var runInScope = (scope, fn) => (scope ? dispatchScopeStorage.run(scope, fn) : fn());
//@ chunk-s61vbvea.js:199530-199544 placement
var asyncStoreS61; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-s61vbvea.js:199530", () => {
  asyncStoreS61 = new AsyncLocalStorage();
});
//@ chunk-s61vbvea.js:199544-199570 placement (2.1.88 match: getAgentContext, 1)
/**
 * 取一个 AsyncLocalStorage 的当前值，用途未确认。
 */
var getAsyncStoreS61 = () => asyncStoreS61.getStore();
export {
  runIgnoringAbort,
  runInScope,
  currentScope,
  endScope,
  getAsyncStoreS61,
  dispatchScopeStorage,
  scopeOf,
  asyncStoreS61,
  createDrawingScope,
  newScope,
};
