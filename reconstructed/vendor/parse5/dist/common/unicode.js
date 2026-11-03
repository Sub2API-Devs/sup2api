/**
 * parse5/dist/common/unicode.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: parse5@7.2.0..7.2.1
 * pieces: chunk-6ja29j2n.js (8)
 * attribution: esm-fingerprint 7, esm-layout 1
 */

//@ chunk-6ja29j2n.js:191-462 esm-fingerprint
var lt = new Set([
    65534, 65535, 131070, 131071, 196606, 196607, 262142, 262143, 327678, 327679, 393214, 393215, 458750,
    458751, 524286, 524287, 589822, 589823, 655358, 655359, 720894, 720895, 786430, 786431, 851966, 851967,
    917502, 917503, 983038, 983039, 1048574, 1048575, 1114110, 1114111,
  ]),
  m = "\uFFFD",
  s;
//@ chunk-6ja29j2n.js:462-1377 esm-fingerprint
(function (e) {
  ((e[(e.EOF = -1)] = "EOF"),
    (e[(e.NULL = 0)] = "NULL"),
    (e[(e.TABULATION = 9)] = "TABULATION"),
    (e[(e.CARRIAGE_RETURN = 13)] = "CARRIAGE_RETURN"),
    (e[(e.LINE_FEED = 10)] = "LINE_FEED"),
    (e[(e.FORM_FEED = 12)] = "FORM_FEED"),
    (e[(e.SPACE = 32)] = "SPACE"),
    (e[(e.EXCLAMATION_MARK = 33)] = "EXCLAMATION_MARK"),
    (e[(e.QUOTATION_MARK = 34)] = "QUOTATION_MARK"),
    (e[(e.AMPERSAND = 38)] = "AMPERSAND"),
    (e[(e.APOSTROPHE = 39)] = "APOSTROPHE"),
    (e[(e.HYPHEN_MINUS = 45)] = "HYPHEN_MINUS"),
    (e[(e.SOLIDUS = 47)] = "SOLIDUS"),
    (e[(e.DIGIT_0 = 48)] = "DIGIT_0"),
    (e[(e.DIGIT_9 = 57)] = "DIGIT_9"),
    (e[(e.SEMICOLON = 59)] = "SEMICOLON"),
    (e[(e.LESS_THAN_SIGN = 60)] = "LESS_THAN_SIGN"),
    (e[(e.EQUALS_SIGN = 61)] = "EQUALS_SIGN"),
    (e[(e.GREATER_THAN_SIGN = 62)] = "GREATER_THAN_SIGN"),
    (e[(e.QUESTION_MARK = 63)] = "QUESTION_MARK"),
    (e[(e.LATIN_CAPITAL_A = 65)] = "LATIN_CAPITAL_A"),
    (e[(e.LATIN_CAPITAL_Z = 90)] = "LATIN_CAPITAL_Z"),
    (e[(e.RIGHT_SQUARE_BRACKET = 93)] = "RIGHT_SQUARE_BRACKET"),
    (e[(e.GRAVE_ACCENT = 96)] = "GRAVE_ACCENT"),
    (e[(e.LATIN_SMALL_A = 97)] = "LATIN_SMALL_A"),
    (e[(e.LATIN_SMALL_Z = 122)] = "LATIN_SMALL_Z"));
})(s || (s = {}));
//@ chunk-6ja29j2n.js:1377-1488 esm-fingerprint
var C = {
  DASH_DASH: "--",
  CDATA_START: "[CDATA[",
  DOCTYPE: "doctype",
  SCRIPT: "script",
  PUBLIC: "public",
  SYSTEM: "system",
};
//@ chunk-6ja29j2n.js:1488-1528 esm-fingerprint
function X(e) {
  return e >= 55296 && e <= 57343;
}
//@ chunk-6ja29j2n.js:1528-1569 esm-fingerprint
function Oe(e) {
  return e >= 56320 && e <= 57343;
}
//@ chunk-6ja29j2n.js:1569-1614 esm-fingerprint
function Se(e, t) {
  return (e - 55296) * 1024 + 9216 + t;
}
//@ chunk-6ja29j2n.js:1614-1702 esm-layout
function K(e) {
  return (
    (e !== 32 && e !== 10 && e !== 13 && e !== 9 && e !== 12 && e >= 1 && e <= 31) || (e >= 127 && e <= 159)
  );
}
//@ chunk-6ja29j2n.js:1702-1753 esm-fingerprint
function V(e) {
  return (e >= 64976 && e <= 65007) || lt.has(e);
}

export { Oe, Se, s, X, K, V, m, C };
