/**
 * @anthropic-ai/sdk/internal/qs/utils.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (4)
 * attribution: esm-fingerprint 3, esm-layout 1
 */
import { RFC1738 } from "./formats.mjs";
import { isArray } from "../utils/values.mjs";

//@ chunk-hwmsct5x.js:19193-19407 esm-fingerprint
var has = (obj, key) => {
  has = Object.hasOwn ?? Function.prototype.call.bind(Object.prototype.hasOwnProperty);
  return has(obj, key);
};
var hex_table = (() => {
  let array = [];
  for (let i = 0; i < 256; ++i) array.push("%" + ((i < 16 ? "0" : "") + i.toString(16)).toUpperCase());
  return array;
})();
//@ chunk-hwmsct5x.js:19407-20285 esm-fingerprint
var limit = 1024;
var encode = (str, _defaultEncoder, charset, _kind, format) => {
  if (str.length === 0) return str;
  let string = str;
  if (typeof str === "symbol") string = Symbol.prototype.toString.call(str);
  else if (typeof str !== "string") string = String(str);
  if (charset === "iso-8859-1")
    return escape(string).replace(/%u[0-9a-f]{4}/gi, function ($0) {
      return "%26%23" + parseInt($0.slice(2), 16) + "%3B";
    });
  let out = "";
  for (let j = 0; j < string.length; j += limit) {
    let segment = string.length >= limit ? string.slice(j, j + limit) : string;
    let arr = [];
    for (let i = 0; i < segment.length; ++i) {
      let c = segment.charCodeAt(i);
      if (
        c === 45 ||
        c === 46 ||
        c === 95 ||
        c === 126 ||
        (c >= 48 && c <= 57) ||
        (c >= 65 && c <= 90) ||
        (c >= 97 && c <= 122) ||
        (format === RFC1738 && (c === 40 || c === 41))
      ) {
        arr[arr.length] = segment.charAt(i);
        continue;
      }
      if (c < 128) {
        arr[arr.length] = hex_table[c];
        continue;
      }
      if (c < 2048) {
        arr[arr.length] = hex_table[192 | (c >> 6)] + hex_table[128 | (c & 63)];
        continue;
      }
      if (c < 55296 || c >= 57344) {
        arr[arr.length] =
          hex_table[224 | (c >> 12)] + hex_table[128 | ((c >> 6) & 63)] + hex_table[128 | (c & 63)];
        continue;
      }
      i += 1;
      c = 65536 + (((c & 1023) << 10) | (segment.charCodeAt(i) & 1023));
      arr[arr.length] =
        hex_table[240 | (c >> 18)] +
        hex_table[128 | ((c >> 12) & 63)] +
        hex_table[128 | ((c >> 6) & 63)] +
        hex_table[128 | (c & 63)];
    }
    out += arr.join("");
  }
  return out;
};
//@ chunk-hwmsct5x.js:20285-20411 esm-fingerprint
function isBufferLike(obj) {
  if (!obj || typeof obj !== "object") return false;
  return !!(obj.constructor && obj.constructor.isBuffer && obj.constructor.isBuffer(obj));
}
//@ chunk-hwmsct5x.js:20411-20512 esm-layout
function maybe_map(val, fn) {
  if (isArray(val)) {
    let mapped = [];
    for (let i = 0; i < val.length; i += 1) mapped.push(fn(val[i]));
    return mapped;
  }
  return fn(val);
}
export { encode, maybe_map, isBufferLike, has };
