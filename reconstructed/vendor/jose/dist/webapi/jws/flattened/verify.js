/**
 * jose/dist/webapi/jws/flattened/verify.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-5h78gfwc.js (1)
 * attribution: esm-fingerprint 1
 */
import { b, _ } from "../../lib/type_checks.js";
import { h, z, me } from "../../../node/esm/util/errors.js";
import { v_2 } from "../../util/base64url.js";
import { textDecoder, E_2, A, textEncoder } from "../../lib/buffer_utils.js";
import { N, ce } from "../../lib/options.js";
import { B } from "../../lib/check_key_type.js";
import { I } from "../../lib/helpers.js";
import { R } from "../../lib/normalize_key.js";
import { ut } from "../../lib/signing.js";

//@ chunk-5h78gfwc.js:37807-39805 esm-fingerprint
async function vt(e, t, r) {
  if (!b(e)) throw new h("Flattened JWS must be an object");
  if (e.protected === void 0 && e.header === void 0)
    throw new h('Flattened JWS must have either of the "protected" or "header" members');
  if (e.protected !== void 0 && typeof e.protected !== "string")
    throw new h("JWS Protected Header incorrect type");
  if (e.payload === void 0) throw new h("JWS Payload missing");
  if (typeof e.signature !== "string") throw new h("JWS Signature missing or incorrect type");
  if (e.header !== void 0 && !b(e.header)) throw new h("JWS Unprotected Header incorrect type");
  let n = {};
  if (e.protected)
    try {
      let g = v_2(e.protected);
      n = JSON.parse(textDecoder.decode(g));
    } catch {
      throw new h("JWS Protected Header is invalid");
    }
  if (!_(n, e.header))
    throw new h("JWS Protected and JWS Unprotected Header Parameter names must be disjoint");
  let i = { ...n, ...e.header },
    o = N(h, new Map([["b64", !0]]), r?.crit, n, i),
    a = !0;
  if (o.has("b64")) {
    if (((a = n.b64), typeof a !== "boolean"))
      throw new h('The "b64" (base64url-encode payload) Header Parameter must be a boolean');
  }
  let { alg: alg } = i;
  if (typeof alg !== "string" || !alg)
    throw new h('JWS "alg" (Algorithm) Header Parameter missing or invalid');
  let p = r && ce("algorithms", r.algorithms);
  if (p && !p.has(alg)) throw new z('"alg" (Algorithm) Header Parameter value not allowed');
  if (a) {
    if (typeof e.payload !== "string") throw new h("JWS Payload must be a string");
  } else if (typeof e.payload !== "string" && !(e.payload instanceof Uint8Array))
    throw new h("JWS Payload must be a string or an Uint8Array instance");
  let d = !1;
  if (typeof t === "function") ((t = await t(n, e)), (d = !0));
  B(alg, t, "verify");
  let u = E_2(
      e.protected !== void 0 ? A(e.protected) : new Uint8Array(),
      A("."),
      typeof e.payload === "string" ? (a ? A(e.payload) : textEncoder.encode(e.payload)) : e.payload,
    ),
    m = I(e.signature, "signature", h),
    w = await R(t, alg);
  if (!(await ut(alg, w, m, u))) throw new me();
  let S;
  if (a) S = I(e.payload, "payload", h);
  else if (typeof e.payload === "string") S = textEncoder.encode(e.payload);
  else S = e.payload;
  let l = { payload: S };
  if (e.protected !== void 0) l.protectedHeader = n;
  if (e.header !== void 0) l.unprotectedHeader = e.header;
  if (d) return { ...l, key: w };
  return l;
}

export { vt };
