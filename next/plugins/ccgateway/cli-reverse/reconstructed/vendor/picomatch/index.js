/**
 * picomatch/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: picomatch@4.0.4..4.0.7
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../runtime/bun-runtime.js";
import { require_picomatch } from "./lib/picomatch.js";
import { require_utils } from "./lib/utils.js";

//@ chunk-qg41pqt6.js:320786-320986 cjs-fingerprint
var require_picomatch_2 = __commonJS(function (cjsExports, cjsModule) {
  var pico = require_picomatch();
  var utils = require_utils();
  function picomatch(glob, options, returnState = false) {
    if (options && (options.windows === null || options.windows === undefined))
      options = {
        ...options,
        windows: utils.isWindows(),
      };
    return pico(glob, options, returnState);
  }
  Object.assign(picomatch, pico);
  cjsModule.exports = picomatch;
});
export { require_picomatch_2 };
