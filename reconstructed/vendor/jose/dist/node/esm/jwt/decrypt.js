/**
 * jose/dist/node/esm/jwt/decrypt.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-5h78gfwc.js (1)
 * attribution: esm-fingerprint 1
 */
import { Jt } from "../jwe/compact/decrypt.js";
import { Ae } from "../../../webapi/lib/jwt_claims_set.js";
import { z5 } from "../util/errors.js";

//@ chunk-5h78gfwc.js:44434-45018 esm-fingerprint
async function jwtDecrypt(e, t, r) {
  let n = await Jt(e, t, r),
    i = Ae(n.protectedHeader, n.plaintext, r),
    { protectedHeader: protectedHeader } = n;
  if (protectedHeader.iss !== void 0 && protectedHeader.iss !== i.iss)
    throw new z5('replicated "iss" claim header parameter mismatch', i, "iss", "mismatch");
  if (protectedHeader.sub !== void 0 && protectedHeader.sub !== i.sub)
    throw new z5('replicated "sub" claim header parameter mismatch', i, "sub", "mismatch");
  if (protectedHeader.aud !== void 0 && JSON.stringify(protectedHeader.aud) !== JSON.stringify(i.aud))
    throw new z5('replicated "aud" claim header parameter mismatch', i, "aud", "mismatch");
  let a = { payload: i, protectedHeader: protectedHeader };
  if (typeof t === "function") return { ...a, key: n.key };
  return a;
}

export { jwtDecrypt };
