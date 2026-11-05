/**
 * jose/dist/webapi/key/import.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-0f6azspv.js (2)
 * attribution: esm-fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { fromPKCS8 } from "../lib/asn1.js";
import { isObject } from "../lib/type_checks.js";
import { decode } from "../util/base64url.js";
import { JOSENotSupported_2 } from "../../node/esm/util/errors.js";
import { jwkToKey } from "../lib/jwk_to_key.js";

//@ chunk-0f6azspv.js:22492-22663 esm-fingerprint
async function importPKCS8(spki, alg, options) {
  if (typeof spki !== "string" || spki.indexOf("-----BEGIN PRIVATE KEY-----") !== 0)
    throw TypeError('"pkcs8" must be PKCS#8 formatted string');
  return fromPKCS8(spki, alg, options);
}
//@ chunk-0f6azspv.js:22663-23388 esm-fingerprint
async function importJWK(jwk, alg, options) {
  if (!isObject(jwk)) throw TypeError("JWK must be an object");
  let ext;
  switch (((alg ??= jwk.alg), (ext ??= options?.extractable ?? jwk.ext), jwk.kty)) {
    case "oct":
      if (typeof jwk.k !== "string" || !jwk.k) throw TypeError('missing "k" (Key Value) Parameter value');
      return decode(jwk.k);
    case "RSA":
      if ("oth" in jwk && jwk.oth !== undefined)
        throw new JOSENotSupported_2('RSA JWK "oth" (Other Primes Info) Parameter value is not supported');
      return jwkToKey({
        ...jwk,
        alg,
        ext,
      });
    case "AKP": {
      if (typeof jwk.alg !== "string" || !jwk.alg)
        throw TypeError('missing "alg" (Algorithm) Parameter value');
      if (alg !== undefined && alg !== jwk.alg) throw TypeError("JWK alg and alg option value mismatch");
      return jwkToKey({
        ...jwk,
        ext,
      });
    }
    case "EC":
    case "OKP":
      return jwkToKey({
        ...jwk,
        alg,
        ext,
      });
    default:
      throw new JOSENotSupported_2('Unsupported "kty" (Key Type) Parameter value');
  }
}
export { importJWK, importPKCS8 };
