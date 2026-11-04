/**
 * qrcode/lib/core/error-correction-level.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-spjgqa4y.js:1074-1578 cjs-fingerprint
var require_error_correction_level = __commonJS(function (cjsExports) {
  cjsExports.L = {
    bit: 1,
  };
  cjsExports.M = {
    bit: 0,
  };
  cjsExports.Q = {
    bit: 3,
  };
  cjsExports.H = {
    bit: 2,
  };
  function fromString(string) {
    if (typeof string !== "string") throw Error("Param is not a string");
    switch (string.toLowerCase()) {
      case "l":
      case "low":
        return cjsExports.L;
      case "m":
      case "medium":
        return cjsExports.M;
      case "q":
      case "quartile":
        return cjsExports.Q;
      case "h":
      case "high":
        return cjsExports.H;
      default:
        throw Error("Unknown EC Level: " + string);
    }
  }
  cjsExports.isValid = function (level) {
    return level && typeof level.bit !== "undefined" && level.bit >= 0 && level.bit < 4;
  };
  cjsExports.from = function (value, defaultValue) {
    if (cjsExports.isValid(value)) return value;
    try {
      return fromString(value);
    } catch (e) {
      return defaultValue;
    }
  };
});
export { require_error_correction_level };
