/**
 * qrcode/lib/core/alphanumeric-data.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_mode } from "./mode.js";

//@ chunk-spjgqa4y.js:11961-12654 cjs-fingerprint
var require_alphanumeric_data = __commonJS(function (cjsExports, cjsModule) {
  var Mode = require_mode();
  var ALPHA_NUM_CHARS = [
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
  function AlphanumericData(data) {
    this.mode = Mode.ALPHANUMERIC;
    this.data = data;
  }
  AlphanumericData.getBitsLength = function (length) {
    return 11 * Math.floor(length / 2) + 6 * (length % 2);
  };
  AlphanumericData.prototype.getLength = function () {
    return this.data.length;
  };
  AlphanumericData.prototype.getBitsLength = function () {
    return AlphanumericData.getBitsLength(this.data.length);
  };
  AlphanumericData.prototype.write = function (bitBuffer) {
    let i;
    for (i = 0; i + 2 <= this.data.length; i += 2) {
      let value = ALPHA_NUM_CHARS.indexOf(this.data[i]) * 45;
      value += ALPHA_NUM_CHARS.indexOf(this.data[i + 1]);
      bitBuffer.put(value, 11);
    }
    if (this.data.length % 2) bitBuffer.put(ALPHA_NUM_CHARS.indexOf(this.data[i]), 6);
  };
  cjsModule.exports = AlphanumericData;
});
export { require_alphanumeric_data };
