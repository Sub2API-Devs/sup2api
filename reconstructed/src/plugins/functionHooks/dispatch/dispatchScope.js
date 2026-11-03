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
import {
  AsyncLocalStorage,
  AsyncLocalStorage as AsyncLocalStorage_2,
  AsyncLocalStorage as AsyncLocalStorage_3,
  AsyncLocalStorage as AsyncLocalStorage_4,
} from "async_hooks";
import { isAbortError } from "../../../utils/errors.js";
import { logError } from "../../../utils/log.js";

//@ chunk-s61vbvea.js:198898-198946 placement
function Km(e) {
  try {
    e();
  } catch (error) {
    if (!isAbortError(error)) logError(error);
  }
}
/**
 * 为一次 UI 渲染分发建立绘制记录：实例键、实例描述、插件列表、进行中标记与读到的状态版本表。
 */
//@ chunk-s61vbvea.js:198946-199106 placement
var createDrawingScope = (e, { surface: surface, component: component, requestId: requestId }, h) => ({
  instanceKey: e,
  instance: { surface: surface, component: component, requestId: requestId },
  pluginsOf: h,
  isInFlight: !0,
  versionsRead: new Map(),
});
//@ chunk-s61vbvea.js:199106-199194 placement
function zZn(e) {
  if (e?.scope && e.scope.owner === e) ((e.scope.isEnded = !0), (e.scope.values = void 0));
}
//@ chunk-s61vbvea.js:199243-199257 placement
var Ho = new AsyncLocalStorage_2();
//@ chunk-s61vbvea.js:199257-199319 placement
function KZn() {
  let store = Ho.getStore();
  return store?.isEnded ? void 0 : store;
}
//@ chunk-s61vbvea.js:199319-199354 placement
var Qu = (e = {}) => ({ ...e, isEnded: !1 });
//@ chunk-s61vbvea.js:199354-199448 placement
function SA(e) {
  if (!e) return;
  if (!e.scope || e.scope.isEnded) e.scope = Qu({ owner: e });
  return e.scope;
}
//@ chunk-s61vbvea.js:199448-199481 placement
var Ayn = (e, n) => (e ? Ho.run(e, n) : n());
//@ chunk-s61vbvea.js:199530-199544 placement
var asyncStoreS61 = new AsyncLocalStorage_3();
/**
 * 取一个 AsyncLocalStorage 的当前值，用途未确认。
 */
//@ chunk-s61vbvea.js:199544-199570 placement = getAgentContext (1)
var getAsyncStoreS61 = () => asyncStoreS61.getStore();

export { Km, Ayn, KZn, zZn, getAsyncStoreS61, Ho, SA, asyncStoreS61, createDrawingScope, Qu };
