/**
 * lodash.isinteger/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: lodash.isinteger@4.0.4
 * pieces: chunk-b5df2wx1.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../runtime/bun-runtime.js";

//@ chunk-b5df2wx1.js:13495-14678 cjs-fingerprint
var require_lodash_isinteger = __commonJS(function (cjsExports, cjsModule) {
  var INFINITY = 1 / 0;
  var MAX_INTEGER = 179769313486231570000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000;
  var NAN = NaN;
  var symbolTag = "[object Symbol]";
  var reTrim = /^\s+|\s+$/g;
  var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;
  var reIsBinary = /^0b[01]+$/i;
  var reIsOctal = /^0o[0-7]+$/i;
  var freeParseInt = parseInt;
  var objectProto = Object.prototype;
  var objectToString = objectProto.toString;
  function isInteger(value) {
    return typeof value == "number" && value == toInteger(value);
  }
  function isObject(value) {
    var type = typeof value;
    return !!value && (type == "object" || type == "function");
  }
  function isObjectLike(value) {
    return !!value && typeof value == "object";
  }
  function isSymbol(value) {
    return typeof value == "symbol" || (isObjectLike(value) && objectToString.call(value) == symbolTag);
  }
  function toFinite(value) {
    if (!value) return value === 0 ? value : 0;
    value = toNumber(value);
    if (value === INFINITY || value === -INFINITY) {
      var sign = value < 0 ? -1 : 1;
      return sign * MAX_INTEGER;
    }
    return value === value ? value : 0;
  }
  function toInteger(value) {
    var result = toFinite(value);
    var remainder = result % 1;
    return result === result ? (remainder ? result - remainder : result) : 0;
  }
  function toNumber(value) {
    if (typeof value == "number") return value;
    if (isSymbol(value)) return NAN;
    if (isObject(value)) {
      var other = typeof value.valueOf == "function" ? value.valueOf() : value;
      value = isObject(other) ? other + "" : other;
    }
    if (typeof value != "string") return value === 0 ? value : +value;
    value = value.replace(reTrim, "");
    var isBinary = reIsBinary.test(value);
    return isBinary || reIsOctal.test(value)
      ? freeParseInt(value.slice(2), isBinary ? 2 : 8)
      : reIsBadHex.test(value)
        ? NAN
        : +value;
  }
  cjsModule.exports = isInteger;
});
export { require_lodash_isinteger };
