/**
 * function-bind/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: function-bind@1.1.2
 * pieces: chunk-h6b7mazd.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../runtime/bun-runtime.js";
import { require_implementation } from "./implementation.js";

//@ chunk-h6b7mazd.js:10856-10934 cjs-require-graph
var require_function_bind = x(function (cjsExports, cjsModule) {
  var implementation = require_implementation();
  cjsModule.exports = Function.prototype.bind || implementation;
});
export { require_function_bind };
