/**
 * jose/dist/browser/runtime/encrypt.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (4)
 * attribution: esm-layout 1, esm-fingerprint 3
 */
import { Xa } from "../../../../../runtime/bun-runtime.js";
import { O, M, m } from "./is_key_like.js";
import { z, Jr } from "../../node/esm/lib/check_key_type.js";
import { A } from "../../node/esm/lib/invalid_key_input.js";
import { p, g } from "../../webapi/lib/buffer_utils.js";
import { _, he } from "../../node/esm/lib/buffer_utils.js";
import { J } from "../../node/esm/lib/crypto_key.js";
import { ge, j, f } from "../../webapi/lib/content_encryption.js";

//@ chunk-2tyrgda4.js:18405-18435 esm-layout
var se = Xa(() => {
  O();
  M();
  z = Jr;
});
//@ chunk-2tyrgda4.js:18435-18923 esm-fingerprint
async function Ir(e, t, r, o, n) {
  if (!(r instanceof Uint8Array)) throw TypeError(A(r, "Uint8Array"));
  let a = parseInt(e.slice(1, 4), 10),
    importKey = await p.subtle.importKey("raw", r.subarray(a >> 3), "AES-CBC", !1, ["encrypt"]),
    importKey_2 = await p.subtle.importKey(
      "raw",
      r.subarray(0, a >> 3),
      { hash: `SHA-${a << 1}`, name: "HMAC" },
      !1,
      ["sign"],
    ),
    uint8Array = new Uint8Array(await p.subtle.encrypt({ iv: o, name: "AES-CBC" }, importKey, t)),
    u = _(n, o, uint8Array, he(n.length << 3)),
    uint8Array_2 = new Uint8Array((await p.subtle.sign("HMAC", importKey_2, u)).slice(0, a >> 3));
  return { ciphertext: uint8Array, tag: uint8Array_2 };
}
//@ chunk-2tyrgda4.js:18923-19230 esm-fingerprint
async function Rr(e, t, r, o, n) {
  let a;
  if (r instanceof Uint8Array) a = await p.subtle.importKey("raw", r, "AES-GCM", !1, ["encrypt"]);
  else (J(r, e, "encrypt"), (a = r));
  let uint8Array = new Uint8Array(
      await p.subtle.encrypt({ additionalData: n, iv: o, name: "AES-GCM", tagLength: 128 }, a, t),
    ),
    sliced = uint8Array.slice(-16);
  return { ciphertext: uint8Array.slice(0, -16), tag: sliced };
}
//@ chunk-2tyrgda4.js:19230-19683 esm-fingerprint
var Tr = async (e, t, r, o, n) => {
    if (!g(r) && !(r instanceof Uint8Array)) throw TypeError(A(r, ...m, "Uint8Array"));
    switch ((ge(e, o), e)) {
      case "A128CBC-HS256":
      case "A192CBC-HS384":
      case "A256CBC-HS512":
        if (r instanceof Uint8Array) j(r, parseInt(e.slice(-3), 10));
        return Ir(e, t, r, o, n);
      case "A128GCM":
      case "A192GCM":
      case "A256GCM":
        if (r instanceof Uint8Array) j(r, parseInt(e.slice(1, 4), 10));
        return Rr(e, t, r, o, n);
      default:
        throw new f("Unsupported JWE Content Encryption Algorithm");
    }
  },
  ce;

export { ce, Tr, se };
