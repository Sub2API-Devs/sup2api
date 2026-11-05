/**
 * jose/dist/node/esm/jwt/verify.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-0f6azspv.js (1)
 * attribution: esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { compactVerify } from "../jws/compact/verify.js";
import { JWTInvalid } from "../util/errors.js";
import { validateClaimsSet } from "../../../webapi/lib/jwt_claims_set.js";

//@ chunk-0f6azspv.js:44123-44434 esm-fingerprint
async function jwtVerify(jwt, key, options) {
  let verified = await compactVerify(jwt, key, options);
  if (verified.protectedHeader.crit?.includes("b64") && verified.protectedHeader.b64 === false)
    throw new JWTInvalid("JWTs MUST NOT use unencoded payload");
  let result = {
    payload: validateClaimsSet(verified.protectedHeader, verified.payload, options),
    protectedHeader: verified.protectedHeader,
  };
  if (typeof key === "function")
    return {
      ...result,
      key: verified.key,
    };
  return result;
}
export { jwtVerify };
