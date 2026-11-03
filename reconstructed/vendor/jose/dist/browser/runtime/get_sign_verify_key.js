/**
 * jose/dist/browser/runtime/get_sign_verify_key.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { Xa } from "../../../../../runtime/bun-runtime.js";
import { E } from "../../webapi/lib/content_encryption.js";
import { g, p } from "../../webapi/lib/buffer_utils.js";
import { yt } from "../../node/esm/lib/crypto_key.js";
import { A } from "../../node/esm/lib/invalid_key_input.js";
import { m } from "./is_key_like.js";

//@ chunk-2tyrgda4.js:27831-27852 esm-layout
var tt = Xa(() => {
  E();
});
//@ chunk-2tyrgda4.js:27852-28098 esm-fingerprint
function me(e, t, r) {
  if (g(t)) return (yt(t, e, r), t);
  if (t instanceof Uint8Array) {
    if (!e.startsWith("HS")) throw TypeError(A(t, ...m));
    return p.subtle.importKey("raw", t, { hash: `SHA-${e.slice(-3)}`, name: "HMAC" }, !1, [r]);
  }
  throw TypeError(A(t, ...m, "Uint8Array"));
}

export { me, tt };
