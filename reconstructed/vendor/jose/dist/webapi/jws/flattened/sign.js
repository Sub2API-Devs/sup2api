/**
 * jose/dist/webapi/jws/flattened/sign.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-5h78gfwc.js (1)
 * attribution: esm-fingerprint 1
 */
import { W } from "../../lib/helpers.js";
import { h } from "../../../node/esm/util/errors.js";
import { _ } from "../../lib/type_checks.js";
import { N } from "../../lib/options.js";
import { B } from "../../lib/check_key_type.js";
import { y } from "../../util/base64url.js";
import { A, E_2 } from "../../lib/buffer_utils.js";
import { R } from "../../lib/normalize_key.js";
import { ft } from "../../lib/signing.js";

//@ chunk-5h78gfwc.js:45478-46644 esm-fingerprint
class Oe {
  #e;
  #t;
  #r;
  constructor(e) {
    if (!(e instanceof Uint8Array)) throw TypeError("payload must be an instance of Uint8Array");
    this.#e = e;
  }
  setProtectedHeader(e) {
    return (W(this.#t, "setProtectedHeader"), (this.#t = e), this);
  }
  setUnprotectedHeader(e) {
    return (W(this.#r, "setUnprotectedHeader"), (this.#r = e), this);
  }
  async sign(e, t) {
    if (!this.#t && !this.#r)
      throw new h("either setProtectedHeader or setUnprotectedHeader must be called before #sign()");
    if (!_(this.#t, this.#r))
      throw new h("JWS Protected and JWS Unprotected Header Parameter names must be disjoint");
    let r = { ...this.#t, ...this.#r },
      n = N(h, new Map([["b64", !0]]), t?.crit, this.#t, r),
      i = !0;
    if (n.has("b64")) {
      if (((i = this.#t.b64), typeof i !== "boolean"))
        throw new h('The "b64" (base64url-encode payload) Header Parameter must be a boolean');
    }
    let { alg: alg } = r;
    if (typeof alg !== "string" || !alg)
      throw new h('JWS "alg" (Algorithm) Header Parameter missing or invalid');
    B(alg, e, "sign");
    let a, s;
    if (i) ((a = y(this.#e)), (s = A(a)));
    else ((s = this.#e), (a = ""));
    let p, d;
    if (this.#t) ((p = y(JSON.stringify(this.#t))), (d = A(p)));
    else ((p = ""), (d = new Uint8Array()));
    let u = E_2(d, A("."), s),
      m = await R(e, alg),
      w = await ft(alg, m, u),
      K = { signature: y(w), payload: a };
    if (this.#r) K.header = this.#r;
    if (this.#t) K.protected = p;
    return K;
  }
}

export { Oe };
