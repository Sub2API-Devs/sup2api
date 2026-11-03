/**
 * asynckit/lib/abort.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: asynckit@0.4.0..0.5.0
 * pieces: chunk-h6b7mazd.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";

//@ chunk-h6b7mazd.js:5653-5825 cjs-fingerprint
var Kt = x(function (Fl, Tn) {
  Tn.exports = Pa;
  function Pa(e) {
    (Object.keys(e.jobs).forEach(Fa.bind(e)), (e.jobs = {}));
  }
  function Fa(e) {
    if (typeof this.jobs[e] == "function") this.jobs[e]();
  }
});

export { Kt };
