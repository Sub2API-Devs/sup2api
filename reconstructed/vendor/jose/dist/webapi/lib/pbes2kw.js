/**
 * jose/dist/webapi/lib/pbes2kw.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-5h78gfwc.js (3)
 * attribution: esm-fingerprint 3
 */
import { H } from "./crypto_key.js";
import { E_2, A } from "./buffer_utils.js";
import { c } from "../../node/esm/util/errors.js";

//@ chunk-5h78gfwc.js:13647-13787 esm-fingerprint
function Yt(e, t) {
  if (e instanceof Uint8Array) return crypto.subtle.importKey("raw", e, "PBKDF2", !1, ["deriveBits"]);
  return (H(e, t, "deriveBits"), e);
}
//@ chunk-5h78gfwc.js:13787-13828 esm-fingerprint
var qt = (e, t) => E_2(A(e), Uint8Array.of(0), t);
//@ chunk-5h78gfwc.js:13828-14141 esm-fingerprint
async function at(e, t, r, n) {
  if (!(e instanceof Uint8Array) || e.length < 8) throw new c("PBES2 Salt Input must be 8 or more octets");
  let i = qt(t, e),
    o = parseInt(t.slice(13, 16), 10),
    a = { hash: `SHA-${t.slice(8, 11)}`, iterations: r, name: "PBKDF2", salt: i },
    s = await Yt(n, t);
  return new Uint8Array(await crypto.subtle.deriveBits(a, s, o));
}

export { at };
