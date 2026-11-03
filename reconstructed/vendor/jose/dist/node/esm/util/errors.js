/**
 * jose/dist/node/esm/util/errors.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-5h78gfwc.js (15)
 * attribution: esm-fingerprint 15
 */

//@ chunk-5h78gfwc.js:4917-5104 esm-fingerprint
class JOSEError extends Error {
  static code = "ERR_JOSE_GENERIC";
  code = "ERR_JOSE_GENERIC";
  constructor(message, options) {
    super(message, options);
    this.name = this.constructor.name;
    Error.captureStackTrace?.(this, this.constructor);
  }
}
//@ chunk-5h78gfwc.js:5104-5367 esm-fingerprint
class JWTClaimValidationFailed extends JOSEError {
  static code = "ERR_JWT_CLAIM_VALIDATION_FAILED";
  code = "ERR_JWT_CLAIM_VALIDATION_FAILED";
  claim;
  reason;
  payload;
  constructor(message, payload, claim = "unspecified", reason = "unspecified") {
    super(message, {
      cause: {
        claim,
        reason,
        payload,
      },
    });
    this.claim = claim;
    this.reason = reason;
    this.payload = payload;
  }
}
//@ chunk-5h78gfwc.js:5367-5597 esm-fingerprint
class JWTExpired extends JOSEError {
  static code = "ERR_JWT_EXPIRED";
  code = "ERR_JWT_EXPIRED";
  claim;
  reason;
  payload;
  constructor(message, payload, claim = "unspecified", reason = "unspecified") {
    super(message, {
      cause: {
        claim,
        reason,
        payload,
      },
    });
    this.claim = claim;
    this.reason = reason;
    this.payload = payload;
  }
}
//@ chunk-5h78gfwc.js:5597-5686 esm-fingerprint
class JOSEAlgNotAllowed extends JOSEError {
  static code = "ERR_JOSE_ALG_NOT_ALLOWED";
  code = "ERR_JOSE_ALG_NOT_ALLOWED";
}
//@ chunk-5h78gfwc.js:5686-5771 esm-fingerprint
class JOSENotSupported extends JOSEError {
  static code = "ERR_JOSE_NOT_SUPPORTED";
  code = "ERR_JOSE_NOT_SUPPORTED";
}
//@ chunk-5h78gfwc.js:5771-5921 esm-fingerprint
class JWEDecryptionFailed extends JOSEError {
  static code = "ERR_JWE_DECRYPTION_FAILED";
  code = "ERR_JWE_DECRYPTION_FAILED";
  constructor(message = "decryption operation failed", options) {
    super(message, options);
  }
}
//@ chunk-5h78gfwc.js:5921-5992 esm-fingerprint
class JWEInvalid extends JOSEError {
  static code = "ERR_JWE_INVALID";
  code = "ERR_JWE_INVALID";
}
//@ chunk-5h78gfwc.js:5992-6063 esm-fingerprint
class JWSInvalid extends JOSEError {
  static code = "ERR_JWS_INVALID";
  code = "ERR_JWS_INVALID";
}
//@ chunk-5h78gfwc.js:6063-6134 esm-fingerprint
class JWTInvalid extends JOSEError {
  static code = "ERR_JWT_INVALID";
  code = "ERR_JWT_INVALID";
}
//@ chunk-5h78gfwc.js:6134-6206 esm-fingerprint
class JWKInvalid extends JOSEError {
  static code = "ERR_JWK_INVALID";
  code = "ERR_JWK_INVALID";
}
//@ chunk-5h78gfwc.js:6206-6280 esm-fingerprint
class JWKSInvalid extends JOSEError {
  static code = "ERR_JWKS_INVALID";
  code = "ERR_JWKS_INVALID";
}
//@ chunk-5h78gfwc.js:6280-6449 esm-fingerprint
class JWKSNoMatchingKey extends JOSEError {
  static code = "ERR_JWKS_NO_MATCHING_KEY";
  code = "ERR_JWKS_NO_MATCHING_KEY";
  constructor(message = "no applicable key found in the JSON Web Key Set", options) {
    super(message, options);
  }
}
//@ chunk-5h78gfwc.js:6449-6660 esm-fingerprint
class JWKSMultipleMatchingKeys extends JOSEError {
  [Symbol.asyncIterator];
  static code = "ERR_JWKS_MULTIPLE_MATCHING_KEYS";
  code = "ERR_JWKS_MULTIPLE_MATCHING_KEYS";
  constructor(message = "multiple matching keys found in the JSON Web Key Set", options) {
    super(message, options);
  }
}
//@ chunk-5h78gfwc.js:6660-6783 esm-fingerprint
class JWKSTimeout extends JOSEError {
  static code = "ERR_JWKS_TIMEOUT";
  code = "ERR_JWKS_TIMEOUT";
  constructor(message = "request timed out", options) {
    super(message, options);
  }
}
//@ chunk-5h78gfwc.js:6783-6960 esm-fingerprint
class JWSSignatureVerificationFailed extends JOSEError {
  static code = "ERR_JWS_SIGNATURE_VERIFICATION_FAILED";
  code = "ERR_JWS_SIGNATURE_VERIFICATION_FAILED";
  constructor(message = "signature verification failed", options) {
    super(message, options);
  }
}
export {
  JWTClaimValidationFailed,
  JOSENotSupported,
  JWEInvalid,
  JWEDecryptionFailed,
  JWSInvalid,
  JWTInvalid,
  JWTExpired,
  JOSEAlgNotAllowed,
  JOSEError,
  JWKInvalid,
  JWKSInvalid,
  JWKSMultipleMatchingKeys,
  JWKSNoMatchingKey,
  JWKSTimeout,
  JWSSignatureVerificationFailed,
};
