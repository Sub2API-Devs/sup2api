/**
 * node-forge/lib/rc2.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: node-forge@1.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_forge } from "./forge.js";
import { require_util } from "./util.js";

//@ chunk-fq0cr76a.js:89883-92952 cjs-fingerprint
var require_rc2 = __commonJS(function (cjsExports, cjsModule) {
  var forge = require_forge();
  require_util();
  var piTable = [
    217, 120, 249, 196, 25, 221, 181, 237, 40, 233, 253, 121, 74, 160, 216, 157, 198, 126, 55, 131, 43, 118,
    83, 142, 98, 76, 100, 136, 68, 139, 251, 162, 23, 154, 89, 245, 135, 179, 79, 19, 97, 69, 109, 141, 9,
    129, 125, 50, 189, 143, 64, 235, 134, 183, 123, 11, 240, 149, 33, 34, 92, 107, 78, 130, 84, 214, 101, 147,
    206, 96, 178, 28, 115, 86, 192, 20, 167, 140, 241, 220, 18, 117, 202, 31, 59, 190, 228, 209, 66, 61, 212,
    48, 163, 60, 182, 38, 111, 191, 14, 218, 70, 105, 7, 87, 39, 242, 29, 155, 188, 148, 67, 3, 248, 17, 199,
    246, 144, 239, 62, 231, 6, 195, 213, 47, 200, 102, 30, 215, 8, 232, 234, 222, 128, 82, 238, 247, 132, 170,
    114, 172, 53, 77, 106, 42, 150, 26, 210, 113, 90, 21, 73, 116, 75, 159, 208, 94, 4, 24, 164, 236, 194,
    224, 65, 110, 15, 81, 203, 204, 36, 145, 175, 80, 161, 244, 112, 57, 153, 124, 58, 133, 35, 184, 180, 122,
    252, 2, 54, 91, 37, 85, 151, 49, 45, 93, 250, 152, 227, 138, 146, 174, 5, 223, 41, 16, 103, 108, 186, 201,
    211, 0, 230, 207, 225, 158, 168, 44, 99, 22, 1, 63, 88, 226, 137, 169, 13, 56, 52, 27, 171, 51, 255, 176,
    187, 72, 12, 95, 185, 177, 205, 46, 197, 243, 219, 71, 229, 165, 156, 119, 10, 166, 32, 104, 254, 127,
    193, 173,
  ];
  var s_2 = [1, 2, 3, 5];
  var rol = function (word, bits) {
    return ((word << bits) & 65535) | ((word & 65535) >> (16 - bits));
  };
  var ror = function (word, bits) {
    return ((word & 65535) >> bits) | ((word << (16 - bits)) & 65535);
  };
  cjsModule.exports = forge.rc2 = forge.rc2 || {};
  forge.rc2.expandKey = function (key, effKeyBits) {
    if (typeof key === "string") key = forge.util.createBuffer(key);
    effKeyBits = effKeyBits || 128;
    var L = key;
    var T = key.length();
    var T1 = effKeyBits;
    var T8 = Math.ceil(T1 / 8);
    var TM = 255 >> (T1 & 7);
    var i;
    for (i = T; i < 128; i++) L.putByte(piTable[(L.at(i - 1) + L.at(i - T)) & 255]);
    L.setAt(128 - T8, piTable[L.at(128 - T8) & TM]);
    for (i = 127 - T8; i >= 0; i--) L.setAt(i, piTable[L.at(i + 1) ^ L.at(i + T8)]);
    return L;
  };
  var createCipher = function (key, bits, encrypt) {
    var _finish = false;
    var _input = null;
    var _output = null;
    var _iv = null;
    var mixRound;
    var mashRound;
    var i;
    var j;
    var K_2 = [];
    key = forge.rc2.expandKey(key, bits);
    for (i = 0; i < 64; i++) K_2.push(key.getInt16Le());
    if (encrypt) {
      mixRound = function (R) {
        for (i = 0; i < 4; i++) {
          R[i] += K_2[j] + (R[(i + 3) % 4] & R[(i + 2) % 4]) + (~R[(i + 3) % 4] & R[(i + 1) % 4]);
          R[i] = rol(R[i], s_2[i]);
          j++;
        }
      };
      mashRound = function (R) {
        for (i = 0; i < 4; i++) R[i] += K_2[R[(i + 3) % 4] & 63];
      };
    } else {
      mixRound = function (R) {
        for (i = 3; i >= 0; i--) {
          R[i] = ror(R[i], s_2[i]);
          R[i] -= K_2[j] + (R[(i + 3) % 4] & R[(i + 2) % 4]) + (~R[(i + 3) % 4] & R[(i + 1) % 4]);
          j--;
        }
      };
      mashRound = function (R) {
        for (i = 3; i >= 0; i--) R[i] -= K_2[R[(i + 3) % 4] & 63];
      };
    }
    var runPlan = function (plan) {
      var R = [];
      for (i = 0; i < 4; i++) {
        var val = _input.getInt16Le();
        if (_iv !== null)
          if (encrypt) val ^= _iv.getInt16Le();
          else _iv.putInt16Le(val);
        R.push(val & 65535);
      }
      j = encrypt ? 0 : 63;
      for (var ptr = 0; ptr < plan.length; ptr++)
        for (var ctr = 0; ctr < plan[ptr][0]; ctr++) plan[ptr][1](R);
      for (i = 0; i < 4; i++) {
        if (_iv !== null)
          if (encrypt) _iv.putInt16Le(R[i]);
          else R[i] ^= _iv.getInt16Le();
        _output.putInt16Le(R[i]);
      }
    };
    var cipher = null;
    cipher = {
      start: function (iv, output) {
        if (iv) {
          if (typeof iv === "string") iv = forge.util.createBuffer(iv);
        }
        _finish = false;
        _input = forge.util.createBuffer();
        _output = output || new forge.util.createBuffer();
        _iv = iv;
        cipher.output = _output;
      },
      update: function (input) {
        if (!_finish) _input.putBuffer(input);
        while (_input.length() >= 8)
          runPlan([
            [5, mixRound],
            [1, mashRound],
            [6, mixRound],
            [1, mashRound],
            [5, mixRound],
          ]);
      },
      finish: function (pad) {
        var rval = true;
        if (encrypt)
          if (pad) rval = pad(8, _input, !encrypt);
          else {
            var padding = _input.length() === 8 ? 8 : 8 - _input.length();
            _input.fillWithByte(padding, padding);
          }
        if (rval) {
          _finish = true;
          cipher.update();
        }
        if (!encrypt) {
          rval = _input.length() === 0;
          if (rval)
            if (pad) rval = pad(8, _output, !encrypt);
            else {
              var len = _output.length();
              var count = _output.at(len - 1);
              if (count > len) rval = false;
              else _output.truncate(count);
            }
        }
        return rval;
      },
    };
    return cipher;
  };
  forge.rc2.startEncrypting = function (key, iv, output) {
    var cipher = forge.rc2.createEncryptionCipher(key, 128);
    cipher.start(iv, output);
    return cipher;
  };
  forge.rc2.createEncryptionCipher = function (key, bits) {
    return createCipher(key, bits, true);
  };
  forge.rc2.startDecrypting = function (key, iv, output) {
    var cipher = forge.rc2.createDecryptionCipher(key, 128);
    cipher.start(iv, output);
    return cipher;
  };
  forge.rc2.createDecryptionCipher = function (key, bits) {
    return createCipher(key, bits, false);
  };
});
export { require_rc2 };
