/**
 * @opentelemetry/core/build/src/utils/lodash.merge.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/core@2.7.1
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-7kayq7nc.js:124966-125818 cjs-fingerprint
var require_lodash_merge = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.isPlainObject = undefined;
  var objectTag = "[object Object]";
  var nullTag = "[object Null]";
  var undefinedTag = "[object Undefined]";
  var funcProto = Function.prototype;
  var funcToString = funcProto.toString;
  var objectCtorString = funcToString.call(Object);
  var { getPrototypeOf, prototype: objectProto } = Object;
  var hasOwnProperty = objectProto.hasOwnProperty;
  var symToStringTag = Symbol ? Symbol.toStringTag : undefined;
  var nativeObjectToString = objectProto.toString;
  function isPlainObject(value) {
    if (!isObjectLike(value) || baseGetTag(value) !== objectTag) return false;
    let proto = getPrototypeOf(value);
    if (proto === null) return true;
    let Ctor = hasOwnProperty.call(proto, "constructor") && proto.constructor;
    return typeof Ctor == "function" && Ctor instanceof Ctor && funcToString.call(Ctor) === objectCtorString;
  }
  cjsExports.isPlainObject = isPlainObject;
  function isObjectLike(value) {
    return value != null && typeof value == "object";
  }
  function baseGetTag(value) {
    if (value == null) return value === undefined ? undefinedTag : nullTag;
    return symToStringTag && symToStringTag in Object(value) ? getRawTag(value) : objectToString(value);
  }
  function getRawTag(value) {
    let isOwn = hasOwnProperty.call(value, symToStringTag);
    let tag = value[symToStringTag];
    let unmasked = false;
    try {
      value[symToStringTag] = undefined;
      unmasked = true;
    } catch {}
    let result = nativeObjectToString.call(value);
    if (unmasked)
      if (isOwn) value[symToStringTag] = tag;
      else delete value[symToStringTag];
    return result;
  }
  function objectToString(value) {
    return nativeObjectToString.call(value);
  }
});
export { require_lodash_merge };
