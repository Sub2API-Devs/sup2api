/**
 * jose/dist/webapi/lib/jwk_to_key.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-5h78gfwc.js (3)
 * attribution: esm-fingerprint 3
 */
import { JOSENotSupported_2 } from "../../node/esm/util/errors.js";

//@ chunk-5h78gfwc.js:16138-16208 esm-fingerprint
var unsupportedAlg = 'Invalid or unsupported JWK "alg" (Algorithm) Parameter value';
//@ chunk-5h78gfwc.js:16208-17603 esm-fingerprint
function subtleMapping(jwk) {
  let algorithm;
  let keyUsages;
  switch (jwk.kty) {
    case "AKP": {
      switch (jwk.alg) {
        case "ML-DSA-44":
        case "ML-DSA-65":
        case "ML-DSA-87":
          algorithm = {
            name: jwk.alg,
          };
          keyUsages = jwk.priv ? ["sign"] : ["verify"];
          break;
        default:
          throw new JOSENotSupported_2(unsupportedAlg);
      }
      break;
    }
    case "RSA": {
      switch (jwk.alg) {
        case "PS256":
        case "PS384":
        case "PS512":
          algorithm = {
            name: "RSA-PSS",
            hash: `SHA-${jwk.alg.slice(-3)}`,
          };
          keyUsages = jwk.d ? ["sign"] : ["verify"];
          break;
        case "RS256":
        case "RS384":
        case "RS512":
          algorithm = {
            name: "RSASSA-PKCS1-v1_5",
            hash: `SHA-${jwk.alg.slice(-3)}`,
          };
          keyUsages = jwk.d ? ["sign"] : ["verify"];
          break;
        case "RSA-OAEP":
        case "RSA-OAEP-256":
        case "RSA-OAEP-384":
        case "RSA-OAEP-512":
          algorithm = {
            name: "RSA-OAEP",
            hash: `SHA-${parseInt(jwk.alg.slice(-3), 10) || 1}`,
          };
          keyUsages = jwk.d ? ["decrypt", "unwrapKey"] : ["encrypt", "wrapKey"];
          break;
        default:
          throw new JOSENotSupported_2(unsupportedAlg);
      }
      break;
    }
    case "EC": {
      switch (jwk.alg) {
        case "ES256":
        case "ES384":
        case "ES512":
          algorithm = {
            name: "ECDSA",
            namedCurve: {
              ES256: "P-256",
              ES384: "P-384",
              ES512: "P-521",
            }[jwk.alg],
          };
          keyUsages = jwk.d ? ["sign"] : ["verify"];
          break;
        case "ECDH-ES":
        case "ECDH-ES+A128KW":
        case "ECDH-ES+A192KW":
        case "ECDH-ES+A256KW":
          algorithm = {
            name: "ECDH",
            namedCurve: jwk.crv,
          };
          keyUsages = jwk.d ? ["deriveBits"] : [];
          break;
        default:
          throw new JOSENotSupported_2(unsupportedAlg);
      }
      break;
    }
    case "OKP": {
      switch (jwk.alg) {
        case "Ed25519":
        case "EdDSA":
          algorithm = {
            name: "Ed25519",
          };
          keyUsages = jwk.d ? ["sign"] : ["verify"];
          break;
        case "ECDH-ES":
        case "ECDH-ES+A128KW":
        case "ECDH-ES+A192KW":
        case "ECDH-ES+A256KW":
          algorithm = {
            name: jwk.crv,
          };
          keyUsages = jwk.d ? ["deriveBits"] : [];
          break;
        default:
          throw new JOSENotSupported_2(unsupportedAlg);
      }
      break;
    }
    default:
      throw new JOSENotSupported_2('Invalid or unsupported JWK "kty" (Key Type) Parameter value');
  }
  return {
    algorithm,
    keyUsages,
  };
}
//@ chunk-5h78gfwc.js:17603-17878 esm-fingerprint
async function jwkToKey(jwk) {
  if (!jwk.alg) throw TypeError('"alg" argument is required when "jwk.alg" is not present');
  let { algorithm, keyUsages } = subtleMapping(jwk);
  let keyData = {
    ...jwk,
  };
  if (keyData.kty !== "AKP") delete keyData.alg;
  delete keyData.use;
  return crypto.subtle.importKey(
    "jwk",
    keyData,
    algorithm,
    jwk.ext ?? (jwk.d || jwk.priv ? false : true),
    jwk.key_ops ?? keyUsages,
  );
}
export { jwkToKey };
