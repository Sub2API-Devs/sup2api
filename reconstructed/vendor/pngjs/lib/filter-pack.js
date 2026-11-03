/**
 * pngjs/lib/filter-pack.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: pngjs@5.0.0
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { ut } from "./paeth-predictor.js";

//@ chunk-spjgqa4y.js:39166-40773 cjs-fingerprint
var Zr = x(function (Zl, Qr) {
  var Jr = ut();
  function Wo(t, e, r, n, i) {
    for (let o = 0; o < r; o++) n[i + o] = t[e + o];
  }
  function jo(t, e, r) {
    let n = 0,
      i = e + r;
    for (let o = e; o < i; o++) n += Math.abs(t[o]);
    return n;
  }
  function Jo(t, e, r, n, i, o) {
    for (let s = 0; s < r; s++) {
      let l = s >= o ? t[e + s - o] : 0,
        u = t[e + s] - l;
      n[i + s] = u;
    }
  }
  function Qo(t, e, r, n) {
    let i = 0;
    for (let o = 0; o < r; o++) {
      let s = o >= n ? t[e + o - n] : 0,
        l = t[e + o] - s;
      i += Math.abs(l);
    }
    return i;
  }
  function Zo(t, e, r, n, i) {
    for (let o = 0; o < r; o++) {
      let s = e > 0 ? t[e + o - r] : 0,
        l = t[e + o] - s;
      n[i + o] = l;
    }
  }
  function $o(t, e, r) {
    let n = 0,
      i = e + r;
    for (let o = e; o < i; o++) {
      let s = e > 0 ? t[o - r] : 0,
        l = t[o] - s;
      n += Math.abs(l);
    }
    return n;
  }
  function Xo(t, e, r, n, i, o) {
    for (let s = 0; s < r; s++) {
      let l = s >= o ? t[e + s - o] : 0,
        u = e > 0 ? t[e + s - r] : 0,
        f = t[e + s] - ((l + u) >> 1);
      n[i + s] = f;
    }
  }
  function es(t, e, r, n) {
    let i = 0;
    for (let o = 0; o < r; o++) {
      let s = o >= n ? t[e + o - n] : 0,
        l = e > 0 ? t[e + o - r] : 0,
        u = t[e + o] - ((s + l) >> 1);
      i += Math.abs(u);
    }
    return i;
  }
  function ts(t, e, r, n, i, o) {
    for (let s = 0; s < r; s++) {
      let l = s >= o ? t[e + s - o] : 0,
        u = e > 0 ? t[e + s - r] : 0,
        f = e > 0 && s >= o ? t[e + s - (r + o)] : 0,
        a = t[e + s] - Jr(l, u, f);
      n[i + s] = a;
    }
  }
  function rs(t, e, r, n) {
    let i = 0;
    for (let o = 0; o < r; o++) {
      let s = o >= n ? t[e + o - n] : 0,
        l = e > 0 ? t[e + o - r] : 0,
        u = e > 0 && o >= n ? t[e + o - (r + n)] : 0,
        f = t[e + o] - Jr(s, l, u);
      i += Math.abs(f);
    }
    return i;
  }
  var ns = { 0: Wo, 1: Jo, 2: Zo, 3: Xo, 4: ts },
    is = { 0: jo, 1: Qo, 2: $o, 3: es, 4: rs };
  Qr.exports = function (t, e, r, n, i) {
    let o;
    if (!("filterType" in n) || n.filterType === -1) o = [0, 1, 2, 3, 4];
    else if (typeof n.filterType === "number") o = [n.filterType];
    else throw Error("unrecognised filter types");
    if (n.bitDepth === 16) i *= 2;
    let s = e * i,
      l = 0,
      u = 0,
      alloc = Buffer.alloc((s + 1) * r),
      a = o[0];
    for (let h = 0; h < r; h++) {
      if (o.length > 1) {
        let c = 1 / 0;
        for (let p = 0; p < o.length; p++) {
          let _ = is[o[p]](t, u, s, i);
          if (_ < c) ((a = o[p]), (c = _));
        }
      }
      ((alloc[l] = a), l++, ns[a](t, u, s, alloc, l, i), (l += s), (u += s));
    }
    return alloc;
  };
});

export { Zr };
