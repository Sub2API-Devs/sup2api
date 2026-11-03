/**
 * protobufjs/src/util/utf8.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-798ashq9.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-798ashq9.js:24520-25666 cjs-fingerprint
var require_utf8 = x(function (cjsExports) {
  var utf8 = cjsExports;
  var replacementChar = "\uFFFD";
  utf8.length = function (string) {
    var len = 0;
    var c = 0;
    for (var i = 0; i < string.length; ++i) {
      c = string.charCodeAt(i);
      if (c < 128) len += 1;
      else if (c < 2048) len += 2;
      else if ((c & 64512) === 55296 && (string.charCodeAt(i + 1) & 64512) === 56320) {
        ++i;
        len += 4;
      } else len += 3;
    }
    return len;
  };
  utf8.read = function (buffer, start, end) {
    if (end - start < 1) return "";
    var str = "";
    for (var i = start; i < end;) {
      var t_2 = buffer[i++];
      if (t_2 <= 127) str += String.fromCharCode(t_2);
      else if (t_2 >= 192 && t_2 < 224) {
        var c2 = ((t_2 & 31) << 6) | (buffer[i++] & 63);
        str += c2 >= 128 ? String.fromCharCode(c2) : replacementChar;
      } else if (t_2 >= 224 && t_2 < 240) {
        var c3 = ((t_2 & 15) << 12) | ((buffer[i++] & 63) << 6) | (buffer[i++] & 63);
        str += c3 >= 2048 ? String.fromCharCode(c3) : replacementChar;
      } else if (t_2 >= 240) {
        var t2 =
          ((t_2 & 7) << 18) | ((buffer[i++] & 63) << 12) | ((buffer[i++] & 63) << 6) | (buffer[i++] & 63);
        if (t2 < 65536 || t2 > 1114111) str += replacementChar;
        else {
          t2 -= 65536;
          str += String.fromCharCode(55296 + (t2 >> 10));
          str += String.fromCharCode(56320 + (t2 & 1023));
        }
      }
    }
    return str;
  };
  utf8.write = function (string, buffer, offset) {
    var start = offset;
    var c1;
    var c2;
    for (var i = 0; i < string.length; ++i) {
      c1 = string.charCodeAt(i);
      if (c1 < 128) buffer[offset++] = c1;
      else if (c1 < 2048) {
        buffer[offset++] = (c1 >> 6) | 192;
        buffer[offset++] = (c1 & 63) | 128;
      } else if ((c1 & 64512) === 55296 && ((c2 = string.charCodeAt(i + 1)) & 64512) === 56320) {
        c1 = 65536 + ((c1 & 1023) << 10) + (c2 & 1023);
        ++i;
        buffer[offset++] = (c1 >> 18) | 240;
        buffer[offset++] = ((c1 >> 12) & 63) | 128;
        buffer[offset++] = ((c1 >> 6) & 63) | 128;
        buffer[offset++] = (c1 & 63) | 128;
      } else {
        buffer[offset++] = (c1 >> 12) | 224;
        buffer[offset++] = ((c1 >> 6) & 63) | 128;
        buffer[offset++] = (c1 & 63) | 128;
      }
    }
    return offset - start;
  };
});
export { require_utf8 };
