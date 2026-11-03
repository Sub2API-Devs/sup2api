/**
 * mermaid/dist/chunks/mermaid.esm/mindmap-definition-HWZWQOMJ.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: mermaid@11.12.3
 * pieces: chunk-mrx6y2r5.js (7)
 * attribution: esm-fingerprint 3, esm-layout 4
 */
import { randomUUID, randomFillSync } from "crypto";

//@ chunk-mrx6y2r5.js:224842-224865 esm-fingerprint
var native_default = {
  randomUUID,
};
//@ chunk-mrx6y2r5.js:224906-224946 esm-layout
var uint8Array = new Uint8Array(256);
var is = uint8Array.length;
//@ chunk-mrx6y2r5.js:224946-225018 esm-layout
function rng() {
  if (is > uint8Array.length - 16) {
    randomFillSync(uint8Array);
    is = 0;
  }
  return uint8Array.slice(is, (is += 16));
}
//@ chunk-mrx6y2r5.js:225018-225028 esm-layout
var byteToHex = [];
//@ chunk-mrx6y2r5.js:225028-225089 esm-fingerprint
for (let i = 0; i < 256; ++i) byteToHex.push((i + 256).toString(16).slice(1));
//@ chunk-mrx6y2r5.js:225089-225328 esm-layout
function unsafeStringify(arr, offset = 0) {
  return (
    byteToHex[arr[offset + 0]] +
    byteToHex[arr[offset + 1]] +
    byteToHex[arr[offset + 2]] +
    byteToHex[arr[offset + 3]] +
    "-" +
    byteToHex[arr[offset + 4]] +
    byteToHex[arr[offset + 5]] +
    "-" +
    byteToHex[arr[offset + 6]] +
    byteToHex[arr[offset + 7]] +
    "-" +
    byteToHex[arr[offset + 8]] +
    byteToHex[arr[offset + 9]] +
    "-" +
    byteToHex[arr[offset + 10]] +
    byteToHex[arr[offset + 11]] +
    byteToHex[arr[offset + 12]] +
    byteToHex[arr[offset + 13]] +
    byteToHex[arr[offset + 14]] +
    byteToHex[arr[offset + 15]]
  ).toLowerCase();
}
//@ chunk-mrx6y2r5.js:225328-225695 esm-fingerprint
function dy(options, buf, offset) {
  if (native_default.randomUUID && !buf && !options) return native_default.randomUUID();
  options = options || {};
  let rnds = options.random ?? options.rng?.() ?? rng();
  if (rnds.length < 16) throw Error("Random bytes length must be >= 16");
  rnds[6] = (rnds[6] & 15) | 64;
  rnds[8] = (rnds[8] & 63) | 128;
  if (buf) {
    offset = offset || 0;
    if (offset < 0 || offset + 16 > buf.length)
      throw RangeError(`UUID byte range ${offset}:${offset + 15} is out of buffer bounds`);
    for (let i = 0; i < 16; ++i) buf[offset + i] = rnds[i];
    return buf;
  }
  return unsafeStringify(rnds);
}
export { dy };
