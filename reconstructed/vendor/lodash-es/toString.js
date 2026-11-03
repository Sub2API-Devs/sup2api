/**
 * lodash-es/toString.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-byv2e1t5.js (11)
 * attribution: placement 11
 */
import { isSymbol } from "../../src/utils/bash/shellQuote.js";
import { dV } from "./_root.js";

//@ chunk-byv2e1t5.js:231-280 placement
function s(r) {
  return r != null && typeof r == "object";
}
//@ chunk-byv2e1t5.js:280-289 placement
var lV = s;
//@ chunk-byv2e1t5.js:289-314 placement
var isArray = Array.isArray,
  ME = isArray;
//@ chunk-byv2e1t5.js:396-406 placement
var isSymbolAlias = isSymbol;
//@ chunk-byv2e1t5.js:406-501 placement
function u(r, t) {
  var o = -1,
    i = r == null ? 0 : r.length,
    n = Array(i);
  while (++o < i) n[o] = t(r[o], o, r);
  return n;
}
//@ chunk-byv2e1t5.js:501-511 placement
var s9e = u;
//@ chunk-byv2e1t5.js:511-568 placement
var a = 1 / 0,
  e = dV ? dV.prototype : void 0,
  f = e ? e.toString : void 0;
//@ chunk-byv2e1t5.js:568-714 placement
function m(r) {
  if (typeof r == "string") return r;
  if (ME(r)) return s9e(r, m) + "";
  if (isSymbolAlias(r)) return f ? f.call(r) : "";
  var t = r + "";
  return t == "0" && 1 / r == -a ? "-0" : t;
}
//@ chunk-byv2e1t5.js:714-722 placement
var p = m;
//@ chunk-byv2e1t5.js:722-759 placement
function d(r) {
  return r == null ? "" : p(r);
}
//@ chunk-byv2e1t5.js:759-769 placement
var vde = d;

export { s9e, vde, ME, lV, isSymbolAlias };
