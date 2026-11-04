/**
 * @bufbuild/cel/dist/cjs/uint.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";

//@ chunk-fq0cr76a.js:359141-359464 cjs-fingerprint
var require_uint = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.celUint = celUint;
  cjsExports.isCelUint = isCelUint;
  var privateSymbol = Symbol.for("@bufbuild/cel/uint");
  function celUint(v) {
    return new Uint(v);
  }
  function isCelUint(v) {
    return typeof v === "object" && v !== null && privateSymbol in v;
  }
  class Uint {
    _value;
    [privateSymbol] = {};
    constructor(_value) {
      this._value = _value;
    }
    get value() {
      return this._value;
    }
  }
});
export { require_uint };
