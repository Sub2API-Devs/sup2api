/**
 * jose/dist/node/esm/jwe/compact/decrypt.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (2), chunk-5h78gfwc.js (1)
 * attribution: esm-layout 1, esm-fingerprint 2
 */
import { Xa } from "../../../../../../../runtime/bun-runtime.js";
import {
  init_content_encryption,
  init_content_encryption_2,
  F,
  s,
} from "../../../../webapi/lib/content_encryption.js";
import { init_zlib } from "../../../../browser/runtime/zlib.js";
import { init_validate, init_validate_2 } from "../../../../webapi/lib/validate.js";
import { init_options, init_options_2 } from "../../../../webapi/lib/options.js";
import { init_base64url, C } from "../../../../browser/runtime/base64url.js";
import { init_jwk_to_key } from "../../../../browser/runtime/jwk_to_key.js";
import { init_decrypt, flattenedDecrypt } from "../flattened/decrypt.js";
import { textDecoder } from "../../../../webapi/lib/buffer_utils.js";
import { JWEInvalid } from "../../util/errors.js";
import { flattenedDecrypt_2 } from "../../../../webapi/jwe/flattened/decrypt.js";

//@ chunk-2tyrgda4.js:26775-26843 esm-layout
var init_decrypt_2 = Xa(() => {
  init_content_encryption();
  init_zlib();
  init_validate();
  init_content_encryption_2();
  init_validate_2();
  F();
  init_options();
  init_base64url();
  init_jwk_to_key();
  init_options_2();
  init_decrypt();
});
//@ chunk-2tyrgda4.js:26843-27304 esm-fingerprint
async function compactDecrypt(jwe, key, options) {
  if (jwe instanceof Uint8Array) jwe = C.decode(jwe);
  if (typeof jwe !== "string") throw new s("Compact JWE must be a string or Uint8Array");
  let { 0: protectedHeader, 1: encryptedKey, 2: iv, 3: ciphertext, 4: tag, length } = jwe.split(".");
  if (length !== 5) throw new s("Invalid Compact JWE");
  let decrypted = await flattenedDecrypt(
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
//@ chunk-5h78gfwc.js:34826-35279 esm-fingerprint
async function compactDecrypt_2(jwe, key, options) {
  if (jwe instanceof Uint8Array) jwe = textDecoder.decode(jwe);
  if (typeof jwe !== "string") throw new JWEInvalid("Compact JWE must be a string or Uint8Array");
  let { 0: protectedHeader, 1: encryptedKey, 2: iv, 3: ciphertext, 4: tag, length } = jwe.split(".");
  if (length !== 5) throw new JWEInvalid("Invalid Compact JWE");
  let decrypted = await flattenedDecrypt_2(
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
export { init_decrypt_2, compactDecrypt_2 };
