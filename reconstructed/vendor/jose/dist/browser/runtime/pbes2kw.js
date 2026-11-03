/**
 * jose/dist/browser/runtime/pbes2kw.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (4)
 * attribution: esm-layout 1, esm-fingerprint 3
 */
import { Xa } from "../../../../../runtime/bun-runtime.js";
import { E, k } from "../../webapi/lib/content_encryption.js";
import { p, g } from "../../webapi/lib/buffer_utils.js";
import { J } from "../../node/esm/lib/crypto_key.js";
import { A } from "../../node/esm/lib/invalid_key_input.js";
import { m } from "./is_key_like.js";
import { ze } from "../../node/esm/lib/check_p2s.js";
import { ft } from "../../node/esm/lib/buffer_utils.js";
import { ne, ae } from "./aeskw.js";
import { w } from "./base64url.js";

//@ chunk-2tyrgda4.js:11526-11547 esm-layout
var Ct_2 = Xa(() => {
  E();
});
//@ chunk-2tyrgda4.js:11547-11742 esm-fingerprint
function xr(e, t) {
  if (e instanceof Uint8Array) return p.subtle.importKey("raw", e, "PBKDF2", !1, ["deriveBits"]);
  if (g(e)) return (J(e, t, "deriveBits", "deriveKey"), e);
  throw TypeError(A(e, ...m, "Uint8Array"));
}
//@ chunk-2tyrgda4.js:11742-12193 esm-fingerprint
async function _t(e, t, r, o) {
  ze(e);
  let n = ft(t, e),
    a = parseInt(t.slice(13, 16), 10),
    i = { hash: `SHA-${t.slice(8, 11)}`, iterations: r, name: "PBKDF2", salt: n },
    c = { length: a, name: "AES-KW" },
    d = await xr(o, t);
  if (d.usages.includes("deriveBits")) return new Uint8Array(await p.subtle.deriveBits(i, d, a));
  if (d.usages.includes("deriveKey")) return p.subtle.deriveKey(i, d, c, !1, ["wrapKey", "unwrapKey"]);
  throw TypeError('PBKDF2 key "usages" must include "deriveBits" or "deriveKey"');
}
//@ chunk-2tyrgda4.js:12193-12407 esm-fingerprint
var xt = async (e, t, r, o = 2048, n = k(new Uint8Array(16))) => {
    let a = await _t(n, e, o, t);
    return { encryptedKey: await ne(e.slice(-6), a, r), p2c: o, p2s: w(n) };
  },
  Ht = async (e, t, r, o, n) => {
    let a = await _t(n, e, o, t);
    return ae(e.slice(-6), a, r);
  };

export { Ct_2, Ht, xt };
