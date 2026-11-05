/**
 * jose/dist/webapi/lib/base64.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-0f6azspv.js (2)
 * attribution: esm-fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-0f6azspv.js:1250-1445 esm-fingerprint
function encodeBase64(input) {
  if (Uint8Array.prototype.toBase64) return input.toBase64();
  let CHUNK_SIZE = 32768;
  let arr = [];
  for (let i = 0; i < input.length; i += CHUNK_SIZE)
    arr.push(String.fromCharCode.apply(null, input.subarray(i, i + CHUNK_SIZE)));
  return btoa(arr.join(""));
}
//@ chunk-0f6azspv.js:1445-1615 esm-fingerprint
function decodeBase64(encoded) {
  if (Uint8Array.fromBase64) return Uint8Array.fromBase64(encoded);
  let binary = atob(encoded);
  let bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
export { decodeBase64, encodeBase64 };
