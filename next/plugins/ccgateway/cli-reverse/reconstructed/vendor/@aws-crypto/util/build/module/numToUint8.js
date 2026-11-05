/**
 * @aws-crypto/util/build/module/numToUint8.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @aws-crypto/util@3.0.0..4.0.0
 * pieces: chunk-jcm8ph2a.js (3)
 * attribution: esm-layout 2, esm-fingerprint 1
 */

//@ chunk-jcm8ph2a.js:588-671 esm-layout
function isEmptyString(toHash) {
  if (typeof toHash === "string") return toHash.length === 0;
  return toHash.byteLength === 0;
}
//@ chunk-jcm8ph2a.js:671-767 esm-fingerprint
function numToUint8(num) {
  return new Uint8Array([(num & 4278190080) >> 24, (num & 16711680) >> 16, (num & 65280) >> 8, num & 255]);
}
//@ chunk-jcm8ph2a.js:767-909 esm-layout
function fromArrayBuffer(arrayBuffer) {
  if (!Uint32Array.from) {
    var uint32Array = new Uint32Array(arrayBuffer.length);
    var bytes = 0;
    while (bytes < arrayBuffer.length) {
      uint32Array[bytes] = arrayBuffer[bytes];
      bytes += 1;
    }
    return uint32Array;
  }
  return Uint32Array.from(arrayBuffer);
}
export { isEmptyString, numToUint8, fromArrayBuffer };
