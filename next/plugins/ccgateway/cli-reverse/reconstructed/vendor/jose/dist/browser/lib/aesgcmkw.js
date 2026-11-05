/**
 * jose/dist/browser/lib/aesgcmkw.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-0f6azspv.js (2), chunk-pd6th42n.js (2)
 * attribution: esm-layout 3, esm-fingerprint 2
 */
import { keyToJWK } from "../../webapi/key/export.js";
import { encrypt, generateIv } from "../../webapi/lib/content_encryption.js";
import { encode_2 } from "../../webapi/util/base64url.js";
import { encrypt_default } from "../runtime/encrypt.js";
import { encode } from "../runtime/base64url.js";
import { decrypt_default } from "../runtime/decrypt.js";

//@ chunk-0f6azspv.js:23811-23845 esm-layout
async function exportJWK(key) {
  return keyToJWK(key);
}
//@ chunk-0f6azspv.js:23845-23984 esm-fingerprint
async function aesGcmKwWrap(alg, key, cek, p2c) {
  let jweAlgorithm = alg.slice(0, 7);
  let encrypted = await encrypt(jweAlgorithm, cek, key, p2c, new Uint8Array());
  return {
    encryptedKey: encrypted.ciphertext,
    iv: encode_2(encrypted.iv),
    tag: encode_2(encrypted.tag),
  };
}
//@ chunk-pd6th42n.js:19740-19899 esm-fingerprint
async function wrap_2(alg, key, cek, iv) {
  let jweAlgorithm = alg.slice(0, 7);
  if (!iv) iv = generateIv(jweAlgorithm);
  let { ciphertext: encryptedKey, tag } = await encrypt_default(
    jweAlgorithm,
    cek,
    key,
    iv,
    new Uint8Array(0),
  );
  return {
    encryptedKey,
    iv: encode(iv),
    tag: encode(tag),
  };
}
//@ chunk-pd6th42n.js:19899-19986 esm-layout
async function sha256DigestInit2(alg, key, encryptedKey, iv, tag) {
  let jweAlgorithm = alg.slice(0, 7);
  return decrypt_default(jweAlgorithm, key, encryptedKey, iv, tag, new Uint8Array(0));
}
export { exportJWK, aesGcmKwWrap, sha256DigestInit2, wrap_2 };
