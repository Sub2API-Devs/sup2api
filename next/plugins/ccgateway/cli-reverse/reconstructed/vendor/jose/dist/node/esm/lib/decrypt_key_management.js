/**
 * jose/dist/node/esm/lib/decrypt_key_management.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-pd6th42n.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { __esm } from "../../../../../../runtime/bun-runtime.js";
import { init_aesgcmkw } from "../../../browser/runtime/encrypt.js";
import { init_zlib } from "../../../browser/runtime/decrypt.js";
import {
  init_content_encryption_4,
  init_content_encryption,
  JWEInvalid_3,
  JOSENotSupported_3,
} from "../../../webapi/lib/content_encryption.js";
import { checkKeyTypeInit } from "./check_key_type.js";
import { isPlainObject } from "../../../webapi/lib/validate.js";
import { ecdhAllowed, deriveKey } from "../../../browser/runtime/ecdhes.js";
import { importJWK } from "../key/import.js";
import { decode_2 } from "../../../browser/runtime/base64url.js";
import { bitLength } from "./cek.js";
import { unwrap } from "../../../browser/runtime/aeskw.js";
import { decrypt_2 } from "../../../browser/runtime/rsaes.js";
import { cekBitsForAlg } from "../../../browser/runtime/pbes2kw.js";
import { sha256DigestInit2 } from "../../../browser/lib/aesgcmkw.js";

//@ chunk-pd6th42n.js:19986-20022 esm-layout
var init_decrypt_key_management = __esm(() => {
  init_aesgcmkw();
  init_zlib();
  init_content_encryption_4();
  init_content_encryption();
});
//@ chunk-pd6th42n.js:20022-22519 esm-fingerprint
async function decryptKeyManagement(alg, key, encryptedKey, joseHeader, options) {
  switch ((checkKeyTypeInit(alg, key, "decrypt"), alg)) {
    case "dir": {
      if (encryptedKey !== undefined) throw new JWEInvalid_3("Encountered unexpected JWE Encrypted Key");
      return key;
    }
    case "ECDH-ES":
      if (encryptedKey !== undefined) throw new JWEInvalid_3("Encountered unexpected JWE Encrypted Key");
    case "ECDH-ES+A128KW":
    case "ECDH-ES+A192KW":
    case "ECDH-ES+A256KW": {
      if (!isPlainObject(joseHeader.epk))
        throw new JWEInvalid_3('JOSE Header "epk" (Ephemeral Public Key) missing or invalid');
      if (!ecdhAllowed(key))
        throw new JOSENotSupported_3(
          "ECDH with the provided key is not allowed or not supported by your javascript runtime",
        );
      let epk = await importJWK(joseHeader.epk, alg);
      let partyUInfo;
      let partyVInfo;
      if (joseHeader.apu !== undefined) {
        if (typeof joseHeader.apu !== "string")
          throw new JWEInvalid_3('JOSE Header "apu" (Agreement PartyUInfo) invalid');
        try {
          partyUInfo = decode_2(joseHeader.apu);
        } catch (error) {
          throw new JWEInvalid_3("Failed to base64url decode the apu");
        }
      }
      if (joseHeader.apv !== undefined) {
        if (typeof joseHeader.apv !== "string")
          throw new JWEInvalid_3('JOSE Header "apv" (Agreement PartyVInfo) invalid');
        try {
          partyVInfo = decode_2(joseHeader.apv);
        } catch (error) {
          throw new JWEInvalid_3("Failed to base64url decode the apv");
        }
      }
      let sharedSecret = await deriveKey(
        epk,
        key,
        alg === "ECDH-ES" ? joseHeader.enc : alg,
        alg === "ECDH-ES" ? bitLength(joseHeader.enc) : parseInt(alg.slice(-5, -2), 10),
        partyUInfo,
        partyVInfo,
      );
      if (alg === "ECDH-ES") return sharedSecret;
      if (encryptedKey === undefined) throw new JWEInvalid_3("JWE Encrypted Key missing");
      return unwrap(alg.slice(-6), sharedSecret, encryptedKey);
    }
    case "RSA1_5":
    case "RSA-OAEP":
    case "RSA-OAEP-256":
    case "RSA-OAEP-384":
    case "RSA-OAEP-512": {
      if (encryptedKey === undefined) throw new JWEInvalid_3("JWE Encrypted Key missing");
      return decrypt_2(alg, key, encryptedKey);
    }
    case "PBES2-HS256+A128KW":
    case "PBES2-HS384+A192KW":
    case "PBES2-HS512+A256KW": {
      if (encryptedKey === undefined) throw new JWEInvalid_3("JWE Encrypted Key missing");
      if (typeof joseHeader.p2c !== "number")
        throw new JWEInvalid_3('JOSE Header "p2c" (PBES2 Count) missing or invalid');
      let p2cLimit = (options === null || options === undefined ? undefined : options.maxPBES2Count) || 1e4;
      if (joseHeader.p2c > p2cLimit)
        throw new JWEInvalid_3('JOSE Header "p2c" (PBES2 Count) out is of acceptable bounds');
      if (typeof joseHeader.p2s !== "string")
        throw new JWEInvalid_3('JOSE Header "p2s" (PBES2 Salt) missing or invalid');
      let p2s;
      try {
        p2s = decode_2(joseHeader.p2s);
      } catch (error) {
        throw new JWEInvalid_3("Failed to base64url decode the p2s");
      }
      return cekBitsForAlg(alg, key, encryptedKey, joseHeader.p2c, p2s);
    }
    case "A128KW":
    case "A192KW":
    case "A256KW": {
      if (encryptedKey === undefined) throw new JWEInvalid_3("JWE Encrypted Key missing");
      return unwrap(alg, key, encryptedKey);
    }
    case "A128GCMKW":
    case "A192GCMKW":
    case "A256GCMKW": {
      if (encryptedKey === undefined) throw new JWEInvalid_3("JWE Encrypted Key missing");
      if (typeof joseHeader.iv !== "string")
        throw new JWEInvalid_3('JOSE Header "iv" (Initialization Vector) missing or invalid');
      if (typeof joseHeader.tag !== "string")
        throw new JWEInvalid_3('JOSE Header "tag" (Authentication Tag) missing or invalid');
      let iv;
      try {
        iv = decode_2(joseHeader.iv);
      } catch (error) {
        throw new JWEInvalid_3("Failed to base64url decode the iv");
      }
      let tag;
      try {
        tag = decode_2(joseHeader.tag);
      } catch (error) {
        throw new JWEInvalid_3("Failed to base64url decode the tag");
      }
      return sha256DigestInit2(alg, key, encryptedKey, iv, tag);
    }
    default:
      throw new JOSENotSupported_3('Invalid or unsupported "alg" (JWE Algorithm) header value');
  }
}
export { init_decrypt_key_management, decryptKeyManagement };
