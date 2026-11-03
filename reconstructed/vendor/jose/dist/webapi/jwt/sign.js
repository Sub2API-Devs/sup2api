/**
 * jose/dist/webapi/jwt/sign.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-5h78gfwc.js (1)
 * attribution: esm-fingerprint 1
 */
import { de } from "../lib/jwt_claims_set.js";
import { Me } from "../jws/compact/sign.js";
import { O } from "../../node/esm/util/errors.js";

//@ chunk-5h78gfwc.js:46950-47558 esm-fingerprint
class SignJWT {
  #e;
  #t;
  constructor(e = {}) {
    this.#t = new de(e);
  }
  setIssuer(e) {
    return ((this.#t.iss = e), this);
  }
  setSubject(e) {
    return ((this.#t.sub = e), this);
  }
  setAudience(e) {
    return ((this.#t.aud = e), this);
  }
  setJti(e) {
    return ((this.#t.jti = e), this);
  }
  setNotBefore(e) {
    return ((this.#t.nbf = e), this);
  }
  setExpirationTime(e) {
    return ((this.#t.exp = e), this);
  }
  setIssuedAt(e) {
    return ((this.#t.iat = e), this);
  }
  setProtectedHeader(e) {
    return ((this.#e = e), this);
  }
  async sign(e, t) {
    let r = new Me(this.#t.data());
    if (
      (r.setProtectedHeader(this.#e),
      Array.isArray(this.#e?.crit) && this.#e.crit.includes("b64") && this.#e.b64 === !1)
    )
      throw new O("JWTs MUST NOT use unencoded payload");
    return r.sign(e, t);
  }
}

export { SignJWT };
