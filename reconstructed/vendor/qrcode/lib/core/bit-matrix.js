/**
 * qrcode/lib/core/bit-matrix.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-spjgqa4y.js:2022-2536 cjs-fingerprint
var require_bit_matrix = x(function (cjsExports, cjsModule) {
  function BitMatrix(size) {
    if (!size || size < 1) throw Error("BitMatrix size must be defined and greater than 0");
    this.size = size;
    this.data = new Uint8Array(size * size);
    this.reservedBit = new Uint8Array(size * size);
  }
  BitMatrix.prototype.set = function (row, col, value, reserved) {
    let index = row * this.size + col;
    this.data[index] = value;
    if (reserved) this.reservedBit[index] = true;
  };
  BitMatrix.prototype.get = function (row, col) {
    return this.data[row * this.size + col];
  };
  BitMatrix.prototype.xor = function (row, col, value) {
    this.data[row * this.size + col] ^= value;
  };
  BitMatrix.prototype.isReserved = function (row, col) {
    return this.reservedBit[row * this.size + col];
  };
  cjsModule.exports = BitMatrix;
});
export { require_bit_matrix };
