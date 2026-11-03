/**
 * semver/internal/parse-options.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";

//@ chunk-bwbq4xvm.js:5373-5536 cjs-fingerprint
var require_parse_options = x(function (cjsExports, cjsModule) {
  var looseOption = Object.freeze({
    loose: true,
  });
  var emptyOpts = Object.freeze({});
  var parseOptions = (options) => {
    if (!options) return emptyOpts;
    if (typeof options !== "object") return looseOption;
    return options;
  };
  cjsModule.exports = parseOptions;
});
export { require_parse_options };
