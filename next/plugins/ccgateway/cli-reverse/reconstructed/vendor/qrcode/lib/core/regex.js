/**
 * qrcode/lib/core/regex.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-s2h2kd6t.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-s2h2kd6t.js:8067-8825 cjs-fingerprint
var require_regex = __commonJS(function (cjsExports) {
  var kanji =
    "(?:[u3000-u303F]|[u3040-u309F]|[u30A0-u30FF]|[uFF00-uFFEF]|[u4E00-u9FAF]|[u2605-u2606]|[u2190-u2195]|u203B|[u2010u2015u2018u2019u2025u2026u201Cu201Du2225u2260]|[u0391-u0451]|[u00A7u00A8u00B1u00B4u00D7u00F7])+";
  kanji = kanji.replace(/u/g, "\\u");
  var byte =
    "(?:(?![A-Z0-9 $%*+\\-./:]|" +
    kanji +
    `)(?:.|[\r
]))+`;
  cjsExports.KANJI = new RegExp(kanji, "g");
  cjsExports.BYTE_KANJI = new RegExp("[^A-Z0-9 $%*+\\-./:]+", "g");
  cjsExports.BYTE = new RegExp(byte, "g");
  cjsExports.NUMERIC = new RegExp("[0-9]+", "g");
  cjsExports.ALPHANUMERIC = new RegExp("[A-Z $%*+\\-./:]+", "g");
  var TEST_KANJI = new RegExp("^" + kanji + "$");
  var TEST_NUMERIC = new RegExp("^[0-9]+$");
  var TEST_ALPHANUMERIC = new RegExp("^[A-Z0-9 $%*+\\-./:]+$");
  cjsExports.testKanji = function (str) {
    return TEST_KANJI.test(str);
  };
  cjsExports.testNumeric = function (str) {
    return TEST_NUMERIC.test(str);
  };
  cjsExports.testAlphanumeric = function (str) {
    return TEST_ALPHANUMERIC.test(str);
  };
});
export { require_regex };
