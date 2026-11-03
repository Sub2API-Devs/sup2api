/**
 * jose/dist/browser/runtime/aeskw.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (3)
 * attribution: esm-fingerprint 3
 */
import { g, p } from "../../webapi/lib/buffer_utils.js";
import { J } from "../../node/esm/lib/crypto_key.js";
import { A } from "../../node/esm/lib/invalid_key_input.js";
import { m } from "./is_key_like.js";
import { ee } from "../../webapi/lib/content_encryption.js";

//@ chunk-2tyrgda4.js:9952-10069 esm-fingerprint
function At(e, t) {
  if (e.algorithm.length !== parseInt(t.slice(1, 4), 10)) throw TypeError(`Invalid key size for alg: ${t}`);
}
//@ chunk-2tyrgda4.js:10069-10232 esm-fingerprint
function gt(e, t, r) {
  if (g(e)) return (J(e, t, r), e);
  if (e instanceof Uint8Array) return p.subtle.importKey("raw", e, "AES-KW", !0, [r]);
  throw TypeError(A(e, ...m, "Uint8Array"));
}
//@ chunk-2tyrgda4.js:10232-10578 esm-fingerprint
var ne = async (e, t, r) => {
    let o = await gt(t, e, "wrapKey");
    At(o, e);
    let importKey = await p.subtle.importKey("raw", r, ...ee);
    return new Uint8Array(await p.subtle.wrapKey("raw", importKey, o, "AES-KW"));
  },
  ae = async (e, t, r) => {
    let o = await gt(t, e, "unwrapKey");
    At(o, e);
    let unwrapKey = await p.subtle.unwrapKey("raw", r, o, "AES-KW", ...ee);
    return new Uint8Array(await p.subtle.exportKey("raw", unwrapKey));
  };

export { ne, ae };
