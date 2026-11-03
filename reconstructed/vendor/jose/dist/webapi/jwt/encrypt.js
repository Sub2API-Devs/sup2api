/**
 * jose/dist/webapi/jwt/encrypt.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-5h78gfwc.js (1)
 * attribution: esm-fingerprint 1
 */
import { de } from "../lib/jwt_claims_set.js";
import { assertNotSet } from "../lib/helpers.js";
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
  constructor(payload = {}) {
    this.#i = new de(payload);
  }
  setIssuer(issuer) {
    this.#i.iss = issuer;
    return this;
  }
  setSubject(subject) {
    this.#i.sub = subject;
    return this;
  }
  setAudience(audience) {
    this.#i.aud = audience;
    return this;
  }
  setJti(jwtId) {
    this.#i.jti = jwtId;
    return this;
  }
  setNotBefore(input) {
    this.#i.nbf = input;
    return this;
  }
  setExpirationTime(input) {
    this.#i.exp = input;
    return this;
  }
  setIssuedAt(input) {
    this.#i.iat = input;
    return this;
  }
  setProtectedHeader(protectedHeader) {
    assertNotSet(this.#n, "setProtectedHeader");
    this.#n = protectedHeader;
    return this;
  }
  setKeyManagementParameters(parameters) {
    assertNotSet(this.#r, "setKeyManagementParameters");
    this.#r = parameters;
    return this;
  }
  setContentEncryptionKey(cek) {
    assertNotSet(this.#e, "setContentEncryptionKey");
    this.#e = cek;
    return this;
  }
  setInitializationVector(iv) {
    assertNotSet(this.#t, "setInitializationVector");
    this.#t = iv;
    return this;
  }
  replicateIssuerAsHeader() {
    this.#a = true;
    return this;
  }
  replicateSubjectAsHeader() {
    this.#o = true;
    return this;
  }
  replicateAudienceAsHeader() {
    this.#s = true;
    return this;
  }
  async encrypt(key, options) {
    let enc = new Ue(this.#i.data());
    if (this.#n && (this.#a || this.#o || this.#s))
      this.#n = {
        ...this.#n,
        iss: this.#a ? this.#i.iss : undefined,
        sub: this.#o ? this.#i.sub : undefined,
        aud: this.#s ? this.#i.aud : undefined,
      };
    enc.setProtectedHeader(this.#n);
    if (this.#t) enc.setInitializationVector(this.#t);
    if (this.#e) enc.setContentEncryptionKey(this.#e);
    if (this.#r) enc.setKeyManagementParameters(this.#r);
    return enc.encrypt(key, options);
  }
}
export { EncryptJWT };
