/**
 * qrcode/lib/core/reed-solomon-encoder.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_polynomial } from "./polynomial.js";

//@ chunk-spjgqa4y.js:7479-7990 cjs-fingerprint
var require_reed_solomon_encoder = __commonJS(function (cjsExports, cjsModule) {
  var Polynomial = require_polynomial();
  function ReedSolomonEncoder(degree) {
    this.genPoly = undefined;
    this.degree = degree;
    if (this.degree) this.initialize(this.degree);
  }
  ReedSolomonEncoder.prototype.initialize = function (degree) {
    this.degree = degree;
    this.genPoly = Polynomial.generateECPolynomial(this.degree);
  };
  ReedSolomonEncoder.prototype.encode = function (data) {
    if (!this.genPoly) throw Error("Encoder not initialized");
    let paddedData = new Uint8Array(data.length + this.degree);
    paddedData.set(data);
    let remainder = Polynomial.mod(paddedData, this.genPoly);
    let start = this.degree - remainder.length;
    if (start > 0) {
      let buff = new Uint8Array(this.degree);
      buff.set(remainder, start);
      return buff;
    }
    return remainder;
  };
  cjsModule.exports = ReedSolomonEncoder;
});
export { require_reed_solomon_encoder };
