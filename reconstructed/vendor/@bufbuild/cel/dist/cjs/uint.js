/**
 * @bufbuild/cel/dist/cjs/uint.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";

//@ chunk-fq0cr76a.js:359141-359464 cjs-fingerprint
var Bi = x(function (Lk) {
  Object.defineProperty(Lk, "__esModule", { value: !0 });
  Lk.celUint = WY;
  Lk.isCelUint = GY;
  var Ok = Symbol.for("@bufbuild/cel/uint");
  function WY(e) {
    return new Pk(e);
  }
  function GY(e) {
    return typeof e === "object" && e !== null && Ok in e;
  }
  class Pk {
    _value;
    [Ok] = {};
    constructor(e) {
      this._value = e;
    }
    get value() {
      return this._value;
    }
  }
});

export { Bi };
