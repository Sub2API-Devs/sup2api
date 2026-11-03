/**
 * lodash.includes/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash.includes@4.3.0
 * pieces: chunk-mrx6y2r5.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../runtime/bun-runtime.js";

//@ chunk-mrx6y2r5.js:10340-13288 cjs-fingerprint
var of = x(function (cL, nf) {
  var Zh = 1 / 0,
    tf = 9007199254740991,
    Py = 179769313486231570000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000,
    ef = NaN,
    Oy = "[object Arguments]",
    Ny = "[object Function]",
    xy = "[object GeneratorFunction]",
    My = "[object String]",
    Dy = "[object Symbol]",
    Uy = /^\s+|\s+$/g,
    Ly = /^[-+]0x[0-9a-f]+$/i,
    Hy = /^0b[01]+$/i,
    Fy = /^0o[0-7]+$/i,
    $y = /^(?:0|[1-9]\d*)$/,
    By = parseInt;
  function zy(e, t) {
    var r = -1,
      n = e ? e.length : 0,
      o = Array(n);
    while (++r < n) o[r] = t(e[r], r, e);
    return o;
  }
  function Gy(e, t, r, n) {
    var o = e.length,
      i = r + (n ? 1 : -1);
    while (n ? i-- : ++i < o) if (t(e[i], i, e)) return i;
    return -1;
  }
  function qy(e, t, r) {
    if (t !== t) return Gy(e, Ky, r);
    var n = r - 1,
      o = e.length;
    while (++n < o) if (e[n] === t) return n;
    return -1;
  }
  function Ky(e) {
    return e !== e;
  }
  function jy(e, t) {
    var r = -1,
      n = Array(e);
    while (++r < e) n[r] = t(r);
    return n;
  }
  function Yy(e, t) {
    return zy(t, function (r) {
      return e[r];
    });
  }
  function Wy(e, t) {
    return function (r) {
      return e(t(r));
    };
  }
  var us = Object.prototype,
    { hasOwnProperty: hasOwnProperty, toString: toString, propertyIsEnumerable: propertyIsEnumerable } = us,
    Jy = Wy(Object.keys, Object),
    max = Math.max;
  function Zy(e, t) {
    var r = isArray(e) || oT(e) ? jy(e.length, String) : [],
      n = r.length,
      o = !!n;
    for (var key in e)
      if ((t || hasOwnProperty.call(e, key)) && !(o && (key == "length" || tT(key, n)))) r.push(key);
    return r;
  }
  function eT(e) {
    if (!rT(e)) return Jy(e);
    var t = [];
    for (var key in Object(e)) if (hasOwnProperty.call(e, key) && key != "constructor") t.push(key);
    return t;
  }
  function tT(e, t) {
    return (
      (t = t == null ? tf : t),
      !!t && (typeof e == "number" || $y.test(e)) && e > -1 && e % 1 == 0 && e < t
    );
  }
  function rT(e) {
    var t = e && e.constructor,
      r = (typeof t == "function" && t.prototype) || us;
    return e === r;
  }
  function nT(e, t, r, n) {
    ((e = pc(e) ? e : mT(e)), (r = r && !n ? uT(r) : 0));
    var o = e.length;
    if (r < 0) r = max(o + r, 0);
    return cT(e) ? r <= o && e.indexOf(t, r) > -1 : !!o && qy(e, t, r) > -1;
  }
  function oT(e) {
    return (
      iT(e) &&
      hasOwnProperty.call(e, "callee") &&
      (!propertyIsEnumerable.call(e, "callee") || toString.call(e) == Oy)
    );
  }
  var isArray = Array.isArray;
  function pc(e) {
    return e != null && aT(e.length) && !sT(e);
  }
  function iT(e) {
    return gc(e) && pc(e);
  }
  function sT(e) {
    var t = fc(e) ? toString.call(e) : "";
    return t == Ny || t == xy;
  }
  function aT(e) {
    return typeof e == "number" && e > -1 && e % 1 == 0 && e <= tf;
  }
  function fc(e) {
    var t = typeof e;
    return !!e && (t == "object" || t == "function");
  }
  function gc(e) {
    return !!e && typeof e == "object";
  }
  function cT(e) {
    return typeof e == "string" || (!isArray(e) && gc(e) && toString.call(e) == My);
  }
  function lT(e) {
    return typeof e == "symbol" || (gc(e) && toString.call(e) == Dy);
  }
  function dT(e) {
    if (!e) return e === 0 ? e : 0;
    if (((e = hT(e)), e === Zh || e === -Zh)) {
      var t = e < 0 ? -1 : 1;
      return t * Py;
    }
    return e === e ? e : 0;
  }
  function uT(e) {
    var t = dT(e),
      r = t % 1;
    return t === t ? (r ? t - r : t) : 0;
  }
  function hT(e) {
    if (typeof e == "number") return e;
    if (lT(e)) return ef;
    if (fc(e)) {
      var t = typeof e.valueOf == "function" ? e.valueOf() : e;
      e = fc(t) ? t + "" : t;
    }
    if (typeof e != "string") return e === 0 ? e : +e;
    e = e.replace(Uy, "");
    var matches = Hy.test(e);
    return matches || Fy.test(e) ? By(e.slice(2), matches ? 2 : 8) : Ly.test(e) ? ef : +e;
  }
  function fT(e) {
    return pc(e) ? Zy(e) : eT(e);
  }
  function mT(e) {
    return e ? Yy(e, fT(e)) : [];
  }
  nf.exports = nT;
});

export { of };
