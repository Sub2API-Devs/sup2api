/**
 * jose/dist/node/esm/jwe/compact/decrypt.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-0f6azspv.js (1), chunk-pd6th42n.js (2)
 * attribution: esm-fingerprint 2, esm-layout 1
 */
import { textDecoder } from "../../../../webapi/lib/buffer_utils.js";
import { JWEInvalid_2 } from "../../util/errors.js";
import { flattenedDecrypt } from "../../../../webapi/jwe/flattened/decrypt.js";
import { __esm } from "../../../../../../../runtime/bun-runtime.js";
import {
  init_content_encryption,
  init_content_encryption_2,
  noopClaims,
  JWEInvalid_3,
} from "../../../../webapi/lib/content_encryption.js";
import { init_zlib } from "../../../../browser/runtime/decrypt.js";
import { init_validate, init_validate_2 } from "../../../../webapi/lib/validate.js";
import { init_options, init_options_2, init_decrypt } from "../../../../webapi/lib/options.js";
import { init_base64url, decoder } from "../../../../browser/runtime/base64url.js";
import { init_jwk_to_key } from "../../../../browser/runtime/jwk_to_key.js";
import { flattenedDecrypt_2 } from "../flattened/decrypt.js";

//@ chunk-0f6azspv.js:34826-35279 esm-fingerprint
async function compactDecrypt(jwe, key, options) {
  if (jwe instanceof Uint8Array) jwe = textDecoder.decode(jwe);
  if (typeof jwe !== "string") throw new JWEInvalid_2("Compact JWE must be a string or Uint8Array");
  let { 0: protectedHeader, 1: encryptedKey, 2: iv, 3: ciphertext, 4: tag, length } = jwe.split(".");
  if (length !== 5) throw new JWEInvalid_2("Invalid Compact JWE");
  let decrypted = await flattenedDecrypt(
    {
      ciphertext,
      iv: iv || undefined,
      protected: protectedHeader,
      tag: tag || undefined,
      encrypted_key: encryptedKey || undefined,
    },
    key,
    options,
  );
  let result = {
    plaintext: decrypted.plaintext,
    protectedHeader: decrypted.protectedHeader,
  };
  if (typeof key === "function")
    return {
      ...result,
      key: decrypted.key,
    };
  return result;
}
//@ chunk-pd6th42n.js:26775-26843 esm-layout
var init_decrypt_2 = __esm(() => {
  init_content_encryption();
  init_zlib();
  init_validate();
  init_content_encryption_2();
  init_validate_2();
  noopClaims();
  init_options();
  init_base64url();
  init_jwk_to_key();
  init_options_2();
  init_decrypt();
});
//@ chunk-pd6th42n.js:26843-27304 esm-fingerprint
async function compactDecrypt_2(jwe, key, options) {
  if (jwe instanceof Uint8Array) jwe = decoder.decode(jwe);
  if (typeof jwe !== "string") throw new JWEInvalid_3("Compact JWE must be a string or Uint8Array");
  let { 0: protectedHeader, 1: encryptedKey, 2: iv, 3: ciphertext, 4: tag, length } = jwe.split(".");
  if (length !== 5) throw new JWEInvalid_3("Invalid Compact JWE");
  let decrypted = await flattenedDecrypt_2(
    {
      ciphertext,
      iv: iv || undefined,
      protected: protectedHeader || undefined,
      tag: tag || undefined,
      encrypted_key: encryptedKey || undefined,
    },
    key,
    options,
  );
  let result = {
    plaintext: decrypted.plaintext,
    protectedHeader: decrypted.protectedHeader,
  };
  if (typeof key === "function")
    return {
      ...result,
      key: decrypted.key,
    };
  return result;
}
export { compactDecrypt, init_decrypt_2, compactDecrypt_2 };
