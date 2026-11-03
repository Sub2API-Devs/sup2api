/**
 * jose/dist/browser/runtime/timing_safe_equal.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { Xa } from "../../../../../runtime/bun-runtime.js";
import { E, j, wr } from "../../webapi/lib/content_encryption.js";

//@ chunk-2tyrgda4.js:3970-3996 esm-layout
var Ne = Xa(() => {
  E();
  j = wr;
});
//@ chunk-2tyrgda4.js:3996-4322 esm-fingerprint
var Er = (e, t) => {
    if (!(e instanceof Uint8Array)) throw TypeError("First argument must be a buffer");
    if (!(t instanceof Uint8Array)) throw TypeError("Second argument must be a buffer");
    if (e.length !== t.length) throw TypeError("Input buffers must have the same length");
    let r = e.length,
      o = 0,
      n = -1;
    while (++n < r) o |= e[n] ^ t[n];
    return o === 0;
  },
  ut;

export { ut, Er, Ne };
