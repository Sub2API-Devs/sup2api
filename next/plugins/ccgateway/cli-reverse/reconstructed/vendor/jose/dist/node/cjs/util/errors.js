/**
 * jose/dist/node/cjs/util/errors.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-5h78gfwc.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { __export } from "../../../../../../runtime/bun-runtime.js";
import {
  JOSEAlgNotAllowed,
  JOSEError,
  JOSENotSupported_2,
  JWEDecryptionFailed_2,
  JWEInvalid_2,
  JWKInvalid,
  JWKSInvalid,
  JWKSMultipleMatchingKeys,
  JWKSNoMatchingKey,
  JWKSTimeout,
  JWSInvalid_2,
  JWSSignatureVerificationFailed,
  JWTClaimValidationFailed,
  JWTExpired,
  JWTInvalid,
} from "../../esm/util/errors.js";

//@ chunk-5h78gfwc.js:227-238 esm-layout
var errors = {};
//@ chunk-5h78gfwc.js:238-588 esm-fingerprint
__export(errors, {
  JOSEAlgNotAllowed: () => JOSEAlgNotAllowed,
  JOSEError: () => JOSEError,
  JOSENotSupported: () => JOSENotSupported_2,
  JWEDecryptionFailed: () => JWEDecryptionFailed_2,
  JWEInvalid: () => JWEInvalid_2,
  JWKInvalid: () => JWKInvalid,
  JWKSInvalid: () => JWKSInvalid,
  JWKSMultipleMatchingKeys: () => JWKSMultipleMatchingKeys,
  JWKSNoMatchingKey: () => JWKSNoMatchingKey,
  JWKSTimeout: () => JWKSTimeout,
  JWSInvalid: () => JWSInvalid_2,
  JWSSignatureVerificationFailed: () => JWSSignatureVerificationFailed,
  JWTClaimValidationFailed: () => JWTClaimValidationFailed,
  JWTExpired: () => JWTExpired,
  JWTInvalid: () => JWTInvalid,
});
