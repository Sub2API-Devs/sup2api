/**
 * parse5/dist/common/unicode.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: parse5@7.2.0..7.2.1
 * pieces: chunk-p9ac6cnb.js (8)
 * attribution: esm-fingerprint 7, esm-layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
//@ chunk-p9ac6cnb.js:191-462 esm-fingerprint
var UNDEFINED_CODE_POINTS = new Set([
  65534, 65535, 131070, 131071, 196606, 196607, 262142, 262143, 327678, 327679, 393214, 393215, 458750,
  458751, 524286, 524287, 589822, 589823, 655358, 655359, 720894, 720895, 786430, 786431, 851966, 851967,
  917502, 917503, 983038, 983039, 1048574, 1048575, 1114110, 1114111,
]);
var REPLACEMENT_CHARACTER = "\uFFFD";
var CODE_POINTS;
//@ chunk-p9ac6cnb.js:462-1377 esm-fingerprint
(function (CODE_POINTS) {
  CODE_POINTS[(CODE_POINTS.EOF = -1)] = "EOF";
  CODE_POINTS[(CODE_POINTS.NULL = 0)] = "NULL";
  CODE_POINTS[(CODE_POINTS.TABULATION = 9)] = "TABULATION";
  CODE_POINTS[(CODE_POINTS.CARRIAGE_RETURN = 13)] = "CARRIAGE_RETURN";
  CODE_POINTS[(CODE_POINTS.LINE_FEED = 10)] = "LINE_FEED";
  CODE_POINTS[(CODE_POINTS.FORM_FEED = 12)] = "FORM_FEED";
  CODE_POINTS[(CODE_POINTS.SPACE = 32)] = "SPACE";
  CODE_POINTS[(CODE_POINTS.EXCLAMATION_MARK = 33)] = "EXCLAMATION_MARK";
  CODE_POINTS[(CODE_POINTS.QUOTATION_MARK = 34)] = "QUOTATION_MARK";
  CODE_POINTS[(CODE_POINTS.AMPERSAND = 38)] = "AMPERSAND";
  CODE_POINTS[(CODE_POINTS.APOSTROPHE = 39)] = "APOSTROPHE";
  CODE_POINTS[(CODE_POINTS.HYPHEN_MINUS = 45)] = "HYPHEN_MINUS";
  CODE_POINTS[(CODE_POINTS.SOLIDUS = 47)] = "SOLIDUS";
  CODE_POINTS[(CODE_POINTS.DIGIT_0 = 48)] = "DIGIT_0";
  CODE_POINTS[(CODE_POINTS.DIGIT_9 = 57)] = "DIGIT_9";
  CODE_POINTS[(CODE_POINTS.SEMICOLON = 59)] = "SEMICOLON";
  CODE_POINTS[(CODE_POINTS.LESS_THAN_SIGN = 60)] = "LESS_THAN_SIGN";
  CODE_POINTS[(CODE_POINTS.EQUALS_SIGN = 61)] = "EQUALS_SIGN";
  CODE_POINTS[(CODE_POINTS.GREATER_THAN_SIGN = 62)] = "GREATER_THAN_SIGN";
  CODE_POINTS[(CODE_POINTS.QUESTION_MARK = 63)] = "QUESTION_MARK";
  CODE_POINTS[(CODE_POINTS.LATIN_CAPITAL_A = 65)] = "LATIN_CAPITAL_A";
  CODE_POINTS[(CODE_POINTS.LATIN_CAPITAL_Z = 90)] = "LATIN_CAPITAL_Z";
  CODE_POINTS[(CODE_POINTS.RIGHT_SQUARE_BRACKET = 93)] = "RIGHT_SQUARE_BRACKET";
  CODE_POINTS[(CODE_POINTS.GRAVE_ACCENT = 96)] = "GRAVE_ACCENT";
  CODE_POINTS[(CODE_POINTS.LATIN_SMALL_A = 97)] = "LATIN_SMALL_A";
  CODE_POINTS[(CODE_POINTS.LATIN_SMALL_Z = 122)] = "LATIN_SMALL_Z";
})(CODE_POINTS || (CODE_POINTS = {}));
//@ chunk-p9ac6cnb.js:1377-1488 esm-fingerprint
var SEQUENCES = {
  DASH_DASH: "--",
  CDATA_START: "[CDATA[",
  DOCTYPE: "doctype",
  SCRIPT: "script",
  PUBLIC: "public",
  SYSTEM: "system",
};
//@ chunk-p9ac6cnb.js:1488-1528 esm-fingerprint
function isSurrogate(cp) {
  return cp >= 55296 && cp <= 57343;
}
//@ chunk-p9ac6cnb.js:1528-1569 esm-fingerprint
function isSurrogatePair(cp) {
  return cp >= 56320 && cp <= 57343;
}
//@ chunk-p9ac6cnb.js:1569-1614 esm-fingerprint
function getSurrogatePairCodePoint(cp1, cp2) {
  return (cp1 - 55296) * 1024 + 9216 + cp2;
}
//@ chunk-p9ac6cnb.js:1614-1702 esm-layout
function isControlCodePoint(cp) {
  return (
    (cp !== 32 && cp !== 10 && cp !== 13 && cp !== 9 && cp !== 12 && cp >= 1 && cp <= 31) ||
    (cp >= 127 && cp <= 159)
  );
}
//@ chunk-p9ac6cnb.js:1702-1753 esm-fingerprint
function isUndefinedCodePoint(cp) {
  return (cp >= 64976 && cp <= 65007) || UNDEFINED_CODE_POINTS.has(cp);
}
export {
  isSurrogatePair,
  getSurrogatePairCodePoint,
  CODE_POINTS,
  isSurrogate,
  isControlCodePoint,
  isUndefinedCodePoint,
  REPLACEMENT_CHARACTER,
  SEQUENCES,
};
