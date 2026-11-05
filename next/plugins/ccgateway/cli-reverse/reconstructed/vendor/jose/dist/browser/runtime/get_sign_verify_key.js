/**
 * jose/dist/browser/runtime/get_sign_verify_key.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-pd6th42n.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { __esm } from "../../../../../runtime/bun-runtime.js";
import { init_content_encryption_2 } from "../../webapi/lib/content_encryption.js";
import { isCryptoKey, cryptoModule } from "../../webapi/lib/buffer_utils.js";
import { checkSigCryptoKey } from "../../node/esm/lib/crypto_key.js";
import { keyMustBeTypeError } from "../../node/esm/lib/invalid_key_input.js";
import { keyObjectTypes } from "./is_key_like.js";

//@ chunk-pd6th42n.js:27831-27852 esm-layout
var init_get_sign_verify_key = __esm(() => {
  init_content_encryption_2();
});
//@ chunk-pd6th42n.js:27852-28098 esm-fingerprint
function getCryptoKey_3(alg, key, usage) {
  if (isCryptoKey(key)) {
    checkSigCryptoKey(key, alg, usage);
    return key;
  }
  if (key instanceof Uint8Array) {
    if (!alg.startsWith("HS")) throw TypeError(keyMustBeTypeError(key, ...keyObjectTypes));
    return cryptoModule.subtle.importKey(
      "raw",
      key,
      {
        hash: `SHA-${alg.slice(-3)}`,
        name: "HMAC",
      },
      false,
      [usage],
    );
  }
  throw TypeError(keyMustBeTypeError(key, ...keyObjectTypes, "Uint8Array"));
}
export { getCryptoKey_3, init_get_sign_verify_key };
