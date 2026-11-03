/**
 * jose/dist/node/esm/lib/decrypt_key_management.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { Xa } from "../../../../../../runtime/bun-runtime.js";
import { init_aesgcmkw, Rt } from "../../../browser/lib/aesgcmkw.js";
import { init_zlib } from "../../../browser/runtime/zlib.js";
import {
  init_content_encryption_4,
  init_content_encryption,
  s,
  f,
} from "../../../webapi/lib/content_encryption.js";
import { z } from "./check_key_type.js";
import { K } from "../../../webapi/lib/validate.js";
import { ecdhAllowed, deriveKey } from "../../../browser/runtime/ecdhes.js";
import { Ze } from "../key/import.js";
import { decode } from "../../../browser/runtime/base64url.js";
import { bitLength } from "./cek.js";
import { unwrap } from "../../../browser/runtime/aeskw.js";
import { decrypt_2 } from "../../../browser/runtime/rsaes.js";
import { Ht } from "../../../browser/runtime/pbes2kw.js";

//@ chunk-2tyrgda4.js:19986-20022 esm-layout
var init_decrypt_key_management = Xa(() => {
  init_aesgcmkw();
  init_zlib();
  init_content_encryption_4();
  init_content_encryption();
});
//@ chunk-2tyrgda4.js:20022-22519 esm-fingerprint
async function decryptKeyManagement(alg, key, encryptedKey, joseHeader, options) {
  switch ((z(alg, key, "decrypt"), alg)) {
    case "dir": {
      if (encryptedKey !== undefined) throw new s("Encountered unexpected JWE Encrypted Key");
      return key;
    }
    case "ECDH-ES":
      if (encryptedKey !== undefined) throw new s("Encountered unexpected JWE Encrypted Key");
    case "ECDH-ES+A128KW":
    case "ECDH-ES+A192KW":
    case "ECDH-ES+A256KW": {
      if (!K(joseHeader.epk)) throw new s('JOSE Header "epk" (Ephemeral Public Key) missing or invalid');
      if (!ecdhAllowed(key))
        throw new f("ECDH with the provided key is not allowed or not supported by your javascript runtime");
      let epk = await Ze(joseHeader.epk, alg);
      let partyUInfo;
      let partyVInfo;
      if (joseHeader.apu !== undefined) {
        if (typeof joseHeader.apu !== "string")
          throw new s('JOSE Header "apu" (Agreement PartyUInfo) invalid');
        try {
          partyUInfo = decode(joseHeader.apu);
        } catch (error) {
          throw new s("Failed to base64url decode the apu");
        }
      }
      if (joseHeader.apv !== undefined) {
        if (typeof joseHeader.apv !== "string")
          throw new s('JOSE Header "apv" (Agreement PartyVInfo) invalid');
        try {
          partyVInfo = decode(joseHeader.apv);
        } catch (error) {
          throw new s("Failed to base64url decode the apv");
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
      if (encryptedKey === undefined) throw new s("JWE Encrypted Key missing");
      return unwrap(alg.slice(-6), sharedSecret, encryptedKey);
    }
    case "RSA1_5":
    case "RSA-OAEP":
    case "RSA-OAEP-256":
    case "RSA-OAEP-384":
    case "RSA-OAEP-512": {
      if (encryptedKey === undefined) throw new s("JWE Encrypted Key missing");
      return decrypt_2(alg, key, encryptedKey);
    }
    case "PBES2-HS256+A128KW":
    case "PBES2-HS384+A192KW":
    case "PBES2-HS512+A256KW": {
      if (encryptedKey === undefined) throw new s("JWE Encrypted Key missing");
      if (typeof joseHeader.p2c !== "number")
        throw new s('JOSE Header "p2c" (PBES2 Count) missing or invalid');
      let p2cLimit = (options === null || options === undefined ? undefined : options.maxPBES2Count) || 1e4;
      if (joseHeader.p2c > p2cLimit)
        throw new s('JOSE Header "p2c" (PBES2 Count) out is of acceptable bounds');
      if (typeof joseHeader.p2s !== "string")
        throw new s('JOSE Header "p2s" (PBES2 Salt) missing or invalid');
      let p2s;
      try {
        p2s = decode(joseHeader.p2s);
      } catch (error) {
        throw new s("Failed to base64url decode the p2s");
      }
      return Ht(alg, key, encryptedKey, joseHeader.p2c, p2s);
    }
    case "A128KW":
    case "A192KW":
    case "A256KW": {
      if (encryptedKey === undefined) throw new s("JWE Encrypted Key missing");
      return unwrap(alg, key, encryptedKey);
    }
    case "A128GCMKW":
    case "A192GCMKW":
    case "A256GCMKW": {
      if (encryptedKey === undefined) throw new s("JWE Encrypted Key missing");
      if (typeof joseHeader.iv !== "string")
        throw new s('JOSE Header "iv" (Initialization Vector) missing or invalid');
      if (typeof joseHeader.tag !== "string")
        throw new s('JOSE Header "tag" (Authentication Tag) missing or invalid');
      let iv;
      try {
        iv = decode(joseHeader.iv);
      } catch (error) {
        throw new s("Failed to base64url decode the iv");
      }
      let tag;
      try {
        tag = decode(joseHeader.tag);
      } catch (error) {
        throw new s("Failed to base64url decode the tag");
      }
      return Rt(alg, key, encryptedKey, iv, tag);
    }
    default:
      throw new f('Invalid or unsupported "alg" (JWE Algorithm) header value');
  }
}
export { init_decrypt_key_management, decryptKeyManagement };
