/**
 * asynckit/lib/abort.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: asynckit@0.4.0..0.5.0
 * pieces: chunk-ww9agm6g.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";

//@ chunk-ww9agm6g.js:5653-5825 cjs-fingerprint
var require_abort = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = abort;
  function abort(state) {
    Object.keys(state.jobs).forEach(clean.bind(state));
    state.jobs = {};
  }
  function clean(key) {
    if (typeof this.jobs[key] == "function") this.jobs[key]();
  }
});
export { require_abort };
