/**
 * node-forge/lib/ed25519.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: node-forge@1.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { Tn } from "./forge.js";
import { Ef } from "./jsbn.js";
import { Ci } from "./random.js";
import { $S } from "./sha512.js";
import { Zn } from "./util.js";
import { KA } from "./asn1-validator.js";

//@ chunk-fq0cr76a.js:260717-274277 cjs-fingerprint
var sC = x(function ($fe, rC) {
  var ws = Tn();
  Ef();
  Ci();
  $S();
  Zn();
  var zA = KA(),
    { publicKeyValidator: publicKeyValidator, privateKeyValidator: privateKeyValidator } = zA;
  if (typeof WS > "u") WS = ws.jsbn.BigInteger;
  var WS,
    ByteBuffer = ws.util.ByteBuffer,
    ti = typeof Buffer > "u" ? Uint8Array : Buffer;
  ws.pki = ws.pki || {};
  rC.exports = ws.pki.ed25519 = ws.ed25519 = ws.ed25519 || {};
  var ed25519 = ws.ed25519;
  ed25519.constants = {};
  ed25519.constants.PUBLIC_KEY_BYTE_LENGTH = 32;
  ed25519.constants.PRIVATE_KEY_BYTE_LENGTH = 64;
  ed25519.constants.SEED_BYTE_LENGTH = 32;
  ed25519.constants.SIGN_BYTE_LENGTH = 64;
  ed25519.constants.HASH_BYTE_LENGTH = 64;
  ed25519.generateKeyPair = function (e) {
    e = e || {};
    var seed = e.seed;
    if (seed === void 0) seed = ws.random.getBytesSync(ed25519.constants.SEED_BYTE_LENGTH);
    else if (typeof seed === "string") {
      if (seed.length !== ed25519.constants.SEED_BYTE_LENGTH)
        throw TypeError('"seed" must be ' + ed25519.constants.SEED_BYTE_LENGTH + " bytes in length.");
    } else if (!(seed instanceof Uint8Array))
      throw TypeError('"seed" must be a node.js Buffer, Uint8Array, or a binary string.');
    seed = pa({ message: seed, encoding: "binary" });
    var r = new ti(ed25519.constants.PUBLIC_KEY_BYTE_LENGTH),
      s = new ti(ed25519.constants.PRIVATE_KEY_BYTE_LENGTH);
    for (var h = 0; h < 32; ++h) s[h] = seed[h];
    return (O6(r, s), { publicKey: r, privateKey: s });
  };
  ed25519.privateKeyFromAsn1 = function (e) {
    var n = {},
      r = [],
      validate = ws.asn1.validate(e, privateKeyValidator, n, r);
    if (!validate) {
      var h = Error("Invalid Key.");
      throw ((h.errors = r), h);
    }
    var derToOid = ws.asn1.derToOid(n.privateKeyOid),
      EdDSA25519 = ws.oids.EdDSA25519;
    if (derToOid !== EdDSA25519)
      throw Error('Invalid OID "' + derToOid + '"; OID must be "' + EdDSA25519 + '".');
    var privateKey = n.privateKey,
      w = pa({ message: ws.asn1.fromDer(privateKey).value, encoding: "binary" });
    return { privateKeyBytes: w };
  };
  ed25519.publicKeyFromAsn1 = function (e) {
    var n = {},
      r = [],
      validate = ws.asn1.validate(e, publicKeyValidator, n, r);
    if (!validate) {
      var h = Error("Invalid Key.");
      throw ((h.errors = r), h);
    }
    var derToOid = ws.asn1.derToOid(n.publicKeyOid),
      EdDSA25519 = ws.oids.EdDSA25519;
    if (derToOid !== EdDSA25519)
      throw Error('Invalid OID "' + derToOid + '"; OID must be "' + EdDSA25519 + '".');
    var ed25519PublicKey = n.ed25519PublicKey;
    if (ed25519PublicKey.length !== ed25519.constants.PUBLIC_KEY_BYTE_LENGTH)
      throw Error("Key length is invalid.");
    return pa({ message: ed25519PublicKey, encoding: "binary" });
  };
  ed25519.publicKeyFromPrivateKey = function (e) {
    e = e || {};
    var n = pa({ message: e.privateKey, encoding: "binary" });
    if (n.length !== ed25519.constants.PRIVATE_KEY_BYTE_LENGTH)
      throw TypeError(
        '"options.privateKey" must have a byte length of ' + ed25519.constants.PRIVATE_KEY_BYTE_LENGTH,
      );
    var r = new ti(ed25519.constants.PUBLIC_KEY_BYTE_LENGTH);
    for (var s = 0; s < r.length; ++s) r[s] = n[32 + s];
    return r;
  };
  ed25519.sign = function (e) {
    e = e || {};
    var n = pa(e),
      r = pa({ message: e.privateKey, encoding: "binary" });
    if (r.length === ed25519.constants.SEED_BYTE_LENGTH) {
      var generateKeyPair = ed25519.generateKeyPair({ seed: r });
      r = generateKeyPair.privateKey;
    } else if (r.length !== ed25519.constants.PRIVATE_KEY_BYTE_LENGTH)
      throw TypeError(
        '"options.privateKey" must have a byte length of ' +
          ed25519.constants.SEED_BYTE_LENGTH +
          " or " +
          ed25519.constants.PRIVATE_KEY_BYTE_LENGTH,
      );
    var h = new ti(ed25519.constants.SIGN_BYTE_LENGTH + n.length);
    P6(h, n, n.length, r);
    var y = new ti(ed25519.constants.SIGN_BYTE_LENGTH);
    for (var b = 0; b < y.length; ++b) y[b] = h[b];
    return y;
  };
  ed25519.verify = function (e) {
    e = e || {};
    var n = pa(e);
    if (e.signature === void 0)
      throw TypeError(
        '"options.signature" must be a node.js Buffer, a Uint8Array, a forge ByteBuffer, or a binary string.',
      );
    var r = pa({ message: e.signature, encoding: "binary" });
    if (r.length !== ed25519.constants.SIGN_BYTE_LENGTH)
      throw TypeError('"options.signature" must have a byte length of ' + ed25519.constants.SIGN_BYTE_LENGTH);
    var s = pa({ message: e.publicKey, encoding: "binary" });
    if (s.length !== ed25519.constants.PUBLIC_KEY_BYTE_LENGTH)
      throw TypeError(
        '"options.publicKey" must have a byte length of ' + ed25519.constants.PUBLIC_KEY_BYTE_LENGTH,
      );
    var h = new ti(ed25519.constants.SIGN_BYTE_LENGTH + n.length),
      y = new ti(ed25519.constants.SIGN_BYTE_LENGTH + n.length),
      b;
    for (b = 0; b < ed25519.constants.SIGN_BYTE_LENGTH; ++b) h[b] = r[b];
    for (b = 0; b < n.length; ++b) h[b + ed25519.constants.SIGN_BYTE_LENGTH] = n[b];
    return L6(y, h, h.length, s) >= 0;
  };
  function pa(e) {
    var message = e.message;
    if (message instanceof Uint8Array || message instanceof ti) return message;
    var encoding = e.encoding;
    if (message === void 0)
      if (e.md) ((message = e.md.digest().getBytes()), (encoding = "binary"));
      else throw TypeError('"options.message" or "options.md" not specified.');
    if (typeof message === "string" && !encoding)
      throw TypeError('"options.encoding" must be "binary" or "utf8".');
    if (typeof message === "string") {
      if (typeof Buffer < "u") return Buffer.from(message, encoding);
      message = new ByteBuffer(message, encoding);
    } else if (!(message instanceof ByteBuffer))
      throw TypeError(
        '"options.message" must be a node.js Buffer, a Uint8Array, a forge ByteBuffer, or a string with "options.encoding" specifying its encoding.',
      );
    var s = new ti(message.length());
    for (var h = 0; h < s.length; ++h) s[h] = message.at(h);
    return s;
  }
  var HS = un(),
    dm = un([1]),
    N6 = un([
      30883, 4953, 19914, 30187, 55467, 16705, 2637, 112, 59544, 30585, 16505, 36039, 65139, 11119, 27886,
      20995,
    ]),
    k6 = un([
      61785, 9906, 39828, 60374, 45398, 33411, 5274, 224, 53552, 61171, 33010, 6542, 64743, 22239, 55772,
      9222,
    ]),
    qA = un([
      54554, 36645, 11616, 51542, 42930, 38181, 51040, 26924, 56412, 64982, 57905, 49316, 21502, 52590, 14035,
      8553,
    ]),
    jA = un([
      26200, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214,
      26214,
    ]),
    float64Array = new Float64Array([
      237, 211, 245, 92, 26, 99, 18, 88, 214, 156, 247, 162, 222, 249, 222, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 16,
    ]),
    D6 = un([
      41136, 18958, 6951, 50414, 58488, 44335, 6150, 12099, 55207, 15867, 153, 11085, 57099, 20417, 9344,
      11139,
    ]);
  function Cf(e, n) {
    var create = ws.md.sha512.create(),
      s = new ByteBuffer(e);
    create.update(s.getBytes(n), "binary");
    var bytes = create.digest().getBytes();
    if (typeof Buffer < "u") return Buffer.from(bytes, "binary");
    var y = new ti(ed25519.constants.HASH_BYTE_LENGTH);
    for (var b = 0; b < 64; ++b) y[b] = bytes.charCodeAt(b);
    return y;
  }
  function O6(e, n) {
    var r = [un(), un(), un(), un()],
      s,
      h = Cf(n, 32);
    ((h[0] &= 248), (h[31] &= 127), (h[31] |= 64), YS(r, h), jS(e, r));
    for (s = 0; s < 32; ++s) n[s + 32] = e[s];
    return 0;
  }
  function P6(e, n, r, s) {
    var h,
      y,
      float64Array = new Float64Array(64),
      S = [un(), un(), un(), un()],
      w = Cf(s, 32);
    ((w[0] &= 248), (w[31] &= 127), (w[31] |= 64));
    var R = r + 64;
    for (h = 0; h < r; ++h) e[64 + h] = n[h];
    for (h = 0; h < 32; ++h) e[32 + h] = w[32 + h];
    var D = Cf(e.subarray(32), r + 32);
    (KS(D), YS(S, D), jS(e, S));
    for (h = 32; h < 64; ++h) e[h] = s[h];
    var O = Cf(e, r + 64);
    KS(O);
    for (h = 32; h < 64; ++h) float64Array[h] = 0;
    for (h = 0; h < 32; ++h) float64Array[h] = D[h];
    for (h = 0; h < 32; ++h) for (y = 0; y < 32; y++) float64Array[h + y] += O[h] * w[y];
    return (XA(e.subarray(32), float64Array), R);
  }
  function L6(e, n, r, s) {
    var h,
      y,
      b = new ti(32),
      S = [un(), un(), un(), un()],
      w = [un(), un(), un(), un()];
    if (((y = -1), r < 64)) return -1;
    if (U6(w, s)) return -1;
    if (!B6(n, 32)) return -1;
    for (h = 0; h < r; ++h) e[h] = n[h];
    for (h = 0; h < 32; ++h) e[h + 32] = s[h];
    var R = Cf(e, r);
    if ((KS(R), tC(S, w, R), YS(w, n.subarray(32)), qS(S, w), jS(b, S), (r -= 64), JA(n, 0, b, 0))) {
      for (h = 0; h < r; ++h) e[h] = 0;
      return -1;
    }
    for (h = 0; h < r; ++h) e[h] = n[h + 64];
    return ((y = r), y);
  }
  function B6(e, n) {
    var r;
    for (r = 31; r >= 0; --r) {
      if (e[n + r] < float64Array[r]) return !0;
      if (e[n + r] > float64Array[r]) return !1;
    }
    return !1;
  }
  function XA(e, n) {
    var r, s, h, y;
    for (s = 63; s >= 32; --s) {
      r = 0;
      for (h = s - 32, y = s - 12; h < y; ++h)
        ((n[h] += r - 16 * n[s] * float64Array[h - (s - 32)]), (r = (n[h] + 128) >> 8), (n[h] -= r * 256));
      ((n[h] += r), (n[s] = 0));
    }
    r = 0;
    for (h = 0; h < 32; ++h) ((n[h] += r - (n[31] >> 4) * float64Array[h]), (r = n[h] >> 8), (n[h] &= 255));
    for (h = 0; h < 32; ++h) n[h] -= r * float64Array[h];
    for (s = 0; s < 32; ++s) ((n[s + 1] += n[s] >> 8), (e[s] = n[s] & 255));
  }
  function KS(e) {
    var float64Array = new Float64Array(64);
    for (var r = 0; r < 64; ++r) ((float64Array[r] = e[r]), (e[r] = 0));
    XA(e, float64Array);
  }
  function qS(e, n) {
    var r = un(),
      s = un(),
      h = un(),
      y = un(),
      b = un(),
      S = un(),
      w = un(),
      R = un(),
      D = un();
    (mu(r, e[1], e[0]),
      mu(D, n[1], n[0]),
      br(r, r, D),
      hu(s, e[0], e[1]),
      hu(D, n[0], n[1]),
      br(s, s, D),
      br(h, e[3], n[3]),
      br(h, h, k6),
      br(y, e[2], n[2]),
      hu(y, y, y),
      mu(b, s, r),
      mu(S, y, h),
      hu(w, y, h),
      hu(R, s, r),
      br(e[0], b, S),
      br(e[1], R, w),
      br(e[2], w, S),
      br(e[3], b, R));
  }
  function YA(e, n, r) {
    for (var s = 0; s < 4; ++s) nC(e[s], n[s], r);
  }
  function jS(e, n) {
    var r = un(),
      s = un(),
      h = un();
    (V6(h, n[2]), br(r, n[0], h), br(s, n[1], h), fm(e, s), (e[31] ^= eC(r) << 7));
  }
  function fm(e, n) {
    var r,
      s,
      h,
      y = un(),
      b = un();
    for (r = 0; r < 16; ++r) b[r] = n[r];
    (VS(b), VS(b), VS(b));
    for (s = 0; s < 2; ++s) {
      y[0] = b[0] - 65517;
      for (r = 1; r < 15; ++r) ((y[r] = b[r] - 65535 - ((y[r - 1] >> 16) & 1)), (y[r - 1] &= 65535));
      ((y[15] = b[15] - 32767 - ((y[14] >> 16) & 1)),
        (h = (y[15] >> 16) & 1),
        (y[14] &= 65535),
        nC(b, y, 1 - h));
    }
    for (r = 0; r < 16; r++) ((e[2 * r] = b[r] & 255), (e[2 * r + 1] = b[r] >> 8));
  }
  function U6(e, n) {
    var r = un(),
      s = un(),
      h = un(),
      y = un(),
      b = un(),
      S = un(),
      w = un();
    if (
      (il(e[2], dm),
      F6(e[1], n),
      dc(h, e[1]),
      br(y, h, N6),
      mu(h, h, e[2]),
      hu(y, e[2], y),
      dc(b, y),
      dc(S, b),
      br(w, S, b),
      br(r, w, h),
      br(r, r, y),
      M6(r, r),
      br(r, r, h),
      br(r, r, y),
      br(r, r, y),
      br(e[0], r, y),
      dc(s, e[0]),
      br(s, s, y),
      ZA(s, h))
    )
      br(e[0], e[0], D6);
    if ((dc(s, e[0]), br(s, s, y), ZA(s, h))) return -1;
    if (eC(e[0]) === n[31] >> 7) mu(e[0], HS, e[0]);
    return (br(e[3], e[0], e[1]), 0);
  }
  function F6(e, n) {
    var r;
    for (r = 0; r < 16; ++r) e[r] = n[2 * r] + (n[2 * r + 1] << 8);
    e[15] &= 32767;
  }
  function M6(e, n) {
    var r = un(),
      s;
    for (s = 0; s < 16; ++s) r[s] = n[s];
    for (s = 250; s >= 0; --s) if ((dc(r, r), s !== 1)) br(r, r, n);
    for (s = 0; s < 16; ++s) e[s] = r[s];
  }
  function ZA(e, n) {
    var r = new ti(32),
      s = new ti(32);
    return (fm(r, e), fm(s, n), JA(r, 0, s, 0));
  }
  function JA(e, n, r, s) {
    return $6(e, n, r, s, 32);
  }
  function $6(e, n, r, s, h) {
    var y,
      b = 0;
    for (y = 0; y < h; ++y) b |= e[n + y] ^ r[s + y];
    return (1 & ((b - 1) >>> 8)) - 1;
  }
  function eC(e) {
    var n = new ti(32);
    return (fm(n, e), n[0] & 1);
  }
  function tC(e, n, r) {
    var s, h;
    (il(e[0], HS), il(e[1], dm), il(e[2], dm), il(e[3], HS));
    for (h = 255; h >= 0; --h)
      ((s = (r[(h / 8) | 0] >> (h & 7)) & 1), YA(e, n, s), qS(n, e), qS(e, e), YA(e, n, s));
  }
  function YS(e, n) {
    var r = [un(), un(), un(), un()];
    (il(r[0], qA), il(r[1], jA), il(r[2], dm), br(r[3], qA, jA), tC(e, r, n));
  }
  function il(e, n) {
    var r;
    for (r = 0; r < 16; r++) e[r] = n[r] | 0;
  }
  function V6(e, n) {
    var r = un(),
      s;
    for (s = 0; s < 16; ++s) r[s] = n[s];
    for (s = 253; s >= 0; --s) if ((dc(r, r), s !== 2 && s !== 4)) br(r, r, n);
    for (s = 0; s < 16; ++s) e[s] = r[s];
  }
  function VS(e) {
    var n,
      r,
      s = 1;
    for (n = 0; n < 16; ++n) ((r = e[n] + s + 65535), (s = Math.floor(r / 65536)), (e[n] = r - s * 65536));
    e[0] += s - 1 + 37 * (s - 1);
  }
  function nC(e, n, r) {
    var s,
      h = ~(r - 1);
    for (var y = 0; y < 16; ++y) ((s = h & (e[y] ^ n[y])), (e[y] ^= s), (n[y] ^= s));
  }
  function un(e) {
    var n,
      float64Array = new Float64Array(16);
    if (e) for (n = 0; n < e.length; ++n) float64Array[n] = e[n];
    return float64Array;
  }
  function hu(e, n, r) {
    for (var s = 0; s < 16; ++s) e[s] = n[s] + r[s];
  }
  function mu(e, n, r) {
    for (var s = 0; s < 16; ++s) e[s] = n[s] - r[s];
  }
  function dc(e, n) {
    br(e, n, n);
  }
  function br(e, n, r) {
    var s,
      h,
      y = 0,
      b = 0,
      S = 0,
      w = 0,
      R = 0,
      D = 0,
      O = 0,
      L = 0,
      V = 0,
      K = 0,
      q = 0,
      Z = 0,
      J = 0,
      ie = 0,
      ae = 0,
      Se = 0,
      ue = 0,
      me = 0,
      Ne = 0,
      Ce = 0,
      Ie = 0,
      he = 0,
      ft = 0,
      rt = 0,
      ut = 0,
      we = 0,
      Ae = 0,
      dt = 0,
      Me = 0,
      Ft = 0,
      xn = 0,
      mt = r[0],
      Mt = r[1],
      mn = r[2],
      Nt = r[3],
      Wt = r[4],
      gt = r[5],
      jt = r[6],
      Rn = r[7],
      Xe = r[8],
      nn = r[9],
      Je = r[10],
      vt = r[11],
      Lt = r[12],
      ln = r[13],
      Zt = r[14],
      kn = r[15];
    ((s = n[0]),
      (y += s * mt),
      (b += s * Mt),
      (S += s * mn),
      (w += s * Nt),
      (R += s * Wt),
      (D += s * gt),
      (O += s * jt),
      (L += s * Rn),
      (V += s * Xe),
      (K += s * nn),
      (q += s * Je),
      (Z += s * vt),
      (J += s * Lt),
      (ie += s * ln),
      (ae += s * Zt),
      (Se += s * kn),
      (s = n[1]),
      (b += s * mt),
      (S += s * Mt),
      (w += s * mn),
      (R += s * Nt),
      (D += s * Wt),
      (O += s * gt),
      (L += s * jt),
      (V += s * Rn),
      (K += s * Xe),
      (q += s * nn),
      (Z += s * Je),
      (J += s * vt),
      (ie += s * Lt),
      (ae += s * ln),
      (Se += s * Zt),
      (ue += s * kn),
      (s = n[2]),
      (S += s * mt),
      (w += s * Mt),
      (R += s * mn),
      (D += s * Nt),
      (O += s * Wt),
      (L += s * gt),
      (V += s * jt),
      (K += s * Rn),
      (q += s * Xe),
      (Z += s * nn),
      (J += s * Je),
      (ie += s * vt),
      (ae += s * Lt),
      (Se += s * ln),
      (ue += s * Zt),
      (me += s * kn),
      (s = n[3]),
      (w += s * mt),
      (R += s * Mt),
      (D += s * mn),
      (O += s * Nt),
      (L += s * Wt),
      (V += s * gt),
      (K += s * jt),
      (q += s * Rn),
      (Z += s * Xe),
      (J += s * nn),
      (ie += s * Je),
      (ae += s * vt),
      (Se += s * Lt),
      (ue += s * ln),
      (me += s * Zt),
      (Ne += s * kn),
      (s = n[4]),
      (R += s * mt),
      (D += s * Mt),
      (O += s * mn),
      (L += s * Nt),
      (V += s * Wt),
      (K += s * gt),
      (q += s * jt),
      (Z += s * Rn),
      (J += s * Xe),
      (ie += s * nn),
      (ae += s * Je),
      (Se += s * vt),
      (ue += s * Lt),
      (me += s * ln),
      (Ne += s * Zt),
      (Ce += s * kn),
      (s = n[5]),
      (D += s * mt),
      (O += s * Mt),
      (L += s * mn),
      (V += s * Nt),
      (K += s * Wt),
      (q += s * gt),
      (Z += s * jt),
      (J += s * Rn),
      (ie += s * Xe),
      (ae += s * nn),
      (Se += s * Je),
      (ue += s * vt),
      (me += s * Lt),
      (Ne += s * ln),
      (Ce += s * Zt),
      (Ie += s * kn),
      (s = n[6]),
      (O += s * mt),
      (L += s * Mt),
      (V += s * mn),
      (K += s * Nt),
      (q += s * Wt),
      (Z += s * gt),
      (J += s * jt),
      (ie += s * Rn),
      (ae += s * Xe),
      (Se += s * nn),
      (ue += s * Je),
      (me += s * vt),
      (Ne += s * Lt),
      (Ce += s * ln),
      (Ie += s * Zt),
      (he += s * kn),
      (s = n[7]),
      (L += s * mt),
      (V += s * Mt),
      (K += s * mn),
      (q += s * Nt),
      (Z += s * Wt),
      (J += s * gt),
      (ie += s * jt),
      (ae += s * Rn),
      (Se += s * Xe),
      (ue += s * nn),
      (me += s * Je),
      (Ne += s * vt),
      (Ce += s * Lt),
      (Ie += s * ln),
      (he += s * Zt),
      (ft += s * kn),
      (s = n[8]),
      (V += s * mt),
      (K += s * Mt),
      (q += s * mn),
      (Z += s * Nt),
      (J += s * Wt),
      (ie += s * gt),
      (ae += s * jt),
      (Se += s * Rn),
      (ue += s * Xe),
      (me += s * nn),
      (Ne += s * Je),
      (Ce += s * vt),
      (Ie += s * Lt),
      (he += s * ln),
      (ft += s * Zt),
      (rt += s * kn),
      (s = n[9]),
      (K += s * mt),
      (q += s * Mt),
      (Z += s * mn),
      (J += s * Nt),
      (ie += s * Wt),
      (ae += s * gt),
      (Se += s * jt),
      (ue += s * Rn),
      (me += s * Xe),
      (Ne += s * nn),
      (Ce += s * Je),
      (Ie += s * vt),
      (he += s * Lt),
      (ft += s * ln),
      (rt += s * Zt),
      (ut += s * kn),
      (s = n[10]),
      (q += s * mt),
      (Z += s * Mt),
      (J += s * mn),
      (ie += s * Nt),
      (ae += s * Wt),
      (Se += s * gt),
      (ue += s * jt),
      (me += s * Rn),
      (Ne += s * Xe),
      (Ce += s * nn),
      (Ie += s * Je),
      (he += s * vt),
      (ft += s * Lt),
      (rt += s * ln),
      (ut += s * Zt),
      (we += s * kn),
      (s = n[11]),
      (Z += s * mt),
      (J += s * Mt),
      (ie += s * mn),
      (ae += s * Nt),
      (Se += s * Wt),
      (ue += s * gt),
      (me += s * jt),
      (Ne += s * Rn),
      (Ce += s * Xe),
      (Ie += s * nn),
      (he += s * Je),
      (ft += s * vt),
      (rt += s * Lt),
      (ut += s * ln),
      (we += s * Zt),
      (Ae += s * kn),
      (s = n[12]),
      (J += s * mt),
      (ie += s * Mt),
      (ae += s * mn),
      (Se += s * Nt),
      (ue += s * Wt),
      (me += s * gt),
      (Ne += s * jt),
      (Ce += s * Rn),
      (Ie += s * Xe),
      (he += s * nn),
      (ft += s * Je),
      (rt += s * vt),
      (ut += s * Lt),
      (we += s * ln),
      (Ae += s * Zt),
      (dt += s * kn),
      (s = n[13]),
      (ie += s * mt),
      (ae += s * Mt),
      (Se += s * mn),
      (ue += s * Nt),
      (me += s * Wt),
      (Ne += s * gt),
      (Ce += s * jt),
      (Ie += s * Rn),
      (he += s * Xe),
      (ft += s * nn),
      (rt += s * Je),
      (ut += s * vt),
      (we += s * Lt),
      (Ae += s * ln),
      (dt += s * Zt),
      (Me += s * kn),
      (s = n[14]),
      (ae += s * mt),
      (Se += s * Mt),
      (ue += s * mn),
      (me += s * Nt),
      (Ne += s * Wt),
      (Ce += s * gt),
      (Ie += s * jt),
      (he += s * Rn),
      (ft += s * Xe),
      (rt += s * nn),
      (ut += s * Je),
      (we += s * vt),
      (Ae += s * Lt),
      (dt += s * ln),
      (Me += s * Zt),
      (Ft += s * kn),
      (s = n[15]),
      (Se += s * mt),
      (ue += s * Mt),
      (me += s * mn),
      (Ne += s * Nt),
      (Ce += s * Wt),
      (Ie += s * gt),
      (he += s * jt),
      (ft += s * Rn),
      (rt += s * Xe),
      (ut += s * nn),
      (we += s * Je),
      (Ae += s * vt),
      (dt += s * Lt),
      (Me += s * ln),
      (Ft += s * Zt),
      (xn += s * kn),
      (y += 38 * ue),
      (b += 38 * me),
      (S += 38 * Ne),
      (w += 38 * Ce),
      (R += 38 * Ie),
      (D += 38 * he),
      (O += 38 * ft),
      (L += 38 * rt),
      (V += 38 * ut),
      (K += 38 * we),
      (q += 38 * Ae),
      (Z += 38 * dt),
      (J += 38 * Me),
      (ie += 38 * Ft),
      (ae += 38 * xn),
      (h = 1),
      (s = y + h + 65535),
      (h = Math.floor(s / 65536)),
      (y = s - h * 65536),
      (s = b + h + 65535),
      (h = Math.floor(s / 65536)),
      (b = s - h * 65536),
      (s = S + h + 65535),
      (h = Math.floor(s / 65536)),
      (S = s - h * 65536),
      (s = w + h + 65535),
      (h = Math.floor(s / 65536)),
      (w = s - h * 65536),
      (s = R + h + 65535),
      (h = Math.floor(s / 65536)),
      (R = s - h * 65536),
      (s = D + h + 65535),
      (h = Math.floor(s / 65536)),
      (D = s - h * 65536),
      (s = O + h + 65535),
      (h = Math.floor(s / 65536)),
      (O = s - h * 65536),
      (s = L + h + 65535),
      (h = Math.floor(s / 65536)),
      (L = s - h * 65536),
      (s = V + h + 65535),
      (h = Math.floor(s / 65536)),
      (V = s - h * 65536),
      (s = K + h + 65535),
      (h = Math.floor(s / 65536)),
      (K = s - h * 65536),
      (s = q + h + 65535),
      (h = Math.floor(s / 65536)),
      (q = s - h * 65536),
      (s = Z + h + 65535),
      (h = Math.floor(s / 65536)),
      (Z = s - h * 65536),
      (s = J + h + 65535),
      (h = Math.floor(s / 65536)),
      (J = s - h * 65536),
      (s = ie + h + 65535),
      (h = Math.floor(s / 65536)),
      (ie = s - h * 65536),
      (s = ae + h + 65535),
      (h = Math.floor(s / 65536)),
      (ae = s - h * 65536),
      (s = Se + h + 65535),
      (h = Math.floor(s / 65536)),
      (Se = s - h * 65536),
      (y += h - 1 + 37 * (h - 1)),
      (h = 1),
      (s = y + h + 65535),
      (h = Math.floor(s / 65536)),
      (y = s - h * 65536),
      (s = b + h + 65535),
      (h = Math.floor(s / 65536)),
      (b = s - h * 65536),
      (s = S + h + 65535),
      (h = Math.floor(s / 65536)),
      (S = s - h * 65536),
      (s = w + h + 65535),
      (h = Math.floor(s / 65536)),
      (w = s - h * 65536),
      (s = R + h + 65535),
      (h = Math.floor(s / 65536)),
      (R = s - h * 65536),
      (s = D + h + 65535),
      (h = Math.floor(s / 65536)),
      (D = s - h * 65536),
      (s = O + h + 65535),
      (h = Math.floor(s / 65536)),
      (O = s - h * 65536),
      (s = L + h + 65535),
      (h = Math.floor(s / 65536)),
      (L = s - h * 65536),
      (s = V + h + 65535),
      (h = Math.floor(s / 65536)),
      (V = s - h * 65536),
      (s = K + h + 65535),
      (h = Math.floor(s / 65536)),
      (K = s - h * 65536),
      (s = q + h + 65535),
      (h = Math.floor(s / 65536)),
      (q = s - h * 65536),
      (s = Z + h + 65535),
      (h = Math.floor(s / 65536)),
      (Z = s - h * 65536),
      (s = J + h + 65535),
      (h = Math.floor(s / 65536)),
      (J = s - h * 65536),
      (s = ie + h + 65535),
      (h = Math.floor(s / 65536)),
      (ie = s - h * 65536),
      (s = ae + h + 65535),
      (h = Math.floor(s / 65536)),
      (ae = s - h * 65536),
      (s = Se + h + 65535),
      (h = Math.floor(s / 65536)),
      (Se = s - h * 65536),
      (y += h - 1 + 37 * (h - 1)),
      (e[0] = y),
      (e[1] = b),
      (e[2] = S),
      (e[3] = w),
      (e[4] = R),
      (e[5] = D),
      (e[6] = O),
      (e[7] = L),
      (e[8] = V),
      (e[9] = K),
      (e[10] = q),
      (e[11] = Z),
      (e[12] = J),
      (e[13] = ie),
      (e[14] = ae),
      (e[15] = Se));
  }
});

export { sC };
