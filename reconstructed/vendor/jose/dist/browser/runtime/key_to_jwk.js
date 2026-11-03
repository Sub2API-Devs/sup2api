/**
 * jose/dist/browser/runtime/key_to_jwk.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { Xa } from "../../../../../runtime/bun-runtime.js";
import { init_verify_2 } from "../../node/esm/jws/compact/verify.js";
import { init_content_encryption_2 } from "../../webapi/lib/content_encryption.js";
import { init_base64url, encode } from "./base64url.js";
import { g, p } from "../../webapi/lib/buffer_utils.js";
import { A } from "../../node/esm/lib/invalid_key_input.js";
import { m } from "./is_key_like.js";

//@ chunk-2tyrgda4.js:30895-30925 esm-layout
var init_key_to_jwk = Xa(() => {
  init_verify_2();
  init_content_encryption_2();
  init_base64url();
});
//@ chunk-2tyrgda4.js:30925-31220 esm-fingerprint
var keyToJWK = async (key) => {
  if (key instanceof Uint8Array)
    return {
      kty: "oct",
      k: encode(key),
    };
  if (!g(key)) throw TypeError(A(key, ...m, "Uint8Array"));
  if (!key.extractable) throw TypeError("non-extractable CryptoKey cannot be exported as a JWK");
  let { ext, key_ops, alg, use, ...jwk } = await p.subtle.exportKey("jwk", key);
  return jwk;
};
var keyToJWK_default;
export { keyToJWK_default, keyToJWK, init_key_to_jwk };
