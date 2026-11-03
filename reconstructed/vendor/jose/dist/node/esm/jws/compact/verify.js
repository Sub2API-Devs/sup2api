/**
 * jose/dist/node/esm/jws/compact/verify.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (2), chunk-5h78gfwc.js (1)
 * attribution: esm-layout 1, esm-fingerprint 2
 */
import { Xa } from "../../../../../../../runtime/bun-runtime.js";
import { P, E, F, y } from "../../../../webapi/lib/content_encryption.js";
import { Bt, Lt } from "../flattened/verify.js";
import { v, C } from "../../../../browser/runtime/base64url.js";
import { oe } from "../../../../webapi/lib/validate.js";
import { se } from "../../../../browser/runtime/encrypt.js";
import { pe } from "../../../../webapi/lib/options.js";
import { et } from "../../jwe/flattened/decrypt.js";
import { textDecoder } from "../../../../webapi/lib/buffer_utils.js";
import { h } from "../../util/errors.js";
import { vt } from "../../../../webapi/jws/flattened/verify.js";

//@ chunk-2tyrgda4.js:30438-30496 esm-layout
var $t = Xa(() => {
  P();
  Bt();
  E();
  v();
  oe();
  F();
  se();
  pe();
  et();
});
//@ chunk-2tyrgda4.js:30496-30895 esm-fingerprint
async function Br(e, t, r) {
  if (e instanceof Uint8Array) e = C.decode(e);
  if (typeof e !== "string") throw new y("Compact JWS must be a string or Uint8Array");
  let { 0: o, 1: n, 2: a, length: i } = e.split(".");
  if (i !== 3) throw new y("Invalid Compact JWS");
  let c = await Lt({ payload: n, protected: o, signature: a }, t, r),
    d = { payload: c.payload, protectedHeader: c.protectedHeader };
  if (typeof t === "function") return { ...d, key: c.key };
  return d;
}
//@ chunk-5h78gfwc.js:39805-40204 esm-fingerprint
async function Tt(e, t, r) {
  if (e instanceof Uint8Array) e = textDecoder.decode(e);
  if (typeof e !== "string") throw new h("Compact JWS must be a string or Uint8Array");
  let { 0: n, 1: i, 2: o, length: a } = e.split(".");
  if (a !== 3) throw new h("Invalid Compact JWS");
  let s = await vt({ payload: i, protected: n, signature: o }, t, r),
    p = { payload: s.payload, protectedHeader: s.protectedHeader };
  if (typeof t === "function") return { ...p, key: s.key };
  return p;
}

export { $t, Tt };
