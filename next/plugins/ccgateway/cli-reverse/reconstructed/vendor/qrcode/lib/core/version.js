/**
 * qrcode/lib/core/version.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-s2h2kd6t.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_utils } from "./utils.js";
import { require_error_correction_code } from "./error-correction-code.js";
import { require_error_correction_level } from "./error-correction-level.js";
import { require_mode } from "./mode.js";
import { require_version_check } from "./version-check.js";

//@ chunk-s2h2kd6t.js:9968-11234 cjs-fingerprint
var require_version = __commonJS(function (cjsExports) {
  var Utils = require_utils();
  var ECCode = require_error_correction_code();
  var ECLevel = require_error_correction_level();
  var Mode = require_mode();
  var VersionCheck = require_version_check();
  var G18_BCH = Utils.getBCHDigit(7973);
  function getBestVersionForDataLength(mode, length, errorCorrectionLevel) {
    for (let currentVersion = 1; currentVersion <= 40; currentVersion++)
      if (length <= cjsExports.getCapacity(currentVersion, errorCorrectionLevel, mode)) return currentVersion;
    return;
  }
  function getReservedBitsCount(mode, version) {
    return Mode.getCharCountIndicator(mode, version) + 4;
  }
  function getTotalBitsFromDataArray(segments, version) {
    let totalBits = 0;
    segments.forEach(function (data) {
      let reservedBits = getReservedBitsCount(data.mode, version);
      totalBits += reservedBits + data.getBitsLength();
    });
    return totalBits;
  }
  function getBestVersionForMixedData(segments, errorCorrectionLevel) {
    for (let currentVersion = 1; currentVersion <= 40; currentVersion++)
      if (
        getTotalBitsFromDataArray(segments, currentVersion) <=
        cjsExports.getCapacity(currentVersion, errorCorrectionLevel, Mode.MIXED)
      )
        return currentVersion;
    return;
  }
  cjsExports.from = function (value, defaultValue) {
    if (VersionCheck.isValid(value)) return parseInt(value, 10);
    return defaultValue;
  };
  cjsExports.getCapacity = function (version, errorCorrectionLevel, mode) {
    if (!VersionCheck.isValid(version)) throw Error("Invalid QR Code version");
    if (typeof mode === "undefined") mode = Mode.BYTE;
    let totalCodewords = Utils.getSymbolTotalCodewords(version);
    let ecTotalCodewords = ECCode.getTotalCodewordsCount(version, errorCorrectionLevel);
    let dataTotalCodewordsBits = (totalCodewords - ecTotalCodewords) * 8;
    if (mode === Mode.MIXED) return dataTotalCodewordsBits;
    let usableBits = dataTotalCodewordsBits - getReservedBitsCount(mode, version);
    switch (mode) {
      case Mode.NUMERIC:
        return Math.floor((usableBits / 10) * 3);
      case Mode.ALPHANUMERIC:
        return Math.floor((usableBits / 11) * 2);
      case Mode.KANJI:
        return Math.floor(usableBits / 13);
      case Mode.BYTE:
      default:
        return Math.floor(usableBits / 8);
    }
  };
  cjsExports.getBestVersionForData = function (data, errorCorrectionLevel) {
    let seg;
    let ecl = ECLevel.from(errorCorrectionLevel, ECLevel.M);
    if (Array.isArray(data)) {
      if (data.length > 1) return getBestVersionForMixedData(data, ecl);
      if (data.length === 0) return 1;
      seg = data[0];
    } else seg = data;
    return getBestVersionForDataLength(seg.mode, seg.getLength(), ecl);
  };
  cjsExports.getEncodedBits = function (version) {
    if (!VersionCheck.isValid(version) || version < 7) throw Error("Invalid QR Code version");
    let d = version << 12;
    while (Utils.getBCHDigit(d) - G18_BCH >= 0) d ^= 7973 << (Utils.getBCHDigit(d) - G18_BCH);
    return (version << 12) | d;
  };
});
export { require_version };
