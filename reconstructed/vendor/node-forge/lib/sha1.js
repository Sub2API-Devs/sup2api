/**
 * node-forge/lib/sha1.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: node-forge@1.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_forge } from "./forge.js";
import { require_md } from "./md.js";
import { require_util } from "./util.js";

//@ chunk-fq0cr76a.js:112817-115528 cjs-fingerprint
var require_sha1 = __commonJS(function (cjsExports, cjsModule) {
  var forge = require_forge();
  require_md();
  require_util();
  var sha1 = (cjsModule.exports = forge.sha1 = forge.sha1 || {});
  forge.md.sha1 = forge.md.algorithms.sha1 = sha1;
  sha1.create = function () {
    if (!_initialized) _init();
    var _state = null;
    var _input = forge.util.createBuffer();
    var _w = Array(80);
    var md = {
      algorithm: "sha1",
      blockLength: 64,
      digestLength: 20,
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
        h4: 3285377520,
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
      };
      _update(s2, _w, finalBlock);
      var rval = forge.util.createBuffer();
      rval.putInt32(s2.h0);
      rval.putInt32(s2.h1);
      rval.putInt32(s2.h2);
      rval.putInt32(s2.h3);
      rval.putInt32(s2.h4);
      return rval;
    };
    return md;
  };
  var _padding = null;
  var _initialized = false;
  function _init() {
    _padding = String.fromCharCode(128);
    _padding += forge.util.fillString(String.fromCharCode(0), 64);
    _initialized = true;
  }
  function _update(s_2, w_2, bytes) {
    var t;
    var a;
    var b_2;
    var c;
    var d;
    var e;
    var f;
    var i;
    var len = bytes.length();
    while (len >= 64) {
      a = s_2.h0;
      b_2 = s_2.h1;
      c = s_2.h2;
      d = s_2.h3;
      e = s_2.h4;
      for (i = 0; i < 16; ++i) {
        t = bytes.getInt32();
        w_2[i] = t;
        f = d ^ (b_2 & (c ^ d));
        t = ((a << 5) | (a >>> 27)) + f + e + 1518500249 + t;
        e = d;
        d = c;
        c = ((b_2 << 30) | (b_2 >>> 2)) >>> 0;
        b_2 = a;
        a = t;
      }
      for (; i < 20; ++i) {
        t = w_2[i - 3] ^ w_2[i - 8] ^ w_2[i - 14] ^ w_2[i - 16];
        t = (t << 1) | (t >>> 31);
        w_2[i] = t;
        f = d ^ (b_2 & (c ^ d));
        t = ((a << 5) | (a >>> 27)) + f + e + 1518500249 + t;
        e = d;
        d = c;
        c = ((b_2 << 30) | (b_2 >>> 2)) >>> 0;
        b_2 = a;
        a = t;
      }
      for (; i < 32; ++i) {
        t = w_2[i - 3] ^ w_2[i - 8] ^ w_2[i - 14] ^ w_2[i - 16];
        t = (t << 1) | (t >>> 31);
        w_2[i] = t;
        f = b_2 ^ c ^ d;
        t = ((a << 5) | (a >>> 27)) + f + e + 1859775393 + t;
        e = d;
        d = c;
        c = ((b_2 << 30) | (b_2 >>> 2)) >>> 0;
        b_2 = a;
        a = t;
      }
      for (; i < 40; ++i) {
        t = w_2[i - 6] ^ w_2[i - 16] ^ w_2[i - 28] ^ w_2[i - 32];
        t = (t << 2) | (t >>> 30);
        w_2[i] = t;
        f = b_2 ^ c ^ d;
        t = ((a << 5) | (a >>> 27)) + f + e + 1859775393 + t;
        e = d;
        d = c;
        c = ((b_2 << 30) | (b_2 >>> 2)) >>> 0;
        b_2 = a;
        a = t;
      }
      for (; i < 60; ++i) {
        t = w_2[i - 6] ^ w_2[i - 16] ^ w_2[i - 28] ^ w_2[i - 32];
        t = (t << 2) | (t >>> 30);
        w_2[i] = t;
        f = (b_2 & c) | (d & (b_2 ^ c));
        t = ((a << 5) | (a >>> 27)) + f + e + 2400959708 + t;
        e = d;
        d = c;
        c = ((b_2 << 30) | (b_2 >>> 2)) >>> 0;
        b_2 = a;
        a = t;
      }
      for (; i < 80; ++i) {
        t = w_2[i - 6] ^ w_2[i - 16] ^ w_2[i - 28] ^ w_2[i - 32];
        t = (t << 2) | (t >>> 30);
        w_2[i] = t;
        f = b_2 ^ c ^ d;
        t = ((a << 5) | (a >>> 27)) + f + e + 3395469782 + t;
        e = d;
        d = c;
        c = ((b_2 << 30) | (b_2 >>> 2)) >>> 0;
        b_2 = a;
        a = t;
      }
      s_2.h0 = (s_2.h0 + a) | 0;
      s_2.h1 = (s_2.h1 + b_2) | 0;
      s_2.h2 = (s_2.h2 + c) | 0;
      s_2.h3 = (s_2.h3 + d) | 0;
      s_2.h4 = (s_2.h4 + e) | 0;
      len -= 64;
    }
  }
});
export { require_sha1 };
