/**
 * jose/dist/webapi/lib/buffer_utils.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-0f6azspv.js (6), chunk-pd6th42n.js (4)
 * attribution: esm-layout 6, esm-fingerprint 3
 */
import { __esm } from "../../../../../runtime/bun-runtime.js";

//@ chunk-0f6azspv.js:588-628 esm-layout
var textEncoder = new TextEncoder();
var textDecoder = new TextDecoder();
//@ chunk-0f6azspv.js:628-754 esm-fingerprint
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
//@ chunk-0f6azspv.js:754-904 esm-layout
function writeUInt32BE(buf, value, offset) {
  if (value < 0 || value >= 4294967296)
    throw RangeError(`value must be >= 0 and <= 4294967295. Received ${value}`);
  buf.set([value >>> 24, value >>> 16, value >>> 8, value & 255], offset);
}
//@ chunk-0f6azspv.js:904-1014 esm-layout
function uint64be(value) {
  let high = Math.floor(value / 4294967296);
  let low = value % 4294967296;
  let buf = new Uint8Array(8);
  writeUInt32BE(buf, high, 0);
  writeUInt32BE(buf, low, 4);
  return buf;
}
//@ chunk-0f6azspv.js:1014-1070 esm-layout
function uint32be(value) {
  let buf = new Uint8Array(4);
  writeUInt32BE(buf, value);
  return buf;
}
//@ chunk-0f6azspv.js:1070-1250 esm-fingerprint
function encode(string) {
  let bytes = new Uint8Array(string.length);
  for (let i = 0; i < string.length; i++) {
    let code = string.charCodeAt(i);
    if (code > 127) throw TypeError("non-ASCII string encountered in encode()");
    bytes[i] = code;
  }
  return bytes;
}
//@ chunk-pd6th42n.js:227-263 esm-layout
var cryptoModule;
var isCryptoKey = (key) => key instanceof CryptoKey;
//@ chunk-pd6th42n.js:263-288 esm-layout
var init_buffer_utils = __esm(() => {
  cryptoModule = crypto;
});
//@ chunk-pd6th42n.js:288-389 esm-fingerprint
var sha256Digest = async (alg, data) => {
  let hashName = `SHA-${alg.slice(-3)}`;
  return new Uint8Array(await cryptoModule.subtle.digest(hashName, data));
};
var sha256DigestInit;
//@ chunk-pd6th42n.js:389-416 esm-layout (moved: shares a binding it assigns)
var init_buffer_utils_2 = __esm(() => {
  init_buffer_utils();
  sha256DigestInit = sha256Digest;
});
export {
  textDecoder,
  textEncoder,
  concat,
  uint64be,
  init_buffer_utils,
  cryptoModule,
  uint32be,
  encode,
  init_buffer_utils_2,
  sha256DigestInit,
  isCryptoKey,
};
