/**
 * jose/dist/webapi/lib/key_management.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (2), chunk-5h78gfwc.js (14)
 * attribution: esm-layout 3, esm-fingerprint 13
 */
import { checkEncCryptoKey } from "./crypto_key.js";
import { deriveKey_2 } from "./pbes2kw.js";
import { encode_2 } from "../util/base64url.js";
import { JOSENotSupported, JWEInvalid } from "../../node/esm/util/errors.js";
import { checkKeyLength } from "./signing.js";
import {
  decrypt,
  ye,
  generateCek,
  init_content_encryption_3,
  init_content_encryption,
  f,
} from "./content_encryption.js";
import { isObject } from "./type_checks.js";
import { tag } from "./key.js";
import { allowed, deriveKey } from "./ecdhes.js";
import { importJWK } from "../key/import.js";
import { decodeBase64url } from "./helpers.js";
import { normalizeKey } from "./normalize_key.js";
import { At, gt } from "../../browser/lib/aesgcmkw.js";
import { Xa } from "../../../../../runtime/bun-runtime.js";
import { init_base64url } from "../../browser/runtime/base64url.js";
import { init_ecdhes } from "../../browser/runtime/ecdhes.js";
import { init_pbes2kw } from "../../browser/runtime/pbes2kw.js";
import { init_buffer_utils } from "./buffer_utils.js";
import { L } from "../../node/esm/lib/invalid_key_input.js";
import { O, init_is_key_like } from "../../browser/runtime/is_key_like.js";

//@ chunk-5h78gfwc.js:12131-12248 esm-fingerprint
function checkKeySize(key, alg) {
  if (key.algorithm.length !== parseInt(alg.slice(1, 4), 10))
    throw TypeError(`Invalid key size for alg: ${alg}`);
}
//@ chunk-5h78gfwc.js:12248-12368 esm-fingerprint
function aeskwCryptoKey(key, t, usage) {
  if (key instanceof Uint8Array) return crypto.subtle.importKey("raw", key, "AES-KW", true, [usage]);
  checkEncCryptoKey(key, t, usage);
  return key;
}
//@ chunk-5h78gfwc.js:12368-12588 esm-fingerprint
async function re(alg, key, cek) {
  let cryptoKey = await aeskwCryptoKey(key, alg, "wrapKey");
  checkKeySize(cryptoKey, alg);
  let cryptoKeyCek = await crypto.subtle.importKey(
    "raw",
    cek,
    {
      hash: "SHA-256",
      name: "HMAC",
    },
    true,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.wrapKey("raw", cryptoKeyCek, cryptoKey, "AES-KW"));
}
//@ chunk-5h78gfwc.js:12588-12812 esm-fingerprint
async function aeskwUnwrap(alg, key, encryptedKey) {
  let cryptoKey = await aeskwCryptoKey(key, alg, "unwrapKey");
  checkKeySize(cryptoKey, alg);
  let cryptoKeyCek = await crypto.subtle.unwrapKey(
    "raw",
    encryptedKey,
    cryptoKey,
    "AES-KW",
    {
      hash: "SHA-256",
      name: "HMAC",
    },
    true,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.exportKey("raw", cryptoKeyCek));
}
//@ chunk-5h78gfwc.js:14141-14304 esm-fingerprint
async function st(e, key, r, p2c = 2048, p2s = crypto.getRandomValues(new Uint8Array(16))) {
  let derived = await deriveKey_2(p2s, e, p2c, key);
  return {
    encryptedKey: await re(e.slice(-6), derived, r),
    p2c,
    p2s: encode_2(p2s),
  };
}
//@ chunk-5h78gfwc.js:14304-14384 esm-layout
async function ct(alg, key, encryptedKey, n, joseHeader) {
  let key_2 = await deriveKey_2(joseHeader, alg, n, key);
  return aeskwUnwrap(alg.slice(-6), key_2, encryptedKey);
}
//@ chunk-5h78gfwc.js:15709-15914 esm-fingerprint
var subtleAlgorithm_2 = (alg) => {
  switch (alg) {
    case "RSA-OAEP":
    case "RSA-OAEP-256":
    case "RSA-OAEP-384":
    case "RSA-OAEP-512":
      return "RSA-OAEP";
    default:
      throw new JOSENotSupported(`alg ${alg} is not supported either by JOSE or your javascript runtime`);
  }
};
//@ chunk-5h78gfwc.js:15914-16026 esm-fingerprint
async function rsaesEncrypt(alg, key, cek) {
  checkEncCryptoKey(key, alg, "encrypt");
  checkKeyLength(alg, key);
  return new Uint8Array(await crypto.subtle.encrypt(subtleAlgorithm_2(alg), key, cek));
}
//@ chunk-5h78gfwc.js:16026-16138 esm-fingerprint
async function rsaesDecrypt(alg, key, encryptedKey) {
  checkEncCryptoKey(key, alg, "decrypt");
  checkKeyLength(alg, key);
  return new Uint8Array(await crypto.subtle.decrypt(subtleAlgorithm_2(alg), key, encryptedKey));
}
//@ chunk-5h78gfwc.js:23984-24068 esm-layout
async function bt(e, key, ciphertext, n, tag) {
  let sliced = e.slice(0, 7);
  return decrypt(sliced, key, ciphertext, n, tag, new Uint8Array());
}
//@ chunk-5h78gfwc.js:24068-24135 esm-fingerprint
var unsupportedAlgHeader = 'Invalid or unsupported "alg" (JWE Algorithm) header value';
//@ chunk-5h78gfwc.js:24135-24205 esm-fingerprint
function assertEncryptedKey(encryptedKey) {
  if (encryptedKey === undefined) throw new JWEInvalid("JWE Encrypted Key missing");
}
//@ chunk-5h78gfwc.js:24205-26082 esm-fingerprint
async function decryptKeyManagement(alg, key, encryptedKey, joseHeader, options) {
  switch (alg) {
    case "dir": {
      if (encryptedKey !== undefined) throw new JWEInvalid("Encountered unexpected JWE Encrypted Key");
      return key;
    }
    case "ECDH-ES":
      if (encryptedKey !== undefined) throw new JWEInvalid("Encountered unexpected JWE Encrypted Key");
    case "ECDH-ES+A128KW":
    case "ECDH-ES+A192KW":
    case "ECDH-ES+A256KW": {
      if (!isObject(joseHeader.epk))
        throw new JWEInvalid('JOSE Header "epk" (Ephemeral Public Key) missing or invalid');
      tag(key);
      if (!allowed(key))
        throw new JOSENotSupported(
          "ECDH with the provided key is not allowed or not supported by your javascript runtime",
        );
      let epk = await importJWK(joseHeader.epk, alg);
      tag(epk);
      let partyUInfo;
      let partyVInfo;
      if (joseHeader.apu !== undefined) {
        if (typeof joseHeader.apu !== "string")
          throw new JWEInvalid('JOSE Header "apu" (Agreement PartyUInfo) invalid');
        partyUInfo = decodeBase64url(joseHeader.apu, "apu", JWEInvalid);
      }
      if (joseHeader.apv !== undefined) {
        if (typeof joseHeader.apv !== "string")
          throw new JWEInvalid('JOSE Header "apv" (Agreement PartyVInfo) invalid');
        partyVInfo = decodeBase64url(joseHeader.apv, "apv", JWEInvalid);
      }
      let sharedSecret = await deriveKey(
        epk,
        key,
        alg === "ECDH-ES" ? joseHeader.enc : alg,
        alg === "ECDH-ES" ? ye(joseHeader.enc) : parseInt(alg.slice(-5, -2), 10),
        partyUInfo,
        partyVInfo,
      );
      if (alg === "ECDH-ES") return sharedSecret;
      assertEncryptedKey(encryptedKey);
      return aeskwUnwrap(alg.slice(-6), sharedSecret, encryptedKey);
    }
    case "RSA-OAEP":
    case "RSA-OAEP-256":
    case "RSA-OAEP-384":
    case "RSA-OAEP-512":
      assertEncryptedKey(encryptedKey);
      tag(key);
      return rsaesDecrypt(alg, key, encryptedKey);
    case "PBES2-HS256+A128KW":
    case "PBES2-HS384+A192KW":
    case "PBES2-HS512+A256KW": {
      assertEncryptedKey(encryptedKey);
      if (typeof joseHeader.p2c !== "number")
        throw new JWEInvalid('JOSE Header "p2c" (PBES2 Count) missing or invalid');
      let p2cLimit = options?.maxPBES2Count || 1e4;
      if (joseHeader.p2c > p2cLimit)
        throw new JWEInvalid('JOSE Header "p2c" (PBES2 Count) out is of acceptable bounds');
      if (typeof joseHeader.p2s !== "string")
        throw new JWEInvalid('JOSE Header "p2s" (PBES2 Salt) missing or invalid');
      let p2s;
      p2s = decodeBase64url(joseHeader.p2s, "p2s", JWEInvalid);
      return ct(alg, key, encryptedKey, joseHeader.p2c, p2s);
    }
    case "A128KW":
    case "A192KW":
    case "A256KW":
      assertEncryptedKey(encryptedKey);
      return aeskwUnwrap(alg, key, encryptedKey);
    case "A128GCMKW":
    case "A192GCMKW":
    case "A256GCMKW": {
      assertEncryptedKey(encryptedKey);
      if (typeof joseHeader.iv !== "string")
        throw new JWEInvalid('JOSE Header "iv" (Initialization Vector) missing or invalid');
      if (typeof joseHeader.tag !== "string")
        throw new JWEInvalid('JOSE Header "tag" (Authentication Tag) missing or invalid');
      let iv;
      iv = decodeBase64url(joseHeader.iv, "iv", JWEInvalid);
      let tag;
      tag = decodeBase64url(joseHeader.tag, "tag", JWEInvalid);
      return bt(alg, key, encryptedKey, iv, tag);
    }
    default:
      throw new JOSENotSupported(unsupportedAlgHeader);
  }
}
//@ chunk-5h78gfwc.js:26082-27290 esm-fingerprint
async function encryptKeyManagement(alg, enc, key, providedCek, providedParameters = {}) {
  let encryptedKey;
  let parameters;
  let cek;
  switch (alg) {
    case "dir": {
      cek = key;
      break;
    }
    case "ECDH-ES":
    case "ECDH-ES+A128KW":
    case "ECDH-ES+A192KW":
    case "ECDH-ES+A256KW": {
      tag(key);
      if (!allowed(key))
        throw new JOSENotSupported(
          "ECDH with the provided key is not allowed or not supported by your javascript runtime",
        );
      let { apu, apv } = providedParameters;
      let ephemeralKey;
      if (providedParameters.epk) ephemeralKey = await normalizeKey(providedParameters.epk, alg);
      else ephemeralKey = (await crypto.subtle.generateKey(key.algorithm, true, ["deriveBits"])).privateKey;
      let { x, y, crv, kty } = await At(ephemeralKey);
      let sharedSecret = await deriveKey(
        key,
        ephemeralKey,
        alg === "ECDH-ES" ? enc : alg,
        alg === "ECDH-ES" ? ye(enc) : parseInt(alg.slice(-5, -2), 10),
        apu,
        apv,
      );
      parameters = {
        epk: {
          x,
          crv,
          kty,
        },
      };
      if (kty === "EC") parameters.epk.y = y;
      if (apu) parameters.apu = encode_2(apu);
      if (apv) parameters.apv = encode_2(apv);
      if (alg === "ECDH-ES") {
        cek = sharedSecret;
        break;
      }
      cek = providedCek || generateCek(enc);
      let kwAlg = alg.slice(-6);
      encryptedKey = await re(kwAlg, sharedSecret, cek);
      break;
    }
    case "RSA-OAEP":
    case "RSA-OAEP-256":
    case "RSA-OAEP-384":
    case "RSA-OAEP-512": {
      cek = providedCek || generateCek(enc);
      tag(key);
      encryptedKey = await rsaesEncrypt(alg, key, cek);
      break;
    }
    case "PBES2-HS256+A128KW":
    case "PBES2-HS384+A192KW":
    case "PBES2-HS512+A256KW": {
      cek = providedCek || generateCek(enc);
      let { p2c, p2s } = providedParameters;
      ({ encryptedKey, ...parameters } = await st(alg, key, cek, p2c, p2s));
      break;
    }
    case "A128KW":
    case "A192KW":
    case "A256KW": {
      cek = providedCek || generateCek(enc);
      encryptedKey = await re(alg, key, cek);
      break;
    }
    case "A128GCMKW":
    case "A192GCMKW":
    case "A256GCMKW": {
      cek = providedCek || generateCek(enc);
      let { iv } = providedParameters;
      ({ encryptedKey, ...parameters } = await gt(alg, key, cek, iv));
      break;
    }
    default:
      throw new JOSENotSupported(unsupportedAlgHeader);
  }
  return {
    cek,
    encryptedKey,
    parameters,
  };
}
//@ chunk-2tyrgda4.js:12407-12463 esm-layout
var init_key_management = Xa(() => {
  init_content_encryption_3();
  init_base64url();
  init_content_encryption();
  init_ecdhes();
  init_pbes2kw();
  init_buffer_utils();
  L();
  O();
  init_is_key_like();
});
//@ chunk-2tyrgda4.js:12463-12669 esm-fingerprint
function te(alg) {
  switch (alg) {
    case "RSA-OAEP":
    case "RSA-OAEP-256":
    case "RSA-OAEP-384":
    case "RSA-OAEP-512":
      return "RSA-OAEP";
    default:
      throw new f(`alg ${alg} is not supported either by JOSE or your javascript runtime`);
  }
}
export { te, init_key_management, decryptKeyManagement, encryptKeyManagement };
