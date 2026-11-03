/**
 * node-forge/lib/aes.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: node-forge@1.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { Tn } from "./forge.js";
import { $h } from "./cipher.js";
import { tS } from "./cipherModes.js";
import { Zn } from "./util.js";

//@ chunk-fq0cr76a.js:43142-47100 cjs-fingerprint
var Xa = x(function (ufe, ST) {
  var Sr = Tn();
  $h();
  tS();
  Zn();
  ST.exports = Sr.aes = Sr.aes || {};
  Sr.aes.startEncrypting = function (e, n, r, s) {
    var h = Gh({ key: e, output: r, decrypt: !1, mode: s });
    return (h.start(n), h);
  };
  Sr.aes.createEncryptionCipher = function (e, n) {
    return Gh({ key: e, output: null, decrypt: !1, mode: n });
  };
  Sr.aes.startDecrypting = function (e, n, r, s) {
    var h = Gh({ key: e, output: r, decrypt: !0, mode: s });
    return (h.start(n), h);
  };
  Sr.aes.createDecryptionCipher = function (e, n) {
    return Gh({ key: e, output: null, decrypt: !0, mode: n });
  };
  Sr.aes.Algorithm = function (e, n) {
    if (!iS) yT();
    var r = this;
    ((r.name = e),
      (r.mode = new n({
        blockSize: 16,
        cipher: {
          encrypt: function (s, h) {
            return rS(r._w, s, h, !1);
          },
          decrypt: function (s, h) {
            return rS(r._w, s, h, !0);
          },
        },
      })),
      (r._init = !1));
  };
  Sr.aes.Algorithm.prototype.initialize = function (e) {
    if (this._init) return;
    var key = e.key,
      r;
    if (typeof key === "string" && (key.length === 16 || key.length === 24 || key.length === 32))
      key = Sr.util.createBuffer(key);
    else if (Sr.util.isArray(key) && (key.length === 16 || key.length === 24 || key.length === 32)) {
      ((r = key), (key = Sr.util.createBuffer()));
      for (var s = 0; s < r.length; ++s) key.putByte(r[s]);
    }
    if (!Sr.util.isArray(key)) {
      ((r = key), (key = []));
      var h = r.length();
      if (h === 16 || h === 24 || h === 32) {
        h = h >>> 2;
        for (var s = 0; s < h; ++s) key.push(r.getInt32());
      }
    }
    if (!Sr.util.isArray(key) || !(key.length === 4 || key.length === 6 || key.length === 8))
      throw Error("Invalid key parameter.");
    var y = this.mode.name,
      b = ["CFB", "OFB", "CTR", "GCM"].indexOf(y) !== -1;
    ((this._w = bT(key, e.decrypt && !b)), (this._init = !0));
  };
  Sr.aes._expandKey = function (e, n) {
    if (!iS) yT();
    return bT(e, n);
  };
  Sr.aes._updateBlock = rS;
  su("AES-ECB", Sr.cipher.modes.ecb);
  su("AES-CBC", Sr.cipher.modes.cbc);
  su("AES-CFB", Sr.cipher.modes.cfb);
  su("AES-OFB", Sr.cipher.modes.ofb);
  su("AES-CTR", Sr.cipher.modes.ctr);
  su("AES-GCM", Sr.cipher.modes.gcm);
  function su(e, n) {
    var r = function () {
      return new Sr.aes.Algorithm(e, n);
    };
    Sr.cipher.registerAlgorithm(e, r);
  }
  var iS = !1,
    nu = 4,
    Vs,
    nS,
    gT,
    rc,
    zi;
  function yT() {
    ((iS = !0), (gT = [0, 1, 2, 4, 8, 16, 32, 64, 128, 27, 54]));
    var e = Array(256);
    for (var n = 0; n < 128; ++n) ((e[n] = n << 1), (e[n + 128] = ((n + 128) << 1) ^ 283));
    ((Vs = Array(256)), (nS = Array(256)), (rc = [, , , ,]), (zi = [, , , ,]));
    for (var n = 0; n < 4; ++n) ((rc[n] = Array(256)), (zi[n] = Array(256)));
    var r = 0,
      s = 0,
      h,
      y,
      b,
      S,
      w,
      R,
      D;
    for (var n = 0; n < 256; ++n) {
      ((S = s ^ (s << 1) ^ (s << 2) ^ (s << 3) ^ (s << 4)),
        (S = (S >> 8) ^ (S & 255) ^ 99),
        (Vs[r] = S),
        (nS[S] = r),
        (w = e[S]),
        (h = e[r]),
        (y = e[h]),
        (b = e[y]),
        (R = (w << 24) ^ (S << 16) ^ (S << 8) ^ (S ^ w)),
        (D = ((h ^ y ^ b) << 24) ^ ((r ^ b) << 16) ^ ((r ^ y ^ b) << 8) ^ (r ^ h ^ b)));
      for (var O = 0; O < 4; ++O)
        ((rc[O][r] = R), (zi[O][S] = D), (R = (R << 24) | (R >>> 8)), (D = (D << 24) | (D >>> 8)));
      if (r === 0) r = s = 1;
      else ((r = h ^ e[e[e[h ^ b]]]), (s ^= e[e[s]]));
    }
  }
  function bT(e, n) {
    var sliced = e.slice(0),
      s,
      h = 1,
      y = sliced.length,
      b = y + 6 + 1,
      S = nu * b;
    for (var w = y; w < S; ++w) {
      if (((s = sliced[w - 1]), w % y === 0))
        ((s =
          (Vs[(s >>> 16) & 255] << 24) ^
          (Vs[(s >>> 8) & 255] << 16) ^
          (Vs[s & 255] << 8) ^
          Vs[s >>> 24] ^
          (gT[h] << 24)),
          h++);
      else if (y > 6 && w % y === 4)
        s = (Vs[s >>> 24] << 24) ^ (Vs[(s >>> 16) & 255] << 16) ^ (Vs[(s >>> 8) & 255] << 8) ^ Vs[s & 255];
      sliced[w] = sliced[w - y] ^ s;
    }
    if (n) {
      var R,
        D = zi[0],
        O = zi[1],
        L = zi[2],
        V = zi[3],
        sliced_2 = sliced.slice(0);
      S = sliced.length;
      for (var w = 0, q = S - nu; w < S; w += nu, q -= nu)
        if (w === 0 || w === S - nu)
          ((sliced_2[w] = sliced[q]),
            (sliced_2[w + 1] = sliced[q + 3]),
            (sliced_2[w + 2] = sliced[q + 2]),
            (sliced_2[w + 3] = sliced[q + 1]));
        else
          for (var Z = 0; Z < nu; ++Z)
            ((R = sliced[q + Z]),
              (sliced_2[w + (3 & -Z)] =
                D[Vs[R >>> 24]] ^ O[Vs[(R >>> 16) & 255]] ^ L[Vs[(R >>> 8) & 255]] ^ V[Vs[R & 255]]));
      sliced = sliced_2;
    }
    return sliced;
  }
  function rS(e, n, r, s) {
    var h = e.length / 4 - 1,
      y,
      b,
      S,
      w,
      R;
    if (s) ((y = zi[0]), (b = zi[1]), (S = zi[2]), (w = zi[3]), (R = nS));
    else ((y = rc[0]), (b = rc[1]), (S = rc[2]), (w = rc[3]), (R = Vs));
    var D, O, L, V, K, q, Z;
    ((D = n[0] ^ e[0]), (O = n[s ? 3 : 1] ^ e[1]), (L = n[2] ^ e[2]), (V = n[s ? 1 : 3] ^ e[3]));
    var J = 3;
    for (var ie = 1; ie < h; ++ie)
      ((K = y[D >>> 24] ^ b[(O >>> 16) & 255] ^ S[(L >>> 8) & 255] ^ w[V & 255] ^ e[++J]),
        (q = y[O >>> 24] ^ b[(L >>> 16) & 255] ^ S[(V >>> 8) & 255] ^ w[D & 255] ^ e[++J]),
        (Z = y[L >>> 24] ^ b[(V >>> 16) & 255] ^ S[(D >>> 8) & 255] ^ w[O & 255] ^ e[++J]),
        (V = y[V >>> 24] ^ b[(D >>> 16) & 255] ^ S[(O >>> 8) & 255] ^ w[L & 255] ^ e[++J]),
        (D = K),
        (O = q),
        (L = Z));
    ((r[0] =
      (R[D >>> 24] << 24) ^ (R[(O >>> 16) & 255] << 16) ^ (R[(L >>> 8) & 255] << 8) ^ R[V & 255] ^ e[++J]),
      (r[s ? 3 : 1] =
        (R[O >>> 24] << 24) ^ (R[(L >>> 16) & 255] << 16) ^ (R[(V >>> 8) & 255] << 8) ^ R[D & 255] ^ e[++J]),
      (r[2] =
        (R[L >>> 24] << 24) ^ (R[(V >>> 16) & 255] << 16) ^ (R[(D >>> 8) & 255] << 8) ^ R[O & 255] ^ e[++J]),
      (r[s ? 1 : 3] =
        (R[V >>> 24] << 24) ^ (R[(D >>> 16) & 255] << 16) ^ (R[(O >>> 8) & 255] << 8) ^ R[L & 255] ^ e[++J]));
  }
  function Gh(e) {
    e = e || {};
    var upper = (e.mode || "CBC").toUpperCase(),
      r = "AES-" + upper,
      s;
    if (e.decrypt) s = Sr.cipher.createDecipher(r, e.key);
    else s = Sr.cipher.createCipher(r, e.key);
    var start = s.start;
    return (
      (s.start = function (y, b) {
        var S = null;
        if (b instanceof Sr.util.ByteBuffer) ((S = b), (b = {}));
        ((b = b || {}), (b.output = S), (b.iv = y), start.call(s, b));
      }),
      s
    );
  }
});

export { Xa };
