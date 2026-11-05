/**
 * dunder-proto/get.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: dunder-proto@1.0.1
 * pieces: chunk-ww9agm6g.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../runtime/bun-runtime.js";
import { require_call_bind_apply_helpers_2 } from "../call-bind-apply-helpers/index.js";
import { require_gopd } from "../gopd/index.js";

//@ chunk-ww9agm6g.js:11418-11796 cjs-fingerprint
var require_get = __commonJS(function (cjsExports, cjsModule) {
  var callBind = require_call_bind_apply_helpers_2();
  var gOPD = require_gopd();
  var hasProtoAccessor;
  try {
    hasProtoAccessor = [].__proto__ === Array.prototype;
  } catch (error) {
    if (!error || typeof error !== "object" || !("code" in error) || error.code !== "ERR_PROTO_ACCESS")
      throw error;
  }
  var desc = !!hasProtoAccessor && gOPD && gOPD(Object.prototype, "__proto__");
  var $Object = Object;
  var $getPrototypeOf = $Object.getPrototypeOf;
  cjsModule.exports =
    desc && typeof desc.get === "function"
      ? callBind([desc.get])
      : typeof $getPrototypeOf === "function"
        ? function (value) {
            return $getPrototypeOf(value == null ? value : $Object(value));
          }
        : false;
});
export { require_get };
