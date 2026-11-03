/**
 * zod/v4/core/registries.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-7vp249v4.js (5)
 * attribution: esm-layout 2, esm-fingerprint 3
 */

//@ chunk-7vp249v4.js:50476-50483 esm-layout
var $n;
//@ chunk-7vp249v4.js:50483-51049 esm-fingerprint
class zn {
  constructor() {
    ((this._map = new WeakMap()), (this._idmap = new Map()));
  }
  add(e, ...t) {
    let r = t[0];
    if ((this._map.set(e, r), r && typeof r === "object" && "id" in r)) this._idmap.set(r.id, e);
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
      let r = { ...(this.get(parent) ?? {}) };
      delete r.id;
      let n = { ...r, ...this._map.get(e) };
      return Object.keys(n).length ? n : void 0;
    }
    return this._map.get(e);
  }
  has(e) {
    return this._map.has(e);
  }
}
//@ chunk-7vp249v4.js:51049-51077 esm-layout
function Cs() {
  return new zn();
}
//@ chunk-7vp249v4.js:51077-51146 esm-fingerprint
($n = globalThis).__zod_globalRegistry ?? ($n.__zod_globalRegistry = Cs());
//@ chunk-7vp249v4.js:51146-51186 esm-fingerprint
var __zod_globalRegistry = globalThis.__zod_globalRegistry;

export { __zod_globalRegistry };
