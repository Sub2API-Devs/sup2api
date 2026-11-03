/**
 * semver/ranges/to-comparators.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { ee } from "../classes/range.js";

//@ chunk-bwbq4xvm.js:21798-21935 cjs-require-graph
var Sl = x(function (A2, El) {
  var Pk = ee(),
    Mk = (e, s) =>
      new Pk(e, s).set.map((n) =>
        n
          .map((r) => r.value)
          .join(" ")
          .trim()
          .split(" "),
      );
  El.exports = Mk;
});

export { Sl };
