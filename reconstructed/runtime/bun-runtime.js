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
var {
  getPrototypeOf: getPrototypeOf,
  defineProperty: defineProperty,
  getOwnPropertyNames: getOwnPropertyNames,
} = Object;
//@ chunk-rshven70.js:279-317 helper:bun-runtime
var hasOwnProperty = Object.prototype.hasOwnProperty;
//@ chunk-rshven70.js:317-346 helper:bun-runtime
function n(a) {
  return this[a];
}
//@ chunk-rshven70.js:346-733 helper:bun-runtime
var o,
  p,
  Re = (a, b, c) => {
    var d = a != null && typeof a === "object";
    if (d) {
      var h = b ? (o ??= new WeakMap()) : (p ??= new WeakMap()),
        i = h.get(a);
      if (i) return i;
    }
    c = a != null ? create(getPrototypeOf(a)) : {};
    let e =
      b || !a || !a.__esModule || !hasOwnProperty.call(a, "default")
        ? defineProperty(c, "default", { value: a, enumerable: !0 })
        : c;
    if ((a && typeof a === "object") || typeof a === "function") {
      for (let g of getOwnPropertyNames(a))
        if (!hasOwnProperty.call(e, g)) defineProperty(e, g, { get: n.bind(a, g), enumerable: !0 });
    }
    if (d) h.set(a, e);
    return e;
  };
//@ chunk-rshven70.js:733-795 helper:bun-runtime
var x = (a, b) => () => (b || a((b = { exports: {} }).exports, b), b.exports);
//@ chunk-rshven70.js:795-808 helper:bun-runtime
var q = (a) => a;
//@ chunk-rshven70.js:808-847 helper:bun-runtime
function r(a, b) {
  this[a] = q.bind(null, b);
}
//@ chunk-rshven70.js:847-942 helper:bun-runtime
var Ar = (a, b) => {
  for (var key in b)
    defineProperty(a, key, { get: b[key], enumerable: !0, configurable: !0, set: r.bind(b, key) });
};
//@ chunk-rshven70.js:942-1022 helper:bun-runtime
var Xa = (a, b, c) => () => {
  if (a)
    try {
      b = a((a = 0));
    } catch (error) {
      c = [error];
    }
  if (c) throw c[0];
  return b;
};
/**
 * 运行时公共常量：React Compiler 的两个哨兵符号与 Bun 打包器帮助函数（实属运行时/vendor，被误归到本模块）。
 */
//@ chunk-rshven70.js:1022-1223 helper:bun-runtime
var MEMO_CACHE_SENTINEL = Symbol.for("react.memo_cache_sentinel"),
  EARLY_RETURN_SENTINEL = Symbol.for("react.early_return_sentinel"),
  defineExports = (a, b, c) => {
    for (var key in b) defineProperty(a, key, { get: b[key], set: c[key], enumerable: !0, configurable: !0 });
  },
  importMetaRequire = import.meta.require;

export { MEMO_CACHE_SENTINEL, Re, EARLY_RETURN_SENTINEL, importMetaRequire, x, Ar, Xa, defineExports };
