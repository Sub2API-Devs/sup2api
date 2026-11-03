/**
 * semver/ranges/to-comparators.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { require_range } from "../classes/range.js";

//@ chunk-bwbq4xvm.js:21798-21935 cjs-require-graph
var require_to_comparators = x(function (cjsExports, cjsModule) {
  var Range = require_range();
  var toComparators = (range, options) =>
    new Range(range, options).set.map((comp) =>
      comp
        .map((c) => c.value)
        .join(" ")
        .trim()
        .split(" "),
    );
  cjsModule.exports = toComparators;
});
export { require_to_comparators };
