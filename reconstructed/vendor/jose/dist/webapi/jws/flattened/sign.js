/**
 * jose/dist/webapi/jws/flattened/sign.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-5h78gfwc.js (1)
 * attribution: esm-fingerprint 1
 */
import { assertNotSet } from "../../lib/helpers.js";
import { JWSInvalid } from "../../../node/esm/util/errors.js";
import { isDisjoint } from "../../lib/type_checks.js";
import { N } from "../../lib/options.js";
import { checkKeyType } from "../../lib/check_key_type.js";
import { encode_2 } from "../../util/base64url.js";
import { encode, concat } from "../../lib/buffer_utils.js";
import { normalizeKey } from "../../lib/normalize_key.js";
import { sign } from "../../lib/signing.js";

//@ chunk-5h78gfwc.js:45478-46644 esm-fingerprint
class Oe {
  #e;
  #t;
  #r;
  constructor(payload) {
    if (!(payload instanceof Uint8Array)) throw TypeError("payload must be an instance of Uint8Array");
    this.#e = payload;
  }
  setProtectedHeader(protectedHeader) {
    assertNotSet(this.#t, "setProtectedHeader");
    this.#t = protectedHeader;
    return this;
  }
  setUnprotectedHeader(unprotectedHeader) {
    assertNotSet(this.#r, "setUnprotectedHeader");
    this.#r = unprotectedHeader;
    return this;
  }
  async sign(key, options) {
    if (!this.#t && !this.#r)
      throw new JWSInvalid("either setProtectedHeader or setUnprotectedHeader must be called before #sign()");
    if (!isDisjoint(this.#t, this.#r))
      throw new JWSInvalid("JWS Protected and JWS Unprotected Header Parameter names must be disjoint");
    let joseHeader = {
      ...this.#t,
      ...this.#r,
    };
    let extensions = N(JWSInvalid, new Map([["b64", true]]), options?.crit, this.#t, joseHeader);
    let b64 = true;
    if (extensions.has("b64")) {
      b64 = this.#t.b64;
      if (typeof b64 !== "boolean")
        throw new JWSInvalid('The "b64" (base64url-encode payload) Header Parameter must be a boolean');
    }
    let { alg } = joseHeader;
    if (typeof alg !== "string" || !alg)
      throw new JWSInvalid('JWS "alg" (Algorithm) Header Parameter missing or invalid');
    checkKeyType(alg, key, "sign");
    let payloadS;
    let payloadB;
    if (b64) {
      payloadS = encode_2(this.#e);
      payloadB = encode(payloadS);
    } else {
      payloadB = this.#e;
      payloadS = "";
    }
    let protectedHeaderString;
    let protectedHeaderBytes;
    if (this.#t) {
      protectedHeaderString = encode_2(JSON.stringify(this.#t));
      protectedHeaderBytes = encode(protectedHeaderString);
    } else {
      protectedHeaderString = "";
      protectedHeaderBytes = new Uint8Array();
    }
    let data = concat(protectedHeaderBytes, encode("."), payloadB);
    let k = await normalizeKey(key, alg);
    let signature = await sign(alg, k, data);
    let jws = {
      signature: encode_2(signature),
      payload: payloadS,
    };
    if (this.#r) jws.header = this.#r;
    if (this.#t) jws.protected = protectedHeaderString;
    return jws;
  }
}
export { Oe };
