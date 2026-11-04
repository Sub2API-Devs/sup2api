/**
 * escape-string-regexp/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: escape-string-regexp@2.0.0
 * pieces: chunk-bzr73sfg.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../runtime/bun-runtime.js";

//@ chunk-bzr73sfg.js:126116-126279 cjs-fingerprint
var require_escape_string_regexp = __commonJS(function (cjsExports, cjsModule) {
  var matchOperatorsRegex = /[|\\{}()[\]^$+*?.-]/g;
  cjsModule.exports = (string) => {
    if (typeof string !== "string") throw TypeError("Expected a string");
    return string.replace(matchOperatorsRegex, "\\$&");
  };
});
export { require_escape_string_regexp };
