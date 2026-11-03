/**
 * ecdsa-sig-formatter/src/param-bytes-for-alg.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ecdsa-sig-formatter@1.0.11
 * pieces: chunk-82d8c88w.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";

//@ chunk-82d8c88w.js:1109-1328 cjs-fingerprint
var Q = x(function (_r, Z) {
  function K(e) {
    var r = ((e / 8) | 0) + (e % 8 === 0 ? 0 : 1);
    return r;
  }
  var De = { ES256: K(256), ES384: K(384), ES512: K(521) };
  function Ve(e) {
    var r = De[e];
    if (r) return r;
    throw Error('Unknown algorithm "' + e + '"');
  }
  Z.exports = Ve;
});

export { Q };
