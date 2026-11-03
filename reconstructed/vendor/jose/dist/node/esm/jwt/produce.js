/**
 * jose/dist/node/esm/jwt/produce.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (1)
 * attribution: esm-fingerprint 1
 */
import { K } from "../../../webapi/lib/validate.js";
import { epoch_2 } from "../../../webapi/lib/jwt_claims_set.js";
import { ct } from "../lib/secs.js";

//@ chunk-2tyrgda4.js:39526-40328 esm-fingerprint
class ProduceJWT {
  constructor(payload) {
    if (!K(payload)) throw TypeError("JWT Claims Set MUST be an object");
    this._payload = payload;
  }
  setIssuer(issuer) {
    this._payload = {
      ...this._payload,
      iss: issuer,
    };
    return this;
  }
  setSubject(subject) {
    this._payload = {
      ...this._payload,
      sub: subject,
    };
    return this;
  }
  setAudience(audience) {
    this._payload = {
      ...this._payload,
      aud: audience,
    };
    return this;
  }
  setJti(jwtId) {
    this._payload = {
      ...this._payload,
      jti: jwtId,
    };
    return this;
  }
  setNotBefore(input) {
    if (typeof input === "number")
      this._payload = {
        ...this._payload,
        nbf: input,
      };
    else
      this._payload = {
        ...this._payload,
        nbf: epoch_2(new Date()) + ct(input),
      };
    return this;
  }
  setExpirationTime(input) {
    if (typeof input === "number")
      this._payload = {
        ...this._payload,
        exp: input,
      };
    else
      this._payload = {
        ...this._payload,
        exp: epoch_2(new Date()) + ct(input),
      };
    return this;
  }
  setIssuedAt(input) {
    if (typeof input === "undefined")
      this._payload = {
        ...this._payload,
        iat: epoch_2(new Date()),
      };
    else
      this._payload = {
        ...this._payload,
        iat: input,
      };
    return this;
  }
}
export { ProduceJWT };
