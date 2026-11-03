/**
 * openid-client/lib/helpers/defaults.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: openid-client@5.7.1
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { wu } from "./is_plain_object.js";

//@ chunk-1ny7cxrt.js:8101-8430 cjs-fingerprint
var ly = x(function (Rve, ay) {
  var oy = wu();
  function sy(e, t, ...n) {
    for (let o of n) {
      if (!oy(o)) continue;
      for (let [r, s] of Object.entries(o)) {
        if (r === "__proto__" || r === "constructor") continue;
        if (typeof t[r] > "u" && typeof s < "u") t[r] = s;
        if (e && oy(t[r]) && oy(s)) sy(!0, t[r], s);
      }
    }
    return t;
  }
  ay.exports = sy.bind(void 0, !1);
  ay.exports.deep = sy.bind(void 0, !0);
});

export { ly };
