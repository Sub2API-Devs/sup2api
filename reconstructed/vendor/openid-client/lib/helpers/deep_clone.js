/**
 * openid-client/lib/helpers/deep_clone.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: openid-client@5.7.1
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-1ny7cxrt.js:23735-23839 cjs-fingerprint
var require_deep_clone = x(function (cjsExports, cjsModule) {
  cjsModule.exports = globalThis.structuredClone || ((obj) => JSON.parse(JSON.stringify(obj)));
});
export { require_deep_clone };
