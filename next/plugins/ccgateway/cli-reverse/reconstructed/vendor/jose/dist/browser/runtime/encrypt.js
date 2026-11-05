/**
 * jose/dist/browser/runtime/encrypt.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-pd6th42n.js (4)
 * attribution: esm-layout 1, esm-fingerprint 3
 */
import { keyMustBeTypeError, noop } from "../../node/esm/lib/invalid_key_input.js";
import { cryptoModule, isCryptoKey, init_buffer_utils } from "../../webapi/lib/buffer_utils.js";
import { concat, uint64be } from "../../node/esm/lib/buffer_utils.js";
import { checkEncCryptoKey } from "../../node/esm/lib/crypto_key.js";
import { keyObjectTypes, noopInit, init_is_key_like } from "./is_key_like.js";
import {
  checkIvLengthInit,
  checkCekLengthInit,
  JOSENotSupported_3,
  init_content_encryption_5,
  init_timing_safe_equal,
  init_content_encryption_2,
} from "../../webapi/lib/content_encryption.js";
import { __esm } from "../../../../../runtime/bun-runtime.js";
import { init_base64url } from "./base64url.js";

//@ chunk-pd6th42n.js:18435-18923 esm-fingerprint
async function cbcEncrypt(enc, plaintext, cek, iv, aad) {
  if (!(cek instanceof Uint8Array)) throw TypeError(keyMustBeTypeError(cek, "Uint8Array"));
  let keySize = parseInt(enc.slice(1, 4), 10);
  let encKey = await cryptoModule.subtle.importKey("raw", cek.subarray(keySize >> 3), "AES-CBC", false, [
    "encrypt",
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
  let ciphertext = new Uint8Array(
    await cryptoModule.subtle.encrypt(
      {
        iv,
        name: "AES-CBC",
      },
      encKey,
      plaintext,
    ),
  );
  let macData = concat(aad, iv, ciphertext, uint64be(aad.length << 3));
  let tag = new Uint8Array((await cryptoModule.subtle.sign("HMAC", macKey, macData)).slice(0, keySize >> 3));
  return {
    ciphertext,
    tag,
  };
}
//@ chunk-pd6th42n.js:18923-19230 esm-fingerprint
async function gcmEncrypt(enc, plaintext, cek, iv, aad) {
  let encKey;
  if (cek instanceof Uint8Array)
    encKey = await cryptoModule.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  else {
    checkEncCryptoKey(cek, enc, "encrypt");
    encKey = cek;
  }
  let encrypted = new Uint8Array(
    await cryptoModule.subtle.encrypt(
      {
        additionalData: aad,
        iv,
        name: "AES-GCM",
        tagLength: 128,
      },
      encKey,
      plaintext,
    ),
  );
  let tag = encrypted.slice(-16);
  return {
    ciphertext: encrypted.slice(0, -16),
    tag,
  };
}
//@ chunk-pd6th42n.js:19230-19683 esm-fingerprint
var encrypt_3 = async (enc, plaintext, cek, iv, aad) => {
  if (!isCryptoKey(cek) && !(cek instanceof Uint8Array))
    throw TypeError(keyMustBeTypeError(cek, ...keyObjectTypes, "Uint8Array"));
  switch ((checkIvLengthInit(enc, iv), enc)) {
    case "A128CBC-HS256":
    case "A192CBC-HS384":
    case "A256CBC-HS512":
      if (cek instanceof Uint8Array) checkCekLengthInit(cek, parseInt(enc.slice(-3), 10));
      return cbcEncrypt(enc, plaintext, cek, iv, aad);
    case "A128GCM":
    case "A192GCM":
    case "A256GCM":
      if (cek instanceof Uint8Array) checkCekLengthInit(cek, parseInt(enc.slice(1, 4), 10));
      return gcmEncrypt(enc, plaintext, cek, iv, aad);
    default:
      throw new JOSENotSupported_3("Unsupported JWE Content Encryption Algorithm");
  }
};
var encrypt_default;
//@ chunk-pd6th42n.js:19683-19740 esm-layout (moved: shares a binding it assigns)
var init_aesgcmkw = __esm(() => {
  init_base64url();
  init_content_encryption_5();
  init_timing_safe_equal();
  init_buffer_utils();
  noop();
  noopInit();
  init_content_encryption_2();
  init_is_key_like();
  encrypt_default = encrypt_3;
});
export { encrypt_default, init_aesgcmkw };
