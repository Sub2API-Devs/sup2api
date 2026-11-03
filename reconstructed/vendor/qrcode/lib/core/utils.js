/**
 * qrcode/lib/core/utils.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-spjgqa4y.js:357-1074 cjs-fingerprint
var N = x(function (ti) {
  var Fe,
    ei = [
      0, 26, 44, 70, 100, 134, 172, 196, 242, 292, 346, 404, 466, 532, 581, 655, 733, 815, 901, 991, 1085,
      1156, 1258, 1364, 1474, 1588, 1706, 1828, 1921, 2051, 2185, 2323, 2465, 2611, 2761, 2876, 3034, 3196,
      3362, 3532, 3706,
    ];
  ti.getSymbolSize = function (e) {
    if (!e) throw Error('"version" cannot be null or undefined');
    if (e < 1 || e > 40) throw Error('"version" should be in range from 1 to 40');
    return e * 4 + 17;
  };
  ti.getSymbolTotalCodewords = function (e) {
    return ei[e];
  };
  ti.getBCHDigit = function (t) {
    let e = 0;
    while (t !== 0) (e++, (t >>>= 1));
    return e;
  };
  ti.setToSJISFunction = function (e) {
    if (typeof e !== "function") throw Error('"toSJISFunc" is not a valid function.');
    Fe = e;
  };
  ti.isKanjiModeEnabled = function () {
    return typeof Fe < "u";
  };
  ti.toSJIS = function (e) {
    return Fe(e);
  };
});

export { N };
