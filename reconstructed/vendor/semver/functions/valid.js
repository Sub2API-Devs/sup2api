/**
 * semver/functions/valid.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { ze } from "./parse.js";

//@ chunk-bwbq4xvm.js:10304-10407 cjs-require-graph
var Si = x(function (J$, Ei) {
  var fv = ze(),
    bv = (e, s) => {
      let n = fv(e, s);
      return n ? n.version : null;
    };
  Ei.exports = bv;
});

export { Si };
