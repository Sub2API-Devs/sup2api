/**
 * lodash.isplainobject/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: lodash.isplainobject@4.0.6
 * pieces: chunk-b5df2wx1.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../runtime/bun-runtime.js";

//@ chunk-b5df2wx1.js:14888-15499 cjs-fingerprint
var require_lodash_isplainobject = __commonJS(function (cjsExports, cjsModule) {
  var objectTag = "[object Object]";
  function isHostObject(value) {
    var result = false;
    if (value != null && typeof value.toString != "function")
      try {
        result = !!(value + "");
      } catch (e) {}
    return result;
  }
  function overArg(func, transform) {
    return function (arg) {
      return func(transform(arg));
    };
  }
  var funcProto = Function.prototype;
  var objectProto = Object.prototype;
  var funcToString = funcProto.toString;
  var hasOwnProperty = objectProto.hasOwnProperty;
  var objectCtorString = funcToString.call(Object);
  var objectToString = objectProto.toString;
  var getPrototype = overArg(Object.getPrototypeOf, Object);
  function isObjectLike(value) {
    return !!value && typeof value == "object";
  }
  function isPlainObject(value) {
    if (!isObjectLike(value) || objectToString.call(value) != objectTag || isHostObject(value)) return false;
    var proto = getPrototype(value);
    if (proto === null) return true;
    var Ctor = hasOwnProperty.call(proto, "constructor") && proto.constructor;
    return typeof Ctor == "function" && Ctor instanceof Ctor && funcToString.call(Ctor) == objectCtorString;
  }
  cjsModule.exports = isPlainObject;
});
export { require_lodash_isplainobject };
