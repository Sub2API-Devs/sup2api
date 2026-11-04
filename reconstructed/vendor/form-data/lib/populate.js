/**
 * form-data/lib/populate.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: form-data@4.0.6
 * pieces: chunk-h6b7mazd.js (1)
 * attribution: cjs-require-graph 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";

//@ chunk-h6b7mazd.js:21335-21450 cjs-require-graph
var require_populate = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = function (dst, src) {
    Object.keys(src).forEach(function (prop) {
      dst[prop] = dst[prop] || src[prop];
    });
    return dst;
  };
});
export { require_populate };
