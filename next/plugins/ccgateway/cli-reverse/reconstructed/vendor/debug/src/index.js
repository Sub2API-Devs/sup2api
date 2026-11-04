/**
 * debug/src/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: debug@4.4.0
 * pieces: chunk-h6b7mazd.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_browser } from "./browser.js";
import { require_node } from "./node.js";

//@ chunk-h6b7mazd.js:37209-37343 cjs-fingerprint
var require_debug_2 = __commonJS(function (cjsExports, cjsModule) {
  if (typeof process === "undefined" || process.type === "renderer" || false || process.__nwjs)
    cjsModule.exports = require_browser();
  else cjsModule.exports = require_node();
});
export { require_debug_2 };
