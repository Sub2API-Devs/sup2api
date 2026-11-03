/**
 * jose/dist/browser/runtime/ecdhes.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (4)
 * attribution: esm-layout 1, esm-fingerprint 3
 */
import { Xa } from "../../../../../runtime/bun-runtime.js";
import { Fe } from "../../webapi/lib/content_encryption.js";
import { W, g, p } from "../../webapi/lib/buffer_utils.js";
import { L, A } from "../../node/esm/lib/invalid_key_input.js";
import { O, M, m } from "./is_key_like.js";
import { J } from "../../node/esm/lib/crypto_key.js";
import { _, we, ye, mt } from "../../node/esm/lib/buffer_utils.js";
import { l } from "./base64url.js";

//@ chunk-2tyrgda4.js:10578-10616 esm-layout
var Ce = Xa(() => {
  Fe();
  W();
  L();
  O();
  M();
});
//@ chunk-2tyrgda4.js:10616-11087 esm-fingerprint
async function _e(e, t, r, o, n = new Uint8Array(0), a = new Uint8Array(0)) {
  if (!g(e)) throw TypeError(A(e, ...m));
  if ((J(e, "ECDH"), !g(t))) throw TypeError(A(t, ...m));
  J(t, "ECDH", "deriveBits");
  let i = _(we(l.encode(r)), we(n), we(a), ye(o)),
    c;
  if (e.algorithm.name === "X25519") c = 256;
  else if (e.algorithm.name === "X448") c = 448;
  else c = Math.ceil(parseInt(e.algorithm.namedCurve.substr(-3), 10) / 8) << 3;
  let uint8Array = new Uint8Array(await p.subtle.deriveBits({ name: e.algorithm.name, public: e }, t, c));
  return mt(uint8Array, o, i);
}
//@ chunk-2tyrgda4.js:11087-11203 esm-fingerprint
async function bt(e) {
  if (!g(e)) throw TypeError(A(e, ...m));
  return p.subtle.generateKey(e.algorithm, !0, ["deriveBits"]);
}
//@ chunk-2tyrgda4.js:11203-11375 esm-fingerprint
function xe(e) {
  if (!g(e)) throw TypeError(A(e, ...m));
  return (
    ["P-256", "P-384", "P-521"].includes(e.algorithm.namedCurve) ||
    e.algorithm.name === "X25519" ||
    e.algorithm.name === "X448"
  );
}

export { Ce, xe, _e, bt };
