/**
 * jose/dist/node/esm/jwt/sign.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-pd6th42n.js (3)
 * attribution: esm-layout 2, esm-fingerprint 1
 */
import { __esm } from "../../../../../../runtime/bun-runtime.js";
import { noopJwtClaims, init_secs } from "../lib/secs.js";
import { noopClaims, init_content_encryption_2, JWTInvalid } from "../../../webapi/lib/content_encryption.js";
import { init_jwt_claims_set } from "../../../webapi/lib/jwt_claims_set.js";
import { init_base64url, encoder } from "../../../browser/runtime/base64url.js";
import { ProduceJWT } from "./produce.js";
import { CompactSign } from "../jws/compact/sign.js";

//@ chunk-pd6th42n.js:40328-40359 esm-layout
var init_sign_3 = __esm(() => {
  noopJwtClaims();
  noopClaims();
  init_secs();
});
//@ chunk-pd6th42n.js:40359-40366 esm-layout
var SignJWT;
//@ chunk-pd6th42n.js:40366-40828 esm-fingerprint
var init_sign_4 = __esm(() => {
  init_jwt_claims_set();
  init_content_encryption_2();
  init_base64url();
  init_sign_3();
  SignJWT = class SignJWT extends ProduceJWT {
    setProtectedHeader(protectedHeader) {
      this._protectedHeader = protectedHeader;
      return this;
    }
    async sign(key, options) {
      var _a;
      let sig = new CompactSign(encoder.encode(JSON.stringify(this._payload)));
      sig.setProtectedHeader(this._protectedHeader);
      if (
        Array.isArray((_a = this._protectedHeader) === null || _a === undefined ? undefined : _a.crit) &&
        this._protectedHeader.crit.includes("b64") &&
        this._protectedHeader.b64 === false
      )
        throw new JWTInvalid("JWTs MUST NOT use unencoded payload");
      return sig.sign(key, options);
    }
  };
});
export { init_sign_4, SignJWT };
