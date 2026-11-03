/**
 * jose/dist/node/esm/jwk/thumbprint.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (2)
 * attribution: esm-fingerprint 2
 */
import { K } from "../../../webapi/lib/validate.js";
import { f, Ue } from "../../../webapi/lib/content_encryption.js";
import { l, encode } from "../../../browser/runtime/base64url.js";
import { ue } from "../../../webapi/lib/buffer_utils.js";

//@ chunk-2tyrgda4.js:40828-41683 esm-fingerprint
async function zr(jwk, digestAlgorithm) {
  if (!K(jwk)) throw TypeError("JWK must be an object");
  if (!(digestAlgorithm !== null && digestAlgorithm !== undefined)) digestAlgorithm = "sha256";
  if (digestAlgorithm !== "sha256" && digestAlgorithm !== "sha384" && digestAlgorithm !== "sha512")
    throw TypeError('digestAlgorithm must one of "sha256", "sha384", or "sha512"');
  let components;
  switch (jwk.kty) {
    case "EC":
      check(jwk.crv, '"crv" (Curve) Parameter');
      check(jwk.x, '"x" (X Coordinate) Parameter');
      check(jwk.y, '"y" (Y Coordinate) Parameter');
      components = {
        crv: jwk.crv,
        kty: jwk.kty,
        x: jwk.x,
        y: jwk.y,
      };
      break;
    case "OKP":
      check(jwk.crv, '"crv" (Subtype of Key Pair) Parameter');
      check(jwk.x, '"x" (Public Key) Parameter');
      components = {
        crv: jwk.crv,
        kty: jwk.kty,
        x: jwk.x,
      };
      break;
    case "RSA":
      check(jwk.e, '"e" (Exponent) Parameter');
      check(jwk.n, '"n" (Modulus) Parameter');
      components = {
        e: jwk.e,
        kty: jwk.kty,
        n: jwk.n,
      };
      break;
    case "oct":
      check(jwk.k, '"k" (Key Value) Parameter');
      components = {
        k: jwk.k,
        kty: jwk.kty,
      };
      break;
    default:
      throw new f('"kty" (Key Type) Parameter missing or unsupported');
  }
  let data = l.encode(JSON.stringify(components));
  return encode(await ue(digestAlgorithm, data));
}
//@ chunk-2tyrgda4.js:41683-41765 esm-fingerprint
var check = (value, description) => {
  if (typeof value !== "string" || !value) throw new Ue(`${description} missing or invalid`);
};
