/**
 * jose/dist/browser/runtime/timing_safe_equal.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { __esm } from "../../../../../runtime/bun-runtime.js";

//@ chunk-2tyrgda4.js:3996-4322 esm-fingerprint
var timingSafeEqual = (a, b) => {
  if (!(a instanceof Uint8Array)) throw TypeError("First argument must be a buffer");
  if (!(b instanceof Uint8Array)) throw TypeError("Second argument must be a buffer");
  if (a.length !== b.length) throw TypeError("Input buffers must have the same length");
  let len = a.length;
  let out = 0;
  let i = -1;
  while (++i < len) out |= a[i] ^ b[i];
  return out === 0;
};
var timingSafeEqual_default;
//@ chunk-2tyrgda4.js:4322-4345 esm-layout (moved: shares a binding it assigns)
var init_crypto_key = __esm(() => {
  timingSafeEqual_default = timingSafeEqual;
});
export { timingSafeEqual_default, init_crypto_key };
