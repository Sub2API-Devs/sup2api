/**
 * protobufjs/src/util/base64.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-vxhm2nqe.js (1)
 * attribution: cjs-require-graph 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-vxhm2nqe.js:6693-7914 cjs-require-graph
var require_base64 = __commonJS(function (cjsExports) {
  var base64 = cjsExports;
  base64.length = function (string) {
    var p = string.length;
    if (!p) return 0;
    var n = 0;
    while (--p % 4 > 1 && string.charAt(p) === "=") ++n;
    return Math.ceil(string.length * 3) / 4 - n;
  };
  var b64 = Array(64);
  var s64 = Array(123);
  for (i = 0; i < 64;)
    s64[(b64[i] = i < 26 ? i + 65 : i < 52 ? i + 71 : i < 62 ? i - 4 : (i - 59) | 43)] = i++;
  var i;
  base64.encode = function (buffer, start, end) {
    var parts = null;
    var chunk = [];
    var i = 0;
    var j = 0;
    var t;
    while (start < end) {
      var b = buffer[start++];
      switch (j) {
        case 0:
          chunk[i++] = b64[b >> 2];
          t = (b & 3) << 4;
          j = 1;
          break;
        case 1:
          chunk[i++] = b64[t | (b >> 4)];
          t = (b & 15) << 2;
          j = 2;
          break;
        case 2:
          chunk[i++] = b64[t | (b >> 6)];
          chunk[i++] = b64[b & 63];
          j = 0;
          break;
      }
      if (i > 8191) {
        (parts || (parts = [])).push(String.fromCharCode.apply(String, chunk));
        i = 0;
      }
    }
    if (j) {
      chunk[i++] = b64[t];
      chunk[i++] = 61;
      if (j === 1) chunk[i++] = 61;
    }
    if (parts) {
      if (i) parts.push(String.fromCharCode.apply(String, chunk.slice(0, i)));
      return parts.join("");
    }
    return String.fromCharCode.apply(String, chunk.slice(0, i));
  };
  var invalidEncoding = "invalid encoding";
  base64.decode = function (string, buffer, offset) {
    var start = offset;
    var j = 0;
    var t_2;
    for (var i = 0; i < string.length;) {
      var c = string.charCodeAt(i++);
      if (c === 61 && j > 1) break;
      if ((c = s64[c]) === undefined) throw Error(invalidEncoding);
      switch (j) {
        case 0:
          t_2 = c;
          j = 1;
          break;
        case 1:
          buffer[offset++] = (t_2 << 2) | ((c & 48) >> 4);
          t_2 = c;
          j = 2;
          break;
        case 2:
          buffer[offset++] = ((t_2 & 15) << 4) | ((c & 60) >> 2);
          t_2 = c;
          j = 3;
          break;
        case 3:
          buffer[offset++] = ((t_2 & 3) << 6) | c;
          j = 0;
          break;
      }
    }
    if (j === 1) throw Error(invalidEncoding);
    return offset - start;
  };
  base64.test = function (string) {
    return /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(string);
  };
});
export { require_base64 };
