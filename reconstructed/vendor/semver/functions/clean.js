/**
 * semver/functions/clean.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { require_parse } from "./parse.js";

//@ chunk-bwbq4xvm.js:10407-10538 cjs-fingerprint
var require_clean = x(function (cjsExports, cjsModule) {
  var parse = require_parse();
  var clean = (version, options) => {
    let s = parse(version.trim().replace(/^[=v]+/, ""), options);
    return s ? s.version : null;
  };
  cjsModule.exports = clean;
});
export { require_clean };
