/**
 * jose/dist/node/esm/util/errors.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-5h78gfwc.js (15)
 * attribution: esm-fingerprint 15
 */

//@ chunk-5h78gfwc.js:4917-5104 esm-fingerprint
class x extends Error {
  static code = "ERR_JOSE_GENERIC";
  code = "ERR_JOSE_GENERIC";
  constructor(e, t) {
    super(e, t);
    ((this.name = this.constructor.name), Error.captureStackTrace?.(this, this.constructor));
  }
}
//@ chunk-5h78gfwc.js:5104-5367 esm-fingerprint
class z5 extends x {
  static code = "ERR_JWT_CLAIM_VALIDATION_FAILED";
  code = "ERR_JWT_CLAIM_VALIDATION_FAILED";
  claim;
  reason;
  payload;
  constructor(e, t, r = "unspecified", n = "unspecified") {
    super(e, { cause: { claim: r, reason: n, payload: t } });
    ((this.claim = r), (this.reason = n), (this.payload = t));
  }
}
//@ chunk-5h78gfwc.js:5367-5597 esm-fingerprint
class j extends x {
  static code = "ERR_JWT_EXPIRED";
  code = "ERR_JWT_EXPIRED";
  claim;
  reason;
  payload;
  constructor(e, t, r = "unspecified", n = "unspecified") {
    super(e, { cause: { claim: r, reason: n, payload: t } });
    ((this.claim = r), (this.reason = n), (this.payload = t));
  }
}
//@ chunk-5h78gfwc.js:5597-5686 esm-fingerprint
class z extends x {
  static code = "ERR_JOSE_ALG_NOT_ALLOWED";
  code = "ERR_JOSE_ALG_NOT_ALLOWED";
}
//@ chunk-5h78gfwc.js:5686-5771 esm-fingerprint
class f_2 extends x {
  static code = "ERR_JOSE_NOT_SUPPORTED";
  code = "ERR_JOSE_NOT_SUPPORTED";
}
//@ chunk-5h78gfwc.js:5771-5921 esm-fingerprint
class k_2 extends x {
  static code = "ERR_JWE_DECRYPTION_FAILED";
  code = "ERR_JWE_DECRYPTION_FAILED";
  constructor(e = "decryption operation failed", t) {
    super(e, t);
  }
}
//@ chunk-5h78gfwc.js:5921-5992 esm-fingerprint
class c extends x {
  static code = "ERR_JWE_INVALID";
  code = "ERR_JWE_INVALID";
}
//@ chunk-5h78gfwc.js:5992-6063 esm-fingerprint
class h extends x {
  static code = "ERR_JWS_INVALID";
  code = "ERR_JWS_INVALID";
}
//@ chunk-5h78gfwc.js:6063-6134 esm-fingerprint
class O extends x {
  static code = "ERR_JWT_INVALID";
  code = "ERR_JWT_INVALID";
}
//@ chunk-5h78gfwc.js:6134-6206 esm-fingerprint
class $e extends x {
  static code = "ERR_JWK_INVALID";
  code = "ERR_JWK_INVALID";
}
//@ chunk-5h78gfwc.js:6206-6280 esm-fingerprint
class Ge extends x {
  static code = "ERR_JWKS_INVALID";
  code = "ERR_JWKS_INVALID";
}
//@ chunk-5h78gfwc.js:6280-6449 esm-fingerprint
class Ve extends x {
  static code = "ERR_JWKS_NO_MATCHING_KEY";
  code = "ERR_JWKS_NO_MATCHING_KEY";
  constructor(e = "no applicable key found in the JSON Web Key Set", t) {
    super(e, t);
  }
}
//@ chunk-5h78gfwc.js:6449-6660 esm-fingerprint
class ze extends x {
  [Symbol.asyncIterator];
  static code = "ERR_JWKS_MULTIPLE_MATCHING_KEYS";
  code = "ERR_JWKS_MULTIPLE_MATCHING_KEYS";
  constructor(e = "multiple matching keys found in the JSON Web Key Set", t) {
    super(e, t);
  }
}
//@ chunk-5h78gfwc.js:6660-6783 esm-fingerprint
class Fe extends x {
  static code = "ERR_JWKS_TIMEOUT";
  code = "ERR_JWKS_TIMEOUT";
  constructor(e = "request timed out", t) {
    super(e, t);
  }
}
//@ chunk-5h78gfwc.js:6783-6960 esm-fingerprint
class me extends x {
  static code = "ERR_JWS_SIGNATURE_VERIFICATION_FAILED";
  code = "ERR_JWS_SIGNATURE_VERIFICATION_FAILED";
  constructor(e = "signature verification failed", t) {
    super(e, t);
  }
}

export { z5, f_2, c, k_2, h, O, j, z, x, $e, Ge, ze, Ve, Fe, me };
