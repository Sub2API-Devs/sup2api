/**
 * node-forge/lib/aes.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: node-forge@1.4.0
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_forge } from "./forge.js";
import { require_cipher } from "./cipher.js";
import { require_cipherModes } from "./cipherModes.js";
import { require_util } from "./util.js";

//@ chunk-qg41pqt6.js:43009-46984 cjs-fingerprint
var require_aes = __commonJS(function (cjsExports, cjsModule) {
  var forge = require_forge();
  require_cipher();
  require_cipherModes();
  require_util();
  cjsModule.exports = forge.aes = forge.aes || {};
  forge.aes.startEncrypting = function (key, iv, output, mode) {
    var cipher = _createCipher({
      key,
      output,
      decrypt: false,
      mode,
    });
    cipher.start(iv);
    return cipher;
  };
  forge.aes.createEncryptionCipher = function (key, mode) {
    return _createCipher({
      key,
      output: null,
      decrypt: false,
      mode,
    });
  };
  forge.aes.startDecrypting = function (key, iv, output, mode) {
    var cipher = _createCipher({
      key,
      output,
      decrypt: true,
      mode,
    });
    cipher.start(iv);
    return cipher;
  };
  forge.aes.createDecryptionCipher = function (key, mode) {
    return _createCipher({
      key,
      output: null,
      decrypt: true,
      mode,
    });
  };
  forge.aes.Algorithm = function (name, mode) {
    if (!init) initialize();
    var selfRef = this;
    selfRef.name = name;
    selfRef.mode = new mode({
      blockSize: 16,
      cipher: {
        encrypt: function (inBlock, outBlock) {
          return _updateBlock(selfRef._w, inBlock, outBlock, false);
        },
        decrypt: function (inBlock, outBlock) {
          return _updateBlock(selfRef._w, inBlock, outBlock, true);
        },
      },
    });
    selfRef._init = false;
  };
  forge.aes.Algorithm.prototype.initialize = function (options) {
    if (this._init) return;
    var key = options.key;
    var tmp;
    if (typeof key === "string" && (key.length === 16 || key.length === 24 || key.length === 32))
      key = forge.util.createBuffer(key);
    else if (forge.util.isArray(key) && (key.length === 16 || key.length === 24 || key.length === 32)) {
      tmp = key;
      key = forge.util.createBuffer();
      for (var i = 0; i < tmp.length; ++i) key.putByte(tmp[i]);
    }
    if (!forge.util.isArray(key)) {
      tmp = key;
      key = [];
      var len = tmp.length();
      if (len === 16 || len === 24 || len === 32) {
        len = len >>> 2;
        for (var i = 0; i < len; ++i) key.push(tmp.getInt32());
      }
    }
    if (!forge.util.isArray(key) || !(key.length === 4 || key.length === 6 || key.length === 8))
      throw Error("Invalid key parameter.");
    var mode = this.mode.name;
    var encryptOp = ["CFB", "OFB", "CTR", "GCM"].indexOf(mode) !== -1;
    this._w = _expandKey(key, options.decrypt && !encryptOp);
    this._init = true;
  };
  forge.aes._expandKey = function (key, decrypt) {
    if (!init) initialize();
    return _expandKey(key, decrypt);
  };
  forge.aes._updateBlock = _updateBlock;
  registerAlgorithm("AES-ECB", forge.cipher.modes.ecb);
  registerAlgorithm("AES-CBC", forge.cipher.modes.cbc);
  registerAlgorithm("AES-CFB", forge.cipher.modes.cfb);
  registerAlgorithm("AES-OFB", forge.cipher.modes.ofb);
  registerAlgorithm("AES-CTR", forge.cipher.modes.ctr);
  registerAlgorithm("AES-GCM", forge.cipher.modes.gcm);
  function registerAlgorithm(name, mode) {
    var factory = function () {
      return new forge.aes.Algorithm(name, mode);
    };
    forge.cipher.registerAlgorithm(name, factory);
  }
  var init = false;
  var Nb = 4;
  var sbox;
  var isbox;
  var rcon;
  var mix;
  var imix;
  function initialize() {
    init = true;
    rcon = [0, 1, 2, 4, 8, 16, 32, 64, 128, 27, 54];
    var xtime = Array(256);
    for (var i = 0; i < 128; ++i) {
      xtime[i] = i << 1;
      xtime[i + 128] = ((i + 128) << 1) ^ 283;
    }
    sbox = Array(256);
    isbox = Array(256);
    mix = [, , , ,];
    imix = [, , , ,];
    for (var i = 0; i < 4; ++i) {
      mix[i] = Array(256);
      imix[i] = Array(256);
    }
    var e = 0;
    var ei = 0;
    var e2;
    var e4;
    var e8;
    var sx;
    var sx2;
    var me;
    var ime;
    for (var i = 0; i < 256; ++i) {
      sx = ei ^ (ei << 1) ^ (ei << 2) ^ (ei << 3) ^ (ei << 4);
      sx = (sx >> 8) ^ (sx & 255) ^ 99;
      sbox[e] = sx;
      isbox[sx] = e;
      sx2 = xtime[sx];
      e2 = xtime[e];
      e4 = xtime[e2];
      e8 = xtime[e4];
      me = (sx2 << 24) ^ (sx << 16) ^ (sx << 8) ^ (sx ^ sx2);
      ime = ((e2 ^ e4 ^ e8) << 24) ^ ((e ^ e8) << 16) ^ ((e ^ e4 ^ e8) << 8) ^ (e ^ e2 ^ e8);
      for (var n = 0; n < 4; ++n) {
        mix[n][e] = me;
        imix[n][sx] = ime;
        me = (me << 24) | (me >>> 8);
        ime = (ime << 24) | (ime >>> 8);
      }
      if (e === 0) e = ei = 1;
      else {
        e = e2 ^ xtime[xtime[xtime[e2 ^ e8]]];
        ei ^= xtime[xtime[ei]];
      }
    }
  }
  function _expandKey(key, decrypt) {
    var w_2 = key.slice(0);
    var temp;
    var iNk = 1;
    var Nk = w_2.length;
    var Nr1 = Nk + 6 + 1;
    var end = Nb * Nr1;
    for (var i = Nk; i < end; ++i) {
      temp = w_2[i - 1];
      if (i % Nk === 0) {
        temp =
          (sbox[(temp >>> 16) & 255] << 24) ^
          (sbox[(temp >>> 8) & 255] << 16) ^
          (sbox[temp & 255] << 8) ^
          sbox[temp >>> 24] ^
          (rcon[iNk] << 24);
        iNk++;
      } else if (Nk > 6 && i % Nk === 4)
        temp =
          (sbox[temp >>> 24] << 24) ^
          (sbox[(temp >>> 16) & 255] << 16) ^
          (sbox[(temp >>> 8) & 255] << 8) ^
          sbox[temp & 255];
      w_2[i] = w_2[i - Nk] ^ temp;
    }
    if (decrypt) {
      var tmp;
      var m0 = imix[0];
      var m1 = imix[1];
      var m2 = imix[2];
      var m3 = imix[3];
      var wnew = w_2.slice(0);
      end = w_2.length;
      for (var i = 0, wi = end - Nb; i < end; i += Nb, wi -= Nb)
        if (i === 0 || i === end - Nb) {
          wnew[i] = w_2[wi];
          wnew[i + 1] = w_2[wi + 3];
          wnew[i + 2] = w_2[wi + 2];
          wnew[i + 3] = w_2[wi + 1];
        } else
          for (var n = 0; n < Nb; ++n) {
            tmp = w_2[wi + n];
            wnew[i + (3 & -n)] =
              m0[sbox[tmp >>> 24]] ^
              m1[sbox[(tmp >>> 16) & 255]] ^
              m2[sbox[(tmp >>> 8) & 255]] ^
              m3[sbox[tmp & 255]];
          }
      w_2 = wnew;
    }
    return w_2;
  }
  function _updateBlock(w_2, input, output, decrypt) {
    var Nr = w_2.length / 4 - 1;
    var m0;
    var m1;
    var m2;
    var m3;
    var sub;
    if (decrypt) {
      m0 = imix[0];
      m1 = imix[1];
      m2 = imix[2];
      m3 = imix[3];
      sub = isbox;
    } else {
      m0 = mix[0];
      m1 = mix[1];
      m2 = mix[2];
      m3 = mix[3];
      sub = sbox;
    }
    var a;
    var b;
    var c;
    var d;
    var a2;
    var b2;
    var c2;
    a = input[0] ^ w_2[0];
    b = input[decrypt ? 3 : 1] ^ w_2[1];
    c = input[2] ^ w_2[2];
    d = input[decrypt ? 1 : 3] ^ w_2[3];
    var i = 3;
    for (var round = 1; round < Nr; ++round) {
      a2 = m0[a >>> 24] ^ m1[(b >>> 16) & 255] ^ m2[(c >>> 8) & 255] ^ m3[d & 255] ^ w_2[++i];
      b2 = m0[b >>> 24] ^ m1[(c >>> 16) & 255] ^ m2[(d >>> 8) & 255] ^ m3[a & 255] ^ w_2[++i];
      c2 = m0[c >>> 24] ^ m1[(d >>> 16) & 255] ^ m2[(a >>> 8) & 255] ^ m3[b & 255] ^ w_2[++i];
      d = m0[d >>> 24] ^ m1[(a >>> 16) & 255] ^ m2[(b >>> 8) & 255] ^ m3[c & 255] ^ w_2[++i];
      a = a2;
      b = b2;
      c = c2;
    }
    output[0] =
      (sub[a >>> 24] << 24) ^
      (sub[(b >>> 16) & 255] << 16) ^
      (sub[(c >>> 8) & 255] << 8) ^
      sub[d & 255] ^
      w_2[++i];
    output[decrypt ? 3 : 1] =
      (sub[b >>> 24] << 24) ^
      (sub[(c >>> 16) & 255] << 16) ^
      (sub[(d >>> 8) & 255] << 8) ^
      sub[a & 255] ^
      w_2[++i];
    output[2] =
      (sub[c >>> 24] << 24) ^
      (sub[(d >>> 16) & 255] << 16) ^
      (sub[(a >>> 8) & 255] << 8) ^
      sub[b & 255] ^
      w_2[++i];
    output[decrypt ? 1 : 3] =
      (sub[d >>> 24] << 24) ^
      (sub[(a >>> 16) & 255] << 16) ^
      (sub[(b >>> 8) & 255] << 8) ^
      sub[c & 255] ^
      w_2[++i];
  }
  function _createCipher(options) {
    options = options || {};
    var mode = (options.mode || "CBC").toUpperCase();
    var algorithm = "AES-" + mode;
    var cipher;
    if (options.decrypt) cipher = forge.cipher.createDecipher(algorithm, options.key);
    else cipher = forge.cipher.createCipher(algorithm, options.key);
    var start = cipher.start;
    cipher.start = function (iv, options) {
      var output = null;
      if (options instanceof forge.util.ByteBuffer) {
        output = options;
        options = {};
      }
      options = options || {};
      options.output = output;
      options.iv = iv;
      start.call(cipher, options);
    };
    return cipher;
  }
});
export { require_aes };
