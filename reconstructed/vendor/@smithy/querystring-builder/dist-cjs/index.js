/**
 * @smithy/querystring-builder/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/querystring-builder@2.2.0
 * pieces: chunk-hq88884p.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { ahs } from "../../util-uri-escape/dist-cjs/index.js";

//@ chunk-hq88884p.js:5166-5498 cjs-fingerprint
var uSr = x(function (Gr) {
  var we = ahs();
  function Yr(e) {
    let r = [];
    for (let n of Object.keys(e).sort()) {
      let o = e[n];
      if (((n = we.escapeUri(n)), Array.isArray(o)))
        for (let s = 0, c = o.length; s < c; s++) r.push(`${n}=${we.escapeUri(o[s])}`);
      else {
        let s = n;
        if (o || typeof o === "string") s += `=${we.escapeUri(o)}`;
        r.push(s);
      }
    }
    return r.join("&");
  }
  Gr.buildQueryString = Yr;
});

export { uSr };
