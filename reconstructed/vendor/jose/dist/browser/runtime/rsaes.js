/**
 * jose/dist/browser/runtime/rsaes.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { g, p } from "../../webapi/lib/buffer_utils.js";
import { A } from "../../node/esm/lib/invalid_key_input.js";
import { m } from "./is_key_like.js";
import { checkEncCryptoKey } from "../../node/esm/lib/crypto_key.js";
import { checkKeyLength_2 } from "../../webapi/lib/signing.js";
import { te } from "../../webapi/lib/key_management.js";
import { ee } from "../../webapi/lib/content_encryption.js";

//@ chunk-2tyrgda4.js:12890-12904 esm-layout
var He = () => {};
//@ chunk-2tyrgda4.js:12904-13748 esm-fingerprint
var encrypt_2 = async (alg, key, cek) => {
  if (!g(key)) throw TypeError(A(key, ...m));
  checkEncCryptoKey(key, alg, "encrypt", "wrapKey");
  checkKeyLength_2(alg, key);
  if (key.usages.includes("encrypt")) return new Uint8Array(await p.subtle.encrypt(te(alg), key, cek));
  if (key.usages.includes("wrapKey")) {
    let cryptoKeyCek = await p.subtle.importKey("raw", cek, ...ee);
    return new Uint8Array(await p.subtle.wrapKey("raw", cryptoKeyCek, key, te(alg)));
  }
  throw TypeError('RSA-OAEP key "usages" must include "encrypt" or "wrapKey" for this operation');
};
var decrypt_2 = async (alg, key, encryptedKey) => {
  if (!g(key)) throw TypeError(A(key, ...m));
  checkEncCryptoKey(key, alg, "decrypt", "unwrapKey");
  checkKeyLength_2(alg, key);
  if (key.usages.includes("decrypt"))
    return new Uint8Array(await p.subtle.decrypt(te(alg), key, encryptedKey));
  if (key.usages.includes("unwrapKey")) {
    let cryptoKeyCek = await p.subtle.unwrapKey("raw", encryptedKey, key, te(alg), ...ee);
    return new Uint8Array(await p.subtle.exportKey("raw", cryptoKeyCek));
  }
  throw TypeError('RSA-OAEP key "usages" must include "decrypt" or "unwrapKey" for this operation');
};
export { He, decrypt_2, encrypt_2 };
