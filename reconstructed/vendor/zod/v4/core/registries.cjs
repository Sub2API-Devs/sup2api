/**
 * zod/v4/core/registries.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-1ny7cxrt.js:508147-509437 cjs-fingerprint
var Ju = x(function (ql) {
  var _C;
  Object.defineProperty(ql, "__esModule", { value: !0 });
  ql.globalRegistry = ql.$ZodRegistry = ql.$input = ql.$output = void 0;
  ql.registry = bC;
  ql.$output = Symbol("ZodOutput");
  ql.$input = Symbol("ZodInput");
  class V_ {
    constructor() {
      ((this._map = new WeakMap()), (this._idmap = new Map()));
    }
    add(e, ...t) {
      let n = t[0];
      if ((this._map.set(e, n), n && typeof n === "object" && "id" in n)) this._idmap.set(n.id, e);
      return this;
    }
    clear() {
      return ((this._map = new WeakMap()), (this._idmap = new Map()), this);
    }
    remove(e) {
      let t = this._map.get(e);
      if (t && typeof t === "object" && "id" in t) this._idmap.delete(t.id);
      return (this._map.delete(e), this);
    }
    get(e) {
      let parent = e._zod.parent;
      if (parent) {
        let n = { ...(this.get(parent) ?? {}) };
        delete n.id;
        let o = { ...n, ...this._map.get(e) };
        return Object.keys(o).length ? o : void 0;
      }
      return this._map.get(e);
    }
    has(e) {
      return this._map.has(e);
    }
  }
  ql.$ZodRegistry = V_;
  function bC() {
    return new V_();
  }
  (_C = globalThis).__zod_globalRegistry ?? (_C.__zod_globalRegistry = bC());
  ql.globalRegistry = globalThis.__zod_globalRegistry;
  (function () {
    var ownPropertyNames = Object.getOwnPropertyNames(ql);
    for (var t = 0; t < ownPropertyNames.length; t++) {
      var ownPropertyDescriptor = Object.getOwnPropertyDescriptor(ql, ownPropertyNames[t]);
      if (!ownPropertyDescriptor || !ownPropertyDescriptor.get || !ownPropertyDescriptor.configurable)
        continue;
      var o;
      try {
        o = ownPropertyDescriptor.get();
      } catch (error) {
        continue;
      }
      if (o === void 0) continue;
      Object.defineProperty(ql, ownPropertyNames[t], {
        value: o,
        writable: !1,
        enumerable: ownPropertyDescriptor.enumerable,
        configurable: !1,
      });
    }
    Object.freeze(ql);
  })();
});

export { Ju };
