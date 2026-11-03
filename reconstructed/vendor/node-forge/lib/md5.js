/**
 * node-forge/lib/md5.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: node-forge@1.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { require_forge } from "./forge.js";
import { require_md } from "./md.js";
import { require_util } from "./util.js";

//@ chunk-fq0cr76a.js:65722-68269 cjs-fingerprint
var require_md5 = x(function (cjsExports, cjsModule) {
  var forge = require_forge();
  require_md();
  require_util();
  var md5 = (cjsModule.exports = forge.md5 = forge.md5 || {});
  forge.md.md5 = forge.md.algorithms.md5 = md5;
  md5.create = function () {
    if (!_initialized) _init();
    var _state = null;
    var _input = forge.util.createBuffer();
    var _w = Array(16);
    var md = {
      algorithm: "md5",
      blockLength: 64,
      digestLength: 16,
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
        h0: 1732584193,
        h1: 4023233417,
        h2: 2562383102,
        h3: 271733878,
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
      var bits;
      var carry = 0;
      for (var i = md.fullMessageLength.length - 1; i >= 0; --i) {
        bits = md.fullMessageLength[i] * 8 + carry;
        carry = (bits / 4294967296) >>> 0;
        finalBlock.putInt32Le(bits >>> 0);
      }
      var s2 = {
        h0: _state.h0,
        h1: _state.h1,
        h2: _state.h2,
        h3: _state.h3,
      };
      _update(s2, _w, finalBlock);
      var rval = forge.util.createBuffer();
      rval.putInt32Le(s2.h0);
      rval.putInt32Le(s2.h1);
      rval.putInt32Le(s2.h2);
      rval.putInt32Le(s2.h3);
      return rval;
    };
    return md;
  };
  var _padding = null;
  var _g = null;
  var _r = null;
  var _k = null;
  var _initialized = false;
  function _init() {
    _padding = String.fromCharCode(128);
    _padding += forge.util.fillString(String.fromCharCode(0), 64);
    _g = [
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 1, 6, 11, 0, 5, 10, 15, 4, 9, 14, 3, 8, 13, 2, 7,
      12, 5, 8, 11, 14, 1, 4, 7, 10, 13, 0, 3, 6, 9, 12, 15, 2, 0, 7, 14, 5, 12, 3, 10, 1, 8, 15, 6, 13, 4,
      11, 2, 9,
    ];
    _r = [
      7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5,
      9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6,
      10, 15, 21, 6, 10, 15, 21,
    ];
    _k = Array(64);
    for (var i = 0; i < 64; ++i) _k[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296);
    _initialized = true;
  }
  function _update(s_2, w_2, bytes) {
    var t;
    var a;
    var b_2;
    var c;
    var d;
    var f;
    var r;
    var i;
    var len = bytes.length();
    while (len >= 64) {
      a = s_2.h0;
      b_2 = s_2.h1;
      c = s_2.h2;
      d = s_2.h3;
      for (i = 0; i < 16; ++i) {
        w_2[i] = bytes.getInt32Le();
        f = d ^ (b_2 & (c ^ d));
        t = a + f + _k[i] + w_2[i];
        r = _r[i];
        a = d;
        d = c;
        c = b_2;
        b_2 += (t << r) | (t >>> (32 - r));
      }
      for (; i < 32; ++i) {
        f = c ^ (d & (b_2 ^ c));
        t = a + f + _k[i] + w_2[_g[i]];
        r = _r[i];
        a = d;
        d = c;
        c = b_2;
        b_2 += (t << r) | (t >>> (32 - r));
      }
      for (; i < 48; ++i) {
        f = b_2 ^ c ^ d;
        t = a + f + _k[i] + w_2[_g[i]];
        r = _r[i];
        a = d;
        d = c;
        c = b_2;
        b_2 += (t << r) | (t >>> (32 - r));
      }
      for (; i < 64; ++i) {
        f = c ^ (b_2 | ~d);
        t = a + f + _k[i] + w_2[_g[i]];
        r = _r[i];
        a = d;
        d = c;
        c = b_2;
        b_2 += (t << r) | (t >>> (32 - r));
      }
      s_2.h0 = (s_2.h0 + a) | 0;
      s_2.h1 = (s_2.h1 + b_2) | 0;
      s_2.h2 = (s_2.h2 + c) | 0;
      s_2.h3 = (s_2.h3 + d) | 0;
      len -= 64;
    }
  }
});
export { require_md5 };
