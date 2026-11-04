/**
 * call-bind-apply-helpers/functionCall.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: call-bind-apply-helpers@1.0.2
 * pieces: chunk-h6b7mazd.js (3)
 * attribution: cjs-require-graph 3
 */
import { __commonJS } from "../../runtime/bun-runtime.js";
import { require_function_bind } from "../function-bind/index.js";
import { require_functionApply } from "./functionApply.js";
import { require_call_bind_apply_helpers } from "./index.js";

//@ chunk-h6b7mazd.js:10934-10996 cjs-require-graph
var require_functionCall = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = Function.prototype.call;
});
//@ chunk-h6b7mazd.js:11140-11233 cjs-require-graph
var require_functionCall_3 = __commonJS(function (cjsExports, cjsModule) {
  var requireFunctionBind = require_function_bind();
  var requireFunctionApply = require_functionApply();
  var requireFunctionCall = require_functionCall();
  var requireCallBindApplyHelpers = require_call_bind_apply_helpers();
  cjsModule.exports =
    requireCallBindApplyHelpers || requireFunctionBind.call(requireFunctionCall, requireFunctionApply);
});
//@ chunk-h6b7mazd.js:12047-12174 cjs-require-graph
var require_functionCall_2 = __commonJS(function (cjsExports, cjsModule) {
  var call = Function.prototype.call;
  var hasOwnProperty = Object.prototype.hasOwnProperty;
  var requireFunctionBind = require_function_bind();
  cjsModule.exports = requireFunctionBind.call(call, hasOwnProperty);
});
export { require_functionCall, require_functionCall_3, require_functionCall_2 };
