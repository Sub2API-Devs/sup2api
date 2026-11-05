/**
 * jose/dist/webapi/lib/normalize_key.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-0f6azspv.js (2)
 * attribution: esm-fingerprint 2
 */
import { jwkToKey } from "./jwk_to_key.js";
import { isCryptoKey, isKeyObject } from "./key.js";
import { isJWK } from "./type_checks.js";
import { decode } from "../util/base64url.js";

//@ chunk-0f6azspv.js:17878-19745 esm-fingerprint
var unusableForAlg = "given KeyObject instance cannot be used for this algorithm";
var cache;
var handleJWK = async (key, jwk, alg, freeze = false) => {
  cache ||= new WeakMap();
  let cached = cache.get(key);
  if (cached?.[alg]) return cached[alg];
  let cryptoKey = await jwkToKey({
    ...jwk,
    alg,
  });
  if (freeze) Object.freeze(key);
  if (!cached)
    cache.set(key, {
      [alg]: cryptoKey,
    });
  else cached[alg] = cryptoKey;
  return cryptoKey;
};
var handleKeyObject = (keyObject, alg) => {
  cache ||= new WeakMap();
  let cached = cache.get(keyObject);
  if (cached?.[alg]) return cached[alg];
  let isPublic = keyObject.type === "public";
  let extractable = isPublic ? true : false;
  let cryptoKey;
  if (keyObject.asymmetricKeyType === "x25519") {
    switch (alg) {
      case "ECDH-ES":
      case "ECDH-ES+A128KW":
      case "ECDH-ES+A192KW":
      case "ECDH-ES+A256KW":
        break;
      default:
        throw TypeError(unusableForAlg);
    }
    cryptoKey = keyObject.toCryptoKey(
      keyObject.asymmetricKeyType,
      extractable,
      isPublic ? [] : ["deriveBits"],
    );
  }
  if (keyObject.asymmetricKeyType === "ed25519") {
    if (alg !== "EdDSA" && alg !== "Ed25519") throw TypeError(unusableForAlg);
    cryptoKey = keyObject.toCryptoKey(keyObject.asymmetricKeyType, extractable, [
      isPublic ? "verify" : "sign",
    ]);
  }
  switch (keyObject.asymmetricKeyType) {
    case "ml-dsa-44":
    case "ml-dsa-65":
    case "ml-dsa-87": {
      if (alg !== keyObject.asymmetricKeyType.toUpperCase()) throw TypeError(unusableForAlg);
      cryptoKey = keyObject.toCryptoKey(keyObject.asymmetricKeyType, extractable, [
        isPublic ? "verify" : "sign",
      ]);
    }
  }
  if (keyObject.asymmetricKeyType === "rsa") {
    let hash;
    switch (alg) {
      case "RSA-OAEP":
        hash = "SHA-1";
        break;
      case "RS256":
      case "PS256":
      case "RSA-OAEP-256":
        hash = "SHA-256";
        break;
      case "RS384":
      case "PS384":
      case "RSA-OAEP-384":
        hash = "SHA-384";
        break;
      case "RS512":
      case "PS512":
      case "RSA-OAEP-512":
        hash = "SHA-512";
        break;
      default:
        throw TypeError(unusableForAlg);
    }
    if (alg.startsWith("RSA-OAEP"))
      return keyObject.toCryptoKey(
        {
          name: "RSA-OAEP",
          hash,
        },
        extractable,
        isPublic ? ["encrypt"] : ["decrypt"],
      );
    cryptoKey = keyObject.toCryptoKey(
      {
        name: alg.startsWith("PS") ? "RSA-PSS" : "RSASSA-PKCS1-v1_5",
        hash,
      },
      extractable,
      [isPublic ? "verify" : "sign"],
    );
  }
  if (keyObject.asymmetricKeyType === "ec") {
    let namedCurve = new Map([
      ["prime256v1", "P-256"],
      ["secp384r1", "P-384"],
      ["secp521r1", "P-521"],
    ]).get(keyObject.asymmetricKeyDetails?.namedCurve);
    if (!namedCurve) throw TypeError(unusableForAlg);
    let expectedCurve = {
      ES256: "P-256",
      ES384: "P-384",
      ES512: "P-521",
    };
    if (expectedCurve[alg] && namedCurve === expectedCurve[alg])
      cryptoKey = keyObject.toCryptoKey(
        {
          name: "ECDSA",
          namedCurve,
        },
        extractable,
        [isPublic ? "verify" : "sign"],
      );
    if (alg.startsWith("ECDH-ES"))
      cryptoKey = keyObject.toCryptoKey(
        {
          name: "ECDH",
          namedCurve,
        },
        extractable,
        isPublic ? [] : ["deriveBits"],
      );
  }
  if (!cryptoKey) throw TypeError(unusableForAlg);
  if (!cached)
    cache.set(keyObject, {
      [alg]: cryptoKey,
    });
  else cached[alg] = cryptoKey;
  return cryptoKey;
};
//@ chunk-0f6azspv.js:19745-20113 esm-fingerprint
async function normalizeKey(key, alg) {
  if (key instanceof Uint8Array) return key;
  if (isCryptoKey(key)) return key;
  if (isKeyObject(key)) {
    if (key.type === "secret") return key.export();
    if ("toCryptoKey" in key && typeof key.toCryptoKey === "function")
      try {
        return handleKeyObject(key, alg);
      } catch (err) {
        if (err instanceof TypeError) throw err;
      }
    let jwk = key.export({
      format: "jwk",
    });
    return handleJWK(key, jwk, alg);
  }
  if (isJWK(key)) {
    if (key.k) return decode(key.k);
    return handleJWK(key, key, alg, true);
  }
  throw Error("unreachable");
}
export { normalizeKey };
