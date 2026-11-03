/**
 * @bufbuild/cel/dist/cjs/map.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { ba } from "../../../protobuf/dist/commonjs/reflect/index.js";
import { Bi } from "./uint.js";
import { li } from "../../../protobuf/dist/commonjs/index.js";
import { Sp } from "./proto.js";
import { wa } from "./value.js";

//@ chunk-fq0cr76a.js:475393-477725 cjs-fingerprint
var Aa = x(function (FL) {
  Object.defineProperty(FL, "__esModule", { value: !0 });
  FL.EMPTY_MAP = void 0;
  FL.celMap = LL;
  FL.isCelMap = HQ;
  var PL = ba(),
    pd = Bi(),
    ss = li(),
    Ry = Sp(),
    Mi = wa(),
    N_ = Symbol.for("@bufbuild/cel/map");
  function LL(e) {
    if (PL.isReflectMap(e)) return new UL(e);
    return new BL(e);
  }
  function HQ(e) {
    return typeof e === "object" && e !== null && N_ in e;
  }
  class BL {
    _map;
    [N_] = {};
    constructor(e) {
      this._map = e;
    }
    get size() {
      return this._map.size;
    }
    get(e) {
      if (pd.isCelUint(e)) e = e.value;
      if (typeof e === "number") {
        if (!Number.isInteger(e)) return;
        e = BigInt(e);
      }
      let n = this._map.get(e);
      if (n !== void 0) return Mi.toCel(n);
      if (typeof e === "bigint")
        for (let r of this._map.keys()) {
          if (!pd.isCelUint(r)) continue;
          if (r.value === e) return Mi.toCel(this._map.get(r));
        }
      return;
    }
    has(e) {
      return this.get(e) != null;
    }
    forEach(e, n) {
      this._map.forEach((r, s, h) => e.call(n, Mi.toCel(r), s, this));
    }
    *entries() {
      for (let [e, n] of this._map.entries()) yield [e, Mi.toCel(n)];
    }
    keys() {
      return this._map.keys();
    }
    *values() {
      for (let e of this._map.values()) yield Mi.toCel(e);
    }
    [Symbol.iterator]() {
      return this.entries();
    }
  }
  class UL {
    _map;
    [N_] = {};
    constructor(e) {
      this._map = e;
    }
    get size() {
      return this._map.size;
    }
    get(e) {
      let n = this._map.get(OL(this._map.field(), e));
      if (n === void 0) return;
      return Cy(this._map.field(), n);
    }
    has(e) {
      return this._map.has(OL(this._map.field(), e));
    }
    forEach(e, n) {
      this._map.forEach((r, s, h) => e.call(n, Cy(this._map.field(), r), I_(this._map.field(), s), this));
    }
    *entries() {
      for (let [e, n] of this._map.entries()) yield [I_(this._map.field(), e), Cy(this._map.field(), n)];
    }
    *keys() {
      for (let e of this._map.keys()) yield I_(this._map.field(), e);
    }
    *values() {
      for (let e of this._map.keys()) yield Cy(this._map.field(), e);
    }
    [Symbol.iterator]() {
      return this.entries();
    }
  }
  function OL(e, n) {
    if (pd.isCelUint(n)) n = n.value;
    switch (e.mapKey) {
      case ss.ScalarType.SINT32:
      case ss.ScalarType.INT32:
      case ss.ScalarType.FIXED32:
      case ss.ScalarType.UINT32:
      case ss.ScalarType.SFIXED32:
        if (typeof n === "bigint") return Number(n);
        return n;
      case ss.ScalarType.SINT64:
      case ss.ScalarType.INT64:
      case ss.ScalarType.FIXED64:
      case ss.ScalarType.UINT64:
      case ss.ScalarType.SFIXED64:
        if (n === "number" && Number.isInteger(n)) return BigInt(n);
        return n;
      default:
        return n;
    }
  }
  function I_(e, n) {
    return Ry.celFromScalar(e.mapKey, n);
  }
  function Cy(e, n) {
    switch (e.mapKind) {
      case "enum":
        return BigInt(n);
      case "message":
        return Mi.reflectMsgToCel(n);
      case "scalar":
        return Ry.celFromScalar(e.scalar, n);
    }
  }
  FL.EMPTY_MAP = LL(new Map());
});

export { Aa };
