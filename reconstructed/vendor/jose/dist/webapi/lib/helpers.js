/**
 * jose/dist/webapi/lib/helpers.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-5h78gfwc.js (4)
 * attribution: esm-layout 1, esm-fingerprint 3
 */
import { decode_2 } from "../util/base64url.js";

//@ chunk-5h78gfwc.js:11118-11134 esm-layout
var Ze = Symbol();
//@ chunk-5h78gfwc.js:11134-11203 esm-fingerprint
function assertNotSet(value, name) {
  if (value) throw TypeError(`${name} can only be called once`);
}
//@ chunk-5h78gfwc.js:11203-11295 esm-fingerprint
function decodeBase64url(value, label, ErrorClass) {
  try {
    return decode_2(value);
  } catch {
    throw new ErrorClass(`Failed to base64url decode the ${label}`);
  }
}
//@ chunk-5h78gfwc.js:11295-11400 esm-fingerprint
async function digest(algorithm, data) {
  let subtleDigest = `SHA-${algorithm.slice(-3)}`;
  return new Uint8Array(await crypto.subtle.digest(subtleDigest, data));
}
export { decodeBase64url, digest, assertNotSet, Ze };
