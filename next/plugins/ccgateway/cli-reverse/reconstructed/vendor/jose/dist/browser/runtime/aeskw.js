/**
 * jose/dist/browser/runtime/aeskw.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-pd6th42n.js (3)
 * attribution: esm-fingerprint 3
 */
import { isCryptoKey, cryptoModule } from "../../webapi/lib/buffer_utils.js";
import { checkEncCryptoKey } from "../../node/esm/lib/crypto_key.js";
import { keyMustBeTypeError } from "../../node/esm/lib/invalid_key_input.js";
import { keyObjectTypes } from "./is_key_like.js";
import { hmacSubmitAlgorithm } from "../../webapi/lib/content_encryption.js";

//@ chunk-pd6th42n.js:9952-10069 esm-fingerprint
function checkKeySize(key, alg) {
  if (key.algorithm.length !== parseInt(alg.slice(1, 4), 10))
    throw TypeError(`Invalid key size for alg: ${alg}`);
}
//@ chunk-pd6th42n.js:10069-10232 esm-fingerprint
function getCryptoKey(key, alg, usage) {
  if (isCryptoKey(key)) {
    checkEncCryptoKey(key, alg, usage);
    return key;
  }
  if (key instanceof Uint8Array) return cryptoModule.subtle.importKey("raw", key, "AES-KW", true, [usage]);
  throw TypeError(keyMustBeTypeError(key, ...keyObjectTypes, "Uint8Array"));
}
//@ chunk-pd6th42n.js:10232-10578 esm-fingerprint
var wrap = async (alg, key, cek) => {
  let cryptoKey = await getCryptoKey(key, alg, "wrapKey");
  checkKeySize(cryptoKey, alg);
  let cryptoKeyCek = await cryptoModule.subtle.importKey("raw", cek, ...hmacSubmitAlgorithm);
  return new Uint8Array(await cryptoModule.subtle.wrapKey("raw", cryptoKeyCek, cryptoKey, "AES-KW"));
};
var unwrap = async (alg, key, encryptedKey) => {
  let cryptoKey = await getCryptoKey(key, alg, "unwrapKey");
  checkKeySize(cryptoKey, alg);
  let cryptoKeyCek = await cryptoModule.subtle.unwrapKey(
    "raw",
    encryptedKey,
    cryptoKey,
    "AES-KW",
    ...hmacSubmitAlgorithm,
  );
  return new Uint8Array(await cryptoModule.subtle.exportKey("raw", cryptoKeyCek));
};
export { wrap, unwrap };
