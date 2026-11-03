/**
 * jose/dist/node/esm/jwt/produce.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (1)
 * attribution: esm-fingerprint 1
 */
import { K } from "../../../webapi/lib/validate.js";
import { Pe } from "../../../webapi/lib/jwt_claims_set.js";
import { ct } from "../lib/secs.js";

//@ chunk-2tyrgda4.js:39526-40328 esm-fingerprint
class pt {
  constructor(e) {
    if (!K(e)) throw TypeError("JWT Claims Set MUST be an object");
    this._payload = e;
  }
  setIssuer(e) {
    return ((this._payload = { ...this._payload, iss: e }), this);
  }
  setSubject(e) {
    return ((this._payload = { ...this._payload, sub: e }), this);
  }
  setAudience(e) {
    return ((this._payload = { ...this._payload, aud: e }), this);
  }
  setJti(e) {
    return ((this._payload = { ...this._payload, jti: e }), this);
  }
  setNotBefore(e) {
    if (typeof e === "number") this._payload = { ...this._payload, nbf: e };
    else this._payload = { ...this._payload, nbf: Pe(new Date()) + ct(e) };
    return this;
  }
  setExpirationTime(e) {
    if (typeof e === "number") this._payload = { ...this._payload, exp: e };
    else this._payload = { ...this._payload, exp: Pe(new Date()) + ct(e) };
    return this;
  }
  setIssuedAt(e) {
    if (typeof e > "u") this._payload = { ...this._payload, iat: Pe(new Date()) };
    else this._payload = { ...this._payload, iat: e };
    return this;
  }
}

export { pt };
