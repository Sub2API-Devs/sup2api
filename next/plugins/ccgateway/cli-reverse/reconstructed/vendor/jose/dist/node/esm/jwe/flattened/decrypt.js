/**
 * jose/dist/node/esm/jwe/flattened/decrypt.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-pd6th42n.js (1)
 * attribution: esm-layout 1, esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isPlainObject, validateCrit } from "../../../../webapi/lib/validate.js";
import {
  JWEInvalid_3,
  JOSENotSupported_3,
  JOSEAlgNotAllowed,
} from "../../../../webapi/lib/content_encryption.js";
import { decode_2, decoder, encoder } from "../../../../browser/runtime/base64url.js";
import {
  validateCritInit,
  validateAlgorithms_default,
  decryptKeyManagement_default,
} from "../../../../webapi/lib/options.js";
import { aesGcmKwEncrypt } from "../../../../browser/runtime/jwk_to_key.js";
import { concat } from "../../lib/buffer_utils.js";
import { decrypt_default } from "../../../../browser/runtime/decrypt.js";
import { inflate } from "../../../../browser/runtime/zlib.js";

//@ chunk-pd6th42n.js:23598-26775 esm-fingerprint
async function flattenedDecrypt_2(jwe, key, options) {
  var _a;
  if (!isPlainObject(jwe)) throw new JWEInvalid_3("Flattened JWE must be an object");
  if (jwe.protected === undefined && jwe.header === undefined && jwe.unprotected === undefined)
    throw new JWEInvalid_3("JOSE Header missing");
  if (typeof jwe.iv !== "string")
    throw new JWEInvalid_3("JWE Initialization Vector missing or incorrect type");
  if (typeof jwe.ciphertext !== "string") throw new JWEInvalid_3("JWE Ciphertext missing or incorrect type");
  if (typeof jwe.tag !== "string") throw new JWEInvalid_3("JWE Authentication Tag missing or incorrect type");
  if (jwe.protected !== undefined && typeof jwe.protected !== "string")
    throw new JWEInvalid_3("JWE Protected Header incorrect type");
  if (jwe.encrypted_key !== undefined && typeof jwe.encrypted_key !== "string")
    throw new JWEInvalid_3("JWE Encrypted Key incorrect type");
  if (jwe.aad !== undefined && typeof jwe.aad !== "string") throw new JWEInvalid_3("JWE AAD incorrect type");
  if (jwe.header !== undefined && !isPlainObject(jwe.header))
    throw new JWEInvalid_3("JWE Shared Unprotected Header incorrect type");
  if (jwe.unprotected !== undefined && !isPlainObject(jwe.unprotected))
    throw new JWEInvalid_3("JWE Per-Recipient Unprotected Header incorrect type");
  let parsedProt;
  if (jwe.protected)
    try {
      let protectedHeader = decode_2(jwe.protected);
      parsedProt = JSON.parse(decoder.decode(protectedHeader));
    } catch (error) {
      throw new JWEInvalid_3("JWE Protected Header is invalid");
    }
  if (!validateCrit(parsedProt, jwe.header, jwe.unprotected))
    throw new JWEInvalid_3(
      "JWE Protected, JWE Unprotected Header, and JWE Per-Recipient Unprotected Header Parameter names must be disjoint",
    );
  let joseHeader = {
    ...parsedProt,
    ...jwe.header,
    ...jwe.unprotected,
  };
  validateCritInit(
    JWEInvalid_3,
    new Map(),
    options === null || options === undefined ? undefined : options.crit,
    parsedProt,
    joseHeader,
  );
  if (joseHeader.zip !== undefined) {
    if (!parsedProt || !parsedProt.zip)
      throw new JWEInvalid_3('JWE "zip" (Compression Algorithm) Header MUST be integrity protected');
    if (joseHeader.zip !== "DEF")
      throw new JOSENotSupported_3('Unsupported JWE "zip" (Compression Algorithm) Header Parameter value');
  }
  let { alg, enc } = joseHeader;
  if (typeof alg !== "string" || !alg) throw new JWEInvalid_3("missing JWE Algorithm (alg) in JWE Header");
  if (typeof enc !== "string" || !enc)
    throw new JWEInvalid_3("missing JWE Encryption Algorithm (enc) in JWE Header");
  let keyManagementAlgorithms =
    options && validateAlgorithms_default("keyManagementAlgorithms", options.keyManagementAlgorithms);
  let contentEncryptionAlgorithms =
    options && validateAlgorithms_default("contentEncryptionAlgorithms", options.contentEncryptionAlgorithms);
  if (keyManagementAlgorithms && !keyManagementAlgorithms.has(alg))
    throw new JOSEAlgNotAllowed('"alg" (Algorithm) Header Parameter not allowed');
  if (contentEncryptionAlgorithms && !contentEncryptionAlgorithms.has(enc))
    throw new JOSEAlgNotAllowed('"enc" (Encryption Algorithm) Header Parameter not allowed');
  let encryptedKey;
  if (jwe.encrypted_key !== undefined)
    try {
      encryptedKey = decode_2(jwe.encrypted_key);
    } catch (error) {
      throw new JWEInvalid_3("Failed to base64url decode the encrypted_key");
    }
  let resolvedKey = false;
  if (typeof key === "function") {
    key = await key(parsedProt, jwe);
    resolvedKey = true;
  }
  let cek;
  try {
    cek = await decryptKeyManagement_default(alg, key, encryptedKey, joseHeader, options);
  } catch (err) {
    if (err instanceof TypeError || err instanceof JWEInvalid_3 || err instanceof JOSENotSupported_3)
      throw err;
    cek = aesGcmKwEncrypt(enc);
  }
  let iv;
  let tag;
  try {
    iv = decode_2(jwe.iv);
  } catch (error) {
    throw new JWEInvalid_3("Failed to base64url decode the iv");
  }
  try {
    tag = decode_2(jwe.tag);
  } catch (error) {
    throw new JWEInvalid_3("Failed to base64url decode the tag");
  }
  let protectedHeader = encoder.encode((_a = jwe.protected) !== null && _a !== undefined ? _a : "");
  let additionalData;
  if (jwe.aad !== undefined)
    additionalData = concat(protectedHeader, encoder.encode("."), encoder.encode(jwe.aad));
  else additionalData = protectedHeader;
  let ciphertext;
  try {
    ciphertext = decode_2(jwe.ciphertext);
  } catch (error) {
    throw new JWEInvalid_3("Failed to base64url decode the ciphertext");
  }
  let plaintext = await decrypt_default(enc, cek, ciphertext, iv, tag, additionalData);
  if (joseHeader.zip === "DEF")
    plaintext = await (
      (options === null || options === undefined ? undefined : options.inflateRaw) || inflate
    )(plaintext);
  let result = {
    plaintext,
  };
  if (jwe.protected !== undefined) result.protectedHeader = parsedProt;
  if (jwe.aad !== undefined)
    try {
      result.additionalAuthenticatedData = decode_2(jwe.aad);
    } catch (error) {
      throw new JWEInvalid_3("Failed to base64url decode the aad");
    }
  if (jwe.unprotected !== undefined) result.sharedUnprotectedHeader = jwe.unprotected;
  if (jwe.header !== undefined) result.unprotectedHeader = jwe.header;
  if (resolvedKey)
    return {
      ...result,
      key,
    };
  return result;
}
export { flattenedDecrypt_2 };
