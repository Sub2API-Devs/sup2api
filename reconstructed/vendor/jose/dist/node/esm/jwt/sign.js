/**
 * jose/dist/node/esm/jwt/sign.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (3)
 * attribution: esm-layout 2, esm-fingerprint 1
 */
import { Xa } from "../../../../../../runtime/bun-runtime.js";
import { er, tr } from "../lib/secs.js";
import { F, E, Te } from "../../../webapi/lib/content_encryption.js";
import { st } from "../../../webapi/lib/jwt_claims_set.js";
import { v, l } from "../../../browser/runtime/base64url.js";
import { pt } from "./produce.js";
import { ve } from "../jws/compact/sign.js";

//@ chunk-2tyrgda4.js:40328-40359 esm-layout
var rr = Xa(() => {
  er();
  F();
  tr();
});
//@ chunk-2tyrgda4.js:40359-40366 esm-layout
var or;
//@ chunk-2tyrgda4.js:40366-40828 esm-fingerprint
var nr = Xa(() => {
  st();
  E();
  v();
  rr();
  or = class or extends pt {
    setProtectedHeader(e) {
      return ((this._protectedHeader = e), this);
    }
    async sign(e, t) {
      var r;
      let o = new ve(l.encode(JSON.stringify(this._payload)));
      if (
        (o.setProtectedHeader(this._protectedHeader),
        Array.isArray((r = this._protectedHeader) === null || r === void 0 ? void 0 : r.crit) &&
          this._protectedHeader.crit.includes("b64") &&
          this._protectedHeader.b64 === !1)
      )
        throw new Te("JWTs MUST NOT use unencoded payload");
      return o.sign(e, t);
    }
  };
});

export { nr };
