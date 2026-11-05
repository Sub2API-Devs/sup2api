/**
 * oidc-token-hash/lib/shake256.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: oidc-token-hash@5.0.3..5.1.0
 * pieces: chunk-1hnjmk23.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS, importMetaRequire } from "../../../runtime/bun-runtime.js";

//@ chunk-1hnjmk23.js:5807-6010 cjs-fingerprint
var require_shake256 = __commonJS(function (cjsExports, cjsModule) {
  var nodeCrypto = importMetaRequire("crypto");
  var [major, minor] = process.version
    .substring(1)
    .split(".")
    .map((x) => parseInt(x, 10));
  var xofOutputLength = major > 12 || (major === 12 && minor >= 8);
  var shake256 = xofOutputLength && nodeCrypto.getHashes().includes("shake256");
  cjsModule.exports = shake256;
});
export { require_shake256 };
