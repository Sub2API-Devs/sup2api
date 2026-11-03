/**
 * jose/dist/webapi/jwt/encrypt.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-5h78gfwc.js (1)
 * attribution: esm-fingerprint 1
 */
import { de } from "../lib/jwt_claims_set.js";
import { W } from "../lib/helpers.js";
import { Ue } from "../jwe/compact/encrypt.js";

//@ chunk-5h78gfwc.js:47558-48800 esm-fingerprint
class EncryptJWT {
  #e;
  #t;
  #r;
  #n;
  #a;
  #o;
  #s;
  #i;
  constructor(e = {}) {
    this.#i = new de(e);
  }
  setIssuer(e) {
    return ((this.#i.iss = e), this);
  }
  setSubject(e) {
    return ((this.#i.sub = e), this);
  }
  setAudience(e) {
    return ((this.#i.aud = e), this);
  }
  setJti(e) {
    return ((this.#i.jti = e), this);
  }
  setNotBefore(e) {
    return ((this.#i.nbf = e), this);
  }
  setExpirationTime(e) {
    return ((this.#i.exp = e), this);
  }
  setIssuedAt(e) {
    return ((this.#i.iat = e), this);
  }
  setProtectedHeader(e) {
    return (W(this.#n, "setProtectedHeader"), (this.#n = e), this);
  }
  setKeyManagementParameters(e) {
    return (W(this.#r, "setKeyManagementParameters"), (this.#r = e), this);
  }
  setContentEncryptionKey(e) {
    return (W(this.#e, "setContentEncryptionKey"), (this.#e = e), this);
  }
  setInitializationVector(e) {
    return (W(this.#t, "setInitializationVector"), (this.#t = e), this);
  }
  replicateIssuerAsHeader() {
    return ((this.#a = !0), this);
  }
  replicateSubjectAsHeader() {
    return ((this.#o = !0), this);
  }
  replicateAudienceAsHeader() {
    return ((this.#s = !0), this);
  }
  async encrypt(e, t) {
    let r = new Ue(this.#i.data());
    if (this.#n && (this.#a || this.#o || this.#s))
      this.#n = {
        ...this.#n,
        iss: this.#a ? this.#i.iss : void 0,
        sub: this.#o ? this.#i.sub : void 0,
        aud: this.#s ? this.#i.aud : void 0,
      };
    if ((r.setProtectedHeader(this.#n), this.#t)) r.setInitializationVector(this.#t);
    if (this.#e) r.setContentEncryptionKey(this.#e);
    if (this.#r) r.setKeyManagementParameters(this.#r);
    return r.encrypt(e, t);
  }
}

export { EncryptJWT };
