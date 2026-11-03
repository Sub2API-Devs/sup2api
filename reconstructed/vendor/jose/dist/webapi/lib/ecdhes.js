/**
 * jose/dist/webapi/lib/ecdhes.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-5h78gfwc.js (5)
 * attribution: esm-layout 1, esm-fingerprint 4
 */
import { E_2, fe, A } from "./buffer_utils.js";
import { je } from "./helpers.js";
import { H } from "./crypto_key.js";

//@ chunk-5h78gfwc.js:12812-12852 esm-layout
function Ie(e) {
  return E_2(fe(e.length), e);
}
//@ chunk-5h78gfwc.js:12852-13109 esm-fingerprint
async function Ft(e, t, r) {
  let n = t >> 3,
    i = 32,
    ceil = Math.ceil(n / 32),
    uint8Array = new Uint8Array(ceil * 32);
  for (let s = 1; s <= ceil; s++) {
    let uint8Array_2 = new Uint8Array(4 + e.length + r.length);
    (uint8Array_2.set(fe(s), 0), uint8Array_2.set(e, 4), uint8Array_2.set(r, 4 + e.length));
    let d = await je("sha256", uint8Array_2);
    uint8Array.set(d, (s - 1) * 32);
  }
  return uint8Array.slice(0, n);
}
//@ chunk-5h78gfwc.js:13109-13386 esm-fingerprint
async function He(e, t, r, n, i = new Uint8Array(), o = new Uint8Array()) {
  (H(e, "ECDH"), H(t, "ECDH", "deriveBits"));
  let a = Ie(A(r)),
    s = Ie(i),
    p = Ie(o),
    d = fe(n),
    uint8Array = new Uint8Array(),
    m = E_2(a, s, p, d, uint8Array),
    uint8Array_2 = new Uint8Array(
      await crypto.subtle.deriveBits({ name: e.algorithm.name, public: e }, t, kt(e)),
    );
  return Ft(uint8Array_2, n, m);
}
//@ chunk-5h78gfwc.js:13386-13512 esm-fingerprint
function kt(e) {
  if (e.algorithm.name === "X25519") return 256;
  return Math.ceil(parseInt(e.algorithm.namedCurve.slice(-3), 10) / 8) << 3;
}
//@ chunk-5h78gfwc.js:13512-13647 esm-fingerprint
function Je(e) {
  switch (e.algorithm.namedCurve) {
    case "P-256":
    case "P-384":
    case "P-521":
      return !0;
    default:
      return e.algorithm.name === "X25519";
  }
}

export { Je, He };
