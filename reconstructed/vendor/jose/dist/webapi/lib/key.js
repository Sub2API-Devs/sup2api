/**
 * jose/dist/webapi/lib/key.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-5h78gfwc.js (2)
 * attribution: esm-fingerprint 2
 */

//@ chunk-5h78gfwc.js:6960-7026 esm-fingerprint
function X(e) {
  if (!D(e)) throw Error("CryptoKey instance expected");
}
//@ chunk-5h78gfwc.js:7026-7205 esm-fingerprint
var D = (e) => {
    if (e?.[Symbol.toStringTag] === "CryptoKey") return !0;
    try {
      return e instanceof CryptoKey;
    } catch {
      return !1;
    }
  },
  ee = (e) => e?.[Symbol.toStringTag] === "KeyObject",
  We = (e) => D(e) || ee(e);

export { D, X, ee, We };
