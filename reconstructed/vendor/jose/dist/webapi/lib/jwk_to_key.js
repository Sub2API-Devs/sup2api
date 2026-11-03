/**
 * jose/dist/webapi/lib/jwk_to_key.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-5h78gfwc.js (3)
 * attribution: esm-fingerprint 3
 */
import { f_2 } from "../../node/esm/util/errors.js";

//@ chunk-5h78gfwc.js:16138-16208 esm-fingerprint
var Ee = 'Invalid or unsupported JWK "alg" (Algorithm) Parameter value';
//@ chunk-5h78gfwc.js:16208-17603 esm-fingerprint
function jt(e) {
  let t, r;
  switch (e.kty) {
    case "AKP": {
      switch (e.alg) {
        case "ML-DSA-44":
        case "ML-DSA-65":
        case "ML-DSA-87":
          ((t = { name: e.alg }), (r = e.priv ? ["sign"] : ["verify"]));
          break;
        default:
          throw new f_2(Ee);
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
          throw new f_2(Ee);
      }
      break;
    }
    case "EC": {
      switch (e.alg) {
        case "ES256":
        case "ES384":
        case "ES512":
          ((t = { name: "ECDSA", namedCurve: { ES256: "P-256", ES384: "P-384", ES512: "P-521" }[e.alg] }),
            (r = e.d ? ["sign"] : ["verify"]));
          break;
        case "ECDH-ES":
        case "ECDH-ES+A128KW":
        case "ECDH-ES+A192KW":
        case "ECDH-ES+A256KW":
          ((t = { name: "ECDH", namedCurve: e.crv }), (r = e.d ? ["deriveBits"] : []));
          break;
        default:
          throw new f_2(Ee);
      }
      break;
    }
    case "OKP": {
      switch (e.alg) {
        case "Ed25519":
        case "EdDSA":
          ((t = { name: "Ed25519" }), (r = e.d ? ["sign"] : ["verify"]));
          break;
        case "ECDH-ES":
        case "ECDH-ES+A128KW":
        case "ECDH-ES+A192KW":
        case "ECDH-ES+A256KW":
          ((t = { name: e.crv }), (r = e.d ? ["deriveBits"] : []));
          break;
        default:
          throw new f_2(Ee);
      }
      break;
    }
    default:
      throw new f_2('Invalid or unsupported JWK "kty" (Key Type) Parameter value');
  }
  return { algorithm: t, keyUsages: r };
}
//@ chunk-5h78gfwc.js:17603-17878 esm-fingerprint
async function Y(e) {
  if (!e.alg) throw TypeError('"alg" argument is required when "jwk.alg" is not present');
  let { algorithm: algorithm, keyUsages: keyUsages } = jt(e),
    n = { ...e };
  if (n.kty !== "AKP") delete n.alg;
  return (
    delete n.use,
    crypto.subtle.importKey("jwk", n, algorithm, e.ext ?? (e.d || e.priv ? !1 : !0), e.key_ops ?? keyUsages)
  );
}

export { Y };
