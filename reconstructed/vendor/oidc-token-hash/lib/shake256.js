/**
 * oidc-token-hash/lib/shake256.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: oidc-token-hash@5.0.3..5.1.0
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../runtime/bun-runtime.js";

//@ chunk-1ny7cxrt.js:5438-5641 cjs-fingerprint
var gO = x(function (Pve, mO) {
  var hO = importMetaRequire("crypto"),
    [pO, Q1] = process.version
      .substring(1)
      .split(".")
      .map((e) => parseInt(e, 10)),
    eF = pO > 12 || (pO === 12 && Q1 >= 8),
    tF = eF && hO.getHashes().includes("shake256");
  mO.exports = tF;
});

export { gO };
