/**
 * jose/dist/node/esm/key/import.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { Xa } from "../../../../../../runtime/bun-runtime.js";
import { init_buffer_utils } from "../../../webapi/lib/buffer_utils.js";
import {
  init_content_encryption_2,
  init_content_encryption,
  f,
} from "../../../webapi/lib/content_encryption.js";
import { parse_default, parse } from "../../../browser/runtime/jwk_to_key.js";
import { K } from "../../../webapi/lib/validate.js";
import { decode } from "../../../browser/runtime/base64url.js";

//@ chunk-2tyrgda4.js:16667-16702 esm-layout
var init_import = Xa(() => {
  init_buffer_utils();
  init_content_encryption_2();
  init_content_encryption();
  parse_default = parse;
});
//@ chunk-2tyrgda4.js:16702-17250 esm-fingerprint
async function Ze(jwk, alg, octAsKeyObject) {
  var _a;
  if (!K(jwk)) throw TypeError("JWK must be an object");
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
        throw new f('RSA JWK "oth" (Other Primes Info) Parameter value is not supported');
    case "EC":
    case "OKP":
      return parse_default({
        ...jwk,
        alg,
      });
    default:
      throw new f('Unsupported "kty" (Key Type) Parameter value');
  }
}
export { init_import, Ze };
