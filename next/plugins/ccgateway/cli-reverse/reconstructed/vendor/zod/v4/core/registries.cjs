/**
 * zod/v4/core/registries.cjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1hnjmk23.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-1hnjmk23.js:508516-509806 cjs-fingerprint
var require_registries = __commonJS(function (cjsExports) {
  var _a;
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.globalRegistry = cjsExports.$ZodRegistry = cjsExports.$input = cjsExports.$output = undefined;
  cjsExports.registry = registry;
  cjsExports.$output = Symbol("ZodOutput");
  cjsExports.$input = Symbol("ZodInput");
  class $ZodRegistry {
    constructor() {
      this._map = new WeakMap();
      this._idmap = new Map();
    }
    add(schema, ..._meta) {
      let meta = _meta[0];
      this._map.set(schema, meta);
      if (meta && typeof meta === "object" && "id" in meta) this._idmap.set(meta.id, schema);
      return this;
    }
    clear() {
      this._map = new WeakMap();
      this._idmap = new Map();
      return this;
    }
    remove(schema) {
      let meta = this._map.get(schema);
      if (meta && typeof meta === "object" && "id" in meta) this._idmap.delete(meta.id);
      this._map.delete(schema);
      return this;
    }
    get(schema) {
      let p = schema._zod.parent;
      if (p) {
        let pm = {
          ...(this.get(p) ?? {}),
        };
        delete pm.id;
        let f = {
          ...pm,
          ...this._map.get(schema),
        };
        return Object.keys(f).length ? f : undefined;
      }
      return this._map.get(schema);
    }
    has(schema) {
      return this._map.has(schema);
    }
  }
  cjsExports.$ZodRegistry = $ZodRegistry;
  function registry() {
    return new $ZodRegistry();
  }
  (_a = globalThis).__zod_globalRegistry ?? (_a.__zod_globalRegistry = registry());
  cjsExports.globalRegistry = globalThis.__zod_globalRegistry;
  (function () {
    var keys = Object.getOwnPropertyNames(cjsExports);
    for (var i = 0; i < keys.length; i++) {
      var desc = Object.getOwnPropertyDescriptor(cjsExports, keys[i]);
      if (!desc || !desc.get || !desc.configurable) continue;
      var value;
      try {
        value = desc.get();
      } catch (e) {
        continue;
      }
      if (value === undefined) continue;
      Object.defineProperty(cjsExports, keys[i], {
        value,
        writable: false,
        enumerable: desc.enumerable,
        configurable: false,
      });
    }
    Object.freeze(cjsExports);
  })();
});
export { require_registries };
