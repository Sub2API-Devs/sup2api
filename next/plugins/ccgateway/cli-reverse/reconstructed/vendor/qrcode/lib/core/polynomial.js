/**
 * qrcode/lib/core/polynomial.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_galois_field } from "./galois-field.js";

//@ chunk-spjgqa4y.js:6966-7479 cjs-fingerprint
var require_polynomial = __commonJS(function (cjsExports) {
  var GF = require_galois_field();
  cjsExports.mul = function (p1, p2) {
    let coeff = new Uint8Array(p1.length + p2.length - 1);
    for (let coeffIndex = 0; coeffIndex < p1.length; coeffIndex++)
      for (let j = 0; j < p2.length; j++) coeff[coeffIndex + j] ^= GF.mul(p1[coeffIndex], p2[j]);
    return coeff;
  };
  cjsExports.mod = function (divident, divisor) {
    let result = new Uint8Array(divident);
    while (result.length - divisor.length >= 0) {
      let coeff = result[0];
      for (let i = 0; i < divisor.length; i++) result[i] ^= GF.mul(divisor[i], coeff);
      let offset = 0;
      while (offset < result.length && result[offset] === 0) offset++;
      result = result.slice(offset);
    }
    return result;
  };
  cjsExports.generateECPolynomial = function (degree) {
    let poly = new Uint8Array([1]);
    for (let i = 0; i < degree; i++) poly = cjsExports.mul(poly, new Uint8Array([1, GF.exp(i)]));
    return poly;
  };
});
export { require_polynomial };
