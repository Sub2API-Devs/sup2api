/**
 * jose/dist/webapi/util/base64url.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-5h78gfwc.js (2)
 * attribution: esm-fingerprint 2
 */
import { textDecoder, textEncoder } from "../lib/buffer_utils.js";
import { ue, Ce } from "../lib/base64.js";

//@ chunk-5h78gfwc.js:1615-1923 esm-fingerprint
function v_2(e) {
  if (Uint8Array.fromBase64)
    return Uint8Array.fromBase64(typeof e === "string" ? e : textDecoder.decode(e), {
      alphabet: "base64url",
    });
  let t = e;
  if (t instanceof Uint8Array) t = textDecoder.decode(t);
  t = t.replace(/-/g, "+").replace(/_/g, "/");
  try {
    return ue(t);
  } catch {
    throw TypeError("The input to be decoded is not correctly encoded.");
  }
}
//@ chunk-5h78gfwc.js:1923-2140 esm-fingerprint
function y(e) {
  let t = e;
  if (typeof t === "string") t = textEncoder.encode(t);
  if (Uint8Array.prototype.toBase64) return t.toBase64({ alphabet: "base64url", omitPadding: !0 });
  return Ce(t).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

export { y, v_2 };
