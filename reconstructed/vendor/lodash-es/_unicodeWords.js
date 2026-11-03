/**
 * lodash-es/_unicodeWords.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-8nhse09v.js (7)
 * attribution: esm-layout 5, esm-fingerprint 2
 */
import { ee, b } from "./_hasUnicodeWord.js";
import { vde } from "./toString.js";

//@ chunk-8nhse09v.js:3312-3321 esm-layout
var l = ee;
//@ chunk-8nhse09v.js:3321-4539 esm-fingerprint
var v = "\\ud800-\\udfff",
  re = "\\u0300-\\u036f",
  ue = "\\ufe20-\\ufe2f",
  oe = "\\u20d0-\\u20ff",
  te = re + ue + oe,
  C = "\\u2700-\\u27bf",
  h = "a-z\\xdf-\\xf6\\xf8-\\xff",
  ae = "\\xac\\xb1\\xd7\\xf7",
  ne = "\\x00-\\x2f\\x3a-\\x40\\x5b-\\x60\\x7b-\\xbf",
  fe = "\\u2000-\\u206f",
  de =
    " \\t\\x0b\\f\\xa0\\ufeff\\n\\r\\u2028\\u2029\\u1680\\u180e\\u2000\\u2001\\u2002\\u2003\\u2004\\u2005\\u2006\\u2007\\u2008\\u2009\\u200a\\u202f\\u205f\\u3000",
  O = "A-Z\\xc0-\\xd6\\xd8-\\xde",
  ie = "\\ufe0e\\ufe0f",
  y = ae + ne + fe + de,
  F = "['\u2019]",
  R = "[" + y + "]",
  xe = "[" + te + "]",
  k = "\\d+",
  se = "[" + C + "]",
  E = "[" + h + "]",
  U = "[^" + v + y + k + C + h + O + "]",
  ce = "\\ud83c[\\udffb-\\udfff]",
  me = "(?:" + xe + "|" + ce + ")",
  ge = "[^" + v + "]",
  w = "(?:\\ud83c[\\udde6-\\uddff]){2}",
  L = "[\\ud800-\\udbff][\\udc00-\\udfff]",
  t = "[" + O + "]",
  pe = "\\u200d",
  _ = "(?:" + E + "|" + U + ")",
  be = "(?:" + t + "|" + U + ")",
  S = "(?:" + F + "(?:d|ll|m|re|s|t|ve))?",
  A = "(?:" + F + "(?:D|LL|M|RE|S|T|VE))?",
  N = me + "?",
  T = "[" + ie + "]?",
  le = "(?:" + pe + "(?:" + [ge, w, L].join("|") + ")" + T + N + ")*",
  Re = "\\d*(?:1st|2nd|3rd|(?![123])\\dth)(?=\\b|[A-Z_])",
  _e = "\\d*(?:1ST|2ND|3RD|(?![123])\\dTH)(?=\\b|[a-z_])",
  Se = T + N + le,
  Ae = "(?:" + [se, w, L].join("|") + ")" + Se,
  ve = RegExp(
    [
      t + "?" + E + "+" + S + "(?=" + [R, t, "$"].join("|") + ")",
      be + "+" + A + "(?=" + [R, t + _, "$"].join("|") + ")",
      t + "?" + _ + "+" + S,
      t + "+" + A,
      _e,
      Re,
      k,
      Ae,
    ].join("|"),
    "g",
  );
//@ chunk-8nhse09v.js:4539-4577 esm-layout
function Ce(e) {
  return e.match(ve) || [];
}
//@ chunk-8nhse09v.js:4577-4586 esm-layout
var z = Ce;
//@ chunk-8nhse09v.js:4586-4685 esm-layout
function he(e, r, u) {
  if (((e = vde(e)), (r = u ? void 0 : r), r === void 0)) return l(e) ? z(e) : b(e);
  return e.match(r) || [];
}
//@ chunk-8nhse09v.js:4685-4694 esm-layout
var M = he;
//@ chunk-8nhse09v.js:4694-4731 esm-fingerprint
var Oe = "['\u2019]",
  ye = RegExp(Oe, "g");

export { M, ye };
