/**
 * @protobufjs/aspromise/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @protobufjs/aspromise@1.1.2
 * pieces: chunk-3k21nfa0.js (1), chunk-vxhm2nqe.js (1)
 * attribution: cjs-require-graph 2
 */
import { __commonJS, importMetaRequire } from "../../../runtime/bun-runtime.js";
import { require_long } from "../../long/umd/index.js";

//@ chunk-vxhm2nqe.js:6325-6693 cjs-require-graph
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
//@ chunk-3k21nfa0.js:78091-78403 cjs-require-graph
var require_inquire = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = inquire;
  function inquire(moduleName) {
    try {
      var resolvedModule =
        moduleName === "long"
          ? require_long()
          : moduleName === "buffer"
            ? importMetaRequire("buffer")
            : moduleName === "fs"
              ? importMetaRequire("fs")
              : eval("quire".replace(/^/, "re"))(moduleName);
      if (resolvedModule && (resolvedModule.length || Object.keys(resolvedModule).length))
        return resolvedModule;
    } catch (error) {}
    return null;
  }
});
export { require_aspromise, require_inquire };
