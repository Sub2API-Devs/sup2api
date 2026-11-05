/**
 * @anthropic-ai/sdk/internal/tslib.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-vn3g7zt8.js (2)
 * attribution: esm-fingerprint 2
 */

//@ chunk-vn3g7zt8.js:16410-16762 esm-fingerprint
function __classPrivateFieldSet(receiver, state, value, kind, f) {
  if (kind === "m") throw TypeError("Private method is not writable");
  if (kind === "a" && !f) throw TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
    throw TypeError("Cannot write private member to an object whose class did not declare it");
  if (kind === "a") f.call(receiver, value);
  else if (f) f.value = value;
  else state.set(receiver, value);
  return value;
}
//@ chunk-vn3g7zt8.js:16762-17054 esm-fingerprint
function __classPrivateFieldGet(receiver, state, kind, f) {
  if (kind === "a" && !f) throw TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
    throw TypeError("Cannot read private member from an object whose class did not declare it");
  return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
}
export { __classPrivateFieldSet, __classPrivateFieldGet };
