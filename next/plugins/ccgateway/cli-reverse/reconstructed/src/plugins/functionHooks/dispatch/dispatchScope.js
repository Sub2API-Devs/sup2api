/**
 * plugins/functionHooks/dispatch/dispatchScope.ts
 *
 * 函数钩子分发作用域（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7jxyna5q.js (10)
 * attribution: placement 10
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { AsyncLocalStorage } from "async_hooks";
import { isAbortError } from "../../../utils/errors.js";
import { logError } from "../../../utils/log.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-7jxyna5q.js:204392-204440 placement
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
//@ chunk-7jxyna5q.js:204440-204600 placement
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
//@ chunk-7jxyna5q.js:204600-204688 placement
/**
 * 结束作用域
 */
function endScope(holder) {
  if (holder?.scope && holder.scope.owner === holder) {
    holder.scope.isEnded = true;
    holder.scope.values = undefined;
  }
}
//@ chunk-7jxyna5q.js:204737-204751 placement
/**
 * 分发作用域 ALS
 */
var dispatchScopeStorage; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-7jxyna5q.js:204737", () => {
  dispatchScopeStorage = new AsyncLocalStorage();
});
//@ chunk-7jxyna5q.js:204751-204813 placement
/**
 * 取未结束的作用域
 */
function currentScope() {
  let scope = dispatchScopeStorage.getStore();
  return scope?.isEnded ? undefined : scope;
}
//@ chunk-7jxyna5q.js:204813-204848 placement
/**
 * 新建作用域
 */
var newScope = (base = {}) => ({
  ...base,
  isEnded: false,
});
//@ chunk-7jxyna5q.js:204848-204942 placement
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
//@ chunk-7jxyna5q.js:204942-204975 placement
/**
 * 在作用域里执行
 */
var runInScope = (scope, fn) => (scope ? dispatchScopeStorage.run(scope, fn) : fn());
//@ chunk-7jxyna5q.js:205024-205038 placement
var asyncStoreS61; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-7jxyna5q.js:205024", () => {
  asyncStoreS61 = new AsyncLocalStorage();
});
//@ chunk-7jxyna5q.js:205038-205064 placement
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
