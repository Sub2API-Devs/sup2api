/**
 * node-forge/lib/jsbn.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: node-forge@1.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { Tn } from "./forge.js";

//@ chunk-fq0cr76a.js:92952-112817 cjs-fingerprint
var Ef = x(function (vfe, zT) {
  var mS = Tn();
  zT.exports = mS.jsbn = mS.jsbn || {};
  var fa,
    k3 = 244837814094590,
    GT = (k3 & 16777215) == 15715070;
  function et(e, n, r) {
    if (((this.data = []), e != null))
      if (typeof e == "number") this.fromNumber(e, n, r);
      else if (n == null && typeof e != "string") this.fromString(e, 256);
      else this.fromString(e, n);
  }
  mS.jsbn.BigInteger = et;
  function jn() {
    return new et(null);
  }
  function D3(e, n, r, s, h, y) {
    while (--y >= 0) {
      var b = n * this.data[e++] + r.data[s] + h;
      ((h = Math.floor(b / 67108864)), (r.data[s++] = b & 67108863));
    }
    return h;
  }
  function O3(e, n, r, s, h, y) {
    var b = n & 32767,
      S = n >> 15;
    while (--y >= 0) {
      var w = this.data[e] & 32767,
        R = this.data[e++] >> 15,
        D = S * w + R * b;
      ((w = b * w + ((D & 32767) << 15) + r.data[s] + (h & 1073741823)),
        (h = (w >>> 30) + (D >>> 15) + S * R + (h >>> 30)),
        (r.data[s++] = w & 1073741823));
    }
    return h;
  }
  function HT(e, n, r, s, h, y) {
    var b = n & 16383,
      S = n >> 14;
    while (--y >= 0) {
      var w = this.data[e] & 16383,
        R = this.data[e++] >> 14,
        D = S * w + R * b;
      ((w = b * w + ((D & 16383) << 14) + r.data[s] + h),
        (h = (w >> 28) + (D >> 14) + S * R),
        (r.data[s++] = w & 268435455));
    }
    return h;
  }
  if (typeof navigator > "u") ((et.prototype.am = HT), (fa = 28));
  else if (GT && navigator.appName == "Microsoft Internet Explorer") ((et.prototype.am = O3), (fa = 30));
  else if (GT && navigator.appName != "Netscape") ((et.prototype.am = D3), (fa = 26));
  else ((et.prototype.am = HT), (fa = 28));
  et.prototype.DB = fa;
  et.prototype.DM = (1 << fa) - 1;
  et.prototype.DV = 1 << fa;
  var gS = 52;
  et.prototype.FV = Math.pow(2, gS);
  et.prototype.F1 = gS - fa;
  et.prototype.F2 = 2 * fa - gS;
  var P3 = "0123456789abcdefghijklmnopqrstuvwxyz",
    Qh = [],
    au,
    Ri;
  au = 48;
  for (Ri = 0; Ri <= 9; ++Ri) Qh[au++] = Ri;
  au = 97;
  for (Ri = 10; Ri < 36; ++Ri) Qh[au++] = Ri;
  au = 65;
  for (Ri = 10; Ri < 36; ++Ri) Qh[au++] = Ri;
  function KT(e) {
    return P3.charAt(e);
  }
  function qT(e, n) {
    var r = Qh[e.charCodeAt(n)];
    return r == null ? -1 : r;
  }
  function L3(e) {
    for (var n = this.t - 1; n >= 0; --n) e.data[n] = this.data[n];
    ((e.t = this.t), (e.s = this.s));
  }
  function B3(e) {
    if (((this.t = 1), (this.s = e < 0 ? -1 : 0), e > 0)) this.data[0] = e;
    else if (e < -1) this.data[0] = e + this.DV;
    else this.t = 0;
  }
  function Qa(e) {
    var n = jn();
    return (n.fromInt(e), n);
  }
  function U3(e, n) {
    var r;
    if (n == 16) r = 4;
    else if (n == 8) r = 3;
    else if (n == 256) r = 8;
    else if (n == 2) r = 1;
    else if (n == 32) r = 5;
    else if (n == 4) r = 2;
    else {
      this.fromRadix(e, n);
      return;
    }
    ((this.t = 0), (this.s = 0));
    var s = e.length,
      h = !1,
      y = 0;
    while (--s >= 0) {
      var b = r == 8 ? e[s] & 255 : qT(e, s);
      if (b < 0) {
        if (e.charAt(s) == "-") h = !0;
        continue;
      }
      if (((h = !1), y == 0)) this.data[this.t++] = b;
      else if (y + r > this.DB)
        ((this.data[this.t - 1] |= (b & ((1 << (this.DB - y)) - 1)) << y),
          (this.data[this.t++] = b >> (this.DB - y)));
      else this.data[this.t - 1] |= b << y;
      if (((y += r), y >= this.DB)) y -= this.DB;
    }
    if (r == 8 && (e[0] & 128) != 0) {
      if (((this.s = -1), y > 0)) this.data[this.t - 1] |= ((1 << (this.DB - y)) - 1) << y;
    }
    if ((this.clamp(), h)) et.ZERO.subTo(this, this);
  }
  function F3() {
    var e = this.s & this.DM;
    while (this.t > 0 && this.data[this.t - 1] == e) --this.t;
  }
  function M3(e) {
    if (this.s < 0) return "-" + this.negate().toString(e);
    var n;
    if (e == 16) n = 4;
    else if (e == 8) n = 3;
    else if (e == 2) n = 1;
    else if (e == 32) n = 5;
    else if (e == 4) n = 2;
    else return this.toRadix(e);
    var r = (1 << n) - 1,
      s,
      h = !1,
      y = "",
      b = this.t,
      S = this.DB - ((b * this.DB) % n);
    if (b-- > 0) {
      if (S < this.DB && (s = this.data[b] >> S) > 0) ((h = !0), (y = KT(s)));
      while (b >= 0) {
        if (S < n)
          ((s = (this.data[b] & ((1 << S) - 1)) << (n - S)), (s |= this.data[--b] >> (S += this.DB - n)));
        else if (((s = (this.data[b] >> (S -= n)) & r), S <= 0)) ((S += this.DB), --b);
        if (s > 0) h = !0;
        if (h) y += KT(s);
      }
    }
    return h ? y : "0";
  }
  function $3() {
    var e = jn();
    return (et.ZERO.subTo(this, e), e);
  }
  function V3() {
    return this.s < 0 ? this.negate() : this;
  }
  function W3(e) {
    var n = this.s - e.s;
    if (n != 0) return n;
    var r = this.t;
    if (((n = r - e.t), n != 0)) return this.s < 0 ? -n : n;
    while (--r >= 0) if ((n = this.data[r] - e.data[r]) != 0) return n;
    return 0;
  }
  function em(e) {
    var n = 1,
      r;
    if ((r = e >>> 16) != 0) ((e = r), (n += 16));
    if ((r = e >> 8) != 0) ((e = r), (n += 8));
    if ((r = e >> 4) != 0) ((e = r), (n += 4));
    if ((r = e >> 2) != 0) ((e = r), (n += 2));
    if ((r = e >> 1) != 0) ((e = r), (n += 1));
    return n;
  }
  function G3() {
    if (this.t <= 0) return 0;
    return this.DB * (this.t - 1) + em(this.data[this.t - 1] ^ (this.s & this.DM));
  }
  function H3(e, n) {
    var r;
    for (r = this.t - 1; r >= 0; --r) n.data[r + e] = this.data[r];
    for (r = e - 1; r >= 0; --r) n.data[r] = 0;
    ((n.t = this.t + e), (n.s = this.s));
  }
  function K3(e, n) {
    for (var r = e; r < this.t; ++r) n.data[r - e] = this.data[r];
    ((n.t = Math.max(this.t - e, 0)), (n.s = this.s));
  }
  function q3(e, n) {
    var r = e % this.DB,
      s = this.DB - r,
      h = (1 << s) - 1,
      floored = Math.floor(e / this.DB),
      b = (this.s << r) & this.DM,
      S;
    for (S = this.t - 1; S >= 0; --S)
      ((n.data[S + floored + 1] = (this.data[S] >> s) | b), (b = (this.data[S] & h) << r));
    for (S = floored - 1; S >= 0; --S) n.data[S] = 0;
    ((n.data[floored] = b), (n.t = this.t + floored + 1), (n.s = this.s), n.clamp());
  }
  function j3(e, n) {
    n.s = this.s;
    var floored = Math.floor(e / this.DB);
    if (floored >= this.t) {
      n.t = 0;
      return;
    }
    var s = e % this.DB,
      h = this.DB - s,
      y = (1 << s) - 1;
    n.data[0] = this.data[floored] >> s;
    for (var b = floored + 1; b < this.t; ++b)
      ((n.data[b - floored - 1] |= (this.data[b] & y) << h), (n.data[b - floored] = this.data[b] >> s));
    if (s > 0) n.data[this.t - floored - 1] |= (this.s & y) << h;
    ((n.t = this.t - floored), n.clamp());
  }
  function Y3(e, n) {
    var r = 0,
      s = 0,
      min = Math.min(e.t, this.t);
    while (r < min) ((s += this.data[r] - e.data[r]), (n.data[r++] = s & this.DM), (s >>= this.DB));
    if (e.t < this.t) {
      s -= e.s;
      while (r < this.t) ((s += this.data[r]), (n.data[r++] = s & this.DM), (s >>= this.DB));
      s += this.s;
    } else {
      s += this.s;
      while (r < e.t) ((s -= e.data[r]), (n.data[r++] = s & this.DM), (s >>= this.DB));
      s -= e.s;
    }
    if (((n.s = s < 0 ? -1 : 0), s < -1)) n.data[r++] = this.DV + s;
    else if (s > 0) n.data[r++] = s;
    ((n.t = r), n.clamp());
  }
  function Z3(e, n) {
    var abs = this.abs(),
      abs_2 = e.abs(),
      h = abs.t;
    n.t = h + abs_2.t;
    while (--h >= 0) n.data[h] = 0;
    for (h = 0; h < abs_2.t; ++h) n.data[h + abs.t] = abs.am(0, abs_2.data[h], n, h, 0, abs.t);
    if (((n.s = 0), n.clamp(), this.s != e.s)) et.ZERO.subTo(n, n);
  }
  function z3(e) {
    var abs = this.abs(),
      r = (e.t = 2 * abs.t);
    while (--r >= 0) e.data[r] = 0;
    for (r = 0; r < abs.t - 1; ++r) {
      var am = abs.am(r, abs.data[r], e, 2 * r, 0, 1);
      if ((e.data[r + abs.t] += abs.am(r + 1, 2 * abs.data[r], e, 2 * r + 1, am, abs.t - r - 1)) >= abs.DV)
        ((e.data[r + abs.t] -= abs.DV), (e.data[r + abs.t + 1] = 1));
    }
    if (e.t > 0) e.data[e.t - 1] += abs.am(r, abs.data[r], e, 2 * r, 0, 1);
    ((e.s = 0), e.clamp());
  }
  function X3(e, n, r) {
    var abs = e.abs();
    if (abs.t <= 0) return;
    var abs_2 = this.abs();
    if (abs_2.t < abs.t) {
      if (n != null) n.fromInt(0);
      if (r != null) this.copyTo(r);
      return;
    }
    if (r == null) r = jn();
    var y = jn(),
      b = this.s,
      S = e.s,
      w = this.DB - em(abs.data[abs.t - 1]);
    if (w > 0) (abs.lShiftTo(w, y), abs_2.lShiftTo(w, r));
    else (abs.copyTo(y), abs_2.copyTo(r));
    var R = y.t,
      D = y.data[R - 1];
    if (D == 0) return;
    var O = D * (1 << this.F1) + (R > 1 ? y.data[R - 2] >> this.F2 : 0),
      L = this.FV / O,
      V = (1 << this.F1) / O,
      K = 1 << this.F2,
      q = r.t,
      Z = q - R,
      J = n == null ? jn() : n;
    if ((y.dlShiftTo(Z, J), r.compareTo(J) >= 0)) ((r.data[r.t++] = 1), r.subTo(J, r));
    (et.ONE.dlShiftTo(R, J), J.subTo(y, y));
    while (y.t < R) y.data[y.t++] = 0;
    while (--Z >= 0) {
      var ie = r.data[--q] == D ? this.DM : Math.floor(r.data[q] * L + (r.data[q - 1] + K) * V);
      if ((r.data[q] += y.am(0, ie, r, Z, 0, R)) < ie) {
        (y.dlShiftTo(Z, J), r.subTo(J, r));
        while (r.data[q] < --ie) r.subTo(J, r);
      }
    }
    if (n != null) {
      if ((r.drShiftTo(R, n), b != S)) et.ZERO.subTo(n, n);
    }
    if (((r.t = R), r.clamp(), w > 0)) r.rShiftTo(w, r);
    if (b < 0) et.ZERO.subTo(r, r);
  }
  function J3(e) {
    var n = jn();
    if ((this.abs().divRemTo(e, null, n), this.s < 0 && n.compareTo(et.ZERO) > 0)) e.subTo(n, n);
    return n;
  }
  function ic(e) {
    this.m = e;
  }
  function Q3(e) {
    if (e.s < 0 || e.compareTo(this.m) >= 0) return e.mod(this.m);
    else return e;
  }
  function eW(e) {
    return e;
  }
  function tW(e) {
    e.divRemTo(this.m, null, e);
  }
  function nW(e, n, r) {
    (e.multiplyTo(n, r), this.reduce(r));
  }
  function rW(e, n) {
    (e.squareTo(n), this.reduce(n));
  }
  ic.prototype.convert = Q3;
  ic.prototype.revert = eW;
  ic.prototype.reduce = tW;
  ic.prototype.mulTo = nW;
  ic.prototype.sqrTo = rW;
  function sW() {
    if (this.t < 1) return 0;
    var e = this.data[0];
    if ((e & 1) == 0) return 0;
    var n = e & 3;
    return (
      (n = (n * (2 - (e & 15) * n)) & 15),
      (n = (n * (2 - (e & 255) * n)) & 255),
      (n = (n * (2 - (((e & 65535) * n) & 65535))) & 65535),
      (n = (n * (2 - ((e * n) % this.DV))) % this.DV),
      n > 0 ? this.DV - n : -n
    );
  }
  function oc(e) {
    ((this.m = e),
      (this.mp = e.invDigit()),
      (this.mpl = this.mp & 32767),
      (this.mph = this.mp >> 15),
      (this.um = (1 << (e.DB - 15)) - 1),
      (this.mt2 = 2 * e.t));
  }
  function iW(e) {
    var n = jn();
    if ((e.abs().dlShiftTo(this.m.t, n), n.divRemTo(this.m, null, n), e.s < 0 && n.compareTo(et.ZERO) > 0))
      this.m.subTo(n, n);
    return n;
  }
  function oW(e) {
    var n = jn();
    return (e.copyTo(n), this.reduce(n), n);
  }
  function aW(e) {
    while (e.t <= this.mt2) e.data[e.t++] = 0;
    for (var n = 0; n < this.m.t; ++n) {
      var r = e.data[n] & 32767,
        s = (r * this.mpl + (((r * this.mph + (e.data[n] >> 15) * this.mpl) & this.um) << 15)) & e.DM;
      ((r = n + this.m.t), (e.data[r] += this.m.am(0, s, e, n, 0, this.m.t)));
      while (e.data[r] >= e.DV) ((e.data[r] -= e.DV), e.data[++r]++);
    }
    if ((e.clamp(), e.drShiftTo(this.m.t, e), e.compareTo(this.m) >= 0)) e.subTo(this.m, e);
  }
  function lW(e, n) {
    (e.squareTo(n), this.reduce(n));
  }
  function cW(e, n, r) {
    (e.multiplyTo(n, r), this.reduce(r));
  }
  oc.prototype.convert = iW;
  oc.prototype.revert = oW;
  oc.prototype.reduce = aW;
  oc.prototype.mulTo = cW;
  oc.prototype.sqrTo = lW;
  function uW() {
    return (this.t > 0 ? this.data[0] & 1 : this.s) == 0;
  }
  function dW(e, n) {
    if (e > 4294967295 || e < 1) return et.ONE;
    var r = jn(),
      s = jn(),
      convert = n.convert(this),
      y = em(e) - 1;
    convert.copyTo(r);
    while (--y >= 0)
      if ((n.sqrTo(r, s), (e & (1 << y)) > 0)) n.mulTo(s, convert, r);
      else {
        var b = r;
        ((r = s), (s = b));
      }
    return n.revert(r);
  }
  function fW(e, n) {
    var r;
    if (e < 256 || n.isEven()) r = new ic(n);
    else r = new oc(n);
    return this.exp(e, r);
  }
  et.prototype.copyTo = L3;
  et.prototype.fromInt = B3;
  et.prototype.fromString = U3;
  et.prototype.clamp = F3;
  et.prototype.dlShiftTo = H3;
  et.prototype.drShiftTo = K3;
  et.prototype.lShiftTo = q3;
  et.prototype.rShiftTo = j3;
  et.prototype.subTo = Y3;
  et.prototype.multiplyTo = Z3;
  et.prototype.squareTo = z3;
  et.prototype.divRemTo = X3;
  et.prototype.invDigit = sW;
  et.prototype.isEven = uW;
  et.prototype.exp = dW;
  et.prototype.toString = M3;
  et.prototype.negate = $3;
  et.prototype.abs = V3;
  et.prototype.compareTo = W3;
  et.prototype.bitLength = G3;
  et.prototype.mod = J3;
  et.prototype.modPowInt = fW;
  et.ZERO = Qa(0);
  et.ONE = Qa(1);
  function pW() {
    var e = jn();
    return (this.copyTo(e), e);
  }
  function hW() {
    if (this.s < 0) {
      if (this.t == 1) return this.data[0] - this.DV;
      else if (this.t == 0) return -1;
    } else if (this.t == 1) return this.data[0];
    else if (this.t == 0) return 0;
    return ((this.data[1] & ((1 << (32 - this.DB)) - 1)) << this.DB) | this.data[0];
  }
  function mW() {
    return this.t == 0 ? this.s : (this.data[0] << 24) >> 24;
  }
  function gW() {
    return this.t == 0 ? this.s : (this.data[0] << 16) >> 16;
  }
  function yW(e) {
    return Math.floor((Math.LN2 * this.DB) / Math.log(e));
  }
  function bW() {
    if (this.s < 0) return -1;
    else if (this.t <= 0 || (this.t == 1 && this.data[0] <= 0)) return 0;
    else return 1;
  }
  function SW(e) {
    if (e == null) e = 10;
    if (this.signum() == 0 || e < 2 || e > 36) return "0";
    var chunkSize = this.chunkSize(e),
      pow = Math.pow(e, chunkSize),
      s = Qa(pow),
      h = jn(),
      y = jn(),
      b = "";
    this.divRemTo(s, h, y);
    while (h.signum() > 0) ((b = (pow + y.intValue()).toString(e).substr(1) + b), h.divRemTo(s, h, y));
    return y.intValue().toString(e) + b;
  }
  function EW(e, n) {
    if ((this.fromInt(0), n == null)) n = 10;
    var chunkSize = this.chunkSize(n),
      pow = Math.pow(n, chunkSize),
      h = !1,
      y = 0,
      b = 0;
    for (var S = 0; S < e.length; ++S) {
      var w = qT(e, S);
      if (w < 0) {
        if (e.charAt(S) == "-" && this.signum() == 0) h = !0;
        continue;
      }
      if (((b = n * b + w), ++y >= chunkSize)) (this.dMultiply(pow), this.dAddOffset(b, 0), (y = 0), (b = 0));
    }
    if (y > 0) (this.dMultiply(Math.pow(n, y)), this.dAddOffset(b, 0));
    if (h) et.ZERO.subTo(this, this);
  }
  function xW(e, n, r) {
    if (typeof n == "number")
      if (e < 2) this.fromInt(1);
      else {
        if ((this.fromNumber(e, r), !this.testBit(e - 1))) this.bitwiseTo(et.ONE.shiftLeft(e - 1), yS, this);
        if (this.isEven()) this.dAddOffset(1, 0);
        while (!this.isProbablePrime(n))
          if ((this.dAddOffset(2, 0), this.bitLength() > e)) this.subTo(et.ONE.shiftLeft(e - 1), this);
      }
    else {
      var s = [],
        h = e & 7;
      if (((s.length = (e >> 3) + 1), n.nextBytes(s), h > 0)) s[0] &= (1 << h) - 1;
      else s[0] = 0;
      this.fromString(s, 256);
    }
  }
  function _W() {
    var e = this.t,
      n = [];
    n[0] = this.s;
    var r = this.DB - ((e * this.DB) % 8),
      s,
      h = 0;
    if (e-- > 0) {
      if (r < this.DB && (s = this.data[e] >> r) != (this.s & this.DM) >> r)
        n[h++] = s | (this.s << (this.DB - r));
      while (e >= 0) {
        if (r < 8)
          ((s = (this.data[e] & ((1 << r) - 1)) << (8 - r)), (s |= this.data[--e] >> (r += this.DB - 8)));
        else if (((s = (this.data[e] >> (r -= 8)) & 255), r <= 0)) ((r += this.DB), --e);
        if ((s & 128) != 0) s |= -256;
        if (h == 0 && (this.s & 128) != (s & 128)) ++h;
        if (h > 0 || s != this.s) n[h++] = s;
      }
    }
    return n;
  }
  function vW(e) {
    return this.compareTo(e) == 0;
  }
  function wW(e) {
    return this.compareTo(e) < 0 ? this : e;
  }
  function TW(e) {
    return this.compareTo(e) > 0 ? this : e;
  }
  function AW(e, n, r) {
    var s,
      h,
      min = Math.min(e.t, this.t);
    for (s = 0; s < min; ++s) r.data[s] = n(this.data[s], e.data[s]);
    if (e.t < this.t) {
      h = e.s & this.DM;
      for (s = min; s < this.t; ++s) r.data[s] = n(this.data[s], h);
      r.t = this.t;
    } else {
      h = this.s & this.DM;
      for (s = min; s < e.t; ++s) r.data[s] = n(h, e.data[s]);
      r.t = e.t;
    }
    ((r.s = n(this.s, e.s)), r.clamp());
  }
  function CW(e, n) {
    return e & n;
  }
  function RW(e) {
    var n = jn();
    return (this.bitwiseTo(e, CW, n), n);
  }
  function yS(e, n) {
    return e | n;
  }
  function IW(e) {
    var n = jn();
    return (this.bitwiseTo(e, yS, n), n);
  }
  function jT(e, n) {
    return e ^ n;
  }
  function NW(e) {
    var n = jn();
    return (this.bitwiseTo(e, jT, n), n);
  }
  function YT(e, n) {
    return e & ~n;
  }
  function kW(e) {
    var n = jn();
    return (this.bitwiseTo(e, YT, n), n);
  }
  function DW() {
    var e = jn();
    for (var n = 0; n < this.t; ++n) e.data[n] = this.DM & ~this.data[n];
    return ((e.t = this.t), (e.s = ~this.s), e);
  }
  function OW(e) {
    var n = jn();
    if (e < 0) this.rShiftTo(-e, n);
    else this.lShiftTo(e, n);
    return n;
  }
  function PW(e) {
    var n = jn();
    if (e < 0) this.lShiftTo(-e, n);
    else this.rShiftTo(e, n);
    return n;
  }
  function LW(e) {
    if (e == 0) return -1;
    var n = 0;
    if ((e & 65535) == 0) ((e >>= 16), (n += 16));
    if ((e & 255) == 0) ((e >>= 8), (n += 8));
    if ((e & 15) == 0) ((e >>= 4), (n += 4));
    if ((e & 3) == 0) ((e >>= 2), (n += 2));
    if ((e & 1) == 0) ++n;
    return n;
  }
  function BW() {
    for (var e = 0; e < this.t; ++e) if (this.data[e] != 0) return e * this.DB + LW(this.data[e]);
    if (this.s < 0) return this.t * this.DB;
    return -1;
  }
  function UW(e) {
    var n = 0;
    while (e != 0) ((e &= e - 1), ++n);
    return n;
  }
  function FW() {
    var e = 0,
      n = this.s & this.DM;
    for (var r = 0; r < this.t; ++r) e += UW(this.data[r] ^ n);
    return e;
  }
  function MW(e) {
    var floored = Math.floor(e / this.DB);
    if (floored >= this.t) return this.s != 0;
    return (this.data[floored] & (1 << (e % this.DB))) != 0;
  }
  function $W(e, n) {
    var shiftLeft = et.ONE.shiftLeft(e);
    return (this.bitwiseTo(shiftLeft, n, shiftLeft), shiftLeft);
  }
  function VW(e) {
    return this.changeBit(e, yS);
  }
  function WW(e) {
    return this.changeBit(e, YT);
  }
  function GW(e) {
    return this.changeBit(e, jT);
  }
  function HW(e, n) {
    var r = 0,
      s = 0,
      min = Math.min(e.t, this.t);
    while (r < min) ((s += this.data[r] + e.data[r]), (n.data[r++] = s & this.DM), (s >>= this.DB));
    if (e.t < this.t) {
      s += e.s;
      while (r < this.t) ((s += this.data[r]), (n.data[r++] = s & this.DM), (s >>= this.DB));
      s += this.s;
    } else {
      s += this.s;
      while (r < e.t) ((s += e.data[r]), (n.data[r++] = s & this.DM), (s >>= this.DB));
      s += e.s;
    }
    if (((n.s = s < 0 ? -1 : 0), s > 0)) n.data[r++] = s;
    else if (s < -1) n.data[r++] = this.DV + s;
    ((n.t = r), n.clamp());
  }
  function KW(e) {
    var n = jn();
    return (this.addTo(e, n), n);
  }
  function qW(e) {
    var n = jn();
    return (this.subTo(e, n), n);
  }
  function jW(e) {
    var n = jn();
    return (this.multiplyTo(e, n), n);
  }
  function YW() {
    var e = jn();
    return (this.squareTo(e), e);
  }
  function ZW(e) {
    var n = jn();
    return (this.divRemTo(e, n, null), n);
  }
  function zW(e) {
    var n = jn();
    return (this.divRemTo(e, null, n), n);
  }
  function XW(e) {
    var n = jn(),
      r = jn();
    return (this.divRemTo(e, n, r), [n, r]);
  }
  function JW(e) {
    ((this.data[this.t] = this.am(0, e - 1, this, 0, 0, this.t)), ++this.t, this.clamp());
  }
  function QW(e, n) {
    if (e == 0) return;
    while (this.t <= n) this.data[this.t++] = 0;
    this.data[n] += e;
    while (this.data[n] >= this.DV) {
      if (((this.data[n] -= this.DV), ++n >= this.t)) this.data[this.t++] = 0;
      ++this.data[n];
    }
  }
  function Sf() {}
  function ZT(e) {
    return e;
  }
  function eG(e, n, r) {
    e.multiplyTo(n, r);
  }
  function tG(e, n) {
    e.squareTo(n);
  }
  Sf.prototype.convert = ZT;
  Sf.prototype.revert = ZT;
  Sf.prototype.mulTo = eG;
  Sf.prototype.sqrTo = tG;
  function nG(e) {
    return this.exp(e, new Sf());
  }
  function rG(e, n, r) {
    var min = Math.min(this.t + e.t, n);
    ((r.s = 0), (r.t = min));
    while (min > 0) r.data[--min] = 0;
    var h;
    for (h = r.t - this.t; min < h; ++min) r.data[min + this.t] = this.am(0, e.data[min], r, min, 0, this.t);
    for (h = Math.min(e.t, n); min < h; ++min) this.am(0, e.data[min], r, min, 0, n - min);
    r.clamp();
  }
  function sG(e, n, r) {
    --n;
    var s = (r.t = this.t + e.t - n);
    r.s = 0;
    while (--s >= 0) r.data[s] = 0;
    for (s = Math.max(n - this.t, 0); s < e.t; ++s)
      r.data[this.t + s - n] = this.am(n - s, e.data[s], r, 0, 0, this.t + s - n);
    (r.clamp(), r.drShiftTo(1, r));
  }
  function lu(e) {
    ((this.r2 = jn()),
      (this.q3 = jn()),
      et.ONE.dlShiftTo(2 * e.t, this.r2),
      (this.mu = this.r2.divide(e)),
      (this.m = e));
  }
  function iG(e) {
    if (e.s < 0 || e.t > 2 * this.m.t) return e.mod(this.m);
    else if (e.compareTo(this.m) < 0) return e;
    else {
      var n = jn();
      return (e.copyTo(n), this.reduce(n), n);
    }
  }
  function oG(e) {
    return e;
  }
  function aG(e) {
    if ((e.drShiftTo(this.m.t - 1, this.r2), e.t > this.m.t + 1)) ((e.t = this.m.t + 1), e.clamp());
    (this.mu.multiplyUpperTo(this.r2, this.m.t + 1, this.q3),
      this.m.multiplyLowerTo(this.q3, this.m.t + 1, this.r2));
    while (e.compareTo(this.r2) < 0) e.dAddOffset(1, this.m.t + 1);
    e.subTo(this.r2, e);
    while (e.compareTo(this.m) >= 0) e.subTo(this.m, e);
  }
  function lG(e, n) {
    (e.squareTo(n), this.reduce(n));
  }
  function cG(e, n, r) {
    (e.multiplyTo(n, r), this.reduce(r));
  }
  lu.prototype.convert = iG;
  lu.prototype.revert = oG;
  lu.prototype.reduce = aG;
  lu.prototype.mulTo = cG;
  lu.prototype.sqrTo = lG;
  function uG(e, n) {
    var bitLength = e.bitLength(),
      s,
      h = Qa(1),
      y;
    if (bitLength <= 0) return h;
    else if (bitLength < 18) s = 1;
    else if (bitLength < 48) s = 3;
    else if (bitLength < 144) s = 4;
    else if (bitLength < 768) s = 5;
    else s = 6;
    if (bitLength < 8) y = new ic(n);
    else if (n.isEven()) y = new lu(n);
    else y = new oc(n);
    var b = [],
      S = 3,
      w = s - 1,
      R = (1 << s) - 1;
    if (((b[1] = y.convert(this)), s > 1)) {
      var D = jn();
      y.sqrTo(b[1], D);
      while (S <= R) ((b[S] = jn()), y.mulTo(D, b[S - 2], b[S]), (S += 2));
    }
    var O = e.t - 1,
      L,
      V = !0,
      K = jn(),
      q;
    bitLength = em(e.data[O]) - 1;
    while (O >= 0) {
      if (bitLength >= w) L = (e.data[O] >> (bitLength - w)) & R;
      else if (((L = (e.data[O] & ((1 << (bitLength + 1)) - 1)) << (w - bitLength)), O > 0))
        L |= e.data[O - 1] >> (this.DB + bitLength - w);
      S = s;
      while ((L & 1) == 0) ((L >>= 1), --S);
      if ((bitLength -= S) < 0) ((bitLength += this.DB), --O);
      if (V) (b[L].copyTo(h), (V = !1));
      else {
        while (S > 1) (y.sqrTo(h, K), y.sqrTo(K, h), (S -= 2));
        if (S > 0) y.sqrTo(h, K);
        else ((q = h), (h = K), (K = q));
        y.mulTo(K, b[L], h);
      }
      while (O >= 0 && (e.data[O] & (1 << bitLength)) == 0)
        if ((y.sqrTo(h, K), (q = h), (h = K), (K = q), --bitLength < 0)) ((bitLength = this.DB - 1), --O);
    }
    return y.revert(h);
  }
  function dG(e) {
    var n = this.s < 0 ? this.negate() : this.clone(),
      r = e.s < 0 ? e.negate() : e.clone();
    if (n.compareTo(r) < 0) {
      var s = n;
      ((n = r), (r = s));
    }
    var lowestSetBit = n.getLowestSetBit(),
      lowestSetBit_2 = r.getLowestSetBit();
    if (lowestSetBit_2 < 0) return n;
    if (lowestSetBit < lowestSetBit_2) lowestSetBit_2 = lowestSetBit;
    if (lowestSetBit_2 > 0) (n.rShiftTo(lowestSetBit_2, n), r.rShiftTo(lowestSetBit_2, r));
    while (n.signum() > 0) {
      if ((lowestSetBit = n.getLowestSetBit()) > 0) n.rShiftTo(lowestSetBit, n);
      if ((lowestSetBit = r.getLowestSetBit()) > 0) r.rShiftTo(lowestSetBit, r);
      if (n.compareTo(r) >= 0) (n.subTo(r, n), n.rShiftTo(1, n));
      else (r.subTo(n, r), r.rShiftTo(1, r));
    }
    if (lowestSetBit_2 > 0) r.lShiftTo(lowestSetBit_2, r);
    return r;
  }
  function fG(e) {
    if (e <= 0) return 0;
    var n = this.DV % e,
      r = this.s < 0 ? e - 1 : 0;
    if (this.t > 0)
      if (n == 0) r = this.data[0] % e;
      else for (var s = this.t - 1; s >= 0; --s) r = (n * r + this.data[s]) % e;
    return r;
  }
  function pG(e) {
    if (this.signum() == 0) return et.ZERO;
    var isEven = e.isEven();
    if ((this.isEven() && isEven) || e.signum() == 0) return et.ZERO;
    var clone = e.clone(),
      clone_2 = this.clone(),
      h = Qa(1),
      y = Qa(0),
      b = Qa(0),
      S = Qa(1);
    while (clone.signum() != 0) {
      while (clone.isEven()) {
        if ((clone.rShiftTo(1, clone), isEven)) {
          if (!h.isEven() || !y.isEven()) (h.addTo(this, h), y.subTo(e, y));
          h.rShiftTo(1, h);
        } else if (!y.isEven()) y.subTo(e, y);
        y.rShiftTo(1, y);
      }
      while (clone_2.isEven()) {
        if ((clone_2.rShiftTo(1, clone_2), isEven)) {
          if (!b.isEven() || !S.isEven()) (b.addTo(this, b), S.subTo(e, S));
          b.rShiftTo(1, b);
        } else if (!S.isEven()) S.subTo(e, S);
        S.rShiftTo(1, S);
      }
      if (clone.compareTo(clone_2) >= 0) {
        if ((clone.subTo(clone_2, clone), isEven)) h.subTo(b, h);
        y.subTo(S, y);
      } else {
        if ((clone_2.subTo(clone, clone_2), isEven)) b.subTo(h, b);
        S.subTo(y, S);
      }
    }
    if (clone_2.compareTo(et.ONE) != 0) return et.ZERO;
    if (S.compareTo(e) >= 0) return S.subtract(e);
    if (S.signum() < 0) S.addTo(e, S);
    else return S;
    if (S.signum() < 0) return S.add(e);
    else return S;
  }
  var Ji = [
      2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101,
      103, 107, 109, 113, 127, 131, 137, 139, 149, 151, 157, 163, 167, 173, 179, 181, 191, 193, 197, 199, 211,
      223, 227, 229, 233, 239, 241, 251, 257, 263, 269, 271, 277, 281, 283, 293, 307, 311, 313, 317, 331, 337,
      347, 349, 353, 359, 367, 373, 379, 383, 389, 397, 401, 409, 419, 421, 431, 433, 439, 443, 449, 457, 461,
      463, 467, 479, 487, 491, 499, 503, 509, 521, 523, 541, 547, 557, 563, 569, 571, 577, 587, 593, 599, 601,
      607, 613, 617, 619, 631, 641, 643, 647, 653, 659, 661, 673, 677, 683, 691, 701, 709, 719, 727, 733, 739,
      743, 751, 757, 761, 769, 773, 787, 797, 809, 811, 821, 823, 827, 829, 839, 853, 857, 859, 863, 877, 881,
      883, 887, 907, 911, 919, 929, 937, 941, 947, 953, 967, 971, 977, 983, 991, 997,
    ],
    hG = 67108864 / Ji[Ji.length - 1];
  function mG(e) {
    var n,
      abs = this.abs();
    if (abs.t == 1 && abs.data[0] <= Ji[Ji.length - 1]) {
      for (n = 0; n < Ji.length; ++n) if (abs.data[0] == Ji[n]) return !0;
      return !1;
    }
    if (abs.isEven()) return !1;
    n = 1;
    while (n < Ji.length) {
      var s = Ji[n],
        h = n + 1;
      while (h < Ji.length && s < hG) s *= Ji[h++];
      s = abs.modInt(s);
      while (n < h) if (s % Ji[n++] == 0) return !1;
    }
    return abs.millerRabin(e);
  }
  function gG(e) {
    var subtract = this.subtract(et.ONE),
      lowestSetBit = subtract.getLowestSetBit();
    if (lowestSetBit <= 0) return !1;
    var shiftRight = subtract.shiftRight(lowestSetBit),
      h = yG(),
      y;
    for (var b = 0; b < e; ++b) {
      do y = new et(this.bitLength(), h);
      while (y.compareTo(et.ONE) <= 0 || y.compareTo(subtract) >= 0);
      var modPow = y.modPow(shiftRight, this);
      if (modPow.compareTo(et.ONE) != 0 && modPow.compareTo(subtract) != 0) {
        var w = 1;
        while (w++ < lowestSetBit && modPow.compareTo(subtract) != 0)
          if (((modPow = modPow.modPowInt(2, this)), modPow.compareTo(et.ONE) == 0)) return !1;
        if (modPow.compareTo(subtract) != 0) return !1;
      }
    }
    return !0;
  }
  function yG() {
    return {
      nextBytes: function (e) {
        for (var n = 0; n < e.length; ++n) e[n] = Math.floor(Math.random() * 256);
      },
    };
  }
  et.prototype.chunkSize = yW;
  et.prototype.toRadix = SW;
  et.prototype.fromRadix = EW;
  et.prototype.fromNumber = xW;
  et.prototype.bitwiseTo = AW;
  et.prototype.changeBit = $W;
  et.prototype.addTo = HW;
  et.prototype.dMultiply = JW;
  et.prototype.dAddOffset = QW;
  et.prototype.multiplyLowerTo = rG;
  et.prototype.multiplyUpperTo = sG;
  et.prototype.modInt = fG;
  et.prototype.millerRabin = gG;
  et.prototype.clone = pW;
  et.prototype.intValue = hW;
  et.prototype.byteValue = mW;
  et.prototype.shortValue = gW;
  et.prototype.signum = bW;
  et.prototype.toByteArray = _W;
  et.prototype.equals = vW;
  et.prototype.min = wW;
  et.prototype.max = TW;
  et.prototype.and = RW;
  et.prototype.or = IW;
  et.prototype.xor = NW;
  et.prototype.andNot = kW;
  et.prototype.not = DW;
  et.prototype.shiftLeft = OW;
  et.prototype.shiftRight = PW;
  et.prototype.getLowestSetBit = BW;
  et.prototype.bitCount = FW;
  et.prototype.testBit = MW;
  et.prototype.setBit = VW;
  et.prototype.clearBit = WW;
  et.prototype.flipBit = GW;
  et.prototype.add = KW;
  et.prototype.subtract = qW;
  et.prototype.multiply = jW;
  et.prototype.divide = ZW;
  et.prototype.remainder = zW;
  et.prototype.divideAndRemainder = XW;
  et.prototype.modPow = uG;
  et.prototype.modInverse = pG;
  et.prototype.pow = nG;
  et.prototype.gcd = dG;
  et.prototype.isProbablePrime = mG;
  et.prototype.square = YW;
});

export { Ef };
