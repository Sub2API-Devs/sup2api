/**
 * jose/dist/webapi/lib/helpers.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-0f6azspv.js (4)
 * attribution: esm-layout 1, esm-fingerprint 3
 */
import { decode } from "../util/base64url.js";

//@ chunk-0f6azspv.js:11118-11134 esm-layout
var unusedSymbol = Symbol();
//@ chunk-0f6azspv.js:11134-11203 esm-fingerprint
function assertNotSet(value, name) {
  if (value) throw TypeError(`${name} can only be called once`);
}
//@ chunk-0f6azspv.js:11203-11295 esm-fingerprint
function decodeBase64url(value, label, ErrorClass) {
  try {
    return decode(value);
  } catch {
    throw new ErrorClass(`Failed to base64url decode the ${label}`);
  }
}
//@ chunk-0f6azspv.js:11295-11400 esm-fingerprint
async function digest(algorithm, data) {
  let subtleDigest = `SHA-${algorithm.slice(-3)}`;
  return new Uint8Array(await crypto.subtle.digest(subtleDigest, data));
}
export { decodeBase64url, digest, assertNotSet, unusedSymbol };
