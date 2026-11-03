/**
 * @anthropic-ai/sdk/internal/utils/backoff.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (6)
 * attribution: esm-layout 4, esm-fingerprint 2
 */
import { Ot } from "../../core/error.mjs";

//@ chunk-hwmsct5x.js:55572-55626 esm-layout
function hJ(e, n) {
  return e instanceof Ot && e.status === n;
}
//@ chunk-hwmsct5x.js:55626-55721 esm-fingerprint
function mm(e) {
  return e instanceof Ot && typeof e.status === "number" && e.status >= 400 && e.status < 500;
}
//@ chunk-hwmsct5x.js:55721-55785 esm-layout
function on(e) {
  return mm(e) && !hJ(e, 408) && !hJ(e, 409) && !hJ(e, 429);
}
//@ chunk-hwmsct5x.js:55785-55830 esm-layout
function cs(e, n, r) {
  return Math.min(n * 2 ** e, r);
}
//@ chunk-hwmsct5x.js:55830-55876 esm-layout
function qu(e, n) {
  return e + Math.random() * (n - e);
}
//@ chunk-hwmsct5x.js:55876-55923 esm-fingerprint
function fs(e) {
  return e * (1 - Math.random() * 0.25);
}

export { hJ, on, fs, qu, cs };
