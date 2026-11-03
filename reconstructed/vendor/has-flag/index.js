/**
 * has-flag/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: has-flag@4.0.0
 * pieces: chunk-h6b7mazd.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../runtime/bun-runtime.js";

//@ chunk-h6b7mazd.js:33381-33555 cjs-fingerprint
var require_has_flag = x(function (cjsExports, cjsModule) {
  cjsModule.exports = (flag, argv = process.argv) => {
    let prefix = flag.startsWith("-") ? "" : flag.length === 1 ? "-" : "--";
    let position = argv.indexOf(prefix + flag);
    let terminatorPosition = argv.indexOf("--");
    return position !== -1 && (terminatorPosition === -1 || position < terminatorPosition);
  };
});
export { require_has_flag };
