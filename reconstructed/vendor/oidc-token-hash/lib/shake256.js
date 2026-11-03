/**
 * oidc-token-hash/lib/shake256.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: oidc-token-hash@5.0.3..5.1.0
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../runtime/bun-runtime.js";

//@ chunk-1ny7cxrt.js:5438-5641 cjs-fingerprint
var require_shake256 = x(function (cjsExports, cjsModule) {
  var hO = importMetaRequire("crypto");
  var [major, minor] = process.version
    .substring(1)
    .split(".")
    .map((x) => parseInt(x, 10));
  var xofOutputLength = major > 12 || (major === 12 && minor >= 8);
  var shake256 = xofOutputLength && hO.getHashes().includes("shake256");
  cjsModule.exports = shake256;
});
export { require_shake256 };
