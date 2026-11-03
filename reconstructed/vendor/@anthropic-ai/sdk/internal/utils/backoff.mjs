/**
 * @anthropic-ai/sdk/internal/utils/backoff.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (6)
 * attribution: esm-layout 4, esm-fingerprint 2
 */
import { APIError } from "../../core/error.mjs";

//@ chunk-hwmsct5x.js:55572-55626 esm-layout
function isStatus(e, code) {
  return e instanceof APIError && e.status === code;
}
//@ chunk-hwmsct5x.js:55626-55721 esm-fingerprint
function is4xx(e) {
  return e instanceof APIError && typeof e.status === "number" && e.status >= 400 && e.status < 500;
}
//@ chunk-hwmsct5x.js:55721-55785 esm-layout
function isFatal4xx(e) {
  return is4xx(e) && !isStatus(e, 408) && !isStatus(e, 409) && !isStatus(e, 429);
}
//@ chunk-hwmsct5x.js:55785-55830 esm-layout
function cs(attempt, baseMs, capMs) {
  return Math.min(baseMs * 2 ** attempt, capMs);
}
//@ chunk-hwmsct5x.js:55830-55876 esm-layout
function jitter(lowMs, highMs) {
  return lowMs + Math.random() * (highMs - lowMs);
}
//@ chunk-hwmsct5x.js:55876-55923 esm-fingerprint
function applyJitter(ms) {
  return ms * (1 - Math.random() * 0.25);
}
export { isStatus, isFatal4xx, applyJitter, jitter, cs };
