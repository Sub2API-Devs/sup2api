/**
 * qrcode/lib/core/mode.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_version_check } from "./version-check.js";
import { require_regex } from "./regex.js";

//@ chunk-spjgqa4y.js:8825-9968 cjs-fingerprint
var require_mode = __commonJS(function (cjsExports) {
  var VersionCheck = require_version_check();
  var Regex = require_regex();
  cjsExports.NUMERIC = {
    id: "Numeric",
    bit: 1,
    ccBits: [10, 12, 14],
  };
  cjsExports.ALPHANUMERIC = {
    id: "Alphanumeric",
    bit: 2,
    ccBits: [9, 11, 13],
  };
  cjsExports.BYTE = {
    id: "Byte",
    bit: 4,
    ccBits: [8, 16, 16],
  };
  cjsExports.KANJI = {
    id: "Kanji",
    bit: 8,
    ccBits: [8, 10, 12],
  };
  cjsExports.MIXED = {
    bit: -1,
  };
  cjsExports.getCharCountIndicator = function (mode, version) {
    if (!mode.ccBits) throw Error("Invalid mode: " + mode);
    if (!VersionCheck.isValid(version)) throw Error("Invalid version: " + version);
    if (version >= 1 && version < 10) return mode.ccBits[0];
    else if (version < 27) return mode.ccBits[1];
    return mode.ccBits[2];
  };
  cjsExports.getBestModeForData = function (dataStr) {
    if (Regex.testNumeric(dataStr)) return cjsExports.NUMERIC;
    else if (Regex.testAlphanumeric(dataStr)) return cjsExports.ALPHANUMERIC;
    else if (Regex.testKanji(dataStr)) return cjsExports.KANJI;
    else return cjsExports.BYTE;
  };
  cjsExports.toString = function (mode) {
    if (mode && mode.id) return mode.id;
    throw Error("Invalid mode");
  };
  cjsExports.isValid = function (mode) {
    return mode && mode.bit && mode.ccBits;
  };
  function fromString(string) {
    if (typeof string !== "string") throw Error("Param is not a string");
    switch (string.toLowerCase()) {
      case "numeric":
        return cjsExports.NUMERIC;
      case "alphanumeric":
        return cjsExports.ALPHANUMERIC;
      case "kanji":
        return cjsExports.KANJI;
      case "byte":
        return cjsExports.BYTE;
      default:
        throw Error("Unknown mode: " + string);
    }
  }
  cjsExports.from = function (value, defaultValue) {
    if (cjsExports.isValid(value)) return value;
    try {
      return fromString(value);
    } catch (e) {
      return defaultValue;
    }
  };
});
export { require_mode };
