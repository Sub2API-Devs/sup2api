/**
 * jose/dist/node/esm/jwk/thumbprint.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (2)
 * attribution: esm-fingerprint 2
 */
import { K } from "../../../webapi/lib/validate.js";
import { f, Ue } from "../../../webapi/lib/content_encryption.js";
import { l, w } from "../../../browser/runtime/base64url.js";
import { ue } from "../../../webapi/lib/buffer_utils.js";

//@ chunk-2tyrgda4.js:40828-41683 esm-fingerprint
async function zr(e, t) {
  if (!K(e)) throw TypeError("JWK must be an object");
  if (((t !== null && t !== void 0) || (t = "sha256"), t !== "sha256" && t !== "sha384" && t !== "sha512"))
    throw TypeError('digestAlgorithm must one of "sha256", "sha384", or "sha512"');
  let r;
  switch (e.kty) {
    case "EC":
      (Y(e.crv, '"crv" (Curve) Parameter'),
        Y(e.x, '"x" (X Coordinate) Parameter'),
        Y(e.y, '"y" (Y Coordinate) Parameter'),
        (r = { crv: e.crv, kty: e.kty, x: e.x, y: e.y }));
      break;
    case "OKP":
      (Y(e.crv, '"crv" (Subtype of Key Pair) Parameter'),
        Y(e.x, '"x" (Public Key) Parameter'),
        (r = { crv: e.crv, kty: e.kty, x: e.x }));
      break;
    case "RSA":
      (Y(e.e, '"e" (Exponent) Parameter'),
        Y(e.n, '"n" (Modulus) Parameter'),
        (r = { e: e.e, kty: e.kty, n: e.n }));
      break;
    case "oct":
      (Y(e.k, '"k" (Key Value) Parameter'), (r = { k: e.k, kty: e.kty }));
      break;
    default:
      throw new f('"kty" (Key Type) Parameter missing or unsupported');
  }
  let encode = l.encode(JSON.stringify(r));
  return w(await ue(t, encode));
}
//@ chunk-2tyrgda4.js:41683-41765 esm-fingerprint
var Y = (e, t) => {
  if (typeof e !== "string" || !e) throw new Ue(`${t} missing or invalid`);
};
