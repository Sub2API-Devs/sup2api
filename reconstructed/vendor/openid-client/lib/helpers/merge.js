/**
 * openid-client/lib/helpers/merge.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: openid-client@5.7.1
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { wu } from "./is_plain_object.js";

//@ chunk-1ny7cxrt.js:27191-27454 cjs-fingerprint
var mS = x(function (Gve, hS) {
  var yy = wu();
  function pS(e, ...t) {
    for (let n of t) {
      if (!yy(n)) continue;
      for (let [o, r] of Object.entries(n)) {
        if (o === "__proto__" || o === "constructor") continue;
        if (yy(e[o]) && yy(r)) e[o] = pS(e[o], r);
        else if (typeof r < "u") e[o] = r;
      }
    }
    return e;
  }
  hS.exports = pS;
});

export { mS };
