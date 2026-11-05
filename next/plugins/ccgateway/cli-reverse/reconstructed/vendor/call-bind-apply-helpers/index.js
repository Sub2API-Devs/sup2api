/**
 * call-bind-apply-helpers/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: call-bind-apply-helpers@1.0.2
 * pieces: chunk-ww9agm6g.js (2)
 * attribution: cjs-layout 1, cjs-require-graph 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../runtime/bun-runtime.js";
import { require_function_bind } from "../function-bind/index.js";
import { require_es_object_atoms_7 } from "../es-object-atoms/index.js";
import { require_functionCall, require_functionCall_3 } from "./functionCall.js";

//@ chunk-ww9agm6g.js:11059-11140 cjs-layout
var require_call_bind_apply_helpers = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = typeof Reflect !== "undefined" && Reflect && Reflect.apply;
});
//@ chunk-ww9agm6g.js:11233-11418 cjs-require-graph
var require_call_bind_apply_helpers_2 = __commonJS(function (cjsExports, cjsModule) {
  var bind = require_function_bind();
  var $TypeError = require_es_object_atoms_7();
  var $call = require_functionCall();
  var $actualApply = require_functionCall_3();
  cjsModule.exports = function (args) {
    if (args.length < 1 || typeof args[0] !== "function") throw new $TypeError("a function is required");
    return $actualApply(bind, $call, args);
  };
});
export { require_call_bind_apply_helpers, require_call_bind_apply_helpers_2 };
