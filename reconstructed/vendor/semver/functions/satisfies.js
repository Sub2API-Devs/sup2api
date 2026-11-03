/**
 * semver/functions/satisfies.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { require_range } from "../classes/range.js";

//@ chunk-bwbq4xvm.js:21678-21798 cjs-require-graph
var require_satisfies = x(function (cjsExports, cjsModule) {
  var Range = require_range();
  var satisfies = (version, range, options) => {
    try {
      range = new Range(range, options);
    } catch (er) {
      return false;
    }
    return range.test(version);
  };
  cjsModule.exports = satisfies;
});
export { require_satisfies };
