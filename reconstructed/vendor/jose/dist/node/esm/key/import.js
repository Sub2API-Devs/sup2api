/**
 * jose/dist/node/esm/key/import.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { Xa } from "../../../../../../runtime/bun-runtime.js";
import { W } from "../../../webapi/lib/buffer_utils.js";
import { E, P, f } from "../../../webapi/lib/content_encryption.js";
import { qe, Wr } from "../../../browser/runtime/jwk_to_key.js";
import { K } from "../../../webapi/lib/validate.js";
import { S } from "../../../browser/runtime/base64url.js";

//@ chunk-2tyrgda4.js:16667-16702 esm-layout
var Jt = Xa(() => {
  W();
  E();
  P();
  qe = Wr;
});
//@ chunk-2tyrgda4.js:16702-17250 esm-fingerprint
async function Ze(e, t, r) {
  var o;
  if (!K(e)) throw TypeError("JWK must be an object");
  switch ((t || (t = e.alg), e.kty)) {
    case "oct":
      if (typeof e.k !== "string" || !e.k) throw TypeError('missing "k" (Key Value) Parameter value');
      if (((r !== null && r !== void 0) || (r = e.ext !== !0), r))
        return qe({ ...e, alg: t, ext: (o = e.ext) !== null && o !== void 0 ? o : !1 });
      return S(e.k);
    case "RSA":
      if (e.oth !== void 0) throw new f('RSA JWK "oth" (Other Primes Info) Parameter value is not supported');
    case "EC":
    case "OKP":
      return qe({ ...e, alg: t });
    default:
      throw new f('Unsupported "kty" (Key Type) Parameter value');
  }
}

export { Jt, Ze };
