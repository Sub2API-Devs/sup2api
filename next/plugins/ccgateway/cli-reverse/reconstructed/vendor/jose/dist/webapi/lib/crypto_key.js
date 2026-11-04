/**
 * jose/dist/webapi/lib/crypto_key.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-5h78gfwc.js (7)
 * attribution: esm-fingerprint 6, esm-layout 1
 */
//@ chunk-5h78gfwc.js:2140-2268 esm-fingerprint
var unusable = (name, prop = "algorithm.name") =>
  TypeError(`CryptoKey does not support this operation, its ${prop} must be ${name}`);
var isAlgorithm = (algorithm, name) => algorithm.name === name;
//@ chunk-5h78gfwc.js:2268-2319 esm-layout
function getHashLength(hash) {
  return parseInt(hash.name.slice(4), 10);
}
//@ chunk-5h78gfwc.js:2319-2391 esm-fingerprint
function checkHashLength(algorithm, expected) {
  if (getHashLength(algorithm.hash) !== expected) throw unusable(`SHA-${expected}`, "algorithm.hash");
}
//@ chunk-5h78gfwc.js:2391-2530 esm-fingerprint
function getNamedCurve(alg) {
  switch (alg) {
    case "ES256":
      return "P-256";
    case "ES384":
      return "P-384";
    case "ES512":
      return "P-521";
    default:
      throw Error("unreachable");
  }
}
//@ chunk-5h78gfwc.js:2530-2667 esm-fingerprint
function checkUsage(key, usage) {
  if (usage && !key.usages.includes(usage))
    throw TypeError(`CryptoKey does not support this operation, its usages must include ${usage}.`);
}
//@ chunk-5h78gfwc.js:2667-3511 esm-fingerprint
function checkSigCryptoKey(key, alg, usage) {
  switch (alg) {
    case "HS256":
    case "HS384":
    case "HS512": {
      if (!isAlgorithm(key.algorithm, "HMAC")) throw unusable("HMAC");
      checkHashLength(key.algorithm, parseInt(alg.slice(2), 10));
      break;
    }
    case "RS256":
    case "RS384":
    case "RS512": {
      if (!isAlgorithm(key.algorithm, "RSASSA-PKCS1-v1_5")) throw unusable("RSASSA-PKCS1-v1_5");
      checkHashLength(key.algorithm, parseInt(alg.slice(2), 10));
      break;
    }
    case "PS256":
    case "PS384":
    case "PS512": {
      if (!isAlgorithm(key.algorithm, "RSA-PSS")) throw unusable("RSA-PSS");
      checkHashLength(key.algorithm, parseInt(alg.slice(2), 10));
      break;
    }
    case "Ed25519":
    case "EdDSA": {
      if (!isAlgorithm(key.algorithm, "Ed25519")) throw unusable("Ed25519");
      break;
    }
    case "ML-DSA-44":
    case "ML-DSA-65":
    case "ML-DSA-87": {
      if (!isAlgorithm(key.algorithm, alg)) throw unusable(alg);
      break;
    }
    case "ES256":
    case "ES384":
    case "ES512": {
      if (!isAlgorithm(key.algorithm, "ECDSA")) throw unusable("ECDSA");
      let expected = getNamedCurve(alg);
      if (key.algorithm.namedCurve !== expected) throw unusable(expected, "algorithm.namedCurve");
      break;
    }
    default:
      throw TypeError("CryptoKey does not support this operation");
  }
  checkUsage(key, usage);
}
//@ chunk-5h78gfwc.js:3511-4387 esm-fingerprint
function checkEncCryptoKey(key, alg, usage) {
  switch (alg) {
    case "A128GCM":
    case "A192GCM":
    case "A256GCM": {
      if (!isAlgorithm(key.algorithm, "AES-GCM")) throw unusable("AES-GCM");
      let expected = parseInt(alg.slice(1, 4), 10);
      if (key.algorithm.length !== expected) throw unusable(expected, "algorithm.length");
      break;
    }
    case "A128KW":
    case "A192KW":
    case "A256KW": {
      if (!isAlgorithm(key.algorithm, "AES-KW")) throw unusable("AES-KW");
      let expected = parseInt(alg.slice(1, 4), 10);
      if (key.algorithm.length !== expected) throw unusable(expected, "algorithm.length");
      break;
    }
    case "ECDH": {
      switch (key.algorithm.name) {
        case "ECDH":
        case "X25519":
          break;
        default:
          throw unusable("ECDH or X25519");
      }
      break;
    }
    case "PBES2-HS256+A128KW":
    case "PBES2-HS384+A192KW":
    case "PBES2-HS512+A256KW":
      if (!isAlgorithm(key.algorithm, "PBKDF2")) throw unusable("PBKDF2");
      break;
    case "RSA-OAEP":
    case "RSA-OAEP-256":
    case "RSA-OAEP-384":
    case "RSA-OAEP-512": {
      if (!isAlgorithm(key.algorithm, "RSA-OAEP")) throw unusable("RSA-OAEP");
      checkHashLength(key.algorithm, parseInt(alg.slice(9), 10) || 1);
      break;
    }
    default:
      throw TypeError("CryptoKey does not support this operation");
  }
  checkUsage(key, usage);
}
export { checkEncCryptoKey, checkSigCryptoKey };
