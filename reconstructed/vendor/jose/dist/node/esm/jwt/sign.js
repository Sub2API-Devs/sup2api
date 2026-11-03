/**
 * jose/dist/node/esm/jwt/sign.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (3)
 * attribution: esm-layout 2, esm-fingerprint 1
 */
import { Xa } from "../../../../../../runtime/bun-runtime.js";
import { er, init_secs } from "../lib/secs.js";
import { F, init_content_encryption_2, Te } from "../../../webapi/lib/content_encryption.js";
import { init_jwt_claims_set } from "../../../webapi/lib/jwt_claims_set.js";
import { init_base64url, l } from "../../../browser/runtime/base64url.js";
import { ProduceJWT } from "./produce.js";
import { CompactSign } from "../jws/compact/sign.js";

//@ chunk-2tyrgda4.js:40328-40359 esm-layout
var init_sign_3 = Xa(() => {
  er();
  F();
  init_secs();
});
//@ chunk-2tyrgda4.js:40359-40366 esm-layout
var or;
//@ chunk-2tyrgda4.js:40366-40828 esm-fingerprint
var init_sign_4 = Xa(() => {
  init_jwt_claims_set();
  init_content_encryption_2();
  init_base64url();
  init_sign_3();
  or = class or extends ProduceJWT {
    setProtectedHeader(protectedHeader) {
      this._protectedHeader = protectedHeader;
      return this;
    }
    async sign(key, options) {
      var _a;
      let sig = new CompactSign(l.encode(JSON.stringify(this._payload)));
      sig.setProtectedHeader(this._protectedHeader);
      if (
        Array.isArray((_a = this._protectedHeader) === null || _a === undefined ? undefined : _a.crit) &&
        this._protectedHeader.crit.includes("b64") &&
        this._protectedHeader.b64 === false
      )
        throw new Te("JWTs MUST NOT use unencoded payload");
      return sig.sign(key, options);
    }
  };
});
export { init_sign_4 };
