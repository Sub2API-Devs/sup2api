/**
 * auto-bind/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: auto-bind@5.0.1
 * pieces: chunk-bzr73sfg.js (2)
 * attribution: esm-fingerprint 2
 */

//@ chunk-bzr73sfg.js:144882-145026 esm-fingerprint
var nx = (n) => {
  let u = new Set();
  do for (let f of Reflect.ownKeys(n)) u.add([n, f]);
  while ((n = Reflect.getPrototypeOf(n)) && n !== Object.prototype);
  return u;
};
//@ chunk-bzr73sfg.js:145026-145365 esm-fingerprint
function kc(n, { include: u, exclude: f } = {}) {
  let m = (p) => {
    let g = (E) => (typeof E === "string" ? p === E : E.test(p));
    if (u) return u.some(g);
    if (f) return !f.some(g);
    return !0;
  };
  for (let [p, g] of nx(n.constructor.prototype)) {
    if (g === "constructor" || !m(g)) continue;
    let ownPropertyDescriptor = Reflect.getOwnPropertyDescriptor(p, g);
    if (ownPropertyDescriptor && typeof ownPropertyDescriptor.value === "function") n[g] = n[g].bind(n);
  }
  return n;
}

export { kc };
