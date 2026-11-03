/**
 * call-bind-apply-helpers/functionCall.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: call-bind-apply-helpers@1.0.2
 * pieces: chunk-h6b7mazd.js (3)
 * attribution: cjs-require-graph 3
 */
import { x } from "../../runtime/bun-runtime.js";
import { require_function_bind } from "../function-bind/index.js";
import { require_functionApply } from "./functionApply.js";
import { require_call_bind_apply_helpers } from "./index.js";

//@ chunk-h6b7mazd.js:10934-10996 cjs-require-graph
var require_functionCall = x(function (cjsExports, cjsModule) {
  cjsModule.exports = Function.prototype.call;
});
//@ chunk-h6b7mazd.js:11140-11233 cjs-require-graph
var require_functionCall_3 = x(function (cjsExports, cjsModule) {
  var iu = require_function_bind();
  var au = require_functionApply();
  var uu = require_functionCall();
  var cu = require_call_bind_apply_helpers();
  cjsModule.exports = cu || iu.call(uu, au);
});
//@ chunk-h6b7mazd.js:12047-12174 cjs-require-graph
var require_functionCall_2 = x(function (cjsExports, cjsModule) {
  var mu = Function.prototype.call;
  var hasOwnProperty = Object.prototype.hasOwnProperty;
  var bu = require_function_bind();
  cjsModule.exports = bu.call(mu, hasOwnProperty);
});
export { require_functionCall, require_functionCall_3, require_functionCall_2 };
