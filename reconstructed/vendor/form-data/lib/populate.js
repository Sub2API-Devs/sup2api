/**
 * form-data/lib/populate.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: form-data@4.0.6
 * pieces: chunk-h6b7mazd.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../../runtime/bun-runtime.js";

//@ chunk-h6b7mazd.js:21335-21450 cjs-require-graph
var bs = x(function (_p, ys) {
  ys.exports = function (e, t) {
    return (
      Object.keys(t).forEach(function (r) {
        e[r] = e[r] || t[r];
      }),
      e
    );
  };
});

export { bs };
