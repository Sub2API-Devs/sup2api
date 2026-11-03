/**
 * qrcode/lib/core/regex.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-spjgqa4y.js:8067-8825 cjs-fingerprint
var Ge = x(function (Ui) {
  var ge =
    "(?:[u3000-u303F]|[u3040-u309F]|[u30A0-u30FF]|[uFF00-uFFEF]|[u4E00-u9FAF]|[u2605-u2606]|[u2190-u2195]|u203B|[u2010u2015u2018u2019u2025u2026u201Cu201Du2225u2260]|[u0391-u0451]|[u00A7u00A8u00B1u00B4u00D7u00F7])+";
  ge = ge.replace(/u/g, "\\u");
  var Mi =
    "(?:(?![A-Z0-9 $%*+\\-./:]|" +
    ge +
    `)(?:.|[\r
]))+`;
  Ui.KANJI = new RegExp(ge, "g");
  Ui.BYTE_KANJI = new RegExp("[^A-Z0-9 $%*+\\-./:]+", "g");
  Ui.BYTE = new RegExp(Mi, "g");
  Ui.NUMERIC = new RegExp("[0-9]+", "g");
  Ui.ALPHANUMERIC = new RegExp("[A-Z $%*+\\-./:]+", "g");
  var regExp = new RegExp("^" + ge + "$"),
    regExp_2 = new RegExp("^[0-9]+$"),
    regExp_3 = new RegExp("^[A-Z0-9 $%*+\\-./:]+$");
  Ui.testKanji = function (e) {
    return regExp.test(e);
  };
  Ui.testNumeric = function (e) {
    return regExp_2.test(e);
  };
  Ui.testAlphanumeric = function (e) {
    return regExp_3.test(e);
  };
});

export { Ge };
