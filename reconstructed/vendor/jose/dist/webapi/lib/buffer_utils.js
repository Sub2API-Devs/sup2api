/**
 * jose/dist/webapi/lib/buffer_utils.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (3), chunk-5h78gfwc.js (6)
 * attribution: esm-layout 6, esm-fingerprint 3
 */
import { Xa } from "../../../../../runtime/bun-runtime.js";

//@ chunk-5h78gfwc.js:588-628 esm-layout
var textEncoder = new TextEncoder();
var textDecoder = new TextDecoder();
//@ chunk-5h78gfwc.js:628-754 esm-fingerprint
function concat(...buffers) {
  let size = buffers.reduce((acc, { length }) => acc + length, 0);
  let buf = new Uint8Array(size);
  let i_2 = 0;
  for (let buffer of buffers) {
    buf.set(buffer, i_2);
    i_2 += buffer.length;
  }
  return buf;
}
//@ chunk-5h78gfwc.js:754-904 esm-layout
function writeUInt32BE(buf, value, offset) {
  if (value < 0 || value >= 4294967296)
    throw RangeError(`value must be >= 0 and <= 4294967295. Received ${value}`);
  buf.set([value >>> 24, value >>> 16, value >>> 8, value & 255], offset);
}
//@ chunk-5h78gfwc.js:904-1014 esm-layout
function xe(value) {
  let high = Math.floor(value / 4294967296);
  let low = value % 4294967296;
  let buf = new Uint8Array(8);
  writeUInt32BE(buf, high, 0);
  writeUInt32BE(buf, low, 4);
  return buf;
}
//@ chunk-5h78gfwc.js:1014-1070 esm-layout
function fe(value) {
  let buf = new Uint8Array(4);
  writeUInt32BE(buf, value);
  return buf;
}
//@ chunk-5h78gfwc.js:1070-1250 esm-fingerprint
function encode(string) {
  let bytes = new Uint8Array(string.length);
  for (let i = 0; i < string.length; i++) {
    let code = string.charCodeAt(i);
    if (code > 127) throw TypeError("non-ASCII string encountered in encode()");
    bytes[i] = code;
  }
  return bytes;
}
//@ chunk-2tyrgda4.js:227-263 esm-layout
var p;
var g = (key) => key instanceof CryptoKey;
//@ chunk-2tyrgda4.js:263-288 esm-layout
var init_buffer_utils = Xa(() => {
  p = crypto;
});
//@ chunk-2tyrgda4.js:288-389 esm-fingerprint
var mr = async (e, t) => {
  let r = `SHA-${e.slice(-3)}`;
  return new Uint8Array(await p.subtle.digest(r, t));
};
var ue;
export { init_buffer_utils, ue, mr, concat, xe, p, g, textDecoder, textEncoder, fe, encode };
