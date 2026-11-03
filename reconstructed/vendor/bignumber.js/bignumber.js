/**
 * bignumber.js/bignumber.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: bignumber.js@9.1.2..9.3.1
 * pieces: chunk-na3pph4p.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../runtime/bun-runtime.js";

//@ chunk-na3pph4p.js:18271-37695 cjs-fingerprint
var Ir = x(function (en, Dt) {
  (function (e) {
    var t,
      r = /^-?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i,
      { ceil: ceil, floor: floor } = Math,
      a = "[BigNumber Error] ",
      h = a + "Number primitive has more than 15 significant digits: ",
      g = 100000000000000,
      E = 14,
      k = 9007199254740991,
      T = [
        1, 10, 100, 1000, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9, 10000000000, 100000000000, 1000000000000,
        10000000000000,
      ],
      j = 1e7,
      I = 1e9;
    function Y(D) {
      var U,
        L,
        W,
        C = (A.prototype = { constructor: A, toString: null, valueOf: null }),
        ee = new A(1),
        V = 20,
        X = 4,
        ce = -7,
        de = 21,
        Ze = -1e7,
        ke = 1e7,
        et = !1,
        wt = 1,
        Ge = 0,
        Ar = {
          prefix: "",
          groupSize: 3,
          secondaryGroupSize: 0,
          groupSeparator: ",",
          decimalSeparator: ".",
          fractionGroupSize: 0,
          fractionGroupSeparator: "\xA0",
          suffix: "",
        },
        tt = "0123456789abcdefghijklmnopqrstuvwxyz",
        Tr = !0;
      function A(i, o) {
        var c,
          y,
          l,
          f,
          m,
          u,
          d,
          _,
          p = this;
        if (!(p instanceof A)) return new A(i, o);
        if (o == null) {
          if (i && i._isBigNumber === !0) {
            if (((p.s = i.s), !i.c || i.e > ke)) p.c = p.e = null;
            else if (i.e < Ze) p.c = [(p.e = 0)];
            else ((p.e = i.e), (p.c = i.c.slice()));
            return;
          }
          if ((u = typeof i == "number") && i * 0 == 0) {
            if (((p.s = 1 / i < 0 ? ((i = -i), -1) : 1), i === ~~i)) {
              for (f = 0, m = i; m >= 10; m /= 10, f++);
              if (f > ke) p.c = p.e = null;
              else ((p.e = f), (p.c = [i]));
              return;
            }
            _ = String(i);
          } else {
            if (!r.test((_ = String(i)))) return W(p, _, u);
            p.s = _.charCodeAt(0) == 45 ? ((_ = _.slice(1)), -1) : 1;
          }
          if ((f = _.indexOf(".")) > -1) _ = _.replace(".", "");
          if ((m = _.search(/e/i)) > 0) {
            if (f < 0) f = m;
            ((f += +_.slice(m + 1)), (_ = _.substring(0, m)));
          } else if (f < 0) f = _.length;
        } else {
          if ((O(o, 2, tt.length, "Base"), o == 10 && Tr)) return ((p = new A(i)), pe(p, V + p.e + 1, X));
          if (((_ = String(i)), (u = typeof i == "number"))) {
            if (i * 0 != 0) return W(p, _, u, o);
            if (
              ((p.s = 1 / i < 0 ? ((_ = _.slice(1)), -1) : 1),
              A.DEBUG && _.replace(/^0\.0*|\./, "").length > 15)
            )
              throw Error(h + i);
          } else p.s = _.charCodeAt(0) === 45 ? ((_ = _.slice(1)), -1) : 1;
          ((c = tt.slice(0, o)), (f = m = 0));
          for (d = _.length; m < d; m++)
            if (c.indexOf((y = _.charAt(m))) < 0) {
              if (y == ".") {
                if (m > f) {
                  f = d;
                  continue;
                }
              } else if (!l) {
                if (
                  (_ == _.toUpperCase() && (_ = _.toLowerCase())) ||
                  (_ == _.toLowerCase() && (_ = _.toUpperCase()))
                ) {
                  ((l = !0), (m = -1), (f = 0));
                  continue;
                }
              }
              return W(p, String(i), u, o);
            }
          if (((u = !1), (_ = L(_, o, 10, p.s)), (f = _.indexOf(".")) > -1)) _ = _.replace(".", "");
          else f = _.length;
        }
        for (m = 0; _.charCodeAt(m) === 48; m++);
        for (d = _.length; _.charCodeAt(--d) === 48;);
        if ((_ = _.slice(m, ++d))) {
          if (((d -= m), u && A.DEBUG && d > 15 && (i > k || i !== floor(i)))) throw Error(h + p.s * i);
          if ((f = f - m - 1) > ke) p.c = p.e = null;
          else if (f < Ze) p.c = [(p.e = 0)];
          else {
            if (((p.e = f), (p.c = []), (m = (f + 1) % E), f < 0)) m += E;
            if (m < d) {
              if (m) p.c.push(+_.slice(0, m));
              for (d -= E; m < d;) p.c.push(+_.slice(m, (m += E)));
              m = E - (_ = _.slice(m)).length;
            } else m -= d;
            for (; m--; _ += "0");
            p.c.push(+_);
          }
        } else p.c = [(p.e = 0)];
      }
      ((A.clone = Y),
        (A.ROUND_UP = 0),
        (A.ROUND_DOWN = 1),
        (A.ROUND_CEIL = 2),
        (A.ROUND_FLOOR = 3),
        (A.ROUND_HALF_UP = 4),
        (A.ROUND_HALF_DOWN = 5),
        (A.ROUND_HALF_EVEN = 6),
        (A.ROUND_HALF_CEIL = 7),
        (A.ROUND_HALF_FLOOR = 8),
        (A.EUCLID = 9),
        (A.config = A.set =
          function (i) {
            var o, c;
            if (i != null)
              if (typeof i == "object") {
                if (i.hasOwnProperty((o = "DECIMAL_PLACES"))) ((c = i[o]), O(c, 0, I, o), (V = c));
                if (i.hasOwnProperty((o = "ROUNDING_MODE"))) ((c = i[o]), O(c, 0, 8, o), (X = c));
                if (i.hasOwnProperty((o = "EXPONENTIAL_AT")))
                  if (((c = i[o]), c && c.pop))
                    (O(c[0], -I, 0, o), O(c[1], 0, I, o), (ce = c[0]), (de = c[1]));
                  else (O(c, -I, I, o), (ce = -(de = c < 0 ? -c : c)));
                if (i.hasOwnProperty((o = "RANGE")))
                  if (((c = i[o]), c && c.pop))
                    (O(c[0], -I, -1, o), O(c[1], 1, I, o), (Ze = c[0]), (ke = c[1]));
                  else if ((O(c, -I, I, o), c)) Ze = -(ke = c < 0 ? -c : c);
                  else throw Error(a + o + " cannot be zero: " + c);
                if (i.hasOwnProperty((o = "CRYPTO")))
                  if (((c = i[o]), c === !!c))
                    if (c)
                      if (typeof crypto < "u" && crypto && (crypto.getRandomValues || crypto.randomBytes))
                        et = c;
                      else throw ((et = !c), Error(a + "crypto unavailable"));
                    else et = c;
                  else throw Error(a + o + " not true or false: " + c);
                if (i.hasOwnProperty((o = "MODULO_MODE"))) ((c = i[o]), O(c, 0, 9, o), (wt = c));
                if (i.hasOwnProperty((o = "POW_PRECISION"))) ((c = i[o]), O(c, 0, I, o), (Ge = c));
                if (i.hasOwnProperty((o = "FORMAT")))
                  if (((c = i[o]), typeof c == "object")) Ar = c;
                  else throw Error(a + o + " not an object: " + c);
                if (i.hasOwnProperty((o = "ALPHABET")))
                  if (((c = i[o]), typeof c == "string" && !/^.?$|[+\-.\s]|(.).*\1/.test(c)))
                    ((Tr = c.slice(0, 10) == "0123456789"), (tt = c));
                  else throw Error(a + o + " invalid: " + c);
              } else throw Error(a + "Object expected: " + i);
            return {
              DECIMAL_PLACES: V,
              ROUNDING_MODE: X,
              EXPONENTIAL_AT: [ce, de],
              RANGE: [Ze, ke],
              CRYPTO: et,
              MODULO_MODE: wt,
              POW_PRECISION: Ge,
              FORMAT: Ar,
              ALPHABET: tt,
            };
          }),
        (A.isBigNumber = function (i) {
          if (!i || i._isBigNumber !== !0) return !1;
          if (!A.DEBUG) return !0;
          var o,
            c,
            { c: y, e: l, s: f } = i;
          e: if ({}.toString.call(y) == "[object Array]") {
            if ((f === 1 || f === -1) && l >= -I && l <= I && l === floor(l)) {
              if (y[0] === 0) {
                if (l === 0 && y.length === 1) return !0;
                break e;
              }
              if (((o = (l + 1) % E), o < 1)) o += E;
              if (String(y[0]).length == o) {
                for (o = 0; o < y.length; o++) if (((c = y[o]), c < 0 || c >= g || c !== floor(c))) break e;
                if (c !== 0) return !0;
              }
            }
          } else if (y === null && l === null && (f === null || f === 1 || f === -1)) return !0;
          throw Error(a + "Invalid BigNumber: " + i);
        }),
        (A.maximum = A.max =
          function () {
            return bs(arguments, -1);
          }),
        (A.minimum = A.min =
          function () {
            return bs(arguments, 1);
          }),
        (A.random = (function () {
          var i = 9007199254740992,
            o =
              (Math.random() * i) & 2097151
                ? function () {
                    return floor(Math.random() * i);
                  }
                : function () {
                    return ((Math.random() * 1073741824) | 0) * 8388608 + ((Math.random() * 8388608) | 0);
                  };
          return function (c) {
            var y,
              l,
              f,
              m,
              u,
              d = 0,
              _ = [],
              p = new A(ee);
            if (c == null) c = V;
            else O(c, 0, I);
            if (((m = ceil(c / E)), et))
              if (crypto.getRandomValues) {
                y = crypto.getRandomValues(new Uint32Array((m *= 2)));
                for (; d < m;)
                  if (((u = y[d] * 131072 + (y[d + 1] >>> 11)), u >= 9000000000000000))
                    ((l = crypto.getRandomValues(new Uint32Array(2))), (y[d] = l[0]), (y[d + 1] = l[1]));
                  else (_.push(u % 100000000000000), (d += 2));
                d = m / 2;
              } else if (crypto.randomBytes) {
                y = crypto.randomBytes((m *= 7));
                for (; d < m;)
                  if (
                    ((u =
                      (y[d] & 31) * 281474976710656 +
                      y[d + 1] * 1099511627776 +
                      y[d + 2] * 4294967296 +
                      y[d + 3] * 16777216 +
                      (y[d + 4] << 16) +
                      (y[d + 5] << 8) +
                      y[d + 6]),
                    u >= 9000000000000000)
                  )
                    crypto.randomBytes(7).copy(y, d);
                  else (_.push(u % 100000000000000), (d += 7));
                d = m / 7;
              } else throw ((et = !1), Error(a + "crypto unavailable"));
            if (!et) {
              for (; d < m;) if (((u = o()), u < 9000000000000000)) _[d++] = u % 100000000000000;
            }
            if (((m = _[--d]), (c %= E), m && c)) ((u = T[E - c]), (_[d] = floor(m / u) * u));
            for (; _[d] === 0; _.pop(), d--);
            if (d < 0) _ = [(f = 0)];
            else {
              for (f = -1; _[0] === 0; _.splice(0, 1), f -= E);
              for (d = 1, u = _[0]; u >= 10; u /= 10, d++);
              if (d < E) f -= E - d;
            }
            return ((p.e = f), (p.c = _), p);
          };
        })()),
        (A.sum = function () {
          var i = 1,
            o = arguments,
            c = new A(o[0]);
          for (; i < o.length;) c = c.plus(o[i++]);
          return c;
        }),
        (L = (function () {
          var i = "0123456789";
          function o(c, y, l, f) {
            var m,
              u = [0],
              d,
              _ = 0,
              p = c.length;
            for (; _ < p;) {
              for (d = u.length; d--; u[d] *= y);
              u[0] += f.indexOf(c.charAt(_++));
              for (m = 0; m < u.length; m++)
                if (u[m] > l - 1) {
                  if (u[m + 1] == null) u[m + 1] = 0;
                  ((u[m + 1] += (u[m] / l) | 0), (u[m] %= l));
                }
            }
            return u.reverse();
          }
          return function (c, y, l, f, m) {
            var u,
              d,
              _,
              p,
              w,
              R,
              b,
              M,
              index = c.indexOf("."),
              te = V,
              F = X;
            if (index >= 0)
              ((p = Ge),
                (Ge = 0),
                (c = c.replace(".", "")),
                (M = new A(y)),
                (R = M.pow(c.length - index)),
                (Ge = p),
                (M.c = o(ie(S(R.c), R.e, "0"), 10, l, i)),
                (M.e = M.c.length));
            ((b = o(c, y, l, m ? ((u = tt), i) : ((u = i), tt))), (_ = p = b.length));
            for (; b[--p] == 0; b.pop());
            if (!b[0]) return u.charAt(0);
            if (index < 0) --_;
            else ((R.c = b), (R.e = _), (R.s = f), (R = U(R, M, te, F, l)), (b = R.c), (w = R.r), (_ = R.e));
            if (
              ((d = _ + te + 1),
              (index = b[d]),
              (p = l / 2),
              (w = w || d < 0 || b[d + 1] != null),
              (w =
                F < 4
                  ? (index != null || w) && (F == 0 || F == (R.s < 0 ? 3 : 2))
                  : index > p ||
                    (index == p && (F == 4 || w || (F == 6 && b[d - 1] & 1) || F == (R.s < 0 ? 8 : 7)))),
              d < 1 || !b[0])
            )
              c = w ? ie(u.charAt(1), -te, u.charAt(0)) : u.charAt(0);
            else {
              if (((b.length = d), w)) {
                for (--l; ++b[--d] > l;) if (((b[d] = 0), !d)) (++_, (b = [1].concat(b)));
              }
              for (p = b.length; !b[--p];);
              for (index = 0, c = ""; index <= p; c += u.charAt(b[index++]));
              c = ie(c, _, u.charAt(0));
            }
            return c;
          };
        })()),
        (U = (function () {
          function i(y, l, f) {
            var m,
              u,
              d,
              _,
              p = 0,
              w = y.length,
              R = l % j,
              b = (l / j) | 0;
            for (y = y.slice(); w--;)
              ((d = y[w] % j),
                (_ = (y[w] / j) | 0),
                (m = b * d + _ * R),
                (u = R * d + (m % j) * j + p),
                (p = ((u / f) | 0) + ((m / j) | 0) + b * _),
                (y[w] = u % f));
            if (p) y = [p].concat(y);
            return y;
          }
          function o(y, l, f, m) {
            var u, d;
            if (f != m) d = f > m ? 1 : -1;
            else
              for (u = d = 0; u < f; u++)
                if (y[u] != l[u]) {
                  d = y[u] > l[u] ? 1 : -1;
                  break;
                }
            return d;
          }
          function c(y, l, f, m) {
            var u = 0;
            for (; f--;) ((y[f] -= u), (u = y[f] < l[f] ? 1 : 0), (y[f] = u * m + y[f] - l[f]));
            for (; !y[0] && y.length > 1; y.splice(0, 1));
          }
          return function (y, l, f, m, u) {
            var d,
              _,
              p,
              w,
              R,
              b,
              M,
              z,
              te,
              F,
              B,
              ne,
              Nt,
              kr,
              Or,
              be,
              At,
              ge = y.s == l.s ? 1 : -1,
              oe = y.c,
              Q = l.c;
            if (!oe || !oe[0] || !Q || !Q[0])
              return new A(
                !y.s || !l.s || (oe ? Q && oe[0] == Q[0] : !Q)
                  ? NaN
                  : (oe && oe[0] == 0) || !Q
                    ? ge * 0
                    : ge / 0,
              );
            if (((z = new A(ge)), (te = z.c = []), (_ = y.e - l.e), (ge = f + _ + 1), !u))
              ((u = g), (_ = K(y.e / E) - K(l.e / E)), (ge = (ge / E) | 0));
            for (p = 0; Q[p] == (oe[p] || 0); p++);
            if (Q[p] > (oe[p] || 0)) _--;
            if (ge < 0) (te.push(1), (w = !0));
            else {
              if (((kr = oe.length), (be = Q.length), (p = 0), (ge += 2), (R = floor(u / (Q[0] + 1))), R > 1))
                ((Q = i(Q, R, u)), (oe = i(oe, R, u)), (be = Q.length), (kr = oe.length));
              ((Nt = be), (F = oe.slice(0, be)), (B = F.length));
              for (; B < be; F[B++] = 0);
              if (((At = Q.slice()), (At = [0].concat(At)), (Or = Q[0]), Q[1] >= u / 2)) Or++;
              do {
                if (((R = 0), (d = o(Q, F, be, B)), d < 0)) {
                  if (((ne = F[0]), be != B)) ne = ne * u + (F[1] || 0);
                  if (((R = floor(ne / Or)), R > 1)) {
                    if (R >= u) R = u - 1;
                    ((b = i(Q, R, u)), (M = b.length), (B = F.length));
                    while (o(b, F, M, B) == 1) (R--, c(b, be < M ? At : Q, M, u), (M = b.length), (d = 1));
                  } else {
                    if (R == 0) d = R = 1;
                    ((b = Q.slice()), (M = b.length));
                  }
                  if (M < B) b = [0].concat(b);
                  if ((c(F, b, B, u), (B = F.length), d == -1))
                    while (o(Q, F, be, B) < 1) (R++, c(F, be < B ? At : Q, B, u), (B = F.length));
                } else if (d === 0) (R++, (F = [0]));
                if (((te[p++] = R), F[0])) F[B++] = oe[Nt] || 0;
                else ((F = [oe[Nt]]), (B = 1));
              } while ((Nt++ < kr || F[0] != null) && ge--);
              if (((w = F[0] != null), !te[0])) te.splice(0, 1);
            }
            if (u == g) {
              for (p = 1, ge = te[0]; ge >= 10; ge /= 10, p++);
              pe(z, f + (z.e = p + _ * E - 1) + 1, m, w);
            } else ((z.e = _), (z.r = +w));
            return z;
          };
        })()));
      function Cr(i, o, c, y) {
        var l, f, m, u, d;
        if (c == null) c = X;
        else O(c, 0, 8);
        if (!i.c) return i.toString();
        if (((l = i.c[0]), (m = i.e), o == null))
          ((d = S(i.c)), (d = y == 1 || (y == 2 && (m <= ce || m >= de)) ? Z(d, m) : ie(d, m, "0")));
        else if (
          ((i = pe(new A(i), o, c)),
          (f = i.e),
          (d = S(i.c)),
          (u = d.length),
          y == 1 || (y == 2 && (o <= f || f <= ce)))
        ) {
          for (; u < o; d += "0", u++);
          d = Z(d, f);
        } else if (((o -= m), (d = ie(d, f, "0")), f + 1 > u)) {
          if (--o > 0) for (d += "."; o--; d += "0");
        } else if (((o += f - u), o > 0)) {
          if (f + 1 == u) d += ".";
          for (; o--; d += "0");
        }
        return i.s < 0 && l ? "-" + d : d;
      }
      function bs(i, o) {
        var c,
          y,
          l = 1,
          f = new A(i[0]);
        for (; l < i.length; l++)
          if (((y = new A(i[l])), !y.s || (c = P(f, y)) === o || (c === 0 && f.s === o))) f = y;
        return f;
      }
      function vr(i, o, c) {
        var y = 1,
          l = o.length;
        for (; !o[--l]; o.pop());
        for (l = o[0]; l >= 10; l /= 10, y++);
        if ((c = y + c * E - 1) > ke) i.c = i.e = null;
        else if (c < Ze) i.c = [(i.e = 0)];
        else ((i.e = c), (i.c = o));
        return i;
      }
      W = (function () {
        var i = /^(-?)0([xbo])(?=\w[\w.]*$)/i,
          o = /^([^.]+)\.$/,
          c = /^\.([^.]+)$/,
          y = /^-?(Infinity|NaN)$/,
          l = /^\s*\+(?=[\w.])|^\s+|\s+$/g;
        return function (f, m, u, d) {
          var _,
            p = u ? m : m.replace(l, "");
          if (y.test(p)) f.s = isNaN(p) ? null : p < 0 ? -1 : 1;
          else {
            if (!u) {
              if (
                ((p = p.replace(i, function (w, R, b) {
                  return ((_ = (b = b.toLowerCase()) == "x" ? 16 : b == "b" ? 2 : 8), !d || d == _ ? R : w);
                })),
                d)
              )
                ((_ = d), (p = p.replace(o, "$1").replace(c, "0.$1")));
              if (m != p) return new A(p, _);
            }
            if (A.DEBUG) throw Error(a + "Not a" + (d ? " base " + d : "") + " number: " + m);
            f.s = null;
          }
          f.c = f.e = null;
        };
      })();
      function pe(i, o, c, y) {
        var l,
          f,
          m,
          u,
          d,
          _,
          p,
          w = i.c,
          R = T;
        if (w) {
          e: {
            for (l = 1, u = w[0]; u >= 10; u /= 10, l++);
            if (((f = o - l), f < 0))
              ((f += E), (m = o), (d = w[(_ = 0)]), (p = floor((d / R[l - m - 1]) % 10)));
            else if (((_ = ceil((f + 1) / E)), _ >= w.length))
              if (y) {
                for (; w.length <= _; w.push(0));
                ((d = p = 0), (l = 1), (f %= E), (m = f - E + 1));
              } else break e;
            else {
              d = u = w[_];
              for (l = 1; u >= 10; u /= 10, l++);
              ((f %= E), (m = f - E + l), (p = m < 0 ? 0 : floor((d / R[l - m - 1]) % 10)));
            }
            if (
              ((y = y || o < 0 || w[_ + 1] != null || (m < 0 ? d : d % R[l - m - 1])),
              (y =
                c < 4
                  ? (p || y) && (c == 0 || c == (i.s < 0 ? 3 : 2))
                  : p > 5 ||
                    (p == 5 &&
                      (c == 4 ||
                        y ||
                        (c == 6 && ((f > 0 ? (m > 0 ? d / R[l - m] : 0) : w[_ - 1]) % 10) & 1) ||
                        c == (i.s < 0 ? 8 : 7)))),
              o < 1 || !w[0])
            ) {
              if (((w.length = 0), y)) ((o -= i.e + 1), (w[0] = R[(E - (o % E)) % E]), (i.e = -o || 0));
              else w[0] = i.e = 0;
              return i;
            }
            if (f == 0) ((w.length = _), (u = 1), _--);
            else ((w.length = _ + 1), (u = R[E - f]), (w[_] = m > 0 ? floor((d / R[l - m]) % R[m]) * u : 0));
            if (y)
              for (;;)
                if (_ == 0) {
                  for (f = 1, m = w[0]; m >= 10; m /= 10, f++);
                  m = w[0] += u;
                  for (u = 1; m >= 10; m /= 10, u++);
                  if (f != u) {
                    if ((i.e++, w[0] == g)) w[0] = 1;
                  }
                  break;
                } else {
                  if (((w[_] += u), w[_] != g)) break;
                  ((w[_--] = 0), (u = 1));
                }
            for (f = w.length; w[--f] === 0; w.pop());
          }
          if (i.e > ke) i.c = i.e = null;
          else if (i.e < Ze) i.c = [(i.e = 0)];
        }
        return i;
      }
      function De(i) {
        var o,
          c = i.e;
        if (c === null) return i.toString();
        return ((o = S(i.c)), (o = c <= ce || c >= de ? Z(o, c) : ie(o, c, "0")), i.s < 0 ? "-" + o : o);
      }
      if (
        ((C.absoluteValue = C.abs =
          function () {
            var i = new A(this);
            if (i.s < 0) i.s = 1;
            return i;
          }),
        (C.comparedTo = function (i, o) {
          return P(this, new A(i, o));
        }),
        (C.decimalPlaces = C.dp =
          function (i, o) {
            var c,
              y,
              l,
              f = this;
            if (i != null) {
              if ((O(i, 0, I), o == null)) o = X;
              else O(o, 0, 8);
              return pe(new A(f), i + f.e + 1, o);
            }
            if (!(c = f.c)) return null;
            if (((y = ((l = c.length - 1) - K(this.e / E)) * E), (l = c[l])))
              for (; l % 10 == 0; l /= 10, y--);
            if (y < 0) y = 0;
            return y;
          }),
        (C.dividedBy = C.div =
          function (i, o) {
            return U(this, new A(i, o), V, X);
          }),
        (C.dividedToIntegerBy = C.idiv =
          function (i, o) {
            return U(this, new A(i, o), 0, 1);
          }),
        (C.exponentiatedBy = C.pow =
          function (i, o) {
            var c,
              y,
              l,
              f,
              m,
              u,
              d,
              _,
              p,
              w = this;
            if (((i = new A(i)), i.c && !i.isInteger())) throw Error(a + "Exponent not an integer: " + De(i));
            if (o != null) o = new A(o);
            if (
              ((u = i.e > 14), !w.c || !w.c[0] || (w.c[0] == 1 && !w.e && w.c.length == 1) || !i.c || !i.c[0])
            )
              return ((p = new A(Math.pow(+De(w), u ? i.s * (2 - G(i)) : +De(i)))), o ? p.mod(o) : p);
            if (((d = i.s < 0), o)) {
              if (o.c ? !o.c[0] : !o.s) return new A(NaN);
              if (((y = !d && w.isInteger() && o.isInteger()), y)) w = w.mod(o);
            } else if (
              i.e > 9 &&
              (w.e > 0 ||
                w.e < -1 ||
                (w.e == 0
                  ? w.c[0] > 1 || (u && w.c[1] >= 240000000)
                  : w.c[0] < 80000000000000 || (u && w.c[0] <= 99999750000000)))
            ) {
              if (((f = w.s < 0 && G(i) ? -0 : 0), w.e > -1)) f = 1 / f;
              return new A(d ? 1 / f : f);
            } else if (Ge) f = ceil(Ge / E + 2);
            if (u) {
              if (((c = new A(0.5)), d)) i.s = 1;
              _ = G(i);
            } else ((l = Math.abs(+De(i))), (_ = l % 2));
            p = new A(ee);
            for (;;) {
              if (_) {
                if (((p = p.times(w)), !p.c)) break;
                if (f) {
                  if (p.c.length > f) p.c.length = f;
                } else if (y) p = p.mod(o);
              }
              if (l) {
                if (((l = floor(l / 2)), l === 0)) break;
                _ = l % 2;
              } else if (((i = i.times(c)), pe(i, i.e + 1, 1), i.e > 14)) _ = G(i);
              else {
                if (((l = +De(i)), l === 0)) break;
                _ = l % 2;
              }
              if (((w = w.times(w)), f)) {
                if (w.c && w.c.length > f) w.c.length = f;
              } else if (y) w = w.mod(o);
            }
            if (y) return p;
            if (d) p = ee.div(p);
            return o ? p.mod(o) : f ? pe(p, Ge, X, m) : p;
          }),
        (C.integerValue = function (i) {
          var o = new A(this);
          if (i == null) i = X;
          else O(i, 0, 8);
          return pe(o, o.e + 1, i);
        }),
        (C.isEqualTo = C.eq =
          function (i, o) {
            return P(this, new A(i, o)) === 0;
          }),
        (C.isFinite = function () {
          return !!this.c;
        }),
        (C.isGreaterThan = C.gt =
          function (i, o) {
            return P(this, new A(i, o)) > 0;
          }),
        (C.isGreaterThanOrEqualTo = C.gte =
          function (i, o) {
            return (o = P(this, new A(i, o))) === 1 || o === 0;
          }),
        (C.isInteger = function () {
          return !!this.c && K(this.e / E) > this.c.length - 2;
        }),
        (C.isLessThan = C.lt =
          function (i, o) {
            return P(this, new A(i, o)) < 0;
          }),
        (C.isLessThanOrEqualTo = C.lte =
          function (i, o) {
            return (o = P(this, new A(i, o))) === -1 || o === 0;
          }),
        (C.isNaN = function () {
          return !this.s;
        }),
        (C.isNegative = function () {
          return this.s < 0;
        }),
        (C.isPositive = function () {
          return this.s > 0;
        }),
        (C.isZero = function () {
          return !!this.c && this.c[0] == 0;
        }),
        (C.minus = function (i, o) {
          var c,
            y,
            l,
            f,
            m = this,
            u = m.s;
          if (((i = new A(i, o)), (o = i.s), !u || !o)) return new A(NaN);
          if (u != o) return ((i.s = -o), m.plus(i));
          var d = m.e / E,
            _ = i.e / E,
            p = m.c,
            w = i.c;
          if (!d || !_) {
            if (!p || !w) return p ? ((i.s = -o), i) : new A(w ? m : NaN);
            if (!p[0] || !w[0]) return w[0] ? ((i.s = -o), i) : new A(p[0] ? m : X == 3 ? -0 : 0);
          }
          if (((d = K(d)), (_ = K(_)), (p = p.slice()), (u = d - _))) {
            if ((f = u < 0)) ((u = -u), (l = p));
            else ((_ = d), (l = w));
            l.reverse();
            for (o = u; o--; l.push(0));
            l.reverse();
          } else {
            y = (f = (u = p.length) < (o = w.length)) ? u : o;
            for (u = o = 0; o < y; o++)
              if (p[o] != w[o]) {
                f = p[o] < w[o];
                break;
              }
          }
          if (f) ((l = p), (p = w), (w = l), (i.s = -i.s));
          if (((o = (y = w.length) - (c = p.length)), o > 0)) for (; o--; p[c++] = 0);
          o = g - 1;
          for (; y > u;) {
            if (p[--y] < w[y]) {
              for (c = y; c && !p[--c]; p[c] = o);
              (--p[c], (p[y] += g));
            }
            p[y] -= w[y];
          }
          for (; p[0] == 0; p.splice(0, 1), --_);
          if (!p[0]) return ((i.s = X == 3 ? -1 : 1), (i.c = [(i.e = 0)]), i);
          return vr(i, p, _);
        }),
        (C.modulo = C.mod =
          function (i, o) {
            var c,
              y,
              l = this;
            if (((i = new A(i, o)), !l.c || !i.s || (i.c && !i.c[0]))) return new A(NaN);
            else if (!i.c || (l.c && !l.c[0])) return new A(l);
            if (wt == 9) ((y = i.s), (i.s = 1), (c = U(l, i, 0, 3)), (i.s = y), (c.s *= y));
            else c = U(l, i, 0, wt);
            if (((i = l.minus(c.times(i))), !i.c[0] && wt == 1)) i.s = l.s;
            return i;
          }),
        (C.multipliedBy = C.times =
          function (i, o) {
            var c,
              y,
              l,
              f,
              m,
              u,
              d,
              _,
              p,
              w,
              R,
              b,
              M,
              z,
              te,
              F = this,
              B = F.c,
              ne = (i = new A(i, o)).c;
            if (!B || !ne || !B[0] || !ne[0]) {
              if (!F.s || !i.s || (B && !B[0] && !ne) || (ne && !ne[0] && !B)) i.c = i.e = i.s = null;
              else if (((i.s *= F.s), !B || !ne)) i.c = i.e = null;
              else ((i.c = [0]), (i.e = 0));
              return i;
            }
            if (((y = K(F.e / E) + K(i.e / E)), (i.s *= F.s), (d = B.length), (w = ne.length), d < w))
              ((M = B), (B = ne), (ne = M), (l = d), (d = w), (w = l));
            for (l = d + w, M = []; l--; M.push(0));
            ((z = g), (te = j));
            for (l = w; --l >= 0;) {
              ((c = 0), (R = ne[l] % te), (b = (ne[l] / te) | 0));
              for (m = d, f = l + m; f > l;)
                ((_ = B[--m] % te),
                  (p = (B[m] / te) | 0),
                  (u = b * _ + p * R),
                  (_ = R * _ + (u % te) * te + M[f] + c),
                  (c = ((_ / z) | 0) + ((u / te) | 0) + b * p),
                  (M[f--] = _ % z));
              M[f] = c;
            }
            if (c) ++y;
            else M.splice(0, 1);
            return vr(i, M, y);
          }),
        (C.negated = function () {
          var i = new A(this);
          return ((i.s = -i.s || null), i);
        }),
        (C.plus = function (i, o) {
          var c,
            y = this,
            l = y.s;
          if (((i = new A(i, o)), (o = i.s), !l || !o)) return new A(NaN);
          if (l != o) return ((i.s = -o), y.minus(i));
          var f = y.e / E,
            m = i.e / E,
            u = y.c,
            d = i.c;
          if (!f || !m) {
            if (!u || !d) return new A(l / 0);
            if (!u[0] || !d[0]) return d[0] ? i : new A(u[0] ? y : l * 0);
          }
          if (((f = K(f)), (m = K(m)), (u = u.slice()), (l = f - m))) {
            if (l > 0) ((m = f), (c = d));
            else ((l = -l), (c = u));
            c.reverse();
            for (; l--; c.push(0));
            c.reverse();
          }
          if (((l = u.length), (o = d.length), l - o < 0)) ((c = d), (d = u), (u = c), (o = l));
          for (l = 0; o;) ((l = ((u[--o] = u[o] + d[o] + l) / g) | 0), (u[o] = g === u[o] ? 0 : u[o] % g));
          if (l) ((u = [l].concat(u)), ++m);
          return vr(i, u, m);
        }),
        (C.precision = C.sd =
          function (i, o) {
            var c,
              y,
              l,
              f = this;
            if (i != null && i !== !!i) {
              if ((O(i, 1, I), o == null)) o = X;
              else O(o, 0, 8);
              return pe(new A(f), i, o);
            }
            if (!(c = f.c)) return null;
            if (((l = c.length - 1), (y = l * E + 1), (l = c[l]))) {
              for (; l % 10 == 0; l /= 10, y--);
              for (l = c[0]; l >= 10; l /= 10, y++);
            }
            if (i && f.e + 1 > y) y = f.e + 1;
            return y;
          }),
        (C.shiftedBy = function (i) {
          return (O(i, -k, k), this.times("1e" + i));
        }),
        (C.squareRoot = C.sqrt =
          function () {
            var i,
              o,
              c,
              y,
              l,
              f = this,
              { c: m, s: u, e: d } = f,
              _ = V + 4,
              p = new A("0.5");
            if (u !== 1 || !m || !m[0]) return new A(!u || (u < 0 && (!m || m[0])) ? NaN : m ? f : 1 / 0);
            if (((u = Math.sqrt(+De(f))), u == 0 || u == 1 / 0)) {
              if (((o = S(m)), (o.length + d) % 2 == 0)) o += "0";
              if (((u = Math.sqrt(+o)), (d = K((d + 1) / 2) - (d < 0 || d % 2)), u == 1 / 0)) o = "5e" + d;
              else ((o = u.toExponential()), (o = o.slice(0, o.indexOf("e") + 1) + d));
              c = new A(o);
            } else c = new A(u + "");
            if (c.c[0]) {
              if (((d = c.e), (u = d + _), u < 3)) u = 0;
              for (;;)
                if (
                  ((l = c),
                  (c = p.times(l.plus(U(f, l, _, 1)))),
                  S(l.c).slice(0, u) === (o = S(c.c)).slice(0, u))
                ) {
                  if (c.e < d) --u;
                  if (((o = o.slice(u - 3, u + 1)), o == "9999" || (!y && o == "4999"))) {
                    if (!y) {
                      if ((pe(l, l.e + V + 2, 0), l.times(l).eq(f))) {
                        c = l;
                        break;
                      }
                    }
                    ((_ += 4), (u += 4), (y = 1));
                  } else {
                    if (!+o || (!+o.slice(1) && o.charAt(0) == "5"))
                      (pe(c, c.e + V + 2, 1), (i = !c.times(c).eq(f)));
                    break;
                  }
                }
            }
            return pe(c, c.e + V + 1, X, i);
          }),
        (C.toExponential = function (i, o) {
          if (i != null) (O(i, 0, I), i++);
          return Cr(this, i, o, 1);
        }),
        (C.toFixed = function (i, o) {
          if (i != null) (O(i, 0, I), (i = i + this.e + 1));
          return Cr(this, i, o);
        }),
        (C.toFormat = function (i, o, c) {
          var y,
            l = this;
          if (c == null)
            if (i != null && o && typeof o == "object") ((c = o), (o = null));
            else if (i && typeof i == "object") ((c = i), (i = o = null));
            else c = Ar;
          else if (typeof c != "object") throw Error(a + "Argument not an object: " + c);
          if (((y = l.toFixed(i, o)), l.c)) {
            var f,
              parts = y.split("."),
              u = +c.groupSize,
              d = +c.secondaryGroupSize,
              _ = c.groupSeparator || "",
              p = parts[0],
              w = parts[1],
              R = l.s < 0,
              b = R ? p.slice(1) : p,
              M = b.length;
            if (d) ((f = u), (u = d), (d = f), (M -= f));
            if (u > 0 && M > 0) {
              ((f = M % u || u), (p = b.substr(0, f)));
              for (; f < M; f += u) p += _ + b.substr(f, u);
              if (d > 0) p += _ + b.slice(f);
              if (R) p = "-" + p;
            }
            y = w
              ? p +
                (c.decimalSeparator || "") +
                ((d = +c.fractionGroupSize)
                  ? w.replace(new RegExp("\\d{" + d + "}\\B", "g"), "$&" + (c.fractionGroupSeparator || ""))
                  : w)
              : p;
          }
          return (c.prefix || "") + y + (c.suffix || "");
        }),
        (C.toFraction = function (i) {
          var o,
            c,
            y,
            l,
            f,
            m,
            u,
            d,
            _,
            p,
            w,
            R,
            b = this,
            M = b.c;
          if (i != null) {
            if (((u = new A(i)), (!u.isInteger() && (u.c || u.s !== 1)) || u.lt(ee)))
              throw Error(a + "Argument " + (u.isInteger() ? "out of range: " : "not an integer: ") + De(u));
          }
          if (!M) return new A(b);
          ((o = new A(ee)),
            (_ = c = new A(ee)),
            (y = d = new A(ee)),
            (R = S(M)),
            (f = o.e = R.length - b.e - 1),
            (o.c[0] = T[(m = f % E) < 0 ? E + m : m]),
            (i = !i || u.comparedTo(o) > 0 ? (f > 0 ? o : _) : u),
            (m = ke),
            (ke = 1 / 0),
            (u = new A(R)),
            (d.c[0] = 0));
          for (;;) {
            if (((p = U(u, o, 0, 1)), (l = c.plus(p.times(y))), l.comparedTo(i) == 1)) break;
            ((c = y),
              (y = l),
              (_ = d.plus(p.times((l = _)))),
              (d = l),
              (o = u.minus(p.times((l = o)))),
              (u = l));
          }
          return (
            (l = U(i.minus(c), y, 0, 1)),
            (d = d.plus(l.times(_))),
            (c = c.plus(l.times(y))),
            (d.s = _.s = b.s),
            (f = f * 2),
            (w =
              U(_, y, f, X)
                .minus(b)
                .abs()
                .comparedTo(U(d, c, f, X).minus(b).abs()) < 1
                ? [_, y]
                : [d, c]),
            (ke = m),
            w
          );
        }),
        (C.toNumber = function () {
          return +De(this);
        }),
        (C.toPrecision = function (i, o) {
          if (i != null) O(i, 1, I);
          return Cr(this, i, o, 2);
        }),
        (C.toString = function (i) {
          var o,
            c = this,
            y = c.s,
            l = c.e;
          if (l === null)
            if (y) {
              if (((o = "Infinity"), y < 0)) o = "-" + o;
            } else o = "NaN";
          else {
            if (i == null) o = l <= ce || l >= de ? Z(S(c.c), l) : ie(S(c.c), l, "0");
            else if (i === 10 && Tr) ((c = pe(new A(c), V + l + 1, X)), (o = ie(S(c.c), c.e, "0")));
            else (O(i, 2, tt.length, "Base"), (o = L(ie(S(c.c), l, "0"), 10, i, y, !0)));
            if (y < 0 && c.c[0]) o = "-" + o;
          }
          return o;
        }),
        (C.valueOf = C.toJSON =
          function () {
            return De(this);
          }),
        (C._isBigNumber = !0),
        D != null)
      )
        A.set(D);
      return A;
    }
    function K(D) {
      var U = D | 0;
      return D > 0 || D === U ? U : U - 1;
    }
    function S(D) {
      var U,
        L,
        W = 1,
        C = D.length,
        ee = D[0] + "";
      for (; W < C;) {
        ((U = D[W++] + ""), (L = E - U.length));
        for (; L--; U = "0" + U);
        ee += U;
      }
      for (C = ee.length; ee.charCodeAt(--C) === 48;);
      return ee.slice(0, C + 1 || 1);
    }
    function P(D, U) {
      var L,
        W,
        C = D.c,
        ee = U.c,
        V = D.s,
        X = U.s,
        ce = D.e,
        de = U.e;
      if (!V || !X) return null;
      if (((L = C && !C[0]), (W = ee && !ee[0]), L || W)) return L ? (W ? 0 : -X) : V;
      if (V != X) return V;
      if (((L = V < 0), (W = ce == de), !C || !ee)) return W ? 0 : !C ^ L ? 1 : -1;
      if (!W) return (ce > de) ^ L ? 1 : -1;
      X = (ce = C.length) < (de = ee.length) ? ce : de;
      for (V = 0; V < X; V++) if (C[V] != ee[V]) return (C[V] > ee[V]) ^ L ? 1 : -1;
      return ce == de ? 0 : (ce > de) ^ L ? 1 : -1;
    }
    function O(D, U, L, W) {
      if (D < U || D > L || D !== floor(D))
        throw Error(
          a +
            (W || "Argument") +
            (typeof D == "number"
              ? D < U || D > L
                ? " out of range: "
                : " not an integer: "
              : " not a primitive number: ") +
            String(D),
        );
    }
    function G(D) {
      var U = D.c.length - 1;
      return K(D.e / E) == U && D.c[U] % 2 != 0;
    }
    function Z(D, U) {
      return (D.length > 1 ? D.charAt(0) + "." + D.slice(1) : D) + (U < 0 ? "e" : "e+") + U;
    }
    function ie(D, U, L) {
      var W, C;
      if (U < 0) {
        for (C = L + "."; ++U; C += L);
        D = C + D;
      } else if (((W = D.length), ++U > W)) {
        for (C = L, U -= W; --U; C += L);
        D += C;
      } else if (U < W) D = D.slice(0, U) + "." + D.slice(U);
      return D;
    }
    if (((t = Y()), (t.default = t.BigNumber = t), typeof define == "function" && define.amd))
      define(function () {
        return t;
      });
    else if (typeof Dt < "u" && Dt.exports) Dt.exports = t;
    else {
      if (!e) e = typeof self < "u" && self ? self : window;
      e.BigNumber = t;
    }
  })(en);
});

export { Ir };
