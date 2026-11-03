/**
 * jose/dist/node/esm/jws/flattened/verify.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { Xa } from "../../../../../../../runtime/bun-runtime.js";
import { tt } from "../../../../browser/runtime/get_sign_verify_key.js";
import { W } from "../../../../webapi/lib/buffer_utils.js";
import { He } from "../../../../browser/runtime/rsaes.js";
import { rt, Nt, Nr } from "../../../../webapi/lib/signing.js";
import { K, G } from "../../../../webapi/lib/validate.js";
import { y, Q, De } from "../../../../webapi/lib/content_encryption.js";
import { S, C, l } from "../../../../browser/runtime/base64url.js";
import { X, de } from "../../../../webapi/lib/options.js";
import { z } from "../../lib/check_key_type.js";
import { _ } from "../../lib/buffer_utils.js";

//@ chunk-2tyrgda4.js:28280-28322 esm-layout
var Bt = Xa(() => {
  tt();
  W();
  He();
  rt();
  Nt = Nr;
});
//@ chunk-2tyrgda4.js:28322-30438 esm-fingerprint
async function Lt(e, t, r) {
  var o;
  if (!K(e)) throw new y("Flattened JWS must be an object");
  if (e.protected === void 0 && e.header === void 0)
    throw new y('Flattened JWS must have either of the "protected" or "header" members');
  if (e.protected !== void 0 && typeof e.protected !== "string")
    throw new y("JWS Protected Header incorrect type");
  if (e.payload === void 0) throw new y("JWS Payload missing");
  if (typeof e.signature !== "string") throw new y("JWS Signature missing or incorrect type");
  if (e.header !== void 0 && !K(e.header)) throw new y("JWS Unprotected Header incorrect type");
  let n = {};
  if (e.protected)
    try {
      let D = S(e.protected);
      n = JSON.parse(C.decode(D));
    } catch (error) {
      throw new y("JWS Protected Header is invalid");
    }
  if (!G(n, e.header))
    throw new y("JWS Protected and JWS Unprotected Header Parameter names must be disjoint");
  let a = { ...n, ...e.header },
    i = X(y, new Map([["b64", !0]]), r === null || r === void 0 ? void 0 : r.crit, n, a),
    c = !0;
  if (i.has("b64")) {
    if (((c = n.b64), typeof c !== "boolean"))
      throw new y('The "b64" (base64url-encode payload) Header Parameter must be a boolean');
  }
  let { alg: alg } = a;
  if (typeof alg !== "string" || !alg)
    throw new y('JWS "alg" (Algorithm) Header Parameter missing or invalid');
  let u = r && de("algorithms", r.algorithms);
  if (u && !u.has(alg)) throw new Q('"alg" (Algorithm) Header Parameter not allowed');
  if (c) {
    if (typeof e.payload !== "string") throw new y("JWS Payload must be a string");
  } else if (typeof e.payload !== "string" && !(e.payload instanceof Uint8Array))
    throw new y("JWS Payload must be a string or an Uint8Array instance");
  let h = !1;
  if (typeof t === "function") ((t = await t(n, e)), (h = !0));
  z(alg, t, "verify");
  let I = _(
      l.encode((o = e.protected) !== null && o !== void 0 ? o : ""),
      l.encode("."),
      typeof e.payload === "string" ? l.encode(e.payload) : e.payload,
    ),
    b;
  try {
    b = S(e.signature);
  } catch (error) {
    throw new y("Failed to base64url decode the signature");
  }
  if (!(await Nt(alg, t, b, I))) throw new De();
  let T;
  if (c)
    try {
      T = S(e.payload);
    } catch (error) {
      throw new y("Failed to base64url decode the payload");
    }
  else if (typeof e.payload === "string") T = l.encode(e.payload);
  else T = e.payload;
  let U = { payload: T };
  if (e.protected !== void 0) U.protectedHeader = n;
  if (e.header !== void 0) U.unprotectedHeader = e.header;
  if (h) return { ...U, key: t };
  return U;
}

export { Bt, Lt };
