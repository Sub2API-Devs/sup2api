/**
 * protobufjs/src/util/aspromise.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-798ashq9.js (1)
 * attribution: cjs-require-graph 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-798ashq9.js:6325-6693 cjs-require-graph
var require_aspromise = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = asPromise;
  function asPromise(fn, ctx) {
    var params = Array(arguments.length - 1);
    var offset = 0;
    var index = 2;
    var pending = true;
    while (index < arguments.length) params[offset++] = arguments[index++];
    return new Promise(function (resolve, reject) {
      params[offset] = function (err) {
        if (pending) {
          pending = false;
          if (err) reject(err);
          else {
            var params = Array(arguments.length - 1);
            var offset = 0;
            while (offset < params.length) params[offset++] = arguments[offset];
            resolve.apply(null, params);
          }
        }
      };
      try {
        fn.apply(ctx || null, params);
      } catch (err) {
        if (pending) {
          pending = false;
          reject(err);
        }
      }
    });
  }
});
export { require_aspromise };
