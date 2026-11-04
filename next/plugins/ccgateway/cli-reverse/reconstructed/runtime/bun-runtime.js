/**
 * bun-runtime.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * kind: runtime
 * pieces: chunk-rshven70.js (11)
 * attribution: helper:bun-runtime 11
 */

//@ chunk-rshven70.js:191-211 helper:bun-runtime
var create = Object.create;
//@ chunk-rshven70.js:211-279 helper:bun-runtime
var { getPrototypeOf, defineProperty, getOwnPropertyNames } = Object;
//@ chunk-rshven70.js:279-317 helper:bun-runtime
var hasOwnProperty = Object.prototype.hasOwnProperty;
//@ chunk-rshven70.js:317-346 helper:bun-runtime
function __getValue(key) {
  return this[key];
}
//@ chunk-rshven70.js:346-733 helper:bun-runtime
var esmCacheNodeMode;
var esmCache;
var __toESM = (mod, isNodeMode, target) => {
  var isObject = mod != null && typeof mod === "object";
  if (isObject) {
    var cache = isNodeMode ? (esmCacheNodeMode ??= new WeakMap()) : (esmCache ??= new WeakMap());
    var cached = cache.get(mod);
    if (cached) return cached;
  }
  target = mod != null ? create(getPrototypeOf(mod)) : {};
  let esmTarget =
    isNodeMode || !mod || !mod.__esModule || !hasOwnProperty.call(mod, "default")
      ? defineProperty(target, "default", {
          value: mod,
          enumerable: true,
        })
      : target;
  if ((mod && typeof mod === "object") || typeof mod === "function") {
    for (let keyName of getOwnPropertyNames(mod))
      if (!hasOwnProperty.call(esmTarget, keyName))
        defineProperty(esmTarget, keyName, {
          get: __getValue.bind(mod, keyName),
          enumerable: true,
        });
  }
  if (isObject) cache.set(mod, esmTarget);
  return esmTarget;
};
//@ chunk-rshven70.js:733-795 helper:bun-runtime
var __commonJS = (factory, mod) => () => {
  if (!mod)
    factory(
      (mod = {
        exports: {},
      }).exports,
      mod,
    );
  return mod.exports;
};
//@ chunk-rshven70.js:795-808 helper:bun-runtime
var __identity = (value) => value;
//@ chunk-rshven70.js:808-847 helper:bun-runtime
function __setValue(key, value) {
  this[key] = __identity.bind(null, value);
}
//@ chunk-rshven70.js:847-942 helper:bun-runtime
var __export = (target, all) => {
  for (var key in all)
    defineProperty(target, key, {
      get: all[key],
      enumerable: true,
      configurable: true,
      set: __setValue.bind(all, key),
    });
};
//@ chunk-rshven70.js:942-1022 helper:bun-runtime
var __esm = (init, cachedExports, thrown) => () => {
  if (init)
    try {
      cachedExports = init((init = 0));
    } catch (error) {
      thrown = [error];
    }
  if (thrown) throw thrown[0];
  return cachedExports;
};
//@ chunk-rshven70.js:1022-1223 helper:bun-runtime
/**
 * 运行时公共常量：React Compiler 的两个哨兵符号与 Bun 打包器帮助函数（实属运行时/vendor，被误归到本模块）。
 */
var MEMO_CACHE_SENTINEL = Symbol.for("react.memo_cache_sentinel");
var EARLY_RETURN_SENTINEL = Symbol.for("react.early_return_sentinel");
var defineExports = (target, getters, setters) => {
  for (var key in getters)
    defineProperty(target, key, {
      get: getters[key],
      set: setters[key],
      enumerable: true,
      configurable: true,
    });
};
var importMetaRequire = import.meta.require;
export {
  MEMO_CACHE_SENTINEL,
  __toESM,
  EARLY_RETURN_SENTINEL,
  importMetaRequire,
  __commonJS,
  __export,
  __esm,
  defineExports,
};
