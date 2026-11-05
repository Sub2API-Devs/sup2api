/**
 * @anthropic-ai/sdk/internal/utils/backoff.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-vn3g7zt8.js (6)
 * attribution: esm-layout 4, esm-fingerprint 2
 */
import { APIError } from "../../core/error.mjs";

//@ chunk-vn3g7zt8.js:55943-55997 esm-layout
function isStatus(error, code) {
  return error instanceof APIError && error.status === code;
}
//@ chunk-vn3g7zt8.js:55997-56092 esm-fingerprint
function is4xx(error) {
  return (
    error instanceof APIError && typeof error.status === "number" && error.status >= 400 && error.status < 500
  );
}
//@ chunk-vn3g7zt8.js:56092-56156 esm-layout
function isFatal4xx(error) {
  return is4xx(error) && !isStatus(error, 408) && !isStatus(error, 409) && !isStatus(error, 429);
}
//@ chunk-vn3g7zt8.js:56156-56201 esm-layout
function backoff(attempt, baseMs, capMs) {
  return Math.min(baseMs * 2 ** attempt, capMs);
}
//@ chunk-vn3g7zt8.js:56201-56247 esm-layout
function jitter(lowMs, highMs) {
  return lowMs + Math.random() * (highMs - lowMs);
}
//@ chunk-vn3g7zt8.js:56247-56294 esm-fingerprint
function applyJitter(ms) {
  return ms * (1 - Math.random() * 0.25);
}
export { isStatus, isFatal4xx, applyJitter, jitter, backoff };
