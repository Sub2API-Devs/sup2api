/**
 * @bufbuild/cel/dist/cjs/resolver.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { wa } from "./value.js";

//@ chunk-fq0cr76a.js:478784-479776 cjs-fingerprint
var ZL = x(function (YL) {
  Object.defineProperty(YL, "__esModule", { value: !0 });
  YL.createResolver = zQ;
  var HL = wa(),
    KL = Symbol.for("@bufbuild/cel/resolver");
  function zQ(...e) {
    let n = new Map();
    for (let r of e) {
      let s = XQ(r) || Array.isArray(r) ? r : [r];
      for (let h of s) {
        let y = n.get(h.name);
        if (y === void 0) ((y = []), n.set(h.name, y));
        y.push(h);
      }
    }
    return new qL(new Map(Array(...n.entries()).map(([r, s]) => [r, JQ(r, s)])));
  }
  function XQ(e) {
    return typeof e === "object" && e !== null && KL in e;
  }
  class qL {
    _groups;
    [KL] = {};
    constructor(e) {
      this._groups = e;
    }
    *[Symbol.iterator]() {
      for (let e of this._groups.values()) yield* e;
    }
    find(e) {
      return this._groups.get(e);
    }
  }
  function JQ(e, n) {
    let r = [];
    for (let s of n) {
      for (let h = 0; h < r.length; h++)
        if (s.id === r[h].id) {
          r.splice(h, 1);
          break;
        }
      r.push(s);
    }
    return new jL(e, r);
  }
  class jL {
    _name;
    _funcs;
    constructor(e, n) {
      ((this._name = e), (this._funcs = n));
    }
    *[Symbol.iterator]() {
      yield* this._funcs;
    }
    get name() {
      return this._name;
    }
    call(e, n, r) {
      r = r.map((s) => HL.unwrapAny(s));
      for (let _func of this._funcs) {
        let h = _func.call(e, n, r);
        if (h !== void 0) return h;
      }
      return;
    }
  }
});

export { ZL };
