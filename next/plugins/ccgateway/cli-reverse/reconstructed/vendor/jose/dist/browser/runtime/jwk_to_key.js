/**
 * jose/dist/browser/runtime/jwk_to_key.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-pd6th42n.js (5)
 * attribution: esm-layout 2, esm-fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  generateCek,
  init_content_encryption_2,
  init_content_encryption_3,
  JOSENotSupported_3,
  init_content_encryption,
} from "../../webapi/lib/content_encryption.js";
import { bitLength } from "../../node/esm/lib/cek.js";
import { __esm } from "../../../../../runtime/bun-runtime.js";
import { cryptoModule, init_buffer_utils } from "../../webapi/lib/buffer_utils.js";
import { decode_2 } from "./base64url.js";

//@ chunk-pd6th42n.js:14034-14073 esm-layout
var aesGcmKwEncrypt = (bitLengthInline) => generateCek(new Uint8Array(bitLength(bitLengthInline) >> 3));
//@ chunk-pd6th42n.js:14073-14099 esm-layout
var init_jwk_to_key = __esm(() => {
  init_content_encryption_2();
  init_content_encryption_3();
});
//@ chunk-pd6th42n.js:14099-16294 esm-fingerprint
function subtleMapping(jwk) {
  let algorithm;
  let keyUsages;
  switch (jwk.kty) {
    case "oct": {
      switch (jwk.alg) {
        case "HS256":
        case "HS384":
        case "HS512":
          algorithm = {
            name: "HMAC",
            hash: `SHA-${jwk.alg.slice(-3)}`,
          };
          keyUsages = ["sign", "verify"];
          break;
        case "A128CBC-HS256":
        case "A192CBC-HS384":
        case "A256CBC-HS512":
          throw new JOSENotSupported_3(`${jwk.alg} keys cannot be imported as CryptoKey instances`);
        case "A128GCM":
        case "A192GCM":
        case "A256GCM":
        case "A128GCMKW":
        case "A192GCMKW":
        case "A256GCMKW":
          algorithm = {
            name: "AES-GCM",
          };
          keyUsages = ["encrypt", "decrypt"];
          break;
        case "A128KW":
        case "A192KW":
        case "A256KW":
          algorithm = {
            name: "AES-KW",
          };
          keyUsages = ["wrapKey", "unwrapKey"];
          break;
        case "PBES2-HS256+A128KW":
        case "PBES2-HS384+A192KW":
        case "PBES2-HS512+A256KW":
          algorithm = {
            name: "PBKDF2",
          };
          keyUsages = ["deriveBits"];
          break;
        default:
          throw new JOSENotSupported_3('Invalid or unsupported JWK "alg" (Algorithm) Parameter value');
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
          throw new JOSENotSupported_3('Invalid or unsupported JWK "alg" (Algorithm) Parameter value');
      }
      break;
    }
    case "EC": {
      switch (jwk.alg) {
        case "ES256":
          algorithm = {
            name: "ECDSA",
            namedCurve: "P-256",
          };
          keyUsages = jwk.d ? ["sign"] : ["verify"];
          break;
        case "ES384":
          algorithm = {
            name: "ECDSA",
            namedCurve: "P-384",
          };
          keyUsages = jwk.d ? ["sign"] : ["verify"];
          break;
        case "ES512":
          algorithm = {
            name: "ECDSA",
            namedCurve: "P-521",
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
          throw new JOSENotSupported_3('Invalid or unsupported JWK "alg" (Algorithm) Parameter value');
      }
      break;
    }
    case "OKP": {
      switch (jwk.alg) {
        case "EdDSA":
          algorithm = {
            name: jwk.crv,
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
          throw new JOSENotSupported_3('Invalid or unsupported JWK "alg" (Algorithm) Parameter value');
      }
      break;
    }
    default:
      throw new JOSENotSupported_3('Invalid or unsupported JWK "kty" (Key Type) Parameter value');
  }
  return {
    algorithm,
    keyUsages,
  };
}
//@ chunk-pd6th42n.js:16294-16667 esm-fingerprint
var parse = async (jwk) => {
  var _a;
  var _b;
  if (!jwk.alg) throw TypeError('"alg" argument is required when "jwk.alg" is not present');
  let { algorithm, keyUsages } = subtleMapping(jwk);
  let rest = [
    algorithm,
    (_a = jwk.ext) !== null && _a !== undefined ? _a : false,
    (_b = jwk.key_ops) !== null && _b !== undefined ? _b : keyUsages,
  ];
  if (algorithm.name === "PBKDF2") return cryptoModule.subtle.importKey("raw", decode_2(jwk.k), ...rest);
  let keyData = {
    ...jwk,
  };
  delete keyData.alg;
  delete keyData.use;
  return cryptoModule.subtle.importKey("jwk", keyData, ...rest);
};
var parse_default;
//@ chunk-pd6th42n.js:16667-16702 esm-layout (moved: shares a binding it assigns)
var init_import = __esm(() => {
  init_buffer_utils();
  init_content_encryption_2();
  init_content_encryption();
  parse_default = parse;
});
export { init_jwk_to_key, parse_default, init_import, aesGcmKwEncrypt };
