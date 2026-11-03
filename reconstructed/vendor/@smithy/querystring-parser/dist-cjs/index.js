/**
 * @smithy/querystring-parser/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/querystring-parser@2.2.0
 * pieces: chunk-k057sjda.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-k057sjda.js:226-515 cjs-fingerprint
var a = x(function (u) {
  function c(t) {
    let r = {};
    if (((t = t.replace(/^\?/, "")), t))
      for (let n of t.split("&")) {
        let [e, s = null] = n.split("=");
        if (((e = decodeURIComponent(e)), s)) s = decodeURIComponent(s);
        if (!(e in r)) r[e] = s;
        else if (Array.isArray(r[e])) r[e].push(s);
        else r[e] = [r[e], s];
      }
    return r;
  }
  u.parseQueryString = c;
});

export { a };
