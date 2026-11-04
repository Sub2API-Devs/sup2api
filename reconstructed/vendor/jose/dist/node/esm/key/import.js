/**
 * jose/dist/node/esm/key/import.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (1)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { isPlainObject } from "../../../webapi/lib/validate.js";
import { parse_default } from "../../../browser/runtime/jwk_to_key.js";
import { decode } from "../../../browser/runtime/base64url.js";
import { JOSENotSupported } from "../../../webapi/lib/content_encryption.js";

//@ chunk-2tyrgda4.js:16702-17250 esm-fingerprint
async function importJWK(jwk, alg, octAsKeyObject) {
  var _a;
  if (!isPlainObject(jwk)) throw TypeError("JWK must be an object");
  switch ((alg || (alg = jwk.alg), jwk.kty)) {
    case "oct":
      if (typeof jwk.k !== "string" || !jwk.k) throw TypeError('missing "k" (Key Value) Parameter value');
      if (!(octAsKeyObject !== null && octAsKeyObject !== undefined)) octAsKeyObject = jwk.ext !== true;
      if (octAsKeyObject)
        return parse_default({
          ...jwk,
          alg,
          ext: (_a = jwk.ext) !== null && _a !== undefined ? _a : false,
        });
      return decode(jwk.k);
    case "RSA":
      if (jwk.oth !== undefined)
        throw new JOSENotSupported('RSA JWK "oth" (Other Primes Info) Parameter value is not supported');
    case "EC":
    case "OKP":
      return parse_default({
        ...jwk,
        alg,
      });
    default:
      throw new JOSENotSupported('Unsupported "kty" (Key Type) Parameter value');
  }
}
export { importJWK };
