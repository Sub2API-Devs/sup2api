/**
 * openid-client/lib/helpers/pick.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: openid-client@5.7.1
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-1ny7cxrt.js:9110-9227 cjs-require-graph
var require_pick = x(function (cjsExports, cjsModule) {
  cjsModule.exports = function (object, ...paths) {
    let obj = {};
    for (let path of paths) if (object[path] !== undefined) obj[path] = object[path];
    return obj;
  };
});
export { require_pick };
