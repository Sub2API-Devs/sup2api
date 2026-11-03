/**
 * jose/dist/browser/runtime/jwk_to_key.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (4)
 * attribution: esm-layout 2, esm-fingerprint 2
 */
import { k, E, Ee, f } from "../../webapi/lib/content_encryption.js";
import { ie } from "../../node/esm/lib/cek.js";
import { Xa } from "../../../../../runtime/bun-runtime.js";
import { p } from "../../webapi/lib/buffer_utils.js";
import { S } from "./base64url.js";

//@ chunk-2tyrgda4.js:14034-14073 esm-layout
var V = (e) => k(new Uint8Array(ie(e) >> 3));
//@ chunk-2tyrgda4.js:14073-14099 esm-layout
var We = Xa(() => {
  E();
  Ee();
});
//@ chunk-2tyrgda4.js:14099-16294 esm-fingerprint
function Hr(e) {
  let t, r;
  switch (e.kty) {
    case "oct": {
      switch (e.alg) {
        case "HS256":
        case "HS384":
        case "HS512":
          ((t = { name: "HMAC", hash: `SHA-${e.alg.slice(-3)}` }), (r = ["sign", "verify"]));
          break;
        case "A128CBC-HS256":
        case "A192CBC-HS384":
        case "A256CBC-HS512":
          throw new f(`${e.alg} keys cannot be imported as CryptoKey instances`);
        case "A128GCM":
        case "A192GCM":
        case "A256GCM":
        case "A128GCMKW":
        case "A192GCMKW":
        case "A256GCMKW":
          ((t = { name: "AES-GCM" }), (r = ["encrypt", "decrypt"]));
          break;
        case "A128KW":
        case "A192KW":
        case "A256KW":
          ((t = { name: "AES-KW" }), (r = ["wrapKey", "unwrapKey"]));
          break;
        case "PBES2-HS256+A128KW":
        case "PBES2-HS384+A192KW":
        case "PBES2-HS512+A256KW":
          ((t = { name: "PBKDF2" }), (r = ["deriveBits"]));
          break;
        default:
          throw new f('Invalid or unsupported JWK "alg" (Algorithm) Parameter value');
      }
      break;
    }
    case "RSA": {
      switch (e.alg) {
        case "PS256":
        case "PS384":
        case "PS512":
          ((t = { name: "RSA-PSS", hash: `SHA-${e.alg.slice(-3)}` }), (r = e.d ? ["sign"] : ["verify"]));
          break;
        case "RS256":
        case "RS384":
        case "RS512":
          ((t = { name: "RSASSA-PKCS1-v1_5", hash: `SHA-${e.alg.slice(-3)}` }),
            (r = e.d ? ["sign"] : ["verify"]));
          break;
        case "RSA-OAEP":
        case "RSA-OAEP-256":
        case "RSA-OAEP-384":
        case "RSA-OAEP-512":
          ((t = { name: "RSA-OAEP", hash: `SHA-${parseInt(e.alg.slice(-3), 10) || 1}` }),
            (r = e.d ? ["decrypt", "unwrapKey"] : ["encrypt", "wrapKey"]));
          break;
        default:
          throw new f('Invalid or unsupported JWK "alg" (Algorithm) Parameter value');
      }
      break;
    }
    case "EC": {
      switch (e.alg) {
        case "ES256":
          ((t = { name: "ECDSA", namedCurve: "P-256" }), (r = e.d ? ["sign"] : ["verify"]));
          break;
        case "ES384":
          ((t = { name: "ECDSA", namedCurve: "P-384" }), (r = e.d ? ["sign"] : ["verify"]));
          break;
        case "ES512":
          ((t = { name: "ECDSA", namedCurve: "P-521" }), (r = e.d ? ["sign"] : ["verify"]));
          break;
        case "ECDH-ES":
        case "ECDH-ES+A128KW":
        case "ECDH-ES+A192KW":
        case "ECDH-ES+A256KW":
          ((t = { name: "ECDH", namedCurve: e.crv }), (r = e.d ? ["deriveBits"] : []));
          break;
        default:
          throw new f('Invalid or unsupported JWK "alg" (Algorithm) Parameter value');
      }
      break;
    }
    case "OKP": {
      switch (e.alg) {
        case "EdDSA":
          ((t = { name: e.crv }), (r = e.d ? ["sign"] : ["verify"]));
          break;
        case "ECDH-ES":
        case "ECDH-ES+A128KW":
        case "ECDH-ES+A192KW":
        case "ECDH-ES+A256KW":
          ((t = { name: e.crv }), (r = e.d ? ["deriveBits"] : []));
          break;
        default:
          throw new f('Invalid or unsupported JWK "alg" (Algorithm) Parameter value');
      }
      break;
    }
    default:
      throw new f('Invalid or unsupported JWK "kty" (Key Type) Parameter value');
  }
  return { algorithm: t, keyUsages: r };
}
//@ chunk-2tyrgda4.js:16294-16667 esm-fingerprint
var Wr = async (e) => {
    var t, r;
    if (!e.alg) throw TypeError('"alg" argument is required when "jwk.alg" is not present');
    let { algorithm: algorithm, keyUsages: keyUsages } = Hr(e),
      a = [
        algorithm,
        (t = e.ext) !== null && t !== void 0 ? t : !1,
        (r = e.key_ops) !== null && r !== void 0 ? r : keyUsages,
      ];
    if (algorithm.name === "PBKDF2") return p.subtle.importKey("raw", S(e.k), ...a);
    let i = { ...e };
    return (delete i.alg, delete i.use, p.subtle.importKey("jwk", i, ...a));
  },
  qe;

export { qe, Wr, We, V };
