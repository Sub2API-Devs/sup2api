/**
 * jose/dist/webapi/lib/base64.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-5h78gfwc.js (2)
 * attribution: esm-fingerprint 2
 */

//@ chunk-5h78gfwc.js:1250-1445 esm-fingerprint
function Ce(e) {
  if (Uint8Array.prototype.toBase64) return e.toBase64();
  let t = 32768,
    r = [];
  for (let n = 0; n < e.length; n += t) r.push(String.fromCharCode.apply(null, e.subarray(n, n + t)));
  return btoa(r.join(""));
}
//@ chunk-5h78gfwc.js:1445-1615 esm-fingerprint
function ue(e) {
  if (Uint8Array.fromBase64) return Uint8Array.fromBase64(e);
  let t = atob(e),
    uint8Array = new Uint8Array(t.length);
  for (let n = 0; n < t.length; n++) uint8Array[n] = t.charCodeAt(n);
  return uint8Array;
}

export { ue, Ce };
