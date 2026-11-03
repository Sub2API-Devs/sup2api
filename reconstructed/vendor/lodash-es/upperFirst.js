/**
 * lodash-es/upperFirst.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-s61vbvea.js (17)
 * attribution: placement 17
 */
import { SJt } from "../@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { vde } from "./toString.js";

//@ chunk-s61vbvea.js:584196-584276 placement
function MB(e, n, r) {
  var s = e.length;
  r = r === undefined ? s : r;
  return !n && r >= s ? e : SJt(e, n, r);
}
//@ chunk-s61vbvea.js:584276-584286 placement
var Zk = MB;
//@ chunk-s61vbvea.js:584286-584450 placement
var DB = "\\ud800-\\udfff";
var NB = "\\u0300-\\u036f";
var LB = "\\ufe20-\\ufe2f";
var FB = "\\u20d0-\\u20ff";
var HB = NB + LB + FB;
var $B = "\\ufe0e\\ufe0f";
var UB = "\\u200d";
var BB = RegExp("[" + UB + DB + HB + $B + "]");
//@ chunk-s61vbvea.js:584450-584483 placement
function jB(e) {
  return BB.test(e);
}
//@ chunk-s61vbvea.js:584483-584493 placement
var nc = jB;
//@ chunk-s61vbvea.js:584493-584527 placement
function GB(e) {
  return e.split("");
}
//@ chunk-s61vbvea.js:584527-584537 placement
var eE = GB;
//@ chunk-s61vbvea.js:584537-585019 placement
var tE = "\\ud800-\\udfff";
var WB = "\\u0300-\\u036f";
var zB = "\\ufe20-\\ufe2f";
var VB = "\\u20d0-\\u20ff";
var YB = WB + zB + VB;
var qB = "\\ufe0e\\ufe0f";
var XB = "[" + tE + "]";
var pp = "[" + YB + "]";
var gp = "\\ud83c[\\udffb-\\udfff]";
var ej = "(?:" + pp + "|" + gp + ")";
var nE = "[^" + tE + "]";
var rE = "(?:\\ud83c[\\udde6-\\uddff]){2}";
var oE = "[\\ud800-\\udbff][\\udc00-\\udfff]";
var tj = "\\u200d";
var sE = ej + "?";
var iE = "[" + qB + "]?";
var nj = "(?:" + tj + "(?:" + [nE, rE, oE].join("|") + ")" + iE + sE + ")*";
var rj = iE + sE + nj;
var oj = "(?:" + [nE + pp + "?", pp, rE, oE, XB].join("|") + ")";
var sj = RegExp(gp + "(?=" + gp + ")|" + oj + rj, "g");
//@ chunk-s61vbvea.js:585019-585057 placement
function ij(e) {
  return e.match(sj) || [];
}
//@ chunk-s61vbvea.js:585057-585067 placement
var aE = ij;
//@ chunk-s61vbvea.js:585067-585107 placement
function aj(e) {
  return nc(e) ? aE(e) : eE(e);
}
//@ chunk-s61vbvea.js:585107-585117 placement
var lE = aj;
//@ chunk-s61vbvea.js:585117-585255 placement
function lj(e) {
  return function (n) {
    n = vde(n);
    var r = nc(n) ? lE(n) : undefined;
    var s = r ? r[0] : n.charAt(0);
    var h = r ? Zk(r, 1).join("") : n.slice(1);
    return s[e]() + h;
  };
}
//@ chunk-s61vbvea.js:585255-585265 placement
var uE = lj;
//@ chunk-s61vbvea.js:585265-585297 placement
var upperFirst = uE("toUpperCase");
var Xqr = upperFirst;
//@ chunk-s61vbvea.js:585297-585345 placement
function uj(e) {
  return Xqr(vde(e).toLowerCase());
}
//@ chunk-s61vbvea.js:585345-585356 placement
var qyn = uj;
export { qyn, Xqr };
