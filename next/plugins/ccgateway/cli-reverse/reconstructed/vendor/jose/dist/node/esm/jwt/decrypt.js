/**
 * jose/dist/node/esm/jwt/decrypt.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-5h78gfwc.js (1)
 * attribution: esm-fingerprint 1
 */
import { compactDecrypt_2 } from "../jwe/compact/decrypt.js";
import { validateClaimsSet } from "../../../webapi/lib/jwt_claims_set.js";
import { JWTClaimValidationFailed } from "../util/errors.js";

//@ chunk-5h78gfwc.js:44434-45018 esm-fingerprint
async function jwtDecrypt(jwt, key, options) {
  let decrypted = await compactDecrypt_2(jwt, key, options);
  let payload = validateClaimsSet(decrypted.protectedHeader, decrypted.plaintext, options);
  let { protectedHeader } = decrypted;
  if (protectedHeader.iss !== undefined && protectedHeader.iss !== payload.iss)
    throw new JWTClaimValidationFailed(
      'replicated "iss" claim header parameter mismatch',
      payload,
      "iss",
      "mismatch",
    );
  if (protectedHeader.sub !== undefined && protectedHeader.sub !== payload.sub)
    throw new JWTClaimValidationFailed(
      'replicated "sub" claim header parameter mismatch',
      payload,
      "sub",
      "mismatch",
    );
  if (
    protectedHeader.aud !== undefined &&
    JSON.stringify(protectedHeader.aud) !== JSON.stringify(payload.aud)
  )
    throw new JWTClaimValidationFailed(
      'replicated "aud" claim header parameter mismatch',
      payload,
      "aud",
      "mismatch",
    );
  let result = {
    payload,
    protectedHeader,
  };
  if (typeof key === "function")
    return {
      ...result,
      key: decrypted.key,
    };
  return result;
}
export { jwtDecrypt };
