/**
 * protobufjs/src/util/utf8.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-798ashq9.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-798ashq9.js:24520-25666 cjs-fingerprint
var xr = x(function (Or) {
  var Gt = Or,
    Jt = "\uFFFD";
  Gt.length = function (u) {
    var f = 0,
      d = 0;
    for (var i = 0; i < u.length; ++i)
      if (((d = u.charCodeAt(i)), d < 128)) f += 1;
      else if (d < 2048) f += 2;
      else if ((d & 64512) === 55296 && (u.charCodeAt(i + 1) & 64512) === 56320) (++i, (f += 4));
      else f += 3;
    return f;
  };
  Gt.read = function (u, f, d) {
    if (d - f < 1) return "";
    var i = "";
    for (var o = f; o < d;) {
      var e = u[o++];
      if (e <= 127) i += String.fromCharCode(e);
      else if (e >= 192 && e < 224) {
        var t = ((e & 31) << 6) | (u[o++] & 63);
        i += t >= 128 ? String.fromCharCode(t) : Jt;
      } else if (e >= 224 && e < 240) {
        var r = ((e & 15) << 12) | ((u[o++] & 63) << 6) | (u[o++] & 63);
        i += r >= 2048 ? String.fromCharCode(r) : Jt;
      } else if (e >= 240) {
        var n = ((e & 7) << 18) | ((u[o++] & 63) << 12) | ((u[o++] & 63) << 6) | (u[o++] & 63);
        if (n < 65536 || n > 1114111) i += Jt;
        else
          ((n -= 65536),
            (i += String.fromCharCode(55296 + (n >> 10))),
            (i += String.fromCharCode(56320 + (n & 1023))));
      }
    }
    return i;
  };
  Gt.write = function (u, f, d) {
    var i = d,
      o,
      e;
    for (var t = 0; t < u.length; ++t)
      if (((o = u.charCodeAt(t)), o < 128)) f[d++] = o;
      else if (o < 2048) ((f[d++] = (o >> 6) | 192), (f[d++] = (o & 63) | 128));
      else if ((o & 64512) === 55296 && ((e = u.charCodeAt(t + 1)) & 64512) === 56320)
        ((o = 65536 + ((o & 1023) << 10) + (e & 1023)),
          ++t,
          (f[d++] = (o >> 18) | 240),
          (f[d++] = ((o >> 12) & 63) | 128),
          (f[d++] = ((o >> 6) & 63) | 128),
          (f[d++] = (o & 63) | 128));
      else ((f[d++] = (o >> 12) | 224), (f[d++] = ((o >> 6) & 63) | 128), (f[d++] = (o & 63) | 128));
    return d - i;
  };
});

export { xr };
