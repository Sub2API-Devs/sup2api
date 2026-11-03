/**
 * jose/dist/node/esm/jwe/compact/decrypt.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (2), chunk-5h78gfwc.js (1)
 * attribution: esm-layout 1, esm-fingerprint 2
 */
import { Xa } from "../../../../../../../runtime/bun-runtime.js";
import { P, E, F, s } from "../../../../webapi/lib/content_encryption.js";
import { $e } from "../../../../browser/runtime/zlib.js";
import { Ge, oe } from "../../../../webapi/lib/validate.js";
import { Ut, pe } from "../../../../webapi/lib/options.js";
import { v, C } from "../../../../browser/runtime/base64url.js";
import { We } from "../../../../browser/runtime/jwk_to_key.js";
import { et, Dt } from "../flattened/decrypt.js";
import { textDecoder } from "../../../../webapi/lib/buffer_utils.js";
import { c } from "../../util/errors.js";
import { Ht } from "../../../../webapi/jwe/flattened/decrypt.js";

//@ chunk-2tyrgda4.js:26775-26843 esm-layout
var Ot = Xa(() => {
  P();
  $e();
  Ge();
  E();
  oe();
  F();
  Ut();
  v();
  We();
  pe();
  et();
});
//@ chunk-2tyrgda4.js:26843-27304 esm-fingerprint
async function Mr(e, t, r) {
  if (e instanceof Uint8Array) e = C.decode(e);
  if (typeof e !== "string") throw new s("Compact JWE must be a string or Uint8Array");
  let { 0: o, 1: n, 2: a, 3: i, 4: c, length: d } = e.split(".");
  if (d !== 5) throw new s("Invalid Compact JWE");
  let u = await Dt(
      {
        ciphertext: i,
        iv: a || void 0,
        protected: o || void 0,
        tag: c || void 0,
        encrypted_key: n || void 0,
      },
      t,
      r,
    ),
    h = { plaintext: u.plaintext, protectedHeader: u.protectedHeader };
  if (typeof t === "function") return { ...h, key: u.key };
  return h;
}
//@ chunk-5h78gfwc.js:34826-35279 esm-fingerprint
async function Jt(e, t, r) {
  if (e instanceof Uint8Array) e = textDecoder.decode(e);
  if (typeof e !== "string") throw new c("Compact JWE must be a string or Uint8Array");
  let { 0: n, 1: i, 2: o, 3: a, 4: s, length: p } = e.split(".");
  if (p !== 5) throw new c("Invalid Compact JWE");
  let d = await Ht(
      { ciphertext: a, iv: o || void 0, protected: n, tag: s || void 0, encrypted_key: i || void 0 },
      t,
      r,
    ),
    u = { plaintext: d.plaintext, protectedHeader: d.protectedHeader };
  if (typeof t === "function") return { ...u, key: d.key };
  return u;
}

export { Ot, Jt };
