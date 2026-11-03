/**
 * openid-client/lib/helpers/webfinger_normalize.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: openid-client@5.7.1
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-1ny7cxrt.js:68948-69495 cjs-fingerprint
var ik = x(function (Qve, rk) {
  var gB = /^\d+$/;
  function yB(e) {
    if (e.includes("://")) return !0;
    let t = e.replace(/(\/|\?)/g, "#").split("#")[0];
    if (t.includes(":")) {
      let index = t.indexOf(":"),
        sliced = t.slice(index + 1);
      if (!gB.test(sliced)) return !0;
    }
    return !1;
  }
  function _B(e) {
    if (!e.includes("@")) return !1;
    let parts = e.split("@"),
      n = parts[parts.length - 1];
    return !(n.includes(":") || n.includes("/") || n.includes("?"));
  }
  function bB(e) {
    if (typeof e !== "string") throw TypeError("input must be a string");
    let t;
    if (yB(e)) t = e;
    else if (_B(e)) t = `acct:${e}`;
    else t = `https://${e}`;
    return t.split("#")[0];
  }
  rk.exports = bB;
});

export { ik };
