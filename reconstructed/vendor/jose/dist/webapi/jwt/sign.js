/**
 * jose/dist/webapi/jwt/sign.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-5h78gfwc.js (1)
 * attribution: esm-fingerprint 1
 */
import { JWTClaimsSetVerifier } from "../lib/jwt_claims_set.js";
import { CompactSign } from "../jws/compact/sign.js";
import { JWTInvalid } from "../../node/esm/util/errors.js";

//@ chunk-5h78gfwc.js:46950-47558 esm-fingerprint
class SignJWT {
  #e;
  #t;
  constructor(payload = {}) {
    this.#t = new JWTClaimsSetVerifier(payload);
  }
  setIssuer(issuer) {
    this.#t.iss = issuer;
    return this;
  }
  setSubject(subject) {
    this.#t.sub = subject;
    return this;
  }
  setAudience(audience) {
    this.#t.aud = audience;
    return this;
  }
  setJti(jwtId) {
    this.#t.jti = jwtId;
    return this;
  }
  setNotBefore(input) {
    this.#t.nbf = input;
    return this;
  }
  setExpirationTime(input) {
    this.#t.exp = input;
    return this;
  }
  setIssuedAt(input) {
    this.#t.iat = input;
    return this;
  }
  setProtectedHeader(protectedHeader) {
    this.#e = protectedHeader;
    return this;
  }
  async sign(key, options) {
    let sig = new CompactSign(this.#t.data());
    sig.setProtectedHeader(this.#e);
    if (Array.isArray(this.#e?.crit) && this.#e.crit.includes("b64") && this.#e.b64 === false)
      throw new JWTInvalid("JWTs MUST NOT use unencoded payload");
    return sig.sign(key, options);
  }
}
export { SignJWT };
