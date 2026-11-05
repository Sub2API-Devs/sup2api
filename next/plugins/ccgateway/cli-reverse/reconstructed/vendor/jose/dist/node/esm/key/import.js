/**
 * jose/dist/node/esm/key/import.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-pd6th42n.js (1)
 * attribution: esm-layout 1, esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isPlainObject } from "../../../webapi/lib/validate.js";
import { parse_default } from "../../../browser/runtime/jwk_to_key.js";
import { decode_2 } from "../../../browser/runtime/base64url.js";
import { JOSENotSupported_3 } from "../../../webapi/lib/content_encryption.js";

//@ chunk-pd6th42n.js:16702-17250 esm-fingerprint
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
      return decode_2(jwk.k);
    case "RSA":
      if (jwk.oth !== undefined)
        throw new JOSENotSupported_3('RSA JWK "oth" (Other Primes Info) Parameter value is not supported');
    case "EC":
    case "OKP":
      return parse_default({
        ...jwk,
        alg,
      });
    default:
      throw new JOSENotSupported_3('Unsupported "kty" (Key Type) Parameter value');
  }
}
export { importJWK };
