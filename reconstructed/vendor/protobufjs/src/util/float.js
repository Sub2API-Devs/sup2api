/**
 * protobufjs/src/util/float.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-798ashq9.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-798ashq9.js:8495-12915 cjs-require-graph
var mr = x(function (sc, hr) {
  hr.exports = fr(fr);
  function fr(l) {
    if (typeof Float32Array < "u")
      (function () {
        var float32Array = new Float32Array([-0]),
          uint8Array = new Uint8Array(float32Array.buffer),
          d = uint8Array[3] === 128;
        function i(r, n, c) {
          ((float32Array[0] = r),
            (n[c] = uint8Array[0]),
            (n[c + 1] = uint8Array[1]),
            (n[c + 2] = uint8Array[2]),
            (n[c + 3] = uint8Array[3]));
        }
        function o(r, n, c) {
          ((float32Array[0] = r),
            (n[c] = uint8Array[3]),
            (n[c + 1] = uint8Array[2]),
            (n[c + 2] = uint8Array[1]),
            (n[c + 3] = uint8Array[0]));
        }
        ((l.writeFloatLE = d ? i : o), (l.writeFloatBE = d ? o : i));
        function e(r, n) {
          return (
            (uint8Array[0] = r[n]),
            (uint8Array[1] = r[n + 1]),
            (uint8Array[2] = r[n + 2]),
            (uint8Array[3] = r[n + 3]),
            float32Array[0]
          );
        }
        function t(r, n) {
          return (
            (uint8Array[3] = r[n]),
            (uint8Array[2] = r[n + 1]),
            (uint8Array[1] = r[n + 2]),
            (uint8Array[0] = r[n + 3]),
            float32Array[0]
          );
        }
        ((l.readFloatLE = d ? e : t), (l.readFloatBE = d ? t : e));
      })();
    else
      (function () {
        function u(d, i, o, e) {
          var t = i < 0 ? 1 : 0;
          if (t) i = -i;
          if (i === 0) d(1 / i > 0 ? 0 : 2147483648, o, e);
          else if (isNaN(i)) d(2143289344, o, e);
          else if (i > 340282346638528860000000000000000000000) d(((t << 31) | 2139095040) >>> 0, o, e);
          else if (i < 0.000000000000000000000000000000000000011754943508222875)
            d(
              ((t << 31) | Math.round(i / 0.000000000000000000000000000000000000000000001401298464324817)) >>>
                0,
              o,
              e,
            );
          else {
            var floored = Math.floor(Math.log(i) / Math.LN2),
              n = Math.round(i * Math.pow(2, -floored) * 8388608) & 8388607;
            d(((t << 31) | ((floored + 127) << 23) | n) >>> 0, o, e);
          }
        }
        ((l.writeFloatLE = u.bind(null, pr)), (l.writeFloatBE = u.bind(null, sr)));
        function f(d, i, o) {
          var e = d(i, o),
            t = (e >> 31) * 2 + 1,
            r = (e >>> 23) & 255,
            n = e & 8388607;
          return r === 255
            ? n
              ? NaN
              : t * (1 / 0)
            : r === 0
              ? t * 0.000000000000000000000000000000000000000000001401298464324817 * n
              : t * Math.pow(2, r - 150) * (n + 8388608);
        }
        ((l.readFloatLE = f.bind(null, dr)), (l.readFloatBE = f.bind(null, yr)));
      })();
    if (typeof Float64Array < "u")
      (function () {
        var float64Array = new Float64Array([-0]),
          uint8Array = new Uint8Array(float64Array.buffer),
          d = uint8Array[7] === 128;
        function i(r, n, c) {
          ((float64Array[0] = r),
            (n[c] = uint8Array[0]),
            (n[c + 1] = uint8Array[1]),
            (n[c + 2] = uint8Array[2]),
            (n[c + 3] = uint8Array[3]),
            (n[c + 4] = uint8Array[4]),
            (n[c + 5] = uint8Array[5]),
            (n[c + 6] = uint8Array[6]),
            (n[c + 7] = uint8Array[7]));
        }
        function o(r, n, c) {
          ((float64Array[0] = r),
            (n[c] = uint8Array[7]),
            (n[c + 1] = uint8Array[6]),
            (n[c + 2] = uint8Array[5]),
            (n[c + 3] = uint8Array[4]),
            (n[c + 4] = uint8Array[3]),
            (n[c + 5] = uint8Array[2]),
            (n[c + 6] = uint8Array[1]),
            (n[c + 7] = uint8Array[0]));
        }
        ((l.writeDoubleLE = d ? i : o), (l.writeDoubleBE = d ? o : i));
        function e(r, n) {
          return (
            (uint8Array[0] = r[n]),
            (uint8Array[1] = r[n + 1]),
            (uint8Array[2] = r[n + 2]),
            (uint8Array[3] = r[n + 3]),
            (uint8Array[4] = r[n + 4]),
            (uint8Array[5] = r[n + 5]),
            (uint8Array[6] = r[n + 6]),
            (uint8Array[7] = r[n + 7]),
            float64Array[0]
          );
        }
        function t(r, n) {
          return (
            (uint8Array[7] = r[n]),
            (uint8Array[6] = r[n + 1]),
            (uint8Array[5] = r[n + 2]),
            (uint8Array[4] = r[n + 3]),
            (uint8Array[3] = r[n + 4]),
            (uint8Array[2] = r[n + 5]),
            (uint8Array[1] = r[n + 6]),
            (uint8Array[0] = r[n + 7]),
            float64Array[0]
          );
        }
        ((l.readDoubleLE = d ? e : t), (l.readDoubleBE = d ? t : e));
      })();
    else
      (function () {
        function u(d, i, o, e, t, r) {
          var n = e < 0 ? 1 : 0;
          if (n) e = -e;
          if (e === 0) (d(0, t, r + i), d(1 / e > 0 ? 0 : 2147483648, t, r + o));
          else if (isNaN(e)) (d(0, t, r + i), d(2146959360, t, r + o));
          else if (
            e >
            179769313486231570000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
          )
            (d(0, t, r + i), d(((n << 31) | 2146435072) >>> 0, t, r + o));
          else {
            var c;
            if (
              e <
              0.000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000022250738585072014
            )
              ((c =
                e /
                0.000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000005),
                d(c >>> 0, t, r + i),
                d(((n << 31) | (c / 4294967296)) >>> 0, t, r + o));
            else {
              var floored = Math.floor(Math.log(e) / Math.LN2);
              if (floored === 1024) floored = 1023;
              ((c = e * Math.pow(2, -floored)),
                d((c * 4503599627370496) >>> 0, t, r + i),
                d(((n << 31) | ((floored + 1023) << 20) | ((c * 1048576) & 1048575)) >>> 0, t, r + o));
            }
          }
        }
        ((l.writeDoubleLE = u.bind(null, pr, 0, 4)), (l.writeDoubleBE = u.bind(null, sr, 4, 0)));
        function f(d, i, o, e, t) {
          var r = d(e, t + i),
            n = d(e, t + o),
            c = (n >> 31) * 2 + 1,
            s = (n >>> 20) & 2047,
            m = 4294967296 * (n & 1048575) + r;
          return s === 2047
            ? m
              ? NaN
              : c * (1 / 0)
            : s === 0
              ? c *
                0.000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000005 *
                m
              : c * Math.pow(2, s - 1075) * (m + 4503599627370496);
        }
        ((l.readDoubleLE = f.bind(null, dr, 0, 4)), (l.readDoubleBE = f.bind(null, yr, 4, 0)));
      })();
    return l;
  }
  function pr(l, u, f) {
    ((u[f] = l & 255), (u[f + 1] = (l >>> 8) & 255), (u[f + 2] = (l >>> 16) & 255), (u[f + 3] = l >>> 24));
  }
  function sr(l, u, f) {
    ((u[f] = l >>> 24), (u[f + 1] = (l >>> 16) & 255), (u[f + 2] = (l >>> 8) & 255), (u[f + 3] = l & 255));
  }
  function dr(l, u) {
    return (l[u] | (l[u + 1] << 8) | (l[u + 2] << 16) | (l[u + 3] << 24)) >>> 0;
  }
  function yr(l, u) {
    return ((l[u] << 24) | (l[u + 1] << 16) | (l[u + 2] << 8) | l[u + 3]) >>> 0;
  }
});

export { mr };
