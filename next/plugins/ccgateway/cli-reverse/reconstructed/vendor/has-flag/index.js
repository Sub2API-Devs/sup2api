/**
 * has-flag/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: has-flag@4.0.0
 * pieces: chunk-ww9agm6g.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../runtime/bun-runtime.js";

//@ chunk-ww9agm6g.js:33381-33555 cjs-fingerprint
var require_has_flag = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = (flag, argv = process.argv) => {
    let prefix = flag.startsWith("-") ? "" : flag.length === 1 ? "-" : "--";
    let position = argv.indexOf(prefix + flag);
    let terminatorPosition = argv.indexOf("--");
    return position !== -1 && (terminatorPosition === -1 || position < terminatorPosition);
  };
});
export { require_has_flag };
