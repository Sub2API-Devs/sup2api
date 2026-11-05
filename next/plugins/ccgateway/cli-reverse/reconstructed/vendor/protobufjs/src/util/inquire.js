/**
 * protobufjs/src/util/inquire.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-vxhm2nqe.js (1)
 * attribution: cjs-require-graph 1
 */
import { __commonJS, importMetaRequire } from "../../../../runtime/bun-runtime.js";
import { require_long } from "../../../long/umd/index.js";

//@ chunk-vxhm2nqe.js:24303-24520 cjs-require-graph
var require_inquire = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = inquire;
  function inquire(request) {
    try {
      var mod =
        request === "long"
          ? require_long()
          : request === "buffer"
            ? importMetaRequire("buffer")
            : request === "fs"
              ? importMetaRequire("fs")
              : importMetaRequire(request);
      if (mod && (mod.length || Object.keys(mod).length)) return mod;
      return null;
    } catch (error) {
      return null;
    }
  }
});
export { require_inquire };
