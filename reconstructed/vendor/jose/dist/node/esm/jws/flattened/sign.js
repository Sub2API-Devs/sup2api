/**
 * jose/dist/node/esm/jws/flattened/sign.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { Xa } from "../../../../../../../runtime/bun-runtime.js";
import { init_get_sign_verify_key } from "../../../../browser/runtime/get_sign_verify_key.js";
import { init_buffer_utils } from "../../../../webapi/lib/buffer_utils.js";
import { He } from "../../../../browser/runtime/rsaes.js";
import { init_signing_2, Qt, Fr } from "../../../../webapi/lib/signing.js";
import { y } from "../../../../webapi/lib/content_encryption.js";
import { G } from "../../../../webapi/lib/validate.js";
import { X } from "../../../../webapi/lib/options.js";
import { z } from "../../lib/check_key_type.js";
import { l, encode, C } from "../../../../browser/runtime/base64url.js";
import { concat } from "../../lib/buffer_utils.js";

//@ chunk-2tyrgda4.js:36849-36891 esm-layout
var init_sign = Xa(() => {
  init_get_sign_verify_key();
  init_buffer_utils();
  He();
  init_signing_2();
  Qt = Fr;
});
//@ chunk-2tyrgda4.js:36891-38428 esm-fingerprint
class FlattenedSign {
  constructor(payload) {
    if (!(payload instanceof Uint8Array)) throw TypeError("payload must be an instance of Uint8Array");
    this._payload = payload;
  }
  setProtectedHeader(protectedHeader) {
    if (this._protectedHeader) throw TypeError("setProtectedHeader can only be called once");
    this._protectedHeader = protectedHeader;
    return this;
  }
  setUnprotectedHeader(unprotectedHeader) {
    if (this._unprotectedHeader) throw TypeError("setUnprotectedHeader can only be called once");
    this._unprotectedHeader = unprotectedHeader;
    return this;
  }
  async sign(key, options) {
    if (!this._protectedHeader && !this._unprotectedHeader)
      throw new y("either setProtectedHeader or setUnprotectedHeader must be called before #sign()");
    if (!G(this._protectedHeader, this._unprotectedHeader))
      throw new y("JWS Protected and JWS Unprotected Header Parameter names must be disjoint");
    let joseHeader = {
      ...this._protectedHeader,
      ...this._unprotectedHeader,
    };
    let extensions = X(
      y,
      new Map([["b64", true]]),
      options === null || options === undefined ? undefined : options.crit,
      this._protectedHeader,
      joseHeader,
    );
    let b64 = true;
    if (extensions.has("b64")) {
      b64 = this._protectedHeader.b64;
      if (typeof b64 !== "boolean")
        throw new y('The "b64" (base64url-encode payload) Header Parameter must be a boolean');
    }
    let { alg } = joseHeader;
    if (typeof alg !== "string" || !alg)
      throw new y('JWS "alg" (Algorithm) Header Parameter missing or invalid');
    z(alg, key, "sign");
    let payload = this._payload;
    if (b64) payload = l.encode(encode(payload));
    let protectedHeader;
    if (this._protectedHeader) protectedHeader = l.encode(encode(JSON.stringify(this._protectedHeader)));
    else protectedHeader = l.encode("");
    let data = concat(protectedHeader, l.encode("."), payload);
    let signature = await Qt(alg, key, data);
    let jws = {
      signature: encode(signature),
      payload: "",
    };
    if (b64) jws.payload = C.decode(payload);
    if (this._unprotectedHeader) jws.header = this._unprotectedHeader;
    if (this._protectedHeader) jws.protected = C.decode(protectedHeader);
    return jws;
  }
}
export { init_sign, FlattenedSign };
