/**
 * semver/internal/debug.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";

//@ chunk-7kayq7nc.js:1822-2021 cjs-fingerprint
var require_debug = __commonJS(function (cjsExports, cjsModule) {
  var debug =
    typeof process === "object" &&
    process.env &&
    process.env.NODE_DEBUG &&
    /\bsemver\b/i.test(process.env.NODE_DEBUG)
      ? (...args) => console.error("SEMVER", ...args)
      : () => {};
  cjsModule.exports = debug;
});
export { require_debug };
