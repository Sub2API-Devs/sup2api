/**
 * es-define-property/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: es-define-property@1.0.1
 * pieces: chunk-h6b7mazd.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../runtime/bun-runtime.js";

//@ chunk-h6b7mazd.js:8451-8571 cjs-require-graph
var _o = x(function (np, xo) {
  var At = Object.defineProperty || !1;
  if (At)
    try {
      At({}, "a", { value: 1 });
    } catch (error) {
      At = !1;
    }
  xo.exports = At;
});

export { _o };
