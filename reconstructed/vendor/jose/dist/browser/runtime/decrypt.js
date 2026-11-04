/**
 * jose/dist/browser/runtime/decrypt.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (4)
 * attribution: esm-fingerprint 3
 */
import { keyMustBeTypeError, noop } from "../../node/esm/lib/invalid_key_input.js";
import { cryptoModule, isCryptoKey, init_buffer_utils } from "../../webapi/lib/buffer_utils.js";
import { concat, uint64be } from "../../node/esm/lib/buffer_utils.js";
import { timingSafeEqual_default, init_crypto_key } from "./timing_safe_equal.js";
import {
  JWEDecryptionFailed,
  checkIvLengthInit,
  checkCekLengthInit,
  JOSENotSupported,
  init_content_encryption_5,
  init_timing_safe_equal,
  init_content_encryption_2,
} from "../../webapi/lib/content_encryption.js";
import { checkEncCryptoKey } from "../../node/esm/lib/crypto_key.js";
import { keyObjectTypes, noopInit, init_is_key_like } from "./is_key_like.js";
import { __esm } from "../../../../../runtime/bun-runtime.js";
import { init_base64url } from "./base64url.js";

//@ chunk-2tyrgda4.js:7510-8066 esm-fingerprint
async function cbcDecrypt(enc, cek, ciphertext, iv, tag, aad) {
  if (!(cek instanceof Uint8Array)) throw TypeError(keyMustBeTypeError(cek, "Uint8Array"));
  let keySize = parseInt(enc.slice(1, 4), 10);
  let encKey = await cryptoModule.subtle.importKey("raw", cek.subarray(keySize >> 3), "AES-CBC", false, [
    "decrypt",
  ]);
  let macKey = await cryptoModule.subtle.importKey(
    "raw",
    cek.subarray(0, keySize >> 3),
    {
      hash: `SHA-${keySize << 1}`,
      name: "HMAC",
    },
    false,
    ["sign"],
  );
  let macData = concat(aad, iv, ciphertext, uint64be(aad.length << 3));
  let expectedTag = new Uint8Array(
    (await cryptoModule.subtle.sign("HMAC", macKey, macData)).slice(0, keySize >> 3),
  );
  let macCheckPassed;
  try {
    macCheckPassed = timingSafeEqual_default(tag, expectedTag);
  } catch (_a) {}
  if (!macCheckPassed) throw new JWEDecryptionFailed();
  let plaintext;
  try {
    plaintext = new Uint8Array(
      await cryptoModule.subtle.decrypt(
        {
          iv,
          name: "AES-CBC",
        },
        encKey,
        ciphertext,
      ),
    );
  } catch (_b) {}
  if (!plaintext) throw new JWEDecryptionFailed();
  return plaintext;
}
//@ chunk-2tyrgda4.js:8066-8353 esm-fingerprint
async function gcmDecrypt(enc, cek, ciphertext, iv, tag, aad) {
  let encKey;
  if (cek instanceof Uint8Array)
    encKey = await cryptoModule.subtle.importKey("raw", cek, "AES-GCM", false, ["decrypt"]);
  else {
    checkEncCryptoKey(cek, enc, "decrypt");
    encKey = cek;
  }
  try {
    return new Uint8Array(
      await cryptoModule.subtle.decrypt(
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
    throw new JWEDecryptionFailed();
  }
}
//@ chunk-2tyrgda4.js:8353-8812 esm-fingerprint
var decrypt = async (enc, cek, ciphertext, iv, tag, aad) => {
  if (!isCryptoKey(cek) && !(cek instanceof Uint8Array))
    throw TypeError(keyMustBeTypeError(cek, ...keyObjectTypes, "Uint8Array"));
  switch ((checkIvLengthInit(enc, iv), enc)) {
    case "A128CBC-HS256":
    case "A192CBC-HS384":
    case "A256CBC-HS512":
      if (cek instanceof Uint8Array) checkCekLengthInit(cek, parseInt(enc.slice(-3), 10));
      return cbcDecrypt(enc, cek, ciphertext, iv, tag, aad);
    case "A128GCM":
    case "A192GCM":
    case "A256GCM":
      if (cek instanceof Uint8Array) checkCekLengthInit(cek, parseInt(enc.slice(1, 4), 10));
      return gcmDecrypt(enc, cek, ciphertext, iv, tag, aad);
    default:
      throw new JOSENotSupported("Unsupported JWE Content Encryption Algorithm");
  }
};
var decrypt_default;
//@ chunk-2tyrgda4.js:8812-8874 esm-layout (moved: shares a binding it assigns)
var init_zlib = __esm(() => {
  init_base64url();
  init_content_encryption_5();
  init_timing_safe_equal();
  init_crypto_key();
  init_content_encryption_2();
  init_buffer_utils();
  noop();
  noopInit();
  init_is_key_like();
  decrypt_default = decrypt;
});
export { decrypt_default, init_zlib };
