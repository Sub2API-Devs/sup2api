/**
 * protobufjs/src/util/base64.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-798ashq9.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-798ashq9.js:6693-7914 cjs-require-graph
var lr = x(function (ur) {
  var gt = ur;
  gt.length = function (u) {
    var f = u.length;
    if (!f) return 0;
    var d = 0;
    while (--f % 4 > 1 && u.charAt(f) === "=") ++d;
    return Math.ceil(u.length * 3) / 4 - d;
  };
  var pt = Array(64),
    ir = Array(123);
  for (K = 0; K < 64;) ir[(pt[K] = K < 26 ? K + 65 : K < 52 ? K + 71 : K < 62 ? K - 4 : (K - 59) | 43)] = K++;
  var K;
  gt.encode = function (u, f, d) {
    var i = null,
      o = [],
      e = 0,
      t = 0,
      r;
    while (f < d) {
      var n = u[f++];
      switch (t) {
        case 0:
          ((o[e++] = pt[n >> 2]), (r = (n & 3) << 4), (t = 1));
          break;
        case 1:
          ((o[e++] = pt[r | (n >> 4)]), (r = (n & 15) << 2), (t = 2));
          break;
        case 2:
          ((o[e++] = pt[r | (n >> 6)]), (o[e++] = pt[n & 63]), (t = 0));
          break;
      }
      if (e > 8191) ((i || (i = [])).push(String.fromCharCode.apply(String, o)), (e = 0));
    }
    if (t) {
      if (((o[e++] = pt[r]), (o[e++] = 61), t === 1)) o[e++] = 61;
    }
    if (i) {
      if (e) i.push(String.fromCharCode.apply(String, o.slice(0, e)));
      return i.join("");
    }
    return String.fromCharCode.apply(String, o.slice(0, e));
  };
  var or = "invalid encoding";
  gt.decode = function (u, f, d) {
    var i = d,
      o = 0,
      e;
    for (var t = 0; t < u.length;) {
      var code = u.charCodeAt(t++);
      if (code === 61 && o > 1) break;
      if ((code = ir[code]) === void 0) throw Error(or);
      switch (o) {
        case 0:
          ((e = code), (o = 1));
          break;
        case 1:
          ((f[d++] = (e << 2) | ((code & 48) >> 4)), (e = code), (o = 2));
          break;
        case 2:
          ((f[d++] = ((e & 15) << 4) | ((code & 60) >> 2)), (e = code), (o = 3));
          break;
        case 3:
          ((f[d++] = ((e & 3) << 6) | code), (o = 0));
          break;
      }
    }
    if (o === 1) throw Error(or);
    return d - i;
  };
  gt.test = function (u) {
    return /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(u);
  };
});

export { lr };
