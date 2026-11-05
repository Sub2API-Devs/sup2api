/**
 * zod/v4/core/registries.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-m4y44r15.js (5)
 * attribution: esm-layout 2, esm-fingerprint 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-m4y44r15.js:50476-50483 esm-layout
var _a;
//@ chunk-m4y44r15.js:50483-51049 esm-fingerprint
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
//@ chunk-m4y44r15.js:51049-51077 esm-layout
function registry() {
  return new $ZodRegistry();
}
//@ chunk-m4y44r15.js:51077-51146 esm-fingerprint
(_a = globalThis).__zod_globalRegistry ?? (_a.__zod_globalRegistry = registry());
//@ chunk-m4y44r15.js:51146-51186 esm-fingerprint
var globalRegistry = globalThis.__zod_globalRegistry;
export { globalRegistry };
