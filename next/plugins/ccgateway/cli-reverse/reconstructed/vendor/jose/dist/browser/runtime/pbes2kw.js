/**
 * jose/dist/browser/runtime/pbes2kw.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-pd6th42n.js (4)
 * attribution: esm-layout 1, esm-fingerprint 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __esm } from "../../../../../runtime/bun-runtime.js";
import { init_content_encryption_2, generateCek } from "../../webapi/lib/content_encryption.js";
import { cryptoModule, isCryptoKey } from "../../webapi/lib/buffer_utils.js";
import { checkEncCryptoKey } from "../../node/esm/lib/crypto_key.js";
import { keyMustBeTypeError } from "../../node/esm/lib/invalid_key_input.js";
import { keyObjectTypes } from "./is_key_like.js";
import { checkP2s } from "../../node/esm/lib/check_p2s.js";
import { p2s } from "../../node/esm/lib/buffer_utils.js";
import { wrap, unwrap } from "./aeskw.js";
import { encode } from "./base64url.js";

//@ chunk-pd6th42n.js:11526-11547 esm-layout
var init_pbes2kw = __esm(() => {
  init_content_encryption_2();
});
//@ chunk-pd6th42n.js:11547-11742 esm-fingerprint
function getCryptoKey_2(key, alg) {
  if (key instanceof Uint8Array)
    return cryptoModule.subtle.importKey("raw", key, "PBKDF2", false, ["deriveBits"]);
  if (isCryptoKey(key)) {
    checkEncCryptoKey(key, alg, "deriveBits", "deriveKey");
    return key;
  }
  throw TypeError(keyMustBeTypeError(key, ...keyObjectTypes, "Uint8Array"));
}
//@ chunk-pd6th42n.js:11742-12193 esm-fingerprint
async function deriveKey_2(p2s_2, alg, p2c, key) {
  checkP2s(p2s_2);
  let salt = p2s(alg, p2s_2);
  let keylen = parseInt(alg.slice(13, 16), 10);
  let subtleAlg = {
    hash: `SHA-${alg.slice(8, 11)}`,
    iterations: p2c,
    name: "PBKDF2",
    salt,
  };
  let wrapAlg = {
    length: keylen,
    name: "AES-KW",
  };
  let cryptoKey = await getCryptoKey_2(key, alg);
  if (cryptoKey.usages.includes("deriveBits"))
    return new Uint8Array(await cryptoModule.subtle.deriveBits(subtleAlg, cryptoKey, keylen));
  if (cryptoKey.usages.includes("deriveKey"))
    return cryptoModule.subtle.deriveKey(subtleAlg, cryptoKey, wrapAlg, false, ["wrapKey", "unwrapKey"]);
  throw TypeError('PBKDF2 key "usages" must include "deriveBits" or "deriveKey"');
}
//@ chunk-pd6th42n.js:12193-12407 esm-fingerprint
var encrypt = async (alg, key, plaintext, p2c = 2048, p2s = generateCek(new Uint8Array(16))) => {
  let derived = await deriveKey_2(p2s, alg, p2c, key);
  return {
    encryptedKey: await wrap(alg.slice(-6), derived, plaintext),
    p2c,
    p2s: encode(p2s),
  };
};
var cekBitsForAlg = async (alg, key, encryptedKey, p2c, joseHeader) => {
  let key_2 = await deriveKey_2(joseHeader, alg, p2c, key);
  return unwrap(alg.slice(-6), key_2, encryptedKey);
};
export { init_pbes2kw, cekBitsForAlg, encrypt };
