/**
 * qrcode/lib/core/alphanumeric-data.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { q } from "./mode.js";

//@ chunk-spjgqa4y.js:11961-12654 cjs-fingerprint
var cr = x(function (Ml, hr) {
  var ar = q(),
    Je = [
      "0",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
      "H",
      "I",
      "J",
      "K",
      "L",
      "M",
      "N",
      "O",
      "P",
      "Q",
      "R",
      "S",
      "T",
      "U",
      "V",
      "W",
      "X",
      "Y",
      "Z",
      " ",
      "$",
      "%",
      "*",
      "+",
      "-",
      ".",
      "/",
      ":",
    ];
  function Z(t) {
    ((this.mode = ar.ALPHANUMERIC), (this.data = t));
  }
  Z.getBitsLength = function (e) {
    return 11 * Math.floor(e / 2) + 6 * (e % 2);
  };
  Z.prototype.getLength = function () {
    return this.data.length;
  };
  Z.prototype.getBitsLength = function () {
    return Z.getBitsLength(this.data.length);
  };
  Z.prototype.write = function (e) {
    let r;
    for (r = 0; r + 2 <= this.data.length; r += 2) {
      let n = Je.indexOf(this.data[r]) * 45;
      ((n += Je.indexOf(this.data[r + 1])), e.put(n, 11));
    }
    if (this.data.length % 2) e.put(Je.indexOf(this.data[r]), 6);
  };
  hr.exports = Z;
});

export { cr };
