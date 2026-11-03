/**
 * pngjs/lib/filter-parse-sync.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: pngjs@5.0.0
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { Et } from "./sync-reader.js";
import { ft } from "./filter-parse.js";

//@ chunk-spjgqa4y.js:46188-46406 cjs-fingerprint
var _n = x(function (cs) {
  var as = Et(),
    hs = ft();
  cs.process = function (t, e) {
    let r = [],
      n = new as(t);
    return (
      new hs(e, {
        read: n.read.bind(n),
        write: function (o) {
          r.push(o);
        },
        complete: function () {},
      }).start(),
      n.process(),
      Buffer.concat(r)
    );
  };
});

export { _n };
