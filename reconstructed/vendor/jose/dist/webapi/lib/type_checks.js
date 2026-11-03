/**
 * jose/dist/webapi/lib/type_checks.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-5h78gfwc.js (4)
 * attribution: esm-layout 1, esm-fingerprint 3
 */

//@ chunk-5h78gfwc.js:11400-11442 esm-layout
var Vt = (e) => typeof e === "object" && e !== null;
//@ chunk-5h78gfwc.js:11442-11683 esm-fingerprint
function b(e) {
  if (!Vt(e) || Object.prototype.toString.call(e) !== "[object Object]") return !1;
  if (Object.getPrototypeOf(e) === null) return !0;
  let t = e;
  while (Object.getPrototypeOf(t) !== null) t = Object.getPrototypeOf(t);
  return Object.getPrototypeOf(e) === t;
}
//@ chunk-5h78gfwc.js:11683-11903 esm-fingerprint
function _(...e) {
  let filtered = e.filter(Boolean);
  if (filtered.length === 0 || filtered.length === 1) return !0;
  let r;
  for (let n of filtered) {
    let keys = Object.keys(n);
    if (!r || r.size === 0) {
      r = new Set(keys);
      continue;
    }
    for (let o of keys) {
      if (r.has(o)) return !1;
      r.add(o);
    }
  }
  return !0;
}
//@ chunk-5h78gfwc.js:11903-12131 esm-fingerprint
var te = (e) => b(e) && typeof e.kty === "string",
  et = (e) => e.kty !== "oct" && ((e.kty === "AKP" && typeof e.priv === "string") || typeof e.d === "string"),
  tt = (e) => e.kty !== "oct" && e.d === void 0 && e.priv === void 0,
  rt = (e) => e.kty === "oct" && typeof e.k === "string";

export { b, te, rt, et, tt, _ };
