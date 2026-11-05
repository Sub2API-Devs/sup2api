/**
 * node-forge/lib/sha256.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: node-forge@1.4.0
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_forge } from "./forge.js";
import { require_md } from "./md.js";
import { require_util } from "./util.js";

//@ chunk-qg41pqt6.js:81527-84678 cjs-fingerprint
var require_sha256 = __commonJS(function (cjsExports, cjsModule) {
  var forge = require_forge();
  require_md();
  require_util();
  var sha256 = (cjsModule.exports = forge.sha256 = forge.sha256 || {});
  forge.md.sha256 = forge.md.algorithms.sha256 = sha256;
  sha256.create = function () {
    if (!_initialized) _init();
    var _state = null;
    var _input = forge.util.createBuffer();
    var _w = Array(64);
    var md = {
      algorithm: "sha256",
      blockLength: 64,
      digestLength: 32,
      messageLength: 0,
      fullMessageLength: null,
      messageLengthSize: 8,
    };
    md.start = function () {
      md.messageLength = 0;
      md.fullMessageLength = md.messageLength64 = [];
      var int32s = md.messageLengthSize / 4;
      for (var i = 0; i < int32s; ++i) md.fullMessageLength.push(0);
      _input = forge.util.createBuffer();
      _state = {
        h0: 1779033703,
        h1: 3144134277,
        h2: 1013904242,
        h3: 2773480762,
        h4: 1359893119,
        h5: 2600822924,
        h6: 528734635,
        h7: 1541459225,
      };
      return md;
    };
    md.start();
    md.update = function (msg, encoding) {
      if (encoding === "utf8") msg = forge.util.encodeUtf8(msg);
      var len = msg.length;
      md.messageLength += len;
      len = [(len / 4294967296) >>> 0, len >>> 0];
      for (var i = md.fullMessageLength.length - 1; i >= 0; --i) {
        md.fullMessageLength[i] += len[1];
        len[1] = len[0] + ((md.fullMessageLength[i] / 4294967296) >>> 0);
        md.fullMessageLength[i] = md.fullMessageLength[i] >>> 0;
        len[0] = (len[1] / 4294967296) >>> 0;
      }
      _input.putBytes(msg);
      _update(_state, _w, _input);
      if (_input.read > 2048 || _input.length() === 0) _input.compact();
      return md;
    };
    md.digest = function () {
      var finalBlock = forge.util.createBuffer();
      finalBlock.putBytes(_input.bytes());
      var remaining = md.fullMessageLength[md.fullMessageLength.length - 1] + md.messageLengthSize;
      var overflow = remaining & (md.blockLength - 1);
      finalBlock.putBytes(_padding.substr(0, md.blockLength - overflow));
      var next;
      var carry;
      var bits = md.fullMessageLength[0] * 8;
      for (var i = 0; i < md.fullMessageLength.length - 1; ++i) {
        next = md.fullMessageLength[i + 1] * 8;
        carry = (next / 4294967296) >>> 0;
        bits += carry;
        finalBlock.putInt32(bits >>> 0);
        bits = next >>> 0;
      }
      finalBlock.putInt32(bits);
      var s2 = {
        h0: _state.h0,
        h1: _state.h1,
        h2: _state.h2,
        h3: _state.h3,
        h4: _state.h4,
        h5: _state.h5,
        h6: _state.h6,
        h7: _state.h7,
      };
      _update(s2, _w, finalBlock);
      var rval = forge.util.createBuffer();
      rval.putInt32(s2.h0);
      rval.putInt32(s2.h1);
      rval.putInt32(s2.h2);
      rval.putInt32(s2.h3);
      rval.putInt32(s2.h4);
      rval.putInt32(s2.h5);
      rval.putInt32(s2.h6);
      rval.putInt32(s2.h7);
      return rval;
    };
    return md;
  };
  var _padding = null;
  var _initialized = false;
  var _k = null;
  function _init() {
    _padding = String.fromCharCode(128);
    _padding += forge.util.fillString(String.fromCharCode(0), 64);
    _k = [
      1116352408, 1899447441, 3049323471, 3921009573, 961987163, 1508970993, 2453635748, 2870763221,
      3624381080, 310598401, 607225278, 1426881987, 1925078388, 2162078206, 2614888103, 3248222580,
      3835390401, 4022224774, 264347078, 604807628, 770255983, 1249150122, 1555081692, 1996064986, 2554220882,
      2821834349, 2952996808, 3210313671, 3336571891, 3584528711, 113926993, 338241895, 666307205, 773529912,
      1294757372, 1396182291, 1695183700, 1986661051, 2177026350, 2456956037, 2730485921, 2820302411,
      3259730800, 3345764771, 3516065817, 3600352804, 4094571909, 275423344, 430227734, 506948616, 659060556,
      883997877, 958139571, 1322822218, 1537002063, 1747873779, 1955562222, 2024104815, 2227730452,
      2361852424, 2428436474, 2756734187, 3204031479, 3329325298,
    ];
    _initialized = true;
  }
  function _update(s_2, w_2, bytes) {
    var t1;
    var t2;
    var s0;
    var s1;
    var ch;
    var maj;
    var i;
    var a;
    var b;
    var c;
    var d;
    var e;
    var f;
    var g;
    var h;
    var len = bytes.length();
    while (len >= 64) {
      for (i = 0; i < 16; ++i) w_2[i] = bytes.getInt32();
      for (; i < 64; ++i) {
        t1 = w_2[i - 2];
        t1 = ((t1 >>> 17) | (t1 << 15)) ^ ((t1 >>> 19) | (t1 << 13)) ^ (t1 >>> 10);
        t2 = w_2[i - 15];
        t2 = ((t2 >>> 7) | (t2 << 25)) ^ ((t2 >>> 18) | (t2 << 14)) ^ (t2 >>> 3);
        w_2[i] = (t1 + w_2[i - 7] + t2 + w_2[i - 16]) | 0;
      }
      a = s_2.h0;
      b = s_2.h1;
      c = s_2.h2;
      d = s_2.h3;
      e = s_2.h4;
      f = s_2.h5;
      g = s_2.h6;
      h = s_2.h7;
      for (i = 0; i < 64; ++i) {
        s1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
        ch = g ^ (e & (f ^ g));
        s0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
        maj = (a & b) | (c & (a ^ b));
        t1 = h + s1 + ch + _k[i] + w_2[i];
        t2 = s0 + maj;
        h = g;
        g = f;
        f = e;
        e = (d + t1) >>> 0;
        d = c;
        c = b;
        b = a;
        a = (t1 + t2) >>> 0;
      }
      s_2.h0 = (s_2.h0 + a) | 0;
      s_2.h1 = (s_2.h1 + b) | 0;
      s_2.h2 = (s_2.h2 + c) | 0;
      s_2.h3 = (s_2.h3 + d) | 0;
      s_2.h4 = (s_2.h4 + e) | 0;
      s_2.h5 = (s_2.h5 + f) | 0;
      s_2.h6 = (s_2.h6 + g) | 0;
      s_2.h7 = (s_2.h7 + h) | 0;
      len -= 64;
    }
  }
});
export { require_sha256 };
