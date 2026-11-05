/**
 * jose/dist/node/esm/jws/flattened/sign.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-pd6th42n.js (1)
 * attribution: esm-layout 1, esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { JWSInvalid_2 } from "../../../../webapi/lib/content_encryption.js";
import { validateCrit } from "../../../../webapi/lib/validate.js";
import { validateCritInit } from "../../../../webapi/lib/options.js";
import { checkKeyTypeInit } from "../../lib/check_key_type.js";
import { encoder, encode, decoder } from "../../../../browser/runtime/base64url.js";
import { concat } from "../../lib/buffer_utils.js";
import { sign } from "../../../../webapi/lib/signing.js";

//@ chunk-pd6th42n.js:36891-38428 esm-fingerprint
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
      throw new JWSInvalid_2(
        "either setProtectedHeader or setUnprotectedHeader must be called before #sign()",
      );
    if (!validateCrit(this._protectedHeader, this._unprotectedHeader))
      throw new JWSInvalid_2("JWS Protected and JWS Unprotected Header Parameter names must be disjoint");
    let joseHeader = {
      ...this._protectedHeader,
      ...this._unprotectedHeader,
    };
    let extensions = validateCritInit(
      JWSInvalid_2,
      new Map([["b64", true]]),
      options === null || options === undefined ? undefined : options.crit,
      this._protectedHeader,
      joseHeader,
    );
    let b64 = true;
    if (extensions.has("b64")) {
      b64 = this._protectedHeader.b64;
      if (typeof b64 !== "boolean")
        throw new JWSInvalid_2('The "b64" (base64url-encode payload) Header Parameter must be a boolean');
    }
    let { alg } = joseHeader;
    if (typeof alg !== "string" || !alg)
      throw new JWSInvalid_2('JWS "alg" (Algorithm) Header Parameter missing or invalid');
    checkKeyTypeInit(alg, key, "sign");
    let payload = this._payload;
    if (b64) payload = encoder.encode(encode(payload));
    let protectedHeader;
    if (this._protectedHeader)
      protectedHeader = encoder.encode(encode(JSON.stringify(this._protectedHeader)));
    else protectedHeader = encoder.encode("");
    let data = concat(protectedHeader, encoder.encode("."), payload);
    let signature = await sign(alg, key, data);
    let jws = {
      signature: encode(signature),
      payload: "",
    };
    if (b64) jws.payload = decoder.decode(payload);
    if (this._unprotectedHeader) jws.header = this._unprotectedHeader;
    if (this._protectedHeader) jws.protected = decoder.decode(protectedHeader);
    return jws;
  }
}
export { FlattenedSign };
