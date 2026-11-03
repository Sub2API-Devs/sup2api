/**
 * jose/dist/node/esm/jwt/verify.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-5h78gfwc.js (1)
 * attribution: esm-fingerprint 1
 */
import { Tt } from "../jws/compact/verify.js";
import { O } from "../util/errors.js";
import { Ae } from "../../../webapi/lib/jwt_claims_set.js";

//@ chunk-5h78gfwc.js:44123-44434 esm-fingerprint
async function jwtVerify(e, t, r) {
  let n = await Tt(e, t, r);
  if (n.protectedHeader.crit?.includes("b64") && n.protectedHeader.b64 === !1)
    throw new O("JWTs MUST NOT use unencoded payload");
  let o = { payload: Ae(n.protectedHeader, n.payload, r), protectedHeader: n.protectedHeader };
  if (typeof t === "function") return { ...o, key: n.key };
  return o;
}

export { jwtVerify };
