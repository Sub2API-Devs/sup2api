/**
 * @anthropic-ai/sdk/internal/tslib.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (2)
 * attribution: esm-fingerprint 2
 */

//@ chunk-hwmsct5x.js:16042-16394 esm-fingerprint
function Kn(e, n, r, s, h) {
  if (s === "m") throw TypeError("Private method is not writable");
  if (s === "a" && !h) throw TypeError("Private accessor was defined without a setter");
  if (typeof n === "function" ? e !== n || !h : !n.has(e))
    throw TypeError("Cannot write private member to an object whose class did not declare it");
  return (s === "a" ? h.call(e, r) : h ? (h.value = r) : n.set(e, r), r);
}
//@ chunk-hwmsct5x.js:16394-16686 esm-fingerprint
function ke(e, n, r, s) {
  if (r === "a" && !s) throw TypeError("Private accessor was defined without a getter");
  if (typeof n === "function" ? e !== n || !s : !n.has(e))
    throw TypeError("Cannot read private member from an object whose class did not declare it");
  return r === "m" ? s : r === "a" ? s.call(e) : s ? s.value : n.get(e);
}

export { Kn, ke };
