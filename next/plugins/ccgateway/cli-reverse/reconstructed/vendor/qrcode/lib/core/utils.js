/**
 * qrcode/lib/core/utils.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-s2h2kd6t.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-s2h2kd6t.js:357-1074 cjs-fingerprint
var require_utils = __commonJS(function (cjsExports) {
  var toSJISFunction;
  var CODEWORDS_COUNT = [
    0, 26, 44, 70, 100, 134, 172, 196, 242, 292, 346, 404, 466, 532, 581, 655, 733, 815, 901, 991, 1085, 1156,
    1258, 1364, 1474, 1588, 1706, 1828, 1921, 2051, 2185, 2323, 2465, 2611, 2761, 2876, 3034, 3196, 3362,
    3532, 3706,
  ];
  cjsExports.getSymbolSize = function (version) {
    if (!version) throw Error('"version" cannot be null or undefined');
    if (version < 1 || version > 40) throw Error('"version" should be in range from 1 to 40');
    return version * 4 + 17;
  };
  cjsExports.getSymbolTotalCodewords = function (version) {
    return CODEWORDS_COUNT[version];
  };
  cjsExports.getBCHDigit = function (data) {
    let digit = 0;
    while (data !== 0) {
      digit++;
      data >>>= 1;
    }
    return digit;
  };
  cjsExports.setToSJISFunction = function (f) {
    if (typeof f !== "function") throw Error('"toSJISFunc" is not a valid function.');
    toSJISFunction = f;
  };
  cjsExports.isKanjiModeEnabled = function () {
    return typeof toSJISFunction !== "undefined";
  };
  cjsExports.toSJIS = function (kanji) {
    return toSJISFunction(kanji);
  };
});
export { require_utils };
