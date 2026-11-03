/**
 * openid-client/lib/helpers/deep_clone.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: openid-client@5.7.1
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-1ny7cxrt.js:23735-23839 cjs-fingerprint
var Pu = x(function (Vve, lS) {
  lS.exports = globalThis.structuredClone || ((e) => JSON.parse(JSON.stringify(e)));
});

export { Pu };
