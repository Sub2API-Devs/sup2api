/**
 * semver/ranges/intersects.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_range } from "../classes/range.js";

//@ chunk-bwbq4xvm.js:23951-24064 cjs-fingerprint
var require_intersects = __commonJS(function (cjsExports, cjsModule) {
  var Range = require_range();
  var intersects = (r1, r2, options) => {
    r1 = new Range(r1, options);
    r2 = new Range(r2, options);
    return r1.intersects(r2, options);
  };
  cjsModule.exports = intersects;
});
export { require_intersects };
