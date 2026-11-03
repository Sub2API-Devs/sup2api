/**
 * jose/dist/node/esm/lib/crypto_key.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (8)
 * attribution: esm-layout 3, esm-fingerprint 5
 */
import { Xa } from "../../../../../../runtime/bun-runtime.js";
import { timingSafeEqual_default, timingSafeEqual } from "../../../browser/runtime/timing_safe_equal.js";

//@ chunk-2tyrgda4.js:4322-4345 esm-layout
var init_crypto_key = Xa(() => {
  timingSafeEqual_default = timingSafeEqual;
});
//@ chunk-2tyrgda4.js:4345-4463 esm-fingerprint
function unusable(name, prop = "algorithm.name") {
  return TypeError(`CryptoKey does not support this operation, its ${prop} must be ${name}`);
}
//@ chunk-2tyrgda4.js:4463-4497 esm-layout
function B(algorithm, t) {
  return algorithm.name === t;
}
//@ chunk-2tyrgda4.js:4497-4548 esm-layout
function getHashLength(hash) {
  return parseInt(hash.name.slice(4), 10);
}
//@ chunk-2tyrgda4.js:4548-4687 esm-fingerprint
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
//@ chunk-2tyrgda4.js:4687-4988 esm-fingerprint
function checkUsage(key, usages) {
  if (usages.length && !usages.some((expected) => key.usages.includes(expected))) {
    let msg = "CryptoKey does not support this operation, its usages must include ";
    if (usages.length > 2) {
      let last = usages.pop();
      msg += `one of ${usages.join(", ")}, or ${last}.`;
    } else if (usages.length === 2) msg += `one of ${usages[0]} or ${usages[1]}.`;
    else msg += `${usages[0]}.`;
    throw TypeError(msg);
  }
}
//@ chunk-2tyrgda4.js:4988-5939 esm-fingerprint
function checkSigCryptoKey(key, alg, ...usages) {
  switch (alg) {
    case "HS256":
    case "HS384":
    case "HS512": {
      if (!B(key.algorithm, "HMAC")) throw unusable("HMAC");
      let expected = parseInt(alg.slice(2), 10);
      if (getHashLength(key.algorithm.hash) !== expected) throw unusable(`SHA-${expected}`, "algorithm.hash");
      break;
    }
    case "RS256":
    case "RS384":
    case "RS512": {
      if (!B(key.algorithm, "RSASSA-PKCS1-v1_5")) throw unusable("RSASSA-PKCS1-v1_5");
      let expected = parseInt(alg.slice(2), 10);
      if (getHashLength(key.algorithm.hash) !== expected) throw unusable(`SHA-${expected}`, "algorithm.hash");
      break;
    }
    case "PS256":
    case "PS384":
    case "PS512": {
      if (!B(key.algorithm, "RSA-PSS")) throw unusable("RSA-PSS");
      let expected = parseInt(alg.slice(2), 10);
      if (getHashLength(key.algorithm.hash) !== expected) throw unusable(`SHA-${expected}`, "algorithm.hash");
      break;
    }
    case "EdDSA": {
      if (key.algorithm.name !== "Ed25519" && key.algorithm.name !== "Ed448")
        throw unusable("Ed25519 or Ed448");
      break;
    }
    case "ES256":
    case "ES384":
    case "ES512": {
      if (!B(key.algorithm, "ECDSA")) throw unusable("ECDSA");
      let expected = getNamedCurve(alg);
      if (key.algorithm.namedCurve !== expected) throw unusable(expected, "algorithm.namedCurve");
      break;
    }
    default:
      throw TypeError("CryptoKey does not support this operation");
  }
  checkUsage(key, usages);
}
//@ chunk-2tyrgda4.js:5939-6891 esm-fingerprint
function checkEncCryptoKey(key, alg, ...usages) {
  switch (alg) {
    case "A128GCM":
    case "A192GCM":
    case "A256GCM": {
      if (!B(key.algorithm, "AES-GCM")) throw unusable("AES-GCM");
      let expected = parseInt(alg.slice(1, 4), 10);
      if (key.algorithm.length !== expected) throw unusable(expected, "algorithm.length");
      break;
    }
    case "A128KW":
    case "A192KW":
    case "A256KW": {
      if (!B(key.algorithm, "AES-KW")) throw unusable("AES-KW");
      let expected = parseInt(alg.slice(1, 4), 10);
      if (key.algorithm.length !== expected) throw unusable(expected, "algorithm.length");
      break;
    }
    case "ECDH": {
      switch (key.algorithm.name) {
        case "ECDH":
        case "X25519":
        case "X448":
          break;
        default:
          throw unusable("ECDH, X25519, or X448");
      }
      break;
    }
    case "PBES2-HS256+A128KW":
    case "PBES2-HS384+A192KW":
    case "PBES2-HS512+A256KW":
      if (!B(key.algorithm, "PBKDF2")) throw unusable("PBKDF2");
      break;
    case "RSA-OAEP":
    case "RSA-OAEP-256":
    case "RSA-OAEP-384":
    case "RSA-OAEP-512": {
      if (!B(key.algorithm, "RSA-OAEP")) throw unusable("RSA-OAEP");
      let expected = parseInt(alg.slice(9), 10) || 1;
      if (getHashLength(key.algorithm.hash) !== expected) throw unusable(`SHA-${expected}`, "algorithm.hash");
      break;
    }
    default:
      throw TypeError("CryptoKey does not support this operation");
  }
  checkUsage(key, usages);
}
export { checkEncCryptoKey, init_crypto_key, checkSigCryptoKey };
