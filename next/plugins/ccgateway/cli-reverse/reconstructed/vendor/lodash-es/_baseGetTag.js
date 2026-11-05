/**
 * lodash-es/_baseGetTag.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-j8tzrgex.js (6)
 * attribution: placement 6
 */
import { symbolExport } from "./_root.js";
import { getRawTag_default } from "./_getRawTag.js";

//@ chunk-j8tzrgex.js:614-650 placement
var objectProtoBaseTag = Object.prototype;
var toString = objectProtoBaseTag.toString;
//@ chunk-j8tzrgex.js:650-681 placement
function objectToString(value) {
  return toString.call(value);
}
//@ chunk-j8tzrgex.js:681-689 placement
var import_objectToString = objectToString;
//@ chunk-j8tzrgex.js:689-761 placement
var nullTag = "[object Null]";
var undefinedTag = "[object Undefined]";
var symToStringTag_2 = symbolExport ? symbolExport.toStringTag : undefined;
//@ chunk-j8tzrgex.js:761-843 placement
function baseGetTag(value) {
  if (value == null) return value === undefined ? undefinedTag : nullTag;
  return symToStringTag_2 && symToStringTag_2 in Object(value)
    ? getRawTag_default(value)
    : import_objectToString(value);
}
//@ chunk-j8tzrgex.js:843-853 placement
var baseGetTagExport = baseGetTag;
export { baseGetTagExport };
