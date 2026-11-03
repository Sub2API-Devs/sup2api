/**
 * @bufbuild/cel/dist/cjs/list.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { ba } from "../../../protobuf/dist/commonjs/reflect/index.js";
import { Sp } from "./proto.js";
import { wa } from "./value.js";

//@ chunk-fq0cr76a.js:468191-469618 cjs-fingerprint
var $o = x(function (pL) {
  Object.defineProperty(pL, "__esModule", { value: !0 });
  pL.EMPTY_LIST = void 0;
  pL.celList = cL;
  pL.celListConcat = cQ;
  pL.isCelList = uQ;
  var aL = ba(),
    lL = Sp(),
    ad = wa(),
    wy = Symbol.for("@bufbuild/cel/list");
  function cL(e) {
    if (aL.isReflectList(e)) return new dL(e);
    return new uL(e);
  }
  function cQ(...e) {
    return new fL(e);
  }
  function uQ(e) {
    return typeof e === "object" && e !== null && wy in e;
  }
  class uL {
    _array;
    [wy] = {};
    constructor(e) {
      this._array = e;
    }
    get size() {
      return this._array.length;
    }
    get(e) {
      if (e < 0 || e >= this.size) return;
      return ad.toCel(this._array[e]);
    }
    *values() {
      for (let e of this._array.values()) yield ad.toCel(e);
    }
    [Symbol.iterator]() {
      return this.values();
    }
  }
  class dL {
    _list;
    [wy] = {};
    constructor(e) {
      this._list = e;
    }
    get size() {
      return this._list.size;
    }
    get(e) {
      let n = this._list.get(e);
      if (n === void 0) return;
      return oL(this._list.field(), n);
    }
    *values() {
      for (let e of this._list) yield oL(this._list.field(), e);
    }
    [Symbol.iterator]() {
      return this.values();
    }
  }
  class fL {
    _lists;
    [wy] = {};
    _size;
    constructor(e) {
      this._lists = e;
      let n = 0;
      for (let r of e) n += r.size;
      this._size = n;
    }
    get size() {
      return this._size;
    }
    get(e) {
      if (e < 0 || e >= this.size) return;
      for (let _list of this._lists) {
        if (e < _list.size) return _list.get(e);
        e = e - _list.size;
      }
      return;
    }
    *values() {
      for (let _list of this._lists) yield* _list.values();
    }
    [Symbol.iterator]() {
      return this.values();
    }
  }
  function oL(e, n) {
    switch (e.listKind) {
      case "enum":
        return BigInt(n);
      case "message":
        return ad.reflectMsgToCel(n);
      case "scalar":
        return lL.celFromScalar(e.scalar, n);
    }
  }
  pL.EMPTY_LIST = cL([]);
});

export { $o };
