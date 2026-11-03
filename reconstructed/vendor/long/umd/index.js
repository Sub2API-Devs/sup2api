/**
 * long/umd/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: long@5.3.2
 * pieces: chunk-798ashq9.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";

//@ chunk-798ashq9.js:12915-24303 cjs-fingerprint
var hHr = x(function (ht, zt) {
  (function (l, u) {
    function f(d) {
      return d.default || d;
    }
    if (typeof define === "function" && define.amd)
      define([], function () {
        var d = {};
        return (u(d), f(d));
      });
    else if (typeof ht === "object") {
      if ((u(ht), typeof zt === "object")) zt.exports = f(ht);
    } else
      (function () {
        var d = {};
        (u(d), (l.Long = f(d)));
      })();
  })(typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : ht, function (l) {
    (Object.defineProperty(l, "__esModule", { value: !0 }), (l.default = void 0));
    var u = null;
    try {
      u = new WebAssembly.Instance(
        new WebAssembly.Module(
          new Uint8Array([
            0, 97, 115, 109, 1, 0, 0, 0, 1, 13, 2, 96, 0, 1, 127, 96, 4, 127, 127, 127, 127, 1, 127, 3, 7, 6,
            0, 1, 1, 1, 1, 1, 6, 6, 1, 127, 1, 65, 0, 11, 7, 50, 6, 3, 109, 117, 108, 0, 1, 5, 100, 105, 118,
            95, 115, 0, 2, 5, 100, 105, 118, 95, 117, 0, 3, 5, 114, 101, 109, 95, 115, 0, 4, 5, 114, 101, 109,
            95, 117, 0, 5, 8, 103, 101, 116, 95, 104, 105, 103, 104, 0, 0, 10, 191, 1, 6, 4, 0, 35, 0, 11, 36,
            1, 1, 126, 32, 0, 173, 32, 1, 173, 66, 32, 134, 132, 32, 2, 173, 32, 3, 173, 66, 32, 134, 132,
            126, 34, 4, 66, 32, 135, 167, 36, 0, 32, 4, 167, 11, 36, 1, 1, 126, 32, 0, 173, 32, 1, 173, 66,
            32, 134, 132, 32, 2, 173, 32, 3, 173, 66, 32, 134, 132, 127, 34, 4, 66, 32, 135, 167, 36, 0, 32,
            4, 167, 11, 36, 1, 1, 126, 32, 0, 173, 32, 1, 173, 66, 32, 134, 132, 32, 2, 173, 32, 3, 173, 66,
            32, 134, 132, 128, 34, 4, 66, 32, 135, 167, 36, 0, 32, 4, 167, 11, 36, 1, 1, 126, 32, 0, 173, 32,
            1, 173, 66, 32, 134, 132, 32, 2, 173, 32, 3, 173, 66, 32, 134, 132, 129, 34, 4, 66, 32, 135, 167,
            36, 0, 32, 4, 167, 11, 36, 1, 1, 126, 32, 0, 173, 32, 1, 173, 66, 32, 134, 132, 32, 2, 173, 32, 3,
            173, 66, 32, 134, 132, 130, 34, 4, 66, 32, 135, 167, 36, 0, 32, 4, 167, 11,
          ]),
        ),
        {},
      ).exports;
    } catch {}
    function f(v, y, O) {
      ((this.low = v | 0), (this.high = y | 0), (this.unsigned = !!O));
    }
    (f.prototype.__isLong__, Object.defineProperty(f.prototype, "__isLong__", { value: !0 }));
    function d(v) {
      return (v && v.__isLong__) === !0;
    }
    function i(v) {
      var clz32 = Math.clz32(v & -v);
      return v ? 31 - clz32 : clz32;
    }
    f.isLong = d;
    var o = {},
      e = {};
    function t(v, y) {
      var O, T, P;
      if (y) {
        if (((v >>>= 0), (P = 0 <= v && v < 256))) {
          if (((T = e[v]), T)) return T;
        }
        if (((O = n(v, 0, !0)), P)) e[v] = O;
        return O;
      } else {
        if (((v |= 0), (P = -128 <= v && v < 128))) {
          if (((T = o[v]), T)) return T;
        }
        if (((O = n(v, v < 0 ? -1 : 0, !1)), P)) o[v] = O;
        return O;
      }
    }
    f.fromInt = t;
    function r(v, y) {
      if (isNaN(v)) return y ? tt : G;
      if (y) {
        if (v < 0) return tt;
        if (v >= xe) return we;
      } else {
        if (v <= -Se) return M;
        if (v + 1 >= Se) return Te;
      }
      if (v < 0) return r(-v, y).neg();
      return n((v % et) | 0, (v / et) | 0, y);
    }
    f.fromNumber = r;
    function n(v, y, O) {
      return new f(v, y, O);
    }
    f.fromBits = n;
    var pow = Math.pow;
    function s(v, y, O) {
      if (v.length === 0) throw Error("empty string");
      if (typeof y === "number") ((O = y), (y = !1));
      else y = !!y;
      if (v === "NaN" || v === "Infinity" || v === "+Infinity" || v === "-Infinity") return y ? tt : G;
      if (((O = O || 10), O < 2 || 36 < O)) throw RangeError("radix");
      var T;
      if ((T = v.indexOf("-")) > 0) throw Error("interior hyphen");
      else if (T === 0) return s(v.substring(1), y, O).neg();
      var P = r(pow(O, 8)),
        E = G;
      for (var L = 0; L < v.length; L += 8) {
        var min = Math.min(8, v.length - L),
          H = parseInt(v.substring(L, L + min), O);
        if (min < 8) {
          var D = r(pow(O, min));
          E = E.mul(D).add(r(H));
        } else ((E = E.mul(P)), (E = E.add(r(H))));
      }
      return ((E.unsigned = y), E);
    }
    f.fromString = s;
    function m(v, y) {
      if (typeof v === "number") return r(v, y);
      if (typeof v === "string") return s(v, y);
      return n(v.low, v.high, typeof y === "boolean" ? y : v.unsigned);
    }
    f.fromValue = m;
    var I = 65536,
      Q = 16777216,
      et = I * I,
      xe = et * et,
      Se = xe / 2,
      ge = t(Q),
      G = t(0);
    f.ZERO = G;
    var tt = t(0, !0);
    f.UZERO = tt;
    var ft = t(1);
    f.ONE = ft;
    var Ne = t(1, !0);
    f.UONE = Ne;
    var Ht = t(-1);
    f.NEG_ONE = Ht;
    var Te = n(-1, 2147483647, !1);
    f.MAX_VALUE = Te;
    var we = n(-1, -1, !0);
    f.MAX_UNSIGNED_VALUE = we;
    var M = n(0, -2147483648, !1);
    f.MIN_VALUE = M;
    var b = f.prototype;
    if (
      ((b.toInt = function () {
        return this.unsigned ? this.low >>> 0 : this.low;
      }),
      (b.toNumber = function () {
        if (this.unsigned) return (this.high >>> 0) * et + (this.low >>> 0);
        return this.high * et + (this.low >>> 0);
      }),
      (b.toString = function (y) {
        if (((y = y || 10), y < 2 || 36 < y)) throw RangeError("radix");
        if (this.isZero()) return "0";
        if (this.isNegative())
          if (this.eq(M)) {
            var O = r(y),
              div = this.div(O),
              sub = div.mul(O).sub(this);
            return div.toString(y) + sub.toInt().toString(y);
          } else return "-" + this.neg().toString(y);
        var E = r(pow(y, 6), this.unsigned),
          L = this,
          C = "";
        while (!0) {
          var div_2 = L.div(E),
            D = L.sub(div_2.mul(E)).toInt() >>> 0,
            str = D.toString(y);
          if (((L = div_2), L.isZero())) return str + C;
          else {
            while (str.length < 6) str = "0" + str;
            C = "" + str + C;
          }
        }
      }),
      (b.getHighBits = function () {
        return this.high;
      }),
      (b.getHighBitsUnsigned = function () {
        return this.high >>> 0;
      }),
      (b.getLowBits = function () {
        return this.low;
      }),
      (b.getLowBitsUnsigned = function () {
        return this.low >>> 0;
      }),
      (b.getNumBitsAbs = function () {
        if (this.isNegative()) return this.eq(M) ? 64 : this.neg().getNumBitsAbs();
        var y = this.high != 0 ? this.high : this.low;
        for (var O = 31; O > 0; O--) if ((y & (1 << O)) != 0) break;
        return this.high != 0 ? O + 33 : O + 1;
      }),
      (b.isSafeInteger = function () {
        var y = this.high >> 21;
        if (!y) return !0;
        if (this.unsigned) return !1;
        return y === -1 && !(this.low === 0 && this.high === -2097152);
      }),
      (b.isZero = function () {
        return this.high === 0 && this.low === 0;
      }),
      (b.eqz = b.isZero),
      (b.isNegative = function () {
        return !this.unsigned && this.high < 0;
      }),
      (b.isPositive = function () {
        return this.unsigned || this.high >= 0;
      }),
      (b.isOdd = function () {
        return (this.low & 1) === 1;
      }),
      (b.isEven = function () {
        return (this.low & 1) === 0;
      }),
      (b.equals = function (y) {
        if (!d(y)) y = m(y);
        if (this.unsigned !== y.unsigned && this.high >>> 31 === 1 && y.high >>> 31 === 1) return !1;
        return this.high === y.high && this.low === y.low;
      }),
      (b.eq = b.equals),
      (b.notEquals = function (y) {
        return !this.eq(y);
      }),
      (b.neq = b.notEquals),
      (b.ne = b.notEquals),
      (b.lessThan = function (y) {
        return this.comp(y) < 0;
      }),
      (b.lt = b.lessThan),
      (b.lessThanOrEqual = function (y) {
        return this.comp(y) <= 0;
      }),
      (b.lte = b.lessThanOrEqual),
      (b.le = b.lessThanOrEqual),
      (b.greaterThan = function (y) {
        return this.comp(y) > 0;
      }),
      (b.gt = b.greaterThan),
      (b.greaterThanOrEqual = function (y) {
        return this.comp(y) >= 0;
      }),
      (b.gte = b.greaterThanOrEqual),
      (b.ge = b.greaterThanOrEqual),
      (b.compare = function (y) {
        if (!d(y)) y = m(y);
        if (this.eq(y)) return 0;
        var isNegative = this.isNegative(),
          isNegative_2 = y.isNegative();
        if (isNegative && !isNegative_2) return -1;
        if (!isNegative && isNegative_2) return 1;
        if (!this.unsigned) return this.sub(y).isNegative() ? -1 : 1;
        return y.high >>> 0 > this.high >>> 0 || (y.high === this.high && y.low >>> 0 > this.low >>> 0)
          ? -1
          : 1;
      }),
      (b.comp = b.compare),
      (b.negate = function () {
        if (!this.unsigned && this.eq(M)) return M;
        return this.not().add(ft);
      }),
      (b.neg = b.negate),
      (b.add = function (y) {
        if (!d(y)) y = m(y);
        var O = this.high >>> 16,
          T = this.high & 65535,
          P = this.low >>> 16,
          E = this.low & 65535,
          L = y.high >>> 16,
          C = y.high & 65535,
          H = y.low >>> 16,
          D = y.low & 65535,
          _ = 0,
          F = 0,
          R = 0,
          q = 0;
        return (
          (q += E + D),
          (R += q >>> 16),
          (q &= 65535),
          (R += P + H),
          (F += R >>> 16),
          (R &= 65535),
          (F += T + C),
          (_ += F >>> 16),
          (F &= 65535),
          (_ += O + L),
          (_ &= 65535),
          n((R << 16) | q, (_ << 16) | F, this.unsigned)
        );
      }),
      (b.subtract = function (y) {
        if (!d(y)) y = m(y);
        return this.add(y.neg());
      }),
      (b.sub = b.subtract),
      (b.multiply = function (y) {
        if (this.isZero()) return this;
        if (!d(y)) y = m(y);
        if (u) {
          var mul = u.mul(this.low, this.high, y.low, y.high);
          return n(mul, u.get_high(), this.unsigned);
        }
        if (y.isZero()) return this.unsigned ? tt : G;
        if (this.eq(M)) return y.isOdd() ? M : G;
        if (y.eq(M)) return this.isOdd() ? M : G;
        if (this.isNegative())
          if (y.isNegative()) return this.neg().mul(y.neg());
          else return this.neg().mul(y).neg();
        else if (y.isNegative()) return this.mul(y.neg()).neg();
        if (this.lt(ge) && y.lt(ge)) return r(this.toNumber() * y.toNumber(), this.unsigned);
        var T = this.high >>> 16,
          P = this.high & 65535,
          E = this.low >>> 16,
          L = this.low & 65535,
          C = y.high >>> 16,
          H = y.high & 65535,
          D = y.low >>> 16,
          _ = y.low & 65535,
          F = 0,
          R = 0,
          q = 0,
          Ot = 0;
        return (
          (Ot += L * _),
          (q += Ot >>> 16),
          (Ot &= 65535),
          (q += E * _),
          (R += q >>> 16),
          (q &= 65535),
          (q += L * D),
          (R += q >>> 16),
          (q &= 65535),
          (R += P * _),
          (F += R >>> 16),
          (R &= 65535),
          (R += E * D),
          (F += R >>> 16),
          (R &= 65535),
          (R += L * H),
          (F += R >>> 16),
          (R &= 65535),
          (F += T * _ + P * D + E * H + L * C),
          (F &= 65535),
          n((q << 16) | Ot, (F << 16) | R, this.unsigned)
        );
      }),
      (b.mul = b.multiply),
      (b.divide = function (y) {
        if (!d(y)) y = m(y);
        if (y.isZero()) throw Error("division by zero");
        if (u) {
          if (!this.unsigned && this.high === -2147483648 && y.low === -1 && y.high === -1) return this;
          var O = (this.unsigned ? u.div_u : u.div_s)(this.low, this.high, y.low, y.high);
          return n(O, u.get_high(), this.unsigned);
        }
        if (this.isZero()) return this.unsigned ? tt : G;
        var T, P, E;
        if (!this.unsigned) {
          if (this.eq(M))
            if (y.eq(ft) || y.eq(Ht)) return M;
            else if (y.eq(M)) return ft;
            else {
              var shr = this.shr(1);
              if (((T = shr.div(y).shl(1)), T.eq(G))) return y.isNegative() ? ft : Ht;
              else return ((P = this.sub(y.mul(T))), (E = T.add(P.div(y))), E);
            }
          else if (y.eq(M)) return this.unsigned ? tt : G;
          if (this.isNegative()) {
            if (y.isNegative()) return this.neg().div(y.neg());
            return this.neg().div(y).neg();
          } else if (y.isNegative()) return this.div(y.neg()).neg();
          E = G;
        } else {
          if (!y.unsigned) y = y.toUnsigned();
          if (y.gt(this)) return tt;
          if (y.gt(this.shru(1))) return Ne;
          E = tt;
        }
        P = this;
        while (P.gte(y)) {
          T = Math.max(1, Math.floor(P.toNumber() / y.toNumber()));
          var ceil = Math.ceil(Math.log(T) / Math.LN2),
            H = ceil <= 48 ? 1 : pow(2, ceil - 48),
            D = r(T),
            mul = D.mul(y);
          while (mul.isNegative() || mul.gt(P)) ((T -= H), (D = r(T, this.unsigned)), (mul = D.mul(y)));
          if (D.isZero()) D = ft;
          ((E = E.add(D)), (P = P.sub(mul)));
        }
        return E;
      }),
      (b.div = b.divide),
      (b.modulo = function (y) {
        if (!d(y)) y = m(y);
        if (u) {
          var O = (this.unsigned ? u.rem_u : u.rem_s)(this.low, this.high, y.low, y.high);
          return n(O, u.get_high(), this.unsigned);
        }
        return this.sub(this.div(y).mul(y));
      }),
      (b.mod = b.modulo),
      (b.rem = b.modulo),
      (b.not = function () {
        return n(~this.low, ~this.high, this.unsigned);
      }),
      (b.countLeadingZeros = function () {
        return this.high ? Math.clz32(this.high) : Math.clz32(this.low) + 32;
      }),
      (b.clz = b.countLeadingZeros),
      (b.countTrailingZeros = function () {
        return this.low ? i(this.low) : i(this.high) + 32;
      }),
      (b.ctz = b.countTrailingZeros),
      (b.and = function (y) {
        if (!d(y)) y = m(y);
        return n(this.low & y.low, this.high & y.high, this.unsigned);
      }),
      (b.or = function (y) {
        if (!d(y)) y = m(y);
        return n(this.low | y.low, this.high | y.high, this.unsigned);
      }),
      (b.xor = function (y) {
        if (!d(y)) y = m(y);
        return n(this.low ^ y.low, this.high ^ y.high, this.unsigned);
      }),
      (b.shiftLeft = function (y) {
        if (d(y)) y = y.toInt();
        if ((y &= 63) === 0) return this;
        else if (y < 32) return n(this.low << y, (this.high << y) | (this.low >>> (32 - y)), this.unsigned);
        else return n(0, this.low << (y - 32), this.unsigned);
      }),
      (b.shl = b.shiftLeft),
      (b.shiftRight = function (y) {
        if (d(y)) y = y.toInt();
        if ((y &= 63) === 0) return this;
        else if (y < 32) return n((this.low >>> y) | (this.high << (32 - y)), this.high >> y, this.unsigned);
        else return n(this.high >> (y - 32), this.high >= 0 ? 0 : -1, this.unsigned);
      }),
      (b.shr = b.shiftRight),
      (b.shiftRightUnsigned = function (y) {
        if (d(y)) y = y.toInt();
        if ((y &= 63) === 0) return this;
        if (y < 32) return n((this.low >>> y) | (this.high << (32 - y)), this.high >>> y, this.unsigned);
        if (y === 32) return n(this.high, 0, this.unsigned);
        return n(this.high >>> (y - 32), 0, this.unsigned);
      }),
      (b.shru = b.shiftRightUnsigned),
      (b.shr_u = b.shiftRightUnsigned),
      (b.rotateLeft = function (y) {
        var O;
        if (d(y)) y = y.toInt();
        if ((y &= 63) === 0) return this;
        if (y === 32) return n(this.high, this.low, this.unsigned);
        if (y < 32)
          return (
            (O = 32 - y),
            n((this.low << y) | (this.high >>> O), (this.high << y) | (this.low >>> O), this.unsigned)
          );
        return (
          (y -= 32),
          (O = 32 - y),
          n((this.high << y) | (this.low >>> O), (this.low << y) | (this.high >>> O), this.unsigned)
        );
      }),
      (b.rotl = b.rotateLeft),
      (b.rotateRight = function (y) {
        var O;
        if (d(y)) y = y.toInt();
        if ((y &= 63) === 0) return this;
        if (y === 32) return n(this.high, this.low, this.unsigned);
        if (y < 32)
          return (
            (O = 32 - y),
            n((this.high << O) | (this.low >>> y), (this.low << O) | (this.high >>> y), this.unsigned)
          );
        return (
          (y -= 32),
          (O = 32 - y),
          n((this.low << O) | (this.high >>> y), (this.high << O) | (this.low >>> y), this.unsigned)
        );
      }),
      (b.rotr = b.rotateRight),
      (b.toSigned = function () {
        if (!this.unsigned) return this;
        return n(this.low, this.high, !1);
      }),
      (b.toUnsigned = function () {
        if (this.unsigned) return this;
        return n(this.low, this.high, !0);
      }),
      (b.toBytes = function (y) {
        return y ? this.toBytesLE() : this.toBytesBE();
      }),
      (b.toBytesLE = function () {
        var high = this.high,
          low = this.low;
        return [
          low & 255,
          (low >>> 8) & 255,
          (low >>> 16) & 255,
          low >>> 24,
          high & 255,
          (high >>> 8) & 255,
          (high >>> 16) & 255,
          high >>> 24,
        ];
      }),
      (b.toBytesBE = function () {
        var high = this.high,
          low = this.low;
        return [
          high >>> 24,
          (high >>> 16) & 255,
          (high >>> 8) & 255,
          high & 255,
          low >>> 24,
          (low >>> 16) & 255,
          (low >>> 8) & 255,
          low & 255,
        ];
      }),
      (f.fromBytes = function (y, O, T) {
        return T ? f.fromBytesLE(y, O) : f.fromBytesBE(y, O);
      }),
      (f.fromBytesLE = function (y, O) {
        return new f(
          y[0] | (y[1] << 8) | (y[2] << 16) | (y[3] << 24),
          y[4] | (y[5] << 8) | (y[6] << 16) | (y[7] << 24),
          O,
        );
      }),
      (f.fromBytesBE = function (y, O) {
        return new f(
          (y[4] << 24) | (y[5] << 16) | (y[6] << 8) | y[7],
          (y[0] << 24) | (y[1] << 16) | (y[2] << 8) | y[3],
          O,
        );
      }),
      typeof BigInt === "function")
    )
      ((f.fromBigInt = function (y, O) {
        var T = Number(BigInt.asIntN(32, y)),
          P = Number(BigInt.asIntN(32, y >> BigInt(32)));
        return n(T, P, O);
      }),
        (f.fromValue = function (y, O) {
          if (typeof y === "bigint") return f.fromBigInt(y, O);
          return m(y, O);
        }),
        (b.toBigInt = function () {
          var y = BigInt(this.low >>> 0),
            O = BigInt(this.unsigned ? this.high >>> 0 : this.high);
          return (O << BigInt(32)) | y;
        }));
    var Yl = (l.default = f);
  });
});

export { hHr };
