/**
 * openid-client/lib/helpers/pick.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: openid-client@5.7.1
 * pieces: chunk-1hnjmk23.js (1)
 * attribution: cjs-require-graph 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-1hnjmk23.js:9479-9596 cjs-require-graph
var require_pick = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = function (object, ...paths) {
    let obj = {};
    for (let path of paths) if (object[path] !== undefined) obj[path] = object[path];
    return obj;
  };
});
export { require_pick };
