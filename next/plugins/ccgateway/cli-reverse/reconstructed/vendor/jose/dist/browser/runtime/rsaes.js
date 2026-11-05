/**
 * jose/dist/browser/runtime/rsaes.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-pd6th42n.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { isCryptoKey, cryptoModule } from "../../webapi/lib/buffer_utils.js";
import { keyMustBeTypeError } from "../../node/esm/lib/invalid_key_input.js";
import { keyObjectTypes } from "./is_key_like.js";
import { checkEncCryptoKey } from "../../node/esm/lib/crypto_key.js";
import { checkKeyLength_2 } from "../../webapi/lib/signing.js";
import { jweAlgorithmFor } from "../../webapi/lib/key_management.js";
import { hmacSubmitAlgorithm } from "../../webapi/lib/content_encryption.js";

//@ chunk-pd6th42n.js:12890-12904 esm-layout
var checkIvLengthFn = () => {};
//@ chunk-pd6th42n.js:12904-13748 esm-fingerprint
var encrypt_2 = async (alg, key, cek) => {
  if (!isCryptoKey(key)) throw TypeError(keyMustBeTypeError(key, ...keyObjectTypes));
  checkEncCryptoKey(key, alg, "encrypt", "wrapKey");
  checkKeyLength_2(alg, key);
  if (key.usages.includes("encrypt"))
    return new Uint8Array(await cryptoModule.subtle.encrypt(jweAlgorithmFor(alg), key, cek));
  if (key.usages.includes("wrapKey")) {
    let cryptoKeyCek = await cryptoModule.subtle.importKey("raw", cek, ...hmacSubmitAlgorithm);
    return new Uint8Array(await cryptoModule.subtle.wrapKey("raw", cryptoKeyCek, key, jweAlgorithmFor(alg)));
  }
  throw TypeError('RSA-OAEP key "usages" must include "encrypt" or "wrapKey" for this operation');
};
var decrypt_2 = async (alg, key, encryptedKey) => {
  if (!isCryptoKey(key)) throw TypeError(keyMustBeTypeError(key, ...keyObjectTypes));
  checkEncCryptoKey(key, alg, "decrypt", "unwrapKey");
  checkKeyLength_2(alg, key);
  if (key.usages.includes("decrypt"))
    return new Uint8Array(await cryptoModule.subtle.decrypt(jweAlgorithmFor(alg), key, encryptedKey));
  if (key.usages.includes("unwrapKey")) {
    let cryptoKeyCek = await cryptoModule.subtle.unwrapKey(
      "raw",
      encryptedKey,
      key,
      jweAlgorithmFor(alg),
      ...hmacSubmitAlgorithm,
    );
    return new Uint8Array(await cryptoModule.subtle.exportKey("raw", cryptoKeyCek));
  }
  throw TypeError('RSA-OAEP key "usages" must include "decrypt" or "unwrapKey" for this operation');
};
export { checkIvLengthFn, decrypt_2, encrypt_2 };
