/**
 * semver/ranges/valid.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { require_range } from "../classes/range.js";

//@ chunk-bwbq4xvm.js:22962-23083 cjs-require-graph
var require_valid = x(function (cjsExports, cjsModule) {
  var Range = require_range();
  var validRange = (range, options) => {
    try {
      return new Range(range, options).range || "*";
    } catch (er) {
      return null;
    }
  };
  cjsModule.exports = validRange;
});
export { require_valid };
