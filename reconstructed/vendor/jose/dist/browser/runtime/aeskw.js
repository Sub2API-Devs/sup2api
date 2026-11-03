/**
 * jose/dist/browser/runtime/aeskw.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (3)
 * attribution: esm-fingerprint 3
 */
import { g, p } from "../../webapi/lib/buffer_utils.js";
import { checkEncCryptoKey } from "../../node/esm/lib/crypto_key.js";
import { A } from "../../node/esm/lib/invalid_key_input.js";
import { m } from "./is_key_like.js";
import { ee } from "../../webapi/lib/content_encryption.js";

//@ chunk-2tyrgda4.js:9952-10069 esm-fingerprint
function checkKeySize(key, alg) {
  if (key.algorithm.length !== parseInt(alg.slice(1, 4), 10))
    throw TypeError(`Invalid key size for alg: ${alg}`);
}
//@ chunk-2tyrgda4.js:10069-10232 esm-fingerprint
function getCryptoKey(key, alg, usage) {
  if (g(key)) {
    checkEncCryptoKey(key, alg, usage);
    return key;
  }
  if (key instanceof Uint8Array) return p.subtle.importKey("raw", key, "AES-KW", true, [usage]);
  throw TypeError(A(key, ...m, "Uint8Array"));
}
//@ chunk-2tyrgda4.js:10232-10578 esm-fingerprint
var wrap = async (alg, key, cek) => {
  let cryptoKey = await getCryptoKey(key, alg, "wrapKey");
  checkKeySize(cryptoKey, alg);
  let cryptoKeyCek = await p.subtle.importKey("raw", cek, ...ee);
  return new Uint8Array(await p.subtle.wrapKey("raw", cryptoKeyCek, cryptoKey, "AES-KW"));
};
var unwrap = async (alg, key, encryptedKey) => {
  let cryptoKey = await getCryptoKey(key, alg, "unwrapKey");
  checkKeySize(cryptoKey, alg);
  let cryptoKeyCek = await p.subtle.unwrapKey("raw", encryptedKey, cryptoKey, "AES-KW", ...ee);
  return new Uint8Array(await p.subtle.exportKey("raw", cryptoKeyCek));
};
export { wrap, unwrap };
