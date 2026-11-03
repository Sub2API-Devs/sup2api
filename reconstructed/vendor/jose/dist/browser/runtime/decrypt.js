/**
 * jose/dist/browser/runtime/decrypt.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (3)
 * attribution: esm-fingerprint 3
 */
import { A } from "../../node/esm/lib/invalid_key_input.js";
import { p, g } from "../../webapi/lib/buffer_utils.js";
import { concat, he } from "../../node/esm/lib/buffer_utils.js";
import { timingSafeEqual_default } from "./timing_safe_equal.js";
import { re, ge, j, f } from "../../webapi/lib/content_encryption.js";
import { checkEncCryptoKey } from "../../node/esm/lib/crypto_key.js";
import { m } from "./is_key_like.js";

//@ chunk-2tyrgda4.js:7510-8066 esm-fingerprint
async function cbcDecrypt(enc, cek, ciphertext, iv, tag, aad) {
  if (!(cek instanceof Uint8Array)) throw TypeError(A(cek, "Uint8Array"));
  let keySize = parseInt(enc.slice(1, 4), 10);
  let encKey = await p.subtle.importKey("raw", cek.subarray(keySize >> 3), "AES-CBC", false, ["decrypt"]);
  let macKey = await p.subtle.importKey(
    "raw",
    cek.subarray(0, keySize >> 3),
    {
      hash: `SHA-${keySize << 1}`,
      name: "HMAC",
    },
    false,
    ["sign"],
  );
  let macData = concat(aad, iv, ciphertext, he(aad.length << 3));
  let expectedTag = new Uint8Array((await p.subtle.sign("HMAC", macKey, macData)).slice(0, keySize >> 3));
  let macCheckPassed;
  try {
    macCheckPassed = timingSafeEqual_default(tag, expectedTag);
  } catch (_a) {}
  if (!macCheckPassed) throw new re();
  let plaintext;
  try {
    plaintext = new Uint8Array(
      await p.subtle.decrypt(
        {
          iv,
          name: "AES-CBC",
        },
        encKey,
        ciphertext,
      ),
    );
  } catch (_b) {}
  if (!plaintext) throw new re();
  return plaintext;
}
//@ chunk-2tyrgda4.js:8066-8353 esm-fingerprint
async function gcmDecrypt(enc, cek, ciphertext, iv, tag, aad) {
  let encKey;
  if (cek instanceof Uint8Array) encKey = await p.subtle.importKey("raw", cek, "AES-GCM", false, ["decrypt"]);
  else {
    checkEncCryptoKey(cek, enc, "decrypt");
    encKey = cek;
  }
  try {
    return new Uint8Array(
      await p.subtle.decrypt(
        {
          additionalData: aad,
          iv,
          name: "AES-GCM",
          tagLength: 128,
        },
        encKey,
        concat(ciphertext, tag),
      ),
    );
  } catch (_a) {
    throw new re();
  }
}
//@ chunk-2tyrgda4.js:8353-8812 esm-fingerprint
var decrypt = async (enc, cek, ciphertext, iv, tag, aad) => {
  if (!g(cek) && !(cek instanceof Uint8Array)) throw TypeError(A(cek, ...m, "Uint8Array"));
  switch ((ge(enc, iv), enc)) {
    case "A128CBC-HS256":
    case "A192CBC-HS384":
    case "A256CBC-HS512":
      if (cek instanceof Uint8Array) j(cek, parseInt(enc.slice(-3), 10));
      return cbcDecrypt(enc, cek, ciphertext, iv, tag, aad);
    case "A128GCM":
    case "A192GCM":
    case "A256GCM":
      if (cek instanceof Uint8Array) j(cek, parseInt(enc.slice(1, 4), 10));
      return gcmDecrypt(enc, cek, ciphertext, iv, tag, aad);
    default:
      throw new f("Unsupported JWE Content Encryption Algorithm");
  }
};
var decrypt_default;
export { decrypt_default, decrypt };
