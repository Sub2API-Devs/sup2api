/**
 * node-forge/lib/sha256.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: node-forge@1.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { Tn } from "./forge.js";
import { bo } from "./md.js";
import { Zn } from "./util.js";

//@ chunk-fq0cr76a.js:81621-84760 cjs-fingerprint
var uS = x(function (Sfe, FT) {
  var _o = Tn();
  bo();
  Zn();
  var LT = (FT.exports = _o.sha256 = _o.sha256 || {});
  _o.md.sha256 = _o.md.algorithms.sha256 = LT;
  LT.create = function () {
    if (!BT) C3();
    var e = null,
      buffer = _o.util.createBuffer(),
      r = Array(64),
      s = {
        algorithm: "sha256",
        blockLength: 64,
        digestLength: 32,
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
          (buffer = _o.util.createBuffer()),
          (e = {
            h0: 1779033703,
            h1: 3144134277,
            h2: 1013904242,
            h3: 2773480762,
            h4: 1359893119,
            h5: 2600822924,
            h6: 528734635,
            h7: 1541459225,
          }),
          s
        );
      }),
      s.start(),
      (s.update = function (h, y) {
        if (y === "utf8") h = _o.util.encodeUtf8(h);
        var b = h.length;
        ((s.messageLength += b), (b = [(b / 4294967296) >>> 0, b >>> 0]));
        for (var S = s.fullMessageLength.length - 1; S >= 0; --S)
          ((s.fullMessageLength[S] += b[1]),
            (b[1] = b[0] + ((s.fullMessageLength[S] / 4294967296) >>> 0)),
            (s.fullMessageLength[S] = s.fullMessageLength[S] >>> 0),
            (b[0] = (b[1] / 4294967296) >>> 0));
        if ((buffer.putBytes(h), PT(e, r, buffer), buffer.read > 2048 || buffer.length() === 0))
          buffer.compact();
        return s;
      }),
      (s.digest = function () {
        var buffer_2 = _o.util.createBuffer();
        buffer_2.putBytes(buffer.bytes());
        var y = s.fullMessageLength[s.fullMessageLength.length - 1] + s.messageLengthSize,
          b = y & (s.blockLength - 1);
        buffer_2.putBytes(cS.substr(0, s.blockLength - b));
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
        var O = { h0: e.h0, h1: e.h1, h2: e.h2, h3: e.h3, h4: e.h4, h5: e.h5, h6: e.h6, h7: e.h7 };
        PT(O, r, buffer_2);
        var buffer_3 = _o.util.createBuffer();
        return (
          buffer_3.putInt32(O.h0),
          buffer_3.putInt32(O.h1),
          buffer_3.putInt32(O.h2),
          buffer_3.putInt32(O.h3),
          buffer_3.putInt32(O.h4),
          buffer_3.putInt32(O.h5),
          buffer_3.putInt32(O.h6),
          buffer_3.putInt32(O.h7),
          buffer_3
        );
      }),
      s
    );
  };
  var cS = null,
    BT = !1,
    UT = null;
  function C3() {
    ((cS = String.fromCharCode(128)),
      (cS += _o.util.fillString(String.fromCharCode(0), 64)),
      (UT = [
        1116352408, 1899447441, 3049323471, 3921009573, 961987163, 1508970993, 2453635748, 2870763221,
        3624381080, 310598401, 607225278, 1426881987, 1925078388, 2162078206, 2614888103, 3248222580,
        3835390401, 4022224774, 264347078, 604807628, 770255983, 1249150122, 1555081692, 1996064986,
        2554220882, 2821834349, 2952996808, 3210313671, 3336571891, 3584528711, 113926993, 338241895,
        666307205, 773529912, 1294757372, 1396182291, 1695183700, 1986661051, 2177026350, 2456956037,
        2730485921, 2820302411, 3259730800, 3345764771, 3516065817, 3600352804, 4094571909, 275423344,
        430227734, 506948616, 659060556, 883997877, 958139571, 1322822218, 1537002063, 1747873779, 1955562222,
        2024104815, 2227730452, 2361852424, 2428436474, 2756734187, 3204031479, 3329325298,
      ]),
      (BT = !0));
  }
  function PT(e, n, r) {
    var s,
      h,
      y,
      b,
      S,
      w,
      R,
      D,
      O,
      L,
      V,
      K,
      q,
      Z,
      J,
      ie = r.length();
    while (ie >= 64) {
      for (R = 0; R < 16; ++R) n[R] = r.getInt32();
      for (; R < 64; ++R)
        ((s = n[R - 2]),
          (s = ((s >>> 17) | (s << 15)) ^ ((s >>> 19) | (s << 13)) ^ (s >>> 10)),
          (h = n[R - 15]),
          (h = ((h >>> 7) | (h << 25)) ^ ((h >>> 18) | (h << 14)) ^ (h >>> 3)),
          (n[R] = (s + n[R - 7] + h + n[R - 16]) | 0));
      ((D = e.h0), (O = e.h1), (L = e.h2), (V = e.h3), (K = e.h4), (q = e.h5), (Z = e.h6), (J = e.h7));
      for (R = 0; R < 64; ++R)
        ((b = ((K >>> 6) | (K << 26)) ^ ((K >>> 11) | (K << 21)) ^ ((K >>> 25) | (K << 7))),
          (S = Z ^ (K & (q ^ Z))),
          (y = ((D >>> 2) | (D << 30)) ^ ((D >>> 13) | (D << 19)) ^ ((D >>> 22) | (D << 10))),
          (w = (D & O) | (L & (D ^ O))),
          (s = J + b + S + UT[R] + n[R]),
          (h = y + w),
          (J = Z),
          (Z = q),
          (q = K),
          (K = (V + s) >>> 0),
          (V = L),
          (L = O),
          (O = D),
          (D = (s + h) >>> 0));
      ((e.h0 = (e.h0 + D) | 0),
        (e.h1 = (e.h1 + O) | 0),
        (e.h2 = (e.h2 + L) | 0),
        (e.h3 = (e.h3 + V) | 0),
        (e.h4 = (e.h4 + K) | 0),
        (e.h5 = (e.h5 + q) | 0),
        (e.h6 = (e.h6 + Z) | 0),
        (e.h7 = (e.h7 + J) | 0),
        (ie -= 64));
    }
  }
});

export { uS };
