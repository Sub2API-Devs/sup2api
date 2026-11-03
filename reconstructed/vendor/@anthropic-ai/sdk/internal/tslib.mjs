/**
 * @anthropic-ai/sdk/internal/tslib.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (2)
 * attribution: esm-fingerprint 2
 */

//@ chunk-hwmsct5x.js:16042-16394 esm-fingerprint
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
//@ chunk-hwmsct5x.js:16394-16686 esm-fingerprint
function __classPrivateFieldGet(receiver, state, kind, f) {
  if (kind === "a" && !f) throw TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
    throw TypeError("Cannot read private member from an object whose class did not declare it");
  return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
}
export { __classPrivateFieldSet, __classPrivateFieldGet };
