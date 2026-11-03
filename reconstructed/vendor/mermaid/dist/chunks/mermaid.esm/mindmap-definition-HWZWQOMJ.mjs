/**
 * mermaid/dist/chunks/mermaid.esm/mindmap-definition-HWZWQOMJ.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: mermaid@11.12.3
 * pieces: chunk-mrx6y2r5.js (7)
 * attribution: esm-fingerprint 3, esm-layout 4
 */
import { randomUUID, randomUUID as randomUUID_2, randomFillSync } from "crypto";

//@ chunk-mrx6y2r5.js:224842-224865 esm-fingerprint
var tc = { randomUUID: randomUUID_2 };
//@ chunk-mrx6y2r5.js:224906-224946 esm-layout
var uint8Array = new Uint8Array(256),
  is = uint8Array.length;
//@ chunk-mrx6y2r5.js:224946-225018 esm-layout
function rc() {
  if (is > uint8Array.length - 16) (randomFillSync(uint8Array), (is = 0));
  return uint8Array.slice(is, (is += 16));
}
//@ chunk-mrx6y2r5.js:225018-225028 esm-layout
var ge = [];
//@ chunk-mrx6y2r5.js:225028-225089 esm-fingerprint
for (let e = 0; e < 256; ++e) ge.push((e + 256).toString(16).slice(1));
//@ chunk-mrx6y2r5.js:225089-225328 esm-layout
function Oh(e, t = 0) {
  return (
    ge[e[t + 0]] +
    ge[e[t + 1]] +
    ge[e[t + 2]] +
    ge[e[t + 3]] +
    "-" +
    ge[e[t + 4]] +
    ge[e[t + 5]] +
    "-" +
    ge[e[t + 6]] +
    ge[e[t + 7]] +
    "-" +
    ge[e[t + 8]] +
    ge[e[t + 9]] +
    "-" +
    ge[e[t + 10]] +
    ge[e[t + 11]] +
    ge[e[t + 12]] +
    ge[e[t + 13]] +
    ge[e[t + 14]] +
    ge[e[t + 15]]
  ).toLowerCase();
}
//@ chunk-mrx6y2r5.js:225328-225695 esm-fingerprint
function dy(e, t, r) {
  if (tc.randomUUID && !t && !e) return tc.randomUUID();
  e = e || {};
  let n = e.random ?? e.rng?.() ?? rc();
  if (n.length < 16) throw Error("Random bytes length must be >= 16");
  if (((n[6] = (n[6] & 15) | 64), (n[8] = (n[8] & 63) | 128), t)) {
    if (((r = r || 0), r < 0 || r + 16 > t.length))
      throw RangeError(`UUID byte range ${r}:${r + 15} is out of buffer bounds`);
    for (let o = 0; o < 16; ++o) t[r + o] = n[o];
    return t;
  }
  return Oh(n);
}

export { dy };
