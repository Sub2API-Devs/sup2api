/**
 * openid-client/lib/helpers/generators.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: openid-client@5.7.1
 * pieces: chunk-1hnjmk23.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS, importMetaRequire } from "../../../../runtime/bun-runtime.js";
import { require_base64url } from "./base64url.js";

//@ chunk-1hnjmk23.js:10965-11195 cjs-fingerprint
var require_generators = __commonJS(function (cjsExports, cjsModule) {
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
