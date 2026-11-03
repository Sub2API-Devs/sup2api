/**
 * openid-client/lib/helpers/generators.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: openid-client@5.7.1
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../../runtime/bun-runtime.js";
import { vu } from "./base64url.js";

//@ chunk-1ny7cxrt.js:10596-10826 cjs-fingerprint
var Su = x(function (Uve, zO) {
  var { createHash: createHash, randomBytes: randomBytes } = importMetaRequire("crypto"),
    mf = vu(),
    hf = (e = 32) => mf.encode(randomBytes(e));
  zO.exports = {
    random: hf,
    state: hf,
    nonce: hf,
    codeVerifier: hf,
    codeChallenge: (e) => mf.encode(createHash("sha256").update(e).digest()),
  };
});

export { Su };
