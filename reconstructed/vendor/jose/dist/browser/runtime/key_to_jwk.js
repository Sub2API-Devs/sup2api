/**
 * jose/dist/browser/runtime/key_to_jwk.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { Xa } from "../../../../../runtime/bun-runtime.js";
import { $t } from "../../node/esm/jws/compact/verify.js";
import { E } from "../../webapi/lib/content_encryption.js";
import { v, w } from "./base64url.js";
import { g, p } from "../../webapi/lib/buffer_utils.js";
import { A } from "../../node/esm/lib/invalid_key_input.js";
import { m } from "./is_key_like.js";

//@ chunk-2tyrgda4.js:30895-30925 esm-layout
var Gt = Xa(() => {
  $t();
  E();
  v();
});
//@ chunk-2tyrgda4.js:30925-31220 esm-fingerprint
var Lr = async (e) => {
    if (e instanceof Uint8Array) return { kty: "oct", k: w(e) };
    if (!g(e)) throw TypeError(A(e, ...m, "Uint8Array"));
    if (!e.extractable) throw TypeError("non-extractable CryptoKey cannot be exported as a JWK");
    let { ext: ext, key_ops: key_ops, alg: alg, use: use, ...a } = await p.subtle.exportKey("jwk", e);
    return a;
  },
  Ft;

export { Ft, Lr, Gt };
