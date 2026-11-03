/**
 * protobufjs/src/util/inquire.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-798ashq9.js (1)
 * attribution: cjs-require-graph 1
 */
import { x, importMetaRequire } from "../../../../runtime/bun-runtime.js";
import { require_long } from "../../../long/umd/index.js";

//@ chunk-798ashq9.js:24303-24520 cjs-require-graph
var require_inquire = x(function (cjsExports, cjsModule) {
  cjsModule.exports = Bi;
  function Bi(l) {
    try {
      var mod =
        l === "long"
          ? require_long()
          : l === "buffer"
            ? importMetaRequire("buffer")
            : l === "fs"
              ? importMetaRequire("fs")
              : importMetaRequire(l);
      if (mod && (mod.length || Object.keys(mod).length)) return mod;
      return null;
    } catch (error) {
      return null;
    }
  }
});
export { require_inquire };
