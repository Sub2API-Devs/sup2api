/**
 * jose/dist/node/esm/jws/compact/sign.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { Xa } from "../../../../../../../runtime/bun-runtime.js";
import { P, E } from "../../../../webapi/lib/content_encryption.js";
import { kt, it } from "../flattened/sign.js";
import { oe } from "../../../../webapi/lib/validate.js";
import { v } from "../../../../browser/runtime/base64url.js";
import { se } from "../../../../browser/runtime/encrypt.js";
import { pe } from "../../../../webapi/lib/options.js";

//@ chunk-2tyrgda4.js:38428-38477 esm-layout
var jt = Xa(() => {
  P();
  kt();
  oe();
  E();
  v();
  se();
  pe();
});
//@ chunk-2tyrgda4.js:38477-38804 esm-fingerprint
class ve {
  constructor(e) {
    this._flattened = new it(e);
  }
  setProtectedHeader(e) {
    return (this._flattened.setProtectedHeader(e), this);
  }
  async sign(e, t) {
    let sign = await this._flattened.sign(e, t);
    if (sign.payload === void 0) throw TypeError("use the flattened module for creating JWS with b64: false");
    return `${sign.protected}.${sign.payload}.${sign.signature}`;
  }
}

export { jt, ve };
