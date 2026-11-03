/**
 * node-forge/lib/sha1.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: node-forge@1.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { Tn } from "./forge.js";
import { bo } from "./md.js";
import { Zn } from "./util.js";

//@ chunk-fq0cr76a.js:112817-115528 cjs-fingerprint
var cu = x(function (wfe, eA) {
  var To = Tn();
  bo();
  Zn();
  var JT = (eA.exports = To.sha1 = To.sha1 || {});
  To.md.sha1 = To.md.algorithms.sha1 = JT;
  JT.create = function () {
    if (!QT) bG();
    var e = null,
      buffer = To.util.createBuffer(),
      r = Array(80),
      s = {
        algorithm: "sha1",
        blockLength: 64,
        digestLength: 20,
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
          (buffer = To.util.createBuffer()),
          (e = { h0: 1732584193, h1: 4023233417, h2: 2562383102, h3: 271733878, h4: 3285377520 }),
          s
        );
      }),
      s.start(),
      (s.update = function (h, y) {
        if (y === "utf8") h = To.util.encodeUtf8(h);
        var b = h.length;
        ((s.messageLength += b), (b = [(b / 4294967296) >>> 0, b >>> 0]));
        for (var S = s.fullMessageLength.length - 1; S >= 0; --S)
          ((s.fullMessageLength[S] += b[1]),
            (b[1] = b[0] + ((s.fullMessageLength[S] / 4294967296) >>> 0)),
            (s.fullMessageLength[S] = s.fullMessageLength[S] >>> 0),
            (b[0] = (b[1] / 4294967296) >>> 0));
        if ((buffer.putBytes(h), XT(e, r, buffer), buffer.read > 2048 || buffer.length() === 0))
          buffer.compact();
        return s;
      }),
      (s.digest = function () {
        var buffer_2 = To.util.createBuffer();
        buffer_2.putBytes(buffer.bytes());
        var y = s.fullMessageLength[s.fullMessageLength.length - 1] + s.messageLengthSize,
          b = y & (s.blockLength - 1);
        buffer_2.putBytes(bS.substr(0, s.blockLength - b));
        var S,
          w,
          R = s.fullMessageLength[0] * 8;
        for (var D = 0; D < s.fullMessageLength.length - 1; ++D)
          ((S = s.fullMessageLength[D + 1] * 8),
            (w = (S / 4294967296) >>> 0),
            (R += w),
            buffer_2.putInt32(R >>> 0),
            (R = S >>> 0));
        buffer_2.putInt32(R);
        var O = { h0: e.h0, h1: e.h1, h2: e.h2, h3: e.h3, h4: e.h4 };
        XT(O, r, buffer_2);
        var buffer_3 = To.util.createBuffer();
        return (
          buffer_3.putInt32(O.h0),
          buffer_3.putInt32(O.h1),
          buffer_3.putInt32(O.h2),
          buffer_3.putInt32(O.h3),
          buffer_3.putInt32(O.h4),
          buffer_3
        );
      }),
      s
    );
  };
  var bS = null,
    QT = !1;
  function bG() {
    ((bS = String.fromCharCode(128)), (bS += To.util.fillString(String.fromCharCode(0), 64)), (QT = !0));
  }
  function XT(e, n, r) {
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
      ((h = e.h0), (y = e.h1), (b = e.h2), (S = e.h3), (w = e.h4));
      for (D = 0; D < 16; ++D)
        ((s = r.getInt32()),
          (n[D] = s),
          (R = S ^ (y & (b ^ S))),
          (s = ((h << 5) | (h >>> 27)) + R + w + 1518500249 + s),
          (w = S),
          (S = b),
          (b = ((y << 30) | (y >>> 2)) >>> 0),
          (y = h),
          (h = s));
      for (; D < 20; ++D)
        ((s = n[D - 3] ^ n[D - 8] ^ n[D - 14] ^ n[D - 16]),
          (s = (s << 1) | (s >>> 31)),
          (n[D] = s),
          (R = S ^ (y & (b ^ S))),
          (s = ((h << 5) | (h >>> 27)) + R + w + 1518500249 + s),
          (w = S),
          (S = b),
          (b = ((y << 30) | (y >>> 2)) >>> 0),
          (y = h),
          (h = s));
      for (; D < 32; ++D)
        ((s = n[D - 3] ^ n[D - 8] ^ n[D - 14] ^ n[D - 16]),
          (s = (s << 1) | (s >>> 31)),
          (n[D] = s),
          (R = y ^ b ^ S),
          (s = ((h << 5) | (h >>> 27)) + R + w + 1859775393 + s),
          (w = S),
          (S = b),
          (b = ((y << 30) | (y >>> 2)) >>> 0),
          (y = h),
          (h = s));
      for (; D < 40; ++D)
        ((s = n[D - 6] ^ n[D - 16] ^ n[D - 28] ^ n[D - 32]),
          (s = (s << 2) | (s >>> 30)),
          (n[D] = s),
          (R = y ^ b ^ S),
          (s = ((h << 5) | (h >>> 27)) + R + w + 1859775393 + s),
          (w = S),
          (S = b),
          (b = ((y << 30) | (y >>> 2)) >>> 0),
          (y = h),
          (h = s));
      for (; D < 60; ++D)
        ((s = n[D - 6] ^ n[D - 16] ^ n[D - 28] ^ n[D - 32]),
          (s = (s << 2) | (s >>> 30)),
          (n[D] = s),
          (R = (y & b) | (S & (y ^ b))),
          (s = ((h << 5) | (h >>> 27)) + R + w + 2400959708 + s),
          (w = S),
          (S = b),
          (b = ((y << 30) | (y >>> 2)) >>> 0),
          (y = h),
          (h = s));
      for (; D < 80; ++D)
        ((s = n[D - 6] ^ n[D - 16] ^ n[D - 28] ^ n[D - 32]),
          (s = (s << 2) | (s >>> 30)),
          (n[D] = s),
          (R = y ^ b ^ S),
          (s = ((h << 5) | (h >>> 27)) + R + w + 3395469782 + s),
          (w = S),
          (S = b),
          (b = ((y << 30) | (y >>> 2)) >>> 0),
          (y = h),
          (h = s));
      ((e.h0 = (e.h0 + h) | 0),
        (e.h1 = (e.h1 + y) | 0),
        (e.h2 = (e.h2 + b) | 0),
        (e.h3 = (e.h3 + S) | 0),
        (e.h4 = (e.h4 + w) | 0),
        (O -= 64));
    }
  }
});

export { cu };
