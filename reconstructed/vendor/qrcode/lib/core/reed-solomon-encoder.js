/**
 * qrcode/lib/core/reed-solomon-encoder.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Jt } from "./polynomial.js";

//@ chunk-spjgqa4y.js:7479-7990 cjs-fingerprint
var Zt = x(function (Il, Qt) {
  var Le = Jt();
  function He(t) {
    if (((this.genPoly = void 0), (this.degree = t), this.degree)) this.initialize(this.degree);
  }
  He.prototype.initialize = function (e) {
    ((this.degree = e), (this.genPoly = Le.generateECPolynomial(this.degree)));
  };
  He.prototype.encode = function (e) {
    if (!this.genPoly) throw Error("Encoder not initialized");
    let uint8Array = new Uint8Array(e.length + this.degree);
    uint8Array.set(e);
    let mod = Le.mod(uint8Array, this.genPoly),
      i = this.degree - mod.length;
    if (i > 0) {
      let uint8Array = new Uint8Array(this.degree);
      return (uint8Array.set(mod, i), uint8Array);
    }
    return mod;
  };
  Qt.exports = He;
});

export { Zt };
