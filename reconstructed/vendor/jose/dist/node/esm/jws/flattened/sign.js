/**
 * jose/dist/node/esm/jws/flattened/sign.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { Xa } from "../../../../../../../runtime/bun-runtime.js";
import { tt } from "../../../../browser/runtime/get_sign_verify_key.js";
import { W } from "../../../../webapi/lib/buffer_utils.js";
import { He } from "../../../../browser/runtime/rsaes.js";
import { rt, Qt, Fr } from "../../../../webapi/lib/signing.js";
import { y } from "../../../../webapi/lib/content_encryption.js";
import { G } from "../../../../webapi/lib/validate.js";
import { X } from "../../../../webapi/lib/options.js";
import { z } from "../../lib/check_key_type.js";
import { l, w, C } from "../../../../browser/runtime/base64url.js";
import { _ } from "../../lib/buffer_utils.js";

//@ chunk-2tyrgda4.js:36849-36891 esm-layout
var kt = Xa(() => {
  tt();
  W();
  He();
  rt();
  Qt = Fr;
});
//@ chunk-2tyrgda4.js:36891-38428 esm-fingerprint
class it {
  constructor(e) {
    if (!(e instanceof Uint8Array)) throw TypeError("payload must be an instance of Uint8Array");
    this._payload = e;
  }
  setProtectedHeader(e) {
    if (this._protectedHeader) throw TypeError("setProtectedHeader can only be called once");
    return ((this._protectedHeader = e), this);
  }
  setUnprotectedHeader(e) {
    if (this._unprotectedHeader) throw TypeError("setUnprotectedHeader can only be called once");
    return ((this._unprotectedHeader = e), this);
  }
  async sign(e, t) {
    if (!this._protectedHeader && !this._unprotectedHeader)
      throw new y("either setProtectedHeader or setUnprotectedHeader must be called before #sign()");
    if (!G(this._protectedHeader, this._unprotectedHeader))
      throw new y("JWS Protected and JWS Unprotected Header Parameter names must be disjoint");
    let r = { ...this._protectedHeader, ...this._unprotectedHeader },
      o = X(
        y,
        new Map([["b64", !0]]),
        t === null || t === void 0 ? void 0 : t.crit,
        this._protectedHeader,
        r,
      ),
      n = !0;
    if (o.has("b64")) {
      if (((n = this._protectedHeader.b64), typeof n !== "boolean"))
        throw new y('The "b64" (base64url-encode payload) Header Parameter must be a boolean');
    }
    let { alg: alg } = r;
    if (typeof alg !== "string" || !alg)
      throw new y('JWS "alg" (Algorithm) Header Parameter missing or invalid');
    z(alg, e, "sign");
    let _payload = this._payload;
    if (n) _payload = l.encode(w(_payload));
    let c;
    if (this._protectedHeader) c = l.encode(w(JSON.stringify(this._protectedHeader)));
    else c = l.encode("");
    let d = _(c, l.encode("."), _payload),
      u = await Qt(alg, e, d),
      h = { signature: w(u), payload: "" };
    if (n) h.payload = C.decode(_payload);
    if (this._unprotectedHeader) h.header = this._unprotectedHeader;
    if (this._protectedHeader) h.protected = C.decode(c);
    return h;
  }
}

export { kt, it };
