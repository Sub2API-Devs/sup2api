/**
 * semver/functions/valid.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-require-graph 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_parse } from "./parse.js";

//@ chunk-bwbq4xvm.js:10304-10407 cjs-require-graph
var require_valid_2 = __commonJS(function (cjsExports, cjsModule) {
  var parse = require_parse();
  var valid = (version, options) => {
    let v = parse(version, options);
    return v ? v.version : null;
  };
  cjsModule.exports = valid;
});
export { require_valid_2 };
