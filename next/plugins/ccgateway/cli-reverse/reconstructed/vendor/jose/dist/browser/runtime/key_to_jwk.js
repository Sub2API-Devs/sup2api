/**
 * jose/dist/browser/runtime/key_to_jwk.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-pd6th42n.js (3)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { __esm } from "../../../../../runtime/bun-runtime.js";
import { init_verify_2 } from "../../node/esm/jws/compact/verify.js";
import { init_content_encryption_2, init_content_encryption } from "../../webapi/lib/content_encryption.js";
import { init_base64url, encode } from "./base64url.js";
import { isCryptoKey, cryptoModule, init_buffer_utils } from "../../webapi/lib/buffer_utils.js";
import { keyMustBeTypeError } from "../../node/esm/lib/invalid_key_input.js";
import { keyObjectTypes, noopInit, init_is_key_like } from "./is_key_like.js";

//@ chunk-pd6th42n.js:30895-30925 esm-layout
var init_key_to_jwk = __esm(() => {
  init_verify_2();
  init_content_encryption_2();
  init_base64url();
});
//@ chunk-pd6th42n.js:30925-31220 esm-fingerprint
var keyToJWK = async (key) => {
  if (key instanceof Uint8Array)
    return {
      kty: "oct",
      k: encode(key),
    };
  if (!isCryptoKey(key)) throw TypeError(keyMustBeTypeError(key, ...keyObjectTypes, "Uint8Array"));
  if (!key.extractable) throw TypeError("non-extractable CryptoKey cannot be exported as a JWK");
  let { ext, key_ops, alg, use, ...jwk } = await cryptoModule.subtle.exportKey("jwk", key);
  return jwk;
};
var keyToJWK_default;
//@ chunk-pd6th42n.js:31220-31259 esm-layout (moved: shares a binding it assigns)
var init_encrypt_key_management = __esm(() => {
  init_buffer_utils();
  noopInit();
  init_content_encryption();
  init_is_key_like();
  keyToJWK_default = keyToJWK;
});
export { keyToJWK_default, init_encrypt_key_management, init_key_to_jwk };
