/**
 * picomatch/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: picomatch@4.0.4..4.0.7
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../runtime/bun-runtime.js";
import { require_picomatch } from "./lib/picomatch.js";
import { require_utils } from "./lib/utils.js";

//@ chunk-fq0cr76a.js:320219-320419 cjs-fingerprint
var require_picomatch_2 = x(function (cjsExports, cjsModule) {
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
