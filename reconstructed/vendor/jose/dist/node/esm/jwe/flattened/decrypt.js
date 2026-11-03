/**
 * jose/dist/node/esm/jwe/flattened/decrypt.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { Xa } from "../../../../../../../runtime/bun-runtime.js";
import {
  validateAlgorithms_default,
  validateAlgorithms,
  X,
  decryptKeyManagement_default,
} from "../../../../webapi/lib/options.js";
import { K, G } from "../../../../webapi/lib/validate.js";
import { s, f, Q } from "../../../../webapi/lib/content_encryption.js";
import { decode, C, l } from "../../../../browser/runtime/base64url.js";
import { V } from "../../../../browser/runtime/jwk_to_key.js";
import { concat } from "../../lib/buffer_utils.js";
import { decrypt_default } from "../../../../browser/runtime/decrypt.js";
import { inflate } from "../../../../browser/runtime/zlib.js";

//@ chunk-2tyrgda4.js:23575-23598 esm-layout
var init_decrypt = Xa(() => {
  validateAlgorithms_default = validateAlgorithms;
});
//@ chunk-2tyrgda4.js:23598-26775 esm-fingerprint
async function flattenedDecrypt(jwe, key, options) {
  var _a;
  if (!K(jwe)) throw new s("Flattened JWE must be an object");
  if (jwe.protected === undefined && jwe.header === undefined && jwe.unprotected === undefined)
    throw new s("JOSE Header missing");
  if (typeof jwe.iv !== "string") throw new s("JWE Initialization Vector missing or incorrect type");
  if (typeof jwe.ciphertext !== "string") throw new s("JWE Ciphertext missing or incorrect type");
  if (typeof jwe.tag !== "string") throw new s("JWE Authentication Tag missing or incorrect type");
  if (jwe.protected !== undefined && typeof jwe.protected !== "string")
    throw new s("JWE Protected Header incorrect type");
  if (jwe.encrypted_key !== undefined && typeof jwe.encrypted_key !== "string")
    throw new s("JWE Encrypted Key incorrect type");
  if (jwe.aad !== undefined && typeof jwe.aad !== "string") throw new s("JWE AAD incorrect type");
  if (jwe.header !== undefined && !K(jwe.header)) throw new s("JWE Shared Unprotected Header incorrect type");
  if (jwe.unprotected !== undefined && !K(jwe.unprotected))
    throw new s("JWE Per-Recipient Unprotected Header incorrect type");
  let parsedProt;
  if (jwe.protected)
    try {
      let protectedHeader = decode(jwe.protected);
      parsedProt = JSON.parse(C.decode(protectedHeader));
    } catch (error) {
      throw new s("JWE Protected Header is invalid");
    }
  if (!G(parsedProt, jwe.header, jwe.unprotected))
    throw new s(
      "JWE Protected, JWE Unprotected Header, and JWE Per-Recipient Unprotected Header Parameter names must be disjoint",
    );
  let joseHeader = {
    ...parsedProt,
    ...jwe.header,
    ...jwe.unprotected,
  };
  X(
    s,
    new Map(),
    options === null || options === undefined ? undefined : options.crit,
    parsedProt,
    joseHeader,
  );
  if (joseHeader.zip !== undefined) {
    if (!parsedProt || !parsedProt.zip)
      throw new s('JWE "zip" (Compression Algorithm) Header MUST be integrity protected');
    if (joseHeader.zip !== "DEF")
      throw new f('Unsupported JWE "zip" (Compression Algorithm) Header Parameter value');
  }
  let { alg, enc } = joseHeader;
  if (typeof alg !== "string" || !alg) throw new s("missing JWE Algorithm (alg) in JWE Header");
  if (typeof enc !== "string" || !enc) throw new s("missing JWE Encryption Algorithm (enc) in JWE Header");
  let keyManagementAlgorithms =
    options && validateAlgorithms_default("keyManagementAlgorithms", options.keyManagementAlgorithms);
  let contentEncryptionAlgorithms =
    options && validateAlgorithms_default("contentEncryptionAlgorithms", options.contentEncryptionAlgorithms);
  if (keyManagementAlgorithms && !keyManagementAlgorithms.has(alg))
    throw new Q('"alg" (Algorithm) Header Parameter not allowed');
  if (contentEncryptionAlgorithms && !contentEncryptionAlgorithms.has(enc))
    throw new Q('"enc" (Encryption Algorithm) Header Parameter not allowed');
  let encryptedKey;
  if (jwe.encrypted_key !== undefined)
    try {
      encryptedKey = decode(jwe.encrypted_key);
    } catch (error) {
      throw new s("Failed to base64url decode the encrypted_key");
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
    if (err instanceof TypeError || err instanceof s || err instanceof f) throw err;
    cek = V(enc);
  }
  let iv;
  let tag;
  try {
    iv = decode(jwe.iv);
  } catch (error) {
    throw new s("Failed to base64url decode the iv");
  }
  try {
    tag = decode(jwe.tag);
  } catch (error) {
    throw new s("Failed to base64url decode the tag");
  }
  let protectedHeader = l.encode((_a = jwe.protected) !== null && _a !== undefined ? _a : "");
  let additionalData;
  if (jwe.aad !== undefined) additionalData = concat(protectedHeader, l.encode("."), l.encode(jwe.aad));
  else additionalData = protectedHeader;
  let ciphertext;
  try {
    ciphertext = decode(jwe.ciphertext);
  } catch (error) {
    throw new s("Failed to base64url decode the ciphertext");
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
      result.additionalAuthenticatedData = decode(jwe.aad);
    } catch (error) {
      throw new s("Failed to base64url decode the aad");
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
export { init_decrypt, flattenedDecrypt };
