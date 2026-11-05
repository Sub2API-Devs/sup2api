/**
 * function-bind/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: function-bind@1.1.2
 * pieces: chunk-ww9agm6g.js (1)
 * attribution: cjs-require-graph 1
 */
import { __commonJS } from "../../runtime/bun-runtime.js";
import { require_implementation } from "./implementation.js";

//@ chunk-ww9agm6g.js:10856-10934 cjs-require-graph
var require_function_bind = __commonJS(function (cjsExports, cjsModule) {
  var implementation = require_implementation();
  cjsModule.exports = Function.prototype.bind || implementation;
});
export { require_function_bind };
