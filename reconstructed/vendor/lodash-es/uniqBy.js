/**
 * lodash-es/uniqBy.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-ktpw8eqa.js (20)
 * attribution: placement 20
 */
import {
  UMt,
  dDn,
  edo,
  Zlo,
  nz,
} from "../@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";

//@ chunk-ktpw8eqa.js:243-342 placement
function A(e, o, s, n) {
  var r = e.length,
    i = s + (n ? 1 : -1);
  while (n ? i-- : ++i < r) if (o(e[i], i, e)) return i;
  return -1;
}
//@ chunk-ktpw8eqa.js:342-350 placement
var y = A;
//@ chunk-ktpw8eqa.js:350-377 placement
function P(e) {
  return e !== e;
}
//@ chunk-ktpw8eqa.js:377-385 placement
var R = P;
//@ chunk-ktpw8eqa.js:385-466 placement
function b(e, o, s) {
  var n = s - 1,
    r = e.length;
  while (++n < r) if (e[n] === o) return n;
  return -1;
}
//@ chunk-ktpw8eqa.js:466-474 placement
var f = b;
//@ chunk-ktpw8eqa.js:474-523 placement
function E(e, o, s) {
  return o === o ? f(e, o, s) : y(e, R, s);
}
//@ chunk-ktpw8eqa.js:523-531 placement
var _ = E;
//@ chunk-ktpw8eqa.js:531-595 placement
function g(e, o) {
  var s = e == null ? 0 : e.length;
  return !!s && _(e, o, 0) > -1;
}
//@ chunk-ktpw8eqa.js:595-603 placement
var k = g;
//@ chunk-ktpw8eqa.js:603-694 placement
function D(e, o, s) {
  var n = -1,
    r = e == null ? 0 : e.length;
  while (++n < r) if (s(o, e[n])) return !0;
  return !1;
}
//@ chunk-ktpw8eqa.js:694-702 placement
var O = D;
//@ chunk-ktpw8eqa.js:702-716 placement
function I() {}
//@ chunk-ktpw8eqa.js:716-726 placement
var Bct = I;
//@ chunk-ktpw8eqa.js:726-813 placement
var x = 1 / 0,
  C = !(UMt && 1 / dDn(new UMt([, -0]))[1] == x)
    ? Bct
    : function (e) {
        return new UMt(e);
      },
  S = C;
//@ chunk-ktpw8eqa.js:813-823 placement
var N = 200;
//@ chunk-ktpw8eqa.js:823-1175 placement
function T(e, o, s) {
  var n = -1,
    r = k,
    i = e.length,
    u = !0,
    l = [],
    t = l;
  if (s) ((u = !1), (r = O));
  else if (i >= N) {
    var p = o ? null : S(e);
    if (p) return dDn(p);
    ((u = !1), (r = edo), (t = new Zlo()));
  } else t = o ? [] : l;
  e: while (++n < i) {
    var a = e[n],
      c = o ? o(a) : a;
    if (((a = s || a !== 0 ? a : 0), u && c === c)) {
      var m = t.length;
      while (m--) if (t[m] === c) continue e;
      if (o) t.push(c);
      l.push(a);
    } else if (!r(t, c, s)) {
      if (t !== l) t.push(c);
      l.push(a);
    }
  }
  return l;
}
//@ chunk-ktpw8eqa.js:1175-1185 placement
var CJt = T;
//@ chunk-ktpw8eqa.js:1185-1238 placement
function v(e, o) {
  return e && e.length ? CJt(e, nz(o, 2)) : [];
}
//@ chunk-ktpw8eqa.js:1238-1247 placement
var Ji = v;

export { Ji, Bct, CJt };
