/**
 * qrcode/lib/core/mode.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { ze } from "./version-check.js";
import { Ge } from "./regex.js";

//@ chunk-spjgqa4y.js:8825-9968 cjs-fingerprint
var q = x(function (Wi) {
  var $t = ze(),
    W = Ge();
  Wi.NUMERIC = { id: "Numeric", bit: 1, ccBits: [10, 12, 14] };
  Wi.ALPHANUMERIC = { id: "Alphanumeric", bit: 2, ccBits: [9, 11, 13] };
  Wi.BYTE = { id: "Byte", bit: 4, ccBits: [8, 16, 16] };
  Wi.KANJI = { id: "Kanji", bit: 8, ccBits: [8, 10, 12] };
  Wi.MIXED = { bit: -1 };
  Wi.getCharCountIndicator = function (e, r) {
    if (!e.ccBits) throw Error("Invalid mode: " + e);
    if (!$t.isValid(r)) throw Error("Invalid version: " + r);
    if (r >= 1 && r < 10) return e.ccBits[0];
    else if (r < 27) return e.ccBits[1];
    return e.ccBits[2];
  };
  Wi.getBestModeForData = function (e) {
    if (W.testNumeric(e)) return Wi.NUMERIC;
    else if (W.testAlphanumeric(e)) return Wi.ALPHANUMERIC;
    else if (W.testKanji(e)) return Wi.KANJI;
    else return Wi.BYTE;
  };
  Wi.toString = function (e) {
    if (e && e.id) return e.id;
    throw Error("Invalid mode");
  };
  Wi.isValid = function (e) {
    return e && e.bit && e.ccBits;
  };
  function Ki(t) {
    if (typeof t !== "string") throw Error("Param is not a string");
    switch (t.toLowerCase()) {
      case "numeric":
        return Wi.NUMERIC;
      case "alphanumeric":
        return Wi.ALPHANUMERIC;
      case "kanji":
        return Wi.KANJI;
      case "byte":
        return Wi.BYTE;
      default:
        throw Error("Unknown mode: " + t);
    }
  }
  Wi.from = function (e, r) {
    if (Wi.isValid(e)) return e;
    try {
      return Ki(e);
    } catch (error) {
      return r;
    }
  };
});

export { q };
