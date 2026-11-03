/**
 * jose/dist/webapi/lib/validate.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (5)
 * attribution: esm-layout 4, esm-fingerprint 1
 */
import { Xa } from "../../../../../runtime/bun-runtime.js";
import { init_content_encryption_2 } from "./content_encryption.js";

//@ chunk-2tyrgda4.js:9302-9323 esm-layout
var init_validate = Xa(() => {
  init_content_encryption_2();
});
//@ chunk-2tyrgda4.js:9323-9545 esm-layout
var Kr = (...e) => {
  let filtered = e.filter(Boolean);
  if (filtered.length === 0 || filtered.length === 1) return true;
  let r;
  for (let o of filtered) {
    let keys = Object.keys(o);
    if (!r || r.size === 0) {
      r = new Set(keys);
      continue;
    }
    for (let a of keys) {
      if (r.has(a)) return false;
      r.add(a);
    }
  }
  return true;
};
var G;
//@ chunk-2tyrgda4.js:9545-9567 esm-layout
var init_validate_2 = Xa(() => {
  G = Kr;
});
//@ chunk-2tyrgda4.js:9567-9619 esm-layout
function Cr(e) {
  return typeof e === "object" && e !== null;
}
//@ chunk-2tyrgda4.js:9619-9860 esm-fingerprint
function K(e) {
  if (!Cr(e) || Object.prototype.toString.call(e) !== "[object Object]") return false;
  if (Object.getPrototypeOf(e) === null) return true;
  let t = e;
  while (Object.getPrototypeOf(t) !== null) t = Object.getPrototypeOf(t);
  return Object.getPrototypeOf(e) === t;
}
export { K, G, init_validate, init_validate_2 };
