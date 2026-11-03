/**
 * node-forge/lib/ed25519.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: node-forge@1.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { require_forge } from "./forge.js";
import { require_jsbn } from "./jsbn.js";
import { require_random } from "./random.js";
import { require_sha512 } from "./sha512.js";
import { require_util } from "./util.js";
import { require_asn1_validator } from "./asn1-validator.js";

//@ chunk-fq0cr76a.js:260717-274277 cjs-fingerprint
var require_ed25519 = x(function (cjsExports, cjsModule) {
  var forge = require_forge();
  require_jsbn();
  require_random();
  require_sha512();
  require_util();
  var zA = require_asn1_validator();
  var { publicKeyValidator, privateKeyValidator } = zA;
  if (typeof BigInteger === "undefined") BigInteger = forge.jsbn.BigInteger;
  var BigInteger;
  var ByteBuffer = forge.util.ByteBuffer;
  var NativeBuffer = typeof Buffer === "undefined" ? Uint8Array : Buffer;
  forge.pki = forge.pki || {};
  cjsModule.exports = forge.pki.ed25519 = forge.ed25519 = forge.ed25519 || {};
  var ed25519 = forge.ed25519;
  ed25519.constants = {};
  ed25519.constants.PUBLIC_KEY_BYTE_LENGTH = 32;
  ed25519.constants.PRIVATE_KEY_BYTE_LENGTH = 64;
  ed25519.constants.SEED_BYTE_LENGTH = 32;
  ed25519.constants.SIGN_BYTE_LENGTH = 64;
  ed25519.constants.HASH_BYTE_LENGTH = 64;
  ed25519.generateKeyPair = function (options) {
    options = options || {};
    var seed = options.seed;
    if (seed === undefined) seed = forge.random.getBytesSync(ed25519.constants.SEED_BYTE_LENGTH);
    else if (typeof seed === "string") {
      if (seed.length !== ed25519.constants.SEED_BYTE_LENGTH)
        throw TypeError('"seed" must be ' + ed25519.constants.SEED_BYTE_LENGTH + " bytes in length.");
    } else if (!(seed instanceof Uint8Array))
      throw TypeError('"seed" must be a node.js Buffer, Uint8Array, or a binary string.');
    seed = messageToNativeBuffer({
      message: seed,
      encoding: "binary",
    });
    var pk = new NativeBuffer(ed25519.constants.PUBLIC_KEY_BYTE_LENGTH);
    var sk = new NativeBuffer(ed25519.constants.PRIVATE_KEY_BYTE_LENGTH);
    for (var i = 0; i < 32; ++i) sk[i] = seed[i];
    crypto_sign_keypair(pk, sk);
    return {
      publicKey: pk,
      privateKey: sk,
    };
  };
  ed25519.privateKeyFromAsn1 = function (obj) {
    var capture = {};
    var errors = [];
    var valid = forge.asn1.validate(obj, privateKeyValidator, capture, errors);
    if (!valid) {
      var error = Error("Invalid Key.");
      error.errors = errors;
      throw error;
    }
    var oid = forge.asn1.derToOid(capture.privateKeyOid);
    var ed25519Oid = forge.oids.EdDSA25519;
    if (oid !== ed25519Oid) throw Error('Invalid OID "' + oid + '"; OID must be "' + ed25519Oid + '".');
    var privateKey = capture.privateKey;
    var privateKeyBytes = messageToNativeBuffer({
      message: forge.asn1.fromDer(privateKey).value,
      encoding: "binary",
    });
    return {
      privateKeyBytes,
    };
  };
  ed25519.publicKeyFromAsn1 = function (obj) {
    var capture = {};
    var errors = [];
    var valid = forge.asn1.validate(obj, publicKeyValidator, capture, errors);
    if (!valid) {
      var error = Error("Invalid Key.");
      error.errors = errors;
      throw error;
    }
    var oid = forge.asn1.derToOid(capture.publicKeyOid);
    var ed25519Oid = forge.oids.EdDSA25519;
    if (oid !== ed25519Oid) throw Error('Invalid OID "' + oid + '"; OID must be "' + ed25519Oid + '".');
    var publicKeyBytes = capture.ed25519PublicKey;
    if (publicKeyBytes.length !== ed25519.constants.PUBLIC_KEY_BYTE_LENGTH)
      throw Error("Key length is invalid.");
    return messageToNativeBuffer({
      message: publicKeyBytes,
      encoding: "binary",
    });
  };
  ed25519.publicKeyFromPrivateKey = function (options) {
    options = options || {};
    var privateKey = messageToNativeBuffer({
      message: options.privateKey,
      encoding: "binary",
    });
    if (privateKey.length !== ed25519.constants.PRIVATE_KEY_BYTE_LENGTH)
      throw TypeError(
        '"options.privateKey" must have a byte length of ' + ed25519.constants.PRIVATE_KEY_BYTE_LENGTH,
      );
    var pk = new NativeBuffer(ed25519.constants.PUBLIC_KEY_BYTE_LENGTH);
    for (var i = 0; i < pk.length; ++i) pk[i] = privateKey[32 + i];
    return pk;
  };
  ed25519.sign = function (options) {
    options = options || {};
    var msg = messageToNativeBuffer(options);
    var privateKey = messageToNativeBuffer({
      message: options.privateKey,
      encoding: "binary",
    });
    if (privateKey.length === ed25519.constants.SEED_BYTE_LENGTH) {
      var keyPair = ed25519.generateKeyPair({
        seed: privateKey,
      });
      privateKey = keyPair.privateKey;
    } else if (privateKey.length !== ed25519.constants.PRIVATE_KEY_BYTE_LENGTH)
      throw TypeError(
        '"options.privateKey" must have a byte length of ' +
          ed25519.constants.SEED_BYTE_LENGTH +
          " or " +
          ed25519.constants.PRIVATE_KEY_BYTE_LENGTH,
      );
    var signedMsg = new NativeBuffer(ed25519.constants.SIGN_BYTE_LENGTH + msg.length);
    crypto_sign(signedMsg, msg, msg.length, privateKey);
    var sig = new NativeBuffer(ed25519.constants.SIGN_BYTE_LENGTH);
    for (var i = 0; i < sig.length; ++i) sig[i] = signedMsg[i];
    return sig;
  };
  ed25519.verify = function (options) {
    options = options || {};
    var msg = messageToNativeBuffer(options);
    if (options.signature === undefined)
      throw TypeError(
        '"options.signature" must be a node.js Buffer, a Uint8Array, a forge ByteBuffer, or a binary string.',
      );
    var sig = messageToNativeBuffer({
      message: options.signature,
      encoding: "binary",
    });
    if (sig.length !== ed25519.constants.SIGN_BYTE_LENGTH)
      throw TypeError('"options.signature" must have a byte length of ' + ed25519.constants.SIGN_BYTE_LENGTH);
    var publicKey = messageToNativeBuffer({
      message: options.publicKey,
      encoding: "binary",
    });
    if (publicKey.length !== ed25519.constants.PUBLIC_KEY_BYTE_LENGTH)
      throw TypeError(
        '"options.publicKey" must have a byte length of ' + ed25519.constants.PUBLIC_KEY_BYTE_LENGTH,
      );
    var sm = new NativeBuffer(ed25519.constants.SIGN_BYTE_LENGTH + msg.length);
    var m = new NativeBuffer(ed25519.constants.SIGN_BYTE_LENGTH + msg.length);
    var i;
    for (i = 0; i < ed25519.constants.SIGN_BYTE_LENGTH; ++i) sm[i] = sig[i];
    for (i = 0; i < msg.length; ++i) sm[i + ed25519.constants.SIGN_BYTE_LENGTH] = msg[i];
    return crypto_sign_open(m, sm, sm.length, publicKey) >= 0;
  };
  function messageToNativeBuffer(options) {
    var message = options.message;
    if (message instanceof Uint8Array || message instanceof NativeBuffer) return message;
    var encoding = options.encoding;
    if (message === undefined)
      if (options.md) {
        message = options.md.digest().getBytes();
        encoding = "binary";
      } else throw TypeError('"options.message" or "options.md" not specified.');
    if (typeof message === "string" && !encoding)
      throw TypeError('"options.encoding" must be "binary" or "utf8".');
    if (typeof message === "string") {
      if (typeof Buffer !== "undefined") return Buffer.from(message, encoding);
      message = new ByteBuffer(message, encoding);
    } else if (!(message instanceof ByteBuffer))
      throw TypeError(
        '"options.message" must be a node.js Buffer, a Uint8Array, a forge ByteBuffer, or a string with "options.encoding" specifying its encoding.',
      );
    var buffer = new NativeBuffer(message.length());
    for (var i = 0; i < buffer.length; ++i) buffer[i] = message.at(i);
    return buffer;
  }
  var gf0 = gf();
  var gf1 = gf([1]);
  var D = gf([
    30883, 4953, 19914, 30187, 55467, 16705, 2637, 112, 59544, 30585, 16505, 36039, 65139, 11119, 27886,
    20995,
  ]);
  var D2 = gf([
    61785, 9906, 39828, 60374, 45398, 33411, 5274, 224, 53552, 61171, 33010, 6542, 64743, 22239, 55772, 9222,
  ]);
  var X = gf([
    54554, 36645, 11616, 51542, 42930, 38181, 51040, 26924, 56412, 64982, 57905, 49316, 21502, 52590, 14035,
    8553,
  ]);
  var Y = gf([
    26200, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214,
    26214,
  ]);
  var L = new Float64Array([
    237, 211, 245, 92, 26, 99, 18, 88, 214, 156, 247, 162, 222, 249, 222, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 16,
  ]);
  var I = gf([
    41136, 18958, 6951, 50414, 58488, 44335, 6150, 12099, 55207, 15867, 153, 11085, 57099, 20417, 9344, 11139,
  ]);
  function sha512(msg, msgLen) {
    var md = forge.md.sha512.create();
    var buffer = new ByteBuffer(msg);
    md.update(buffer.getBytes(msgLen), "binary");
    var hash = md.digest().getBytes();
    if (typeof Buffer !== "undefined") return Buffer.from(hash, "binary");
    var out = new NativeBuffer(ed25519.constants.HASH_BYTE_LENGTH);
    for (var i = 0; i < 64; ++i) out[i] = hash.charCodeAt(i);
    return out;
  }
  function crypto_sign_keypair(pk, sk) {
    var p = [gf(), gf(), gf(), gf()];
    var i;
    var d = sha512(sk, 32);
    d[0] &= 248;
    d[31] &= 127;
    d[31] |= 64;
    scalarbase(p, d);
    pack(pk, p);
    for (i = 0; i < 32; ++i) sk[i + 32] = pk[i];
    return 0;
  }
  function crypto_sign(sm, m, n, sk) {
    var i;
    var j;
    var x = new Float64Array(64);
    var p = [gf(), gf(), gf(), gf()];
    var d = sha512(sk, 32);
    d[0] &= 248;
    d[31] &= 127;
    d[31] |= 64;
    var smlen = n + 64;
    for (i = 0; i < n; ++i) sm[64 + i] = m[i];
    for (i = 0; i < 32; ++i) sm[32 + i] = d[32 + i];
    var r = sha512(sm.subarray(32), n + 32);
    reduce(r);
    scalarbase(p, r);
    pack(sm, p);
    for (i = 32; i < 64; ++i) sm[i] = sk[i];
    var h = sha512(sm, n + 64);
    reduce(h);
    for (i = 32; i < 64; ++i) x[i] = 0;
    for (i = 0; i < 32; ++i) x[i] = r[i];
    for (i = 0; i < 32; ++i) for (j = 0; j < 32; j++) x[i + j] += h[i] * d[j];
    modL(sm.subarray(32), x);
    return smlen;
  }
  function crypto_sign_open(m, sm, n, pk) {
    var i;
    var mlen;
    var t = new NativeBuffer(32);
    var p = [gf(), gf(), gf(), gf()];
    var q = [gf(), gf(), gf(), gf()];
    mlen = -1;
    if (n < 64) return -1;
    if (unpackneg(q, pk)) return -1;
    if (!_isCanonicalSignatureScalar(sm, 32)) return -1;
    for (i = 0; i < n; ++i) m[i] = sm[i];
    for (i = 0; i < 32; ++i) m[i + 32] = pk[i];
    var h = sha512(m, n);
    reduce(h);
    scalarmult(p, q, h);
    scalarbase(q, sm.subarray(32));
    add(p, q);
    pack(t, p);
    n -= 64;
    if (crypto_verify_32(sm, 0, t, 0)) {
      for (i = 0; i < n; ++i) m[i] = 0;
      return -1;
    }
    for (i = 0; i < n; ++i) m[i] = sm[i + 64];
    mlen = n;
    return mlen;
  }
  function _isCanonicalSignatureScalar(bytes, offset) {
    var i;
    for (i = 31; i >= 0; --i) {
      if (bytes[offset + i] < L[i]) return true;
      if (bytes[offset + i] > L[i]) return false;
    }
    return false;
  }
  function modL(r_2, x) {
    var carry;
    var i;
    var j;
    var k;
    for (i = 63; i >= 32; --i) {
      carry = 0;
      for (j = i - 32, k = i - 12; j < k; ++j) {
        x[j] += carry - 16 * x[i] * L[j - (i - 32)];
        carry = (x[j] + 128) >> 8;
        x[j] -= carry * 256;
      }
      x[j] += carry;
      x[i] = 0;
    }
    carry = 0;
    for (j = 0; j < 32; ++j) {
      x[j] += carry - (x[31] >> 4) * L[j];
      carry = x[j] >> 8;
      x[j] &= 255;
    }
    for (j = 0; j < 32; ++j) x[j] -= carry * L[j];
    for (i = 0; i < 32; ++i) {
      x[i + 1] += x[i] >> 8;
      r_2[i] = x[i] & 255;
    }
  }
  function reduce(r_2) {
    var x = new Float64Array(64);
    for (var i = 0; i < 64; ++i) {
      x[i] = r_2[i];
      r_2[i] = 0;
    }
    modL(r_2, x);
  }
  function add(p, q) {
    var a = gf();
    var b_2 = gf();
    var c = gf();
    var d = gf();
    var e = gf();
    var f = gf();
    var g = gf();
    var h = gf();
    var t = gf();
    Z(a, p[1], p[0]);
    Z(t, q[1], q[0]);
    M(a, a, t);
    A(b_2, p[0], p[1]);
    A(t, q[0], q[1]);
    M(b_2, b_2, t);
    M(c, p[3], q[3]);
    M(c, c, D2);
    M(d, p[2], q[2]);
    A(d, d, d);
    Z(e, b_2, a);
    Z(f, d, c);
    A(g, d, c);
    A(h, b_2, a);
    M(p[0], e, f);
    M(p[1], h, g);
    M(p[2], g, f);
    M(p[3], e, h);
  }
  function cswap(p, q, b) {
    for (var i = 0; i < 4; ++i) sel25519(p[i], q[i], b);
  }
  function pack(r_2, p) {
    var tx = gf();
    var ty = gf();
    var zi = gf();
    inv25519(zi, p[2]);
    M(tx, p[0], zi);
    M(ty, p[1], zi);
    pack25519(r_2, ty);
    r_2[31] ^= par25519(tx) << 7;
  }
  function pack25519(o, n) {
    var i;
    var j;
    var b_2;
    var m = gf();
    var t = gf();
    for (i = 0; i < 16; ++i) t[i] = n[i];
    car25519(t);
    car25519(t);
    car25519(t);
    for (j = 0; j < 2; ++j) {
      m[0] = t[0] - 65517;
      for (i = 1; i < 15; ++i) {
        m[i] = t[i] - 65535 - ((m[i - 1] >> 16) & 1);
        m[i - 1] &= 65535;
      }
      m[15] = t[15] - 32767 - ((m[14] >> 16) & 1);
      b_2 = (m[15] >> 16) & 1;
      m[14] &= 65535;
      sel25519(t, m, 1 - b_2);
    }
    for (i = 0; i < 16; i++) {
      o[2 * i] = t[i] & 255;
      o[2 * i + 1] = t[i] >> 8;
    }
  }
  function unpackneg(r_2, p) {
    var t = gf();
    var chk = gf();
    var num = gf();
    var den = gf();
    var den2 = gf();
    var den4 = gf();
    var den6 = gf();
    set25519(r_2[2], gf1);
    unpack25519(r_2[1], p);
    S(num, r_2[1]);
    M(den, num, D);
    Z(num, num, r_2[2]);
    A(den, r_2[2], den);
    S(den2, den);
    S(den4, den2);
    M(den6, den4, den2);
    M(t, den6, num);
    M(t, t, den);
    pow2523(t, t);
    M(t, t, num);
    M(t, t, den);
    M(t, t, den);
    M(r_2[0], t, den);
    S(chk, r_2[0]);
    M(chk, chk, den);
    if (neq25519(chk, num)) M(r_2[0], r_2[0], I);
    S(chk, r_2[0]);
    M(chk, chk, den);
    if (neq25519(chk, num)) return -1;
    if (par25519(r_2[0]) === p[31] >> 7) Z(r_2[0], gf0, r_2[0]);
    M(r_2[3], r_2[0], r_2[1]);
    return 0;
  }
  function unpack25519(o, n) {
    var i;
    for (i = 0; i < 16; ++i) o[i] = n[2 * i] + (n[2 * i + 1] << 8);
    o[15] &= 32767;
  }
  function pow2523(o, i) {
    var c = gf();
    var a;
    for (a = 0; a < 16; ++a) c[a] = i[a];
    for (a = 250; a >= 0; --a) {
      S(c, c);
      if (a !== 1) M(c, c, i);
    }
    for (a = 0; a < 16; ++a) o[a] = c[a];
  }
  function neq25519(a, b) {
    var c = new NativeBuffer(32);
    var d = new NativeBuffer(32);
    pack25519(c, a);
    pack25519(d, b);
    return crypto_verify_32(c, 0, d, 0);
  }
  function crypto_verify_32(x, xi, y, yi) {
    return vn(x, xi, y, yi, 32);
  }
  function vn(x, xi, y_2, yi, n) {
    var i;
    var d = 0;
    for (i = 0; i < n; ++i) d |= x[xi + i] ^ y_2[yi + i];
    return (1 & ((d - 1) >>> 8)) - 1;
  }
  function par25519(a) {
    var d = new NativeBuffer(32);
    pack25519(d, a);
    return d[0] & 1;
  }
  function scalarmult(p, q, s_2) {
    var b;
    var i;
    set25519(p[0], gf0);
    set25519(p[1], gf1);
    set25519(p[2], gf1);
    set25519(p[3], gf0);
    for (i = 255; i >= 0; --i) {
      b = (s_2[(i / 8) | 0] >> (i & 7)) & 1;
      cswap(p, q, b);
      add(q, p);
      add(p, p);
      cswap(p, q, b);
    }
  }
  function scalarbase(p, s) {
    var q = [gf(), gf(), gf(), gf()];
    set25519(q[0], X);
    set25519(q[1], Y);
    set25519(q[2], gf1);
    M(q[3], X, Y);
    scalarmult(p, q, s);
  }
  function set25519(r_2, a) {
    var i;
    for (i = 0; i < 16; i++) r_2[i] = a[i] | 0;
  }
  function inv25519(o, i) {
    var c = gf();
    var a;
    for (a = 0; a < 16; ++a) c[a] = i[a];
    for (a = 253; a >= 0; --a) {
      S(c, c);
      if (a !== 2 && a !== 4) M(c, c, i);
    }
    for (a = 0; a < 16; ++a) o[a] = c[a];
  }
  function car25519(o) {
    var i;
    var v;
    var c = 1;
    for (i = 0; i < 16; ++i) {
      v = o[i] + c + 65535;
      c = Math.floor(v / 65536);
      o[i] = v - c * 65536;
    }
    o[0] += c - 1 + 37 * (c - 1);
  }
  function sel25519(p, q, b) {
    var t;
    var c = ~(b - 1);
    for (var i = 0; i < 16; ++i) {
      t = c & (p[i] ^ q[i]);
      p[i] ^= t;
      q[i] ^= t;
    }
  }
  function gf(init) {
    var i;
    var float64Array = new Float64Array(16);
    if (init) for (i = 0; i < init.length; ++i) float64Array[i] = init[i];
    return float64Array;
  }
  function A(o, a, b) {
    for (var i = 0; i < 16; ++i) o[i] = a[i] + b[i];
  }
  function Z(o, a, b) {
    for (var i = 0; i < 16; ++i) o[i] = a[i] - b[i];
  }
  function S(o, a) {
    M(o, a, a);
  }
  function M(o, a, b_2) {
    var v;
    var c;
    var t0 = 0;
    var t1 = 0;
    var t2 = 0;
    var t3 = 0;
    var t4 = 0;
    var t5 = 0;
    var t6 = 0;
    var t7 = 0;
    var t8 = 0;
    var t9 = 0;
    var t10 = 0;
    var t11 = 0;
    var t12 = 0;
    var t13 = 0;
    var t14 = 0;
    var t15 = 0;
    var t16 = 0;
    var t17 = 0;
    var t18 = 0;
    var t19 = 0;
    var t20 = 0;
    var t21 = 0;
    var t22 = 0;
    var t23 = 0;
    var t24 = 0;
    var t25 = 0;
    var t26 = 0;
    var t27 = 0;
    var t28 = 0;
    var t29 = 0;
    var t30 = 0;
    var b0 = b_2[0];
    var b1 = b_2[1];
    var b2 = b_2[2];
    var b3 = b_2[3];
    var b4 = b_2[4];
    var b5 = b_2[5];
    var b6 = b_2[6];
    var b7 = b_2[7];
    var b8 = b_2[8];
    var b9 = b_2[9];
    var b10 = b_2[10];
    var b11 = b_2[11];
    var b12 = b_2[12];
    var b13 = b_2[13];
    var b14 = b_2[14];
    var b15 = b_2[15];
    v = a[0];
    t0 += v * b0;
    t1 += v * b1;
    t2 += v * b2;
    t3 += v * b3;
    t4 += v * b4;
    t5 += v * b5;
    t6 += v * b6;
    t7 += v * b7;
    t8 += v * b8;
    t9 += v * b9;
    t10 += v * b10;
    t11 += v * b11;
    t12 += v * b12;
    t13 += v * b13;
    t14 += v * b14;
    t15 += v * b15;
    v = a[1];
    t1 += v * b0;
    t2 += v * b1;
    t3 += v * b2;
    t4 += v * b3;
    t5 += v * b4;
    t6 += v * b5;
    t7 += v * b6;
    t8 += v * b7;
    t9 += v * b8;
    t10 += v * b9;
    t11 += v * b10;
    t12 += v * b11;
    t13 += v * b12;
    t14 += v * b13;
    t15 += v * b14;
    t16 += v * b15;
    v = a[2];
    t2 += v * b0;
    t3 += v * b1;
    t4 += v * b2;
    t5 += v * b3;
    t6 += v * b4;
    t7 += v * b5;
    t8 += v * b6;
    t9 += v * b7;
    t10 += v * b8;
    t11 += v * b9;
    t12 += v * b10;
    t13 += v * b11;
    t14 += v * b12;
    t15 += v * b13;
    t16 += v * b14;
    t17 += v * b15;
    v = a[3];
    t3 += v * b0;
    t4 += v * b1;
    t5 += v * b2;
    t6 += v * b3;
    t7 += v * b4;
    t8 += v * b5;
    t9 += v * b6;
    t10 += v * b7;
    t11 += v * b8;
    t12 += v * b9;
    t13 += v * b10;
    t14 += v * b11;
    t15 += v * b12;
    t16 += v * b13;
    t17 += v * b14;
    t18 += v * b15;
    v = a[4];
    t4 += v * b0;
    t5 += v * b1;
    t6 += v * b2;
    t7 += v * b3;
    t8 += v * b4;
    t9 += v * b5;
    t10 += v * b6;
    t11 += v * b7;
    t12 += v * b8;
    t13 += v * b9;
    t14 += v * b10;
    t15 += v * b11;
    t16 += v * b12;
    t17 += v * b13;
    t18 += v * b14;
    t19 += v * b15;
    v = a[5];
    t5 += v * b0;
    t6 += v * b1;
    t7 += v * b2;
    t8 += v * b3;
    t9 += v * b4;
    t10 += v * b5;
    t11 += v * b6;
    t12 += v * b7;
    t13 += v * b8;
    t14 += v * b9;
    t15 += v * b10;
    t16 += v * b11;
    t17 += v * b12;
    t18 += v * b13;
    t19 += v * b14;
    t20 += v * b15;
    v = a[6];
    t6 += v * b0;
    t7 += v * b1;
    t8 += v * b2;
    t9 += v * b3;
    t10 += v * b4;
    t11 += v * b5;
    t12 += v * b6;
    t13 += v * b7;
    t14 += v * b8;
    t15 += v * b9;
    t16 += v * b10;
    t17 += v * b11;
    t18 += v * b12;
    t19 += v * b13;
    t20 += v * b14;
    t21 += v * b15;
    v = a[7];
    t7 += v * b0;
    t8 += v * b1;
    t9 += v * b2;
    t10 += v * b3;
    t11 += v * b4;
    t12 += v * b5;
    t13 += v * b6;
    t14 += v * b7;
    t15 += v * b8;
    t16 += v * b9;
    t17 += v * b10;
    t18 += v * b11;
    t19 += v * b12;
    t20 += v * b13;
    t21 += v * b14;
    t22 += v * b15;
    v = a[8];
    t8 += v * b0;
    t9 += v * b1;
    t10 += v * b2;
    t11 += v * b3;
    t12 += v * b4;
    t13 += v * b5;
    t14 += v * b6;
    t15 += v * b7;
    t16 += v * b8;
    t17 += v * b9;
    t18 += v * b10;
    t19 += v * b11;
    t20 += v * b12;
    t21 += v * b13;
    t22 += v * b14;
    t23 += v * b15;
    v = a[9];
    t9 += v * b0;
    t10 += v * b1;
    t11 += v * b2;
    t12 += v * b3;
    t13 += v * b4;
    t14 += v * b5;
    t15 += v * b6;
    t16 += v * b7;
    t17 += v * b8;
    t18 += v * b9;
    t19 += v * b10;
    t20 += v * b11;
    t21 += v * b12;
    t22 += v * b13;
    t23 += v * b14;
    t24 += v * b15;
    v = a[10];
    t10 += v * b0;
    t11 += v * b1;
    t12 += v * b2;
    t13 += v * b3;
    t14 += v * b4;
    t15 += v * b5;
    t16 += v * b6;
    t17 += v * b7;
    t18 += v * b8;
    t19 += v * b9;
    t20 += v * b10;
    t21 += v * b11;
    t22 += v * b12;
    t23 += v * b13;
    t24 += v * b14;
    t25 += v * b15;
    v = a[11];
    t11 += v * b0;
    t12 += v * b1;
    t13 += v * b2;
    t14 += v * b3;
    t15 += v * b4;
    t16 += v * b5;
    t17 += v * b6;
    t18 += v * b7;
    t19 += v * b8;
    t20 += v * b9;
    t21 += v * b10;
    t22 += v * b11;
    t23 += v * b12;
    t24 += v * b13;
    t25 += v * b14;
    t26 += v * b15;
    v = a[12];
    t12 += v * b0;
    t13 += v * b1;
    t14 += v * b2;
    t15 += v * b3;
    t16 += v * b4;
    t17 += v * b5;
    t18 += v * b6;
    t19 += v * b7;
    t20 += v * b8;
    t21 += v * b9;
    t22 += v * b10;
    t23 += v * b11;
    t24 += v * b12;
    t25 += v * b13;
    t26 += v * b14;
    t27 += v * b15;
    v = a[13];
    t13 += v * b0;
    t14 += v * b1;
    t15 += v * b2;
    t16 += v * b3;
    t17 += v * b4;
    t18 += v * b5;
    t19 += v * b6;
    t20 += v * b7;
    t21 += v * b8;
    t22 += v * b9;
    t23 += v * b10;
    t24 += v * b11;
    t25 += v * b12;
    t26 += v * b13;
    t27 += v * b14;
    t28 += v * b15;
    v = a[14];
    t14 += v * b0;
    t15 += v * b1;
    t16 += v * b2;
    t17 += v * b3;
    t18 += v * b4;
    t19 += v * b5;
    t20 += v * b6;
    t21 += v * b7;
    t22 += v * b8;
    t23 += v * b9;
    t24 += v * b10;
    t25 += v * b11;
    t26 += v * b12;
    t27 += v * b13;
    t28 += v * b14;
    t29 += v * b15;
    v = a[15];
    t15 += v * b0;
    t16 += v * b1;
    t17 += v * b2;
    t18 += v * b3;
    t19 += v * b4;
    t20 += v * b5;
    t21 += v * b6;
    t22 += v * b7;
    t23 += v * b8;
    t24 += v * b9;
    t25 += v * b10;
    t26 += v * b11;
    t27 += v * b12;
    t28 += v * b13;
    t29 += v * b14;
    t30 += v * b15;
    t0 += 38 * t16;
    t1 += 38 * t17;
    t2 += 38 * t18;
    t3 += 38 * t19;
    t4 += 38 * t20;
    t5 += 38 * t21;
    t6 += 38 * t22;
    t7 += 38 * t23;
    t8 += 38 * t24;
    t9 += 38 * t25;
    t10 += 38 * t26;
    t11 += 38 * t27;
    t12 += 38 * t28;
    t13 += 38 * t29;
    t14 += 38 * t30;
    c = 1;
    v = t0 + c + 65535;
    c = Math.floor(v / 65536);
    t0 = v - c * 65536;
    v = t1 + c + 65535;
    c = Math.floor(v / 65536);
    t1 = v - c * 65536;
    v = t2 + c + 65535;
    c = Math.floor(v / 65536);
    t2 = v - c * 65536;
    v = t3 + c + 65535;
    c = Math.floor(v / 65536);
    t3 = v - c * 65536;
    v = t4 + c + 65535;
    c = Math.floor(v / 65536);
    t4 = v - c * 65536;
    v = t5 + c + 65535;
    c = Math.floor(v / 65536);
    t5 = v - c * 65536;
    v = t6 + c + 65535;
    c = Math.floor(v / 65536);
    t6 = v - c * 65536;
    v = t7 + c + 65535;
    c = Math.floor(v / 65536);
    t7 = v - c * 65536;
    v = t8 + c + 65535;
    c = Math.floor(v / 65536);
    t8 = v - c * 65536;
    v = t9 + c + 65535;
    c = Math.floor(v / 65536);
    t9 = v - c * 65536;
    v = t10 + c + 65535;
    c = Math.floor(v / 65536);
    t10 = v - c * 65536;
    v = t11 + c + 65535;
    c = Math.floor(v / 65536);
    t11 = v - c * 65536;
    v = t12 + c + 65535;
    c = Math.floor(v / 65536);
    t12 = v - c * 65536;
    v = t13 + c + 65535;
    c = Math.floor(v / 65536);
    t13 = v - c * 65536;
    v = t14 + c + 65535;
    c = Math.floor(v / 65536);
    t14 = v - c * 65536;
    v = t15 + c + 65535;
    c = Math.floor(v / 65536);
    t15 = v - c * 65536;
    t0 += c - 1 + 37 * (c - 1);
    c = 1;
    v = t0 + c + 65535;
    c = Math.floor(v / 65536);
    t0 = v - c * 65536;
    v = t1 + c + 65535;
    c = Math.floor(v / 65536);
    t1 = v - c * 65536;
    v = t2 + c + 65535;
    c = Math.floor(v / 65536);
    t2 = v - c * 65536;
    v = t3 + c + 65535;
    c = Math.floor(v / 65536);
    t3 = v - c * 65536;
    v = t4 + c + 65535;
    c = Math.floor(v / 65536);
    t4 = v - c * 65536;
    v = t5 + c + 65535;
    c = Math.floor(v / 65536);
    t5 = v - c * 65536;
    v = t6 + c + 65535;
    c = Math.floor(v / 65536);
    t6 = v - c * 65536;
    v = t7 + c + 65535;
    c = Math.floor(v / 65536);
    t7 = v - c * 65536;
    v = t8 + c + 65535;
    c = Math.floor(v / 65536);
    t8 = v - c * 65536;
    v = t9 + c + 65535;
    c = Math.floor(v / 65536);
    t9 = v - c * 65536;
    v = t10 + c + 65535;
    c = Math.floor(v / 65536);
    t10 = v - c * 65536;
    v = t11 + c + 65535;
    c = Math.floor(v / 65536);
    t11 = v - c * 65536;
    v = t12 + c + 65535;
    c = Math.floor(v / 65536);
    t12 = v - c * 65536;
    v = t13 + c + 65535;
    c = Math.floor(v / 65536);
    t13 = v - c * 65536;
    v = t14 + c + 65535;
    c = Math.floor(v / 65536);
    t14 = v - c * 65536;
    v = t15 + c + 65535;
    c = Math.floor(v / 65536);
    t15 = v - c * 65536;
    t0 += c - 1 + 37 * (c - 1);
    o[0] = t0;
    o[1] = t1;
    o[2] = t2;
    o[3] = t3;
    o[4] = t4;
    o[5] = t5;
    o[6] = t6;
    o[7] = t7;
    o[8] = t8;
    o[9] = t9;
    o[10] = t10;
    o[11] = t11;
    o[12] = t12;
    o[13] = t13;
    o[14] = t14;
    o[15] = t15;
  }
});
export { require_ed25519 };
