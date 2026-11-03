/**
 * jose/dist/webapi/key/import.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-5h78gfwc.js (2)
 * attribution: esm-fingerprint 2
 */
import { St } from "../lib/asn1.js";
import { b } from "../lib/type_checks.js";
import { v_2 } from "../util/base64url.js";
import { f_2 } from "../../node/esm/util/errors.js";
import { Y } from "../lib/jwk_to_key.js";

//@ chunk-5h78gfwc.js:22492-22663 esm-fingerprint
async function importPKCS8(e, t, r) {
  if (typeof e !== "string" || e.indexOf("-----BEGIN PRIVATE KEY-----") !== 0)
    throw TypeError('"pkcs8" must be PKCS#8 formatted string');
  return St(e, t, r);
}
//@ chunk-5h78gfwc.js:22663-23388 esm-fingerprint
async function importJWK(e, t, r) {
  if (!b(e)) throw TypeError("JWK must be an object");
  let n;
  switch (((t ??= e.alg), (n ??= r?.extractable ?? e.ext), e.kty)) {
    case "oct":
      if (typeof e.k !== "string" || !e.k) throw TypeError('missing "k" (Key Value) Parameter value');
      return v_2(e.k);
    case "RSA":
      if ("oth" in e && e.oth !== void 0)
        throw new f_2('RSA JWK "oth" (Other Primes Info) Parameter value is not supported');
      return Y({ ...e, alg: t, ext: n });
    case "AKP": {
      if (typeof e.alg !== "string" || !e.alg) throw TypeError('missing "alg" (Algorithm) Parameter value');
      if (t !== void 0 && t !== e.alg) throw TypeError("JWK alg and alg option value mismatch");
      return Y({ ...e, ext: n });
    }
    case "EC":
    case "OKP":
      return Y({ ...e, alg: t, ext: n });
    default:
      throw new f_2('Unsupported "kty" (Key Type) Parameter value');
  }
}

export { importPKCS8, importJWK };
