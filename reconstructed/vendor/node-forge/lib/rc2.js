/**
 * node-forge/lib/rc2.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: node-forge@1.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { Tn } from "./forge.js";
import { Zn } from "./util.js";

//@ chunk-fq0cr76a.js:89883-92952 cjs-fingerprint
var hS = x(function (_fe, WT) {
  var ei = Tn();
  Zn();
  var pS = [
      217, 120, 249, 196, 25, 221, 181, 237, 40, 233, 253, 121, 74, 160, 216, 157, 198, 126, 55, 131, 43, 118,
      83, 142, 98, 76, 100, 136, 68, 139, 251, 162, 23, 154, 89, 245, 135, 179, 79, 19, 97, 69, 109, 141, 9,
      129, 125, 50, 189, 143, 64, 235, 134, 183, 123, 11, 240, 149, 33, 34, 92, 107, 78, 130, 84, 214, 101,
      147, 206, 96, 178, 28, 115, 86, 192, 20, 167, 140, 241, 220, 18, 117, 202, 31, 59, 190, 228, 209, 66,
      61, 212, 48, 163, 60, 182, 38, 111, 191, 14, 218, 70, 105, 7, 87, 39, 242, 29, 155, 188, 148, 67, 3,
      248, 17, 199, 246, 144, 239, 62, 231, 6, 195, 213, 47, 200, 102, 30, 215, 8, 232, 234, 222, 128, 82,
      238, 247, 132, 170, 114, 172, 53, 77, 106, 42, 150, 26, 210, 113, 90, 21, 73, 116, 75, 159, 208, 94, 4,
      24, 164, 236, 194, 224, 65, 110, 15, 81, 203, 204, 36, 145, 175, 80, 161, 244, 112, 57, 153, 124, 58,
      133, 35, 184, 180, 122, 252, 2, 54, 91, 37, 85, 151, 49, 45, 93, 250, 152, 227, 138, 146, 174, 5, 223,
      41, 16, 103, 108, 186, 201, 211, 0, 230, 207, 225, 158, 168, 44, 99, 22, 1, 63, 88, 226, 137, 169, 13,
      56, 52, 27, 171, 51, 255, 176, 187, 72, 12, 95, 185, 177, 205, 46, 197, 243, 219, 71, 229, 165, 156,
      119, 10, 166, 32, 104, 254, 127, 193, 173,
    ],
    $T = [1, 2, 3, 5],
    I3 = function (e, n) {
      return ((e << n) & 65535) | ((e & 65535) >> (16 - n));
    },
    N3 = function (e, n) {
      return ((e & 65535) >> n) | ((e << (16 - n)) & 65535);
    };
  WT.exports = ei.rc2 = ei.rc2 || {};
  ei.rc2.expandKey = function (e, n) {
    if (typeof e === "string") e = ei.util.createBuffer(e);
    n = n || 128;
    var r = e,
      s = e.length(),
      h = n,
      ceil = Math.ceil(h / 8),
      b = 255 >> (h & 7),
      S;
    for (S = s; S < 128; S++) r.putByte(pS[(r.at(S - 1) + r.at(S - s)) & 255]);
    r.setAt(128 - ceil, pS[r.at(128 - ceil) & b]);
    for (S = 127 - ceil; S >= 0; S--) r.setAt(S, pS[r.at(S + 1) ^ r.at(S + ceil)]);
    return r;
  };
  var VT = function (e, n, r) {
    var s = !1,
      h = null,
      y = null,
      b = null,
      S,
      w,
      R,
      D,
      O = [];
    e = ei.rc2.expandKey(e, n);
    for (R = 0; R < 64; R++) O.push(e.getInt16Le());
    if (r)
      ((S = function (K) {
        for (R = 0; R < 4; R++)
          ((K[R] += O[D] + (K[(R + 3) % 4] & K[(R + 2) % 4]) + (~K[(R + 3) % 4] & K[(R + 1) % 4])),
            (K[R] = I3(K[R], $T[R])),
            D++);
      }),
        (w = function (K) {
          for (R = 0; R < 4; R++) K[R] += O[K[(R + 3) % 4] & 63];
        }));
    else
      ((S = function (K) {
        for (R = 3; R >= 0; R--)
          ((K[R] = N3(K[R], $T[R])),
            (K[R] -= O[D] + (K[(R + 3) % 4] & K[(R + 2) % 4]) + (~K[(R + 3) % 4] & K[(R + 1) % 4])),
            D--);
      }),
        (w = function (K) {
          for (R = 3; R >= 0; R--) K[R] -= O[K[(R + 3) % 4] & 63];
        }));
    var L = function (K) {
        var q = [];
        for (R = 0; R < 4; R++) {
          var int16Le = h.getInt16Le();
          if (b !== null)
            if (r) int16Le ^= b.getInt16Le();
            else b.putInt16Le(int16Le);
          q.push(int16Le & 65535);
        }
        D = r ? 0 : 63;
        for (var J = 0; J < K.length; J++) for (var ie = 0; ie < K[J][0]; ie++) K[J][1](q);
        for (R = 0; R < 4; R++) {
          if (b !== null)
            if (r) b.putInt16Le(q[R]);
            else q[R] ^= b.getInt16Le();
          y.putInt16Le(q[R]);
        }
      },
      V = null;
    return (
      (V = {
        start: function (K, q) {
          if (K) {
            if (typeof K === "string") K = ei.util.createBuffer(K);
          }
          ((s = !1),
            (h = ei.util.createBuffer()),
            (y = q || new ei.util.createBuffer()),
            (b = K),
            (V.output = y));
        },
        update: function (K) {
          if (!s) h.putBuffer(K);
          while (h.length() >= 8)
            L([
              [5, S],
              [1, w],
              [6, S],
              [1, w],
              [5, S],
            ]);
        },
        finish: function (K) {
          var q = !0;
          if (r)
            if (K) q = K(8, h, !r);
            else {
              var Z = h.length() === 8 ? 8 : 8 - h.length();
              h.fillWithByte(Z, Z);
            }
          if (q) ((s = !0), V.update());
          if (!r) {
            if (((q = h.length() === 0), q))
              if (K) q = K(8, y, !r);
              else {
                var J = y.length(),
                  at = y.at(J - 1);
                if (at > J) q = !1;
                else y.truncate(at);
              }
          }
          return q;
        },
      }),
      V
    );
  };
  ei.rc2.startEncrypting = function (e, n, r) {
    var encryptionCipher = ei.rc2.createEncryptionCipher(e, 128);
    return (encryptionCipher.start(n, r), encryptionCipher);
  };
  ei.rc2.createEncryptionCipher = function (e, n) {
    return VT(e, n, !0);
  };
  ei.rc2.startDecrypting = function (e, n, r) {
    var decryptionCipher = ei.rc2.createDecryptionCipher(e, 128);
    return (decryptionCipher.start(n, r), decryptionCipher);
  };
  ei.rc2.createDecryptionCipher = function (e, n) {
    return VT(e, n, !1);
  };
});

export { hS };
