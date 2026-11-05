/**
 * node-forge/lib/jsbn.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: node-forge@1.4.0
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_forge } from "./forge.js";

//@ chunk-qg41pqt6.js:92904-112783 cjs-fingerprint
var require_jsbn = __commonJS(function (cjsExports, cjsModule) {
  var forge = require_forge();
  cjsModule.exports = forge.jsbn = forge.jsbn || {};
  var dbits;
  var canary = 244837814094590;
  var j_lm = (canary & 16777215) == 15715070;
  function BigInteger(a, b, c) {
    this.data = [];
    if (a != null)
      if (typeof a == "number") this.fromNumber(a, b, c);
      else if (b == null && typeof a != "string") this.fromString(a, 256);
      else this.fromString(a, b);
  }
  forge.jsbn.BigInteger = BigInteger;
  function nbi() {
    return new BigInteger(null);
  }
  function am1(i, x, w, j, c, n) {
    while (--n >= 0) {
      var v = x * this.data[i++] + w.data[j] + c;
      c = Math.floor(v / 67108864);
      w.data[j++] = v & 67108863;
    }
    return c;
  }
  function am2(i, x, w_2, j, c, n) {
    var xl = x & 32767;
    var xh = x >> 15;
    while (--n >= 0) {
      var l = this.data[i] & 32767;
      var h = this.data[i++] >> 15;
      var m = xh * l + h * xl;
      l = xl * l + ((m & 32767) << 15) + w_2.data[j] + (c & 1073741823);
      c = (l >>> 30) + (m >>> 15) + xh * h + (c >>> 30);
      w_2.data[j++] = l & 1073741823;
    }
    return c;
  }
  function am3(i, x, w_2, j, c, n) {
    var xl = x & 16383;
    var xh = x >> 14;
    while (--n >= 0) {
      var l = this.data[i] & 16383;
      var h = this.data[i++] >> 14;
      var m = xh * l + h * xl;
      l = xl * l + ((m & 16383) << 14) + w_2.data[j] + c;
      c = (l >> 28) + (m >> 14) + xh * h;
      w_2.data[j++] = l & 268435455;
    }
    return c;
  }
  if (typeof navigator === "undefined") {
    BigInteger.prototype.am = am3;
    dbits = 28;
  } else if (j_lm && navigator.appName == "Microsoft Internet Explorer") {
    BigInteger.prototype.am = am2;
    dbits = 30;
  } else if (j_lm && navigator.appName != "Netscape") {
    BigInteger.prototype.am = am1;
    dbits = 26;
  } else {
    BigInteger.prototype.am = am3;
    dbits = 28;
  }
  BigInteger.prototype.DB = dbits;
  BigInteger.prototype.DM = (1 << dbits) - 1;
  BigInteger.prototype.DV = 1 << dbits;
  var BI_FP = 52;
  BigInteger.prototype.FV = Math.pow(2, BI_FP);
  BigInteger.prototype.F1 = BI_FP - dbits;
  BigInteger.prototype.F2 = 2 * dbits - BI_FP;
  var BI_RM = "0123456789abcdefghijklmnopqrstuvwxyz";
  var BI_RC = [];
  var rr;
  var vv;
  rr = 48;
  for (vv = 0; vv <= 9; ++vv) BI_RC[rr++] = vv;
  rr = 97;
  for (vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;
  rr = 65;
  for (vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;
  function int2char(n) {
    return BI_RM.charAt(n);
  }
  function intAt(s, i) {
    var c = BI_RC[s.charCodeAt(i)];
    return c == null ? -1 : c;
  }
  function bnpCopyTo(r) {
    for (var i = this.t - 1; i >= 0; --i) r.data[i] = this.data[i];
    r.t = this.t;
    r.s = this.s;
  }
  function bnpFromInt(x) {
    this.t = 1;
    this.s = x < 0 ? -1 : 0;
    if (x > 0) this.data[0] = x;
    else if (x < -1) this.data[0] = x + this.DV;
    else this.t = 0;
  }
  function nbv(i) {
    var r = nbi();
    r.fromInt(i);
    return r;
  }
  function bnpFromString(s_2, b) {
    var k;
    if (b == 16) k = 4;
    else if (b == 8) k = 3;
    else if (b == 256) k = 8;
    else if (b == 2) k = 1;
    else if (b == 32) k = 5;
    else if (b == 4) k = 2;
    else {
      this.fromRadix(s_2, b);
      return;
    }
    this.t = 0;
    this.s = 0;
    var i = s_2.length;
    var mi = false;
    var sh = 0;
    while (--i >= 0) {
      var x = k == 8 ? s_2[i] & 255 : intAt(s_2, i);
      if (x < 0) {
        if (s_2.charAt(i) == "-") mi = true;
        continue;
      }
      mi = false;
      if (sh == 0) this.data[this.t++] = x;
      else if (sh + k > this.DB) {
        this.data[this.t - 1] |= (x & ((1 << (this.DB - sh)) - 1)) << sh;
        this.data[this.t++] = x >> (this.DB - sh);
      } else this.data[this.t - 1] |= x << sh;
      sh += k;
      if (sh >= this.DB) sh -= this.DB;
    }
    if (k == 8 && (s_2[0] & 128) != 0) {
      this.s = -1;
      if (sh > 0) this.data[this.t - 1] |= ((1 << (this.DB - sh)) - 1) << sh;
    }
    this.clamp();
    if (mi) BigInteger.ZERO.subTo(this, this);
  }
  function bnpClamp() {
    var c = this.s & this.DM;
    while (this.t > 0 && this.data[this.t - 1] == c) --this.t;
  }
  function bnToString(b) {
    if (this.s < 0) return "-" + this.negate().toString(b);
    var k;
    if (b == 16) k = 4;
    else if (b == 8) k = 3;
    else if (b == 2) k = 1;
    else if (b == 32) k = 5;
    else if (b == 4) k = 2;
    else return this.toRadix(b);
    var km = (1 << k) - 1;
    var d;
    var m = false;
    var r = "";
    var i = this.t;
    var p = this.DB - ((i * this.DB) % k);
    if (i-- > 0) {
      if (p < this.DB && (d = this.data[i] >> p) > 0) {
        m = true;
        r = int2char(d);
      }
      while (i >= 0) {
        if (p < k) {
          d = (this.data[i] & ((1 << p) - 1)) << (k - p);
          d |= this.data[--i] >> (p += this.DB - k);
        } else {
          d = (this.data[i] >> (p -= k)) & km;
          if (p <= 0) {
            p += this.DB;
            --i;
          }
        }
        if (d > 0) m = true;
        if (m) r += int2char(d);
      }
    }
    return m ? r : "0";
  }
  function bnNegate() {
    var r = nbi();
    BigInteger.ZERO.subTo(this, r);
    return r;
  }
  function bnAbs() {
    return this.s < 0 ? this.negate() : this;
  }
  function bnCompareTo(a) {
    var r_2 = this.s - a.s;
    if (r_2 != 0) return r_2;
    var i = this.t;
    r_2 = i - a.t;
    if (r_2 != 0) return this.s < 0 ? -r_2 : r_2;
    while (--i >= 0) if ((r_2 = this.data[i] - a.data[i]) != 0) return r_2;
    return 0;
  }
  function nbits(x) {
    var r_2 = 1;
    var t;
    if ((t = x >>> 16) != 0) {
      x = t;
      r_2 += 16;
    }
    if ((t = x >> 8) != 0) {
      x = t;
      r_2 += 8;
    }
    if ((t = x >> 4) != 0) {
      x = t;
      r_2 += 4;
    }
    if ((t = x >> 2) != 0) {
      x = t;
      r_2 += 2;
    }
    if ((t = x >> 1) != 0) {
      x = t;
      r_2 += 1;
    }
    return r_2;
  }
  function bnBitLength() {
    if (this.t <= 0) return 0;
    return this.DB * (this.t - 1) + nbits(this.data[this.t - 1] ^ (this.s & this.DM));
  }
  function bnpDLShiftTo(n_2, r_2) {
    var i;
    for (i = this.t - 1; i >= 0; --i) r_2.data[i + n_2] = this.data[i];
    for (i = n_2 - 1; i >= 0; --i) r_2.data[i] = 0;
    r_2.t = this.t + n_2;
    r_2.s = this.s;
  }
  function bnpDRShiftTo(n_2, r_2) {
    for (var i = n_2; i < this.t; ++i) r_2.data[i - n_2] = this.data[i];
    r_2.t = Math.max(this.t - n_2, 0);
    r_2.s = this.s;
  }
  function bnpLShiftTo(n_2, r_2) {
    var bs = n_2 % this.DB;
    var cbs = this.DB - bs;
    var bm = (1 << cbs) - 1;
    var ds = Math.floor(n_2 / this.DB);
    var c = (this.s << bs) & this.DM;
    var i;
    for (i = this.t - 1; i >= 0; --i) {
      r_2.data[i + ds + 1] = (this.data[i] >> cbs) | c;
      c = (this.data[i] & bm) << bs;
    }
    for (i = ds - 1; i >= 0; --i) r_2.data[i] = 0;
    r_2.data[ds] = c;
    r_2.t = this.t + ds + 1;
    r_2.s = this.s;
    r_2.clamp();
  }
  function bnpRShiftTo(n_2, r_2) {
    r_2.s = this.s;
    var ds = Math.floor(n_2 / this.DB);
    if (ds >= this.t) {
      r_2.t = 0;
      return;
    }
    var bs = n_2 % this.DB;
    var cbs = this.DB - bs;
    var bm = (1 << bs) - 1;
    r_2.data[0] = this.data[ds] >> bs;
    for (var i = ds + 1; i < this.t; ++i) {
      r_2.data[i - ds - 1] |= (this.data[i] & bm) << cbs;
      r_2.data[i - ds] = this.data[i] >> bs;
    }
    if (bs > 0) r_2.data[this.t - ds - 1] |= (this.s & bm) << cbs;
    r_2.t = this.t - ds;
    r_2.clamp();
  }
  function bnpSubTo(a, r_2) {
    var i = 0;
    var c = 0;
    var m = Math.min(a.t, this.t);
    while (i < m) {
      c += this.data[i] - a.data[i];
      r_2.data[i++] = c & this.DM;
      c >>= this.DB;
    }
    if (a.t < this.t) {
      c -= a.s;
      while (i < this.t) {
        c += this.data[i];
        r_2.data[i++] = c & this.DM;
        c >>= this.DB;
      }
      c += this.s;
    } else {
      c += this.s;
      while (i < a.t) {
        c -= a.data[i];
        r_2.data[i++] = c & this.DM;
        c >>= this.DB;
      }
      c -= a.s;
    }
    r_2.s = c < 0 ? -1 : 0;
    if (c < -1) r_2.data[i++] = this.DV + c;
    else if (c > 0) r_2.data[i++] = c;
    r_2.t = i;
    r_2.clamp();
  }
  function bnpMultiplyTo(a, r_2) {
    var x = this.abs();
    var y = a.abs();
    var i = x.t;
    r_2.t = i + y.t;
    while (--i >= 0) r_2.data[i] = 0;
    for (i = 0; i < y.t; ++i) r_2.data[i + x.t] = x.am(0, y.data[i], r_2, i, 0, x.t);
    r_2.s = 0;
    r_2.clamp();
    if (this.s != a.s) BigInteger.ZERO.subTo(r_2, r_2);
  }
  function bnpSquareTo(r_2) {
    var x = this.abs();
    var i = (r_2.t = 2 * x.t);
    while (--i >= 0) r_2.data[i] = 0;
    for (i = 0; i < x.t - 1; ++i) {
      var c = x.am(i, x.data[i], r_2, 2 * i, 0, 1);
      if ((r_2.data[i + x.t] += x.am(i + 1, 2 * x.data[i], r_2, 2 * i + 1, c, x.t - i - 1)) >= x.DV) {
        r_2.data[i + x.t] -= x.DV;
        r_2.data[i + x.t + 1] = 1;
      }
    }
    if (r_2.t > 0) r_2.data[r_2.t - 1] += x.am(i, x.data[i], r_2, 2 * i, 0, 1);
    r_2.s = 0;
    r_2.clamp();
  }
  function bnpDivRemTo(m, q, remainder) {
    var pm = m.abs();
    if (pm.t <= 0) return;
    var pt = this.abs();
    if (pt.t < pm.t) {
      if (q != null) q.fromInt(0);
      if (remainder != null) this.copyTo(remainder);
      return;
    }
    if (remainder == null) remainder = nbi();
    var shiftedModulus = nbi();
    var ts = this.s;
    var ms = m.s;
    var nsh = this.DB - nbits(pm.data[pm.t - 1]);
    if (nsh > 0) {
      pm.lShiftTo(nsh, shiftedModulus);
      pt.lShiftTo(nsh, remainder);
    } else {
      pm.copyTo(shiftedModulus);
      pt.copyTo(remainder);
    }
    var ys = shiftedModulus.t;
    var y0 = shiftedModulus.data[ys - 1];
    if (y0 == 0) return;
    var yt = y0 * (1 << this.F1) + (ys > 1 ? shiftedModulus.data[ys - 2] >> this.F2 : 0);
    var d1 = this.FV / yt;
    var d2 = (1 << this.F1) / yt;
    var e = 1 << this.F2;
    var i = remainder.t;
    var j = i - ys;
    var t = q == null ? nbi() : q;
    shiftedModulus.dlShiftTo(j, t);
    if (remainder.compareTo(t) >= 0) {
      remainder.data[remainder.t++] = 1;
      remainder.subTo(t, remainder);
    }
    BigInteger.ONE.dlShiftTo(ys, t);
    t.subTo(shiftedModulus, shiftedModulus);
    while (shiftedModulus.t < ys) shiftedModulus.data[shiftedModulus.t++] = 0;
    while (--j >= 0) {
      var qd =
        remainder.data[--i] == y0
          ? this.DM
          : Math.floor(remainder.data[i] * d1 + (remainder.data[i - 1] + e) * d2);
      if ((remainder.data[i] += shiftedModulus.am(0, qd, remainder, j, 0, ys)) < qd) {
        shiftedModulus.dlShiftTo(j, t);
        remainder.subTo(t, remainder);
        while (remainder.data[i] < --qd) remainder.subTo(t, remainder);
      }
    }
    if (q != null) {
      remainder.drShiftTo(ys, q);
      if (ts != ms) BigInteger.ZERO.subTo(q, q);
    }
    remainder.t = ys;
    remainder.clamp();
    if (nsh > 0) remainder.rShiftTo(nsh, remainder);
    if (ts < 0) BigInteger.ZERO.subTo(remainder, remainder);
  }
  function bnMod(a) {
    var r = nbi();
    this.abs().divRemTo(a, null, r);
    if (this.s < 0 && r.compareTo(BigInteger.ZERO) > 0) a.subTo(r, r);
    return r;
  }
  function Classic(m) {
    this.m = m;
  }
  function cConvert(x) {
    if (x.s < 0 || x.compareTo(this.m) >= 0) return x.mod(this.m);
    else return x;
  }
  function cRevert(x) {
    return x;
  }
  function cReduce(x) {
    x.divRemTo(this.m, null, x);
  }
  function cMulTo(x, y, product) {
    x.multiplyTo(y, product);
    this.reduce(product);
  }
  function cSqrTo(x, r) {
    x.squareTo(r);
    this.reduce(r);
  }
  Classic.prototype.convert = cConvert;
  Classic.prototype.revert = cRevert;
  Classic.prototype.reduce = cReduce;
  Classic.prototype.mulTo = cMulTo;
  Classic.prototype.sqrTo = cSqrTo;
  function bnpInvDigit() {
    if (this.t < 1) return 0;
    var x = this.data[0];
    if ((x & 1) == 0) return 0;
    var y = x & 3;
    y = (y * (2 - (x & 15) * y)) & 15;
    y = (y * (2 - (x & 255) * y)) & 255;
    y = (y * (2 - (((x & 65535) * y) & 65535))) & 65535;
    y = (y * (2 - ((x * y) % this.DV))) % this.DV;
    return y > 0 ? this.DV - y : -y;
  }
  function Montgomery(m) {
    this.m = m;
    this.mp = m.invDigit();
    this.mpl = this.mp & 32767;
    this.mph = this.mp >> 15;
    this.um = (1 << (m.DB - 15)) - 1;
    this.mt2 = 2 * m.t;
  }
  function montConvert(x) {
    var r = nbi();
    x.abs().dlShiftTo(this.m.t, r);
    r.divRemTo(this.m, null, r);
    if (x.s < 0 && r.compareTo(BigInteger.ZERO) > 0) this.m.subTo(r, r);
    return r;
  }
  function montRevert(x) {
    var r = nbi();
    x.copyTo(r);
    this.reduce(r);
    return r;
  }
  function montReduce(x) {
    while (x.t <= this.mt2) x.data[x.t++] = 0;
    for (var i = 0; i < this.m.t; ++i) {
      var j = x.data[i] & 32767;
      var u0 = (j * this.mpl + (((j * this.mph + (x.data[i] >> 15) * this.mpl) & this.um) << 15)) & x.DM;
      j = i + this.m.t;
      x.data[j] += this.m.am(0, u0, x, i, 0, this.m.t);
      while (x.data[j] >= x.DV) {
        x.data[j] -= x.DV;
        x.data[++j]++;
      }
    }
    x.clamp();
    x.drShiftTo(this.m.t, x);
    if (x.compareTo(this.m) >= 0) x.subTo(this.m, x);
  }
  function montSqrTo(x, r) {
    x.squareTo(r);
    this.reduce(r);
  }
  function montMulTo(x, y, product) {
    x.multiplyTo(y, product);
    this.reduce(product);
  }
  Montgomery.prototype.convert = montConvert;
  Montgomery.prototype.revert = montRevert;
  Montgomery.prototype.reduce = montReduce;
  Montgomery.prototype.mulTo = montMulTo;
  Montgomery.prototype.sqrTo = montSqrTo;
  function bnpIsEven() {
    return (this.t > 0 ? this.data[0] & 1 : this.s) == 0;
  }
  function bnpExp(exponent, z) {
    if (exponent > 4294967295 || exponent < 1) return BigInteger.ONE;
    var accumulator = nbi();
    var r2 = nbi();
    var g = z.convert(this);
    var i = nbits(exponent) - 1;
    g.copyTo(accumulator);
    while (--i >= 0) {
      z.sqrTo(accumulator, r2);
      if ((exponent & (1 << i)) > 0) z.mulTo(r2, g, accumulator);
      else {
        var t = accumulator;
        accumulator = r2;
        r2 = t;
      }
    }
    return z.revert(accumulator);
  }
  function bnModPowInt(exponent, m) {
    var z;
    if (exponent < 256 || m.isEven()) z = new Classic(m);
    else z = new Montgomery(m);
    return this.exp(exponent, z);
  }
  BigInteger.prototype.copyTo = bnpCopyTo;
  BigInteger.prototype.fromInt = bnpFromInt;
  BigInteger.prototype.fromString = bnpFromString;
  BigInteger.prototype.clamp = bnpClamp;
  BigInteger.prototype.dlShiftTo = bnpDLShiftTo;
  BigInteger.prototype.drShiftTo = bnpDRShiftTo;
  BigInteger.prototype.lShiftTo = bnpLShiftTo;
  BigInteger.prototype.rShiftTo = bnpRShiftTo;
  BigInteger.prototype.subTo = bnpSubTo;
  BigInteger.prototype.multiplyTo = bnpMultiplyTo;
  BigInteger.prototype.squareTo = bnpSquareTo;
  BigInteger.prototype.divRemTo = bnpDivRemTo;
  BigInteger.prototype.invDigit = bnpInvDigit;
  BigInteger.prototype.isEven = bnpIsEven;
  BigInteger.prototype.exp = bnpExp;
  BigInteger.prototype.toString = bnToString;
  BigInteger.prototype.negate = bnNegate;
  BigInteger.prototype.abs = bnAbs;
  BigInteger.prototype.compareTo = bnCompareTo;
  BigInteger.prototype.bitLength = bnBitLength;
  BigInteger.prototype.mod = bnMod;
  BigInteger.prototype.modPowInt = bnModPowInt;
  BigInteger.ZERO = nbv(0);
  BigInteger.ONE = nbv(1);
  function bnClone() {
    var r = nbi();
    this.copyTo(r);
    return r;
  }
  function bnIntValue() {
    if (this.s < 0) {
      if (this.t == 1) return this.data[0] - this.DV;
      else if (this.t == 0) return -1;
    } else if (this.t == 1) return this.data[0];
    else if (this.t == 0) return 0;
    return ((this.data[1] & ((1 << (32 - this.DB)) - 1)) << this.DB) | this.data[0];
  }
  function bnByteValue() {
    return this.t == 0 ? this.s : (this.data[0] << 24) >> 24;
  }
  function bnShortValue() {
    return this.t == 0 ? this.s : (this.data[0] << 16) >> 16;
  }
  function bnpChunkSize(r) {
    return Math.floor((Math.LN2 * this.DB) / Math.log(r));
  }
  function bnSigNum() {
    if (this.s < 0) return -1;
    else if (this.t <= 0 || (this.t == 1 && this.data[0] <= 0)) return 0;
    else return 1;
  }
  function bnpToRadix(b) {
    if (b == null) b = 10;
    if (this.signum() == 0 || b < 2 || b > 36) return "0";
    var cs = this.chunkSize(b);
    var a = Math.pow(b, cs);
    var d = nbv(a);
    var y_2 = nbi();
    var z = nbi();
    var r = "";
    this.divRemTo(d, y_2, z);
    while (y_2.signum() > 0) {
      r = (a + z.intValue()).toString(b).substr(1) + r;
      y_2.divRemTo(d, y_2, z);
    }
    return z.intValue().toString(b) + r;
  }
  function bnpFromRadix(s_2, b) {
    this.fromInt(0);
    if (b == null) b = 10;
    var cs = this.chunkSize(b);
    var d = Math.pow(b, cs);
    var mi = false;
    var j = 0;
    var w_2 = 0;
    for (var i = 0; i < s_2.length; ++i) {
      var x = intAt(s_2, i);
      if (x < 0) {
        if (s_2.charAt(i) == "-" && this.signum() == 0) mi = true;
        continue;
      }
      w_2 = b * w_2 + x;
      if (++j >= cs) {
        this.dMultiply(d);
        this.dAddOffset(w_2, 0);
        j = 0;
        w_2 = 0;
      }
    }
    if (j > 0) {
      this.dMultiply(Math.pow(b, j));
      this.dAddOffset(w_2, 0);
    }
    if (mi) BigInteger.ZERO.subTo(this, this);
  }
  function bnpFromNumber(a, b, c) {
    if (typeof b == "number") {
      if (a < 2) this.fromInt(1);
      else {
        this.fromNumber(a, c);
        if (!this.testBit(a - 1)) this.bitwiseTo(BigInteger.ONE.shiftLeft(a - 1), op_or, this);
        if (this.isEven()) this.dAddOffset(1, 0);
        while (!this.isProbablePrime(b)) {
          this.dAddOffset(2, 0);
          if (this.bitLength() > a) this.subTo(BigInteger.ONE.shiftLeft(a - 1), this);
        }
      }
    } else {
      var x = [];
      var t = a & 7;
      x.length = (a >> 3) + 1;
      b.nextBytes(x);
      if (t > 0) x[0] &= (1 << t) - 1;
      else x[0] = 0;
      this.fromString(x, 256);
    }
  }
  function bnToByteArray() {
    var i = this.t;
    var r_2 = [];
    r_2[0] = this.s;
    var p = this.DB - ((i * this.DB) % 8);
    var d;
    var k = 0;
    if (i-- > 0) {
      if (p < this.DB && (d = this.data[i] >> p) != (this.s & this.DM) >> p)
        r_2[k++] = d | (this.s << (this.DB - p));
      while (i >= 0) {
        if (p < 8) {
          d = (this.data[i] & ((1 << p) - 1)) << (8 - p);
          d |= this.data[--i] >> (p += this.DB - 8);
        } else {
          d = (this.data[i] >> (p -= 8)) & 255;
          if (p <= 0) {
            p += this.DB;
            --i;
          }
        }
        if ((d & 128) != 0) d |= -256;
        if (k == 0 && (this.s & 128) != (d & 128)) ++k;
        if (k > 0 || d != this.s) r_2[k++] = d;
      }
    }
    return r_2;
  }
  function bnEquals(a) {
    return this.compareTo(a) == 0;
  }
  function bnMin(a) {
    return this.compareTo(a) < 0 ? this : a;
  }
  function bnMax(a) {
    return this.compareTo(a) > 0 ? this : a;
  }
  function bnpBitwiseTo(a, op, result) {
    var i;
    var f;
    var m = Math.min(a.t, this.t);
    for (i = 0; i < m; ++i) result.data[i] = op(this.data[i], a.data[i]);
    if (a.t < this.t) {
      f = a.s & this.DM;
      for (i = m; i < this.t; ++i) result.data[i] = op(this.data[i], f);
      result.t = this.t;
    } else {
      f = this.s & this.DM;
      for (i = m; i < a.t; ++i) result.data[i] = op(f, a.data[i]);
      result.t = a.t;
    }
    result.s = op(this.s, a.s);
    result.clamp();
  }
  function op_and(x, y) {
    return x & y;
  }
  function bnAnd(a) {
    var r = nbi();
    this.bitwiseTo(a, op_and, r);
    return r;
  }
  function op_or(x, y) {
    return x | y;
  }
  function bnOr(a) {
    var r = nbi();
    this.bitwiseTo(a, op_or, r);
    return r;
  }
  function op_xor(x, y) {
    return x ^ y;
  }
  function bnXor(a) {
    var r = nbi();
    this.bitwiseTo(a, op_xor, r);
    return r;
  }
  function op_andnot(x, y) {
    return x & ~y;
  }
  function bnAndNot(a) {
    var r = nbi();
    this.bitwiseTo(a, op_andnot, r);
    return r;
  }
  function bnNot() {
    var r = nbi();
    for (var i = 0; i < this.t; ++i) r.data[i] = this.DM & ~this.data[i];
    r.t = this.t;
    r.s = ~this.s;
    return r;
  }
  function bnShiftLeft(n_2) {
    var r = nbi();
    if (n_2 < 0) this.rShiftTo(-n_2, r);
    else this.lShiftTo(n_2, r);
    return r;
  }
  function bnShiftRight(n_2) {
    var r = nbi();
    if (n_2 < 0) this.lShiftTo(-n_2, r);
    else this.rShiftTo(n_2, r);
    return r;
  }
  function lbit(x) {
    if (x == 0) return -1;
    var r = 0;
    if ((x & 65535) == 0) {
      x >>= 16;
      r += 16;
    }
    if ((x & 255) == 0) {
      x >>= 8;
      r += 8;
    }
    if ((x & 15) == 0) {
      x >>= 4;
      r += 4;
    }
    if ((x & 3) == 0) {
      x >>= 2;
      r += 2;
    }
    if ((x & 1) == 0) ++r;
    return r;
  }
  function bnGetLowestSetBit() {
    for (var i = 0; i < this.t; ++i) if (this.data[i] != 0) return i * this.DB + lbit(this.data[i]);
    if (this.s < 0) return this.t * this.DB;
    return -1;
  }
  function cbit(x) {
    var r = 0;
    while (x != 0) {
      x &= x - 1;
      ++r;
    }
    return r;
  }
  function bnBitCount() {
    var r_2 = 0;
    var x = this.s & this.DM;
    for (var i = 0; i < this.t; ++i) r_2 += cbit(this.data[i] ^ x);
    return r_2;
  }
  function bnTestBit(n_2) {
    var j = Math.floor(n_2 / this.DB);
    if (j >= this.t) return this.s != 0;
    return (this.data[j] & (1 << (n_2 % this.DB))) != 0;
  }
  function bnpChangeBit(n_2, op) {
    var shiftedOne = BigInteger.ONE.shiftLeft(n_2);
    this.bitwiseTo(shiftedOne, op, shiftedOne);
    return shiftedOne;
  }
  function bnSetBit(n) {
    return this.changeBit(n, op_or);
  }
  function bnClearBit(n) {
    return this.changeBit(n, op_andnot);
  }
  function bnFlipBit(n) {
    return this.changeBit(n, op_xor);
  }
  function bnpAddTo(a, r_2) {
    var i = 0;
    var c = 0;
    var m = Math.min(a.t, this.t);
    while (i < m) {
      c += this.data[i] + a.data[i];
      r_2.data[i++] = c & this.DM;
      c >>= this.DB;
    }
    if (a.t < this.t) {
      c += a.s;
      while (i < this.t) {
        c += this.data[i];
        r_2.data[i++] = c & this.DM;
        c >>= this.DB;
      }
      c += this.s;
    } else {
      c += this.s;
      while (i < a.t) {
        c += a.data[i];
        r_2.data[i++] = c & this.DM;
        c >>= this.DB;
      }
      c += a.s;
    }
    r_2.s = c < 0 ? -1 : 0;
    if (c > 0) r_2.data[i++] = c;
    else if (c < -1) r_2.data[i++] = this.DV + c;
    r_2.t = i;
    r_2.clamp();
  }
  function bnAdd(a) {
    var r = nbi();
    this.addTo(a, r);
    return r;
  }
  function bnSubtract(a) {
    var r = nbi();
    this.subTo(a, r);
    return r;
  }
  function bnMultiply(a) {
    var r = nbi();
    this.multiplyTo(a, r);
    return r;
  }
  function bnSquare() {
    var r = nbi();
    this.squareTo(r);
    return r;
  }
  function bnDivide(a) {
    var r = nbi();
    this.divRemTo(a, r, null);
    return r;
  }
  function bnRemainder(a) {
    var r = nbi();
    this.divRemTo(a, null, r);
    return r;
  }
  function bnDivideAndRemainder(a) {
    var q = nbi();
    var remainder = nbi();
    this.divRemTo(a, q, remainder);
    return [q, remainder];
  }
  function bnpDMultiply(n) {
    this.data[this.t] = this.am(0, n - 1, this, 0, 0, this.t);
    ++this.t;
    this.clamp();
  }
  function bnpDAddOffset(n_2, w) {
    if (n_2 == 0) return;
    while (this.t <= w) this.data[this.t++] = 0;
    this.data[w] += n_2;
    while (this.data[w] >= this.DV) {
      this.data[w] -= this.DV;
      if (++w >= this.t) this.data[this.t++] = 0;
      ++this.data[w];
    }
  }
  function NullExp() {}
  function nNop(x) {
    return x;
  }
  function nMulTo(x, y, product) {
    x.multiplyTo(y, product);
  }
  function nSqrTo(x, r) {
    x.squareTo(r);
  }
  NullExp.prototype.convert = nNop;
  NullExp.prototype.revert = nNop;
  NullExp.prototype.mulTo = nMulTo;
  NullExp.prototype.sqrTo = nSqrTo;
  function bnPow(exponent) {
    return this.exp(exponent, new NullExp());
  }
  function bnpMultiplyLowerTo(a, wordCount, product) {
    var i = Math.min(this.t + a.t, wordCount);
    product.s = 0;
    product.t = i;
    while (i > 0) product.data[--i] = 0;
    var j;
    for (j = product.t - this.t; i < j; ++i)
      product.data[i + this.t] = this.am(0, a.data[i], product, i, 0, this.t);
    for (j = Math.min(a.t, wordCount); i < j; ++i) this.am(0, a.data[i], product, i, 0, wordCount - i);
    product.clamp();
  }
  function bnpMultiplyUpperTo(a, wordCount, product) {
    --wordCount;
    var i = (product.t = this.t + a.t - wordCount);
    product.s = 0;
    while (--i >= 0) product.data[i] = 0;
    for (i = Math.max(wordCount - this.t, 0); i < a.t; ++i)
      product.data[this.t + i - wordCount] = this.am(
        wordCount - i,
        a.data[i],
        product,
        0,
        0,
        this.t + i - wordCount,
      );
    product.clamp();
    product.drShiftTo(1, product);
  }
  function Barrett(m) {
    this.r2 = nbi();
    this.q3 = nbi();
    BigInteger.ONE.dlShiftTo(2 * m.t, this.r2);
    this.mu = this.r2.divide(m);
    this.m = m;
  }
  function barrettConvert(x) {
    if (x.s < 0 || x.t > 2 * this.m.t) return x.mod(this.m);
    else if (x.compareTo(this.m) < 0) return x;
    else {
      var r = nbi();
      x.copyTo(r);
      this.reduce(r);
      return r;
    }
  }
  function barrettRevert(x) {
    return x;
  }
  function barrettReduce(x) {
    x.drShiftTo(this.m.t - 1, this.r2);
    if (x.t > this.m.t + 1) {
      x.t = this.m.t + 1;
      x.clamp();
    }
    this.mu.multiplyUpperTo(this.r2, this.m.t + 1, this.q3);
    this.m.multiplyLowerTo(this.q3, this.m.t + 1, this.r2);
    while (x.compareTo(this.r2) < 0) x.dAddOffset(1, this.m.t + 1);
    x.subTo(this.r2, x);
    while (x.compareTo(this.m) >= 0) x.subTo(this.m, x);
  }
  function barrettSqrTo(x, r) {
    x.squareTo(r);
    this.reduce(r);
  }
  function barrettMulTo(x, y, product) {
    x.multiplyTo(y, product);
    this.reduce(product);
  }
  Barrett.prototype.convert = barrettConvert;
  Barrett.prototype.revert = barrettRevert;
  Barrett.prototype.reduce = barrettReduce;
  Barrett.prototype.mulTo = barrettMulTo;
  Barrett.prototype.sqrTo = barrettSqrTo;
  function bnModPow(exponent, m) {
    var i = exponent.bitLength();
    var k;
    var r = nbv(1);
    var z_2;
    if (i <= 0) return r;
    else if (i < 18) k = 1;
    else if (i < 48) k = 3;
    else if (i < 144) k = 4;
    else if (i < 768) k = 5;
    else k = 6;
    if (i < 8) z_2 = new Classic(m);
    else if (m.isEven()) z_2 = new Barrett(m);
    else z_2 = new Montgomery(m);
    var g = [];
    var n = 3;
    var k1 = k - 1;
    var km = (1 << k) - 1;
    g[1] = z_2.convert(this);
    if (k > 1) {
      var g2 = nbi();
      z_2.sqrTo(g[1], g2);
      while (n <= km) {
        g[n] = nbi();
        z_2.mulTo(g2, g[n - 2], g[n]);
        n += 2;
      }
    }
    var j_2 = exponent.t - 1;
    var w;
    var is1 = true;
    var r2 = nbi();
    var t;
    i = nbits(exponent.data[j_2]) - 1;
    while (j_2 >= 0) {
      if (i >= k1) w = (exponent.data[j_2] >> (i - k1)) & km;
      else {
        w = (exponent.data[j_2] & ((1 << (i + 1)) - 1)) << (k1 - i);
        if (j_2 > 0) w |= exponent.data[j_2 - 1] >> (this.DB + i - k1);
      }
      n = k;
      while ((w & 1) == 0) {
        w >>= 1;
        --n;
      }
      if ((i -= n) < 0) {
        i += this.DB;
        --j_2;
      }
      if (is1) {
        g[w].copyTo(r);
        is1 = false;
      } else {
        while (n > 1) {
          z_2.sqrTo(r, r2);
          z_2.sqrTo(r2, r);
          n -= 2;
        }
        if (n > 0) z_2.sqrTo(r, r2);
        else {
          t = r;
          r = r2;
          r2 = t;
        }
        z_2.mulTo(r2, g[w], r);
      }
      while (j_2 >= 0 && (exponent.data[j_2] & (1 << i)) == 0) {
        z_2.sqrTo(r, r2);
        t = r;
        r = r2;
        r2 = t;
        if (--i < 0) {
          i = this.DB - 1;
          --j_2;
        }
      }
    }
    return z_2.revert(r);
  }
  function bnGCD(a) {
    var x = this.s < 0 ? this.negate() : this.clone();
    var y_2 = a.s < 0 ? a.negate() : a.clone();
    if (x.compareTo(y_2) < 0) {
      var t = x;
      x = y_2;
      y_2 = t;
    }
    var i = x.getLowestSetBit();
    var g = y_2.getLowestSetBit();
    if (g < 0) return x;
    if (i < g) g = i;
    if (g > 0) {
      x.rShiftTo(g, x);
      y_2.rShiftTo(g, y_2);
    }
    while (x.signum() > 0) {
      if ((i = x.getLowestSetBit()) > 0) x.rShiftTo(i, x);
      if ((i = y_2.getLowestSetBit()) > 0) y_2.rShiftTo(i, y_2);
      if (x.compareTo(y_2) >= 0) {
        x.subTo(y_2, x);
        x.rShiftTo(1, x);
      } else {
        y_2.subTo(x, y_2);
        y_2.rShiftTo(1, y_2);
      }
    }
    if (g > 0) y_2.lShiftTo(g, y_2);
    return y_2;
  }
  function bnpModInt(n_2) {
    if (n_2 <= 0) return 0;
    var d = this.DV % n_2;
    var accumulator = this.s < 0 ? n_2 - 1 : 0;
    if (this.t > 0)
      if (d == 0) accumulator = this.data[0] % n_2;
      else for (var i = this.t - 1; i >= 0; --i) accumulator = (d * accumulator + this.data[i]) % n_2;
    return accumulator;
  }
  function bnModInverse(m) {
    if (this.signum() == 0) return BigInteger.ZERO;
    var ac = m.isEven();
    if ((this.isEven() && ac) || m.signum() == 0) return BigInteger.ZERO;
    var u = m.clone();
    var v = this.clone();
    var a = nbv(1);
    var b = nbv(0);
    var c = nbv(0);
    var d = nbv(1);
    while (u.signum() != 0) {
      while (u.isEven()) {
        u.rShiftTo(1, u);
        if (ac) {
          if (!a.isEven() || !b.isEven()) {
            a.addTo(this, a);
            b.subTo(m, b);
          }
          a.rShiftTo(1, a);
        } else if (!b.isEven()) b.subTo(m, b);
        b.rShiftTo(1, b);
      }
      while (v.isEven()) {
        v.rShiftTo(1, v);
        if (ac) {
          if (!c.isEven() || !d.isEven()) {
            c.addTo(this, c);
            d.subTo(m, d);
          }
          c.rShiftTo(1, c);
        } else if (!d.isEven()) d.subTo(m, d);
        d.rShiftTo(1, d);
      }
      if (u.compareTo(v) >= 0) {
        u.subTo(v, u);
        if (ac) a.subTo(c, a);
        b.subTo(d, b);
      } else {
        v.subTo(u, v);
        if (ac) c.subTo(a, c);
        d.subTo(b, d);
      }
    }
    if (v.compareTo(BigInteger.ONE) != 0) return BigInteger.ZERO;
    if (d.compareTo(m) >= 0) return d.subtract(m);
    if (d.signum() < 0) d.addTo(m, d);
    else return d;
    if (d.signum() < 0) return d.add(m);
    else return d;
  }
  var lowprimes = [
    2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103,
    107, 109, 113, 127, 131, 137, 139, 149, 151, 157, 163, 167, 173, 179, 181, 191, 193, 197, 199, 211, 223,
    227, 229, 233, 239, 241, 251, 257, 263, 269, 271, 277, 281, 283, 293, 307, 311, 313, 317, 331, 337, 347,
    349, 353, 359, 367, 373, 379, 383, 389, 397, 401, 409, 419, 421, 431, 433, 439, 443, 449, 457, 461, 463,
    467, 479, 487, 491, 499, 503, 509, 521, 523, 541, 547, 557, 563, 569, 571, 577, 587, 593, 599, 601, 607,
    613, 617, 619, 631, 641, 643, 647, 653, 659, 661, 673, 677, 683, 691, 701, 709, 719, 727, 733, 739, 743,
    751, 757, 761, 769, 773, 787, 797, 809, 811, 821, 823, 827, 829, 839, 853, 857, 859, 863, 877, 881, 883,
    887, 907, 911, 919, 929, 937, 941, 947, 953, 967, 971, 977, 983, 991, 997,
  ];
  var lplim = 67108864 / lowprimes[lowprimes.length - 1];
  function bnIsProbablePrime(t) {
    var i;
    var x = this.abs();
    if (x.t == 1 && x.data[0] <= lowprimes[lowprimes.length - 1]) {
      for (i = 0; i < lowprimes.length; ++i) if (x.data[0] == lowprimes[i]) return true;
      return false;
    }
    if (x.isEven()) return false;
    i = 1;
    while (i < lowprimes.length) {
      var m = lowprimes[i];
      var j = i + 1;
      while (j < lowprimes.length && m < lplim) m *= lowprimes[j++];
      m = x.modInt(m);
      while (i < j) if (m % lowprimes[i++] == 0) return false;
    }
    return x.millerRabin(t);
  }
  function bnpMillerRabin(t) {
    var n1 = this.subtract(BigInteger.ONE);
    var k = n1.getLowestSetBit();
    if (k <= 0) return false;
    var r = n1.shiftRight(k);
    var prng = bnGetPrng();
    var a;
    for (var i = 0; i < t; ++i) {
      do a = new BigInteger(this.bitLength(), prng);
      while (a.compareTo(BigInteger.ONE) <= 0 || a.compareTo(n1) >= 0);
      var y = a.modPow(r, this);
      if (y.compareTo(BigInteger.ONE) != 0 && y.compareTo(n1) != 0) {
        var j = 1;
        while (j++ < k && y.compareTo(n1) != 0) {
          y = y.modPowInt(2, this);
          if (y.compareTo(BigInteger.ONE) == 0) return false;
        }
        if (y.compareTo(n1) != 0) return false;
      }
    }
    return true;
  }
  function bnGetPrng() {
    return {
      nextBytes: function (x) {
        for (var i = 0; i < x.length; ++i) x[i] = Math.floor(Math.random() * 256);
      },
    };
  }
  BigInteger.prototype.chunkSize = bnpChunkSize;
  BigInteger.prototype.toRadix = bnpToRadix;
  BigInteger.prototype.fromRadix = bnpFromRadix;
  BigInteger.prototype.fromNumber = bnpFromNumber;
  BigInteger.prototype.bitwiseTo = bnpBitwiseTo;
  BigInteger.prototype.changeBit = bnpChangeBit;
  BigInteger.prototype.addTo = bnpAddTo;
  BigInteger.prototype.dMultiply = bnpDMultiply;
  BigInteger.prototype.dAddOffset = bnpDAddOffset;
  BigInteger.prototype.multiplyLowerTo = bnpMultiplyLowerTo;
  BigInteger.prototype.multiplyUpperTo = bnpMultiplyUpperTo;
  BigInteger.prototype.modInt = bnpModInt;
  BigInteger.prototype.millerRabin = bnpMillerRabin;
  BigInteger.prototype.clone = bnClone;
  BigInteger.prototype.intValue = bnIntValue;
  BigInteger.prototype.byteValue = bnByteValue;
  BigInteger.prototype.shortValue = bnShortValue;
  BigInteger.prototype.signum = bnSigNum;
  BigInteger.prototype.toByteArray = bnToByteArray;
  BigInteger.prototype.equals = bnEquals;
  BigInteger.prototype.min = bnMin;
  BigInteger.prototype.max = bnMax;
  BigInteger.prototype.and = bnAnd;
  BigInteger.prototype.or = bnOr;
  BigInteger.prototype.xor = bnXor;
  BigInteger.prototype.andNot = bnAndNot;
  BigInteger.prototype.not = bnNot;
  BigInteger.prototype.shiftLeft = bnShiftLeft;
  BigInteger.prototype.shiftRight = bnShiftRight;
  BigInteger.prototype.getLowestSetBit = bnGetLowestSetBit;
  BigInteger.prototype.bitCount = bnBitCount;
  BigInteger.prototype.testBit = bnTestBit;
  BigInteger.prototype.setBit = bnSetBit;
  BigInteger.prototype.clearBit = bnClearBit;
  BigInteger.prototype.flipBit = bnFlipBit;
  BigInteger.prototype.add = bnAdd;
  BigInteger.prototype.subtract = bnSubtract;
  BigInteger.prototype.multiply = bnMultiply;
  BigInteger.prototype.divide = bnDivide;
  BigInteger.prototype.remainder = bnRemainder;
  BigInteger.prototype.divideAndRemainder = bnDivideAndRemainder;
  BigInteger.prototype.modPow = bnModPow;
  BigInteger.prototype.modInverse = bnModInverse;
  BigInteger.prototype.pow = bnPow;
  BigInteger.prototype.gcd = bnGCD;
  BigInteger.prototype.isProbablePrime = bnIsProbablePrime;
  BigInteger.prototype.square = bnSquare;
});
export { require_jsbn };
