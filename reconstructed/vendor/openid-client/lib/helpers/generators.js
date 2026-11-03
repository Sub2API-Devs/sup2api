/**
 * openid-client/lib/helpers/generators.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: openid-client@5.7.1
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../../runtime/bun-runtime.js";
import { require_base64url } from "./base64url.js";

//@ chunk-1ny7cxrt.js:10596-10826 cjs-fingerprint
var require_generators = x(function (cjsExports, cjsModule) {
  var { createHash, randomBytes } = importMetaRequire("crypto");
  var base64url = require_base64url();
  var random = (bytes = 32) => base64url.encode(randomBytes(bytes));
  cjsModule.exports = {
    random,
    state: random,
    nonce: random,
    codeVerifier: random,
    codeChallenge: (codeVerifier) => base64url.encode(createHash("sha256").update(codeVerifier).digest()),
  };
});
export { require_generators };
