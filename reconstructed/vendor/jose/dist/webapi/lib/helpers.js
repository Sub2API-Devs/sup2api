/**
 * jose/dist/webapi/lib/helpers.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-5h78gfwc.js (4)
 * attribution: esm-layout 1, esm-fingerprint 3
 */
import { v_2 } from "../util/base64url.js";

//@ chunk-5h78gfwc.js:11118-11134 esm-layout
var Ze = Symbol();
//@ chunk-5h78gfwc.js:11134-11203 esm-fingerprint
function W(e, t) {
  if (e) throw TypeError(`${t} can only be called once`);
}
//@ chunk-5h78gfwc.js:11203-11295 esm-fingerprint
function I(e, t, r) {
  try {
    return v_2(e);
  } catch {
    throw new r(`Failed to base64url decode the ${t}`);
  }
}
//@ chunk-5h78gfwc.js:11295-11400 esm-fingerprint
async function je(e, t) {
  let r = `SHA-${e.slice(-3)}`;
  return new Uint8Array(await crypto.subtle.digest(r, t));
}

export { I, je, W, Ze };
