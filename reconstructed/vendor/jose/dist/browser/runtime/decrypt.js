/**
 * jose/dist/browser/runtime/decrypt.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (3)
 * attribution: esm-fingerprint 3
 */
import { A } from "../../node/esm/lib/invalid_key_input.js";
import { p, g } from "../../webapi/lib/buffer_utils.js";
import { _, he } from "../../node/esm/lib/buffer_utils.js";
import { ut } from "./timing_safe_equal.js";
import { re, ge, j, f } from "../../webapi/lib/content_encryption.js";
import { J } from "../../node/esm/lib/crypto_key.js";
import { m } from "./is_key_like.js";

//@ chunk-2tyrgda4.js:7510-8066 esm-fingerprint
async function Ar(e, t, r, o, n, a) {
  if (!(t instanceof Uint8Array)) throw TypeError(A(t, "Uint8Array"));
  let i = parseInt(e.slice(1, 4), 10),
    importKey = await p.subtle.importKey("raw", t.subarray(i >> 3), "AES-CBC", !1, ["decrypt"]),
    importKey_2 = await p.subtle.importKey(
      "raw",
      t.subarray(0, i >> 3),
      { hash: `SHA-${i << 1}`, name: "HMAC" },
      !1,
      ["sign"],
    ),
    u = _(a, o, r, he(a.length << 3)),
    uint8Array = new Uint8Array((await p.subtle.sign("HMAC", importKey_2, u)).slice(0, i >> 3)),
    I;
  try {
    I = ut(n, uint8Array);
  } catch (error) {}
  if (!I) throw new re();
  let b;
  try {
    b = new Uint8Array(await p.subtle.decrypt({ iv: o, name: "AES-CBC" }, importKey, r));
  } catch (error) {}
  if (!b) throw new re();
  return b;
}
//@ chunk-2tyrgda4.js:8066-8353 esm-fingerprint
async function gr(e, t, r, o, n, a) {
  let i;
  if (t instanceof Uint8Array) i = await p.subtle.importKey("raw", t, "AES-GCM", !1, ["decrypt"]);
  else (J(t, e, "decrypt"), (i = t));
  try {
    return new Uint8Array(
      await p.subtle.decrypt({ additionalData: a, iv: o, name: "AES-GCM", tagLength: 128 }, i, _(r, n)),
    );
  } catch (error) {
    throw new re();
  }
}
//@ chunk-2tyrgda4.js:8353-8812 esm-fingerprint
var br = async (e, t, r, o, n, a) => {
    if (!g(t) && !(t instanceof Uint8Array)) throw TypeError(A(t, ...m, "Uint8Array"));
    switch ((ge(e, o), e)) {
      case "A128CBC-HS256":
      case "A192CBC-HS384":
      case "A256CBC-HS512":
        if (t instanceof Uint8Array) j(t, parseInt(e.slice(-3), 10));
        return Ar(e, t, r, o, n, a);
      case "A128GCM":
      case "A192GCM":
      case "A256GCM":
        if (t instanceof Uint8Array) j(t, parseInt(e.slice(1, 4), 10));
        return gr(e, t, r, o, n, a);
      default:
        throw new f("Unsupported JWE Content Encryption Algorithm");
    }
  },
  Ke;

export { Ke, br };
