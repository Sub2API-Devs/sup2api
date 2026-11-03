/**
 * jose/dist/webapi/lib/buffer_utils.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (3), chunk-5h78gfwc.js (6)
 * attribution: esm-layout 6, esm-fingerprint 3
 */
import { Xa } from "../../../../../runtime/bun-runtime.js";

//@ chunk-5h78gfwc.js:588-628 esm-layout
var textEncoder = new TextEncoder(),
  textDecoder = new TextDecoder();
//@ chunk-5h78gfwc.js:628-754 esm-fingerprint
function E_2(...e) {
  let reduced = e.reduce((i, { length: o }) => i + o, 0),
    uint8Array = new Uint8Array(reduced),
    n = 0;
  for (let i of e) (uint8Array.set(i, n), (n += i.length));
  return uint8Array;
}
//@ chunk-5h78gfwc.js:754-904 esm-layout
function Ke(e, t, r) {
  if (t < 0 || t >= 4294967296) throw RangeError(`value must be >= 0 and <= 4294967295. Received ${t}`);
  e.set([t >>> 24, t >>> 16, t >>> 8, t & 255], r);
}
//@ chunk-5h78gfwc.js:904-1014 esm-layout
function xe(e) {
  let floored = Math.floor(e / 4294967296),
    r = e % 4294967296,
    uint8Array = new Uint8Array(8);
  return (Ke(uint8Array, floored, 0), Ke(uint8Array, r, 4), uint8Array);
}
//@ chunk-5h78gfwc.js:1014-1070 esm-layout
function fe(e) {
  let uint8Array = new Uint8Array(4);
  return (Ke(uint8Array, e), uint8Array);
}
//@ chunk-5h78gfwc.js:1070-1250 esm-fingerprint
function A(e) {
  let uint8Array = new Uint8Array(e.length);
  for (let r = 0; r < e.length; r++) {
    let code = e.charCodeAt(r);
    if (code > 127) throw TypeError("non-ASCII string encountered in encode()");
    uint8Array[r] = code;
  }
  return uint8Array;
}
//@ chunk-2tyrgda4.js:227-263 esm-layout
var p,
  g = (e) => e instanceof CryptoKey;
//@ chunk-2tyrgda4.js:263-288 esm-layout
var W = Xa(() => {
  p = crypto;
});
//@ chunk-2tyrgda4.js:288-389 esm-fingerprint
var mr = async (e, t) => {
    let r = `SHA-${e.slice(-3)}`;
    return new Uint8Array(await p.subtle.digest(r, t));
  },
  ue;

export { W, ue, mr, E_2, xe, p, g, textDecoder, textEncoder, fe, A };
