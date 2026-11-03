/**
 * jose/dist/node/cjs/util/errors.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-5h78gfwc.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { Ar } from "../../../../../../runtime/bun-runtime.js";
import { z, x, f_2, k_2, c, $e, Ge, ze, Ve, Fe, h, me, z5, j, O } from "../../esm/util/errors.js";

//@ chunk-5h78gfwc.js:227-238 esm-layout
var errors = {};
//@ chunk-5h78gfwc.js:238-588 esm-fingerprint
Ar(errors, {
  JOSEAlgNotAllowed: () => z,
  JOSEError: () => x,
  JOSENotSupported: () => f_2,
  JWEDecryptionFailed: () => k_2,
  JWEInvalid: () => c,
  JWKInvalid: () => $e,
  JWKSInvalid: () => Ge,
  JWKSMultipleMatchingKeys: () => ze,
  JWKSNoMatchingKey: () => Ve,
  JWKSTimeout: () => Fe,
  JWSInvalid: () => h,
  JWSSignatureVerificationFailed: () => me,
  JWTClaimValidationFailed: () => z5,
  JWTExpired: () => j,
  JWTInvalid: () => O,
});
