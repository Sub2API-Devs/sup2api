/**
 * node-forge/lib/md5.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: node-forge@1.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { Tn } from "./forge.js";
import { bo } from "./md.js";
import { Zn } from "./util.js";

//@ chunk-fq0cr76a.js:65722-68269 cjs-fingerprint
var jh = x(function (mfe, RT) {
  var So = Tn();
  bo();
  Zn();
  var AT = (RT.exports = So.md5 = So.md5 || {});
  So.md.md5 = So.md.algorithms.md5 = AT;
  AT.create = function () {
    if (!CT) m3();
    var e = null,
      buffer = So.util.createBuffer(),
      r = Array(16),
      s = {
        algorithm: "md5",
        blockLength: 64,
        digestLength: 16,
        messageLength: 0,
        fullMessageLength: null,
        messageLengthSize: 8,
      };
    return (
      (s.start = function () {
        ((s.messageLength = 0), (s.fullMessageLength = s.messageLength64 = []));
        var h = s.messageLengthSize / 4;
        for (var y = 0; y < h; ++y) s.fullMessageLength.push(0);
        return (
          (buffer = So.util.createBuffer()),
          (e = { h0: 1732584193, h1: 4023233417, h2: 2562383102, h3: 271733878 }),
          s
        );
      }),
      s.start(),
      (s.update = function (h, y) {
        if (y === "utf8") h = So.util.encodeUtf8(h);
        var b = h.length;
        ((s.messageLength += b), (b = [(b / 4294967296) >>> 0, b >>> 0]));
        for (var S = s.fullMessageLength.length - 1; S >= 0; --S)
          ((s.fullMessageLength[S] += b[1]),
            (b[1] = b[0] + ((s.fullMessageLength[S] / 4294967296) >>> 0)),
            (s.fullMessageLength[S] = s.fullMessageLength[S] >>> 0),
            (b[0] = (b[1] / 4294967296) >>> 0));
        if ((buffer.putBytes(h), TT(e, r, buffer), buffer.read > 2048 || buffer.length() === 0))
          buffer.compact();
        return s;
      }),
      (s.digest = function () {
        var buffer_2 = So.util.createBuffer();
        buffer_2.putBytes(buffer.bytes());
        var y = s.fullMessageLength[s.fullMessageLength.length - 1] + s.messageLengthSize,
          b = y & (s.blockLength - 1);
        buffer_2.putBytes(lS.substr(0, s.blockLength - b));
        var S,
          w = 0;
        for (var R = s.fullMessageLength.length - 1; R >= 0; --R)
          ((S = s.fullMessageLength[R] * 8 + w), (w = (S / 4294967296) >>> 0), buffer_2.putInt32Le(S >>> 0));
        var D = { h0: e.h0, h1: e.h1, h2: e.h2, h3: e.h3 };
        TT(D, r, buffer_2);
        var buffer_3 = So.util.createBuffer();
        return (
          buffer_3.putInt32Le(D.h0),
          buffer_3.putInt32Le(D.h1),
          buffer_3.putInt32Le(D.h2),
          buffer_3.putInt32Le(D.h3),
          buffer_3
        );
      }),
      s
    );
  };
  var lS = null,
    qh = null,
    yf = null,
    ou = null,
    CT = !1;
  function m3() {
    ((lS = String.fromCharCode(128)),
      (lS += So.util.fillString(String.fromCharCode(0), 64)),
      (qh = [
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 1, 6, 11, 0, 5, 10, 15, 4, 9, 14, 3, 8, 13, 2,
        7, 12, 5, 8, 11, 14, 1, 4, 7, 10, 13, 0, 3, 6, 9, 12, 15, 2, 0, 7, 14, 5, 12, 3, 10, 1, 8, 15, 6, 13,
        4, 11, 2, 9,
      ]),
      (yf = [
        7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
        5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15,
        21, 6, 10, 15, 21, 6, 10, 15, 21,
      ]),
      (ou = Array(64)));
    for (var e = 0; e < 64; ++e) ou[e] = Math.floor(Math.abs(Math.sin(e + 1)) * 4294967296);
    CT = !0;
  }
  function TT(e, n, r) {
    var s,
      h,
      y,
      b,
      S,
      w,
      R,
      D,
      O = r.length();
    while (O >= 64) {
      ((h = e.h0), (y = e.h1), (b = e.h2), (S = e.h3));
      for (D = 0; D < 16; ++D)
        ((n[D] = r.getInt32Le()),
          (w = S ^ (y & (b ^ S))),
          (s = h + w + ou[D] + n[D]),
          (R = yf[D]),
          (h = S),
          (S = b),
          (b = y),
          (y += (s << R) | (s >>> (32 - R))));
      for (; D < 32; ++D)
        ((w = b ^ (S & (y ^ b))),
          (s = h + w + ou[D] + n[qh[D]]),
          (R = yf[D]),
          (h = S),
          (S = b),
          (b = y),
          (y += (s << R) | (s >>> (32 - R))));
      for (; D < 48; ++D)
        ((w = y ^ b ^ S),
          (s = h + w + ou[D] + n[qh[D]]),
          (R = yf[D]),
          (h = S),
          (S = b),
          (b = y),
          (y += (s << R) | (s >>> (32 - R))));
      for (; D < 64; ++D)
        ((w = b ^ (y | ~S)),
          (s = h + w + ou[D] + n[qh[D]]),
          (R = yf[D]),
          (h = S),
          (S = b),
          (b = y),
          (y += (s << R) | (s >>> (32 - R))));
      ((e.h0 = (e.h0 + h) | 0),
        (e.h1 = (e.h1 + y) | 0),
        (e.h2 = (e.h2 + b) | 0),
        (e.h3 = (e.h3 + S) | 0),
        (O -= 64));
    }
  }
});

export { jh };
